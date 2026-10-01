import { RNG } from '../engine/rng';
import type { Game, Level } from '../core/game';
import { createMonster } from '../core/monster';
import { MONSTERS } from '../data/monsters';
import { generateDungeon } from './dungeon';
import type { Room } from './dungeon';
import { randomPointInRoom, roomContains } from './dungeon/common';

/** RNG próprio de cada andar: o mesmo andar sai igual para a mesma seed, não importa a ordem de exploração. */
export function levelRng(seed: number, depth: number): RNG {
  return new RNG(seed).fork(`level-${depth}`);
}

/** Cria um andar completo: terreno + monstros. */
export function buildLevel(game: Game, depth: number): Level {
  const rng = levelRng(game.seed, depth);
  const gen = generateDungeon(rng, depth);
  const level: Level = { depth, map: gen.map, actors: [], items: [], up: gen.up, down: gen.down, rooms: gen.rooms };
  const startRoom = gen.rooms.find((r) => roomContains(r, gen.up.x, gen.up.y));
  const candidates = gen.rooms.filter((r) => !r.gone && r !== startRoom);
  const count = 3 + rng.int(0, depth + 1);
  for (let i = 0; i < count && candidates.length > 0; i++) {
    const room: Room = rng.pick(candidates);
    const p = randomPointInRoom(rng, room);
    if (level.actors.some((a) => a.x === p.x && a.y === p.y)) continue;
    const t = rng.pick(MONSTERS);
    level.actors.push(createMonster(game, t, p.x, p.y, rng));
  }
  return level;
}
