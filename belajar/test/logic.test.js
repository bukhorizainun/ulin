// Tests for the pure logic of Pulau Belajar. Run: node --test belajar/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rng, shuffle, formatRupiah, DENOMS, makeShopTask, adapt, WORDS, makeWordRound, makeSpelling, starsFor } from '../logic.js';

test('rng with the same seed gives the same sequence', () => {
  const a = rng(42), b = rng(42);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
});

test('shuffle keeps every element exactly once', () => {
  const out = shuffle([1, 2, 3, 4, 5, 6], rng(7));
  assert.deepEqual([...out].sort(), [1, 2, 3, 4, 5, 6]);
});

test('formatRupiah uses Indonesian thousands dots', () => {
  assert.equal(formatRupiah(5000), 'Rp5.000');
  assert.equal(formatRupiah(20000), 'Rp20.000');
  assert.equal(formatRupiah(500), 'Rp500');
});

test('denominations are real rupiah values in ascending order', () => {
  assert.deepEqual(DENOMS, [1000, 2000, 5000, 10000, 20000]);
});

test('level 1 shop task: one item, pay exactly, at most Rp10.000', () => {
  const r = rng(1);
  for (let i = 0; i < 200; i++) {
    const t = makeShopTask(1, r);
    assert.equal(t.kind, 'pay'); assert.equal(t.items.length, 1);
    assert.ok(t.total >= 1000 && t.total <= 10000, t.total);
    assert.equal(t.total % 1000, 0);
  }
});

test('level 2 shop task: two items, total stays within Rp20.000 (sums to 20)', () => {
  const r = rng(2);
  for (let i = 0; i < 200; i++) {
    const t = makeShopTask(2, r);
    assert.equal(t.kind, 'pay'); assert.equal(t.items.length, 2);
    assert.equal(t.total, t.items[0].price + t.items[1].price);
    assert.ok(t.total <= 20000, t.total);
  }
});

test('change tasks: customer pays with one real note larger than the total, change is the difference', () => {
  for (const lv of [3, 4]) {
    const r = rng(lv);
    for (let i = 0; i < 200; i++) {
      const t = makeShopTask(lv, r);
      assert.equal(t.kind, 'change');
      assert.ok(DENOMS.includes(t.paid), t.paid);
      assert.ok(t.paid > t.total, `${t.paid} > ${t.total}`);
      assert.equal(t.change, t.paid - t.total);
      assert.ok(t.paid <= 20000);
    }
  }
});

test('item names in a task are different from each other', () => {
  const r = rng(9);
  for (let i = 0; i < 100; i++) { const t = makeShopTask(4, r); if (t.items.length === 2) assert.notEqual(t.items[0].name, t.items[1].name); }
});

test('adapt: three correct in a row moves up, two wrong in a row moves down, within 1..max', () => {
  assert.equal(adapt(1, [true, true, true], 4), 2);
  assert.equal(adapt(2, [true, true], 4), 2);
  assert.equal(adapt(3, [true, false, false], 4), 2);
  assert.equal(adapt(1, [false, false], 4), 1);
  assert.equal(adapt(4, [true, true, true], 4), 4);
});

test('word list entries have english, indonesian, emoji and category', () => {
  assert.ok(WORDS.length >= 40);
  for (const w of WORDS) { assert.match(w.en, /^[a-z]+$/); assert.ok(w.id && w.emoji && w.cat, JSON.stringify(w)); }
  assert.equal(new Set(WORDS.map((w) => w.en)).size, WORDS.length);
});

test('word round: options are distinct, include the target, count grows with level', () => {
  const r = rng(3);
  for (const [lv, n] of [[1, 2], [2, 3], [3, 4]]) {
    for (let i = 0; i < 100; i++) {
      const q = makeWordRound(lv, r);
      assert.equal(q.options.length, n);
      assert.equal(new Set(q.options.map((o) => o.en)).size, n);
      assert.ok(q.options.some((o) => o.en === q.target.en));
    }
  }
});

test('word round avoids the words asked just before', () => {
  const r = rng(4), recent = WORDS.slice(0, 10).map((w) => w.en);
  for (let i = 0; i < 100; i++) assert.ok(!recent.includes(makeWordRound(2, r, recent).target.en));
});

test('spelling: tiles hold exactly the letters of the word plus the asked number of extras', () => {
  const r = rng(5);
  const s = makeSpelling('apple', r, 2);
  assert.equal(s.tiles.length, 7);
  const counts = (arr) => arr.reduce((m, c) => ((m[c] = (m[c] || 0) + 1), m), {});
  const c = counts(s.tiles);
  for (const [ch, k] of Object.entries(counts([...'apple']))) assert.ok(c[ch] >= k, ch);
});

test('starsFor: 3 stars from 90%, 2 from 60%, otherwise 1', () => {
  assert.equal(starsFor(9, 10), 3); assert.equal(starsFor(6, 10), 2); assert.equal(starsFor(2, 10), 1);
});

test('recordAnswer: a level change clears the streak so the next answer does not jump again', async () => {
  const { recordAnswer } = await import('../logic.js');
  let g = { i: 0, marks: [], firstTry: true, history: [], level: 1 };
  for (let k = 0; k < 3; k++) g = recordAnswer(g, true, 4);
  assert.equal(g.level, 2);
  g = recordAnswer(g, true, 4);
  assert.equal(g.level, 2, 'one more right answer must not move up again');
  assert.equal(g.i, 4);
});

test('recordAnswer: a wrong try keeps the question and marks it as not first-try', async () => {
  const { recordAnswer } = await import('../logic.js');
  let g = { i: 0, marks: [], firstTry: true, history: [], level: 2 };
  g = recordAnswer(g, false, 4); g = recordAnswer(g, true, 4);
  assert.equal(g.i, 1); assert.equal(g.marks[0], false);
});

test('recordAnswer: two wrong tries in a row move down a level', async () => {
  const { recordAnswer } = await import('../logic.js');
  let g = { i: 0, marks: [], firstTry: true, history: [], level: 3 };
  g = recordAnswer(g, false, 4); g = recordAnswer(g, false, 4);
  assert.equal(g.level, 2);
});
