import type { Game } from './game';
import { createRngs, message, refreshFov } from './game';
import { createActor } from './actor';
import { buildLevel } from '../gen/level';

/** Cria uma partida nova com o primeiro andar gerado proceduralmente. */
export function createGame(seed: number): Game {
  const game: Game = {
    seed,
    turn: 0,
    depth: 1,
    levels: {},
    player: createActor(1, {
      templateId: 'player', name: 'você', glyph: '@', color: 'white', isPlayer: true, energy: 100,
      hp: 20, maxHp: 20, accuracy: 3, defense: 3, attacks: [{ verb: 'acerta', damage: '1d6+1' }],
    }),
    log: [],
    rng: createRngs(seed),
    nextId: 2,
  };
  const lvl = buildLevel(game, 1);
  game.levels[1] = lvl;
  game.player.x = lvl.up.x;
  game.player.y = lvl.up.y;
  refreshFov(game);
  message(game, 'Você desce para o Abismo. Encontre o caminho para baixo...', 'yellow');
  return game;
}
