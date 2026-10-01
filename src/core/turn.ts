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
  if (game.over) return false;
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
    if (game.over || game.player.energy >= ACTION_COST) return;
    let acted = false;
    // Cópia: monstros podem morrer durante o laço.
    for (const m of [...level(game).actors]) {
      if (game.over) return;
      if (m.hp <= 0 || m.energy < ACTION_COST) continue;
      const cost = perform(game, m, decideAction(game, m));
      // Ação inválida da IA: ela perde a vez em vez de travar o loop.
      m.energy -= cost > 0 ? cost : ACTION_COST;
      acted = true;
    }
    if (!acted) tick(game);
  }
}

/** Intervalo (em turnos) para regenerar 1 HP. */
const REGEN_INTERVAL = 10;

function tick(game: Game): void {
  game.turn++;
  game.player.energy += game.player.speed;
  for (const m of level(game).actors) m.energy += m.speed;
  const p = game.player;
  if (game.turn % REGEN_INTERVAL === 0) {
    for (const a of [p, ...level(game).actors]) if (a.hp < a.maxHp) a.hp++;
  }
  // Meio-orcs e trolls regeneram mais rápido.
  if (game.turn % 4 === 0) {
    if (game.hero.raceId === 'half_orc' && p.hp < p.maxHp) p.hp++;
    for (const m of level(game).actors) if (m.flags.includes('regenerates') && m.hp < m.maxHp) m.hp += 2;
  }
  // Mana: mais rápido com nível alto.
  const mpInterval = Math.max(3, 12 - Math.floor(p.level / 3));
  if (game.turn % mpInterval === 0 && p.mp < p.maxMp) p.mp++;
}
