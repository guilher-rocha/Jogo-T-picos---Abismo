import type { Actor, Attack } from './actor';
import type { Game } from './game';
import { emit, level, message } from './game';
import { aName, capitalize, theName } from './text';
import { addItem, createCorpse } from './item';
import { gainXp, killXp } from './hero';

/** Chance de acerto (%), sempre entre 5 e 95. */
export function hitChance(attacker: Actor, defender: Actor): number {
  return Math.max(5, Math.min(95, 65 + (attacker.accuracy - defender.defense) * 5));
}

/** Um ataque corpo a corpo completo (todos os ataques do atacante). */
export function meleeAttack(game: Game, attacker: Actor, defender: Actor): void {
  for (const atk of attacker.attacks) {
    if (defender.hp <= 0) break;
    resolveAttack(game, attacker, defender, atk);
  }
  // Ser atacado acorda e enfurece o monstro.
  if (!defender.isPlayer && defender.hp > 0) {
    defender.ai.state = 'hunting';
    defender.ai.lastSeen = { x: attacker.x, y: attacker.y };
  }
}

/** Ataque à distância (projétil já chegou ao alvo). */
export function rangedAttack(game: Game, attacker: Actor, defender: Actor, atk: Attack, missileName: string): void {
  const rng = game.rng.combat;
  if (!rng.chance(hitChance(attacker, defender))) {
    emit(game, { type: 'miss', x: defender.x, y: defender.y });
    message(game, `${capitalize(missileName)} erra ${theName(defender)}.`, 'lightGray');
  } else {
    message(game, `${capitalize(missileName)} ${atk.verb} ${theName(defender)}.`, defender.isPlayer ? 'lightRed' : 'white');
    damage(game, defender, Math.max(1, rng.roll(atk.damage)), attacker);
  }
  if (!defender.isPlayer && defender.hp > 0) {
    defender.ai.state = 'hunting';
    defender.ai.lastSeen = { x: attacker.x, y: attacker.y };
  }
}

function resolveAttack(game: Game, attacker: Actor, defender: Actor, atk: Attack): void {
  const rng = game.rng.combat;
  const a = theName(attacker);
  const d = theName(defender);
  if (!rng.chance(hitChance(attacker, defender))) {
    emit(game, { type: 'miss', x: defender.x, y: defender.y });
    if (attacker.isPlayer) message(game, `Você erra ${d}.`, 'lightGray');
    else message(game, `${capitalize(a)} erra você.`, 'darkGray');
    return;
  }
  const dmg = Math.max(1, rng.roll(atk.damage));
  if (attacker.isPlayer) message(game, `Você acerta ${d}.`, 'white');
  else if (defender.isPlayer) message(game, `${capitalize(a)} ${atk.verb} você.`, 'lightRed');
  damage(game, defender, dmg, attacker);
}

/** Aplica dano; mata se o HP chegar a zero. */
export function damage(game: Game, target: Actor, amount: number, source?: Actor): void {
  target.hp -= amount;
  emit(game, { type: 'damage', x: target.x, y: target.y, amount, toPlayer: target.isPlayer });
  if (target.hp > 0) return;
  target.hp = 0;
  emit(game, { type: 'death', x: target.x, y: target.y, isPlayer: target.isPlayer });
  if (target.isPlayer) {
    const cause = source ? `morto por ${aName(source)}` : 'morto';
    game.over = { won: false, cause };
    message(game, 'Você morre...', 'red');
    return;
  }
  killMonster(game, target, source);
}

export function killMonster(game: Game, monster: Actor, killer?: Actor): void {
  const lvl = level(game);
  lvl.actors = lvl.actors.filter((m) => m !== monster);
  addItem(lvl, createCorpse(game, monster));
  if (killer?.isPlayer) {
    message(game, `Você mata ${theName(monster)}!`, 'yellow');
    game.hero.kills++;
    gainXp(game, killXp(monster.xpValue, monster.level, game.hero.level));
  } else {
    message(game, `${capitalize(theName(monster))} morre.`, 'lightGray');
  }
}
