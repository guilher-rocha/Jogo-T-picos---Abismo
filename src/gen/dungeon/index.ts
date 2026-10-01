import type { RNG } from '../../engine/rng';
import type { GeneratedLevel } from './common';
import { bfsDistances, isFullyConnected } from './common';
import { Tile } from '../../data/tiles';
import { idx } from '../../core/map';

/**
 * Se a escada de descida só é alcançável passando por uma porta secreta,
 * transforma as portas secretas em portas comuns (o jogador nunca fica preso).
 */
function ensureOpenPath(level: GeneratedLevel): void {
  const { map } = level;
  const secret = map.tiles.map((t, i) => (t === Tile.SecretDoor ? i : -1)).filter((i) => i >= 0);
  if (!secret.length) return;
  for (const i of secret) map.tiles[i] = Tile.Wall;
  const reachable = bfsDistances(map, level.up)[idx(map, level.down.x, level.down.y)] >= 0;
  for (const i of secret) map.tiles[i] = reachable ? Tile.SecretDoor : Tile.DoorClosed;
}
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
    if (!isFullyConnected(level.map, level.up)) continue;
    ensureOpenPath(level);
    return { ...level, generator };
  }
  throw new Error(`Não foi possível gerar um andar conectado (${generator})`);
}
