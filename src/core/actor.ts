import type { Color } from '../engine/colors';

/** Energia necessária para agir. Uma ação normal custa isso. */
export const ACTION_COST = 100;
/** Velocidade normal: ganha 100 de energia por tick (1 ação por turno). */
export const NORMAL_SPEED = 100;

/** Qualquer criatura do jogo: o jogador e os monstros usam a mesma estrutura. */
export interface Actor {
  id: number;
  /** Id do modelo em data/monsters.ts ('player' para o jogador). */
  templateId: string;
  name: string;
  glyph: string;
  color: Color;
  x: number;
  y: number;
  isPlayer: boolean;
  speed: number;
  energy: number;
}

export function createActor(id: number, props: Partial<Actor> & Pick<Actor, 'templateId' | 'name' | 'glyph' | 'color'>): Actor {
  return {
    id,
    x: 0,
    y: 0,
    isPlayer: false,
    speed: NORMAL_SPEED,
    energy: 0,
    ...props,
  };
}
