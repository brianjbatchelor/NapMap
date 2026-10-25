/* NapMap friends leaderboard (file and window.NapMap API keep their old names for now).
   Friends share a group code; each player has a random local id and a display name.
   Today's first daily win is posted to Supabase (PostgREST, plain fetch) and the group's board is shown
   in the #friends section and the win card. Failed posts are queued in storage and retried.
   The top half is pure (no DOM) and is exported for Node tests; the UI below only runs in a browser. */
(function () {
'use strict';

/* ---------- pure helpers ---------- */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no I, L, O, 0, 1
const CODE_LEN = 6, CODE_MIN = 4, CODE_MAX = 12, NAME_MAX = 20, DAY_MS = 86400000;
const CODE_RE = new RegExp('^[' + CODE_ALPHABET + ']{' + CODE_MIN + ',' + CODE_MAX + '}$');

function randomBytes(n) {
  const a = new Uint8Array(n);
  if (globalThis.crypto && globalThis.crypto.getRandomValues) globalThis.crypto.getRandomValues(a);
  else for (let i = 0; i < n; i++) a[i] = Math.random() * 256 | 0;
  return a;
}
/* Unbiased: reject bytes above the largest multiple of the alphabet size. */
function makeGroupCode(len = CODE_LEN, bytes = randomBytes) {
  const A = CODE_ALPHABET, lim = 256 - (256 % A.length);
  let out = '';
  while (out.length < len) for (const b of bytes(len * 2)) { if (b < lim && out.length < len) out += A[b % A.length]; }
  return out;
}
/* Forgiving input: case, spaces and dashes don't matter. */
function normalizeCode(s) { return String(s == null ? '' : s).toUpperCase().replace(/[\s-]+/g, ''); }
function isValidCode(s) { return CODE_RE.test(s); }
/* Trim, collapse whitespace, drop control characters, cap at 20 code points (matches Postgres char_length). */
const NAME_JUNK = new RegExp('[' + [[0x00, 0x1f], [0x7f, 0x9f], [0x200b, 0x200f], [0x2028, 0x202e], [0x2066, 0x2069]]
  .map(([a, b]) => String.fromCharCode(a) + '-' + String.fromCharCode(b)).join('') + ']', 'g'); // control, zero-width, bidi
function cleanName(s) {
  const t = String(s == null ? '' : s).replace(NAME_JUNK, '')
    .replace(/\s+/g, ' ').trim();
  return Array.from(t).slice(0, NAME_MAX).join('').trim();
}
function uuid() {
  if (globalThis.crypto && globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();
  const b = randomBytes(16); b[6] = b[6] & 15 | 64; b[8] = b[8] & 63 | 128;
  const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/* Ranking: fewest hearts lost, then fastest time, then who posted first. One row per player.
   Equal hearts and time share a rank (1, 2, 2, 4). */
function compareScores(a, b) {
  return (a.hearts_lost - b.hearts_lost) || (a.time_ms - b.time_ms) ||
    String(a.created_at || '').localeCompare(String(b.created_at || ''));
}
function rankScores(rows, meId) {
  const best = new Map();
  for (const r of rows || []) {
    if (!r || typeof r.time_ms !== 'number' || typeof r.hearts_lost !== 'number') continue;
    const cur = best.get(r.player_id);
    if (!cur || compareScores(r, cur) < 0) best.set(r.player_id, r);
  }
  const sorted = [...best.values()].sort(compareScores);
  let rank = 0;
  return sorted.map((r, i) => {
    const prev = sorted[i - 1];
    if (!prev || prev.hearts_lost !== r.hearts_lost || prev.time_ms !== r.time_ms) rank = i + 1;
    return { rank, player_id: r.player_id, name: r.name, time_ms: r.time_ms, hearts_lost: r.hearts_lost, me: r.player_id === meId };
  });
}

/* Submit queue: an array of score rows, at most one per (group, player, day). */
const entryKey = e => `${e.group_code}|${e.player_id}|${e.date_key}`;
function makeEntry({ group, playerId, name, dateKey, timeMs, heartsLost }) {
  const e = { group_code: normalizeCode(group), player_id: playerId, name: cleanName(name), date_key: dateKey | 0,
    time_ms: Math.max(1, Math.round(timeMs)), hearts_lost: heartsLost | 0 };
  const ok = isValidCode(e.group_code) && e.name && e.date_key > 0 && e.time_ms < DAY_MS && e.hearts_lost >= 0 && e.hearts_lost <= 2;
  return ok ? e : null;
}
/* Adds an entry unless that (group, player, day) is already queued: the first win of the day wins. */
function queueAdd(queue, entry) {
  const q = Array.isArray(queue) ? queue.slice() : [];
  if (entry && !q.some(e => entryKey(e) === entryKey(entry))) q.push(entry);
  return q;
}
/* submit(entry) resolves 'ok' | 'retry' | 'drop'. On the first 'retry' we stop (probably offline)
   and keep that entry and everything after it. */
async function flushQueue(queue, submit) {
  const remaining = [], sent = [], dropped = [];
  let stop = false;
  for (const e of Array.isArray(queue) ? queue : []) {
    if (stop) { remaining.push(e); continue; }
    let r;
    try { r = await submit(e); } catch (err) { r = 'retry'; }
    if (r === 'ok') sent.push(e);
    else if (r === 'drop') dropped.push(e);
    else { remaining.push(e); stop = true; }
  }
  return { remaining, sent, dropped };
}
/* HTTP status -> queue outcome. 409 = unique violation = already posted. 400/422 = the row itself is bad. */
function classifyStatus(status) {
  if ((status >= 200 && status < 300) || status === 409) return 'ok';
  if (status === 400 || status === 422) return 'drop';
  return 'retry';
}

/* PostgREST client. fetchFn is injectable for tests. */
function makeApi({ url, key, fetchFn, timeoutMs = 8000 }) {
  const base = String(url || '').replace(/\/+$/, '') + '/rest/v1/scores';
  const headers = extra => Object.assign({ apikey: key, Authorization: 'Bearer ' + key }, extra);
  const go = async (u, opts) => {
    const f = fetchFn || globalThis.fetch;
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
    try { return await f(u, Object.assign({}, opts, ctl ? { signal: ctl.signal } : {})); }
    finally { if (t) clearTimeout(t); }
  };
  return {
    async submit(entry) {
      try {
        const res = await go(base, { method: 'POST', body: JSON.stringify(entry),
          headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }) });
        return classifyStatus(res.status);
      } catch (e) { return 'retry'; }
    },
    async board(group, dateKey) {
      const q = 'select=player_id,name,time_ms,hearts_lost,created_at' +
        '&group_code=eq.' + encodeURIComponent(group) + '&date_key=eq.' + (dateKey | 0) +
        '&order=hearts_lost.asc,time_ms.asc,created_at.asc&limit=100';
      const res = await go(base + '?' + q, { headers: headers({ Accept: 'application/json' }) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }
  };
}

function inviteLink(loc, code) {
  return loc.origin + loc.pathname + '?g=' + encodeURIComponent(code);
}
/* Reads ?g=CODE and returns {code, cleanUrl}; cleanUrl drops only the g param. */
function readInvite(href) {
  const u = new URL(href);
  if (!u.searchParams.has('g')) return null;
  const code = normalizeCode(u.searchParams.get('g'));
  u.searchParams.delete('g');
  return { code: isValidCode(code) ? code : null, cleanUrl: u.pathname + u.search + u.hash };
}

const core = { CODE_ALPHABET, makeGroupCode, normalizeCode, isValidCode, cleanName, uuid, compareScores, rankScores,
  entryKey, makeEntry, queueAdd, flushQueue, classifyStatus, makeApi, inviteLink, readInvite };
if (typeof module !== 'undefined' && module.exports) module.exports = core;
if (typeof window === 'undefined' || !window.document) return;
window.NapMapLeaderboard = core;

/* ---------- browser UI ---------- */
const S = window.NapMap;
const root = document.getElementById('friends');
if (!S || !root) return;
const cfg = window.NAPMAP_CONFIG || {};
const configured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
const api = configured ? makeApi({ url: cfg.SUPABASE_URL, key: cfg.SUPABASE_ANON_KEY }) : null;
const st = S.store;

/* tiny DOM builder: strings become text nodes, so user data never touches innerHTML */
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const k in attrs || {}) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'text') e.textContent = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}
function icon(id, cls) {
  const NS = 'http://www.w3.org/2000/svg', s = document.createElementNS(NS, 'svg'), u = document.createElementNS(NS, 'use');
  u.setAttribute('href', '#' + id); s.append(u); s.setAttribute('aria-hidden', 'true'); if (cls) s.setAttribute('class', cls);
  return s;
}

const heading = h('h3', { class: 'lb-title', id: 'friends-title' }, 'Friends');
root.setAttribute('aria-labelledby', 'friends-title');
root.classList.add('friends');

if (!configured) {
  root.replaceChildren(heading, h('p', { class: 'lb-note' }, "Leaderboard isn't set up yet."));
  return;
}

/* ---------- local identity and group ---------- */
let playerId = st.get('lb:player', null);
if (!playerId) { playerId = uuid(); st.set('lb:player', playerId); }
const getName = () => cleanName(st.get('lb:name', ''));
const getGroup = () => { const g = normalizeCode(st.get('lb:group', '')); return isValidCode(g) ? g : null; };
const recentGroups = () => (st.get('lb:groups', []) || []).filter(isValidCode);
function setGroup(code) {
  st.set('lb:group', code || null);
  if (code) st.set('lb:groups', [code, ...recentGroups().filter(c => c !== code)].slice(0, 5));
  board = { status: 'idle', rows: [] };
  syncToday(); renderAll(); flush().then(refresh);
}
const sentMap = () => st.get('lb:sent', {}) || {};
function markSent(entries) {
  if (!entries.length) return;
  const m = sentMap();
  for (const e of entries) m[entryKey(e)] = e.date_key;
  const keep = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 60); // stay small
  st.set('lb:sent', Object.fromEntries(keep));
}

/* ---------- submitting ---------- */
let flushing = null;
function flush() {
  if (flushing) return flushing;
  flushing = (async () => {
    const q = st.get('lb:queue', []);
    if (!q.length) return { remaining: [], sent: [], dropped: [] };
    const r = await flushQueue(q, e => api.submit(e));
    // re-read so anything queued while we were posting isn't lost
    const done = new Set([...r.sent, ...r.dropped].map(entryKey));
    st.set('lb:queue', st.get('lb:queue', []).filter(e => !done.has(entryKey(e))));
    markSent(r.sent);
    return r;
  })().finally(() => { flushing = null; renderStatus(); });
  return flushing;
}
const isDone = (group, dateKey) => {
  const k = entryKey({ group_code: group, player_id: playerId, date_key: dateKey });
  return !!sentMap()[k];
};
const isQueued = (group, dateKey) => {
  const k = entryKey({ group_code: group, player_id: playerId, date_key: dateKey });
  return st.get('lb:queue', []).some(e => entryKey(e) === k);
};
/* Queue today's first daily result for the current group, if there is one and it isn't posted yet.
   game.js saves the first daily win per day in store 'daily:<dateKey>'; that's the one we post. */
function syncToday(fallback) {
  const group = getGroup(), name = getName(), dk = S.today();
  if (!group || !name || isDone(group, dk)) return false;
  const rec = st.get('daily:' + dk, null) || fallback;
  if (!rec) return false;
  const e = makeEntry({ group, playerId, name, dateKey: dk, timeMs: rec.timeMs, heartsLost: rec.heartsLost });
  if (!e) return false;
  st.set('lb:queue', queueAdd(st.get('lb:queue', []), e));
  return true;
}

/* ---------- board ---------- */
let board = { status: 'idle', rows: [] }, boardSeq = 0;
async function refresh() {
  const group = getGroup();
  if (!group) return;
  const seq = ++boardSeq, dk = S.today();
  board = { status: 'loading', rows: board.group === group && board.dateKey === dk ? board.rows : [], group, dateKey: dk };
  renderBoard();
  try {
    const rows = await api.board(group, dk);
    if (seq !== boardSeq) return board;
    board = { status: 'ok', rows: rankScores(rows, playerId), group, dateKey: dk };
  } catch (e) {
    if (seq !== boardSeq) return board;
    board = { status: 'error', rows: board.rows, group, dateKey: dk };
  }
  renderBoard();
  return board;
}

/* ---------- rendering ---------- */
const refreshBtn = h('button', { class: 'lb-btn lb-icon', type: 'button', 'aria-label': 'Refresh friends board', title: 'Refresh',
  onclick: () => { flush().then(refresh); } });
refreshBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4"/></svg>';
const headRow = h('div', { class: 'lb-head' }, heading, h('span', { class: 'lb-sub', id: 'lb-sub' }), refreshBtn);
const boardEl = h('div', { class: 'lb-board', 'aria-live': 'polite' });
const statusEl = h('p', { class: 'lb-note lb-status' });
const groupEl = h('div', { class: 'lb-group' });
const controlsEl = h('div', { class: 'lb-controls' });
root.replaceChildren(headRow, boardEl, statusEl, groupEl, controlsEl);

let view = 'main', flash = '', formErr = '', pendingCode = '';

function renderAll() { renderHead(); renderBoard(); renderStatus(); renderGroup(); renderControls(); }
function renderHead() {
  const g = getGroup();
  document.getElementById('lb-sub').textContent = g ? "Today's daily" : '';
  refreshBtn.hidden = !g;
}
function heartsCell(n) {
  return h('span', { class: 'lb-hearts' + (n ? ' lost' : ''), 'aria-label': n ? `${n} heart${n > 1 ? 's' : ''} lost` : 'no hearts lost', title: n ? `${n} lost` : 'no hearts lost' },
    icon('heart'), n ? '−' + n : '0');
}
function renderBoard() {
  const g = getGroup();
  if (!g) { boardEl.replaceChildren(h('p', { class: 'lb-note' }, 'Race friends to tuck every cat in on the daily NapMap. Make a group and send them the link, or join theirs with a code.')); return; }
  const kids = [];
  if (board.rows.length) {
    kids.push(h('ol', { class: 'lb-list' }, board.rows.map(r =>
      h('li', { class: 'lb-row' + (r.me ? ' me' : '') },
        h('span', { class: 'lb-rank' }, String(r.rank)),
        h('span', { class: 'lb-name' }, h('span', { class: 'lb-name-text' }, r.name), r.me ? h('span', { class: 'lb-you' }, 'you') : null),
        heartsCell(r.hearts_lost),
        h('span', { class: 'lb-time' }, S.fmt(r.time_ms))))));
  } else if (board.status === 'ok') {
    kids.push(h('p', { class: 'lb-note' }, "No one in this group has solved today's daily yet. Everyone's still napping."));
  }
  if (board.status === 'loading' && !board.rows.length) kids.push(h('p', { class: 'lb-note' }, 'Loading…'));
  if (board.status === 'error') kids.push(h('p', { class: 'lb-note lb-warn' }, "Couldn't load the board. You may be offline."));
  if (board.status === 'ok' && !board.rows.some(r => r.me) && !isQueued(g, S.today()))
    kids.push(h('p', { class: 'lb-note' }, "Solve today's daily to get on the board."));
  boardEl.replaceChildren(...kids);
  boardEl.setAttribute('aria-busy', board.status === 'loading' ? 'true' : 'false');
}
function renderStatus() {
  const g = getGroup(), q = st.get('lb:queue', []);
  statusEl.textContent = flash || (g && q.length ? `Your time is saved and will post when you're back online.` : '');
  statusEl.hidden = !statusEl.textContent;
}
function setFlash(msg) { flash = msg; renderStatus(); clearTimeout(setFlash.t); if (msg) setFlash.t = setTimeout(() => { flash = ''; renderStatus(); }, 4000); }

function renderGroup() {
  const g = getGroup();
  if (!g) { groupEl.replaceChildren(); groupEl.hidden = true; return; }
  groupEl.hidden = false;
  const link = inviteLink(location, g);
  const linkBox = h('input', { class: 'lb-input lb-link', type: 'text', readonly: true, value: link, 'aria-label': 'Invite link', hidden: true });
  const copied = h('span', { class: 'lb-copied', role: 'status' });
  const copyBtn = h('button', { class: 'lb-btn', type: 'button', onclick: async () => {
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw 0;
      await navigator.clipboard.writeText(link);
      copied.textContent = 'Link copied';
    } catch (e) { // fallback: show the link selected so the player can copy it themselves
      linkBox.hidden = false; linkBox.focus(); linkBox.select();
      copied.textContent = 'Copy the link above';
    }
    clearTimeout(copyBtn.t); copyBtn.t = setTimeout(() => { copied.textContent = ''; }, 3000);
  } }, 'Copy invite link');
  const name = getName();
  groupEl.replaceChildren(
    h('div', { class: 'lb-group-row' },
      h('span', { class: 'lb-label' }, 'Group'), h('code', { class: 'lb-code' }, g),
      name ? h('span', { class: 'lb-label lb-as' }, 'as ', h('b', null, name)) : null),
    h('div', { class: 'lb-group-row' }, copyBtn, copied),
    linkBox);
}

function field(label, input) { return h('label', { class: 'lb-field' }, h('span', { class: 'lb-label' }, label), input); }
function nameInput() {
  return h('input', { class: 'lb-input', name: 'name', type: 'text', maxlength: NAME_MAX, autocomplete: 'nickname',
    enterkeyhint: 'done', value: getName(), placeholder: 'e.g. Brian', required: true });
}
function codeInput(v) {
  return h('input', { class: 'lb-input lb-code-input', name: 'code', type: 'text', maxlength: CODE_MAX + 4, autocomplete: 'off',
    autocapitalize: 'characters', spellcheck: 'false', value: v || '', placeholder: 'ABC234', required: true });
}
function form(title, fields, submitLabel, onsubmit, extra) {
  const err = h('p', { class: 'lb-err', role: 'alert' }, formErr);
  err.hidden = !formErr;
  return h('form', { class: 'lb-form', novalidate: true, onsubmit: e => { e.preventDefault(); onsubmit(new FormData(e.target)); } },
    h('p', { class: 'lb-form-title' }, title), fields, extra || null, err,
    h('div', { class: 'lb-actions' },
      h('button', { class: 'lb-btn primary', type: 'submit' }, submitLabel),
      h('button', { class: 'lb-btn', type: 'button', onclick: () => go('main') }, 'Cancel')));
}
function go(v, opts) { view = v; formErr = ''; if (opts && 'code' in opts) pendingCode = opts.code; renderControls(); focusForm(); }
function fail(msg) { formErr = msg; renderControls(); focusForm(); }
function focusForm() {
  const f = controlsEl.querySelector('form');
  if (!f) return;
  const bad = formErr && f.querySelector('input[aria-invalid="true"]');
  const el = bad || [...f.querySelectorAll('input')].find(i => !i.value) || f.querySelector('input');
  if (el) el.focus();
}
function readName(fd) {
  const raw = fd.get('name');
  if (raw == null) return getName();
  const n = cleanName(raw);
  return n || null;
}

function renderControls() {
  const g = getGroup(), name = getName();
  let kids = [];
  if (view === 'create') {
    kids = [form('Start a new group', name ? [] : [field('Your name', nameInput())], 'Create group', fd => {
      const n = readName(fd);
      if (!n) return fail('Pick a name your friends will recognize.');
      st.set('lb:name', n);
      const code = makeGroupCode();
      view = 'main'; setGroup(code); setFlash(`Group ${code} created. Copy the invite link to add friends.`);
    })];
  } else if (view === 'join') {
    const recent = recentGroups().filter(c => c !== g);
    const ci = codeInput(pendingCode);
    if (formErr && formErr.startsWith('That code')) ci.setAttribute('aria-invalid', 'true');
    kids = [form(g ? 'Switch to another group' : 'Join a group',
      [field('Group code', ci), name ? null : field('Your name', nameInput())], g ? 'Switch' : 'Join', fd => {
        const code = normalizeCode(fd.get('code'));
        pendingCode = String(fd.get('code') || '');
        if (!isValidCode(code)) return fail(`That code doesn't look right. Codes are ${CODE_MIN}–${CODE_MAX} letters and numbers.`);
        const n = readName(fd);
        if (!n) return fail('Pick a name your friends will recognize.');
        st.set('lb:name', n); pendingCode = '';
        view = 'main'; setGroup(code); setFlash(`You're in group ${code}.`);
      },
      recent.length ? h('div', { class: 'lb-recent' }, h('span', { class: 'lb-label' }, 'Recent'),
        recent.map(c => h('button', { class: 'lb-chip', type: 'button', onclick: () => { view = 'main'; setGroup(c); setFlash(`Switched to group ${c}.`); } }, c))) : null)];
  } else if (view === 'name') {
    kids = [form('Change your name', [field('Your name', nameInput())], 'Save', fd => {
      const n = readName(fd);
      if (!n) return fail('Names need at least one character.');
      st.set('lb:name', n); go('main'); renderGroup();
      if (syncToday()) flush().then(refresh);
      setFlash("Name saved. It's used for scores you post from now on.");
    })];
  } else if (view === 'leave' && g) {
    kids = [h('div', { class: 'lb-form' },
      h('p', { class: 'lb-form-title' }, `Leave group ${g}?`),
      h('p', { class: 'lb-note' }, 'Your posted times stay on the board. You can rejoin with the code.'),
      h('div', { class: 'lb-actions' },
        h('button', { class: 'lb-btn danger', type: 'button', onclick: () => { view = 'main'; setGroup(null); setFlash(`Left group ${g}.`); } }, 'Leave group'),
        h('button', { class: 'lb-btn', type: 'button', onclick: () => go('main') }, 'Cancel')))];
  } else {
    view = 'main';
    kids = [h('div', { class: 'lb-actions' }, g ? [
      h('button', { class: 'lb-btn', type: 'button', onclick: () => go('join', { code: '' }) }, 'Switch group'),
      h('button', { class: 'lb-btn', type: 'button', onclick: () => go('create') }, 'New group'),
      h('button', { class: 'lb-btn', type: 'button', onclick: () => go('name') }, 'Change name'),
      h('button', { class: 'lb-btn quiet', type: 'button', onclick: () => go('leave') }, 'Leave')
    ] : [
      h('button', { class: 'lb-btn primary', type: 'button', onclick: () => go('create') }, 'Create group'),
      h('button', { class: 'lb-btn', type: 'button', onclick: () => go('join', { code: '' }) }, 'Join with code'),
      name ? h('button', { class: 'lb-btn quiet', type: 'button', onclick: () => go('name') }, 'Change name') : null
    ])];
  }
  controlsEl.replaceChildren(...kids);
}

/* ---------- win card ---------- */
function setExtra(el, text, strong) {
  if (!el || !el.isConnected) return;
  el.replaceChildren(h('p', { class: 'lb-win' }, strong ? h('b', null, strong) : null, strong && text ? ' ' : null, text));
}
S.on('win', async d => {
  if (d.mode !== 'daily' || d.dateKey !== S.today()) return;
  const el = document.getElementById('win-extra'), g = getGroup();
  if (!g) { setExtra(el, 'Start a friends group below to compare nap times.'); return; }
  if (!getName()) { setExtra(el, 'Pick a name below to post your time.'); return; }
  setExtra(el, 'Posting to friends…');
  syncToday({ timeMs: d.timeMs, heartsLost: d.heartsLost });
  await flush();
  if (!isDone(g, d.dateKey)) {
    setExtra(el, isQueued(g, d.dateKey) ? "Saved. It'll post to your friends when you're back online." : "Couldn't post this time.");
    renderBoard(); return;
  }
  const b = await refresh();
  const me = b && b.status === 'ok' && b.rows.find(r => r.me);
  if (me) setExtra(el, `of ${b.rows.length} among friends today`, `#${me.rank}`);
  else setExtra(el, 'Posted to your friends board.');
});

/* ---------- start ---------- */
const invite = readInvite(location.href);
if (invite) {
  try { history.replaceState(history.state, '', invite.cleanUrl); } catch (e) {}
  if (!invite.code) setFlash("That invite link's group code didn't look right.");
  else if (invite.code !== getGroup()) {
    if (getName()) { setGroup(invite.code); setFlash(`You're in group ${invite.code}.`); }
    else { view = 'join'; pendingCode = invite.code; }
  }
}
syncToday();
renderAll();
if (view !== 'main') { root.scrollIntoView({ block: 'nearest' }); focusForm(); }
flush().then(refresh);
window.addEventListener('online', () => { flush().then(refresh); });
})();
