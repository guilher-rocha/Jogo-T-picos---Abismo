import type { Actor } from './actor';
import type { Game, Level } from './game';
import { newId } from './game';
import { itemBase } from '../data/items';

export type Rarity = 'common' | 'magic' | 'rare' | 'legendary';

/** Um item concreto (no chão ou no inventário). */
export interface Item {
  id: number;
  baseId: string;
  x: number;
  y: number;
  quantity: number;
  /** Encantamento +N/−N (armas e armaduras). */
  enchant: number;
  /** Ids de afixos (data/affixes.ts). */
  affixes: string[];
  rarity: Rarity;
  /** Nome próprio de itens raros/lendários. */
  properName?: string;
  /** Encantamento/afixos conhecidos pelo jogador. */
  identified: boolean;
  cursed: boolean;
  charges?: number;
  fuel?: number;
  /** Letra fixa no inventário. */
  letter?: string;
  corpseOf?: string;
  corpseName?: string;
  /** Tomos: magia específica contida (magias procedurais). */
  spellId?: string;
}

export function createItem(game: Game, baseId: string, props: Partial<Item> = {}): Item {
  const base = itemBase(baseId);
  return {
    id: newId(game),
    baseId,
    x: 0,
    y: 0,
    quantity: 1,
    enchant: 0,
    affixes: [],
    rarity: 'common',
    identified: true,
    cursed: false,
    fuel: base.fuel,
    ...props,
  };
}

export function createCorpse(game: Game, monster: Actor): Item {
  return createItem(game, 'corpse', { x: monster.x, y: monster.y, corpseOf: monster.templateId, corpseName: monster.name });
}

/** Dois itens podem formar uma pilha? */
export function canStack(a: Item, b: Item): boolean {
  if (a.baseId !== b.baseId || !itemBase(a.baseId).stackable) return false;
  return a.enchant === b.enchant && a.cursed === b.cursed && a.identified === b.identified
    && a.affixes.join() === b.affixes.join() && a.rarity === b.rarity && a.fuel === b.fuel;
}

export function addItem(level: Level, item: Item): void {
  // Pilhas no chão se juntam.
  const same = level.items.find((i) => i.x === item.x && i.y === item.y && canStack(i, item));
  if (same) same.quantity += item.quantity;
  else level.items.push(item);
}

export function itemsAt(level: Level, x: number, y: number): Item[] {
  return level.items.filter((i) => i.x === x && i.y === y);
}

export function removeFloorItem(level: Level, item: Item): void {
  level.items = level.items.filter((i) => i !== item);
}

export function itemWeight(item: Item): number {
  const base = itemBase(item.baseId);
  if (item.baseId === 'corpse') return 10;
  return base.weight * item.quantity;
}
