import type { Actor } from './actor';
import { ACTION_COST, hasFlag } from './actor';
import type { Game } from './game';
import { actorAt, level, message } from './game';
import { getTile, isWalkable, setTile } from './map';
import { Tile } from '../data/tiles';
import { meleeAttack } from './combat';
import { capitalize, theName } from './text';

/** Ações possíveis. Jogador e monstros usam exatamente as mesmas. */
export type Action =
  | { type: 'move'; dx: number; dy: number }
  | { type: 'attack'; dx: number; dy: number }
  | { type: 'wait' };

/**
 * Executa uma ação. Retorna a energia gasta (0 = ação inválida, não passa o tempo).
 */
export function perform(game: Game, actor: Actor, action: Action): number {
  switch (action.type) {
    case 'move':
      return doMove(game, actor, action.dx, action.dy);
    case 'attack': {
      const target = actorAt(game, actor.x + action.dx, actor.y + action.dy);
      if (!target || target === actor) return 0;
      meleeAttack(game, actor, target);
      return ACTION_COST;
    }
    case 'wait':
      return ACTION_COST;
  }
}

/** Mover: ataca se houver inimigo, abre porta se estiver fechada, senão anda. */
function doMove(game: Game, actor: Actor, dx: number, dy: number): number {
  const nx = actor.x + dx;
  const ny = actor.y + dy;
  const map = level(game).map;
  const other = actorAt(game, nx, ny);
  if (other) {
    // Monstros não se atacam entre si.
    if (actor.isPlayer || other.isPlayer) {
      meleeAttack(game, actor, other);
      return ACTION_COST;
    }
    return 0;
  }
  const t = getTile(map, nx, ny);
  if (t === Tile.DoorClosed) {
    if (!actor.isPlayer && !hasFlag(actor, 'opensDoors')) return 0;
    setTile(map, nx, ny, Tile.DoorOpen);
    if (actor.isPlayer) message(game, 'Você abre a porta.', 'lightGray');
    else if (map.visible[ny * map.width + nx]) message(game, `${capitalize(theName(actor))} abre uma porta.`, 'lightGray');
    return ACTION_COST;
  }
  if (t === Tile.DoorLocked) {
    if (actor.isPlayer) message(game, 'A porta está trancada.', 'lightGray');
    return 0;
  }
  if (!isWalkable(map, nx, ny)) return 0;
  actor.x = nx;
  actor.y = ny;
  return ACTION_COST;
}
