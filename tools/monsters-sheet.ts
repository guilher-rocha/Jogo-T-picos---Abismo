import { Pixmap } from '../src/gfx/pixmap';
import { writePng, sheet } from './png';

const which = process.argv[3] ?? 'a';
const mod = await import(`../src/gfx/monsters_${which}`);
const items: { name: string; img: Pixmap }[] = [];
for (const [k, fn] of Object.entries(mod)) {
  if (typeof fn !== 'function' || ['half', 'whole', 'put', 'under', 'breathe'].includes(k)) continue;
  const fr = (fn as () => Pixmap[])();
  fr.forEach((img, i) => items.push({ name: `${k}${i}`, img }));
}
writePng(process.argv[2] ?? '/tmp/mon_a.png', sheet(items, { cols: 8, scale: 6, cell: 16 }));
console.log('ok', items.length);
