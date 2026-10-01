import { createRngs, type Game } from '../src/core/game';
import { createActor } from '../src/core/actor';
import { mapFromStrings } from '../src/core/map';

export const TEST_MAP = [
  '',
  '   ##########               ##############',
  '   #........#               #............#',
  '   #........#################............#',
  '   #....................................#',
  '   #........#################............#',
  '   #........#               #......#.....#',
  '   ####.#####               #......#.....#',
  '      #.#                   ########.#####',
  '      #.#                          #.#',
  '   ####.##########           #######.#######',
  '   #.............#           #.............#',
  '   #.............#############.............#',
  '   #.......................................#',
  '   #.............#############.............#',
  '   ###############           ###############',
];

/** Partida com mapa desenhado à mão e sem monstros (para testes). */
export function createTestGame(seed = 1): Game {
  const map = mapFromStrings(TEST_MAP);
  return {
    seed,
    turn: 0,
    depth: 1,
    levels: { 1: { depth: 1, map, actors: [], items: [], up: { x: 6, y: 3 }, down: { x: 40, y: 13 }, rooms: [] } },
    player: createActor(1, {
      templateId: 'player', name: 'você', glyph: '@', color: 'white', x: 6, y: 3, isPlayer: true, energy: 100,
      hp: 20, maxHp: 20, accuracy: 3, defense: 3, attacks: [{ verb: 'acerta', damage: '1d6+1' }],
    }),
    log: [],
    rng: createRngs(seed),
    nextId: 2,
  };
}
