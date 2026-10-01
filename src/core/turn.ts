import { ACTION_COST } from './actor';
import type { Action } from './actions';
import { perform } from './actions';
import type { Game } from './game';
import { level, refreshFov } from './game';
import { decideAction } from '../ai/behaviors';

/**
 * Loop de turnos baseado em energia:
 * - a cada "tick" todos ganham energia igual à sua velocidade e o contador de turnos avança;
 * - quem tem energia >= 100 age e gasta a energia da ação;
 * - o loop para quando é a vez do jogador (esperando input).
 */
export function playerAction(game: Game, action: Action): boolean {
  const cost = perform(game, game.player, action);
  if (cost <= 0) return false;
  game.player.energy -= cost;
  runUntilPlayerTurn(game);
  refreshFov(game);
  return true;
}

export function runUntilPlayerTurn(game: Game): void {
  // Proteção contra laço infinito (nunca deveria chegar perto disso).
  for (let guard = 0; guard < 10000; guard++) {
    if (game.player.energy >= ACTION_COST) return;
    let acted = false;
    for (const m of level(game).actors) {
      if (m.energy < ACTION_COST) continue;
      const cost = perform(game, m, decideAction(game, m));
      // Ação inválida da IA: ela perde a vez em vez de travar o loop.
      m.energy -= cost > 0 ? cost : ACTION_COST;
      acted = true;
    }
    if (!acted) tick(game);
  }
}

function tick(game: Game): void {
  game.turn++;
  game.player.energy += game.player.speed;
  for (const m of level(game).actors) m.energy += m.speed;
}
