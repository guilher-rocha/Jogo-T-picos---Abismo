import { Pixmap } from './pixmap';
import type { RGBA } from './color';
import { hex, mix, darken, lighten, hash01 } from './color';
import { col, rect, dot } from './paint';

/**
 * Arte das telas de abertura e de fim: logotipos em fonte de blocos (7 × 9) e a lápide.
 * Tudo desenhado em código, como o resto dos sprites.
 */

// ───────────────────────── fonte de blocos ─────────────────────────

/** Só as letras que os títulos usam (A B E G I M O R S T V; acentos em ACCENTS). */
const FONT: Record<string, string[]> = {
  A: ['..XXX..', '.XX.XX.', 'XX...XX', 'XX...XX', 'XXXXXXX', 'XXXXXXX', 'XX...XX', 'XX...XX', 'XX...XX'],
  B: ['XXXXXX.', 'XX...XX', 'XX...XX', 'XXXXXX.', 'XXXXXX.', 'XX...XX', 'XX...XX', 'XX...XX', 'XXXXXX.'],
  E: ['XXXXXXX', 'XXXXXXX', 'XX.....', 'XXXXXX.', 'XXXXXX.', 'XX.....', 'XX.....', 'XXXXXXX', 'XXXXXXX'],
  G: ['.XXXXX.', 'XX...XX', 'XX.....', 'XX.....', 'XX.XXXX', 'XX...XX', 'XX...XX', 'XX...XX', '.XXXXX.'],
  I: ['XXXXXXX', 'XXXXXXX', '..XXX..', '..XXX..', '..XXX..', '..XXX..', '..XXX..', 'XXXXXXX', 'XXXXXXX'],
  M: ['XX...XX', 'XXX.XXX', 'XXXXXXX', 'XXXXXXX', 'XX.X.XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX'],
  O: ['.XXXXX.', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', '.XXXXX.'],
  R: ['XXXXXX.', 'XX...XX', 'XX...XX', 'XXXXXX.', 'XXXXX..', 'XX.XX..', 'XX..XX.', 'XX...XX', 'XX...XX'],
  S: ['.XXXXX.', 'XX...XX', 'XX.....', '.XXXX..', '..XXXX.', '.....XX', '.....XX', 'XX...XX', '.XXXXX.'],
  T: ['XXXXXXX', 'XXXXXXX', '..XXX..', '..XXX..', '..XXX..', '..XXX..', '..XXX..', '..XXX..', '..XXX..'],
  V: ['XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', '.XX.XX.', '.XX.XX.', '..XXX..', '...X...'],
};

/** Letras acentuadas: a letra base + pixels do acento acima dela (y negativo). */
const ACCENTS: Record<string, { base: string; marks: [number, number][] }> = {
  'Ó': { base: 'O', marks: [[4, -3], [5, -3], [3, -2], [4, -2]] },
  'Á': { base: 'A', marks: [[4, -3], [5, -3], [3, -2], [4, -2]] },
};

const GLYPH_W = 7;
const GLYPH_H = 9;

export interface LogoStyle {
  /** Nove cores, de cima para baixo (uma por linha da letra). */
  ramp: string[];
  outline: string;
  shadow: string;
}

export const LOGO_FIRE: LogoStyle = {
  ramp: ['#fff0a0', '#fcc444', '#fcc444', '#f08c2c', '#f08c2c', '#c2521c', '#c2521c', '#a22a30', '#561822'],
  outline: '#17131f',
  shadow: '#0b0910',
};

export const LOGO_BLOOD: LogoStyle = {
  ramp: ['#f48a68', '#d84a3e', '#d84a3e', '#a22a30', '#a22a30', '#7a1a24', '#561822', '#561822', '#3a0e16'],
  outline: '#120a0e',
  shadow: '#0b0910',
};

export const LOGO_GOLD: LogoStyle = {
  ramp: ['#fffbe0', '#fff0a0', '#fcc444', '#fcc444', '#e0a030', '#e0a030', '#c2791c', '#a05a1c', '#70401a'],
  outline: '#1d1410',
  shadow: '#0b0910',
};

/**
 * Logotipo em blocos com degradê, bisel, contorno e sombra. Devolve `frames` quadros: um brilho
 * diagonal passa pelas letras e some, deixando uma pausa no fim da animação.
 */
export function logoFrames(text: string, style: LogoStyle, frames = 16): Pixmap[] {
  const letters = [...text];
  // máscara das letras
  const widths = letters.map((ch) => (ch === ' ' ? 4 : GLYPH_W));
  const mw = widths.reduce((a, b) => a + b, 0) + (letters.length - 1);
  const mask = new Set<string>();
  let ox = 0;
  let accentRows = 0;
  letters.forEach((ch, i) => {
    const acc = ACCENTS[ch];
    const g = FONT[acc ? acc.base : ch];
    if (g) g.forEach((row, y) => [...row].forEach((c, x) => { if (c === 'X') mask.add(`${ox + x},${y}`); }));
    if (acc) {
      for (const [x, y] of acc.marks) mask.add(`${ox + x},${y}`);
      accentRows = Math.max(accentRows, -Math.min(...acc.marks.map((m) => m[1])));
    }
    ox += widths[i] + 1;
  });
  const has = (x: number, y: number): boolean => mask.has(`${x},${y}`);

  const PAD = 2;
  // Acentos ganham espaço acima das letras (a linha de base continua a mesma).
  const TOP = PAD + accentRows;
  const W = mw + PAD * 2 + 1;
  const H = GLYPH_H + PAD * 2 + 1 + accentRows;
  const base = new Pixmap(W, H);
  const body: RGBA[] = style.ramp.map((c) => hex(c));
  const shadow = hex(style.shadow);
  const line = hex(style.outline);
  // sombra projetada (deslocada para baixo e para a direita)
  for (const k of mask) {
    const [x, y] = k.split(',').map(Number);
    base.set(x + PAD + 1, y + TOP + 1, [shadow[0], shadow[1], shadow[2], 190]);
  }
  // contorno de 1 pixel (com diagonais)
  for (const k of mask) {
    const [x, y] = k.split(',').map(Number);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!has(x + dx, y + dy)) base.set(x + dx + PAD, y + dy + TOP, line);
  }
  // letras: degradê vertical + bisel
  for (const k of mask) {
    const [x, y] = k.split(',').map(Number);
    let c = body[Math.max(0, Math.min(body.length - 1, y))];
    if (!has(x, y - 1)) c = lighten(c, 0.3);
    else if (!has(x - 1, y)) c = lighten(c, 0.16);
    if (!has(x, y + 1)) c = darken(c, 0.28);
    else if (!has(x + 1, y)) c = darken(c, 0.16);
    base.set(x + PAD, y + TOP, c);
  }

  const out: Pixmap[] = [];
  const glintFrames = Math.floor(frames * 0.65);
  for (let f = 0; f < frames; f++) {
    if (f >= glintFrames) {
      out.push(base);
      continue;
    }
    // brilho: faixa diagonal que atravessa o logotipo
    const pos = -4 + (f / (glintFrames - 1)) * (mw + GLYPH_H + 8);
    const p = base.clone();
    for (const k of mask) {
      const [x, y] = k.split(',').map(Number);
      const d = Math.abs(x + y * 0.8 - pos);
      if (d < 3.2) {
        const c = p.get(x + PAD, y + TOP);
        p.set(x + PAD, y + TOP, mix(c, [255, 255, 245, c[3]], d < 1.6 ? 0.6 : 0.28));
      }
    }
    out.push(p);
  }
  return out;
}

// ───────────────────────── lápide ─────────────────────────

export const TOMB_W = 48;
export const TOMB_H = 64;
/** Área da placa onde o texto é escrito (em pixels do sprite). */
export const TOMB_PLATE = { x: 9, y: 25, w: 30, h: 28 };

/** Lápide arredondada com cruz, placa para o epitáfio, musgo e um montinho de terra. */
export function tombstone(): Pixmap {
  const p = new Pixmap(TOMB_W, TOMB_H);
  const stone = ['2', '3', '4', '5'].map(col);
  const cx = TOMB_W / 2;
  const top = 3;
  const bottom = 56;
  const half = 18;
  // corpo: retângulo com topo em arco
  for (let y = top; y <= bottom; y++) {
    let w = half;
    if (y < top + half) w = Math.sqrt(Math.max(0, half * half - (top + half - y - 0.5) ** 2));
    for (let x = Math.floor(cx - w); x < Math.ceil(cx + w); x++) {
      // luz vinda de cima à esquerda
      const t = (x - (cx - half)) / (half * 2);
      let c = stone[Math.min(3, Math.max(0, Math.floor((1 - t) * 3.2 + (1 - (y - top) / (bottom - top)) * 0.6 - 0.3)))];
      // granulado
      const n = hash01(x, y, 7);
      if (n < 0.09) c = darken(c, 0.18);
      else if (n > 0.93) c = lighten(c, 0.14);
      p.set(x, y, c);
    }
  }
  // moldura entalhada
  const carve = col('1');
  const light = col('5');
  for (let y = top + 4; y <= bottom - 3; y++) {
    let w = half - 4;
    if (y < top + half) w = Math.sqrt(Math.max(0, (half - 4) ** 2 - (top + half - y - 0.5) ** 2));
    const xl = Math.floor(cx - w);
    const xr = Math.ceil(cx + w) - 1;
    if (y > top + 5) {
      p.set(xl, y, carve);
      p.set(xr, y, lighten(col('3'), 0.1));
    }
  }
  // cruz
  rect(p, 22, 8, 4, 14, carve);
  rect(p, 17, 12, 14, 4, carve);
  rect(p, 23, 8, 2, 14, mix(carve, light, 0.35));
  rect(p, 17, 13, 14, 2, mix(carve, light, 0.35));
  // placa do epitáfio (rebaixada)
  const { x, y, w, h } = TOMB_PLATE;
  rect(p, x, y, w, h, col('2'));
  rect(p, x, y, w, 1, col('1'));
  rect(p, x, y, 1, h, col('1'));
  rect(p, x + 1, y + h - 1, w - 1, 1, col('4'));
  rect(p, x + w - 1, y + 1, 1, h - 1, col('4'));
  // rachaduras
  const crack = col('1');
  for (const [cx0, cy0, len, dir] of [[35, 6, 9, 1], [12, 46, 7, -1]] as const) {
    let px = cx0;
    let py = cy0;
    for (let i = 0; i < len; i++) {
      if (p.alpha(px, py) > 0) p.set(px, py, crack);
      py += 1;
      if (i % 2 === 1) px += dir;
    }
  }
  // musgo
  const moss = [col('g'), col('G'), col('l')];
  for (let i = 0; i < 38; i++) {
    const mx = 10 + Math.floor(hash01(i, 1, 3) * 28);
    const my = bottom - 6 + Math.floor(hash01(i, 2, 3) * 8);
    if (p.alpha(mx, my) > 0) p.set(mx, my, moss[Math.floor(hash01(i, 3, 3) * 3)]);
  }
  for (let i = 0; i < 12; i++) {
    const mx = 12 + Math.floor(hash01(i, 5, 9) * 22);
    const my = top + 14 + Math.floor(hash01(i, 6, 9) * 4);
    if (p.alpha(mx, my) > 0 && p.get(mx, my)[0] > 20) p.set(mx, my, moss[Math.floor(hash01(i, 7, 9) * 3)]);
  }
  const out = p.outline(0.6);
  // montinho de terra com tufos de grama e florzinhas
  const dirt = ['a', 'b', 'c'].map(col);
  for (let yy = bottom - 1; yy < TOMB_H; yy++) {
    const wd = 22 - (yy - (bottom - 1)) * 0.2 + Math.sin(yy) * 0.4;
    for (let xx = Math.floor(cx - wd); xx < Math.ceil(cx + wd); xx++) {
      const n = hash01(xx, yy, 21);
      out.set(xx, yy, dirt[n < 0.2 ? 0 : n < 0.8 ? 1 : 2]);
    }
  }
  const grass = ['g', 'G', 'l', 'L'].map(col);
  for (let xx = 2; xx < TOMB_W - 2; xx++) {
    const hgt = 1 + Math.floor(hash01(xx, 4, 31) * 3);
    if (hash01(xx, 5, 31) < 0.55) for (let k = 0; k < hgt; k++) dot(out, xx, bottom - k, grass[Math.min(3, k + 1 + Math.floor(hash01(xx, k, 32) * 2))]);
  }
  dot(out, 6, bottom - 3, col('q'));
  dot(out, 6, bottom - 2, col('l'));
  dot(out, 41, bottom - 4, col('y'));
  dot(out, 41, bottom - 3, col('l'));
  // pedrinhas
  for (const [sx, sy] of [[3, 60], [44, 59], [14, 62], [34, 61]] as const) {
    dot(out, sx, sy, col('4'));
    dot(out, sx + 1, sy, col('3'));
  }
  return out;
}
