import { ACTION_COST } from './actor';
import type { Game } from './game';
import { emit, message } from './game';
import type { Item } from './item';
import { takeFromInventory } from './inventory';
import { itemName } from './itemText';
import { itemBase } from '../data/items';
import { recalcPlayer } from './hero';
import { capitalize } from './text';
import type { Point } from './map';

/**
 * Efeitos de consumíveis já implementados. O gerador de itens só cria poções,
 * pergaminhos e varinhas cujos efeitos estejam aqui.
 */
export const IMPLEMENTED = new Set<string>(['heal', 'heal_major', 'mana']);

export function isImplemented(effect: string | undefined): boolean {
  return effect === undefined || IMPLEMENTED.has(effect);
}

/** Bebe uma poção. */
export function quaff(game: Game, item: Item): number {
  const base = itemBase(item.baseId);
  if (base.category !== 'potion') {
    message(game, 'Isso não se bebe.', 'darkGray');
    return 0;
  }
  takeFromInventory(game, item, 1);
  emit(game, { type: 'quaff' });
  potionEffect(game, base.effect ?? '');
  return ACTION_COST;
}

export function potionEffect(game: Game, effect: string): void {
  const p = game.player;
  switch (effect) {
    case 'heal': {
      const amount = game.rng.loot.roll('4d6') + Math.floor(p.maxHp * 0.2);
      p.hp = Math.min(p.maxHp, p.hp + amount);
      emit(game, { type: 'heal', x: p.x, y: p.y });
      message(game, 'Você se sente muito melhor.', 'lightGreen');
      break;
    }
    case 'heal_major':
      p.hp = p.maxHp;
      emit(game, { type: 'heal', x: p.x, y: p.y });
      message(game, 'Seus ferimentos se fecham por completo!', 'lightGreen');
      break;
    case 'mana':
      p.mp = p.maxMp;
      message(game, p.maxMp > 0 ? 'Sua mente se enche de energia mágica.' : 'Você sente um formigamento estranho.', 'lightBlue');
      break;
    default:
      message(game, 'Nada parece acontecer.', 'darkGray');
  }
}

/** Come algo (fome entra na Etapa 4; por enquanto comer recupera um pouco de HP). */
export function eat(game: Game, item: Item): number {
  const base = itemBase(item.baseId);
  if (base.category !== 'food' && base.category !== 'corpse') {
    message(game, 'Isso não se come.', 'darkGray');
    return 0;
  }
  const name = itemName(game, { ...item, quantity: 1 }, 'the');
  takeFromInventory(game, item, 1);
  game.hero.nutrition = Math.min(MAX_NUTRITION, game.hero.nutrition + (base.nutrition ?? 200));
  message(game, `Você come ${name}. ${capitalize(base.category === 'corpse' ? 'Argh.' : 'Delicioso!')}`, 'lightGray');
  recalcPlayer(game);
  return ACTION_COST;
}

export const MAX_NUTRITION = 4000;

/** Lê um pergaminho ou tomo (efeitos completos na Etapa 4). */
export function readItem(game: Game, item: Item): number {
  const base = itemBase(item.baseId);
  if (base.category !== 'scroll' && base.category !== 'book') {
    message(game, 'Não há nada escrito aí.', 'darkGray');
    return 0;
  }
  if (!isImplemented(base.effect)) {
    message(game, 'As runas se embaralham diante dos seus olhos. (Ainda não implementado.)', 'darkGray');
    return 0;
  }
  return 0;
}

/** Usa uma varinha apontando para um alvo (efeitos completos na Etapa 4). */
export function zapWand(game: Game, item: Item, _target: Point): number {
  const base = itemBase(item.baseId);
  if (base.category !== 'wand') {
    message(game, 'Você agita isso no ar. Nada acontece.', 'darkGray');
    return 0;
  }
  message(game, 'A varinha não responde. (Ainda não implementado.)', 'darkGray');
  return 0;
}
