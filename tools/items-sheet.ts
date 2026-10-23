import { Pixmap } from '../src/gfx/pixmap';
import { writePng, sheet } from './png';
import { allItemIcons } from '../src/gfx/items';
const icons = allItemIcons();
const items: { name: string; img: Pixmap }[] = [];
for (const [id, fr] of Object.entries(icons)) fr.forEach((img, i) => { if (i === 0) items.push({ name: id.slice(0, 14), img }); });
writePng(process.argv[2] ?? '/tmp/items.png', sheet(items, { cols: 10, scale: 5, cell: 16 }));
console.log('ok', items.length);
