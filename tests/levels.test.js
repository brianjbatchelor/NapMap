// Size and difficulty are separate: every size (6-10) can be generated at every level (easy, medium, hard, expert),
// and the rating of the result lands in that level's star range.
const test = require('node:test'), assert = require('node:assert');
const D = require('../js/difficulty.js');

test('targetFor with a level ignores the size (except the 10x10 expert step floor)', () => {
  for (const lv of D.LEVELS) for (const n of ['6', '7', '8', '9', '10']) {
    const t = D.targetFor(n, 'cozy', lv);
    assert.strictEqual(t.min, D.DIFFICULTIES[lv].min); assert.strictEqual(t.max, D.DIFFICULTIES[lv].max);
  }
  assert.strictEqual(D.targetFor('10', 'cozy', 'expert').minSteps, 16);
  assert.strictEqual(D.targetFor('9', 'cozy', 'expert').minSteps, undefined);
  assert.deepStrictEqual(D.targetFor('daily', 'cozy', 'hard'), D.TARGETS.daily);   // Daily keeps its own target
  assert.deepStrictEqual(D.targetFor('7', 'cozy'), D.TARGETS[7]);                   // no level: the old per-size target
});

for (const n of [6, 7, 8, 9, 10]) for (const lv of D.LEVELS) for (const style of ['cozy', 'classic']) {
  if (n >= 9 && style === 'classic') continue;                                      // keep the slow sizes quick
  test(`${n}x${n} ${lv} (${style}) is rated inside the level's stars`, () => {
    const T = D.DIFFICULTIES[lv], seeds = n >= 9 ? 2 : 6;
    for (let s = 1; s <= seeds; s++) {
      const P = D.generateRated(n, s * 1013 + n, D.targetFor(String(n), style, lv), style);
      assert.ok(P.rating.level >= T.min && P.rating.level <= T.max, `${n} ${lv} seed ${s}: level ${P.rating.level}, tries ${P.tries}`);
    }
  });
}
