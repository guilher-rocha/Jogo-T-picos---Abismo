import type { Actor } from './actor';
import { ACTION_COST } from './actor';
import type { Game } from './game';
import { isFree } from './game';

/** Ações possíveis. Jogador e monstros usam exatamente as mesmas. */
export type Action =
  | { type: 'move'; dx: number; dy: number }
  | { type: 'wait' };

/**
 * Executa uma ação. Retorna a energia gasta (0 = ação inválida, não passa o tempo).
 */
export function perform(game: Game, actor: Actor, action: Action): number {
  switch (action.type) {
    case 'move':
      return doMove(game, actor, action.dx, action.dy);
    case 'wait':
      return ACTION_COST;
  }
}

function doMove(game: Game, actor: Actor, dx: number, dy: number): number {
  const nx = actor.x + dx;
  const ny = actor.y + dy;
  if (!isFree(game, nx, ny)) return 0;
  actor.x = nx;
  actor.y = ny;
  return ACTION_COST;
}
