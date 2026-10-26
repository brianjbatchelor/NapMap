// Run: node --test tests/cats-path.test.js
// Entrance path for a placed cat (js/cats.js CatPath): out from behind the furniture on its base row, then only
// walk left/right or jump up one row inside its own area (hop down only when the spot is below the base row).
const test = require('node:test');
const assert = require('node:assert');
const C = require('../js/cats.js');

/* areas drawn as text: '#' cells are area 0, '.' other areas; F marks the furniture rect, T the target */
function area(rows) {
  const n = rows.length, reg = [], F = [];let target = -1;
  rows.forEach((row, r) => [...row].forEach((ch, c) => {
    reg.push(ch === '.' ? 1 : 0);
    if (ch === 'F') F.push([r, c]);
    if (ch === 'T') target = r * n + c;
  }));
  const rs = F.map(f => f[0]), cs = F.map(f => f[1]);
  const rect = { r0: Math.min(...rs), c0: Math.min(...cs), h: Math.max(...rs) - Math.min(...rs) + 1, w: Math.max(...cs) - Math.min(...cs) + 1 };
  return { n, reg, rect, target };
}
const D = { L: -1, R: 1 };
const step = (n, q, m) => q + (m === 'L' ? -1 : m === 'R' ? 1 : m === 'U' ? -n : n);
/* every legal simple route (no revisits) from `from` to `to` */
function allRoutes(n, reg, from, to, allowDown, cap = 200000) {
  const out = [], seen = new Set([from]);
  (function go(q, moves) {
    if (out.length > cap) return;
    if (q === to) { out.push(moves.slice()); return; }
    const r = q / n | 0, c = q % n;
    for (const m of ['L', 'R', 'U', 'D']) {
      if (m === 'D' && !allowDown) continue;
      if (m === 'L' && c === 0 || m === 'R' && c === n - 1) continue;
      const v = step(n, q, m);
      if (v < 0 || v >= n * n || reg[v] !== 0 || seen.has(v)) continue;
      seen.add(v); moves.push(m); go(v, moves); moves.pop(); seen.delete(v);
    }
  })(from, []);
  return out;
}
const consec = ms => ms.reduce((a, m, i) => a + (i && !'LR'.includes(m) && !'LR'.includes(ms[i - 1]) ? 1 : 0), 0);

function check(name, rows, opts = {}) {
  test(name, () => {
    const { n, reg, rect, target } = area(rows);
    const pl = C.plan(n, reg, 0, rect, target);
    assert.ok(pl, 'a plan exists');
    const base = rect.r0 + rect.h - 1, below = (target / n | 0) > base;
    // starts at the base row, just beside (or at the edge of) the furniture
    assert.strictEqual(pl.start.row, base);
    assert.ok(pl.start.col === rect.c0 - 1 || pl.start.col === rect.c0 + rect.w || pl.start.col === rect.c0 || pl.start.col === rect.c0 + rect.w - 1);
    // legal moves only, no revisits, stays in the area, ends at the target
    const seen = new Set();let q = pl.start.row * n + pl.start.col;seen.add(q);
    assert.strictEqual(pl.cells[0], q);
    pl.moves.forEach((m, i) => {
      assert.ok('LRUD'.includes(m));
      if (m === 'D') assert.ok(below || pl.fallback, 'never goes down unless the target is below the base row');
      if (m === 'L') assert.ok(q % n > 0); if (m === 'R') assert.ok(q % n < n - 1);
      q = step(n, q, m);
      assert.strictEqual(reg[q], 0, 'stays in the area');
      assert.ok(!seen.has(q), 'never revisits');seen.add(q);
      assert.strictEqual(pl.cells[i + 1], q);
    });
    assert.strictEqual(q, target);
    // direct: a shortest legal route from its start
    const mine = allRoutes(n, reg, pl.cells[0], target, below || pl.fallback);
    const minLen = Math.min(...mine.map(r => r.length));
    assert.strictEqual(pl.moves.length, minLen, 'route is a shortest legal route from its start');
    // of the routes that length, the chosen one has the fewest back-to-back jumps
    const minC = Math.min(...mine.filter(r => r.length === minLen).map(consec));
    assert.strictEqual(consec(pl.moves), minC);
    if (opts.noConsec) assert.strictEqual(consec(pl.moves), 0, 'no back-to-back jumps when avoidable');
    // the start is the one with the longest direct trip (among starts with the fewest back-to-back jumps)
    const others = C.starts(n, reg, 0, rect).map(s => {
      const rs = allRoutes(n, reg, s.row * n + s.col, target, below);if (!rs.length) return null;
      const L = Math.min(...rs.map(r => r.length)), sh = rs.filter(r => r.length === L), c = Math.min(...sh.map(consec));
      const backOf = r => { let b = 0; for (const m of r) { if (!'LR'.includes(m)) break; if (D[m] === -s.side) b++; } return b; };
      return { L, c, back: Math.min(...sh.filter(r => consec(r) === c).map(backOf)) };
    }).filter(Boolean);
    if (!pl.fallback) {
      const bestC = Math.min(...others.map(o => o.c));
      assert.strictEqual(consec(pl.moves), bestC);
      // longest direct trip among the starts that, like this one, don't walk back past the art
      if (!pl.back) for (const o of others) if (o.c === bestC && !o.back) assert.ok(pl.moves.length >= o.L, 'longest direct trip among the starts');
    }
    if (opts.len != null) assert.strictEqual(pl.moves.length, opts.len);
    if (opts.check) opts.check(pl, n);
  });
}

// 1: an L-shape: furniture bottom-left, target two floors up on the right; the trip should start on the far side
check('L-shape, target two rows up', [
  '....#T',
  '....##',
  'FF####',
  'FF....',
  '......',
  '......'], { noConsec: true });
// 2: a staircase: walk between every jump
check('staircase walks between jumps', [
  '...T#.',
  '..###.',
  '.###..',
  'FF#...',
  'FF....',
  '......'], { noConsec: true, check: pl => assert.ok(pl.moves.join('').indexOf('UU') < 0) });
// 3: a one-column shaft forces back-to-back jumps
check('shaft forces consecutive jumps', [
  '..T...',
  '..#...',
  '..#...',
  'FF#...',
  '......',
  '......'], { check: pl => assert.ok(pl.moves.filter(m => m === 'U').length === 3) });
// 4: target under the furniture on the same row: comes out the side with the longer way round
check('target on the base row beside the art', [
  '......',
  '......',
  '#FF#T#',
  '......',
  '......',
  '......'], { check: (pl, n) => assert.ok(pl.moves.every(m => 'LR'.includes(m))) });
// 5: target below the base row: may hop down
check('target below the base row hops down', [
  '......',
  'FF##..',
  '...#..',
  '...T..',
  '......',
  '......'], { check: pl => assert.ok(pl.moves.includes('D')) });
// 6: a wide area: two routes up, prefers walking first and a gap between jumps
check('wide area, walk first then jump', [
  'T#####',
  '######',
  '###FF#',
  '###FF#',
  '......',
  '......'], { noConsec: true });
// 8: the couch case from a real board: out on the right, hop up onto it and walk along, not back across it first
check('no walking back past the art', [
  '........',
  '........',
  '........',
  '........',
  '........',
  '...#T...',
  '...#####',
  '..##FF##'], { noConsec: true, check: pl => assert.strictEqual(pl.back, 0) });
// 7: unreachable going up only (needs a dip) -> fallback with hops down still ends at the target
check('fallback when only a dip reaches it', [
  '.....T',
  '#....#',
  '#FF..#',
  '######',
  '......',
  '......']);

test('duration cap: stretch and curl never sped up, total within the cap', () => {
  const T = C.T;
  // a very long snake area on 10x10
  const n = 10, reg = Array(n * n).fill(1);
  for (let r = 1; r < n; r += 2) for (let c = 0; c < n; c++) reg[r * n + c] = 0;
  for (let r = 2; r < n; r += 2) reg[r * n + ((r / 2) % 2 ? 0 : n - 1)] = 0;
  const rect = { r0: n - 1, c0: 4, h: 1, w: 2 }, target = 1 * n + 0;
  const pl = C.plan(n, reg, 0, rect, target);
  assert.ok(pl && pl.moves.length > 30);
  const s = C.schedule(n, pl);
  assert.ok(s.total <= T.CAP + 1, `total ${s.total} within ${T.CAP}`);
  assert.ok(s.walkFactor < 1, 'walking sped up to fit');
  assert.strictEqual(s.total - s.move, T.stretch + T.turn + T.fade, 'stretch, turn and curl keep their time');
  // a short trip is not sped up
  const s2 = C.schedule(6, C.plan(...(() => { const a = area(['......', '......', '#FF#T#', '......', '......', '......']); return [a.n, a.reg, 0, a.rect, a.target]; })()));
  assert.strictEqual(s2.walkFactor, 1);
  assert.ok(s2.total < T.CAP);
  // jumps take about 0.35-0.45s when not squeezed
  s2.phases.filter(p => p.type === 'jump').forEach(p => assert.ok(p.dur >= 350 && p.dur <= 450));
});
