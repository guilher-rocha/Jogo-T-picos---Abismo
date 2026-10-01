import type { Color } from '../engine/colors';
import type { Point } from './map';
import type { StatusEffect } from './status';
import type { Item } from './item';

/** Energia necessária para agir. Uma ação normal custa isso. */
export const ACTION_COST = 100;
/** Velocidade normal: ganha 100 de energia por tick (1 ação por turno). */
export const NORMAL_SPEED = 100;

export type Gender = 'm' | 'f';

export type Element = 'physical' | 'fire' | 'cold' | 'lightning' | 'acid' | 'poison' | 'holy' | 'shadow' | 'arcane';

/** Efeito extra de um ataque (veneno, dreno, roubo...). */
export interface AttackEffect {
  status: string;
  /** Chance (%) de aplicar. */
  chance: number;
  duration?: string;
}

/** Um ataque natural ou de arma. */
export interface Attack {
  /** Verbo na 3ª pessoa: "morde", "arranha", "acerta". */
  verb: string;
  damage: string;
  element?: Element;
  effect?: AttackEffect;
}

export type AiState = 'sleeping' | 'wandering' | 'hunting' | 'fleeing';

export interface AiMemory {
  state: AiState;
  /** Última posição conhecida do jogador. */
  lastSeen?: Point;
  /** Turnos desde a última vez que viu o jogador. */
  lostTurns: number;
  /** Destino de passeio. */
  wanderTarget?: Point;
  /** Foge até este turno (medo, Expulsar Mortos-vivos). */
  fleeUntil?: number;
}

/** Qualquer criatura do jogo: o jogador e os monstros usam a mesma estrutura. */
export interface Actor {
  id: number;
  /** Id do modelo em data/monsters.ts ('player' para o jogador). */
  templateId: string;
  name: string;
  gender: Gender;
  glyph: string;
  color: Color;
  x: number;
  y: number;
  isPlayer: boolean;
  speed: number;
  energy: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  /** Nível (monstros: do modelo; jogador: do herói). */
  level: number;
  /** Raio de luz/visão (só o jogador usa). */
  light: number;
  /** Bônus de acerto. */
  accuracy: number;
  /** Classe de armadura (dificulta ser acertado). */
  defense: number;
  attacks: Attack[];
  /** XP que o monstro concede ao morrer. */
  xpValue: number;
  ai: AiMemory;
  flags: string[];
  /** Resistências elementais em % (50 = metade do dano, 100 = imune). */
  resist?: Partial<Record<Element, number>>;
  /** Efeitos de status ativos (veneno, confusão, acelerado...). */
  effects?: StatusEffect[];
  /** Itens roubados/carregados por um monstro (caem quando ele morre). */
  loot?: Item[];
}

export function createActor(id: number, props: Partial<Actor> & Pick<Actor, 'templateId' | 'name' | 'glyph' | 'color'>): Actor {
  return {
    id,
    gender: 'm',
    x: 0,
    y: 0,
    isPlayer: false,
    speed: NORMAL_SPEED,
    energy: 0,
    hp: 1,
    maxHp: 1,
    mp: 0,
    maxMp: 0,
    level: 1,
    light: 0,
    accuracy: 0,
    defense: 0,
    attacks: [{ verb: 'acerta', damage: '1d2' }],
    xpValue: 0,
    ai: { state: 'wandering', lostTurns: 0 },
    flags: [],
    ...props,
  };
}

export function hasFlag(a: Actor, flag: string): boolean {
  return a.flags.includes(flag);
}
