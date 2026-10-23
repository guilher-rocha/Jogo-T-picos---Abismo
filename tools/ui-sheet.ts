import { Pixmap } from '../src/gfx/pixmap';
import { writePng, sheet } from './png';
import { logoFrames, tombstone, LOGO_FIRE, LOGO_BLOOD, LOGO_GOLD } from '../src/gfx/ui';

const items: { name: string; img: Pixmap }[] = [];
const logo = logoFrames('ABISMO', LOGO_FIRE);
items.push({ name: 'logo0', img: logo[0] }, { name: 'logo5', img: logo[5] }, { name: 'logo end', img: logo[15] });
const go = logoFrames('GAME OVER', LOGO_BLOOD);
items.push({ name: 'gameover', img: go[15] });
const vic = logoFrames('VITÓRIA', LOGO_GOLD);
items.push({ name: 'victory', img: vic[15] });
items.push({ name: 'tomb', img: tombstone() });
writePng(process.argv[2] ?? '/tmp/ui.png', sheet(items, { cols: 2, scale: 5, cell: 64 }));
console.log('ok', items.length, logo[0].w, logo[0].h, go[0].w, vic[0].w);
