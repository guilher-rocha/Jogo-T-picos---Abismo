import { Pixmap } from './pixmap';
import { dot, disc, ramp, rect, line, poly } from './paint';
import { half, under } from './monsters_b';
import { PAL } from './palette';

// ───────────────────────── naga ─────────────────────────

export function naga(): Pixmap[] {
  const f = (k: number): Pixmap => {
    const p = new Pixmap(16, 16);
    const sc = ramp('uUiI');
    // lança (por trás do corpo)
    for (let y = 3; y <= 15; y++) dot(p, 14, y, y % 4 === 0 ? 'd' : 'c');
    put2(p, [[14, 2, '6'], [13, 3, '5'], [15, 3, '5'], [13, 2, '4'], [15, 2, '4']]);
    // cauda enrolada em anéis
    disc(p, 7.6, 13.3, 6.8, 2.6, sc);
    for (const [x, y] of [[3, 13], [5, 14], [8, 14], [11, 13], [6, 12], [9, 12]] as const) dot(p, x, y, 'u');
    for (const [x, y] of [[4, 12], [7, 13], [10, 12]] as const) dot(p, x, y, 'I');
    poly(p, [[11, 12], [14.5, 10 + k], [14, 14]], sc[1]);
    dot(p, 14, 11 + k, sc[2]);
    // tronco
    disc(p, 7.6, 9.4, 2.8, 3.1, sc);
    for (const [x, y] of [[6, 8], [9, 8], [6, 10], [9, 10]] as const) dot(p, x, y, 'u');
    rect(p, 6, 9, 4, 1, 'x');
    // capuz de naja
    disc(p, 7.6, 5.3, 4.9 + k * 0.3, 3.9, ramp('uuUU'));
    for (const [x, y] of [[3, 4], [12, 4], [3, 6], [12, 6]] as const) dot(p, x, y, 'y');
    // rosto
    disc(p, 7.6, 5.6, 2.3, 2.5, ramp('SsssS'));
    dot(p, 6, 5, 'y'); dot(p, 9, 5, 'y'); dot(p, 6, 5, 'K'); dot(p, 9, 5, 'K');
    dot(p, 7, 7, 'q'); dot(p, 8, 7, 'q');
    dot(p, 6, 8 + 0, 'v'); dot(p, 9, 8, 'v');
    return p.outline();
  };
  return [f(0), f(1)];
}

function put2(p: Pixmap, pts: ReadonlyArray<readonly [number, number, string]>): void {
  for (const [x, y, c] of pts) dot(p, x, y, c);
}

// ───────────────────────── elementais ─────────────────────────

const FIRE = half('fire_elemental', `
.......o
......oO
.....oOO
.....oOy
....oOKy
....oOyy
.o..oOyY
.oo.oOyY
.ooOoOyY
.oOOOyyY
..oOOyYY
..oOOyYY
...oOyYY
...oOOyY
..ooOOyy
.oooOOOy
`);

export function fireElemental(): Pixmap[] {
  const a = FIRE.clone();
  put2(a, [[2, 3, 'O'], [13, 4, 'y'], [1, 6, 'y']]);
  const b = FIRE.squashRow(3);
  put2(b, [[3, 2, 'O'], [12, 3, 'y'], [14, 7, 'O'], [1, 5, 'y'], [7, 0, 'O']]);
  return [a.outline(0.5), b.outline(0.5)];
}

export function frostElemental(): Pixmap[] {
  const f = (k: number): Pixmap => {
    const p = new Pixmap(16, 16);
    const shard = (pts: [number, number][], light: [number, number][], dark: [number, number][]): void => {
      poly(p, pts, 'i');
      poly(p, light, 'I');
      poly(p, dark, 'U');
    };
    // braços (cristais compridos)
    shard([[3, 5], [0.5, 12], [4.5, 9]], [[3, 5], [0.5, 12], [2.5, 9]], [[3, 5], [4.5, 9], [3, 9]]);
    shard([[12, 5], [15, 12], [11, 9]], [[12, 5], [11, 9], [13, 9]], [[12, 5], [15, 12], [13.5, 9]]);
    // tronco: grande cristal hexagonal
    shard([[8, 4], [12, 9], [8, 15], [4, 9]], [[8, 4], [4, 9], [8, 15], [7, 9]], [[8, 4], [12, 9], [8, 15], [9, 8]]);
    // cabeça: diamante menor
    shard([[8, 0.5 + k * 0.5], [10.5, 3], [8, 5.5], [5.5, 3]], [[8, 0.5 + k * 0.5], [5.5, 3], [8, 5.5], [7, 3]], [[8, 0.5 + k * 0.5], [10.5, 3], [8, 5.5]]);
    // facetas e brilho interno
    line(p, 8, 6, 8, 13, 'n'); line(p, 6, 9, 10, 9, 'n');
    dot(p, 7, 3, 'u'); dot(p, 9, 3, 'u');
    dot(p, 6, 8, 'N'); dot(p, 7, 7, 'v'); dot(p, 9, 11, 'N');
    // pés pontiagudos
    poly(p, [[5, 15], [4, 13], [7, 14]], 'U'); poly(p, [[11, 15], [12, 13], [9, 14]], 'U');
    // brilhos de gelo
    for (const [x, y] of k ? [[2, 3], [14, 6], [1, 9]] : [[13, 2], [2, 7], [14, 10]]) dot(p, x, y, 'v');
    return p.outline();
  };
  return [f(0), f(1)];
}

// ───────────────────────── devorador de mentes ─────────────────────────

// Cabeça de polvo cor de malva com olhos amarelados, manto quase preto de gola alta (o escuro faz os
// tentáculos claros aparecerem), debrum roxo e faixa dourada.
const FLAYER = half('mind_flayer', `
.....mmM
....mMMM
...mMMMM
..pmMMvM
.pPmYKMM
.pPkmMMM
.1pkkmMm
.1p1kkmk
.1p11kkk
.1p111kx
.1p111kx
11p111kx
11p111kx
11p111kx
1pp1111x
.1ppppPk
`);

export function mindFlayer(): Pixmap[] {
  const mk = (sway: number): Pixmap => {
    const p = FLAYER.clone();
    // quatro tentáculos que pendem do rosto, por cima do manto escuro
    const strands: [number, number][][] = [
      [[5, 6], [5, 7], [4 + sway, 8], [4 + sway, 9]],
      [[6, 6], [6, 7], [6, 8], [6 - sway, 9], [6 - sway, 10]],
      [[9, 6], [9, 7], [9, 8], [9 + sway, 9], [9 + sway, 10]],
      [[10, 6], [10, 7], [11 - sway, 8], [11 - sway, 9]],
    ];
    strands.forEach((seg) => seg.forEach(([x, y], j) => dot(p, x, y, j === seg.length - 1 ? 'v' : j % 2 ? 'M' : 'm')));
    if (sway) put2(p, [[2, 2, 'M'], [13, 1, 'm'], [14, 4, 'M']]);
    return p.outline();
  };
  return [mk(0), mk(1)];
}

// ───────────────────────── lich ─────────────────────────

const LICH = half('lich', `
....x.x.
....xxxx
.....vWW
.....KqW
.....WWK
......vK
..pPPmWW
.ppPmPPv
.pPPmPvk
.pPPmPkv
.vPPmPvk
.WpPmPPP
..pPmPPP
..pPmPPm
.ppPmPPP
.pppPmpp
`);

export function lich(): Pixmap[] {
  const mk = (glow: boolean): Pixmap => {
    const back = new Pixmap(16, 16);
    for (let y = 4; y <= 15; y++) dot(back, 14, y, y % 3 === 0 ? 'b' : 'a');
    disc(back, 14, 2.2, 1.9, 1.9, ramp(glow ? 'mMMv' : 'PmMM'));
    const p = under(LICH, back);
    put2(p, [[6, 3, glow ? 'Q' : 'q'], [9, 3, glow ? 'Q' : 'q']]);
    return p.outline();
  };
  return [mk(false), mk(true)];
}

// ───────────────────────── dragões ─────────────────────────

function dragonBase(k: number): Pixmap {
  const p = new Pixmap(16, 16);
  const sc = ramp('rRRq');
  // asa (por trás): membrana escura com ossos mais claros
  poly(p, [[7, 9], [1.5, 2], [4.5, 5], [6.5, 0], [9, 4.5], [11.5, 2.5], [11, 9]], 'r');
  line(p, 7, 9, 1.5, 2, 'R'); line(p, 8, 8, 6.5, 0, 'R'); line(p, 9, 8, 11.5, 2.5, 'R');
  // cauda com ponta em lança
  poly(p, [[3.5, 10], [0, 12.5 + k], [0.6, 14], [4.5, 12.6]], sc[1]);
  poly(p, [[0, 11.5 + k], [2, 12.4 + k], [0.6, 14.4]], 'q');
  // pernas
  for (const x of [3.5, 9]) { rect(p, Math.round(x), 12, 2, 3, sc[1]); dot(p, Math.round(x), 14, 'W'); dot(p, Math.round(x) + 1, 14, 'W'); }
  // corpo e barriga clara
  disc(p, 7.2, 10.8, 5.3, 3.1, sc);
  disc(p, 7.6, 12.5, 4.1, 1.1, ramp('def'));
  for (const x of [4, 6, 8, 10]) dot(p, x, 12, 'd');
  // pescoço
  poly(p, [[9.5, 9], [10.5, 4.5], [13.5, 5], [12.5, 10]], sc[1]);
  // cabeça: crânio, focinho e mandíbula
  disc(p, 12.6, 4.6, 2.5, 2.1, ramp('RRqq'));
  poly(p, [[13, 4], [16, 5], [16, 6.6], [13, 7]], 'q');
  poly(p, [[12.5, 6.6], [15.7, 7], [15.2, 8.2], [12, 8]], 'R');
  dot(p, 15, 5, 'K'); dot(p, 13, 3, 'y'); dot(p, 14, 3, 'K');
  dot(p, 14, 7, 'v'); dot(p, 15, 7, 'v'); dot(p, 13, 7, 'K');
  // chifres e espinhos
  poly(p, [[11, 3.4], [8.6, 1], [11.8, 2.4]], 'W');
  poly(p, [[13, 2.6], [12.6, 0.4], [14.6, 2.4]], 'W');
  for (const [x, y] of [[4, 8], [6, 7], [8, 7]] as const) dot(p, x, y, 'W');
  return p;
}

export function redDragon(): Pixmap[] {
  return [dragonBase(0).outline(), dragonBase(1).outline()];
}

export function blueDragon(): Pixmap[] {
  const table: Record<string, string> = {};
  const pair: [string, string][] = [['r', 'u'], ['R', 'U'], ['q', 'i'], ['Q', 'I'], ['d', 't'], ['e', 'T'], ['f', 'n']];
  for (const [a, b] of pair) table[PAL[a]] = PAL[b];
  return [dragonBase(0).swap(table).outline(), dragonBase(1).swap(table).outline()];
}

// ───────────────────────── demônio ─────────────────────────

const DEMON = half('demon', `
..W.....
..WW....
...WRRRR
....RRyR
....RRRq
....RRvK
...qRRRR
.qRRqRRR
.RqRRRrR
.RRqrrRr
.RRrRRrR
.qRrRRrR
...kkRrR
...kkRrR
...RkRrk
..kkkRrk
`);

export function demon(): Pixmap[] {
  const mk = (flap: number): Pixmap => {
    const back = new Pixmap(16, 16);
    for (const s of [0, 1]) {
      const X = (x: number): number => (s ? 15 - x : x);
      const wing: [number, number][] = [[X(5), 9], [X(0), 0 + flap], [X(1), 4], [X(0), 7], [X(2), 9], [X(1), 12], [X(4), 12]];
      poly(back, wing, 'r');
      line(back, X(5), 9, X(0), 0 + flap, 'q'); line(back, X(4), 9, X(0), 7, 'R'); line(back, X(4), 9, X(1), 12, 'R');
    }
    const p = under(DEMON, back);
    // espada flamejante na mão direita
    for (let y = 3; y <= 10; y++) dot(p, 14, y, y % 2 ? 'O' : 'y');
    put2(p, [[14, 2, 'Y'], [13, 1 + flap, 'y'], [15, 1, 'O'], [14, 11, 'x'], [13, 11, 'x'], [15, 11, 'x']]);
    // rabo com ponta
    put2(p, [[11, 14, 'r'], [12, 15, 'R'], [13, 15, 'q']]);
    return p.outline();
  };
  return [mk(0), mk(1)];
}

// ───────────────────────── horror abissal ─────────────────────────

export function abyssalHorror(): Pixmap[] {
  const f = (k: number): Pixmap => {
    const p = new Pixmap(16, 16);
    const body = ramp('kpPm');
    // tentáculos
    const tent = (x0: number, y0: number, dx: number, dy: number, wob: number): void => {
      let x = x0, y = y0;
      for (let i = 0; i < 6; i++) {
        disc(p, x, y, 1.1 - i * 0.1, 1.1 - i * 0.1, ramp('pPm'));
        x += dx * 0.9 + Math.sin(i * 1.3 + wob) * 0.7;
        y += dy * 0.9;
      }
      dot(p, x, y, 'M');
    };
    tent(4, 11, -1, 0.7, k * 1.6); tent(6, 12, -0.4, 1, k * 1.6 + 1); tent(10, 12, 0.4, 1, k * 1.6 + 2); tent(12, 11, 1, 0.7, k * 1.6 + 3);
    tent(3, 7, -1, -0.4, k * 1.6 + 4); tent(13, 7, 1, -0.4, k * 1.6 + 5);
    // massa central
    disc(p, 7.8, 7.8, 5.4, 4.8, body);
    // olho principal
    disc(p, 7.8, 7.4, 2.8, 2.3, ramp('WvvW'));
    disc(p, 7.8 + (k ? 0.6 : -0.4), 7.4, 1.3, 1.5, ramp('RqR'));
    dot(p, 7.8 + (k ? 0.6 : -0.4), 7.4, 'K');
    // olhos menores
    for (const [x, y] of [[3, 5], [12, 5], [4, 9], [12, 9], [6, 3], [10, 3]] as const) { dot(p, x, y, 'y'); dot(p, x + 1, y, 'K'); }
    // boca de dentes
    for (let x = 5; x <= 10; x += 1) dot(p, x, 12, x % 2 ? 'v' : 'K');
    return p.outline();
  };
  return [f(0), f(1)];
}
