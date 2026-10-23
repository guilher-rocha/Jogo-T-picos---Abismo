import { Scene } from '../engine/scene';
import type { Terminal } from '../engine/terminal';
import type { CellRect } from '../engine/renderer';
import { hash01 } from '../gfx/color';

/**
 * Peças comuns das cenas "de pôster" (título, criação de personagem, fim de jogo): uma janela de
 * células do terminal em que um pequeno mundo de tiles aparece inteiro, em escala inteira, com as
 * bordas esmaecendo para o preto da tela. Só efeitos visuais — nunca usam o RNG do jogo.
 */

export const smooth = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Cena de pôster: mundo de `w` × `h` tiles centrado na janela. */
export function poster(rect: CellRect, w: number, h: number, time: number): Scene {
  const s = new Scene(rect.cx, rect.cy, rect.cw, rect.ch);
  s.fit = { w, h };
  s.camX = w / 2;
  s.camY = h / 2;
  s.time = time;
  return s;
}

/** Deixa a janela transparente (a cena aparece por baixo do texto) e entrega a cena ao renderizador. */
export function showPoster(term: Terminal, rect: CellRect, scene: Scene): void {
  term.hole(rect.cx, rect.cy, rect.cw, rect.ch);
  term.scene = scene;
}

/**
 * Mapa de luz com um pixel por tile: preto nas bordas (esmaece para o fundo da tela), um pouco escuro
 * nos cantos e levemente escuro em geral. `edge` é a largura da faixa de borda, em tiles; `edgeMax`, o
 * quanto ela escurece (1 = preto total; menos que isso deixa a borda visível, como um quadro).
 */
export function veil(w: number, h: number, o: { edge?: number; edgeMax?: number; ambient?: number } = {}): Uint8ClampedArray {
  const edgeW = o.edge ?? Math.max(1.2, Math.min(w, h) * 0.32);
  const edgeMax = o.edgeMax ?? 1;
  const ambient = o.ambient ?? 0.12;
  const data = new Uint8ClampedArray(w * h * 4);
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const e = Math.min(x, w - 1 - x, y, h - 1 - y);
      const edge = (1 - smooth(0, edgeW, e)) * edgeMax;
      const vig = smooth(0.5, 1.15, Math.hypot(((x - cx) / Math.max(1, cx)) * 0.95, ((y - cy) / Math.max(1, cy)) * 0.9));
      const a = Math.max(edge, vig * 0.75, ambient);
      data[(y * w + x) * 4 + 3] = Math.round(Math.min(1, a) * 255);
    }
  }
  return data;
}

/** Preto em volta do mundo: os brilhos aditivos não vazam para fora da cena. */
export function blackFrame(scene: Scene, w: number, h: number): void {
  const m = 40;
  scene.rect(-m, -m, m, h + 2 * m, '#000');
  scene.rect(w, -m, m, h + 2 * m, '#000');
  scene.rect(0, -m, w, m, '#000');
  scene.rect(0, h, w, m, '#000');
}

/** Quadro (0–2) da animação de uma tocha de parede; cada tocha tem a sua fase. */
export const torchFrame = (time: number, x: number, y: number): number => Math.floor((time + hash01(x, y, 5) * 900) / 110) % 3;

/** Brasas subindo de um ponto: pixels que nascem, sobem balançando e somem. */
export function embers(scene: Scene, time: number, x: number, y: number, o: { n?: number; rise?: number; seed?: number; spread?: number } = {}): void {
  const colors = ['#ffe58a', '#ffb04a', '#ff7a2a'];
  const n = o.n ?? 12;
  const rise = o.rise ?? 2.4;
  const seed = o.seed ?? 0;
  const spread = o.spread ?? 1.1;
  for (let i = 0; i < n; i++) {
    const salt = seed * 40 + i;
    const life = 2600 + hash01(salt, 1, 90) * 2200;
    const t = ((time + hash01(salt, 2, 90) * life) % life) / life;
    const px = x + (hash01(salt, 3, 90) - 0.5) * spread + Math.sin(time / 520 + salt) * 0.18 * t;
    const py = y - t * (rise * (0.75 + hash01(salt, 4, 90) * 0.5));
    const a = Math.sin(Math.PI * t) * 0.95;
    const big = i % 4 === 0 ? 2 : 1;
    scene.prect(px, py, 0, 0, big, big, colors[i % 3], a);
  }
}
