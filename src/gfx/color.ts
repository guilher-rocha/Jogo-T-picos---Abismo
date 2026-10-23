/** Utilitários de cor para a arte procedural (sem DOM, rodam no Node e no navegador). */

/** [r, g, b, a], cada canal de 0 a 255. */
export type RGBA = [number, number, number, number];

/** "#rgb", "#rrggbb" ou "#rrggbbaa" → RGBA. */
export function hex(s: string): RGBA {
  let h = s.startsWith('#') ? s.slice(1) : s;
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
}

export function toHex(c: RGBA): string {
  const p = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${p(c[0])}${p(c[1])}${p(c[2])}`;
}

export function toCss(c: RGBA, alpha = 1): string {
  return `rgba(${c[0]},${c[1]},${c[2]},${(c[3] / 255) * alpha})`;
}

/** Mistura linear: t = 0 devolve a, t = 1 devolve b. */
export function mix(a: RGBA, b: RGBA, t: number): RGBA {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
    a[3] + (b[3] - a[3]) * t,
  ];
}

/** Multiplica o brilho (f < 1 escurece, f > 1 clareia). */
export function shade(c: RGBA, f: number): RGBA {
  return [c[0] * f, c[1] * f, c[2] * f, c[3]];
}

/** Escurece puxando para um azul-arroxeado (sombras "frias" ficam melhores que cinza). */
export function darken(c: RGBA, t: number): RGBA {
  return mix(c, [14, 10, 28, c[3]], t);
}

export function lighten(c: RGBA, t: number): RGBA {
  return mix(c, [255, 244, 214, c[3]], t);
}

/** Luminância percebida (0–255). */
export function luma(c: RGBA): number {
  return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
}

/** Hash inteiro rápido e determinístico (para variações por posição). */
export function hash3(a: number, b: number, c = 0): number {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Hash → [0, 1). */
export function hash01(a: number, b: number, c = 0): number {
  return hash3(a, b, c) / 4294967296;
}
