import type { PixelPalette } from './pixmap';

/**
 * Paleta mestra do pixel art ("Dark Dungeon"): tons frios e dessaturados no cenário,
 * com acentos quentes (tochas, ouro, sangue) como nas imagens de referência.
 *
 * Cada letra é uma cor; letras da mesma família formam uma rampa do escuro para o claro:
 *   1-6  aço/pedra azulada      a-f  madeira/couro/pelo      s S z  pele (clara, média, sombra)
 *   g G l L  verde (da folhagem ao limo)                     r R q Q  vermelho
 *   o O y Y  laranja → amarelo (fogo, ouro)                  u U i I  azul
 *   p P m M  roxo/arcano                                     w W v  osso/branco
 *   t T n N  azul-petróleo (a borda luminosa das paredes)    k K 0  contornos e sombras
 */
export const PAL: PixelPalette = {
  k: '#17131f', K: '#0b0910', '0': '#0e0c15',
  '1': '#262a3c', '2': '#394058', '3': '#505a78', '4': '#7080a0', '5': '#9eb0c8', '6': '#d0dceb',
  a: '#2a1812', b: '#46281a', c: '#6a4026', d: '#92602c', e: '#bc8844', f: '#e2b46c',
  s: '#f2cfa6', S: '#d19a72', z: '#9e6648',
  g: '#1f4a2a', G: '#2f7a3a', l: '#56ae4c', L: '#98dc70',
  r: '#561822', R: '#a22a30', q: '#d84a3e', Q: '#f48a68',
  o: '#c2521c', O: '#f08c2c', y: '#fcc444', Y: '#fff0a0',
  u: '#1e3668', U: '#3a68b4', i: '#64a4e6', I: '#b4deff',
  p: '#3a2472', P: '#6c44ac', m: '#a874dc', M: '#e0bcfc',
  w: '#a89e84', W: '#d8ceb0', v: '#f6f0e0',
  t: '#24606c', T: '#40a0aa', n: '#7cd4d8', N: '#c0f4f0',
  // extras: cabelo, ouro fosco, pele de orc/oliva, de zumbi e de ogro
  h: '#6a4027', H: '#46281b', x: '#e0b040',
  j: '#7a8a52', J: '#4e5c36', X: '#a8b878',
  Z: '#8a9a88', A: '#5c6a60', B: '#b8c8b4',
  D: '#8a5238', E: '#c08a62', F: '#5e3626',
};

/** Cores de efeitos e luzes (CSS), por nome de cor do jogo. */
export const GLOW: Record<string, string> = {
  fire: '#ff8a2a', cold: '#7fd8ff', lightning: '#fff27a', acid: '#9cff5a', poison: '#7ad65a',
  holy: '#fff2b0', shadow: '#a060e0', arcane: '#e08aff', physical: '#ffe9c0', heal: '#6dff9a', blood: '#d0283a',
};
