// Lista o gerador de cada andar para uma seed (ajuda a achar exemplos para screenshots).
import { createServer } from 'vite';
const server = await createServer({ logLevel: 'error', server: { middlewareMode: true } });
const { createGame, enterLevel } = await server.ssrLoadModule('/src/core/world.ts');
const seed = Number(process.argv[2] ?? 42);
const g = createGame(seed);
const out = [];
for (let d = 1; d <= 20; d++) { enterLevel(g, d, 'up'); out.push(`${d}:${g.levels[d].generator}`); }
console.log(out.join(' '));
await server.close();
