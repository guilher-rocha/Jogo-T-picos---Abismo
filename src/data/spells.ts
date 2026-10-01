import type { Color } from '../engine/colors';
import type { Element } from '../core/actor';

export type SpellSchool = 'arcane' | 'divine';

/** Forma do efeito: em si mesmo, projétil (para no 1º alvo), raio (atravessa), bola (explode em área). */
export type SpellShape = 'self' | 'bolt' | 'beam' | 'ball';

export type SpellEffect = 'damage' | 'heal' | 'teleport' | 'blink' | 'detect' | 'mapping' | 'slow' | 'sleep' | 'fear' | 'shield' | 'haste' | 'cure' | 'dig';

export interface SpellDef {
  id: string;
  name: string;
  school: SpellSchool;
  /** Nível mínimo do conjurador para aprender. */
  level: number;
  cost: number;
  shape: SpellShape;
  effect: SpellEffect;
  element?: Element;
  /** Dano/cura base; soma +1 a cada `perLevel` níveis do conjurador. */
  power?: string;
  perLevel?: number;
  radius?: number;
  range?: number;
  /** Duração (turnos) para efeitos temporários. */
  duration?: string;
  /** Chance de falha base (%). */
  fail: number;
  color: Color;
  desc: string;
  /** Gerada proceduralmente (tomos raros). */
  generated?: boolean;
}

export const SPELLS: SpellDef[] = [
  { id: 'magic_missile', name: 'Míssil Mágico', school: 'arcane', level: 1, cost: 2, shape: 'bolt', effect: 'damage', element: 'arcane',
    power: '2d4', perLevel: 2, range: 10, fail: 22, color: 'lightMagenta', desc: 'Um dardo de energia pura que nunca erra.' },
  { id: 'cure_light', name: 'Cura Leve', school: 'divine', level: 1, cost: 3, shape: 'self', effect: 'heal',
    power: '2d6', perLevel: 1, fail: 20, color: 'lightGreen', desc: 'Fecha ferimentos leves.' },
];

export function spellById(id: string): SpellDef | undefined {
  return SPELLS.find((s) => s.id === id);
}

/** Magias iniciais por classe. */
export const STARTING_SPELLS: Record<string, string[]> = {
  mage: ['magic_missile'],
  cleric: ['cure_light'],
  ranger: [],
};
