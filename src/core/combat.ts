import type { Actor, Attack, Element } from './actor';
import { hasFlag } from './actor';
import { collectBonuses } from './bonuses';
import type { StatusId } from './status';
import { addStatus, hasStatus, isIncapacitated, removeStatus, statusDefense } from './status';
import { recalcPlayer, xpForLevel } from './hero';
import { isEquipped, takeFromInventory } from './inventory';
import { itemName } from './itemText';
import { teleportActor } from './spells';
import { generateItem } from '../gen/items';
import type { Game } from './game';
import { emit, level, message } from './game';
import { aName, capitalize, theName } from './text';
import { addItem, createCorpse } from './item';
import { gainXp, killXp } from './hero';

/** Chance de acerto (%), sempre entre 5 e 95. */
export function hitChance(attacker: Actor, defender: Actor): number {
  let def = defender.defense + statusDefense(defender);
  // Alvo dormindo/paralisado é fácil de acertar.
  if (isIncapacitated(defender)) def -= 5;
  let acc = attacker.accuracy;
  if (hasStatus(attacker, 'blind')) acc -= 4;
  if (hasStatus(defender, 'invisible') && !attacker.isPlayer) def += 4;
  return Math.max(5, Math.min(95, 65 + (acc - def) * 5));
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
  if (atk.effect && defender.hp > 0 && rng.chance(atk.effect.chance)) applyAttackEffect(game, attacker, defender, atk);
  if (attacker.flags.includes('lifeSteal')) lifeSteal = 30;
  if (lifeSteal > 0) {
    const heal = Math.max(1, Math.round((dmg * lifeSteal) / 100));
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
  }
}

/** Efeito extra de um ataque de monstro: veneno, confusão, dreno de nível, roubo. */
function applyAttackEffect(game: Game, attacker: Actor, defender: Actor, atk: Attack): void {
  const eff = atk.effect!;
  const rng = game.rng.combat;
  switch (eff.status) {
    case 'drain':
      if (defender.isPlayer) drainLevel(game);
      return;
    case 'steal':
      if (defender.isPlayer) stealFrom(game, attacker);
      return;
    default:
      addStatus(game, defender, eff.status as StatusId, rng.roll(eff.duration ?? '1d4+2'), eff.status === 'poisoned' ? Math.max(1, Math.floor(attacker.level / 5)) : 1);
  }
}

/** Dreno de nível (espectros, vampiros). */
export function drainLevel(game: Game): void {
  const h = game.hero;
  if (h.level <= 1) return;
  const lost = h.xp - xpForLevel(h.level - 1) + 1;
  h.drainedXp += lost;
  h.xp = xpForLevel(h.level - 1);
  h.level--;
  h.hpRolls.pop();
  recalcPlayer(game);
  message(game, `Você sente sua força vital se esvair... (nível ${h.level})`, 'lightRed');
}

/** Ninfas roubam um item (ou ouro) e somem. */
function stealFrom(game: Game, thief: Actor): void {
  const loose = game.hero.inventory.filter((i) => !isEquipped(game, i));
  if (!loose.length && game.hero.gold <= 0) return;
  if (loose.length) {
    const it = game.rng.combat.pick(loose);
    const taken = takeFromInventory(game, it, it.quantity);
    message(game, `${capitalize(theName(thief))} rouba ${itemName(game, taken)}!`, 'lightRed');
    thief.loot = [...(thief.loot ?? []), taken];
  } else {
    const gold = Math.min(game.hero.gold, game.rng.combat.int(10, 50) * game.depth);
    game.hero.gold -= gold;
    message(game, `${capitalize(theName(thief))} rouba ${gold} peças de ouro!`, 'lightRed');
  }
  teleportActor(game, thief);
  thief.ai.state = 'fleeing';
  thief.ai.fleeUntil = game.turn + 40;
  recalcPlayer(game);
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
  // Dano acorda quem está dormindo.
  if (amount > 0 && hasStatus(target, 'asleep')) removeStatus(game, target, 'asleep');
  if (amount > 0 && !target.isPlayer && target.ai.state === 'sleeping') target.ai.state = 'hunting';
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
  // Campeões e chefes deixam um item mágico.
  if (monster.flags.includes('champion') || monster.flags.includes('boss')) {
    const loot = generateItem(game, game.rng.loot, game.depth + 2, ['weapon', 'armor', 'shield', 'helm', 'ring', 'amulet', 'launcher', 'cloak', 'boots']);
    if (loot) {
      if (loot.rarity === 'common') { loot.rarity = 'magic'; loot.identified = false; }
      addItem(lvl, { ...loot, x: monster.x, y: monster.y });
    }
  }
  // Ladrões devolvem o que roubaram ao morrer.
  for (const it of monster.loot ?? []) addItem(lvl, { ...it, x: monster.x, y: monster.y });
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
