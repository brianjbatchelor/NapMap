// Run: node --test tests/difficulty.test.js
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const G = require('../js/generator.js');
const D = require('../js/difficulty.js');
const { context, toCandidates, findOnly, findLine, findSqueeze, findGroup, findPeers } = D._internal;

const NAMES = ['Tufty Puff Pillow', 'Knitty-Knot Blankets', 'Sisal Tippy Tower', 'Wiggle-Wicker Basket', 'Swingy Hammock',
  'Very Good Box', 'Plushy Donut Bed', 'Tippy Teepee', 'Cloud-Fluff Bed', 'Velvet Fainting Couch'];
const board = rows => { const reg = rows.flatMap(r => r.split('').map(Number)); return { n: rows.length, reg }; };
const solCells = P => P.sol.map((c, r) => r * P.n + c);
const names = P => P.colors.map(c => NAMES[c]);
/* can the solution still be reached from this player state? (no solution cell crossed, every cat on the solution) */
const reachable = (P, st) => st.every((v, k) => { const s = P.sol[k / P.n | 0] === k % P.n; return s ? v === 0 || v === 2 : v !== 2; });
/* full brute-force check that a crossed cell really can't hold a cat: no solution of the candidate grid uses it */
function anySolutionUses(P, st, k) {
  const n = P.n, col = Array(n).fill(false), rg = Array(n).fill(false), pos = [];
  const ok = q => st[q] !== 1 && st[q] !== 3;
  return (function bt(i) {
    if (i === n) return pos[k / n | 0] === k % n;
    for (let c = 0; c < n; c++) { const q = i * n + c;
      if (!ok(q) || col[c] || (i > 0 && Math.abs(pos[i - 1] - c) <= 1) || rg[P.reg[q]]) continue;
      col[c] = rg[P.reg[q]] = true; pos[i] = c; if (bt(i + 1)) return true; col[c] = rg[P.reg[q]] = false; }
    return false; })(0);
}

/* ---------- rules on hand-made boards ---------- */
test('L1 only spot: a row with one open cell gets a cat and its peers are crossed', () => {
  const P = board(['0011', '0211', '2233', '2333']), C = context(P);
  const st = toCandidates(P, [1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const s = findOnly(C, st);
  assert.strictEqual(s.rule, 'only'); assert.strictEqual(s.place, 1);
  assert.deepStrictEqual(s.units[0].type + s.units[0].index, 'row0');
  // column 1, area 0 and neighbours of (0,1) are crossed
  for (const q of [4, 5, 6, 9, 13]) assert.ok(s.cross.includes(q), 'crosses ' + q);
  assert.ok(!s.cross.includes(15));
});
test('L1 explanation names the line', () => {
  const P = board(['0011', '0211', '2233', '2333']); P.sol = [1, 3, 0, 2]; P.colors = [3, 0, 1, 2];
  const t = D.nextStep(P, [1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { names: names(P) });
  assert.strictEqual(t.rule, 'only'); assert.strictEqual(t.action, 'place'); assert.strictEqual(t.cell, 1);
  assert.strictEqual(t.text, 'Row 1 has only one open spot left, so a cat must nap there.');
});
test('cat with open neighbours: tidy-up step crosses them', () => {
  const P = board(['0011', '0211', '2233', '2333']), C = context(P), st = toCandidates(P, [0, 2, 0, 0, ...Array(12).fill(0)]);
  const s = findPeers(C, st); assert.strictEqual(s.cat, 1); assert.ok(s.cross.includes(0) && s.cross.includes(5) && s.cross.includes(13));
});

const LINE = ['00111', '22211', '23331', '44331', '44433'];
test('L2 area in a line: area in one row clears the rest of that row', () => {
  const P = board(LINE), C = context(P), s = findLine(C, toCandidates(P));
  assert.strictEqual(s.rule, 'line'); assert.strictEqual(s.dir, 'area');
  assert.deepStrictEqual(s.units.map(u => u.type + u.index), ['area0', 'row0']);
  assert.deepStrictEqual(s.cross.sort((a, b) => a - b), [2, 3, 4]);
  P.colors = [3, 0, 1, 2, 4];
  const t = D.nextStep(P, Array(25).fill(0), { names: names(P) });
  assert.strictEqual(t.text, 'All the open spots in the Wiggle-Wicker Basket are in row 1, so nothing else in row 1 can have a cat.');
});
test('L2 reverse: a row whose open cells sit in one area clears the rest of the area', () => {
  // no area fits in one line, but row 5 is all Hammock (area 4), so the rest of area 4 (row 4, cols 2..5) is cleared
  const P = board(['00112', '00112', '33322', '34444', '44444']), C = context(P), s = findLine(C, toCandidates(P));
  assert.strictEqual(s.dir, 'line');
  assert.deepStrictEqual(s.units.map(u => u.type + u.index), ['row4', 'area4']);
  assert.deepStrictEqual(s.cross.sort((a, b) => a - b), [16, 17, 18, 19]);
  P.colors = [3, 0, 1, 2, 4];
  assert.match(D.nextStep(P, null, { names: names(P) }).text, /All the open spots in row 5 are in the Swingy Hammock/);
});
test('L3 squeeze: a cell touching every open cell of an area is crossed', () => {
  const P = board(['00111', '12221', '12331', '44331', '44443']), C = context(P), st = toCandidates(P);
  const s = findSqueeze(C, st);
  assert.strictEqual(s.rule, 'squeeze');
  const u = s.units[0], open = u.cells.filter(k => st[k] === 0);
  for (const k of s.cross) assert.ok(open.every(q => C.peer[k * 25 + q]), 'cell ' + k + ' blocks all of ' + u.type + u.index);
  // area 0 is {(0,0),(0,1)}: a cat at (1,0) or (1,1) touches both, so those two are squeezed out by area 0
  assert.deepStrictEqual([u.type, u.index], ['row', 0]);
  const st2 = toCandidates(P); st2[2] = st2[3] = st2[4] = 1; // row 0 and area 0 now share the open spots 0 and 1
  const sq = findSqueeze(C, st2);
  assert.deepStrictEqual(sq.units[0].cells.filter(k => st2[k] === 0), [0, 1]); // row 0 or area 0: same open spots
  assert.deepStrictEqual(sq.cross.sort((a, b) => a - b), [5, 6]);
});
test('L4 groups: two areas confined to two rows clear the rest of those rows', () => {
  const P = board(['00112', '00112', '33332', '34442', '34442']), C = context(P), st = toCandidates(P);
  assert.strictEqual(findLine(C, st), null);
  const s = findGroup(C, st);
  assert.strictEqual(s.rule, 'group'); assert.strictEqual(s.dir, 'row'); assert.ok(s.fromArea);
  assert.deepStrictEqual(s.cross.sort((a, b) => a - b), [4, 9]);
  P.colors = [3, 0, 1, 2, 4];
  const ex = D.nextStep(P, null, { names: names(P) });
  // with an empty board nextStep may find a squeeze first; ask for the group text from a board where nothing simpler works
  assert.ok(typeof ex.text === 'string' && ex.text.length > 10);
});
test('L4 reverse: two columns confined to two areas clear the rest of those areas', () => {
  // columns 0,1 hold only areas 0 and 1; areas 0 and 1 also reach into column 2
  const P = board(['00022', '11122', '00133', '11344', '00144']), C = context(P), st = toCandidates(P);
  const s = findGroup(C, st);
  assert.ok(s, 'found a group');
  const set = new Set(s.units.filter(u => u.type === 'area').map(u => u.index));
  const lines = s.units.filter(u => u.type !== 'area').map(u => u.index);
  assert.strictEqual(set.size, lines.length);
  if (!s.fromArea) for (const k of s.cross) assert.ok(set.has(P.reg[k]) && !lines.includes(s.dir === 'row' ? k / 5 | 0 : k % 5));
});

/* ---------- rating ---------- */
test('rate() returns a level and counts', () => {
  const r = D.rate(G.generate(6, 42));
  assert.ok(r.level >= 1 && r.level <= 5); assert.ok(r.steps > 0);
  assert.deepStrictEqual(Object.keys(r.ruleCounts).sort(), ['group', 'line', 'only', 'squeeze']);
});
test('rate(): when the rules finish, the cats found are the solution', () => {
  for (let s = 1; s <= 60; s++) { const P = G.generate(7, s * 977), r = D.rate(P); if (r.level === 5) continue;
    // replay with nextStep and check it lands on the solution
    let st = Array(49).fill(0);
    for (let i = 0; i < 200 && st.filter(v => v === 2).length < 7; i++) { const t = D.nextStep(P, st);
      if (t.action === 'place') st = applyStep(P, st, t); else if (t.action === 'cross') t.cells.forEach(k => st[k] = 1); else break; }
    assert.deepStrictEqual(solCells(P).every(k => st[k] === 2), true, 'seed ' + s); }
});
function applyStep(P, st, t) { st = st.slice(); const n = P.n, C = context(P);
  if (t.action === 'place') { st[t.cell] = 2; C.peers[t.cell].forEach(q => { if (st[q] === 0) st[q] = 1; }); }
  else if (t.action === 'cross') t.cells.forEach(k => { st[k] = 1; });
  return st; }

const MODES = { 6: 40, 7: 40, daily: 40, 8: 40, 9: 12, 10: 4 };
for (const [m, count] of Object.entries(MODES)) {
  test(`generateRated never needs guessing and hits its target: mode ${m}`, () => {
    const n = m === 'daily' ? 8 : +m, T = D.TARGETS[m];
    for (let s = 0; s < count; s++) {
      const seed = m === 'daily' ? (20260101 + s) * 31 + 7 : (s * 2654435761 + 17) >>> 0;
      const p = D.generateRated(n, seed, T), r = D.rate(p);
      assert.notStrictEqual(r.level, 5, `mode ${m} seed ${seed}`);
      assert.ok(r.level >= T.min && r.level <= T.max, `mode ${m} seed ${seed} level ${r.level}`);
      assert.strictEqual(G.solutions(n, p.reg, 2).length, 1);
    }
  });
}

/* ---------- nextStep truthfulness ---------- */
test('nextStep never crosses a solution cell or places a wrong cat, even mid-game with random player marks', () => {
  for (let s = 1; s <= 40; s++) {
    const n = 6 + s % 4, P = D.generateRated(n, s * 31337, D.TARGETS[n]), sol = new Set(solCells(P));
    // random correct-but-incomplete player marks: some X's on non-solution cells, maybe a cat
    const r = G.rng(s); let st = Array(n * n).fill(0);
    for (let k = 0; k < n * n; k++) if (!sol.has(k) && r() < .25) st[k] = 1;
    if (r() < .5) st[[...sol][r() * n | 0]] = 2;
    for (let i = 0; i < 400; i++) {
      const t = D.nextStep(P, st, { names: names(P) });
      assert.notStrictEqual(t.rule, 'error', 'no false error');
      if (t.action === 'none') break;
      assert.ok(t.text.length > 20);
      if (t.action === 'cross') for (const k of t.cells) {
        assert.ok(!sol.has(k), `seed ${s}: crossed a solution cell (${t.rule})`);
        assert.strictEqual(st[k], 0, 'only crosses open cells');
        // strong check: under the player's marks, no valid layout uses the cell at all
        assert.ok(!anySolutionUses(P, st, k), `seed ${s}: ${t.rule} crossed a cell some layout still uses`);
      }
      if (t.action === 'place') assert.ok(sol.has(t.cell), 'placed on solution');
      st = applyStep(P, st, t);
      assert.ok(reachable(P, st));
    }
    assert.ok(solCells(P).every(k => st[k] === 2), `seed ${s} solved by hints alone`);
  }
});
test('nextStep reports a crossed-out solution cell gently and points at it', () => {
  const P = D.generateRated(7, 99, D.TARGETS[7]), st = Array(49).fill(0), bad = solCells(P)[3];
  st[bad] = 1;
  const t = D.nextStep(P, st, { names: names(P) });
  assert.strictEqual(t.rule, 'error'); assert.deepStrictEqual(t.cells, [bad]); assert.strictEqual(t.action, 'none');
  assert.strictEqual(t.text, "One of your X's is on a spot a cat needs. Try undoing.");
});
test('nextStep uses furniture names for areas', () => {
  let seen = 0;
  for (let s = 1; s <= 30 && !seen; s++) { const P = D.generateRated(6, s, D.TARGETS[6]); let st = Array(36).fill(0);
    for (let i = 0; i < 100; i++) { const t = D.nextStep(P, st, { names: names(P) }); if (t.action === 'none') break;
      if (t.units.some(u => u.type === 'area') && t.rule !== 'only') { assert.ok(NAMES.some(nm => t.text.includes('the ' + nm)), t.text); seen++; }
      st = applyStep(P, st, t); } }
  assert.ok(seen > 0);
});
test('nextStep on a finished board says so', () => {
  const P = G.generate(6, 5), st = Array(36).fill(1); solCells(P).forEach(k => st[k] = 2);
  assert.strictEqual(D.nextStep(P, st).rule, 'done');
});

/* ---------- daily determinism ---------- */
test('daily puzzle is deterministic per date', () => {
  const seed = 20261025 * 31 + 7, a = D.generateRated(8, seed, D.TARGETS.daily), b = D.generateRated(8, seed, D.TARGETS.daily);
  assert.deepStrictEqual([a.sol, a.reg, a.colors], [b.sol, b.reg, b.colors]);
  const h = crypto.createHash('sha1').update(JSON.stringify([a.sol, a.reg, a.colors])).digest('hex');
  assert.strictEqual(h, 'b593525950eed75a63a23f97c3e2a0404ac04302');
  assert.deepStrictEqual(a.sol, [7, 3, 5, 2, 6, 1, 4, 0]);
});
test('generate() itself is unchanged', () => {
  const p = G.generate(8, 12345), h = crypto.createHash('sha1').update(JSON.stringify([p.sol, p.reg, p.colors])).digest('hex');
  assert.strictEqual(h, 'f2c17c3ce1c9ca92231394dfa25e4bd7034740d7');
});
