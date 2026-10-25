// Run: node --test tests/styles.test.js
// Board styles: Cozy (shaped, rectness 0.7, the default), Boxy (shaped, rectness 1.0), Classic (js/generator.js).
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const G = require('../js/generator.js');
const S = require('../js/generator-shaped.js');
const D = require('../js/difficulty.js');

const hash = p => crypto.createHash('sha1').update(JSON.stringify([p.sol, p.reg, p.colors])).digest('hex');
const STYLES = ['cozy', 'boxy', 'classic'];

test('style list, default and daily rule', () => {
  assert.deepStrictEqual(D.STYLES, STYLES);
  assert.strictEqual(D.DEFAULT_STYLE, 'cozy');
  for (const s of STYLES) assert.strictEqual(D.styleFor('daily', s), 'cozy', 'daily is always cozy');
  assert.strictEqual(D.styleFor('8', 'boxy'), 'boxy');
  assert.strictEqual(D.styleFor('7', 'classic'), 'classic');
  assert.strictEqual(D.styleFor('7', undefined), 'cozy');
  assert.strictEqual(D.styleFor('7', 'nonsense'), 'cozy');
});

test('the fast shaped solver matches SunGen.solutions exactly', () => {
  for (let s = 1; s < 400; s++) {
    const n = 4 + s % 7, reg = G.generate(n, s).reg.slice(), r = G.rng(s);
    for (let i = 0; i < n; i++) reg[r() * n * n | 0] = r() * n | 0; // scramble into multi-solution or broken boards
    for (const lim of [1, 2, 5]) assert.deepStrictEqual(S.solutions(n, reg, lim), G.solutions(n, reg, lim));
  }
});

test('production shaped generator builds the same areas as the experiment', () => {
  const E = require('../experiments/generator-shaped.js');
  for (let s = 1; s <= 12; s++) for (const rect of [0.7, 1]) {
    const n = 6 + s % 3, a = S.generate(n, s, { rectness: rect }), b = E.generate(n, s, { rectness: rect });
    assert.deepStrictEqual([a.sol, a.reg], [b.sol, b.reg]);
  }
});

test('deterministic per seed for every style', () => {
  for (const st of STYLES) for (const n of [6, 7, 8]) {
    const a = D.generateRated(n, 4242, D.targetFor(String(n), st), st), b = D.generateRated(n, 4242, D.targetFor(String(n), st), st);
    assert.strictEqual(hash(a), hash(b), `${st} ${n}`);
  }
  // pinned outputs, so a change to a generator shows up here
  assert.strictEqual(hash(S.generate(8, 12345, { rectness: 0.7 })), hash(D.STYLE_GEN.cozy(8, 12345)));
  assert.strictEqual(hash(G.generate(8, 12345)), 'f2c17c3ce1c9ca92231394dfa25e4bd7034740d7');
  assert.strictEqual(hash(D.STYLE_GEN.classic(8, 12345)), 'f2c17c3ce1c9ca92231394dfa25e4bd7034740d7');
  assert.notStrictEqual(hash(D.STYLE_GEN.cozy(8, 12345)), hash(D.STYLE_GEN.boxy(8, 12345)));
});

test('old call signature still means classic', () => {
  const a = D.generateRated(7, 99, D.TARGETS[7]), b = D.generateRated(7, 99, D.TARGETS[7], 'classic');
  assert.strictEqual(hash(a), hash(b));
  const c = D.generateRated(7, 99, D.TARGETS[7], (n, s) => G.generate(n, s)); // a generator function works too
  assert.strictEqual(hash(a), hash(c));
});

test('shaped puzzles: 10 distinct beds, furniture matched to block shape', () => {
  let tall = 0, wide = 0;
  for (const st of ['cozy', 'boxy']) for (let s = 1; s <= 40; s++) {
    const n = 6 + s % 3, p = D.STYLE_GEN[st](n, s * 7919);
    assert.strictEqual(new Set(p.colors).size, n, 'distinct beds');
    assert.ok(p.colors.every(c => c >= 0 && c <= 9));
    for (let g = 0; g < n; g++) {
      const b = S.innerRect(n, p.reg, g), k = S.kindOf(b), bed = p.colors[g];
      // a tall block never gets wide furniture and vice versa, unless its own pool and the square pool ran out
      if (k === 'tall') { tall++; assert.ok(!S.WIDE.includes(bed) || p.colors.filter(c => S.TALL.includes(c) || S.SQUARE.includes(c)).length === 6, `tall ${st} ${s}`); }
      if (k === 'wide') { wide++; assert.ok(!S.TALL.includes(bed) || p.colors.filter(c => S.WIDE.includes(c) || S.SQUARE.includes(c)).length === 8, `wide ${st} ${s}`); }
    }
    // the most elongated tall block gets a tall drawing when one exists
    const talls = [...Array(n).keys()].filter(g => S.kindOf(S.innerRect(n, p.reg, g)) === 'tall');
    if (talls.length) assert.ok(talls.some(g => S.TALL.includes(p.colors[g])), `tall art used ${st} ${s}`);
  }
  assert.ok(tall > 10 && wide > 10);
});

/* every mode and style: unique, never needs guessing, on target */
const MODES = { 6: 30, 7: 30, daily: 30, 8: 30, 9: 6, 10: 2 };
for (const st of STYLES) for (const [m, count] of Object.entries(MODES)) {
  if (m === 'daily' && st !== 'cozy') continue; // daily is only ever built cozy
  test(`generateRated ${st} mode ${m}: unique, no guessing, on target`, () => {
    const n = m === 'daily' ? 8 : +m, T = D.targetFor(m, st);
    for (let s = 0; s < count; s++) {
      const seed = m === 'daily' ? (20260101 + s) * 31 + 7 : (s * 2654435761 + 17 + st.length) >>> 0;
      const p = D.generateRated(n, seed, T, st), r = D.rate(p);
      assert.notStrictEqual(r.level, 5, `${st} ${m} seed ${seed} needs guessing`);
      assert.ok(r.level >= T.min && r.level <= T.max, `${st} ${m} seed ${seed} level ${r.level}`);
      if (T.minSteps) assert.ok(r.steps >= T.minSteps, `${st} ${m} seed ${seed} steps ${r.steps}`);
      assert.strictEqual(G.solutions(n, p.reg, 2).length, 1, 'unique');
    }
  });
}

test('daily is always a cozy board, deterministic per date', () => {
  const seed = 20261025 * 31 + 7, style = D.styleFor('daily', 'classic');
  const a = D.generateRated(8, seed, D.targetFor('daily', style), style), b = D.generateRated(8, seed, D.TARGETS.daily, 'cozy');
  assert.strictEqual(style, 'cozy');
  assert.strictEqual(hash(a), hash(b));
  const c = D.generateRated(8, seed, D.TARGETS.daily, 'classic');
  assert.notStrictEqual(hash(a), hash(c), 'cozy daily differs from the old classic daily');
  // the cozy daily is built from shaped areas: most areas are near-rectangles
  let off = 0; for (let g = 0; g < 8; g++) off += S.shapeOf(8, a.reg, g).defect;
  assert.ok(off <= S.limits(8, 0.7).total + 8, 'shaped');
});
