import type { Scene } from '../engine/scene';
import { hash01 } from '../gfx/color';

/**
 * Animações do ambiente: brasas das tochas, bolhas de lava, reflexos na água, gotas da fonte,
 * partículas do altar e dos fungos, e a "poeira" própria de cada região da masmorra.
 * Como as auras, tudo é função do relógio e da posição do tile (nada guardado entre quadros).
 */

function dot(s: Scene, x: number, y: number, color: string, a: number, size = 1): void {
  if (a <= 0.02) return;
  const h = Math.floor(size / 2);
  s.prect(x, y, -h, -h, size, size, color, Math.min(1, a));
}

/** Fase (0–1) de um ciclo de `period` ms, desencontrada pelo tile e pelo índice. */
const phase = (time: number, period: number, x: number, y: number, i = 0): number => (time / period + hash01(x * 7 + i, y, 211)) % 1;

/** Brasas subindo da chama da tocha (a tocha fica na face da parede, chama no alto do tile). */
export function torchEmbers(s: Scene, x: number, y: number, time: number): void {
  for (let i = 0; i < 4; i++) {
    const u = phase(time, 1000 + i * 230, x, y, i);
    if (u > 0.85) continue;
    const v = u / 0.85;
    const xx = x + 0.5 + (hash01(x, y, i + 40) - 0.5) * 0.25 + Math.sin(v * 8 + i) * 0.08;
    const yy = y + 0.14 - v * 0.75;
    dot(s, xx, yy, v < 0.3 ? '#fff0a0' : v < 0.65 ? '#ffaa4a' : '#d8501a', 1.15 - v);
    if (v < 0.4) s.glow(xx, yy, 0.18, '#ffb040', 0.5 * (1 - v));
  }
}

/** Lava: bolha que incha e estoura em respingos, e uma brasa que sobe de vez em quando. */
export function lavaBubbles(s: Scene, x: number, y: number, time: number): void {
  const u = phase(time, 2300, x, y);
  const bx = x + 0.25 + hash01(x, y, 61) * 0.5;
  const by = y + 0.3 + hash01(x, y, 62) * 0.45;
  if (u < 0.3) {
    // bolha crescendo: casca escura com brilho em cima
    const r = u < 0.1 ? 1 : u < 0.2 ? 2 : 3;
    s.prect(bx, by, -Math.floor(r / 2), -Math.floor(r / 2), r, r, r === 3 ? '#ff8a2a' : '#ffd24a', 1);
    s.prect(bx, by, -Math.floor(r / 2), -Math.floor(r / 2), 1, 1, '#fff6c0', 1);
    if (r === 3) s.prect(bx, by, -1, 1, 3, 1, '#a8301a', 0.9);
  } else if (u < 0.45) {
    // estouro: 4 respingos em arco
    const v = (u - 0.3) / 0.15;
    for (let i = 0; i < 4; i++) {
      const ang = Math.PI + 0.4 + (i / 3) * (Math.PI - 0.8);
      dot(s, bx + Math.cos(ang) * v * 0.22, by + Math.sin(ang) * v * 0.22 + v * v * 0.12, i % 2 ? '#ff8a2a' : '#ffd24a', 1 - v);
    }
    s.glow(bx, by, 0.35, '#ffb040', 0.35 * (1 - v));
  }
  // brasa subindo
  const e = phase(time, 1700, x, y, 3);
  if (e < 0.6 && hash01(x, y, 64) < 0.5) {
    const v = e / 0.6;
    dot(s, x + 0.5 + Math.sin(v * 6 + x) * 0.15, y + 0.5 - v * 0.9, v < 0.5 ? '#ffd24a' : '#ff6a2a', 1 - v);
  }
}

/** Água: reflexos brancos curtos que aparecem e somem. */
export function waterGlints(s: Scene, x: number, y: number, time: number): void {
  for (let i = 0; i < 2; i++) {
    const u = phase(time, 1900 + i * 500, x, y, i);
    if (u > 0.22) continue;
    const a = Math.sin((u / 0.22) * Math.PI);
    const gx = x + 0.15 + hash01(x, y, 80 + i + Math.floor(time / (1900 + i * 500))) * 0.65;
    const gy = y + 0.2 + hash01(x, y, 90 + i + Math.floor(time / (1900 + i * 500))) * 0.6;
    const w = u < 0.11 ? 2 : 3;
    s.prect(gx, gy, 0, 0, w, 1, '#e8f8ff', 0.75 * a);
  }
}

/** Fonte: gotas saltando do centro e caindo de volta na bacia. */
export function fountainDrops(s: Scene, x: number, y: number, time: number): void {
  const cx = x + 0.5;
  const top = y + 0.42;
  // jato: coluna curta que oscila
  const jet = 3 + (Math.floor(time / 120) % 2);
  for (let j = 0; j < jet; j++) dot(s, cx, top - j / 16 - 1 / 16, j === jet - 1 ? '#ffffff' : '#c8f4ff', 0.95);
  // gotas em arco, do topo do jato até a borda da bacia
  for (let i = 0; i < 6; i++) {
    const u = phase(time, 700, x, y, i);
    const side = i % 2 ? 1 : -1;
    const spread = 0.12 + hash01(x, y, 30 + i) * 0.2;
    const xx = cx + side * spread * u;
    const yy = top - (jet + 1) / 16 - Math.sin(u * Math.PI * 0.9) * 0.12 + u * u * 0.3;
    dot(s, xx, yy, u < 0.4 ? '#ffffff' : '#9ae8ff', 0.95 - u * 0.4);
  }
  // ondinha no ponto onde a água cai
  const r = phase(time, 1000, x, y, 9);
  const n = 8;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2;
    dot(s, cx + Math.cos(ang) * (0.08 + r * 0.22), top + 0.05 + Math.sin(ang) * (0.03 + r * 0.08), '#c8f4ff', 0.6 * (1 - r));
  }
}

/** Partículas que sobem devagar (altar, fungos). */
export function risingMotes(s: Scene, x: number, y: number, time: number, colors: string[], count = 3, period = 2200): void {
  for (let i = 0; i < count; i++) {
    const u = phase(time, period + i * 300, x, y, i);
    const xx = x + 0.2 + hash01(x, y, 50 + i) * 0.6 + Math.sin(u * 5 + i) * 0.08;
    const yy = y + 0.65 - u * 0.9;
    dot(s, xx, yy, colors[i % colors.length], Math.sin(u * Math.PI));
  }
}

/** Partículas do ar de cada região (só sobre tiles vistos agora). */
export interface AirStyle {
  /** Chance de um tile ter uma partícula. */
  density: number;
  colors: string[];
  /** Deslocamento ao longo do ciclo (tiles): vx para os lados, vy (+ desce, − sobe). */
  vx: number;
  vy: number;
  period: number;
  /** Partículas que brilham (somam luz). */
  glow?: string;
}

export const AIR: Record<string, AirStyle> = {
  // poeira fina caindo devagar na luz
  crypt: { density: 0.1, colors: ['#eceaf8', '#b4b4d4'], vx: 0.35, vy: 0.35, period: 5200 },
  // terra e pó de rocha caindo do teto das minas
  mines: { density: 0.12, colors: ['#f0d098', '#b89060'], vx: 0.1, vy: 0.9, period: 3600 },
  // esporos verdes subindo
  fungal: { density: 0.14, colors: ['#e4ffb8', '#a8f070'], vx: 0.3, vy: -0.8, period: 4800, glow: '#b8ff7a' },
  // gotas de umidade escorrendo / bolhinhas
  fortress: { density: 0.09, colors: ['#e4f8ff', '#8ed8f0'], vx: 0.05, vy: 0.7, period: 3000 },
  // brasas e cinzas subindo do abismo
  abyss: { density: 0.14, colors: ['#ffd090', '#ff7a3a', '#9a8a90'], vx: 0.25, vy: -1.0, period: 3400, glow: '#ff7a3a' },
};

export function airMote(s: Scene, style: AirStyle, x: number, y: number, time: number): void {
  if (hash01(x, y, 707) >= style.density) return;
  const period = style.period * (0.8 + hash01(x, y, 708) * 0.4);
  const u = phase(time, period, x, y, 5);
  const sx = x + hash01(x, y, 709);
  const sy = y + hash01(x, y, 710);
  const xx = sx + Math.sin(u * Math.PI * 2 + x) * style.vx * 0.5;
  const yy = sy + (u - 0.5) * style.vy;
  const a = Math.min(1, Math.sin(u * Math.PI) * 1.2);
  const c = style.colors[Math.floor(hash01(x, y, 711) * style.colors.length)];
  dot(s, xx, yy, c, a);
  // rastro de 1 pixel do lado de onde veio
  dot(s, xx, yy - Math.sign(style.vy) / 16, c, a * 0.4);
  if (style.glow && hash01(x, y, 712) < 0.5) s.glow(xx, yy, 0.3, style.glow, 0.3 * a);
}
