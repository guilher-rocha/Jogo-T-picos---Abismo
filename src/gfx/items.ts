import type { RGBA } from './color';
import { mix } from './color';
import { Pixmap } from './pixmap';
import { dot, disc, ramp, rect, line, poly, col } from './paint';
import type { ItemBase } from '../data/items';
import { ITEMS } from '../data/items';
import { COLOR_NAMES } from '../engine/colors';
import type { Color } from '../engine/colors';
import { LOOKS, LOOK_COLORS } from '../data/appearances';
import type { LookCategory } from '../data/appearances';

/** Ícones de itens: 16×16, desenhados por pintura; a cor do jogo vira uma rampa de 4 tons. */

type R4 = [RGBA, RGBA, RGBA, RGBA]; // sombra, base, luz, brilho

const RAMP_LETTERS: Record<Color, string> = {
  black: 'kk12', red: 'rRqQ', green: 'gGlL', brown: 'bcde', blue: 'uUiI', magenta: 'pPmM', cyan: 'tTnN',
  lightGray: '2456', darkGray: 'k123', lightRed: 'RqQv', lightGreen: 'GlLv', yellow: 'oyYv', lightBlue: 'UiIv',
  lightMagenta: 'PmMv', lightCyan: 'TnNv', white: '456v', orange: 'roOy', darkRed: 'kkrR', darkBlue: 'kkuU',
  darkGreen: 'kkgG', gold: 'dxyY', memory: '1223',
};

const ramp4 = (c: Color): R4 => ramp(RAMP_LETTERS[c]) as R4;

const WOOD = ramp('abcd');
const STEEL = ramp('2456');
const GOLD = ramp('dxyY');
const clear = (p: Pixmap, x: number, y: number): void => p.set(x, y, [0, 0, 0, 0]);

// ───────────────────────── espadas e afins ─────────────────────────

interface SwordOpts { bx: number; by: number; len: number; guard: number; grip: number; wide?: boolean; guardC?: RGBA; pommel?: RGBA; cup?: boolean }

function sword(p: Pixmap, r: R4, o: SwordOpts): void {
  const { bx, by, len } = o;
  for (let i = 0; i <= len; i++) {
    dot(p, bx + i, by - i, r[2]);
    if (o.wide) dot(p, bx + i + 1, by - i, r[1]);
  }
  dot(p, bx + len, by - len - 1 + (o.wide ? 0 : 0), r[3]);
  if (o.wide) dot(p, bx + len + 1, by - len - 1, r[3]);
  // fio da lâmina
  for (let i = 1; i < len; i += 2) dot(p, bx + i, by - i, r[3]);
  // guarda
  const gc = o.guardC ?? GOLD[1];
  if (o.cup) disc(p, bx - 0.2, by + 0.6, 1.9, 1.9, ramp('dxy'));
  else line(p, bx - o.guard, by - o.guard + 1 + (o.wide ? 0 : 0), bx + o.guard + (o.wide ? 1 : 0), by + o.guard + 1 - 1 + 0, gc);
  // empunhadura
  for (let i = 1; i <= o.grip; i++) dot(p, bx - i, by + i, i % 2 ? WOOD[1] : WOOD[2]);
  dot(p, bx - o.grip - 1, by + o.grip + 1, o.pommel ?? GOLD[2]);
}

function handle(p: Pixmap, x0: number, y0: number, x1: number, y1: number): void {
  line(p, x0, y0, x1, y1, WOOD[1]);
  line(p, x0 + 1, y0, x1 + 1, y1, WOOD[2]);
}

function weaponIcon(b: ItemBase): Pixmap[] {
  const r = ramp4(b.color);
  const p = new Pixmap(16, 16);
  switch (b.id) {
    case 'dagger': sword(p, r, { bx: 7, by: 9, len: 4, guard: 1, grip: 2 }); break;
    case 'short_sword': sword(p, r, { bx: 6, by: 10, len: 5, guard: 2, grip: 2, wide: true }); break;
    case 'long_sword': sword(p, r, { bx: 5, by: 11, len: 7, guard: 2, grip: 2, wide: true }); break;
    case 'greatsword': sword(p, r, { bx: 4, by: 12, len: 9, guard: 3, grip: 2, wide: true }); break;
    case 'mithril_blade': {
      sword(p, r, { bx: 5, by: 11, len: 7, guard: 2, grip: 2, wide: true, guardC: ramp('TnN')[1], pommel: ramp('TnN')[2] });
      dot(p, 13, 2, col('v')); dot(p, 11, 1, col('N')); dot(p, 14, 5, col('N'));
      break;
    }
    case 'rapier': sword(p, r, { bx: 5, by: 11, len: 8, guard: 0, grip: 2, cup: true }); break;
    case 'club': {
      poly(p, [[3, 13], [5, 14.5], [13, 6], [11, 3]], WOOD[1]);
      poly(p, [[8, 8], [12.5, 3.5], [13.4, 6], [10, 9.5]], WOOD[2]);
      dot(p, 12, 4, WOOD[3]); dot(p, 11, 6, WOOD[3]); dot(p, 6, 12, WOOD[0]);
      break;
    }
    case 'quarterstaff': {
      handle(p, 2, 14, 12, 4);
      for (const [x, y] of [[4, 12], [10, 6]] as const) { dot(p, x, y, GOLD[0]); dot(p, x + 1, y, GOLD[0]); }
      dot(p, 13, 3, WOOD[3]);
      break;
    }
    case 'mace': {
      handle(p, 3, 14, 10, 7);
      disc(p, 11.5, 5, 2.8, 2.8, r);
      for (const [x, y] of [[11, 1], [14, 4], [8, 5], [11, 8]] as const) dot(p, x, y, r[3]);
      dot(p, 11, 4, r[3]);
      break;
    }
    case 'axe': {
      handle(p, 3, 14, 11, 6);
      poly(p, [[7, 3.5], [12, 1.5], [14.5, 6], [11, 8.5], [9.5, 5.5]], r[1]);
      poly(p, [[7, 3.5], [12, 1.5], [10.5, 5.2]], r[2]);
      line(p, 12, 1.5, 14.5, 6, r[3]);
      break;
    }
    case 'spear': {
      line(p, 2, 14, 11, 5, WOOD[1]); line(p, 3, 14, 12, 5, WOOD[2]);
      poly(p, [[10.5, 5.8], [11.4, 2.2], [14.8, 1.2], [13.6, 4.8]], r[1]);
      line(p, 11.5, 3, 14, 1.5, r[3]);
      break;
    }
    case 'halberd': {
      handle(p, 2, 14, 11, 5);
      poly(p, [[8, 3], [13, 2.5], [15, 7], [11, 9.5], [10, 6]], r[1]);
      line(p, 13, 2.5, 15, 7, r[3]);
      poly(p, [[11, 5], [13, 1], [14, 0.5], [13, 4]], r[2]);
      break;
    }
    case 'flail': {
      handle(p, 3, 14, 8, 9);
      for (const [x, y] of [[9, 8], [10, 8], [10, 7], [10, 6]] as const) dot(p, x, y, STEEL[1]);
      disc(p, 11.8, 4.4, 2.5, 2.5, ramp('2345'));
      for (const [x, y] of [[11, 1], [14, 3], [9, 4], [13, 7], [11, 7]] as const) dot(p, x, y, STEEL[3]);
      break;
    }
    case 'dart': {
      line(p, 4, 12, 11, 5, WOOD[2]);
      dot(p, 12, 4, r[3]); dot(p, 11, 4, r[2]); dot(p, 12, 5, r[1]);
      for (const [x, y] of [[3, 11], [4, 11], [3, 12], [5, 13], [4, 13]] as const) dot(p, x, y, col('q'));
      break;
    }
    default: sword(p, r, { bx: 6, by: 10, len: 5, guard: 2, grip: 2 });
  }
  return [p.outline()];
}

// ───────────────────────── armas de disparo e munição ─────────────────────────

function launcherIcon(b: ItemBase): Pixmap[] {
  const p = new Pixmap(16, 16);
  const wood = b.id === 'long_bow' ? ramp('cdef') : WOOD;
  if (b.id === 'sling') {
    line(p, 3, 13, 7, 9, WOOD[2]); line(p, 7, 9, 12, 4, WOOD[2]);
    disc(p, 8, 8.4, 2.1, 1.8, ramp('abc'));
    dot(p, 8, 8, col('3')); dot(p, 9, 8, col('4'));
    line(p, 12, 4, 13, 3, WOOD[3]); dot(p, 3, 13, WOOD[0]);
  } else if (b.id === 'crossbow') {
    rect(p, 2, 8, 11, 2, wood[1]); rect(p, 2, 8, 11, 1, wood[2]);
    dot(p, 6, 10, GOLD[1]); dot(p, 6, 11, STEEL[1]);
    poly(p, [[11.5, 2.5], [14.5, 9], [11.5, 15.5], [12.2, 9]], STEEL[1]);
    line(p, 11.5, 2.5, 11.5, 15.5, col('W'));
    line(p, 3, 7, 12, 7, STEEL[3]); dot(p, 13, 7, STEEL[3]);
  } else {
    const big = b.id === 'long_bow';
    const top = big ? 1 : 2, bot = big ? 15 : 14, mid = (top + bot) / 2, half = (bot - top) / 2, bulge = big ? 5 : 4.4;
    for (let y = top; y <= bot; y++) {
      const t = (y - mid) / half;
      const x = 4 + Math.round(bulge * (1 - t * t));
      dot(p, x, y, wood[1]); dot(p, x + 1, y, wood[2]);
    }
    line(p, 4, top, 4, bot, col('W'));
    if (big) { rect(p, 8, 7, 2, 3, GOLD[1]); }
    dot(p, 4, top, wood[3]); dot(p, 4, bot, wood[3]);
  }
  return [p.outline()];
}

function ammoIcon(b: ItemBase): Pixmap[] {
  const p = new Pixmap(16, 16);
  if (b.id === 'stone') {
    disc(p, 5.5, 10.5, 2.4, 2.1, ramp('1234')); disc(p, 10, 9, 2.4, 2.2, ramp('1235')); disc(p, 8, 5.8, 2.2, 2, ramp('1234'));
  } else {
    const bolt = b.id === 'bolt';
    const n = bolt ? 1 : 2;
    for (let k = 0; k < n; k++) {
      const o = k * 3;
      line(p, 3 + o, 13 + (bolt ? 0 : -o * 0), 12 + o, 4 + (bolt ? 0 : -o * 0), WOOD[2]);
      dot(p, 13 + o, 3, STEEL[3]); dot(p, 12 + o, 3, STEEL[2]); dot(p, 13 + o, 4, STEEL[1]);
      dot(p, 3 + o, 12, col(bolt ? 'W' : 'q')); dot(p, 2 + o, 13, col(bolt ? 'W' : 'q')); dot(p, 3 + o, 13, col(bolt ? 'w' : 'R')); dot(p, 4 + o, 13, col(bolt ? 'w' : 'R'));
    }
  }
  return [p.outline()];
}

// ───────────────────────── armaduras ─────────────────────────

function torso(p: Pixmap, r: R4, sleeve: number): void {
  // corpo
  rect(p, 5, 3, 6, 10, r[1]);
  rect(p, 5, 3, 1, 10, r[2]); rect(p, 10, 3, 1, 10, r[0]);
  // mangas / ombros
  const sy = sleeve === 2 ? 11 : sleeve === 1 ? 7 : 5;
  rect(p, 3, 3, 2, sy - 2, r[1]); rect(p, 11, 3, 2, sy - 2, r[1]);
  rect(p, 3, 3, 1, sy - 2, r[2]); rect(p, 12, 3, 1, sy - 2, r[0]);
  // gola
  clear(p, 7, 3); clear(p, 8, 3); dot(p, 7, 4, r[0]); dot(p, 8, 4, r[0]);
  rect(p, 5, 12, 6, 1, r[0]);
}

function armorIcon(b: ItemBase): Pixmap[] {
  const r = ramp4(b.color);
  const p = new Pixmap(16, 16);
  switch (b.id) {
    case 'robe':
      torso(p, r, 2); rect(p, 5, 10, 6, 1, GOLD[1]); line(p, 7, 4, 8, 7, r[0]); dot(p, 8, 6, GOLD[2]);
      rect(p, 4, 13, 8, 1, r[0]);
      break;
    case 'leather_armor':
      torso(p, r, 1);
      line(p, 7, 5, 7, 11, WOOD[0]); line(p, 8, 5, 8, 11, WOOD[0]);
      for (const y of [6, 8, 10]) dot(p, 6, y, WOOD[3]);
      break;
    case 'studded_leather':
      torso(p, r, 1);
      for (const [x, y] of [[6, 5], [9, 5], [6, 8], [9, 8], [6, 11], [9, 11], [4, 4], [11, 4], [7, 6], [8, 9]] as const) dot(p, x, y, STEEL[3]);
      break;
    case 'scale_mail':
      torso(p, r, 1);
      for (let y = 4; y <= 11; y += 2) for (let x = 5 + (y % 4 === 0 ? 0 : 1); x <= 10; x += 2) { dot(p, x, y, r[3]); dot(p, x, y + 1, r[0]); }
      break;
    case 'chain_mail':
      torso(p, r, 1);
      for (let y = 4; y <= 12; y++) for (let x = 5; x <= 10; x++) if ((x + y) % 2 === 0) dot(p, x, y, r[3]);
      rect(p, 5, 12, 6, 1, r[0]);
      break;
    case 'half_plate':
      torso(p, r, 0);
      rect(p, 6, 5, 4, 4, r[2]); line(p, 6, 9, 9, 9, r[0]); rect(p, 6, 10, 4, 2, r[1]);
      dot(p, 7, 6, r[3]); dot(p, 3, 3, r[3]); dot(p, 12, 3, r[3]);
      break;
    case 'plate_mail':
      torso(p, r, 0);
      disc(p, 3.5, 4, 2.4, 2, ramp('456v')); disc(p, 12.5, 4, 2.4, 2, ramp('456v'));
      rect(p, 6, 5, 4, 3, r[2]); rect(p, 6, 9, 4, 3, r[2]); line(p, 6, 8, 9, 8, r[0]);
      dot(p, 7, 6, r[3]); dot(p, 3, 3, r[3]); dot(p, 12, 3, r[3]); rect(p, 5, 13, 6, 1, GOLD[1]);
      break;
    case 'mithril_mail':
      torso(p, r, 1);
      for (let y = 4; y <= 12; y++) for (let x = 5; x <= 10; x++) if ((x + y) % 2 === 0) dot(p, x, y, r[3]);
      dot(p, 4, 3, col('v')); dot(p, 11, 5, col('N')); dot(p, 7, 12, col('v'));
      break;
    default: torso(p, r, 1);
  }
  return [p.outline()];
}

function shieldIcon(b: ItemBase): Pixmap[] {
  const p = new Pixmap(16, 16);
  if (b.id === 'small_shield') {
    disc(p, 8, 8.5, 5.4, 5.4, ramp('bcde'));
    for (let a = 0; a < 24; a++) dot(p, 8 + Math.cos((a / 24) * 6.283) * 5, 8.5 + Math.sin((a / 24) * 6.283) * 5, STEEL[1]);
    disc(p, 8, 8.5, 1.7, 1.7, ramp('3456'));
    line(p, 3, 8.5, 13, 8.5, WOOD[0]);
  } else {
    poly(p, [[3, 2.5], [13, 2.5], [13, 8], [8, 14.5], [3, 8]], STEEL[1]);
    poly(p, [[3, 2.5], [8, 2.5], [8, 14.5], [3, 8]], STEEL[2]);
    line(p, 3, 2.5, 13, 2.5, STEEL[3]); line(p, 3, 3, 3, 8, STEEL[3]);
    line(p, 13, 3, 13, 8, STEEL[0]); line(p, 12, 9, 8, 14, STEEL[0]);
    rect(p, 7, 4, 2, 8, col('R')); rect(p, 5, 6, 6, 2, col('R')); dot(p, 7, 6, col('q'));
  }
  return [p.outline()];
}

function wearIcon(b: ItemBase): Pixmap[] {
  const r = ramp4(b.color);
  const p = new Pixmap(16, 16);
  switch (b.category) {
    case 'helm':
      if (b.id === 'iron_helm') {
        disc(p, 8, 8.2, 5, 4.6, ramp('2456'), { clipY: [0, 12] });
        rect(p, 3, 10, 10, 3, r[1]); rect(p, 6, 8, 4, 3, col('K')); rect(p, 7, 8, 2, 1, col('k'));
        line(p, 8, 3, 8, 12, r[3]); dot(p, 8, 2, col('q')); dot(p, 8, 1, col('Q'));
      } else {
        disc(p, 8, 9, 4.8, 4.4, ramp('bcde'), { clipY: [0, 12] });
        rect(p, 3, 11, 10, 2, WOOD[1]); rect(p, 3, 11, 10, 1, WOOD[2]); dot(p, 8, 5, WOOD[3]);
      }
      break;
    case 'gloves':
      rect(p, 5, 3, 6, 3, r[1]); rect(p, 5, 3, 6, 1, r[2]);
      rect(p, 5, 6, 6, 6, r[1]); for (const x of [5, 7, 9]) { rect(p, x, 12, 2, 2, r[1]); dot(p, x, 12, r[2]); }
      rect(p, 3, 8, 2, 4, r[1]); dot(p, 3, 8, r[2]); line(p, 6, 7, 10, 7, r[0]);
      break;
    case 'boots':
      for (const dx of [0, 7]) {
        rect(p, 2 + dx, 3, 4, 8, r[1]); rect(p, 2 + dx, 3, 1, 8, r[2]);
        rect(p, 2 + dx, 11, 6, 3, r[1]); rect(p, 2 + dx, 11, 6, 1, r[2]); rect(p, 2 + dx, 13, 6, 1, r[0]);
        rect(p, 2 + dx, 3, 4, 1, r[3]);
      }
      break;
    default: // capa
      poly(p, [[6, 2], [10, 2], [13.5, 13.5], [2.5, 13.5]], r[1]);
      poly(p, [[6, 2], [8, 2], [8, 13.5], [2.5, 13.5]], r[2]);
      line(p, 10, 3, 12, 13, r[0]); line(p, 5, 5, 4, 13, r[0]); line(p, 8, 5, 8, 13, r[0]);
      rect(p, 6, 2, 4, 2, r[0]); dot(p, 8, 4, GOLD[2]); dot(p, 7, 4, GOLD[1]);
  }
  return [p.outline()];
}

// ───────────────────────── luz, comida e consumíveis ─────────────────────────

function lightIcon(b: ItemBase): Pixmap[] {
  const mk = (f: number): Pixmap => {
    const p = new Pixmap(16, 16);
    if (b.id === 'torch') {
      line(p, 4, 14, 9, 8, WOOD[1]); line(p, 5, 14, 10, 8, WOOD[2]); rect(p, 8, 7, 3, 2, col('3'));
      const fl = f ? [[10, 6], [9, 5], [10, 4], [11, 3], [12, 5]] : [[10, 6], [11, 5], [10, 4], [9, 3], [8, 5]];
      poly(p, [[8, 7], [9.5, 3.5 - f], [12, 7]], col('O'));
      poly(p, [[9, 7], [10, 4.8 - f], [11, 7]], col('y'));
      dot(p, 10, 6, col('Y'));
      for (const [x, y] of fl) if (!p.alpha(x, y)) dot(p, x, y, col('o'));
    } else {
      rect(p, 5, 6, 6, 7, col('2')); rect(p, 6, 7, 4, 5, col('o'));
      rect(p, 7, 8, 2, 3, col(f ? 'Y' : 'y'));
      rect(p, 4, 12, 8, 2, col('d')); rect(p, 5, 5, 6, 1, col('d'));
      line(p, 6, 4, 8, 2, col('3')); line(p, 8, 2, 10, 4, col('3'));
      for (const x of [5, 10]) line(p, x, 6, x, 12, col('3'));
    }
    return p.outline();
  };
  return [mk(0), mk(1)];
}

function foodIcon(b: ItemBase): Pixmap[] {
  const p = new Pixmap(16, 16);
  if (b.id === 'apple') {
    disc(p, 8, 9.3, 4.6, 4.4, ramp('RRqQ'));
    dot(p, 6, 7, col('Q')); dot(p, 6, 8, col('Q')); line(p, 8, 5, 9, 3, WOOD[1]); poly(p, [[9, 4], [12, 2.5], [11, 5]], col('l'));
  } else if (b.id === 'elven_bread') {
    disc(p, 8, 9.6, 5.8, 3.6, ramp('cdef'));
    for (const x of [5, 8, 11]) line(p, x, 7, x + 1, 9, col('c'));
    poly(p, [[10, 5], [14, 3.5], [12, 6.5]], col('L')); dot(p, 11, 5, col('l'));
  } else {
    // ração de viagem: trouxinha de pano amarrada com cordão, com um naco de carne seca aparecendo
    const cloth = ramp('WwvW');
    disc(p, 8, 10.8, 5.4, 4, cloth);
    poly(p, [[5, 7.4], [8, 3.8], [11, 7.4]], cloth[1]);
    rect(p, 5, 7, 6, 1, WOOD[2]);
    dot(p, 8, 5, WOOD[1]); dot(p, 8, 6, WOOD[1]);
    line(p, 5, 11, 11, 11, col('v'));
    line(p, 6, 9, 6, 13, col('v'));
    poly(p, [[10, 10], [14, 7], [15, 9], [11.5, 12.5]], col('R'));
    line(p, 11, 10, 14, 8, col('q'));
    dot(p, 14, 9, col('Q'));
  }
  return [p.outline()];
}

function potionIcon(b: ItemBase, variant: number): Pixmap[] {
  return potionIconC(b.color, variant);
}

function potionIconC(color: Color, variant: number): Pixmap[] {
  const r = ramp4(color);
  const mk = (f: number): Pixmap => {
    const p = new Pixmap(16, 16);
    const tall = variant % 2 === 1;
    const cy = tall ? 10 : 10.4;
    // vidro
    rect(p, 7, 4, 2, 3, col('W'));
    rect(p, 6, 3, 4, 1, col('w'));
    disc(p, 8, cy, tall ? 3.2 : 4.4, tall ? 4.6 : 3.9, [r[0], r[1], r[2], r[3]]);
    // líquido: nível
    rect(p, 6, 6, 4, 1, r[1]);
    // rolha
    rect(p, 7, 2, 2, 2, col('c')); dot(p, 7, 2, col('d'));
    // brilho do vidro
    dot(p, tall ? 6 : 5, 9, col('v')); dot(p, tall ? 6 : 5, 10, col('v'));
    if (f) dot(p, 10, 8, col('v'));
    return p.outline();
  };
  return [mk(0), mk(1)];
}

function scrollIcon(): Pixmap[] {
  const p = new Pixmap(16, 16);
  rect(p, 4, 4, 8, 9, col('W')); rect(p, 4, 4, 8, 1, col('v')); rect(p, 11, 4, 1, 9, col('w'));
  disc(p, 8, 4, 4.6, 1.5, ramp('wWvW')); disc(p, 8, 13, 4.6, 1.5, ramp('wWvW'));
  for (const y of [6, 11]) line(p, 5, y, 10, y, col('w'));
  rect(p, 4, 8, 8, 2, col('R')); rect(p, 4, 8, 8, 1, col('q'));
  disc(p, 8, 9, 1.9, 1.7, ramp('rRqQ')); dot(p, 7, 8, col('Q'));
  return [p.outline()];
}

function wandIcon(b: ItemBase, shaft?: Color): Pixmap[] {
  // Pela aparência: a haste tem a cor do material e a ponta é neutra (não revela o efeito).
  const r = shaft ? ramp('456v') as R4 : ramp4(b.color);
  const s = shaft ? ramp4(shaft) : WOOD;
  const mk = (f: number): Pixmap => {
    const p = new Pixmap(16, 16);
    line(p, 3, 13, 10, 6, s[1]); line(p, 4, 13, 11, 6, s[2]);
    dot(p, 5, 11, GOLD[2]); dot(p, 6, 10, GOLD[2]);
    disc(p, 12, 4.4, 2, 2, r);
    dot(p, 11, 3, r[3]);
    const sp: [number, number][] = f ? [[14, 1], [9, 3], [15, 6]] : [[10, 1], [14, 3], [13, 7]];
    sp.forEach(([x, y]) => dot(p, x, y, r[3]));
    return p.outline();
  };
  return [mk(0), mk(1)];
}

function ringIcon(b: ItemBase): Pixmap[] {
  return ringIconC(b.color, 'gold');
}

/** Anel: aro (ouro, metal ou osso) e, se houver, uma pedra da cor `gem`. */
function ringIconC(gem: Color | null, band: 'gold' | Color): Pixmap[] {
  const p = new Pixmap(16, 16);
  disc(p, 8, 9.5, 5, 4.6, band === 'gold' ? ramp('dxyY') : ramp4(band));
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + 0.5 - 8) ** 2 / 2.9 ** 2 + (y + 0.5 - 9.8) ** 2 / 2.6 ** 2 <= 1) clear(p, x, y);
  if (gem) {
    const r = ramp4(gem);
    disc(p, 8, 4.8, 2.2, 2.2, r);
    dot(p, 7, 4, r[3]);
  }
  return [p.outline()];
}

function amuletIcon(b: ItemBase): Pixmap[] {
  return amuletIconC(b.color);
}

function amuletIconC(color: Color): Pixmap[] {
  const r = ramp4(color);
  const p = new Pixmap(16, 16);
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    dot(p, 2 + 12 * t, 1 + 8 * Math.sin(t * Math.PI) * 0.9, GOLD[1]);
  }
  line(p, 8, 8, 8, 9, GOLD[1]);
  disc(p, 8, 11.4, 2.9, 3.1, ramp('dxyx'));
  disc(p, 8, 11.4, 1.9, 2.1, r);
  dot(p, 7, 10, r[3]);
  return [p.outline()];
}

function bookIcon(b: ItemBase): Pixmap[] {
  const r = ramp4(b.color);
  const p = new Pixmap(16, 16);
  rect(p, 4, 3, 8, 10, r[1]); rect(p, 4, 3, 2, 10, r[0]); rect(p, 5, 3, 7, 1, r[2]);
  rect(p, 12, 4, 1, 8, col('W')); rect(p, 11, 4, 1, 8, col('v')); rect(p, 4, 12, 9, 1, r[0]);
  if (b.id === 'tome_divine') { rect(p, 8, 5, 1, 5, GOLD[2]); rect(p, 7, 6, 3, 1, GOLD[2]); }
  else { poly(p, [[8.5, 5], [9.6, 7.4], [8.5, 9.8], [7.4, 7.4]], GOLD[2]); dot(p, 8, 7, col('Y')); }
  rect(p, 4, 5, 2, 1, GOLD[1]); rect(p, 4, 10, 2, 1, GOLD[1]);
  return [p.outline()];
}

function goldIcon(): Pixmap[] {
  const p = new Pixmap(16, 16);
  const coin = (x: number, y: number): void => {
    disc(p, x, y, 2.9, 1.5, ramp('dxyY'));
    line(p, x - 2, y, x + 2, y, GOLD[0]);
    dot(p, x - 1, y - 1, GOLD[3]);
  };
  coin(5.5, 11.5); coin(10.5, 11.8); coin(8, 9.2); coin(6, 7.6); coin(10, 7.2);
  dot(p, 8, 5, col('Y')); dot(p, 12, 5, col('Y'));
  return [p.outline(), (() => { const q = p.clone(); dot(q, 8, 5, col('v')); dot(q, 3, 8, col('Y')); dot(q, 13, 9, col('v')); return q.outline(); })()];
}

export function corpseIcon(c: Color): Pixmap[] {
  const r = ramp4(c).map((x) => mix(x, col('k'), 0.4)) as R4;
  const p = new Pixmap(16, 16);
  disc(p, 8, 12, 6.4, 2.2, ramp('rrRr'));
  disc(p, 7.4, 10.8, 4.4, 2.6, r);
  disc(p, 12.2, 10.2, 2.2, 2, r);
  dot(p, 13, 9, col('K')); dot(p, 12, 9, col('K'));
  line(p, 3, 9, 1, 11, r[0]); line(p, 5, 12, 4, 14, r[0]); line(p, 9, 12, 10, 14, r[0]);
  dot(p, 6, 9, col('q')); dot(p, 7, 9, col('R'));
  return [p.outline()];
}

function artifactIcon(): Pixmap[] {
  const mk = (f: number): Pixmap => {
    const p = new Pixmap(16, 16);
    const r = ramp(f ? 'PmMv' : 'pPmM');
    // coração cristalino
    disc(p, 5.6, 6.2, 3.3, 3, r); disc(p, 10.4, 6.2, 3.3, 3, r);
    poly(p, [[2.6, 7.2], [13.4, 7.2], [8, 14.4]], r[1]);
    poly(p, [[3, 7.4], [8, 7.4], [8, 14.2]], r[2]);
    dot(p, 5, 5, r[3]); dot(p, 4, 6, r[3]); dot(p, 6, 5, r[3]);
    line(p, 8, 7, 8, 13, col('m'));
    const sp: [number, number][] = f ? [[1, 3], [14, 2], [15, 9], [2, 12]] : [[2, 2], [13, 3], [14, 11], [1, 9]];
    sp.forEach(([x, y]) => dot(p, x, y, col('M')));
    return p.outline();
  };
  return [mk(0), mk(1)];
}

// ───────────────────────── tabela por item ─────────────────────────

export function itemIcon(b: ItemBase): Pixmap[] {
  switch (b.category) {
    case 'weapon': return weaponIcon(b);
    case 'launcher': return launcherIcon(b);
    case 'ammo': return ammoIcon(b);
    case 'armor': return armorIcon(b);
    case 'shield': return shieldIcon(b);
    case 'helm': case 'gloves': case 'boots': case 'cloak': return wearIcon(b);
    case 'light': return lightIcon(b);
    case 'food': return foodIcon(b);
    case 'potion': return potionIcon(b, ITEMS.filter((x) => x.category === 'potion').findIndex((x) => x.id === b.id));
    case 'scroll': return scrollIcon();
    case 'wand': return wandIcon(b);
    case 'ring': return ringIcon(b);
    case 'amulet': return amuletIcon(b);
    case 'book': return bookIcon(b);
    case 'gold': return goldIcon();
    case 'corpse': return corpseIcon(b.color);
    case 'artifact': return artifactIcon();
  }
}

/** Anéis de metal ou osso não têm pedra: o aro inteiro é do material. */
const RING_BANDS: Record<string, Color> = { 'de ferro': 'darkGray', 'de ouro': 'gold', 'de prata': 'lightGray', 'de osso': 'white' };

/** Ícone de um item pela aparência sorteada na partida (o que o jogador vê antes de identificar). */
export function lookIcon(cat: LookCategory, look: string): Pixmap[] {
  const color = LOOK_COLORS[cat][look] ?? 'lightGray';
  switch (cat) {
    case 'potion': return potionIconC(color, LOOKS.potion.indexOf(look));
    case 'wand': return wandIcon(ITEMS.find((x) => x.category === 'wand')!, color);
    case 'ring': return RING_BANDS[look] ? ringIconC(null, RING_BANDS[look] === 'gold' ? 'gold' : RING_BANDS[look]) : ringIconC(color, 'gold');
    case 'amulet': return amuletIconC(color);
  }
}

/** Todos os ícones por id de item. */
export function allItemIcons(): Record<string, Pixmap[]> {
  const out: Record<string, Pixmap[]> = {};
  for (const b of ITEMS) out[b.id] = itemIcon(b);
  return out;
}

export const ALL_COLORS = COLOR_NAMES;
