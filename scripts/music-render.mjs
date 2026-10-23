// Renderiza as músicas da trilha fora de tempo real (OfflineAudioContext no Chrome headless),
// salva WAVs para ouvir e imprime níveis (pico, volume médio, trechos em silêncio) para revisão.
// Uso: node scripts/music-render.mjs --out pasta [--songs crypt,mines] [--seconds 30] [--intensity 0]
import { createServer } from 'vite';
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1]]);
    return acc;
  }, []),
);
const out = args.out ?? 'music-out';
const seconds = Number(args.seconds ?? 30);
const intensity = Number(args.intensity ?? 0);
const songs = (args.songs ?? 'title,crypt,mines,fungal,fortress,abyss,gameover,victory').split(',');
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
mkdirSync(out, { recursive: true });

const server = await createServer({ server: { port: 5198, strictPort: false }, logLevel: 'error' });
await server.listen();
const port = server.config.server.port ?? 5198;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://localhost:${port}/?fxlab=1`, { waitUntil: 'networkidle0' });
  for (const id of songs) {
    const res = await page.evaluate(async (id, seconds, intensity) => {
      const mod = await import('/src/engine/music.ts');
      const sr = 32000;
      const t0 = performance.now();
      const buf = await mod.renderSong(id, seconds, intensity, sr);
      const ms = performance.now() - t0;
      const L = buf.getChannelData(0);
      const R = buf.getChannelData(1);
      let peak = 0;
      let sum = 0;
      const perSec = [];
      for (let s = 0; s < Math.floor(L.length / sr); s++) {
        let acc = 0;
        for (let i = s * sr; i < (s + 1) * sr; i++) acc += L[i] * L[i] + R[i] * R[i];
        perSec.push(Math.round(10 * Math.log10(acc / (2 * sr) + 1e-12)));
      }
      for (let i = 0; i < L.length; i++) {
        peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
        sum += L[i] * L[i] + R[i] * R[i];
      }
      // WAV 16 bits estéreo
      const n = L.length;
      const bytes = new Uint8Array(44 + n * 4);
      const dv = new DataView(bytes.buffer);
      const str = (o, s) => [...s].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
      str(0, 'RIFF'); dv.setUint32(4, 36 + n * 4, true); str(8, 'WAVE'); str(12, 'fmt ');
      dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true); dv.setUint32(24, sr, true);
      dv.setUint32(28, sr * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true); str(36, 'data'); dv.setUint32(40, n * 4, true);
      for (let i = 0; i < n; i++) {
        dv.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true);
        dv.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true);
      }
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return { peak, rmsDb: 10 * Math.log10(sum / (2 * n) + 1e-12), perSec, ms, wav: btoa(bin) };
    }, id, seconds, intensity);
    const file = join(out, `${id}${intensity ? '_tensao' : ''}.wav`);
    writeFileSync(file, Buffer.from(res.wav, 'base64'));
    const quiet = res.perSec.filter((v) => v < -45).length;
    console.log(
      `${id.padEnd(9)} pico ${res.peak.toFixed(2)}  média ${res.rmsDb.toFixed(1)} dB  ` +
      `por segundo [${res.perSec.join(' ')}]  silêncio ${quiet}s  render ${Math.round(res.ms)} ms → ${file}`,
    );
  }
  if (errors.length) console.log('ERROS NO BROWSER:\n' + errors.join('\n'));
} finally {
  await browser.close();
  await server.close();
}
