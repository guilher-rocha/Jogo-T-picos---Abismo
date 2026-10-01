import type { RNG } from '../../engine/rng';
import type { GeneratedLevel } from './common';
import { isFullyConnected } from './common';
import { generateRogueLevel } from './rogue';

export type { GeneratedLevel, Room } from './common';

/** Gera o terreno de um andar. Tenta de novo se (por azar) sair desconectado. */
export function generateDungeon(rng: RNG, depth: number): GeneratedLevel {
  for (let attempt = 0; attempt < 20; attempt++) {
    const level = generateRogueLevel(rng, depth);
    if (isFullyConnected(level.map, level.up)) return level;
  }
  throw new Error('Não foi possível gerar um andar conectado');
}
