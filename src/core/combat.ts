import type { Actor, Attack, Element } from './actor';
import { hasFlag } from './actor';
import { collectBonuses } from './bonuses';
import type { Game } from './game';
import { emit, level, message } from './game';
import { aName, capitalize, theName } from './text';
import { addItem, createCorpse } from './item';
import { gainXp, killXp } from './hero';

/** Chance de acerto (%), sempre entre 5 e 95. */
export function hitChance(attacker: Actor, defender: Actor): number {
  return Math.max(5, Math.min(95, 65 + (attacker.accuracy - defender.defense) * 5));
}

export interface AttackOptions {
  damageMult?: number;
}

/** Um ataque corpo a corpo completo (todos os ataques do atacante). */
export function meleeAttack(game: Game, attacker: Actor, defender: Actor, opts: AttackOptions = {}): void {
  // Ataque furtivo do Ladino: alvo dormindo ou distraído (não está caçando você).
  const sneak = attacker.isPlayer && game.hero.classId === 'rogue' && !defender.isPlayer && defender.ai.state !== 'hunting';
  for (const atk of attacker.attacks) {
    if (defender.hp <= 0) break;
    resolveAttack(game, attacker, defender, atk, (opts.damageMult ?? 1) * (sneak ? 3 : 1), sneak);
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

function resolveAttack(game: Game, attacker: Actor, defender: Actor, atk: Attack, mult = 1, sneak = false): void {
  const rng = game.rng.combat;
  const a = theName(attacker);
  const d = theName(defender);
  if (!rng.chance(hitChance(attacker, defender))) {
    emit(game, { type: 'miss', x: defender.x, y: defender.y });
    if (attacker.isPlayer) message(game, `Você erra ${d}.`, 'lightGray');
    else message(game, `${capitalize(a)} erra você.`, 'darkGray');
    return;
  }
  let dmg = Math.max(1, Math.round(rng.roll(atk.damage) * mult * resistMult(defender, atk.element)));
  // Marcas elementais da arma do jogador (afixos Flamejante, Gélida...).
  let extra = '';
  let lifeSteal = 0;
  if (attacker.isPlayer) {
    const bon = collectBonuses(game);
    for (const br of bon.brands) {
      let bd = rng.roll(br.damage) * resistMult(defender, br.element);
      if (br.element === 'holy' && hasFlag(defender, 'undead')) bd *= 2;
      if (bd > 0) {
        dmg += Math.round(bd);
        extra = ` ${ELEMENT_WORD[br.element] ?? ''}`;
      }
    }
    lifeSteal = bon.lifeSteal;
  }
  if (attacker.isPlayer && sneak) message(game, `Ataque furtivo! Você acerta ${d} em cheio.`, 'yellow');
  else if (attacker.isPlayer) message(game, `Você acerta ${d}${extra}.`, 'white');
  else if (defender.isPlayer) message(game, `${capitalize(a)} ${atk.verb} você.`, 'lightRed');
  damage(game, defender, dmg, attacker);
  if (lifeSteal > 0) {
    const heal = Math.max(1, Math.round((dmg * lifeSteal) / 100));
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
  }
}

const ELEMENT_WORD: Partial<Record<Element, string>> = {
  fire: '(queima!)', cold: '(congela!)', lightning: '(eletrocuta!)', poison: '(envenena!)', holy: '(luz sagrada!)', acid: '(corrói!)',
};

/** Multiplicador de dano conforme a resistência do alvo ao elemento. */
export function resistMult(target: Actor, element?: Element): number {
  if (!element || element === 'physical') return 1;
  const r = target.resist?.[element] ?? 0;
  return Math.max(0, 1 - r / 100);
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
  if (monster.flags.includes('unique')) {
    game.uniquesKilled.push(monster.templateId);
    message(game, `${monster.name} foi derrotado!`, 'gold');
  }
  if (killer?.isPlayer) {
    message(game, `Você mata ${theName(monster)}!`, 'yellow');
    game.hero.kills++;
    gainXp(game, killXp(monster.xpValue, monster.level, game.hero.level));
  } else {
    message(game, `${capitalize(theName(monster))} morre.`, 'lightGray');
  }
}
