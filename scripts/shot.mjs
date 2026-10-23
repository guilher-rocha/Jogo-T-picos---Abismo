// Verificação visual: sobe o Vite, abre o jogo no Chrome headless, envia teclas e tira screenshot.
// Uso: node scripts/shot.mjs --out shot.png [--query "seed=1"] [--keys "l,l,j,Shift+L"] [--wait 300]
// Teclas separadas por vírgula; "wait:500" pausa; "text:abc" digita texto; "hold:l:20" segura a tecla l
// (1 toque + 19 repetições automáticas, como o teclado faz ao segurar).
// --frames 6 --every 60: depois das teclas, tira 6 quadros seguidos (shot_0.png, shot_1.png...) — bom para ver animações.
import { createServer } from 'vite';
import puppeteer from 'puppeteer-core';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1]]);
    return acc;
  }, []),
);
const out = args.out ?? 'shot.png';
const query = args.query ? `?${args.query}` : '';
const keys = args.keys ? args.keys.split(',').filter(Boolean) : [];
const wait = Number(args.wait ?? 300);
const frames = Number(args.frames ?? 1);
const every = Number(args.every ?? 60);
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const server = await createServer({ server: { port: 5199, strictPort: false }, logLevel: 'error' });
await server.listen();
const port = server.config.server.port ?? 5199;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://localhost:${port}/${query}`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, wait));
  for (const k of keys) {
    if (k.startsWith('wait:')) { await new Promise((r) => setTimeout(r, Number(k.slice(5)))); continue; }
    if (k.startsWith('text:')) { await page.keyboard.type(k.slice(5)); continue; }
    if (k.startsWith('hold:')) {
      const [, key, n] = k.split(':');
      for (let i = 0; i < Number(n); i++) { await page.keyboard.down(key); await new Promise((r) => setTimeout(r, 35)); }
      await page.keyboard.up(key);
      continue;
    }
    const parts = k.split('+');
    const main = parts.pop();
    for (const m of parts) await page.keyboard.down(m);
    await page.keyboard.press(main);
    for (const m of parts.reverse()) await page.keyboard.up(m);
    await new Promise((r) => setTimeout(r, 30));
  }
  await new Promise((r) => setTimeout(r, wait));
  if (frames <= 1) await page.screenshot({ path: out });
  else {
    for (let i = 0; i < frames; i++) {
      await page.screenshot({ path: out.replace(/(\.png)?$/, `_${i}.png`) });
      await new Promise((r) => setTimeout(r, every));
    }
  }
  if (errors.length) console.log('ERROS NO BROWSER:\n' + errors.join('\n'));
  console.log('screenshot salvo em', out);
} finally {
  await browser.close();
  await server.close();
}
