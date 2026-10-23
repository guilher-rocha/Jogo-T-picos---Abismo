import { STYLES, makeFloor, makeCorridor, makeFace, makeRoof, makeRimParts } from '../src/gfx/terrain';
import { Pixmap } from '../src/gfx/pixmap';
import { writePng, sheet } from './png';

const out = process.argv[2] ?? '/tmp/terrain.png';
const items: { name: string; img: Pixmap }[] = [];
for (const id of Object.keys(STYLES)) {
  const st = STYLES[id];
  for (let v = 0; v < 6; v++) items.push({ name: `${id}_floor${v}`, img: makeFloor(st, v) });
  for (let v = 0; v < 3; v++) items.push({ name: `${id}_cor${v}`, img: makeCorridor(st, v) });
  for (let v = 0; v < 3; v++) items.push({ name: `${id}_face${v}`, img: makeFace(st, v) });
  for (let v = 0; v < 2; v++) items.push({ name: `${id}_roof${v}`, img: makeRoof(st, v) });
  const r = makeRimParts(st);
  items.push({ name: `${id}_rimN`, img: r.rimN }, { name: `${id}_capL`, img: r.capL });
}
writePng(out, sheet(items, { cols: 7, scale: 4 }));
console.log('ok', items.length, out);
