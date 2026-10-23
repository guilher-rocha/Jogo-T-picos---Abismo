// Teste ponta a ponta do multijogador: sobe o servidor da rede local (dist-server/lan.mjs, já compilado),
// abre dois navegadores headless (Ana e Bia), faz a sala, inicia e joga alguns turnos, tirando screenshots.
// Uso: node scripts/lan-e2e.mjs --out pasta   (antes: npm run build && esbuild do servidor — ver "npm run lan")
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1]]);
    return acc;
  }, []),
);
const out = args.out ?? 'lan-e2e';
const PORT = Number(args.port ?? 8099);
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
mkdirSync(out, { recursive: true });

const server = spawn(process.execPath, ['dist-server/lan.mjs', '--port', String(PORT)], {
  stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ABISMO_SEED: String(args.seed ?? 123) },
});
const serverLog = [];
server.stdout.on('data', (d) => serverLog.push(String(d)));
server.stderr.on('data', (d) => serverLog.push(String(d)));
await new Promise((r) => setTimeout(r, 1200));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
const errors = [];
async function open(name, cls) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  page.on('pageerror', (e) => errors.push(`${name}: ${e}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name}: ${m.text()}`); });
  await page.goto(`http://localhost:${PORT}/?lan=1&quick=1&name=${name}&class=${cls}`, { waitUntil: 'networkidle0' });
  return page;
}
const press = async (page, key, times = 1) => {
  for (let i = 0; i < times; i++) {
    await page.keyboard.press(key);
    await sleep(120);
  }
};
const shot = (page, file) => page.screenshot({ path: join(out, file) });

try {
  const ana = await open('Ana', 'warrior');
  const bia = await open('Bia', 'mage');
  await sleep(800);
  await shot(ana, '1_sala_ana.png');
  await press(bia, ' '); // Bia pronta
  await sleep(300);
  await press(ana, 'Enter'); // líder inicia
  await sleep(1200);
  await shot(ana, '2_inicio_ana.png');
  await shot(bia, '2_inicio_bia.png');
  // Ana anda; Bia ainda não: Ana espera
  await press(ana, 'l');
  await sleep(500);
  await shot(ana, '3_ana_esperando.png');
  await press(bia, 'h');
  await sleep(700);
  await shot(bia, '4_bia_andou.png');
  // alguns turnos juntos
  for (let i = 0; i < 4; i++) {
    await press(ana, 'j');
    await press(bia, 'j');
    await sleep(250);
  }
  // conversa
  await press(bia, 'Enter');
  for (const ch of 'vamos descer') await bia.keyboard.press(ch === ' ' ? 'Space' : ch);
  await press(bia, 'Enter');
  await sleep(700);
  await shot(ana, '5_ana_chat.png');
  await shot(bia, '5_bia.png');
  // Bia recarrega a página no meio da partida: volta para o mesmo herói (token da aba)
  await bia.reload({ waitUntil: 'networkidle0' });
  await sleep(1500);
  await shot(bia, '6_bia_reconectou.png');
  await press(bia, 'k');
  await press(ana, 'k');
  await sleep(600);
  await shot(ana, '7_ana_depois.png');
} finally {
  await browser.close();
  server.kill();
  console.log('--- servidor ---\n' + serverLog.join('').trim());
  if (errors.length) console.log('--- ERROS NO NAVEGADOR ---\n' + errors.join('\n'));
  console.log(`screenshots em ${out}`);
}
