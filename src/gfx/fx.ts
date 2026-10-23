import { Pixmap } from './pixmap';
import { dot, disc, ramp, rect, line, poly, col } from './paint';

/** Sprites de efeitos (16×16), desenhados apontando para a direita quando têm direção. */

export function arrow(): Pixmap[] {
  const p = new Pixmap(16, 16);
  line(p, 1, 8, 12, 8, 'd');
  dot(p, 13, 8, '5'); dot(p, 14, 8, '6'); dot(p, 15, 8, 'v');
  poly(p, [[12, 6], [15, 8], [12, 10]], '4');
  dot(p, 0, 7, 'q'); dot(p, 1, 7, 'q'); dot(p, 0, 9, 'q'); dot(p, 1, 9, 'q'); dot(p, 2, 7, 'R'); dot(p, 2, 9, 'R');
  return [p.outline()];
}

export function bolt(): Pixmap[] {
  const p = new Pixmap(16, 16);
  rect(p, 2, 7, 10, 2, 'c');
  poly(p, [[11, 5.5], [15, 8], [11, 10.5]], '5');
  dot(p, 14, 8, '6');
  rect(p, 1, 6, 2, 1, 'W'); rect(p, 1, 9, 2, 1, 'W');
  return [p.outline()];
}

export function stone(): Pixmap[] {
  const p = new Pixmap(16, 16);
  disc(p, 8, 8, 2.6, 2.4, ramp('1234'));
  return [p.outline()];
}

/** "Zzz" de monstros dormindo. */
export function zzz(): Pixmap[] {
  const mk = (dy: number): Pixmap => {
    const p = new Pixmap(16, 16);
    const z = (x: number, y: number, s: number): void => {
      line(p, x, y, x + s, y, 'I'); line(p, x + s, y, x, y + s, 'i'); line(p, x, y + s, x + s, y + s, 'I');
    };
    z(7, 6 - dy, 3); z(3, 10 - dy, 2);
    return p.outline(0.5);
  };
  return [mk(0), mk(1)];
}

/** Nuvem de fumaça que se expande e some (morte de monstros). */
export function puff(): Pixmap[] {
  const out: Pixmap[] = [];
  for (let i = 0; i < 5; i++) {
    const p = new Pixmap(16, 16);
    const r = 2 + i * 1.5;
    for (const [dx, dy, k] of [[-0.9, 0.2, 0.8], [0.9, 0.3, 0.75], [0, -0.7, 0.85], [0, 0.6, 0.9]] as const) disc(p, 8 + dx * r * 0.7, 9 + dy * r * 0.6, r * k * 0.8, r * k * 0.7, ramp('wWvW'));
    const a = Math.max(0, 230 - i * 55);
    out.push(p.map((c) => [c[0], c[1], c[2], Math.min(c[3], a)]));
  }
  return out;
}

/** Estrelinha de 4 pontas (brilhos, cura, subir de nível). */
export function spark(): Pixmap[] {
  const out: Pixmap[] = [];
  for (const r of [1, 2, 3, 2, 1]) {
    const p = new Pixmap(16, 16);
    for (let i = -r; i <= r; i++) { dot(p, 8 + i, 8, Math.abs(i) < 2 ? 'v' : 'Y'); dot(p, 8, 8 + i, Math.abs(i) < 2 ? 'v' : 'Y'); }
    if (r >= 2) { dot(p, 7, 7, 'y'); dot(p, 9, 9, 'y'); dot(p, 9, 7, 'y'); dot(p, 7, 9, 'y'); }
    out.push(p);
  }
  return out;
}

/** Faísca de impacto (golpes). */
export function hit(): Pixmap[] {
  const out: Pixmap[] = [];
  for (let i = 0; i < 4; i++) {
    const p = new Pixmap(16, 16);
    const r = 2 + i * 1.6;
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2 + 0.3;
      const x0 = 8 + Math.cos(ang) * (r - 1.2), y0 = 8 + Math.sin(ang) * (r - 1.2);
      const x1 = 8 + Math.cos(ang) * (r + 1.8), y1 = 8 + Math.sin(ang) * (r + 1.8);
      line(p, x0, y0, x1, y1, a % 2 ? 'Y' : 'v');
    }
    if (i < 2) disc(p, 8, 8, 2 - i, 2 - i, [col('v')]);
    out.push(p);
  }
  return out;
}

/** Cruz verde de cura. */
export function plus(): Pixmap[] {
  const mk = (dy: number): Pixmap => {
    const p = new Pixmap(16, 16);
    rect(p, 7, 5 - dy, 2, 6, 'L'); rect(p, 5, 7 - dy, 6, 2, 'L');
    rect(p, 7, 6 - dy, 2, 4, 'v');
    return p.outline();
  };
  return [mk(0), mk(1), mk(2)];
}
