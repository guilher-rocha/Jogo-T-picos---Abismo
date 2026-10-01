import type { Action } from '../core/actions';
import type { Game } from '../core/game';
import { level } from '../core/game';
import { blockingMonster, explorationFrontier, stepToward } from './bot';
import type { Actor } from '../core/actor';

/**
 * Próximo passo do autoexplorar: vai até itens visíveis ainda não vistos;
 * senão, até a fronteira do que já foi explorado. Retorna null se não há mais o que explorar.
 */
export function autoExploreStep(game: Game, ignoredItems: Set<number>): Action | { blockedBy: Actor } | null {
  const lvl = level(game);
  const p = game.player;
  const items = lvl.items.filter((it) => it.baseId !== 'corpse' && !ignoredItems.has(it.id)
    && lvl.map.explored[it.y * lvl.map.width + it.x] && !(it.x === p.x && it.y === p.y));
  if (items.length) {
    const step = stepToward(game, items, { avoidMonsters: true });
    if (step) return step;
  }
  const frontier = explorationFrontier(game).filter((c) => !(c.x === p.x && c.y === p.y));
  if (frontier.length) {
    const step = stepToward(game, frontier, { avoidMonsters: true });
    if (step) return step;
    const blocker = blockingMonster(game, frontier);
    if (blocker) return { blockedBy: blocker };
  }
  return null;
}
