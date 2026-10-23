import { Pixmap } from '../src/gfx/pixmap';
import { writePng, sheet } from './png';
import { lookIcon } from '../src/gfx/items';
import { LOOKS } from '../src/data/appearances';
import type { LookCategory } from '../src/data/appearances';

/** Ícones de poções, varinhas, anéis e amuletos pela aparência (o que o jogador vê antes de identificar). */
const items: { name: string; img: Pixmap }[] = [];
for (const [cat, looks] of Object.entries(LOOKS) as [LookCategory, string[]][]) {
  for (const look of looks) items.push({ name: look.slice(0, 14), img: lookIcon(cat, look)[0] });
}
writePng(process.argv[2] ?? '/tmp/looks.png', sheet(items, { cols: 9, scale: 5, cell: 16 }));
console.log('ok', items.length);
