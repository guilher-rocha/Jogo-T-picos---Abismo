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
  // ── Arcanas (Inteligência) ───────────────────────────────────────
  { id: 'magic_missile', name: 'Míssil Mágico', school: 'arcane', level: 1, cost: 2, shape: 'bolt', effect: 'damage', element: 'arcane',
    power: '2d4', perLevel: 2, range: 10, fail: 22, color: 'lightMagenta', desc: 'Um dardo de energia pura.' },
  { id: 'detect_monsters', name: 'Detectar Criaturas', school: 'arcane', level: 2, cost: 2, shape: 'self', effect: 'detect',
    fail: 20, color: 'lightGreen', desc: 'Sente todas as criaturas do andar por um tempo.' },
  { id: 'blink', name: 'Piscar', school: 'arcane', level: 3, cost: 3, shape: 'self', effect: 'blink',
    fail: 25, color: 'lightMagenta', desc: 'Teleporte curto para perto.' },
  { id: 'sleep', name: 'Sono', school: 'arcane', level: 4, cost: 3, shape: 'bolt', effect: 'sleep', range: 10,
    fail: 25, color: 'lightBlue', desc: 'Faz um monstro adormecer.' },
  { id: 'frost_bolt', name: 'Raio Congelante', school: 'arcane', level: 5, cost: 5, shape: 'bolt', effect: 'damage', element: 'cold',
    power: '4d6', perLevel: 1, range: 10, fail: 30, color: 'lightCyan', desc: 'Um projétil de gelo.' },
  { id: 'arcane_shield', name: 'Escudo Arcano', school: 'arcane', level: 6, cost: 5, shape: 'self', effect: 'shield',
    fail: 30, color: 'lightBlue', desc: 'Aumenta a defesa por um tempo.' },
  { id: 'lightning', name: 'Relâmpago', school: 'arcane', level: 8, cost: 7, shape: 'beam', effect: 'damage', element: 'lightning',
    power: '5d6', perLevel: 1, range: 12, fail: 35, color: 'yellow', desc: 'Um raio que atravessa todos no caminho.' },
  { id: 'haste_self', name: 'Aceleração', school: 'arcane', level: 10, cost: 9, shape: 'self', effect: 'haste',
    fail: 40, color: 'yellow', desc: 'Você age 50% mais rápido por um tempo.' },
  { id: 'fireball', name: 'Bola de Fogo', school: 'arcane', level: 11, cost: 11, shape: 'ball', effect: 'damage', element: 'fire',
    power: '6d6', perLevel: 1, radius: 2, range: 10, fail: 40, color: 'orange', desc: 'Uma explosão de chamas em área.' },
  { id: 'teleport_self', name: 'Teleporte', school: 'arcane', level: 13, cost: 9, shape: 'self', effect: 'teleport',
    fail: 40, color: 'lightMagenta', desc: 'Leva você a um ponto distante do andar.' },
  { id: 'magic_mapping', name: 'Clarividência', school: 'arcane', level: 15, cost: 10, shape: 'self', effect: 'mapping',
    fail: 45, color: 'lightCyan', desc: 'Revela a planta do andar.' },

  // ── Divinas (Sabedoria) ──────────────────────────────────────────
  { id: 'cure_light', name: 'Cura Leve', school: 'divine', level: 1, cost: 3, shape: 'self', effect: 'heal',
    power: '2d6', perLevel: 1, fail: 20, color: 'lightGreen', desc: 'Fecha ferimentos leves.' },
  { id: 'bless', name: 'Bênção', school: 'divine', level: 2, cost: 3, shape: 'self', effect: 'shield',
    duration: '2d10+15', fail: 20, color: 'white', desc: 'Uma proteção divina (+defesa).' },
  { id: 'purify', name: 'Purificar', school: 'divine', level: 3, cost: 4, shape: 'self', effect: 'cure',
    fail: 25, color: 'lightGreen', desc: 'Cura veneno, confusão e cegueira.' },
  { id: 'holy_light', name: 'Luz Sagrada', school: 'divine', level: 4, cost: 5, shape: 'ball', effect: 'damage', element: 'holy',
    power: '3d6', perLevel: 2, radius: 1, range: 8, fail: 28, color: 'white', desc: 'Explosão de luz (dobro contra mortos-vivos).' },
  { id: 'word_of_fear', name: 'Palavra do Medo', school: 'divine', level: 5, cost: 4, shape: 'bolt', effect: 'fear', range: 8,
    fail: 28, color: 'lightGray', desc: 'Um monstro foge apavorado.' },
  { id: 'cure_serious', name: 'Cura Séria', school: 'divine', level: 7, cost: 7, shape: 'self', effect: 'heal',
    power: '4d8', perLevel: 1, fail: 30, color: 'lightGreen', desc: 'Cura ferimentos graves.' },
  { id: 'smite', name: 'Castigo Divino', school: 'divine', level: 9, cost: 8, shape: 'bolt', effect: 'damage', element: 'holy',
    power: '6d6', perLevel: 1, range: 10, fail: 35, color: 'yellow', desc: 'A fúria dos deuses num único golpe.' },
  { id: 'divine_sight', name: 'Visão Divina', school: 'divine', level: 11, cost: 8, shape: 'self', effect: 'mapping',
    fail: 35, color: 'white', desc: 'Os deuses mostram o caminho (planta do andar).' },
  { id: 'heal', name: 'Cura Maior', school: 'divine', level: 13, cost: 12, shape: 'self', effect: 'heal',
    power: '8d8', perLevel: 1, fail: 40, color: 'lightGreen', desc: 'Cura quase todos os ferimentos.' },
  { id: 'holy_storm', name: 'Tempestade Sagrada', school: 'divine', level: 16, cost: 16, shape: 'ball', effect: 'damage', element: 'holy',
    power: '8d6', perLevel: 1, radius: 3, range: 10, fail: 45, color: 'white', desc: 'Uma tempestade de luz devastadora.' },
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

/**
 * Magias que cada classe aprende sozinha ao subir de nível (escola + nível máximo de magia).
 * Tomos ensinam as demais e as magias procedurais.
 */
export const CLASS_SPELL_PROGRESSION: Record<string, { school: SpellSchool; maxSpellLevel: number; every: number }> = {
  mage: { school: 'arcane', maxSpellLevel: 30, every: 1 },
  cleric: { school: 'divine', maxSpellLevel: 30, every: 1 },
  ranger: { school: 'divine', maxSpellLevel: 5, every: 2 },
};
