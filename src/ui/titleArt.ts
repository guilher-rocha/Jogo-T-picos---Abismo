import type { Scene } from '../engine/scene';
import type { Terminal } from '../engine/terminal';
import { K } from '../gfx/keys';
import { VARIANTS, variantAt } from '../gfx/autotile';
import { blackFrame, embers, poster, showPoster, torchFrame, veil } from './stage';

/**
 * Cena da tela de título: o logotipo brilha sobre o telhado de uma masmorra, tochas tremulam na parede,
 * a grade e a escada descem para o Abismo, e o herói encara os monstros.
 * É uma cena "de pôster" (ver `Scene.fit`): o mundo todo cabe na janela, em escala inteira.
 * Só efeitos visuais: usa o relógio de animação, nunca o RNG do jogo.
 */

/** Janela da cena, em células do terminal (mais larga que o mundo: as bordas esmaecem para o preto). */
export const TITLE_RECT = { cx: 14, cy: 0, cw: 72, ch: 18 };

/** Mundo da cena, em tiles. */
const W = 17;
const H = 8;
const FACE_Y = 3; // y = 0..2 telhado, 3 parede, 4..7 chão
const FLOOR_Y = FACE_Y + 1;
const STYLE = 'crypt';
const CX = (W - 1) / 2;

/** Heróis que se revezam à esquerda da escada (raça, classe). */
const HEROES: [string, string][] = [['human', 'warrior'], ['elf', 'mage'], ['halfling', 'rogue'], ['dwarf', 'cleric'], ['half_orc', 'ranger']];
/** Quanto tempo cada herói fica em cena (ms). */
const HERO_MS = 3600;

/** Quem espera à direita da escada: id e posição no chão (tile do pé). */
const FOES: { id: string; x: number; y: number }[] = [
  { id: 'skeleton', x: 12.7, y: 6.05 },
  { id: 'goblin', x: 10.9, y: 5.1 },
  { id: 'wolf', x: 14.2, y: 5.1 },
];

/** Parede (y = FACE_Y): enfeites por coluna. */
const WALL: [string, number][] = [
  ['chains', 0], ['torch', 2], ['banner', 5], ['arch_gate', 8], ['banner', 11], ['torch', 14], ['skeleton', 15], ['chains', 16],
];

/** Detalhes do chão: nome, x, y. */
const FLOOR_PROPS: [string, number, number][] = [
  ['web_tl', 0, FLOOR_Y], ['web_tr', 16, FLOOR_Y],
  ['bones', 1, 6], ['skull', 15, 7], ['pebbles', 3, 7], ['pebbles', 12, 4], ['puddle_water', 6, 7], ['puddle_blood', 9, 6],
  ['moss', 0, 7], ['moss', 16, 5], ['pebbles', 7, 5],
];

const TORCHES = WALL.filter(([n]) => n === 'torch').map(([, x]) => x);

const VEIL = veil(W, H, { edge: 2.6, ambient: 0.13 });

function allEmbers(scene: Scene, time: number): void {
  TORCHES.forEach((tx, ti) => embers(scene, time, tx + 0.5, FACE_Y + 0.25, { n: 12, rise: 2.8, seed: ti }));
}

function drawBackground(scene: Scene): void {
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < FACE_Y; y++) scene.spr(K.roof(STYLE, variantAt(x, y, 4, VARIANTS.roof)), x, y);
    scene.spr(K.face(STYLE, variantAt(x, FACE_Y, 3, VARIANTS.face)), x, FACE_Y);
    for (let y = FLOOR_Y; y < H; y++) scene.spr(K.floor(STYLE, variantAt(x, y, 2, VARIANTS.floor)), x, y);
  }
}

function drawProps(scene: Scene, time: number): void {
  for (const [name, x] of WALL) {
    const f = name === 'torch' ? torchFrame(time, x, FACE_Y) : 0;
    scene.spr(K.prop(STYLE, name), x, FACE_Y, { f });
  }
  for (const [name, x, y] of FLOOR_PROPS) scene.spr(K.prop(STYLE, name), x, y);
  scene.spr(K.prop(STYLE, 'stairs_down'), CX, FLOOR_Y);
}

function glows(scene: Scene, time: number): void {
  for (const tx of TORCHES) scene.glow(tx + 0.5, FACE_Y + 0.5, 4.2, '#ff9a3c', 0.3 + 0.06 * Math.sin(time / 130 + tx * 3));
  // O Abismo respira pela escada.
  scene.glow(CX + 0.5, FLOOR_Y + 0.5, 2.4, '#7a5cff', 0.16 + 0.05 * Math.sin(time / 600));
  // Brasa por trás do logotipo.
  scene.glow(W / 2, 1.5, 6.2, '#ff7a28', 0.17 + 0.03 * Math.sin(time / 900));
}

interface Figure {
  key: string;
  x: number;
  y: number;
  face: 1 | -1;
  id: number;
  tint?: string;
  ta?: number;
}

function drawFigure(scene: Scene, f: Figure, time: number): void {
  const idle = Math.floor((time + f.id * 211) / 560) % 2;
  scene.ell(f.x + 0.5, f.y + 0.9, 0.36, 0.12, '#000', 0.45);
  scene.spr(f.key, f.x, f.y, { anchor: 'foot', f: idle, flip: f.face < 0, tint: f.tint, ta: f.ta });
}

function cast(scene: Scene, time: number): void {
  const hi = Math.floor(time / HERO_MS);
  const [race, cls] = HEROES[hi % HEROES.length];
  const since = time - hi * HERO_MS;
  const hero: Figure = { key: K.hero(race, cls), x: 5.1, y: 5.15, face: 1, id: 1 };
  if (since < 160) {
    hero.tint = '#ffffff';
    hero.ta = 0.9 * (1 - since / 160);
  }
  const figs: Figure[] = [hero, ...FOES.map((m, i) => ({ key: K.mon(m.id), x: m.x, y: m.y, face: -1 as const, id: 10 + i }))];
  figs.sort((a, b) => a.y - b.y);
  // O herói carrega a própria luz.
  scene.glow(hero.x + 0.5, hero.y + 0.5, 2.6, '#ffb060', 0.14 + 0.02 * Math.sin(time / 170));
  for (const f of figs) drawFigure(scene, f, time);
  if (since < 5 * 70) scene.spr(K.fx('puff'), hero.x, hero.y, { f: Math.min(4, Math.floor(since / 70)) });

  // Um morcego cruza a cena de tempos em tempos.
  const p = ((time + 2500) % 11000) / 11000;
  if (p < 0.8) {
    const q = p / 0.8;
    const bx = W + 0.5 - q * (W + 2);
    const by = 4.2 + Math.sin(q * 15) * 0.35;
    scene.ell(bx + 0.5, 6.6, 0.28, 0.09, '#000', 0.25);
    scene.spr(K.mon('bat'), bx, by, { anchor: 'foot', f: Math.floor(time / 110) % 2, flip: true });
  }
}

/** O logotipo sobre o telhado (o brilho diagonal faz parte da animação do sprite). */
function logo(scene: Scene, time: number): void {
  const frameNo = Math.floor(time / 85) % 16;
  scene.spr(K.ui('logo'), W / 2, 1.5, { anchor: 'center', zoom: 3, f: frameNo });
}

/** Monta a cena do título e deixa a janela transparente para ela aparecer. */
export function drawTitleScene(term: Terminal, time: number): void {
  const scene = poster(TITLE_RECT, W, H, time);
  drawBackground(scene);
  drawProps(scene, time);
  glows(scene, time);
  scene.light(0, 0, W, H, VEIL);
  blackFrame(scene, W, H);
  cast(scene, time);
  logo(scene, time);
  allEmbers(scene, time);
  showPoster(term, TITLE_RECT, scene);
}
