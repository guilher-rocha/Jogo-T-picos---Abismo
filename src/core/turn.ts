import { ACTION_COST } from './actor';
import type { Action } from './actions';
import { perform } from './actions';
import type { Game } from './game';
import { level, refreshFov } from './game';
import { decideAction } from '../ai/behaviors';
import { effectiveSpeed, hasStatus, isIncapacitated, tickStatuses } from './status';
import { damage } from './combat';
import { addStatus } from './status';
import { enterLevel } from './world';
import { teleportActor } from './spells';
import { message, setDeathCause } from './game';
import { recalcPlayer } from './hero';
import { equipped } from './inventory';

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
  resolveFall(game);
  runUntilPlayerTurn(game);
  resolveFall(game);
  refreshFov(game);
  return true;
}

export function runUntilPlayerTurn(game: Game): void {
  // Proteção contra laço infinito (nunca deveria chegar perto disso).
  for (let guard = 0; guard < 10000; guard++) {
    if (game.over) return;
    if (game.player.energy >= ACTION_COST) {
      // Dormindo/paralisado: o turno do jogador passa sozinho.
      if (!isIncapacitated(game.player)) return;
      game.player.energy -= ACTION_COST;
    }
    let acted = false;
    // Cópia: monstros podem morrer durante o laço.
    for (const m of [...level(game).actors]) {
      if (game.over) return;
      if (m.hp <= 0 || m.energy < ACTION_COST) continue;
      if (isIncapacitated(m)) {
        m.energy -= ACTION_COST;
        acted = true;
        continue;
      }
      const cost = perform(game, m, decideAction(game, m));
      // Ação inválida da IA: ela perde a vez em vez de travar o loop.
      m.energy -= cost > 0 ? cost : ACTION_COST;
      acted = true;
    }
    if (!acted) tick(game);
  }
}

/** Queda por alçapão: vai para o andar de baixo, num ponto aleatório. */
export function resolveFall(game: Game): void {
  if (!game.pendingFall || game.over) return;
  game.pendingFall = false;
  enterLevel(game, game.depth + 1, 'up');
  teleportActor(game, game.player);
  damage(game, game.player, game.rng.loot.roll('1d6'));
  setDeathCause(game, 'morto na queda de um alçapão');
}

/** Fome e combustível da luz, uma vez por turno. */
export function hungerAndFuel(game: Game): void {
  const hero = game.hero;
  const p = game.player;
  const before = hero.nutrition;
  hero.nutrition -= p.flags.includes('regen') ? 2 : 1;
  const crossed = (limit: number) => before >= limit && hero.nutrition < limit;
  if (crossed(600)) message(game, 'Você está com fome.', 'yellow');
  if (crossed(150)) {
    message(game, 'Você está fraco de fome!', 'lightRed');
    recalcPlayer(game);
  }
  if (hero.nutrition <= 0 && game.rng.loot.chance(10) && !hasStatus(p, 'asleep')) {
    message(game, 'Você desmaia de fome!', 'red');
    addStatus(game, p, 'asleep', game.rng.loot.int(2, 4));
  }
  if (hero.nutrition <= -400) {
    damage(game, p, p.hp);
    setDeathCause(game, 'morreu de fome');
  }
  const light = equipped(game, 'light');
  if (light?.fuel !== undefined && light.fuel > 0) {
    light.fuel--;
    if (light.fuel === 200) message(game, 'Sua luz está ficando fraca.', 'yellow');
    if (light.fuel === 0) {
      message(game, 'Sua luz se apaga! Você está no escuro.', 'lightRed');
      recalcPlayer(game);
    }
  }
}

/** Intervalo (em turnos) para regenerar 1 HP. */
const REGEN_INTERVAL = 10;

function tick(game: Game): void {
  game.turn++;
  game.player.energy += effectiveSpeed(game.player);
  for (const m of level(game).actors) m.energy += effectiveSpeed(m);
  // Status: veneno, fogo, durações.
  for (const a of [game.player, ...level(game).actors]) {
    if (!a.effects?.length) continue;
    const { damage: dmg, cause } = tickStatuses(game, a);
    if (dmg > 0) {
      damage(game, a, dmg);
      if (a.isPlayer && cause) setDeathCause(game, cause);
    }
  }
  if (game.over) return;
  hungerAndFuel(game);
  if (game.over) return;
  heroRegen(game);
  if (game.turn % REGEN_INTERVAL === 0) {
    for (const a of level(game).actors) if (a.hp < a.maxHp && !hasStatus(a, 'poisoned')) a.hp++;
  }
  // Trolls regeneram mais rápido.
  if (game.turn % 4 === 0) {
    for (const m of level(game).actors) if (m.flags.includes('regenerates') && m.hp < m.maxHp) m.hp += 2;
  }
}

/** Regeneração de vida e mana do herói (uma vez por turno). */
export function heroRegen(game: Game): void {
  const p = game.player;
  if (game.turn % REGEN_INTERVAL === 0 && p.hp < p.maxHp && !hasStatus(p, 'poisoned')) p.hp++;
  if (p.flags.includes('regen') && game.turn % 3 === 0 && p.hp < p.maxHp) p.hp++;
  // Meio-orcs regeneram mais rápido.
  if (game.turn % 4 === 0 && game.hero.raceId === 'half_orc' && p.hp < p.maxHp) p.hp++;
  // Mana: mais rápido com nível alto.
  const mpInterval = Math.max(3, 12 - Math.floor(p.level / 3));
  if (game.turn % mpInterval === 0 && p.mp < p.maxMp) p.mp++;
}
