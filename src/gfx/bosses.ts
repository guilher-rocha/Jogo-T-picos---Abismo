import { Pixmap } from './pixmap';
import { dot, disc, ramp, rect, line, poly } from './paint';

/** Chefes: 24×24, desenhados à mão por pintura; ocupam o tile mais metade dos vizinhos. */
export const BOSS_SIZE = 24;
const blank = (): Pixmap => new Pixmap(BOSS_SIZE, BOSS_SIZE);

function thickLine(p: Pixmap, x0: number, y0: number, x1: number, y1: number, r: number, colors: ReturnType<typeof ramp>): void {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let i = 0; i <= n; i++) disc(p, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, r, r, colors);
}

const frames = (base: Pixmap, row: number): Pixmap[] => [base.outline(), base.squashRow(row).outline()];

// ───────────────────────── Rei Goblin Grutch ─────────────────────────

export function goblinKing(): Pixmap[] {
  const p = blank();
  const sk = ramp('gGGl');
  // capa vermelha
  poly(p, [[5, 11], [19, 11], [23.5, 21.5], [0.5, 21.5]], 'r');
  line(p, 7, 12, 3, 21, 'R'); line(p, 17, 12, 21, 21, 'R'); line(p, 10, 14, 8, 21, 'R'); line(p, 14, 14, 16, 21, 'R');
  // pernas e botas
  rect(p, 7, 19, 4, 3, 'G'); rect(p, 13, 19, 4, 3, 'G');
  rect(p, 6, 21, 5, 3, 'b'); rect(p, 13, 21, 5, 3, 'b');
  rect(p, 6, 21, 5, 1, 'c'); rect(p, 13, 21, 5, 1, 'c');
  // barriga e colete de couro
  disc(p, 12, 15.4, 7.4, 6.0, sk);
  disc(p, 12, 16.6, 4.4, 3.8, ramp('GlLl'));
  poly(p, [[6, 11], [10, 10.5], [9, 19], [6.5, 18]], 'c'); poly(p, [[18, 11], [14, 10.5], [15, 19], [17.5, 18]], 'c');
  line(p, 6, 11, 6.5, 18, 'b'); line(p, 18, 11, 17.5, 18, 'b');
  for (const y of [13, 15, 17]) { dot(p, 8, y, 'x'); dot(p, 16, y, 'x'); }
  // cinto com fivela
  rect(p, 5, 17, 14, 2, 'a'); rect(p, 11, 17, 2, 2, 'x'); dot(p, 11, 17, 'Y');
  // braço esquerdo (taça) e direito (clava de ossos)
  thickLine(p, 5.5, 11.5, 3, 16, 1.7, sk); disc(p, 2.6, 16.6, 1.9, 1.7, ramp('GlL'));
  thickLine(p, 18.5, 11.5, 21, 14.5, 1.7, sk); disc(p, 21.2, 15, 1.9, 1.7, ramp('GlL'));
  for (let y = 5; y <= 15; y++) { dot(p, 21, y, 'd'); dot(p, 22, y, y % 3 ? 'c' : 'b'); }
  disc(p, 21.6, 3.8, 2.3, 3.2, ramp('bcdw'));
  for (const [x, y] of [[19, 2], [23, 1], [19, 5], [23, 6], [21, 0]] as const) dot(p, x, y, 'W');
  // cabeça
  disc(p, 12, 7.4, 5.2, 4.3, sk);
  poly(p, [[7.4, 5.6], [0.6, 2.4], [2.2, 6.6], [7.6, 9.4]], 'G'); poly(p, [[16.6, 5.6], [23.4, 2.4], [21.8, 6.6], [16.4, 9.4]], 'G');
  poly(p, [[6.8, 6.2], [2.6, 3.6], [3.4, 6.2], [7, 8]], 'l'); poly(p, [[17.2, 6.2], [21.4, 3.6], [20.6, 6.2], [17, 8]], 'l');
  // rosto
  rect(p, 8, 5, 3, 2, 'y'); rect(p, 13, 5, 3, 2, 'y');
  dot(p, 9, 6, 'K'); dot(p, 14, 6, 'K'); line(p, 8, 4, 11, 5, 'K'); line(p, 16, 4, 13, 5, 'K');
  dot(p, 11, 8, 'g'); dot(p, 12, 8, 'g'); dot(p, 11, 7, 'L');
  rect(p, 8, 10, 8, 2, 'K'); rect(p, 10, 11, 4, 1, 'q');
  for (const x of [8, 10, 13, 15]) dot(p, x, 9, 'v');
  dot(p, 8, 8.5, 'v'); dot(p, 15, 8.5, 'v');
  // coroa: uma panela amassada com joias
  poly(p, [[7.2, 4.2], [16.8, 4.2], [15.6, 0.4], [8.4, 0.4]], '4');
  poly(p, [[7.2, 4.2], [9.4, 4.2], [9.4, 0.4], [8.4, 0.4]], '5'); poly(p, [[14.4, 4.2], [16.8, 4.2], [15.6, 0.4], [14.4, 0.4]], '3');
  rect(p, 7, 3, 10, 1, '2'); dot(p, 12, 1, 'k'); dot(p, 13, 1, 'k'); dot(p, 12, 2, '2');
  dot(p, 9, 2, 'q'); dot(p, 12, 3, 'y'); dot(p, 15, 2, 'i');
  rect(p, 11, 0, 2, 1, '5');
  return frames(p, 14);
}

// ───────────────────────── Troll Ancião Murgash ─────────────────────────

export function ancientTroll(): Pixmap[] {
  const p = blank();
  const sk = ramp('gGGl');
  // pernas e pés com garras
  rect(p, 6, 17, 5, 6, 'G'); rect(p, 13, 17, 5, 6, 'G'); rect(p, 6, 17, 1, 6, 'g'); rect(p, 13, 17, 1, 6, 'g');
  for (const x of [5, 7, 9, 12, 14, 16]) dot(p, x, 23, 'W');
  rect(p, 5, 22, 6, 1, 'g'); rect(p, 12, 22, 6, 1, 'g');
  // corpo curvado
  disc(p, 12, 13.5, 9.2, 7.6, sk);
  disc(p, 12, 16, 5.2, 4.4, ramp('GlLl'));
  // tanga de couro
  poly(p, [[6, 17], [18, 17], [16, 22], [8, 22]], 'b'); line(p, 8, 18, 9, 21, 'a'); line(p, 12, 18, 12, 22, 'a'); line(p, 16, 18, 15, 21, 'a');
  rect(p, 6, 16, 12, 2, 'a');
  // musgo e cicatrizes
  for (const [x, y] of [[5, 8], [6, 9], [7, 7], [17, 8], [18, 9], [16, 7], [4, 12], [19, 12], [9, 6], [14, 6]] as const) { dot(p, x, y, 'L'); dot(p, x + 1, y, 'l'); }
  line(p, 9, 11, 13, 15, 'R'); line(p, 10, 11, 14, 15, 'q'); line(p, 15, 10, 13, 12, 'R');
  // braços enormes
  thickLine(p, 4.2, 9.5, 2.2, 19, 2.3, ramp('gGGl')); disc(p, 2.4, 20.4, 2.6, 2.2, ramp('gGl'));
  for (const x of [0, 2, 4]) dot(p, x, 22, 'W');
  thickLine(p, 19.8, 9.5, 21.4, 16, 2.3, ramp('gGGl')); disc(p, 21.6, 17.4, 2.5, 2.2, ramp('gGl'));
  // clava: tronco com espinhos
  for (let y = 3; y <= 19; y++) { dot(p, 21, y, 'd'); dot(p, 22, y, y % 4 ? 'c' : 'b'); dot(p, 23, y, 'b'); }
  disc(p, 22, 4, 2.2, 3.4, ramp('bcde'));
  for (const [x, y] of [[19, 2], [20, 5], [23, 0], [23, 7]] as const) dot(p, x, y, 'W');
  // cabeça: mandíbula saliente e presas
  disc(p, 12, 6.2, 4.9, 4.2, sk);
  poly(p, [[8, 6], [16, 6], [17, 11], [7, 11]], 'G');
  rect(p, 9, 9, 6, 2, 'g');
  poly(p, [[8.4, 9], [8, 5.2], [10, 9]], 'v'); poly(p, [[15.6, 9], [16, 5.2], [14, 9]], 'v');
  rect(p, 10, 9, 4, 2, 'K'); for (const x of [10, 13]) dot(p, x, 9, 'v');
  rect(p, 8, 4, 3, 2, 'K'); rect(p, 13, 4, 3, 2, 'K'); dot(p, 9, 5, 'q'); dot(p, 14, 5, 'q'); dot(p, 9, 4, 'Q'); dot(p, 14, 4, 'Q');
  line(p, 8, 3, 11, 4, 'g'); line(p, 16, 3, 13, 4, 'g');
  dot(p, 11, 7, 'g'); dot(p, 12, 7, 'g'); dot(p, 11, 6, 'L');
  for (const [x, y] of [[8, 1], [10, 0], [12, 0], [14, 1], [15, 0]] as const) { dot(p, x, y, 'L'); dot(p, x, y + 1, 'l'); }
  return frames(p, 12);
}

// ───────────────────────── Lich Menor Vaeloth ─────────────────────────

export function lesserLich(): Pixmap[] {
  const mk = (k: number): Pixmap => {
    const p = blank();
    // manto
    poly(p, [[8, 9], [16, 9], [21.5, 23.5], [2.5, 23.5]], 'p');
    poly(p, [[8, 9], [12, 9], [11, 23.5], [2.5, 23.5]], 'p');
    for (const [x0, x1] of [[9, 6], [11, 10], [14, 15], [16, 19]] as const) line(p, x0, 11, x1, 23, 'P');
    line(p, 8, 9, 3.5, 23, 'u'); line(p, 16, 9, 20.5, 23, 'u');
    // barra ornamental
    rect(p, 11, 10, 2, 13, 'k'); for (let y = 11; y < 23; y += 2) { dot(p, 11, y, 'x'); dot(p, 12, y + 1, 'x'); }
    // costelas aparentes
    for (const y of [11, 13, 15]) { line(p, 9, y, 14, y, 'v'); }
    // ombros e mangas
    disc(p, 6.4, 11, 3.2, 2.6, ramp('pPmP')); disc(p, 17.6, 11, 3.2, 2.6, ramp('pPmP'));
    thickLine(p, 5, 12, 2.4, 16.5 + k * 0.6, 1.7, ramp('pPm'));
    disc(p, 2.2, 17.4 + k * 0.6, 1.6, 1.6, ramp('wWv'));
    for (const x of [0, 2, 4]) dot(p, x + 0, 19 + k * 0.6, 'v');
    // braço direito com cajado
    thickLine(p, 19, 12, 20.6, 14, 1.7, ramp('pPm'));
    for (let y = 3; y <= 23; y++) dot(p, 21, y, y % 3 ? 'b' : 'c');
    disc(p, 21, 3.6 - k * 0.4, 2.7, 2.7, ramp('mMMv'));
    for (const [x, y] of [[18, 2], [18, 5], [23, 2], [23, 5], [21, 0]] as const) dot(p, x, y + 0, 'x');
    dot(p, 21, 14, 'v'); dot(p, 20, 14, 'v');
    // crânio coroado
    disc(p, 12, 5.8, 3.8, 3.9, ramp('wWvv'));
    rect(p, 9, 8, 6, 2, 'W'); line(p, 10, 9, 14, 9, 'K');
    for (const x of [10, 12, 14]) dot(p, x, 9, 'v');
    rect(p, 9, 5, 2, 2, 'K'); rect(p, 13, 5, 2, 2, 'K'); dot(p, 10, 6, 'Q'); dot(p, 14, 6, 'Q'); dot(p, 10, 5, 'q'); dot(p, 14, 5, 'q');
    dot(p, 11.5, 7.5, 'K'); dot(p, 12, 7.5, 'K');
    rect(p, 8, 2, 8, 1, 'x');
    for (const x of [8, 10, 12, 14]) { dot(p, x, 1, 'x'); dot(p, x + 0, 0, k && x === 12 ? 'Y' : 'x'); }
    dot(p, 11, 2, 'q'); dot(p, 13, 2, 'i');
    // brumas frias
    const sp: [number, number][] = k ? [[2, 4], [5, 1], [0, 8], [17, 1], [22, 11]] : [[1, 5], [4, 2], [1, 9], [18, 0], [23, 13]];
    sp.forEach(([x, y], i) => dot(p, x, y, i % 2 ? 'N' : 'n'));
    const out = p.outline();
    // a bainha do manto vira névoa
    return out.map((c, _x, y) => (y >= 20 ? [c[0], c[1], c[2], Math.max(0, c[3] * (1 - (y - 19) * 0.16))] : c));
  };
  return [mk(0), mk(1)];
}

// ───────────────────────── Guardião do Abismo ─────────────────────────

export function abyssGuardian(): Pixmap[] {
  const mk = (k: number): Pixmap => {
    const p = blank();
    // pernas e pés
    rect(p, 6, 18, 5, 5, '1'); rect(p, 13, 18, 5, 5, '1'); rect(p, 6, 18, 1, 5, '3'); rect(p, 13, 18, 1, 5, '3');
    rect(p, 5, 22, 6, 2, 'k'); rect(p, 13, 22, 6, 2, 'k'); rect(p, 5, 22, 6, 1, '2'); rect(p, 13, 22, 6, 1, '2');
    // tronco
    rect(p, 6, 9, 12, 10, '1'); rect(p, 6, 9, 12, 1, '3'); rect(p, 6, 9, 1, 10, '3'); rect(p, 17, 9, 1, 10, 'k');
    rect(p, 7, 17, 10, 2, 'k'); rect(p, 7, 17, 10, 1, '2');
    // ombreiras e braços
    rect(p, 1, 6, 6, 6, '2'); rect(p, 1, 6, 6, 1, '4'); rect(p, 1, 6, 1, 6, '4'); rect(p, 6, 6, 1, 6, '1');
    rect(p, 17, 6, 6, 6, '2'); rect(p, 17, 6, 6, 1, '4'); rect(p, 17, 6, 1, 6, '3'); rect(p, 22, 6, 1, 6, '1');
    rect(p, 2, 12, 4, 8, '1'); rect(p, 18, 12, 4, 8, '1'); rect(p, 2, 12, 1, 8, '3'); rect(p, 18, 12, 1, 8, '3');
    rect(p, 1, 19, 6, 4, '2'); rect(p, 17, 19, 6, 4, '2'); rect(p, 1, 19, 6, 1, '4'); rect(p, 17, 19, 6, 1, '4');
    // espinhos nas ombreiras
    poly(p, [[2, 6], [3, 1.5], [4.5, 6]], '3'); poly(p, [[19.5, 6], [21, 1.5], [22, 6]], '3');
    dot(p, 3, 2, 'O'); dot(p, 21, 2, 'O');
    // veios de lava
    const lava = (pts: [number, number][]): void => {
      for (let i = 0; i < pts.length - 1; i++) line(p, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 'o');
      pts.forEach(([x, y], i) => dot(p, x, y, i % 2 ? 'y' : 'O'));
    };
    lava([[7, 10], [9, 12], [8, 14], [10, 16]]); lava([[17, 10], [15, 13], [16, 15], [14, 17]]);
    lava([[3, 13], [4, 16], [3, 18]]); lava([[20, 13], [19, 16], [21, 18]]);
    lava([[7, 19], [8, 21]]); lava([[16, 19], [15, 22]]);
    // coração de fogo no peito
    disc(p, 12, 13.2, 2.9, 2.9, ramp(k ? 'OyYY' : 'oOyY'));
    dot(p, 11, 12, 'Y'); dot(p, 12, 12, 'Y');
    // cabeça com chifres
    rect(p, 8, 1, 8, 7, '1'); rect(p, 8, 1, 8, 1, '3'); rect(p, 8, 1, 1, 7, '3'); rect(p, 15, 1, 1, 7, 'k');
    poly(p, [[8, 2], [3.5, 3], [1, 0], [5, 0.2], [8, 0.6]], '2'); poly(p, [[16, 2], [20.5, 3], [23, 0], [19, 0.2], [16, 0.6]], '2');
    dot(p, 1, 0, 'O'); dot(p, 22, 0, 'O');
    // olhos e boca em brasa
    rect(p, 9, 3, 3, 1, 'y'); rect(p, 12, 3, 3, 1, 'y'); dot(p, 10, 3, 'Y'); dot(p, 13, 3, 'Y');
    dot(p, 9, 4, 'o'); dot(p, 14, 4, 'o');
    rect(p, 9, 6, 6, 1, 'O'); for (const x of [10, 12, 14]) dot(p, x, 6, 'y');
    // chamas nas costas e ombros
    const flames: [number, number, number][] = [[5, 6, 3 + k], [8, 1, 3], [16, 1, 3 + k], [19, 6, 3]];
    flames.forEach(([x, y, h]) => {
      poly(p, [[x - 1, y], [x + 0.2, y - h], [x + 1.4, y]], 'O');
      poly(p, [[x - 0.2, y], [x + 0.3, y - h * 0.6], [x + 0.8, y]], 'y');
    });
    return p.outline(0.6);
  };
  return [mk(0), mk(1)];
}
