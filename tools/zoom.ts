import { writePng, sheet } from './png';
// uso: tsx tools/zoom.ts saida.png <modulo em src/gfx> escala célula nomeDaFuncao...
const [out, modName, scale, cell, ...names] = process.argv.slice(2);
const mod = await import(`../src/gfx/${modName}`);
const items: any[] = [];
for (const n of names) mod[n]().forEach((img: any, i: number) => items.push({ name: n + i, img }));
writePng(out, sheet(items, { cols: 4, scale: Number(scale), cell: Number(cell) }));
console.log('ok', items.length);
