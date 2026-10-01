import type { Color } from '../engine/colors';

/** Qualquer criatura do jogo: o jogador e os monstros usam a mesma estrutura. */
export interface Actor {
  id: number;
  name: string;
  glyph: string;
  color: Color;
  x: number;
  y: number;
  isPlayer: boolean;
}
