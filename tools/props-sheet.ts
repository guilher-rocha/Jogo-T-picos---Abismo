import { STYLES, makeFace, makeFloor, makeRoof } from '../src/gfx/terrain';
import { makeProps, makeWater, makeLava } from '../src/gfx/props';
import { Pixmap } from '../src/gfx/pixmap';
import { writePng, sheet } from './png';

const style = STYLES[process.argv[3] ?? 'crypt'];
const out = process.argv[2] ?? '/tmp/props.png';
const props = makeProps(style);
const face = makeFace(style, 0), floor = makeFloor(style, 0), roof = makeRoof(style, 0);
const items: { name: string; img: Pixmap }[] = [];
for (const [name, frames] of Object.entries(props)) {
  frames.forEach((fr, i) => {
    let base: Pixmap;
    if (name.startsWith('door_h') || ['chains', 'skeleton', 'arch_gate', 'banner', 'window_slit', 'blood_wall', 'slime_wall', 'web_tl', 'web_tr', 'torch', 'candle_niche', 'plaque', 'ore_vein', 'support_beam', 'lantern', 'pickaxe_wall', 'shelf_fungus', 'shield_trophy', 'rune_glow', 'wall_crack', 'wall_moss', 'vines', 'drip_stain', 'lava_seep'].includes(name)) base = face;
    else if (name.startsWith('door_v')) base = roof;
    else base = floor;
    const img = base.clone();
    img.blit(fr);
    items.push({ name: frames.length > 1 ? `${name}${i}` : name, img });
  });
}
makeWater().forEach((w, i) => items.push({ name: `water${i}`, img: w }));
makeLava().forEach((w, i) => items.push({ name: `lava${i}`, img: w }));
writePng(out, sheet(items, { cols: 8, scale: 6 }));
console.log('ok', items.length);
