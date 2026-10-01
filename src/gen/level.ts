import { RNG } from '../engine/rng';
import type { Game, Level } from '../core/game';
import { generateDungeon } from './dungeon';
import { themeForDepth } from '../data/themes';
import { spawnMonsters } from './populate';
import { spawnItems } from './items';

/** RNG próprio de cada andar: o mesmo andar sai igual para a mesma seed, não importa a ordem de exploração. */
export function levelRng(seed: number, depth: number): RNG {
  return new RNG(seed).fork(`level-${depth}`);
}

/** Cria um andar completo: terreno + monstros. */
export function buildLevel(game: Game, depth: number): Level {
  const rng = levelRng(game.seed, depth);
  const gen = generateDungeon(rng, depth);
  const level: Level = {
    depth,
    map: gen.map,
    actors: [],
    items: [],
    up: gen.up,
    down: gen.down,
    rooms: gen.rooms,
    theme: themeForDepth(depth).id,
    generator: gen.generator,
    visited: false,
  };
  spawnMonsters(game, level, rng, depth);
  spawnItems(game, level, rng, depth);
  return level;
}
