// Pure logic for Pulau Belajar (no DOM). Tested in test/logic.test.js.

// Small seeded random generator (mulberry32) so tasks can be replayed in tests.
export function rng(seed = Date.now()) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const pick = (arr, r) => arr[Math.floor(r() * arr.length)];
export function shuffle(arr, r) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ---------- Pasar Kancil: money in thousands of rupiah, so the sums stay within 20 (Fase A) ----------
export const DENOMS = [1000, 2000, 5000, 10000, 20000];
export function formatRupiah(n) { return 'Rp' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
export const GOODS = [
  { name: 'Timun', emoji: '🥒' }, { name: 'Pisang', emoji: '🍌' }, { name: 'Jeruk', emoji: '🍊' }, { name: 'Tomat', emoji: '🍅' },
  { name: 'Jagung', emoji: '🌽' }, { name: 'Wortel', emoji: '🥕' }, { name: 'Telur', emoji: '🥚' }, { name: 'Roti', emoji: '🍞' },
  { name: 'Susu', emoji: '🥛' }, { name: 'Apel', emoji: '🍎' }, { name: 'Mangga', emoji: '🥭' }, { name: 'Kerupuk', emoji: '🍘' },
];
const thousands = (lo, hi, r) => (lo + Math.floor(r() * (hi - lo + 1))) * 1000;

// Level 1: one item, pay exactly (<= 10 ribu). Level 2: two items, pay exactly (sum <= 20 ribu).
// Level 3: one item, the buyer gives one note, the child gives change. Level 4: two items and change.
export function makeShopTask(level, r) {
  const two = level === 2 || level === 4, change = level >= 3;
  const [g1, g2] = shuffle(GOODS, r);
  let items;
  if (!two) items = [{ ...g1, price: thousands(1, level === 1 ? 10 : 18, r) }];
  else { const a = thousands(1, 9, r), b = thousands(1, Math.min(9, (change ? 18 : 20) - a / 1000), r); items = [{ ...g1, price: a }, { ...g2, price: b }]; }
  const total = items.reduce((s, it) => s + it.price, 0);
  if (!change) return { kind: 'pay', level, items, total };
  const notes = DENOMS.filter((d) => d > total);
  const paid = notes[0] === total ? notes[1] : notes[Math.floor(r() * Math.min(2, notes.length))];
  return { kind: 'change', level, items, total, paid, change: paid - total };
}

// Adaptive difficulty: three right in a row moves up, two wrong in a row moves down.
export function adapt(level, history, max) {
  const last = (n) => history.slice(-n);
  if (history.length >= 3 && last(3).every(Boolean)) return Math.min(max, level + 1);
  if (history.length >= 2 && last(2).every((x) => !x)) return Math.max(1, level - 1);
  return level;
}

// One answer in a round: right answers advance; a level change starts a fresh streak.
export function recordAnswer(g, ok, max) {
  const history = [...g.history, ok], level = adapt(g.level, history, max);
  const n = { ...g, marks: [...g.marks], history: level !== g.level ? [] : history, level };
  if (ok) { n.marks[g.i] = g.firstTry; n.i = g.i + 1; n.firstTry = true; } else n.firstTry = false;
  return n;
}

export const starsFor = (right, total) => (right / total >= .9 ? 3 : right / total >= .6 ? 2 : 1);

// ---------- Kata Ajaib: everyday English words for young learners ----------
export const WORDS = [
  ['apple', 'apel', '🍎', 'fruit'], ['banana', 'pisang', '🍌', 'fruit'], ['orange', 'jeruk', '🍊', 'fruit'], ['grapes', 'anggur', '🍇', 'fruit'],
  ['watermelon', 'semangka', '🍉', 'fruit'], ['mango', 'mangga', '🥭', 'fruit'], ['strawberry', 'stroberi', '🍓', 'fruit'],
  ['cat', 'kucing', '🐱', 'animal'], ['dog', 'anjing', '🐶', 'animal'], ['bird', 'burung', '🐦', 'animal'], ['fish', 'ikan', '🐟', 'animal'],
  ['cow', 'sapi', '🐄', 'animal'], ['chicken', 'ayam', '🐔', 'animal'], ['elephant', 'gajah', '🐘', 'animal'], ['tiger', 'harimau', '🐯', 'animal'],
  ['monkey', 'monyet', '🐵', 'animal'], ['rabbit', 'kelinci', '🐰', 'animal'], ['duck', 'bebek', '🦆', 'animal'],
  ['red', 'merah', '🟥', 'color'], ['blue', 'biru', '🟦', 'color'], ['green', 'hijau', '🟩', 'color'], ['yellow', 'kuning', '🟨', 'color'],
  ['black', 'hitam', '⬛', 'color'], ['white', 'putih', '⬜', 'color'],
  ['sun', 'matahari', '☀️', 'nature'], ['moon', 'bulan', '🌙', 'nature'], ['star', 'bintang', '⭐', 'nature'], ['tree', 'pohon', '🌳', 'nature'],
  ['flower', 'bunga', '🌸', 'nature'], ['rain', 'hujan', '🌧️', 'nature'],
  ['car', 'mobil', '🚗', 'vehicle'], ['bus', 'bus', '🚌', 'vehicle'], ['ship', 'kapal', '🚢', 'vehicle'], ['plane', 'pesawat', '✈️', 'vehicle'],
  ['bicycle', 'sepeda', '🚲', 'vehicle'], ['train', 'kereta', '🚆', 'vehicle'],
  ['book', 'buku', '📖', 'school'], ['pencil', 'pensil', '✏️', 'school'], ['ball', 'bola', '⚽', 'school'], ['bag', 'tas', '🎒', 'school'],
  ['house', 'rumah', '🏠', 'home'], ['bed', 'tempat tidur', '🛏️', 'home'], ['door', 'pintu', '🚪', 'home'], ['clock', 'jam', '🕒', 'home'],
  ['milk', 'susu', '🥛', 'food'], ['bread', 'roti', '🍞', 'food'], ['egg', 'telur', '🥚', 'food'], ['rice', 'nasi', '🍚', 'food'],
].map(([en, id, emoji, cat]) => ({ en, id, emoji, cat }));

// Level 1: 2 pictures, level 2: 3, level 3+: 4. Distractors prefer the same category (harder) from level 3.
export function makeWordRound(level, r, recent = []) {
  const n = Math.min(4, level + 1);
  const pool = WORDS.filter((w) => !recent.includes(w.en) && (level > 1 || w.en.length <= 6));
  const target = pick(pool.length ? pool : WORDS, r);
  const same = shuffle(WORDS.filter((w) => w.cat === target.cat && w.en !== target.en), r);
  const other = shuffle(WORDS.filter((w) => w.cat !== target.cat), r);
  const distract = (level >= 3 ? [...same, ...other] : [...other, ...same]).slice(0, n - 1);
  return { target, options: shuffle([target, ...distract], r) };
}

// Spelling: the word's letters plus a few extra letters, shuffled.
export function makeSpelling(word, r, extras = 0) {
  const abc = 'abcdefghijklmnopqrstuvwxyz'.split('').filter((c) => !word.includes(c));
  return { word, tiles: shuffle([...word, ...shuffle(abc, r).slice(0, extras)], r) };
}
