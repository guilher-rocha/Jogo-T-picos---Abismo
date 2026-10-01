import type { Actor } from './actor';
import type { Game, Level } from './game';
import { newId } from './game';

/** Um item (no chão ou no inventário). Por enquanto só cadáveres (subetapa 1.5). */
export interface Item {
  id: number;
  baseId: string;
  x: number;
  y: number;
  quantity: number;
  /** Para cadáveres: de qual monstro. */
  corpseOf?: string;
  corpseName?: string;
}

export function createCorpse(game: Game, monster: Actor): Item {
  return { id: newId(game), baseId: 'corpse', x: monster.x, y: monster.y, quantity: 1, corpseOf: monster.templateId, corpseName: monster.name };
}

export function addItem(level: Level, item: Item): void {
  level.items.push(item);
}

export function itemsAt(level: Level, x: number, y: number): Item[] {
  return level.items.filter((i) => i.x === x && i.y === y);
}
