import { Pixmap } from './pixmap';
import { col, dot, rect, line, disc, ramp, poly } from './paint';

const T = 16;
const blank = (): Pixmap => new Pixmap(T, T);

// ───────────────────────── animais ─────────────────────────

export function rat(): Pixmap[] {
  const f = (bob: number): Pixmap => {
    const p = blank();
    const fur = ramp('bcde');
    line(p, 2, 11 + bob, 1, 11 + bob, 'S'); line(p, 1, 11 + bob, 0, 10 + bob, 'S'); line(p, 0, 10 + bob, 0, 8 + bob, 'S');
    disc(p, 7.5, 11.5 + bob, 5.3, 3.1, fur);
    disc(p, 12.3, 11.2 + bob, 2.8, 2.3, fur, { bias: 0.05 });
    disc(p, 10.4, 8.9 + bob, 1.5, 1.5, [col('c'), col('S')]);
    dot(p, 14, 11 + bob, 'Q'); dot(p, 14, 12 + bob, 'S');
    dot(p, 12, 10 + bob, 'q'); dot(p, 13, 10 + bob, 'K');
    for (const x of [4, 6, 9, 11]) dot(p, x, 14, 'b');
    line(p, 14, 13 + bob, 15, 14, 'W');
    return p;
  };
  return [f(0), f(-0.0)].map((p, i) => (i ? p.squashRow(12) : p)).map((p) => p.outline());
}

export function bat(): Pixmap[] {
  const frame = (up: boolean): Pixmap => {
    const p = blank();
    const wing = ramp('pPm'), mem = col('p');
    const L: [number, number][] = up
      ? [[7, 8], [4, 5], [1, 3], [0, 5], [2, 6], [1, 9], [4, 8], [5, 11], [7, 11]]
      : [[7, 8], [4, 9], [1, 10], [0, 13], [2, 12], [3, 14], [5, 12], [6, 13], [7, 12]];
    poly(p, L, wing[1]);
    poly(p, L.map(([x, y]) => [15 - x, y] as [number, number]), wing[1]);
    // nervuras
    const rib = (x0: number, y0: number, x1: number, y1: number) => { line(p, x0, y0, x1, y1, mem); line(p, 15 - x0, y0, 15 - x1, y1, mem); };
    if (up) { rib(7, 8, 1, 3); rib(7, 9, 2, 6); rib(6, 10, 2, 9); } else { rib(7, 9, 1, 10); rib(7, 10, 2, 13); rib(6, 11, 4, 14); }
    disc(p, 7.5, 9.8, 2.0, 2.8, ramp('123'));
    disc(p, 7.5, 7.0, 2.0, 1.9, ramp('234'));
    dot(p, 6, 5, '2'); dot(p, 6, 4, '3'); dot(p, 9, 5, '2'); dot(p, 9, 4, '3');
    dot(p, 6, 7, 'q'); dot(p, 9, 7, 'q');
    dot(p, 7, 9, 'v'); dot(p, 8, 9, 'v');
    return p;
  };
  return [frame(true).outline(), frame(false).outline()];
}

function canine(fur: string, belly: string, big: boolean, eye: string): Pixmap {
  const p = blank();
  const r = ramp(fur);
  const s = big ? 1 : 0;
  // cauda
  poly(p, [[2, 9 + s], [0, 12 + s], [1, 14], [3, 12], [3, 10]], r[1]);
  dot(p, 0, 13 + s, belly);
  // corpo
  disc(p, 7.2, 10.6, 5.4, 3.2 + s * 0.3, r);
  disc(p, 6.5, 12.6, 3.5, 1.5, [col(belly)], {});
  // patas
  for (const x of [3, 5, 9, 11]) { rect(p, x, 12, 2, 3, r[1]); dot(p, x, 14, r[0]); }
  // cabeça e focinho
  disc(p, 11.7, 8.2, 2.6, 2.4, r);
  poly(p, [[12, 8], [15.5, 9.5], [15.5, 11], [12, 11]], r[2]);
  dot(p, 15, 9, 'K');
  poly(p, [[10.3, 6.4], [10.8, 3.2], [12.6, 5.9]], r[1]);
  dot(p, 11, 5, 'S');
  dot(p, 12, 7, eye); dot(p, 13, 7, 'K');
  dot(p, 14, 11, 'v'); dot(p, 12, 11, 'v');
  dot(p, 13, 11, 'q');
  return p.outline();
}

export function jackal(): Pixmap[] {
  const a = canine('cdef', 'f', false, 'y');
  return [a, a.squashRow(11)];
}

export function wolf(): Pixmap[] {
  const a = canine('2345', '5', true, 'y');
  return [a, a.squashRow(11)];
}

function spiderLegs(p: Pixmap, cx: number, cy: number, color: string, span: number): void {
  for (let i = 0; i < 4; i++) {
    const dy = -3 + i * 2;
    const reach = span - (i === 1 || i === 2 ? 0 : 1);
    // joelho para cima, ponta para baixo
    const kx = reach * 0.55, ky = dy - 2.6 + (i > 1 ? 1.6 : 0);
    const tx = reach, ty = dy + 3.2;
    for (const sgn of [-1, 1]) {
      line(p, cx + sgn * 1.5, cy + dy * 0.4, cx + sgn * kx, cy + ky, color);
      line(p, cx + sgn * kx, cy + ky, cx + sgn * tx, cy + ty, color);
    }
  }
}

export function caveSpider(): Pixmap[] {
  const f = (k: number): Pixmap => {
    const p = blank();
    spiderLegs(p, 7.5, 9.5 + k, '2', 6.2 + k);
    disc(p, 7.5, 10.2 + k, 2.8, 2.5, ramp('123'));
    disc(p, 7.5, 7.5 + k, 1.9, 1.6, ramp('234'));
    dot(p, 6, 7 + k, 'q'); dot(p, 9, 7 + k, 'q'); dot(p, 7, 6 + k, 'R'); dot(p, 8, 6 + k, 'R');
    return p.outline();
  };
  return [f(0), f(0.6)];
}

export function giantSpider(): Pixmap[] {
  const f = (k: number): Pixmap => {
    const p = blank();
    spiderLegs(p, 7.5, 9 + k, 'p', 7.4);
    disc(p, 7.5, 10.4 + k, 4.4, 3.6, ramp('pPmM'));
    dot(p, 7, 10 + k, 'q'); dot(p, 8, 10 + k, 'q'); dot(p, 7, 11 + k, 'R'); dot(p, 8, 11 + k, 'R'); dot(p, 7, 12 + k, 'q'); dot(p, 8, 12 + k, 'q');
    disc(p, 7.5, 6.6 + k, 2.5, 2.1, ramp('2345'));
    dot(p, 6, 6 + k, 'q'); dot(p, 9, 6 + k, 'q'); dot(p, 7, 5 + k, 'Q'); dot(p, 8, 5 + k, 'Q'); dot(p, 6, 5 + k, 'R'); dot(p, 9, 5 + k, 'R');
    dot(p, 6, 8 + k, 'v'); dot(p, 9, 8 + k, 'v'); dot(p, 6, 9 + k, 'L'); dot(p, 9, 9 + k, 'L');
    return p.outline();
  };
  return [f(0), f(0.7)];
}

export function greenJelly(): Pixmap[] {
  const f = (squash: boolean): Pixmap => {
    const p = blank();
    const r = ramp('gGlL');
    const h = squash ? 3.4 : 4.4, w = squash ? 6.9 : 6.1;
    disc(p, 7.5, 14 - h, w, h, r, { clipY: [0, 14] });
    // brilho interno e bolhas
    dot(p, 4, squash ? 9 : 8, 'v'); dot(p, 5, squash ? 9 : 8, 'L'); dot(p, 4, squash ? 10 : 9, 'L');
    dot(p, 10, squash ? 12 : 11, 'L'); dot(p, 11, squash ? 12 : 11, 'l');
    dot(p, 6, 13, 'L'); dot(p, 9, 8 + (squash ? 1 : 0), 'L');
    // olhos
    const ey = squash ? 10 : 9;
    rect(p, 5, ey, 2, 2, 'K'); rect(p, 9, ey, 2, 2, 'K');
    dot(p, 5, ey, 'v'); dot(p, 9, ey, 'v');
    dot(p, 7, ey + 3, 'K'); dot(p, 8, ey + 3, 'K'); dot(p, 6, ey + 2, 'g'); dot(p, 9, ey + 2, 'g');
    return p.outline();
  };
  return [f(false), f(true)];
}

export function poisonFungus(): Pixmap[] {
  const f = (spores: number): Pixmap => {
    const p = blank();
    // haste
    rect(p, 6, 10, 4, 4, 'w'); rect(p, 6, 10, 1, 4, 'W'); rect(p, 9, 10, 1, 4, 'w'); rect(p, 5, 13, 6, 1, 'w');
    // chapéu
    disc(p, 7.5, 8.2, 5.8, 3.9, ramp('pPmM'), { clipY: [0, 11] });
    rect(p, 2, 10, 12, 1, 'p');
    for (const [x, y] of [[5, 6], [8, 5], [10, 8], [4, 9], [7, 8]] as const) { dot(p, x, y, 'M'); dot(p, x + 1, y, 'M'); }
    dot(p, 6, 11, 'p'); dot(p, 9, 11, 'p');
    // esporos tóxicos
    const sp: [number, number][] = [[3, 3], [12, 2], [14, 6], [1, 6], [9, 1]];
    sp.forEach(([x, y], i) => dot(p, x, y - ((spores + i) % 2), i % 2 ? 'L' : 'l'));
    return p.outline();
  };
  return [f(0), f(1)];
}

export function serpent(): Pixmap[] {
  const f = (sway: number): Pixmap => {
    const p = blank();
    const r = ramp('gGlL');
    // caminho do corpo: da cauda (esquerda embaixo) até a cabeça (alto à direita)
    const path: [number, number, number][] = [
      [1.5, 13.2, 1.0], [3.5, 13.8, 1.5], [6, 13.4, 2.0], [8.5, 12.4, 2.4], [10.5, 10.4, 2.4], [10.8 + sway * 0.5, 8, 2.2],
      [9.8 + sway, 5.8, 2.0], [9.5 + sway, 3.8, 2.0],
    ];
    for (let i = 0; i < path.length - 1; i++) {
      const [x0, y0, r0] = path[i], [x1, y1, r1] = path[i + 1];
      for (let t = 0; t <= 1; t += 0.25) disc(p, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t, r0 + (r1 - r0) * t, r);
    }
    // barriga clara
    for (const [x, y] of [[4, 14], [6, 14], [8, 13], [10, 12], [11, 10]] as const) dot(p, x, y, 'L');
    // padrão de losangos
    for (const [x, y] of [[3, 13], [6, 13], [9, 11], [10, 8]] as const) dot(p, x, y, 'g');
    // cabeça
    const hx = 9.5 + sway;
    disc(p, hx + 0.5, 3.2, 2.7, 2.1, r);
    dot(p, hx - 0.5, 3, 'y'); dot(p, hx + 1.5, 3, 'y');
    dot(p, hx - 0.5, 3, 'K');
    dot(p, hx + 0.5, 6 - 1.6, 'v');
    dot(p, hx + 1, 5.6, 'q'); dot(p, hx + 1, 6.6, 'q'); dot(p, hx + 0.2, 7.2, 'q'); dot(p, hx + 2, 7.2, 'q');
    return p.outline();
  };
  return [f(0), f(1)];
}
