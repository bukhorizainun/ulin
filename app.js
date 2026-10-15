// Ulin: a tiny NES arcade. Games are open-licensed homebrew; emulation by jsnes (Apache-2.0).
const GAMES = [
  { id: 'nova', title: 'Nova the Squirrel', genre: 'Petualangan', year: 2018, author: 'NovaSquirrel',
    license: 'Kode GPL-3.0, aset CC BY-NC-SA 4.0', src: 'https://github.com/NovaSquirrel/NovaTheSquirrel/tree/v1.0.6a' },
  { id: 'minekart', title: 'Minekart Madness', genre: 'Arcade', year: 2022, author: 'Matt Hughson',
    license: 'MIT', src: 'https://github.com/mhughson/mbh-cart/tree/v1.0' },
  { id: 'thwaite', title: 'Thwaite', genre: 'Tembak rudal', year: 2018, author: 'Damian Yerrick',
    license: 'GPL-3.0', src: 'https://github.com/pinobatch/thwaite-nes/tree/v0.04' },
  { id: 'croom', title: 'Concentration Room', genre: 'Tebak kartu', year: 2010, author: 'Damian Yerrick',
    license: 'GPL-3.0', src: 'https://github.com/pinobatch/croom-nes/tree/v0.02a' },
];

const $ = (id) => document.getElementById(id);
const grid = $('grid'), player = $('player'), canvas = $('screen'), go = $('go');

grid.innerHTML = `
  <a class="card" href="kancil/">
    <img src="kancil/cover.png" width="256" height="240" alt="" loading="lazy" style="image-rendering:auto">
    <div class="meta"><h3>Petualangan Si Kancil</h3><p>Petualangan · 2026</p></div>
  </a>
  <a class="card" href="mael/">
    <img src="mael/og.png" width="256" height="240" alt="" loading="lazy" style="object-fit:cover;image-rendering:auto">
    <div class="meta"><h3>Mael ke Linz</h3><p>Bola bareng Mbappé &amp; Yamal · 2026</p></div>
  </a>` + GAMES.map((g) => `
  <a class="card" href="#/main/${g.id}">
    <img src="games/covers/${g.id}.png" width="256" height="240" alt="" loading="lazy">
    <div class="meta"><h3>${g.title}</h3><p>${g.genre} · ${g.year}</p></div>
  </a>`).join('');
$('credits').innerHTML = GAMES.map((g) =>
  `<li>${g.title} oleh ${g.author} (${g.license}). <a href="${g.src}" target="_blank" rel="noopener">Kode sumber</a></li>`).join('') +
  '<li>Petualangan Si Kancil dan Mael ke Linz: dibuat untuk Ulin, gambar dan suara dari kode.</li>' +
  '<li>Emulator jsnes oleh Ben Firshman dkk. (Apache-2.0). <a href="https://github.com/bfirshman/jsnes" target="_blank" rel="noopener">Kode sumber</a></li>';

// ---------- toast ----------
let toastTimer;
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 1800);
}

// ---------- emulator ----------
let jsnesReady;
function loadJsnes() {
  return jsnesReady ||= new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = 'vendor/jsnes.min.js'; s.onload = ok; s.onerror = fail; document.head.append(s);
  });
}

const ctx2d = canvas.getContext('2d');
const image = ctx2d.createImageData(256, 240);
const pixels = new Uint32Array(image.data.buffer);
const RING = 8192, MASK = RING - 1;
const ringL = new Float32Array(RING), ringR = new Float32Array(RING);
let wr = 0, rd = 0;
let nes = null, audio = null, running = false, raf = 0, last = 0, acc = 0, current = null;
const FRAME_MS = 1000 / 60.0988;

function ensureAudio() {
  if (!audio) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audio = new AC();
    const node = audio.createScriptProcessor(1024, 0, 2);
    node.onaudioprocess = (e) => {
      const l = e.outputBuffer.getChannelData(0), r = e.outputBuffer.getChannelData(1);
      for (let i = 0; i < l.length; i++) {
        if (rd !== wr) { l[i] = ringL[rd]; r[i] = ringR[rd]; rd = (rd + 1) & MASK; } else { l[i] = r[i] = 0; }
      }
    };
    node.connect(audio.destination);
  }
  audio.resume();
}

function loop(t) {
  raf = requestAnimationFrame(loop);
  if (!running || !nes) { last = t; return; }
  acc += Math.min(t - (last || t), 100); last = t;
  let n = 0;
  while (acc >= FRAME_MS && n < 3) { pollGamepad(); nes.frame(); acc -= FRAME_MS; n++; }
  if (n) ctx2d.putImageData(image, 0, 0);
}

async function startGame(g) {
  go.hidden = true;
  ensureAudio();
  try {
    await loadJsnes();
    const buf = new Uint8Array(await (await fetch(`games/nes/${g.id}.nes`)).arrayBuffer());
    let rom = '';
    for (let i = 0; i < buf.length; i += 8192) rom += String.fromCharCode.apply(null, buf.subarray(i, i + 8192));
    if (current !== g) return; // closed while loading
    nes = new jsnes.NES({
      sampleRate: audio ? audio.sampleRate : 44100,
      onFrame: (fb) => { for (let i = 0; i < 61440; i++) pixels[i] = 0xff000000 | fb[i]; },
      onAudioSample: (l, r) => {
        if (((wr - rd) & MASK) > RING - 2048) return; // drop when the buffer runs ahead
        ringL[wr] = l; ringR[wr] = r; wr = (wr + 1) & MASK;
      },
    });
    nes.loadROM(rom);
    running = true; last = 0; acc = 0;
    cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  } catch (e) {
    toast('Game gagal dimuat. Coba lagi.');
  }
}

function stopGame() {
  running = false; nes = null; current = null;
  cancelAnimationFrame(raf);
  if (audio) audio.suspend();
  rd = wr = 0;
  ctx2d.clearRect(0, 0, 256, 240);
}

// ---------- input ----------
const BTN = { a: 0, b: 1, select: 2, start: 3, up: 4, down: 5, left: 6, right: 7 };
const held = new Map(); // key -> set of sources holding it
function press(k, src, down) {
  const set = held.get(k) || new Set();
  const before = set.size > 0;
  down ? set.add(src) : set.delete(src);
  held.set(k, set);
  const after = set.size > 0;
  if (before === after || !nes) return;
  after ? nes.buttonDown(1, BTN[k]) : nes.buttonUp(1, BTN[k]);
}

const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  KeyX: 'a', KeyK: 'a', KeyZ: 'b', KeyJ: 'b', Enter: 'start', ShiftLeft: 'select', ShiftRight: 'select' };
for (const type of ['keydown', 'keyup']) {
  addEventListener(type, (e) => {
    if (player.hidden) return;
    if (e.key === 'Escape' && type === 'keydown') return closePlayer();
    const k = KEYS[e.code];
    if (!k) return;
    e.preventDefault();
    press(k, 'kb', type === 'keydown');
  });
}

// Touch buttons
for (const el of document.querySelectorAll('[data-k]')) {
  const k = el.dataset.k;
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault(); el.setPointerCapture(e.pointerId); el.classList.add('on');
    navigator.vibrate?.(8); press(k, 'touch' + e.pointerId, true);
  });
  const up = (e) => { el.classList.remove('on'); press(k, 'touch' + e.pointerId, false); };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
}

// D-pad: one pointer, direction from its position relative to the center (diagonals allowed)
const dpad = $('dpad'), arms = { up: dpad.querySelector('.u'), down: dpad.querySelector('.d'), left: dpad.querySelector('.l'), right: dpad.querySelector('.r') };
let dpadPointer = null;
function dpadSet(dirs) {
  for (const k of ['up', 'down', 'left', 'right']) {
    arms[k].classList.toggle('on', dirs.has(k));
    press(k, 'dpad', dirs.has(k));
  }
}
function dpadMove(e) {
  const r = dpad.getBoundingClientRect();
  const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  const t = r.width * 0.12, dirs = new Set();
  if (dx < -t && Math.abs(dx) > Math.abs(dy) * 0.45) dirs.add('left');
  if (dx > t && Math.abs(dx) > Math.abs(dy) * 0.45) dirs.add('right');
  if (dy < -t && Math.abs(dy) > Math.abs(dx) * 0.45) dirs.add('up');
  if (dy > t && Math.abs(dy) > Math.abs(dx) * 0.45) dirs.add('down');
  dpadSet(dirs);
}
dpad.addEventListener('pointerdown', (e) => {
  if (dpadPointer !== null) return;
  e.preventDefault(); dpadPointer = e.pointerId; dpad.setPointerCapture(e.pointerId);
  navigator.vibrate?.(8); dpadMove(e);
});
dpad.addEventListener('pointermove', (e) => { if (e.pointerId === dpadPointer) dpadMove(e); });
for (const type of ['pointerup', 'pointercancel']) {
  dpad.addEventListener(type, (e) => { if (e.pointerId === dpadPointer) { dpadPointer = null; dpadSet(new Set()); } });
}

// Gamepad (standard mapping): NES A = right face button, NES B = bottom face button
function pollGamepad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const p = pads && [...pads].find(Boolean);
  if (!p) return;
  const b = (i) => !!(p.buttons[i] && p.buttons[i].pressed);
  const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
  press('a', 'pad', b(1) || b(3)); press('b', 'pad', b(0) || b(2));
  press('select', 'pad', b(8)); press('start', 'pad', b(9));
  press('up', 'pad', b(12) || ay < -0.5); press('down', 'pad', b(13) || ay > 0.5);
  press('left', 'pad', b(14) || ax < -0.5); press('right', 'pad', b(15) || ax > 0.5);
}

// ---------- routing ----------
let gestureOpen = false, openedInApp = false;
grid.addEventListener('click', () => { gestureOpen = true; openedInApp = true; });

function openPlayer(g) {
  current = g;
  $('ptitle').textContent = g.title;
  $('psub').innerHTML = `${g.author} · <a href="${g.src}" target="_blank" rel="noopener" title="${g.license}">lisensi &amp; sumber</a>`;
  document.title = `${g.title} · Ulin`;
  player.hidden = false;
  document.body.style.overflow = 'hidden';
  held.clear();
  if (gestureOpen) startGame(g); else go.hidden = false; // browsers need a tap before sound can play
  gestureOpen = false;
}
function closePlayer() {
  if (openedInApp) { openedInApp = false; history.back(); } else location.hash = '#/';
}
function route() {
  const m = location.hash.match(/^#\/main\/([\w-]+)/);
  const g = m && GAMES.find((x) => x.id === m[1]);
  if (g) { if (current !== g) { stopGame(); openPlayer(g); } return; }
  if (!player.hidden) {
    stopGame(); player.hidden = true; document.body.style.overflow = '';
    document.title = 'Ulin · Hayu ulin bareng';
    if (document.fullscreenElement) document.exitFullscreen();
  }
}
addEventListener('hashchange', route);
route();

go.addEventListener('click', () => current && startGame(current));
$('back').addEventListener('click', closePlayer);
$('share').addEventListener('click', async () => {
  const url = location.href, title = current ? `Main ${current.title} di Ulin` : 'Ulin';
  try {
    if (navigator.share) await navigator.share({ title, text: `${title}, gratis dan langsung main.`, url });
    else { await navigator.clipboard.writeText(url); toast('Link disalin'); }
  } catch (_) { /* share sheet closed */ }
});
const fullBtn = $('full');
if (!document.fullscreenEnabled) fullBtn.hidden = true;
fullBtn.addEventListener('click', async () => {
  if (document.fullscreenElement) return document.exitFullscreen();
  try { await player.requestFullscreen(); await screen.orientation?.lock?.('landscape'); } catch (_) {}
});

document.addEventListener('visibilitychange', () => {
  if (!nes) return;
  running = !document.hidden;
  if (audio) document.hidden ? audio.suspend() : audio.resume();
});
