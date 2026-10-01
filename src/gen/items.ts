import type { RNG } from '../engine/rng';
import type { Game, Level } from '../core/game';
import type { Item } from '../core/item';
import { addItem, createItem } from '../core/item';
import type { ItemBase, ItemCategory } from '../data/items';
import { ITEMS, itemBase } from '../data/items';
import { isImplemented } from '../core/consumables';
import { spawnPoints } from './populate';

/** Peso de cada categoria no sorteio de itens do chão. */
const CATEGORY_WEIGHTS: { item: ItemCategory[]; weight: number }[] = [
  { item: ['weapon'], weight: 12 },
  { item: ['launcher', 'ammo'], weight: 5 },
  { item: ['armor', 'shield', 'helm', 'gloves', 'boots', 'cloak'], weight: 13 },
  { item: ['potion'], weight: 20 },
  { item: ['scroll'], weight: 14 },
  { item: ['wand'], weight: 5 },
  { item: ['ring', 'amulet'], weight: 4 },
  { item: ['food'], weight: 10 },
  { item: ['light'], weight: 4 },
  { item: ['book'], weight: 3 },
];

/** Bases que podem aparecer numa profundidade (e cujo efeito já está implementado). */
export function basesFor(depth: number, categories?: ItemCategory[]): ItemBase[] {
  return ITEMS.filter((b) =>
    b.rarity > 0 && depth >= b.depth[0] && depth <= b.depth[1]
    && (!categories || categories.includes(b.category))
    && b.category !== 'gold' && isImplemented(b.effect),
  );
}

/** Gera um item aleatório para a profundidade (sem posição). */
export function generateItem(game: Game, rng: RNG, depth: number, categories?: ItemCategory[]): Item | null {
  let pool: ItemBase[] = [];
  for (let tries = 0; tries < 10 && pool.length === 0; tries++) {
    const cats = categories ?? rng.weighted(CATEGORY_WEIGHTS);
    pool = basesFor(depth, cats);
  }
  if (!pool.length) return null;
  const base = rng.weighted(pool.map((b) => ({ item: b, weight: b.rarity })));
  return rollItem(game, rng, base.id, depth);
}

/** Cria uma instância de uma base com quantidade/encantamento/cargas aleatórios. */
export function rollItem(game: Game, rng: RNG, baseId: string, depth: number): Item {
  const base = itemBase(baseId);
  const item = createItem(game, baseId);
  if (base.category === 'ammo') item.quantity = rng.int(8, 20);
  else if (base.id === 'dart' || base.id === 'dagger') item.quantity = base.id === 'dart' ? rng.int(4, 10) : rng.int(1, 3);
  else if (base.category === 'potion' || base.category === 'scroll') item.quantity = rng.chance(15) ? 2 : 1;
  if (base.charges) item.charges = rng.roll(base.charges);
  // Equipamento às vezes vem encantado; mais fundo, encantamentos maiores.
  if (base.damage !== undefined || base.armor !== undefined) {
    if (rng.chance(20 + depth)) item.enchant = rng.int(1, 1 + Math.floor(depth / 5));
  }
  return item;
}

/** Espalha itens e ouro pelo andar. */
export function spawnItems(game: Game, level: Level, rng: RNG, depth: number): void {
  const points = rng.shuffle(spawnPoints(level, 0));
  let pi = 0;
  const count = 3 + rng.int(0, 3) + Math.floor(depth / 5);
  for (let i = 0; i < count && pi < points.length; i++) {
    const item = generateItem(game, rng, depth);
    if (!item) continue;
    const p = points[pi++];
    item.x = p.x;
    item.y = p.y;
    addItem(level, item);
  }
  const piles = rng.int(2, 4);
  for (let i = 0; i < piles && pi < points.length; i++) {
    const p = points[pi++];
    addItem(level, createItem(game, 'gold', { x: p.x, y: p.y, quantity: rng.roll(`${depth}d8+${3 + depth}`) }));
  }
}
