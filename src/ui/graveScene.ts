import type { Terminal } from '../engine/terminal';
import type { CellRect } from '../engine/renderer';
import { K } from '../gfx/keys';
import { VARIANTS, variantAt } from '../gfx/autotile';
import { hash01 } from '../gfx/color';
import { TOMB_H, TOMB_PLATE, TOMB_W } from '../gfx/ui';
import { blackFrame, embers, poster, showPoster, torchFrame, veil } from './stage';

/**
 * Cena do game over: a lápide do herói numa cripta, entre duas tochas, com fagulhas e almas subindo.
 * A inscrição "DESCANSE EM PAZ" é escrita sobre a placa; o resto do epitáfio vai em texto, embaixo.
 */

const W = 7;
const H = 5;
const STYLE = 'crypt';
const VEIL = veil(W, H, { edge: 1.8, edgeMax: 0.85, ambient: 0.14 });

/** Posição da lápide (tiles): centralizada, com a base do montinho perto do fim do chão. */
const TX = (W - TOMB_W / 16) / 2;
const TY = 4.9 - TOMB_H / 16;

export function drawGraveScene(term: Terminal, rect: CellRect, time: number): void {
  const scene = poster(rect, W, H, time);
  for (let x = 0; x < W; x++) {
    scene.spr(K.face(STYLE, variantAt(x + 2, 0, 3, VARIANTS.face)), x, 0);
    for (let y = 1; y < H; y++) scene.spr(K.floor(STYLE, variantAt(x + 9, y, 2, VARIANTS.floor)), x, y);
  }
  scene.spr(K.prop(STYLE, 'chains'), 3, 0);
  for (const x of [1, 5]) scene.spr(K.prop(STYLE, 'torch'), x, 0, { f: torchFrame(time, x, 0) });
  for (const [name, x, y] of [['bones', 0.4, 3.6], ['skull', 5.6, 3.7], ['pebbles', 1.2, 4.1], ['pebbles', 5.1, 2.3], ['puddle_blood', 5.3, 4.2], ['moss', 0.2, 2.2]] as const) {
    scene.spr(K.prop(STYLE, name), x, y);
  }
  for (const x of [1, 5]) scene.glow(x + 0.5, 0.55, 3.4, '#ff9a3c', 0.3 + 0.06 * Math.sin(time / 130 + x * 3));
  // um clarão frio sobre a lápide
  scene.glow(W / 2, 2.4, 2.8, '#7a8cff', 0.1 + 0.03 * Math.sin(time / 700));
  scene.light(0, 0, W, H, VEIL);
  blackFrame(scene, W, H);
  scene.box(0, 0, W, H, '#4a5278', 1);

  scene.ell(W / 2, 4.82, 1.25, 0.2, '#000', 0.45);
  scene.spr(K.ui('tombstone'), TX, TY);
  // inscrição na placa
  const px = TX + (TOMB_PLATE.x + TOMB_PLATE.w / 2) / 16;
  const py = TY + (TOMB_PLATE.y + TOMB_PLATE.h / 2) / 16;
  scene.text(px, py - 0.42, 'DESCANSE', '#c8cce0', 0.95);
  scene.text(px, py + 0.2, 'EM PAZ', '#c8cce0', 0.95);

  for (const x of [1, 5]) embers(scene, time, x + 0.5, 0.75, { n: 5, rise: 1.2, seed: x, spread: 0.7 });
  // almas: fagulhas pálidas que sobem da lápide
  for (let i = 0; i < 5; i++) {
    const life = 4200 + hash01(i, 1, 70) * 2400;
    const t = ((time + hash01(i, 2, 70) * life) % life) / life;
    const x = W / 2 + (hash01(i, 3, 70) - 0.5) * 1.8 + Math.sin(time / 700 + i * 2) * 0.25;
    const y = 2.6 - t * 2.4;
    scene.spr(K.fx('spark'), x, y, { anchor: 'center', f: Math.floor(time / 160 + i) % 5, a: Math.sin(Math.PI * t) * 0.8, tint: '#a8c8ff', ta: 0.8 });
  }
  showPoster(term, rect, scene);
}
