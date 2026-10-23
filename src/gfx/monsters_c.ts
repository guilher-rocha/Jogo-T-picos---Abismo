import { Pixmap } from './pixmap';
import { dot, disc, ramp, line } from './paint';
import { half, put, under, breathe } from './monsters_b';

// ───────────────────────── ogro ─────────────────────────

const OGRE = half('ogre', `
.....FDD
....FDEE
....DEyD
....DEEF
....DvFK
....EEDF
.DEEEDDD
.DEEDEEE
.DEDEEEF
.EE.EEFF
...EEFFF
...aeeyy
...bccdc
....EDD.
....EDD.
...FFDD.
`);

export function ogre(): Pixmap[] {
  const back = new Pixmap(16, 16);
  disc(back, 13.4, 3.2, 2.6, 3.4, ramp('bcde'));
  put(back, [[12, 1, 'W'], [15, 3, 'W'], [11, 4, 'W'], [14, 6, 'W']]);
  for (let y = 6; y <= 11; y++) { dot(back, 13, y, 'c'); dot(back, 14, y, 'd'); }
  return breathe(under(OGRE, back), 8);
}

// ───────────────────────── troll ─────────────────────────

const TROLL = half('troll', `
.....gGG
....gGlG
....GyGG
....GGGK
....GvKK
.....GgG
..GGllGG
.GlGGGgG
.GgGGlGg
.GG.GGgG
.Gl.gbcb
.Gg.gbcb
.GG.GGg.
.WW.GGg.
....GGg.
...gGGg.
`);

export function troll(): Pixmap[] {
  const p = TROLL.clone();
  // musgo e cicatrizes
  put(p, [[3, 7, 'L'], [4, 6, 'l'], [11, 8, 'L'], [12, 7, 'l'], [5, 8, 'L'], [10, 10, 'l'], [2, 9, 'L'], [13, 11, 'L']]);
  put(p, [[6, 7, 'q'], [7, 8, 'R']]);
  return breathe(p, 8);
}

// ───────────────────────── gigante das colinas ─────────────────────────

const GIANT = half('giant', `
.....hhH
....hhHH
....HSKS
....SSzS
....hHhH
....hHHh
.zSSdeee
.zSSdcee
.SSzdceb
.SS.dbcc
...zdbcc
...zaeyy
...bcbcb
....SzS.
....SzS.
...bbcc.
`);

export function hillGiant(): Pixmap[] {
  const back = new Pixmap(16, 16);
  // tronco de árvore como clava
  for (let y = 2; y <= 12; y++) { dot(back, 14, y, 'c'); dot(back, 15, y, y % 3 === 0 ? 'b' : 'd'); dot(back, 13, y, 'b'); }
  put(back, [[13, 1, 'c'], [14, 1, 'd'], [15, 1, 'e'], [14, 0, 'g'], [13, 4, 'G'], [15, 7, 'l']]);
  return breathe(under(GIANT, back), 8);
}

// ───────────────────────── espectro ─────────────────────────

const WRAITH = half('wraith', `
......12
.....123
....1233
....1KNK
....1KKK
....1233
...12333
..123433
.W123443
.v123343
..123334
.1223334
.1122333
12.12.33
1..1..2.
`);

export function wraith(): Pixmap[] {
  const mk = (lift: number, sway: boolean): Pixmap => {
    const base = sway ? WRAITH.flipX() : WRAITH;
    let p = base.clone();
    // mãos esqueléticas à frente
    put(p, [[1, 8, 'W'], [14, 8, 'W']]);
    p = p.outline(0.55);
    // a bainha esvanece em névoa
    const faded = p.map((c, _x, y) => (y >= 10 ? [c[0], c[1], c[2], Math.max(0, c[3] * (1 - (y - 9) * 0.13))] : c));
    return lift ? faded.shift(0, -lift) : faded;
  };
  return [mk(0, false), mk(1, true)];
}

// ───────────────────────── ninfa ─────────────────────────

const NYMPH = half('nymph', `
......nT
.....nTT
....QTss
....TsKs
....TssS
...nTTsS
..nTTsss
..TTsGls
..TTGlLG
..TTsGlG
...TTGlL
...nTGlG
....TGlG
...TGlLG
`);

export function nymph(): Pixmap[] {
  const p = NYMPH.clone();
  put(p, [[5, 7, 'N'], [10, 7, 'N'], [3, 11, 'n'], [12, 12, 'N']]);
  const a = p.outline();
  // o segundo quadro: cabelo e vestido ondulam
  const b = p.squashRow(9).outline();
  put(b, [[2, 12, 'N'], [13, 9, 'n']]);
  return [a, b];
}

// ───────────────────────── elfo negro ─────────────────────────

const DARKELF = half('dark_elf', `
......vW
.....vWW
....vW34
....W3q4
....W344
....W322
...vWk22
..k1P122
.33k1P12
.34k1122
.3.kPPk2
...k1P22
....k22.
....12.1
...k1.1k
`);

export function darkElf(): Pixmap[] {
  const back = new Pixmap(16, 16);
  // duas cimitarras cruzadas ao lado do corpo
  line(back, 1, 5, 3, 10, '5'); line(back, 0, 4, 2, 9, '6');
  line(back, 14, 5, 12, 10, '5'); line(back, 15, 4, 13, 9, '6');
  put(back, [[3, 11, 'x'], [12, 11, 'x']]);
  const p = under(DARKELF, back);
  put(p, [[3, 10, '3'], [12, 10, '3']]);
  return breathe(p, 9);
}

// ───────────────────────── vampiro ─────────────────────────

const VAMPIRE = half('vampire', `
.....kK1
....kK11
....kWvW
....1WqW
....1WWW
....1WvK
..Rq1kWW
.RqR1kvv
.RqR1kvx
.RRq1kkv
.RqR1k1k
.RqR11kk
.Rq.1k1.
..R.1k1.
...11k1.
...1kk1.
`);

export function vampire(): Pixmap[] {
  const p = VAMPIRE.clone();
  put(p, [[6, 7, 'v'], [9, 7, 'v']]);
  return breathe(p, 10);
}

// ───────────────────────── golem de pedra ─────────────────────────

const GOLEM = half('stone_golem', `
.....544
.....433
.....3N4
.....322
......22
.5444544
.4333433
.43.2NN3
.43.23n3
.32.3322
.444.322
.4334.22
.2322.12
....4332
....4332
...24432
`);

export function stoneGolem(): Pixmap[] {
  const mk = (glow: boolean): Pixmap => {
    const p = GOLEM.clone();
    put(p, [[3, 5, 'g'], [4, 5, 'g'], [12, 8, 'g'], [11, 9, 'l'], [5, 12, 'g'], [2, 9, 'g'], [13, 12, 'g']]);
    if (glow) put(p, [[6, 2, 'N'], [9, 2, 'N'], [7, 8, 'N'], [8, 8, 'N']]);
    return p.outline();
  };
  return [mk(false), mk(true)];
}
