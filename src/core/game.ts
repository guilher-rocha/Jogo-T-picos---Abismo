import type { Actor } from './actor';
import type { GameMap } from './map';
import { isWalkable, mapFromStrings } from './map';

/** Estado completo de uma partida (objeto simples, serializável). */
export interface Game {
  seed: number;
  turn: number;
  map: GameMap;
  player: Actor;
}

const TEST_MAP = [
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

/** Partida de teste com mapa desenhado à mão (subetapa 1.1). */
export function createTestGame(seed = 1): Game {
  const map = mapFromStrings(TEST_MAP);
  return {
    seed,
    turn: 0,
    map,
    player: { id: 1, name: 'Você', glyph: '@', color: 'white', x: 6, y: 3, isPlayer: true },
  };
}

/** Tenta mover o jogador. Retorna true se gastou um turno. */
export function movePlayer(game: Game, dx: number, dy: number): boolean {
  const nx = game.player.x + dx;
  const ny = game.player.y + dy;
  if (!isWalkable(game.map, nx, ny)) return false;
  game.player.x = nx;
  game.player.y = ny;
  game.turn++;
  return true;
}
