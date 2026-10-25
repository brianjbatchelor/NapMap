// Run from the repo root: node --test   (or node tests/leaderboard.test.js)
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../js/leaderboard.js');

test('group codes use the unambiguous alphabet and validate', () => {
  for (let i = 0; i < 200; i++) {
    const c = L.makeGroupCode();
    assert.equal(c.length, 6);
    assert.ok(L.isValidCode(c), c);
    assert.doesNotMatch(c, /[ILO01]/);
  }
  assert.equal(L.normalizeCode(' abc-234 '), 'ABC234');
  assert.ok(L.isValidCode('ABCD'));
  assert.ok(!L.isValidCode('ABC'));           // too short
  assert.ok(!L.isValidCode('A'.repeat(13)));  // too long
  assert.ok(!L.isValidCode('ABCDE1'));        // ambiguous char
  assert.ok(!L.isValidCode(L.normalizeCode('abc;--')));
  // deterministic bytes: rejection keeps it unbiased but still terminates
  assert.equal(L.makeGroupCode(4, n => new Uint8Array(n).fill(0)), 'AAAA');
});

test('names are trimmed, collapsed, stripped and capped at 20', () => {
  assert.equal(L.cleanName('   Brian   B  '), 'Brian B');
  assert.equal(L.cleanName('a\u0000b​c'), 'abc');
  assert.equal(L.cleanName('x'.repeat(30)).length, 20);
  assert.equal(Array.from(L.cleanName('\u{1F431}'.repeat(25))).length, 20);
  assert.equal(L.cleanName('    '), '');
  assert.equal(L.cleanName(null), '');
});

test('ranking: fewest hearts, then fastest; ties share a rank; marks you', () => {
  const rows = [
    { player_id: 'a', name: 'Ann', time_ms: 90000, hearts_lost: 1 },
    { player_id: 'b', name: 'Bo', time_ms: 120000, hearts_lost: 0 },
    { player_id: 'c', name: 'Cy', time_ms: 60000, hearts_lost: 2 },
    { player_id: 'd', name: 'Di', time_ms: 120000, hearts_lost: 0 },
    { player_id: 'e', name: 'Ed', time_ms: 100000, hearts_lost: 0 },
  ];
  const r = L.rankScores(rows, 'a');
  assert.deepEqual(r.map(x => x.name), ['Ed', 'Bo', 'Di', 'Ann', 'Cy']);
  assert.deepEqual(r.map(x => x.rank), [1, 2, 2, 4, 5]);
  assert.deepEqual(r.filter(x => x.me).map(x => x.name), ['Ann']);
  // duplicate rows for one player keep the best
  const d = L.rankScores([{ player_id: 'a', name: 'A', time_ms: 5000, hearts_lost: 1 }, { player_id: 'a', name: 'A', time_ms: 9000, hearts_lost: 0 }]);
  assert.equal(d.length, 1);
  assert.equal(d[0].time_ms, 9000);
  assert.deepEqual(L.rankScores(null), []);
});

test('makeEntry validates against the table checks', () => {
  const base = { group: 'abc234', playerId: 'p1', name: ' Me ', dateKey: 20261025, timeMs: 61234.6, heartsLost: 1 };
  assert.deepEqual(L.makeEntry(base), { group_code: 'ABC234', player_id: 'p1', name: 'Me', date_key: 20261025, time_ms: 61235, hearts_lost: 1 });
  assert.equal(L.makeEntry({ ...base, name: '  ' }), null);
  assert.equal(L.makeEntry({ ...base, group: 'no' }), null);
  assert.equal(L.makeEntry({ ...base, heartsLost: 3 }), null);
  assert.equal(L.makeEntry({ ...base, timeMs: 86400000 }), null);
  assert.equal(L.makeEntry({ ...base, timeMs: 0 }).time_ms, 1);
});

test('queue keeps only the first entry per group/player/day', () => {
  const e1 = { group_code: 'ABCD', player_id: 'p', date_key: 1, time_ms: 10, hearts_lost: 0, name: 'x' };
  const e2 = { ...e1, time_ms: 5 };
  const e3 = { ...e1, date_key: 2 };
  let q = L.queueAdd([], e1);
  q = L.queueAdd(q, e2);
  q = L.queueAdd(q, e3);
  assert.deepEqual(q, [e1, e3]);
  assert.deepEqual(L.queueAdd(undefined, null), []);
});

test('status classification: 2xx and 409 succeed, 400/422 drop, rest retry', () => {
  assert.equal(L.classifyStatus(201), 'ok');
  assert.equal(L.classifyStatus(409), 'ok');
  assert.equal(L.classifyStatus(400), 'drop');
  assert.equal(L.classifyStatus(422), 'drop');
  for (const s of [0, 401, 403, 429, 500, 503]) assert.equal(L.classifyStatus(s), 'retry');
});

function mockFetch(handler) {
  const calls = [];
  const f = async (url, opts = {}) => { calls.push({ url, opts }); return handler(url, opts, calls.length); };
  f.calls = calls;
  return f;
}
const res = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });

test('api.submit posts JSON with apikey + bearer headers; 409 is success; network error retries', async () => {
  const f = mockFetch((u, o, n) => n === 1 ? res(201) : n === 2 ? res(409) : Promise.reject(new TypeError('offline')));
  const api = L.makeApi({ url: 'https://x.supabase.co/', key: 'anon-key', fetchFn: f });
  const entry = L.makeEntry({ group: 'ABCD', playerId: 'p', name: 'N', dateKey: 20261025, timeMs: 1000, heartsLost: 0 });
  assert.equal(await api.submit(entry), 'ok');
  assert.equal(await api.submit(entry), 'ok');
  assert.equal(await api.submit(entry), 'retry');
  const c = f.calls[0];
  assert.equal(c.url, 'https://x.supabase.co/rest/v1/scores');
  assert.equal(c.opts.method, 'POST');
  assert.equal(c.opts.headers.apikey, 'anon-key');
  assert.equal(c.opts.headers.Authorization, 'Bearer anon-key');
  assert.equal(c.opts.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(c.opts.body), entry);
});

test('api.board builds a filtered PostgREST query and throws on HTTP errors', async () => {
  const rows = [{ player_id: 'p', name: 'N', time_ms: 1000, hearts_lost: 0 }];
  const f = mockFetch((u, o, n) => n === 1 ? res(200, rows) : res(500));
  const api = L.makeApi({ url: 'https://x.supabase.co', key: 'k', fetchFn: f });
  assert.deepEqual(await api.board('ABCD', 20261025), rows);
  const u = new URL(f.calls[0].url);
  assert.equal(u.pathname, '/rest/v1/scores');
  assert.equal(u.searchParams.get('group_code'), 'eq.ABCD');
  assert.equal(u.searchParams.get('date_key'), 'eq.20261025');
  assert.match(u.searchParams.get('order'), /^hearts_lost\.asc,time_ms\.asc/);
  assert.equal(f.calls[0].opts.method, undefined); // GET
  await assert.rejects(api.board('ABCD', 20261025), /HTTP 500/);
});

test('flushQueue sends in order, drops bad rows, stops at the first retry', async () => {
  const q = [1, 2, 3, 4].map(i => ({ group_code: 'ABCD', player_id: 'p', date_key: i }));
  const outcomes = { 1: 201, 2: 400, 3: 503, 4: 201 };
  const f = mockFetch(u => res(outcomes[f.calls.length]));
  const api = L.makeApi({ url: 'https://x.supabase.co', key: 'k', fetchFn: f });
  const r = await L.flushQueue(q, e => api.submit(e));
  assert.deepEqual(r.sent.map(e => e.date_key), [1]);
  assert.deepEqual(r.dropped.map(e => e.date_key), [2]);
  assert.deepEqual(r.remaining.map(e => e.date_key), [3, 4]);
  assert.equal(f.calls.length, 3); // didn't try #4 after a retry

  // a later online flush clears the rest
  const ok = mockFetch(() => res(201));
  const api2 = L.makeApi({ url: 'https://x.supabase.co', key: 'k', fetchFn: ok });
  const r2 = await L.flushQueue(r.remaining, e => api2.submit(e));
  assert.deepEqual(r2.remaining, []);
  assert.equal(r2.sent.length, 2);
  // a throwing submitter counts as retry
  const r3 = await L.flushQueue(q.slice(0, 1), async () => { throw new Error('x'); });
  assert.equal(r3.remaining.length, 1);
});

test('invite links round-trip and the URL is cleaned', () => {
  const loc = new URL('https://brianjbatchelor.github.io/napmap/?g=old#x');
  const link = L.inviteLink(loc, 'ABC234');
  assert.equal(link, 'https://brianjbatchelor.github.io/napmap/?g=ABC234');
  assert.deepEqual(L.readInvite(link), { code: 'ABC234', cleanUrl: '/napmap/' });
  assert.deepEqual(L.readInvite('https://h.io/napmap/?a=1&g=abc-234#top'), { code: 'ABC234', cleanUrl: '/napmap/?a=1#top' });
  assert.deepEqual(L.readInvite('https://h.io/?g=<b>'), { code: null, cleanUrl: '/' });
  assert.equal(L.readInvite('https://h.io/napmap/'), null);
});

test('uuid looks like a v4 uuid', () => {
  assert.match(L.uuid(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
