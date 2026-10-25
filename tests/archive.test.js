// Run: node tests/archive.test.js   (also try TZ=Pacific/Auckland or TZ=America/Los_Angeles)
const assert = require('assert');
const C = require('../js/archive.js');
let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('ok -', name); };

t('month lengths and leap years', () => {
  assert.strictEqual(C.daysInMonth(2026, 1), 28);
  assert.strictEqual(C.daysInMonth(2028, 1), 29);
  assert.strictEqual(C.daysInMonth(2100, 1), 28); // century, not leap
  assert.strictEqual(C.daysInMonth(2000, 1), 29); // 400-year leap
  assert.strictEqual(C.daysInMonth(2026, 0), 31);
  assert.strictEqual(C.daysInMonth(2026, 3), 30);
  assert.strictEqual(C.daysInMonth(2026, 11), 31);
});

t('grid starts on Sunday', () => {
  // Jan 1 2026 is a Thursday -> 4 leading blanks
  const g = C.monthGrid(2026, 0);
  assert.deepStrictEqual(g[0], [null, null, null, null, 20260101, 20260102, 20260103]);
  assert.strictEqual(C.dateOf(g[1][0]).getDay(), 0);
  // Feb 2026 starts on Sunday and has 28 days: exactly 4 full weeks, no padding
  const f = C.monthGrid(2026, 1);
  assert.strictEqual(f.length, 4);
  assert.strictEqual(f[0][0], 20260201);
  assert.strictEqual(f[3][6], 20260228);
  // Nov 2026 starts Sunday, 30 days -> 5 weeks, last week padded
  const n = C.monthGrid(2026, 10);
  assert.strictEqual(n[0][0], 20261101);
  assert.deepStrictEqual(n[4], [20261129, 20261130, null, null, null, null, null]);
});

t('every grid is whole weeks with every day once', () => {
  for (let y = 2026; y <= 2028; y++) for (let m = 0; m < 12; m++) {
    const g = C.monthGrid(y, m), flat = g.flat();
    g.forEach(w => assert.strictEqual(w.length, 7));
    const days = flat.filter(Boolean);
    assert.strictEqual(days.length, C.daysInMonth(y, m));
    days.forEach((k, i) => assert.strictEqual(k, C.keyFor(y, m, i + 1)));
    assert.strictEqual(flat.indexOf(days[0]), C.firstWeekday(y, m));
    assert.ok(flat.length - flat.lastIndexOf(days[days.length - 1]) <= 7);
    // weekday of each key matches its column
    g.forEach(w => w.forEach((k, col) => { if (k) assert.strictEqual(C.dateOf(k).getDay(), col); }));
  }
});

t('leap-year Feb grid', () => {
  const g = C.monthGrid(2028, 1); // Feb 1 2028 is a Tuesday
  assert.deepStrictEqual(g[0].slice(0, 3), [null, null, 20280201]);
  assert.strictEqual(g.flat().filter(Boolean).pop(), 20280229);
});

t('key helpers use local dates across month/year/leap boundaries', () => {
  assert.strictEqual(C.addDays(20260131, 1), 20260201);
  assert.strictEqual(C.addDays(20260301, -1), 20260228);
  assert.strictEqual(C.addDays(20280301, -1), 20280229);
  assert.strictEqual(C.addDays(20261231, 1), 20270101);
  assert.strictEqual(C.addDays(20260101, -1), 20251231);
  // across DST changes in most zones
  assert.strictEqual(C.addDays(20260307, 2), 20260309);
  assert.strictEqual(C.addDays(20261031, 2), 20261102);
  assert.strictEqual(C.keyOf(C.dateOf(20261025)), 20261025);
  assert.deepStrictEqual(C.shiftMonth(2026, 0, -1), { y: 2025, m: 11 });
  assert.deepStrictEqual(C.shiftMonth(2026, 11, 1), { y: 2027, m: 0 });
});

t('playable range: start through today', () => {
  const td = 20261025;
  assert.ok(C.isPlayable(20260101, td));
  assert.ok(!C.isPlayable(20251231, td));
  assert.ok(C.isPlayable(td, td));
  assert.ok(!C.isPlayable(20261026, td));
  assert.strictEqual(C.playableDays(2026, 9, td).length, 25);
  assert.strictEqual(C.playableDays(2026, 0, td).length, 31);
  assert.strictEqual(C.playableDays(2026, 10, td).length, 0);
  assert.strictEqual(C.playableDays(2025, 11, td).length, 0);
  // today on the 1st -> only one playable day that month
  assert.deepStrictEqual(C.playableDays(2026, 10, 20261101), [20261101]);
});

t('month arrows stop at start and current month', () => {
  const td = 20261025;
  assert.ok(!C.canShift(2026, 0, -1, td));
  assert.ok(C.canShift(2026, 0, 1, td));
  assert.ok(!C.canShift(2026, 9, 1, td));
  assert.ok(C.canShift(2026, 9, -1, td));
  // on the very first day only one month exists
  assert.ok(!C.canShift(2026, 0, -1, 20260101));
  assert.ok(!C.canShift(2026, 0, 1, 20260101));
  // into next year
  assert.ok(C.canShift(2026, 11, 1, 20270115));
  assert.deepStrictEqual(C.clampMonth(2025, 5, td), { y: 2026, m: 0 });
  assert.deepStrictEqual(C.clampMonth(2027, 2, td), { y: 2026, m: 9 });
  assert.deepStrictEqual(C.clampMonth(2026, 4, td), { y: 2026, m: 4 });
});

t('solved count only counts playable days', () => {
  const td = 20261025;
  const solved = new Set([20261001, 20261020, 20261025, 20261026, 20260930, 20251231, 20260101]);
  const get = k => (solved.has(k) ? { timeMs: 161000, heartsLost: 0 } : null);
  assert.deepStrictEqual(C.monthSummary(2026, 9, td, get), { solved: 3, playable: 25 });
  assert.deepStrictEqual(C.monthSummary(2026, 0, td, get), { solved: 1, playable: 31 });
  assert.deepStrictEqual(C.monthSummary(2025, 11, td, get), { solved: 0, playable: 0 });
});

t('focus picking stays inside playable days', () => {
  const td = 20261025;
  assert.strictEqual(C.pickFocus(2026, 9, 20261020, td), 20261020);
  assert.strictEqual(C.pickFocus(2026, 9, 20260931 /* bogus */, td), 20261025);
  assert.strictEqual(C.pickFocus(2026, 1, 20260331, td), 20260228); // day 31 -> Feb 28
  assert.strictEqual(C.pickFocus(2026, 9, 20260929, td), 20261025); // Oct 29 is future -> today
  assert.strictEqual(C.pickFocus(2026, 10, 20261025, td), null);
  assert.strictEqual(C.pickFocus(2026, 0, null, td), 20260101);
});

console.log(`\n${passed} tests passed (TZ=${Intl.DateTimeFormat().resolvedOptions().timeZone})`);
