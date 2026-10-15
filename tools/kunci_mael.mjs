// Encrypts the Mael game with a password so the public repo holds only ciphertext.
// Usage (in your own terminal, so nobody else sees the password):
//   node tools/kunci_mael.mjs
// Reads _mael_src/index.html (git-ignored) and writes mael/index.html (a lock page).
import { readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { webcrypto as crypto } from 'node:crypto';

const ITER = 600000;
const CHECK = process.argv[2] === '--cek'; // only test a password against mael/index.html
let pw = CHECK ? null : process.argv[2];
if (!pw) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  pw = (await rl.question('Password untuk game Mael: ')).trim();
  rl.close();
}
if (pw.length < 4) { console.error('Password minimal 4 karakter.'); process.exit(1); }

const root = new URL('..', import.meta.url);
if (CHECK) {
  const html = readFileSync(new URL('mael/index.html', root), 'utf8');
  const get = (k) => Buffer.from(html.match(new RegExp(k + ": '([^']+)'"))[1], 'base64');
  const b = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  const k = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: get('salt'), iterations: ITER, hash: 'SHA-256' }, b, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  try { await crypto.subtle.decrypt({ name: 'AES-GCM', iv: get('iv') }, k, get('ct')); console.log('COCOK: password ini membuka game.'); }
  catch (_) { console.log('TIDAK COCOK: password ini tidak membuka mael/index.html.'); }
  if (/[&#%+\s]/.test(pw)) console.log('Catatan: password mengandung & # % + atau spasi. Ketik di kotak, jangan lewat link #p=.');
  process.exit(0);
}
const game = readFileSync(new URL('_mael_src/index.html', root));
const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, game));
const b64 = (u) => Buffer.from(u).toString('base64');

const page = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Mael ke Linz</title>
<meta name="robots" content="noindex">
<meta name="description" content="Hadiah ulang tahun ke-7 untuk Mael dari Baba di Linz.">
<meta property="og:title" content="Mael ke Linz">
<meta property="og:description" content="Main bola bareng Mbappé dan Yamal. Hadiah ulang tahun ke-7 untuk Mael dari Baba di Linz.">
<meta property="og:image" content="https://bukhorizainun.github.io/ulin/mael/og.png">
<meta name="theme-color" content="#1D3557">
<link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&display=swap" rel="stylesheet">
<style>
:root{--ink:#1D3557;--red:#E63946;--sun:#FFD23F}
html,body{margin:0;height:100%;background:var(--ink);color:#fff;font-family:"Baloo 2",system-ui,sans-serif}
body{display:grid;place-items:center;padding:16px;box-sizing:border-box}
.box{width:min(440px,100%);background:#fff;color:var(--ink);border-radius:28px;padding:28px 24px;text-align:center;box-shadow:0 18px 50px rgba(0,0,0,.35)}
.gift{width:96px;height:96px;margin:0 auto 6px;animation:bob 2.4s ease-in-out infinite}
@keyframes bob{50%{transform:translateY(-8px) rotate(-3deg)}}
h1{margin:0;font-size:34px;line-height:1.1;color:var(--red)}
p{margin:8px 0 0;font-size:18px;font-weight:600}
.cd{margin:18px 0;display:flex;gap:10px;justify-content:center}
.cd div{background:var(--ink);color:#fff;border-radius:14px;padding:8px 0;width:72px}
.cd b{display:block;font-size:30px;line-height:1}
.cd span{font-size:13px;opacity:.8}
form{display:flex;gap:8px;margin-top:6px}
input{flex:1;min-width:0;font:inherit;font-size:18px;padding:10px 14px;border:2px solid #ccd4e0;border-radius:14px;color:var(--ink)}
button{font:inherit;font-size:18px;font-weight:800;padding:10px 18px;border:0;border-radius:14px;background:var(--red);color:#fff;cursor:pointer}
.msg{min-height:24px;margin-top:10px;font-size:15px;color:var(--red)}
</style>
</head>
<body>
<main class="box">
  <svg class="gift" viewBox="0 0 96 96" aria-hidden="true"><rect x="12" y="40" width="72" height="48" rx="8" fill="#E63946"/><rect x="6" y="28" width="84" height="18" rx="6" fill="#FF6B6B"/><rect x="42" y="28" width="12" height="60" fill="#FFD23F"/><path d="M48 28c-6-14-24-18-24-6 0 6 12 6 24 6zm0 0c6-14 24-18 24-6 0 6-12 6-24 6z" fill="#FFD23F"/></svg>
  <h1>Hadiah rahasia untuk Mael</h1>
  <p>Dibuka saat Mael ulang tahun, 23 Oktober.</p>
  <div class="cd" id="cd"></div>
  <form id="f"><input id="pw" type="password" placeholder="Kata sandi" autocomplete="off" aria-label="Kata sandi"><button>Buka</button></form>
  <div class="msg" id="msg"></div>
</main>
<script>
'use strict';
const P = { salt: '${b64(salt)}', iv: '${b64(iv)}', iter: ${ITER}, ct: '${b64(ct)}' };
const u8 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function unlock(pw) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: u8(P.salt), iterations: P.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const html = new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u8(P.iv) }, key, u8(P.ct)));
  clearInterval(timer); try { localStorage.setItem('mael-pw', pw); } catch (_) {}
  const k = (location.hash.match(/k=([\\w-]+)/) || [])[1];
  history.replaceState(null, '', location.pathname + (k ? '#k=' + k : ''));
  document.open(); document.write(html); document.close();
}
const end = new Date(2026, 9, 23, 0, 0, 0);
function tick() {
  const s = Math.max(0, Math.floor((end - Date.now()) / 1000)), el = document.getElementById('cd');
  if (!el) return;
  const v = [[Math.floor(s / 86400), 'hari'], [Math.floor(s / 3600) % 24, 'jam'], [Math.floor(s / 60) % 60, 'menit'], [s % 60, 'detik']];
  el.innerHTML = s ? v.map(([n, l]) => '<div><b>' + n + '</b><span>' + l + '</span></div>').join('') : '<div style="width:auto;padding:8px 16px"><b>Hari ini!</b></div>';
}
tick(); const timer = setInterval(tick, 1000);
document.getElementById('f').addEventListener('submit', async (e) => {
  e.preventDefault(); const m = document.getElementById('msg'); m.textContent = 'Membuka...';
  try { await unlock(document.getElementById('pw').value.trim()); }
  catch (_) { m.textContent = 'Kata sandinya belum cocok. Tunggu hadiahnya, ya!'; }
});
(async () => { // a link with #p=... or a remembered password opens it directly
  const p = (location.hash.match(/p=([^&]+)/) || [])[1];
  let saved = null; try { saved = localStorage.getItem('mael-pw'); } catch (_) {}
  for (const c of [p && decodeURIComponent(p), saved]) if (c) { try { await unlock(c); return; } catch (_) {} }
})();
</script>
</body>
</html>
`;
writeFileSync(new URL('mael/index.html', root), page);
console.log('Selesai. mael/index.html sekarang terkunci. Ukuran payload: ' + ct.length + ' byte.');
