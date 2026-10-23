/**
 * Servidor do multijogador em rede local.
 *
 *   npm run lan            (compila o jogo e sobe o servidor na porta 8080)
 *
 * Serve o jogo compilado (dist/) por HTTP e roda a partida (src/net/room.ts) com WebSocket em /ws.
 * Os amigos na mesma rede abrem no navegador um dos endereços mostrados ao iniciar.
 */
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import { Room } from '../src/net/room';
import type { Conn } from '../src/net/room';
import type { ClientMsg } from '../src/net/protocol';
import { LAN_PORT } from '../src/net/protocol';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const argPort = process.argv.indexOf('--port');
const PORT = Number(process.env.PORT ?? (argPort > 0 ? process.argv[argPort + 1] : LAN_PORT));

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2',
};

/** Avisa a página que ela veio do servidor da rede local (o menu de multijogador conecta direto aqui). */
const LAN_FLAG = '<script>window.__ABISMO_LAN__ = true;</script>';

async function serveFile(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!existsSync(DIST)) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('O jogo ainda não foi compilado. Rode "npm run lan" (ou "npm run build" e depois o servidor).');
    return;
  }
  const url = new URL(req.url ?? '/', 'http://localhost');
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
  const file = resolve(DIST, rel || 'index.html');
  // nada fora de dist/
  if (file !== DIST && !file.startsWith(DIST + sep)) {
    res.writeHead(403).end();
    return;
  }
  const target = existsSync(file) && extname(file) ? file : join(DIST, 'index.html');
  try {
    let body: Buffer | string = await readFile(target);
    const type = TYPES[extname(target)] ?? 'application/octet-stream';
    if (target.endsWith('index.html')) body = body.toString('utf-8').replace('<head>', `<head>${LAN_FLAG}`);
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
}

const http = createServer((req, res) => void serveFile(req, res));
const wss = new WebSocketServer({ server: http, path: '/ws' });
// ABISMO_SEED fixa o mundo (testes); sem ela, cada partida tem um mundo novo.
const fixedSeed = process.env.ABISMO_SEED ? Number(process.env.ABISMO_SEED) >>> 0 : undefined;
const room = new Room(() => fixedSeed ?? Date.now() >>> 0);

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
  const who = req.socket.remoteAddress ?? '?';
  const conn: Conn = {
    send: (msg) => {
      if (ws.readyState === 1) ws.send(JSON.stringify(msg));
    },
  };
  let alive = true;
  ws.on('pong', () => (alive = true));
  const ping = setInterval(() => {
    if (!alive) {
      ws.terminate();
      return;
    }
    alive = false;
    ws.ping();
  }, 15000);
  ws.on('message', (data: unknown) => {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(String(data)) as ClientMsg;
    } catch {
      conn.send({ t: 'error', text: 'Mensagem inválida.' });
      return;
    }
    try {
      if (msg.t === 'hello') console.log(`  + ${msg.name} entrou (${who})`);
      if (msg.t === 'start') console.log('  ▶ partida iniciada');
      room.handle(conn, msg);
    } catch (e) {
      console.error('Erro ao tratar mensagem:', e);
      conn.send({ t: 'error', text: 'Erro no servidor (veja o terminal do anfitrião).' });
    }
  });
  ws.on('close', () => {
    clearInterval(ping);
    console.log(`  - conexão encerrada (${who})`);
    room.disconnect(conn);
  });
});

/** IPs desta máquina na rede local (o que os amigos digitam no navegador). */
function lanAddresses(): string[] {
  const out: string[] = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const a of list ?? []) if (a.family === 'IPv4' && !a.internal) out.push(a.address);
  }
  return out;
}

http.on('error', (e: NodeJS.ErrnoException) => {
  if (e.code === 'EADDRINUSE') console.error(`A porta ${PORT} já está em uso. Use outra: npm run lan -- --port 8090`);
  else console.error(e);
  process.exit(1);
});

http.listen(PORT, '0.0.0.0', () => {
  console.log('\n  ABISMO — servidor da rede local\n');
  console.log(`  Neste computador:   http://localhost:${PORT}`);
  const ips = lanAddresses();
  for (const ip of ips) console.log(`  Na rede (amigos):   http://${ip}:${PORT}`);
  if (!ips.length) console.log('  (nenhuma rede encontrada — conecte-se ao Wi-Fi/cabo)');
  console.log('\n  Todos abrem o endereço no navegador → "Multijogador (rede local)".');
  console.log('  Se o Windows perguntar, permita o Node.js na rede privada (firewall).');
  console.log('  Ctrl+C encerra.\n');
});
