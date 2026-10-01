import { ACTION_COST } from './actor';
import type { Actor } from './actor';
import type { Game } from './game';
import { actorAt, emit, level, message } from './game';
import type { Item } from './item';
import { takeFromInventory, equipped, allEquipped } from './inventory';
import { itemName } from './itemText';
import { itemBase } from '../data/items';
import { gainXp, recalcPlayer, xpForLevel } from './hero';
import { capitalize, theName } from './text';
import type { Point } from './map';
import { DIRS8, distance, idx, inBounds, isWalkable } from './map';
import { addStatus, removeStatus } from './status';
import { identifyItem, isKnown, learn } from './identify';
import { invokeEffect, magicMap, teleportActor } from './spells';
import type { SpellDef } from '../data/spells';
import { SPELLS } from '../data/spells';
import { createMonster } from './monster';
import { monstersForDepth } from '../gen/populate';
import { damage } from './combat';
import { classById } from '../data/classes';

/** Efeitos de consumíveis já implementados (o gerador só cria itens com efeito implementado). */
export const IMPLEMENTED = new Set<string>([
  // poções
  'heal', 'heal_major', 'mana', 'haste', 'gain_str', 'gain_level', 'cure', 'invisible', 'restore', 'poison', 'confuse', 'blind',
  // pergaminhos
  'identify', 'teleport', 'mapping', 'uncurse', 'enchant_weapon', 'enchant_armor', 'light', 'scare', 'fireball_self', 'summon', 'aggravate',
  // varinhas
  'magic_missile', 'fire_bolt', 'frost_bolt', 'lightning_beam', 'slow_monster', 'sleep_monster', 'teleport_other', 'dig',
  // anéis/amuletos (via bônus)
  'protection', 'str', 'regen', 'resist_fire', 'life', 'mind',
  // tomos
  'learn_arcane', 'learn_divine',
]);

export function isImplemented(effect: string | undefined): boolean {
  return effect === undefined || IMPLEMENTED.has(effect);
}

export const MAX_NUTRITION = 4000;

// ── Poções ────────────────────────────────────────────────────────────

/** Bebe uma poção. Beber identifica o tipo se o efeito for perceptível. */
export function quaff(game: Game, item: Item): number {
  const base = itemBase(item.baseId);
  if (base.category !== 'potion') {
    message(game, 'Isso não se bebe.', 'darkGray');
    return 0;
  }
  const wasKnown = isKnown(game, item.baseId);
  takeFromInventory(game, item, 1);
  emit(game, { type: 'quaff' });
  message(game, `Você bebe ${itemName(game, { ...item, quantity: 1 })}.`, 'lightGray');
  const obvious = potionEffect(game, game.player, base.effect ?? '');
  if (obvious && !wasKnown) {
    learn(game, item.baseId);
    message(game, `(Era ${itemName(game, { ...item, quantity: 1 })}.)`, 'lightCyan');
  }
  return ACTION_COST;
}

/** Aplica o efeito de uma poção a um ator (bebida ou arremessada). Retorna se foi perceptível. */
export function potionEffect(game: Game, target: Actor, effect: string): boolean {
  const p = target;
  const you = target.isPlayer;
  switch (effect) {
    case 'heal': {
      const amount = game.rng.loot.roll('4d6') + Math.floor(p.maxHp * 0.2);
      p.hp = Math.min(p.maxHp, p.hp + amount);
      removeStatus(game, p, 'blind');
      emit(game, { type: 'heal', x: p.x, y: p.y });
      message(game, you ? 'Você se sente muito melhor.' : `${capitalize(theName(p))} parece melhor.`, 'lightGreen');
      return true;
    }
    case 'heal_major':
      p.hp = p.maxHp;
      for (const s of ['blind', 'confused', 'poisoned'] as const) removeStatus(game, p, s, true);
      emit(game, { type: 'heal', x: p.x, y: p.y });
      message(game, you ? 'Seus ferimentos se fecham por completo!' : `${capitalize(theName(p))} está curado!`, 'lightGreen');
      return true;
    case 'mana':
      if (!you) return false;
      p.mp = p.maxMp;
      message(game, p.maxMp > 0 ? 'Sua mente se enche de energia mágica.' : 'Você sente um formigamento estranho.', 'lightBlue');
      return p.maxMp > 0;
    case 'haste':
      return addStatus(game, p, 'hasted', game.rng.loot.roll('2d10+15'));
    case 'gain_str':
      if (!you) return false;
      game.hero.stats.str++;
      recalcPlayer(game);
      message(game, 'Você se sente forte como um touro!', 'gold');
      return true;
    case 'gain_level':
      if (!you) return false;
      gainXp(game, Math.ceil(xpForLevel(game.hero.level + 1) - game.hero.xp) + 1);
      return true;
    case 'cure':
      for (const s of ['poisoned', 'confused', 'blind', 'burning'] as const) removeStatus(game, p, s);
      message(game, you ? 'Você se sente limpo e lúcido.' : `${capitalize(theName(p))} parece melhor.`, 'lightGreen');
      return true;
    case 'invisible':
      return addStatus(game, p, 'invisible', game.rng.loot.roll('3d10+20'));
    case 'restore':
      if (!you) return false;
      if (game.hero.drainedXp > 0) {
        const xp = game.hero.drainedXp;
        game.hero.drainedXp = 0;
        message(game, 'Você sente sua força vital retornar!', 'lightCyan');
        gainXp(game, xp / 1.15);
      } else message(game, 'Você se sente revigorado.', 'lightCyan');
      return true;
    case 'poison':
      addStatus(game, p, 'poisoned', game.rng.loot.roll('2d4+4'), 2);
      if (you) damage(game, p, game.rng.loot.roll('1d4'));
      return true;
    case 'confuse':
      return addStatus(game, p, 'confused', game.rng.loot.roll('2d4+4'));
    case 'blind':
      return addStatus(game, p, 'blind', game.rng.loot.roll('3d6+6'));
  }
  message(game, 'Nada parece acontecer.', 'darkGray');
  return false;
}

// ── Comida ─────────────────────────────────────────────────────────────

export function eat(game: Game, item: Item): number {
  const base = itemBase(item.baseId);
  if (base.category !== 'food' && base.category !== 'corpse') {
    message(game, 'Isso não se come.', 'darkGray');
    return 0;
  }
  const name = itemName(game, { ...item, quantity: 1 }, 'the');
  takeFromInventory(game, item, 1);
  game.hero.nutrition = Math.min(MAX_NUTRITION, game.hero.nutrition + (base.nutrition ?? 200));
  if (base.category === 'corpse') {
    message(game, `Você come ${name}. Argh.`, 'lightGray');
    // Alguns cadáveres fazem mal.
    if (item.corpseOf && ['giant_spider', 'poison_fungus', 'serpent', 'green_jelly'].includes(item.corpseOf)) {
      addStatus(game, game.player, 'poisoned', 8, 1);
    } else if (item.corpseOf && ['zombie', 'skeleton', 'wraith', 'vampire'].includes(item.corpseOf)) {
      message(game, 'Carne podre! Você passa mal.', 'orange');
      addStatus(game, game.player, 'confused', 5);
    }
  } else message(game, `Você come ${name}. Delicioso!`, 'lightGray');
  recalcPlayer(game);
  return ACTION_COST;
}

// ── Pergaminhos e tomos ──────────────────────────────────────────────

/** Lê um pergaminho ou tomo. `targetId` escolhe o item para identificação. */
export function readItem(game: Game, item: Item, targetId?: number): number {
  const base = itemBase(item.baseId);
  if (base.category === 'book') return readBook(game, item);
  if (base.category !== 'scroll') {
    message(game, 'Não há nada escrito aí.', 'darkGray');
    return 0;
  }
  if (hasBlind(game)) {
    message(game, 'Você não consegue ler: está cego!', 'orange');
    return 0;
  }
  const wasKnown = isKnown(game, item.baseId);
  takeFromInventory(game, item, 1);
  emit(game, { type: 'read' });
  message(game, `Você lê ${itemName(game, { ...item, quantity: 1 })}.`, 'lightGray');
  const obvious = scrollEffect(game, base.effect ?? '', targetId);
  // Mago identifica pergaminhos ao lê-los a partir do nível 5 (Visão Arcana).
  const arcane = game.hero.classId === 'mage' && game.hero.level >= 5;
  if ((obvious || arcane) && !wasKnown) {
    learn(game, item.baseId);
    message(game, `(Era ${itemName(game, { ...item, quantity: 1 })}.)`, 'lightCyan');
  }
  return ACTION_COST;
}

function hasBlind(game: Game): boolean {
  return (game.player.effects ?? []).some((e) => e.id === 'blind');
}

function scrollEffect(game: Game, effect: string, targetId?: number): boolean {
  const p = game.player;
  const lvl = level(game);
  switch (effect) {
    case 'identify': {
      const unknown = game.hero.inventory.filter((i) => !i.identified || !isKnown(game, i.baseId));
      const target = unknown.find((i) => i.id === targetId) ?? (unknown.length ? game.rng.loot.pick(unknown) : undefined);
      if (!target) {
        message(game, 'Você já conhece tudo o que carrega.', 'lightGray');
        return true;
      }
      identifyItem(game, target);
      message(game, `${target.letter} - ${itemName(game, target)}.`, 'lightCyan');
      return true;
    }
    case 'teleport':
      teleportActor(game, p);
      message(game, 'O mundo gira e você aparece em outro lugar!', 'lightMagenta');
      return true;
    case 'mapping':
      magicMap(game);
      return true;
    case 'uncurse': {
      let n = 0;
      for (const it of allEquipped(game)) if (it.cursed) {
        it.cursed = false;
        n++;
      }
      message(game, n ? 'Você sente como se alguém estivesse cuidando de você.' : 'Você sente uma leve sensação de alívio.', 'lightCyan');
      return n > 0;
    }
    case 'enchant_weapon':
    case 'enchant_armor': {
      const slots = effect === 'enchant_weapon' ? ['weapon'] as const : ['body', 'offhand', 'head', 'hands', 'feet', 'cloak'] as const;
      const items = slots.map((s) => equipped(game, s)).filter((i): i is Item => !!i);
      if (!items.length) {
        message(game, 'Suas mãos brilham por um instante.', 'lightCyan');
        return false;
      }
      const it = game.rng.loot.pick(items);
      if (it.enchant >= 9 && game.rng.loot.chance(60)) {
        message(game, `${capitalize(itemName(game, it, 'the'))} vibra violentamente e se desintegra!`, 'lightRed');
        takeFromInventory(game, it);
      } else {
        it.enchant++;
        it.cursed = false;
        it.identified = true;
        message(game, `${capitalize(itemName(game, it, 'the'))} brilha com uma luz azul!`, 'lightBlue');
      }
      recalcPlayer(game);
      return true;
    }
    case 'light': {
      const map = lvl.map;
      for (let y = p.y - 6; y <= p.y + 6; y++) for (let x = p.x - 6; x <= p.x + 6; x++) if (inBounds(map, x, y)) map.lit[idx(map, x, y)] = 1;
      message(game, 'Uma luz intensa ilumina a área!', 'yellow');
      for (const m of lvl.actors) if (distance(m, p) <= 6 && m.flags.includes('undead')) damage(game, m, game.rng.loot.roll('2d6'), p);
      return true;
    }
    case 'scare': {
      const near = lvl.actors.filter((m) => distance(m, p) <= 8);
      for (const m of near) addStatus(game, m, 'afraid', game.rng.loot.roll('2d6+10'));
      message(game, near.length ? 'Você ouve gritos de pavor!' : 'Você ouve uma risada maníaca ao longe.', 'lightGray');
      return true;
    }
    case 'fireball_self': {
      emit(game, { type: 'explosion', x: p.x, y: p.y, radius: 2, color: 'orange' });
      message(game, 'O pergaminho explode numa bola de fogo!', 'orange');
      for (const m of [...lvl.actors]) if (distance(m, p) <= 2) damage(game, m, game.rng.loot.roll('4d6'), p);
      damage(game, p, Math.round(game.rng.loot.roll('1d6') * (1 - (p.resist?.fire ?? 0) / 100)));
      return true;
    }
    case 'summon': {
      const pool = monstersForDepth(game.depth);
      let n = 0;
      for (const d of game.rng.loot.shuffle(DIRS8)) {
        if (n >= game.rng.loot.int(2, 3)) break;
        const x = p.x + d.x;
        const y = p.y + d.y;
        if (!isWalkable(lvl.map, x, y) || actorAt(game, x, y)) continue;
        const m = createMonster(game, game.rng.loot.pick(pool), x, y, game.rng.loot);
        m.ai.state = 'hunting';
        lvl.actors.push(m);
        n++;
      }
      message(game, 'Monstros surgem do nada ao seu redor!', 'lightRed');
      return true;
    }
    case 'aggravate':
      for (const m of lvl.actors) {
        m.ai.state = 'hunting';
        m.ai.lastSeen = { x: p.x, y: p.y };
      }
      message(game, 'Um som agudo ecoa por todo o andar!', 'orange');
      return true;
  }
  message(game, 'Você não entende as runas.', 'darkGray');
  return false;
}

/** Tomo: aprende uma magia nova da escola do livro. */
function readBook(game: Game, item: Item): number {
  const base = itemBase(item.baseId);
  const school = base.effect === 'learn_divine' ? 'divine' : 'arcane';
  const cls = classById(game.hero.classId);
  if (!cls.castStat) {
    message(game, 'As palavras não fazem sentido para você. (Sua classe não conjura magias.)', 'darkGray');
    return 0;
  }
  const pool = [...SPELLS.filter((s) => !s.generated), ...(game.customSpells ?? [])]
    .filter((s) => s.school === school && s.level <= game.hero.level + 2 && !game.hero.spells.includes(s.id));
  learn(game, item.baseId);
  takeFromInventory(game, item, 1);
  if (!pool.length) {
    message(game, 'Você já conhece todas as magias deste tomo que consegue entender.', 'lightGray');
    return ACTION_COST;
  }
  // Tomos podem conter magias geradas proceduralmente (guardadas em item.spellId).
  const chosen: SpellDef = (item.spellId && pool.find((s) => s.id === item.spellId)) || game.rng.loot.pick(pool);
  game.hero.spells.push(chosen.id);
  message(game, `Você estuda o tomo e aprende: ${chosen.name}!`, 'lightMagenta');
  return ACTION_COST * 3;
}

// ── Varinhas ──────────────────────────────────────────────────────────

/** Efeito de cada varinha como uma "magia" sem custo. */
export const WAND_SPELLS: Record<string, SpellDef> = {
  magic_missile: { id: 'w_mm', name: 'míssil mágico', school: 'arcane', level: 1, cost: 0, shape: 'bolt', effect: 'damage', element: 'arcane', power: '3d4', range: 10, fail: 0, color: 'lightMagenta', desc: '' },
  fire_bolt: { id: 'w_fire', name: 'raio de fogo', school: 'arcane', level: 1, cost: 0, shape: 'bolt', effect: 'damage', element: 'fire', power: '6d6', range: 10, fail: 0, color: 'orange', desc: '' },
  frost_bolt: { id: 'w_cold', name: 'raio de gelo', school: 'arcane', level: 1, cost: 0, shape: 'bolt', effect: 'damage', element: 'cold', power: '6d6', range: 10, fail: 0, color: 'lightCyan', desc: '' },
  lightning_beam: { id: 'w_bolt', name: 'relâmpago', school: 'arcane', level: 1, cost: 0, shape: 'beam', effect: 'damage', element: 'lightning', power: '5d8', range: 12, fail: 0, color: 'yellow', desc: '' },
  slow_monster: { id: 'w_slow', name: 'lentidão', school: 'arcane', level: 1, cost: 0, shape: 'bolt', effect: 'slow', range: 10, fail: 0, color: 'lightGray', desc: '' },
  sleep_monster: { id: 'w_sleep', name: 'sono', school: 'arcane', level: 1, cost: 0, shape: 'bolt', effect: 'sleep', range: 10, fail: 0, color: 'lightBlue', desc: '' },
  teleport_other: { id: 'w_tele', name: 'banimento', school: 'arcane', level: 1, cost: 0, shape: 'bolt', effect: 'teleport', range: 10, fail: 0, color: 'lightGreen', desc: '' },
  dig: { id: 'w_dig', name: 'escavação', school: 'arcane', level: 1, cost: 0, shape: 'bolt', effect: 'dig', range: 8, fail: 0, color: 'brown', desc: '' },
};

/** Usa uma varinha apontando para um alvo. */
export function zapWand(game: Game, item: Item, target: Point): number {
  const base = itemBase(item.baseId);
  if (base.category !== 'wand') {
    message(game, 'Você agita isso no ar. Nada acontece.', 'darkGray');
    return 0;
  }
  if ((item.charges ?? 0) <= 0) {
    message(game, 'Você agita a varinha, mas nada acontece. (Sem cargas.)', 'darkGray');
    return ACTION_COST;
  }
  item.charges = (item.charges ?? 1) - 1;
  const spell = WAND_SPELLS[base.effect ?? ''];
  if (!spell) return ACTION_COST;
  const wasKnown = isKnown(game, item.baseId);
  const affected = invokeEffect(game, game.player, spell, target);
  // A varinha se identifica se o efeito foi visto (gnomos sempre reconhecem).
  if (!wasKnown && (affected.length > 0 || spell.effect === 'dig' || game.hero.raceId === 'gnome')) {
    learn(game, item.baseId);
    item.identified = true;
    message(game, `(Era ${itemName(game, item)}.)`, 'lightCyan');
  } else if (!wasKnown) message(game, 'Você não percebe nenhum efeito.', 'darkGray');
  return ACTION_COST;
}
