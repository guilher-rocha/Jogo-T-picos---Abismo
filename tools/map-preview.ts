// Pré-visualiza como um andar real fica com os tiles (sem props): arte do cenário.
import { createGame } from '../src/core/world';
import { level } from '../src/core/game';
import { THEMES } from '../src/data/themes';
import { Tile } from '../src/data/tiles';
import { Pixmap } from '../src/gfx/pixmap';
import { STYLES, makeFloor, makeCorridor, makeFace, makeRoof, makeRimParts } from '../src/gfx/terrain';
import { neighborhood, wallShape, variantAt } from '../src/gfx/autotile';
import { writePng } from './png';

const seed = Number(process.argv[2] ?? 5);
const depth = Number(process.argv[3] ?? 1);
const out = process.argv[4] ?? '/tmp/map.png';
const x0 = Number(process.argv[5] ?? 0), y0 = Number(process.argv[6] ?? 0), W = Number(process.argv[7] ?? 40), H = Number(process.argv[8] ?? 24);

const game = createGame(seed, { name: 'T', raceId: 'human', classId: 'warrior' });
const { enterLevel } = await import('../src/core/world');
if (depth > 1) enterLevel(game, depth, 'down');
const lvl = level(game);
const map = lvl.map;
map.explored.fill(1);
const style = STYLES[lvl.theme] ?? STYLES.crypt;
console.log('theme', lvl.theme, 'generator', lvl.generator);
const nb = neighborhood(map, true);
const floors = Array.from({ length: 6 }, (_, v) => makeFloor(style, v));
const cors = Array.from({ length: 3 }, (_, v) => makeCorridor(style, v));
const faces = Array.from({ length: 3 }, (_, v) => makeFace(style, v));
const roofs = Array.from({ length: 2 }, (_, v) => makeRoof(style, v));
const rim = makeRimParts(style);
const S = 2;
const img = new Pixmap(W * 16, H * 16);
img.fillRect(0, 0, img.w, img.h, [10, 8, 16, 255]);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const mx = x0 + x, my = y0 + y;
    const t = map.tiles[my * map.width + mx];
    const px = x * 16, py = y * 16;
    if (t === Tile.Wall || t === Tile.SecretDoor) {
      const s = wallShape(nb, mx, my);
      if (s.kind === 'face') {
        img.blit(faces[variantAt(mx, my, 3, 3)], px, py);
        if (s.capL) img.blit(rim.capL, px, py);
        if (s.capR) img.blit(rim.capR, px, py);
      } else {
        img.blit(roofs[variantAt(mx, my, 4, 2)], px, py);
        if (s.n) img.blit(rim.rimN, px, py);
        if (s.e) img.blit(rim.rimE, px, py);
        if (s.w) img.blit(rim.rimW, px, py);
        if (s.ne) img.blit(rim.inNE, px, py);
        if (s.nw) img.blit(rim.inNW, px, py);
        if (s.se) img.blit(rim.inSE, px, py);
        if (s.sw) img.blit(rim.inSW, px, py);
      }
    } else if (t === Tile.Corridor) img.blit(cors[variantAt(mx, my, 1, 3)], px, py);
    else if (t === Tile.Water) img.fillRect(px, py, 16, 16, [40, 90, 170, 255]);
    else if (t === Tile.Lava) img.fillRect(px, py, 16, 16, [220, 90, 30, 255]);
    else if (t === Tile.DoorClosed || t === Tile.DoorOpen || t === Tile.DoorLocked) img.blit(faces[0], px, py);
    else img.blit(floors[variantAt(mx, my, 2, 6)], px, py);
  }
}
writePng(out, img.scaled(S));
console.log('ok', out);
