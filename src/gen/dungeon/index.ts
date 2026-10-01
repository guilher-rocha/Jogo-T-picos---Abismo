import type { RNG } from '../../engine/rng';
import type { GeneratedLevel } from './common';
import { isFullyConnected } from './common';
import { generateRogueLevel } from './rogue';
import { generateBspLevel } from './bsp';
import { generateCaveLevel } from './caves';
import type { GeneratorId } from '../../data/themes';
import { themeForDepth } from '../../data/themes';

export type { GeneratedLevel, Room } from './common';

const GENERATORS: Record<GeneratorId, (rng: RNG, depth: number) => GeneratedLevel> = {
  rogue: generateRogueLevel,
  bsp: generateBspLevel,
  caves: generateCaveLevel,
};

/** Gera o terreno de um andar com um gerador sorteado pelo tema da profundidade. */
export function generateDungeon(rng: RNG, depth: number, forced?: GeneratorId): GeneratedLevel & { generator: GeneratorId } {
  const generator = forced ?? rng.weighted(themeForDepth(depth).generators);
  for (let attempt = 0; attempt < 20; attempt++) {
    const level = GENERATORS[generator](rng, depth);
    if (isFullyConnected(level.map, level.up)) return { ...level, generator };
  }
  throw new Error(`Não foi possível gerar um andar conectado (${generator})`);
}
