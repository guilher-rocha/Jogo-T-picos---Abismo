import type { RGBA } from './color';
import { hex, mix } from './color';
import { PAL } from './palette';
import type { Pixmap } from './pixmap';

/** Cor da paleta mestra. */
export const col = (ch: string): RGBA => hex(PAL[ch]);

/** Rampa do escuro para o claro a partir de letras da paleta: ramp('g','G','l','L'). */
export function ramp(chars: string): RGBA[] {
  return [...chars].map(col);
}

export function dot(p: Pixmap, x: number, y: number, c: RGBA | string): void {
  p.set(Math.round(x), Math.round(y), typeof c === 'string' ? col(c) : c);
}

export function rect(p: Pixmap, x: number, y: number, w: number, h: number, c: RGBA | string): void {
  p.fillRect(x, y, w, h, typeof c === 'string' ? col(c) : c);
}

/** Linha de Bresenham. */
export function line(p: Pixmap, x0: number, y0: number, x1: number, y1: number, c: RGBA | string): void {
  let x = Math.round(x0), y = Math.round(y0);
  const X = Math.round(x1), Y = Math.round(y1);
  const dx = Math.abs(X - x), dy = -Math.abs(Y - y);
  const sx = x < X ? 1 : -1, sy = y < Y ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    dot(p, x, y, c);
    if (x === X && y === Y) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

/**
 * Elipse preenchida com sombreamento por faixas (luz vinda de cima à esquerda).
 * `light` desloca o ponto mais claro; `bias` clareia/escurece tudo.
 */
export function disc(p: Pixmap, cx: number, cy: number, rx: number, ry: number, colors: RGBA[], opts: { lx?: number; ly?: number; bias?: number; clipY?: [number, number] } = {}): void {
  const lx = opts.lx ?? -0.35, ly = opts.ly ?? -0.5, bias = opts.bias ?? 0;
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
    if (opts.clipY && (y < opts.clipY[0] || y > opts.clipY[1])) continue;
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy > 1) continue;
      const t = 0.5 + dx * lx + dy * ly + bias;
      const i = Math.max(0, Math.min(colors.length - 1, Math.floor(t * colors.length)));
      p.set(x, y, colors[i]);
    }
  }
}

/** Polígono preenchido (par-ímpar). */
export function poly(p: Pixmap, pts: [number, number][], c: RGBA | string): void {
  const color = typeof c === 'string' ? col(c) : c;
  const ys = pts.map((q) => q[1]);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
      const yy = y + 0.5;
      if ((y0 <= yy && y1 > yy) || (y1 <= yy && y0 > yy)) xs.push(x0 + ((yy - y0) / (y1 - y0)) * (x1 - x0));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) p.set(x, y, color);
  }
}

export { mix };
