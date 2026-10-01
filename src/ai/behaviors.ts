import type { Actor } from '../core/actor';
import type { Action } from '../core/actions';
import type { Game } from '../core/game';
import { isFree } from '../core/game';
import { DIRS8 } from '../core/map';

/** Decide a próxima ação de um monstro. */
export function decideAction(game: Game, monster: Actor): Action {
  // Por enquanto (subetapa 1.2): passeio aleatório.
  const rng = game.rng.ai;
  const options = DIRS8.filter((d) => isFree(game, monster.x + d.x, monster.y + d.y));
  if (options.length === 0 || rng.chance(25)) return { type: 'wait' };
  const d = rng.pick(options);
  return { type: 'move', dx: d.x, dy: d.y };
}
