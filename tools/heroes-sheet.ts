import { RACE_IDS, CLASS_IDS, heroFrames } from '../src/gfx/heroes';
import { Pixmap } from '../src/gfx/pixmap';
import { writePng, sheet } from './png';
const items: { name: string; img: Pixmap }[] = [];
for (const c of CLASS_IDS) for (const r of RACE_IDS) items.push({ name: `${r.slice(0, 5)}_${c.slice(0, 4)}`, img: heroFrames(r, c)[0] });
writePng(process.argv[2] ?? '/tmp/heroes.png', sheet(items, { cols: 6, scale: 8, cell: 16 }));
console.log('ok');
