import type { Terminal } from '../engine/terminal';
import type { CellRect } from '../engine/renderer';
import { K } from '../gfx/keys';
import { VARIANTS, variantAt } from '../gfx/autotile';
import { blackFrame, embers, poster, showPoster, torchFrame, veil } from './stage';

/**
 * Palco do herói: um pedaço de masmorra com duas tochas e um estandarte, onde o personagem fica de pé.
 * Usado na criação de personagem (mostra raça + classe escolhidas) e na tela de vitória (com o Coração
 * do Abismo flutuando e fagulhas douradas).
 */

const W = 5;
const H = 4;
const STYLE = 'crypt';
const VEIL = veil(W, H, { edge: 1.6, edgeMax: 0.55, ambient: 0.08 });

export interface StageOpts {
  /** Vitória: brilho dourado, fagulhas e o Coração do Abismo acima do herói. */
  victory?: boolean;
}

export function drawHeroStage(term: Terminal, rect: CellRect, raceId: string, classId: string, time: number, o: StageOpts = {}): void {
  const scene = poster(rect, W, H, time);
  for (let x = 0; x < W; x++) {
    scene.spr(K.face(STYLE, variantAt(x + 5, 0, 3, VARIANTS.face)), x, 0);
    for (let y = 1; y < H; y++) scene.spr(K.floor(STYLE, variantAt(x + 11, y, 2, VARIANTS.floor)), x, y);
  }
  scene.spr(K.prop(STYLE, 'banner'), 2, 0);
  for (const x of [1, 3]) scene.spr(K.prop(STYLE, 'torch'), x, 0, { f: torchFrame(time, x, 0) });
  scene.spr(K.prop(STYLE, 'pebbles'), 0, 3);
  scene.spr(K.prop(STYLE, 'bones'), 4, 2);
  for (const x of [1, 3]) scene.glow(x + 0.5, 0.55, 3.2, '#ff9a3c', 0.3 + 0.06 * Math.sin(time / 130 + x * 3));
  if (o.victory) scene.glow(2.5, 1.9, 3.4, '#ffd24a', 0.2 + 0.05 * Math.sin(time / 420));
  scene.light(0, 0, W, H, VEIL);
  blackFrame(scene, W, H);
  scene.box(0, 0, W, H, '#4a5278', 1);

  const idle = Math.floor(time / 560) % 2;
  // O herói aparece em dobro (retrato): ocupa 2 tiles de altura, com os pés no chão da cena.
  scene.ell(2.5, 2.92, 0.62, 0.16, '#000', 0.5);
  scene.glow(2.5, 2.1, 2.4, '#ffb060', 0.14 + 0.02 * Math.sin(time / 170));
  scene.spr(K.hero(raceId, classId), 2.5, 2.0, { anchor: 'center', zoom: 2, f: idle });
  for (const x of [1, 3]) embers(scene, time, x + 0.5, 0.75, { n: 5, rise: 1.2, seed: x, spread: 0.7 });

  if (o.victory) {
    // O Coração do Abismo paira acima do herói, cercado de fagulhas.
    const bob = Math.sin(time / 500) * 0.07;
    scene.glow(2.5, 0.6 + bob, 1.7, '#e060ff', 0.3 + 0.06 * Math.sin(time / 260));
    scene.spr(K.item('amulet_abyss'), 2.5, 0.6 + bob, { anchor: 'center' });
    for (let i = 0; i < 6; i++) {
      const a = time / 900 + (i * Math.PI * 2) / 6;
      scene.spr(K.fx('spark'), 2.5 + Math.cos(a) * 0.72, 0.6 + bob + Math.sin(a) * 0.4, { anchor: 'center', f: Math.floor(time / 130 + i) % 5, a: 0.9 });
    }
  }
  showPoster(term, rect, scene);
}
