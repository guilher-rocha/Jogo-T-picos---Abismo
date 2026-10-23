import { PAL } from './palette';
import type { PixelPalette } from './pixmap';
import { Pixmap, fromRows, rowsOf, mirrored } from './pixmap';
import { dot, disc, ramp, rect } from './paint';

export const MON_PAL: PixelPalette = PAL;

const strip = (r: string): string => r.replace(/ /g, '');

/** Metade esquerda (8 colunas) alinhada embaixo e espelhada: criaturas simétricas. */
export function half(name: string, block: string): Pixmap {
  const rows = rowsOf(block).map(strip);
  const pad = 16 - rows.length;
  if (pad < 0) throw new Error(`${name}: linhas demais (${rows.length})`);
  const full = [...Array.from({ length: pad }, () => '.'.repeat(8)), ...rows];
  return fromRows(mirrored(full), MON_PAL, name, 16);
}

/** Bloco inteiro de 16 colunas alinhado embaixo. */
export function whole(name: string, block: string): Pixmap {
  const rows = rowsOf(block).map(strip);
  const pad = 16 - rows.length;
  if (pad < 0) throw new Error(`${name}: linhas demais (${rows.length})`);
  const full = [...Array.from({ length: pad }, () => '.'.repeat(16)), ...rows];
  return fromRows(full, MON_PAL, name, 16);
}

export type Dots = ReadonlyArray<readonly [number, number, string]>;
export function put(p: Pixmap, pts: Dots): Pixmap {
  for (const [x, y, c] of pts) dot(p, x, y, c);
  return p;
}

/** Desenha `behind` por baixo de `body` (arma segurada pela mão, por exemplo). */
export function under(body: Pixmap, behind: Pixmap): Pixmap {
  const out = behind.clone();
  out.blit(body, 0, 0);
  return out;
}

/** Dois quadros de "respiração": o segundo remove uma linha do tronco. */
export function breathe(base: Pixmap, row: number): Pixmap[] {
  return [base.outline(), base.squashRow(row).outline()];
}

// ───────────────────────── goblin ─────────────────────────

const GOBLIN = half('goblin', `
......gG
.g...gGl
.glGGGyG
..gGGGvK
.....gGG
...Gbccc
...Gbcdc
...Gaeey
...G.bcc
.....gG.
.....gG.
....bbc.
`);

export function goblin(): Pixmap[] {
  const p = GOBLIN.clone();
  put(p, [[13, 11, '4'], [14, 10, '5'], [15, 9, '6'], [13, 12, 'x']]);
  return breathe(p, 10);
}

// ───────────────────────── xamã goblin ─────────────────────────

const SHAMAN = half('shaman', `
.......P
......pP
.....pPm
..pppPPP
.g...gGl
.glGGGyG
..gGGGvK
.....gGG
..pPPmmm
..pPmPPP
..pPPPPy
..G.pPPP
...pPPPP
...pPPPP
..ppPPPP
....bb..
`);

export function goblinShaman(): Pixmap[] {
  const mk = (glow: boolean): Pixmap => {
    const staff = new Pixmap(16, 16);
    for (let y = 5; y <= 15; y++) dot(staff, 1, y, y % 3 === 0 ? 'd' : 'c');
    const body = under(SHAMAN, staff);
    // orbe arcano no topo do cajado
    put(body, [[1, 2, glow ? 'M' : 'm'], [0, 3, glow ? 'M' : 'm'], [2, 3, glow ? 'M' : 'm'], [1, 4, glow ? 'M' : 'm'], [1, 3, glow ? 'v' : 'M']]);
    // colar de ossos
    put(body, [[6, 8, 'v'], [9, 8, 'v']]);
    return body;
  };
  return [mk(false).outline(), mk(true).squashRow(11).outline()];
}

// ───────────────────────── kobold ─────────────────────────

const KOBOLD = half('kobold', `
.....r..
.....ooO
....oyOo
....ooOf
.....oKf
.......f
...roOOO
...oOOff
....oOff
.....OOf
.....oO.
....roo.
`);

export function kobold(): Pixmap[] {
  const spear = new Pixmap(16, 16);
  for (let y = 5; y <= 15; y++) dot(spear, 13, y, y % 4 === 1 ? 'd' : 'c');
  put(spear, [[13, 4, '4'], [13, 3, '5'], [13, 2, '6'], [12, 4, '3'], [14, 4, '3']]);
  const p = under(KOBOLD, spear);
  put(p, [[4, 13, 'o'], [3, 14, 'o'], [2, 14, 'O'], [1, 13, 'o'], [0, 12, 'O'], [12, 12, 'o']]);
  // escamas azul-esverdeadas (laranja demais lembrava um gato)
  const scales: Record<string, string> = {};
  for (const [a, b] of [['r', 'u'], ['o', 't'], ['O', 'T']] as const) scales[PAL[a]] = PAL[b];
  return breathe(p.swap(scales), 10);
}

// ───────────────────────── esqueleto ─────────────────────────

const SKELETON = half('skeleton', `
......vW
.....vWW
.....KqW
.....WWK
......vK
.......W
..wWWWWW
..W.WkWv
..W.kWkv
..W.WkWv
....kWvW
.....Ww.
.....Ww.
.....Ww.
....WWw.
`);

export function skeleton(): Pixmap[] {
  const back = new Pixmap(16, 16);
  // espada enferrujada (mão direita)
  for (let y = 4; y <= 10; y++) dot(back, 13, y, y === 4 ? '6' : y % 2 ? '5' : '4');
  put(back, [[12, 11, 'x'], [13, 11, 'x'], [14, 11, 'x'], [13, 12, 'c']]);
  const p = under(SKELETON, back);
  // escudo de madeira (braço esquerdo)
  disc(p, 2.4, 10.6, 2.6, 3.3, ramp('bcde'));
  put(p, [[2, 10, 'x'], [1, 8, 'a'], [3, 13, 'a']]);
  return breathe(p, 9);
}

// ───────────────────────── orc ─────────────────────────

const ORC = half('orc', `
......34
.....344
.....243
.....jyJ
....jvjJ
....jvJK
.....jJJ
..354444
.235jRRq
.23jJRqR
..jJ1eyy
..jj.RqR
.....jJ.
.....jJ.
....bbc.
`);

export function orc(): Pixmap[] {
  const back = new Pixmap(16, 16);
  // machado de guerra
  for (let y = 3; y <= 12; y++) dot(back, 13, y, y % 3 === 0 ? 'd' : 'c');
  rect(back, 14, 3, 2, 4, '4');
  put(back, [[15, 3, '6'], [15, 4, '6'], [15, 5, '5'], [15, 6, '5'], [14, 3, '5'], [12, 4, '3'], [12, 5, '3']]);
  return breathe(under(ORC, back), 9);
}

// ───────────────────────── zumbi ─────────────────────────

const ZOMBIE = half('zombie', `
.....aAZ
.....AZZ
.....KWZ
.....ZZA
.....AKK
.....ZAA
ZZZAbbcc
.AAAbcqc
...Abcdc
...Abacc
....abcb
.....ab.
.....ab.
....AZZ.
`);

export function zombie(): Pixmap[] {
  return breathe(ZOMBIE, 9);
}

// ───────────────────────── anão renegado ─────────────────────────

const DWARF = half('dwarf', `
......Rq
.....344
....2345
.....sKs
....ooOS
...ooOOO
...ooOOy
.3544oOO
.2SS4ooO
.2SS3aeY
.....bc.
....bbc.
`);

export function dwarf(): Pixmap[] {
  const back = new Pixmap(16, 16);
  for (let y = 8; y <= 12; y++) dot(back, 13, y, 'c');
  rect(back, 12, 5, 4, 3, '4');
  put(back, [[12, 5, '3'], [13, 5, '5'], [14, 5, '5'], [15, 5, '4'], [12, 7, '2'], [13, 7, '3'], [14, 7, '3'], [15, 7, '2']]);
  return breathe(under(DWARF, back), 10);
}

// ───────────────────────── gnoll ─────────────────────────

const GNOLL = half('gnoll', `
....ac..
....cdde
.....dyd
.....dbK
.....dbb
.....bvq
....dedd
..cddeee
..dedbee
..ed.ebe
..ed.eaa
..ee.RqR
.....ed.
....aed.
`);

export function gnoll(): Pixmap[] {
  const back = new Pixmap(16, 16);
  for (let y = 4; y <= 15; y++) dot(back, 14, y, y % 3 === 0 ? 'd' : 'c');
  put(back, [[14, 3, '4'], [14, 2, '5'], [14, 1, '6'], [13, 3, '3'], [15, 3, '3']]);
  return breathe(under(GNOLL, back), 8);
}
