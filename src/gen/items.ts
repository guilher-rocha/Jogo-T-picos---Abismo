import type { RNG } from '../engine/rng';
import type { Game, Level } from '../core/game';
import type { Item } from '../core/item';
import { addItem, createItem } from '../core/item';
import type { ItemBase, ItemCategory } from '../data/items';
import { ITEMS, itemBase } from '../data/items';
import { isImplemented } from '../core/consumables';
import { spawnPoints } from './populate';
import type { AffixDef } from '../data/affixes';
import { AFFIXES, ARTIFACTS } from '../data/affixes';
import { randomName } from './names';
import { generateSpell } from './spells';

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
  // Tomos: metade contém uma magia gerada proceduralmente.
  if (base.category === 'book' && rng.chance(50)) {
    const spell = generateSpell(rng, depth, base.effect === 'learn_divine' ? 'divine' : 'arcane');
    game.customSpells = [...(game.customSpells ?? []), spell];
    item.spellId = spell.id;
  }
  applyRarity(game, rng, item, depth);
  return item;
}

/** Grupo do item para escolher afixos. */
export function affixGroup(baseId: string): string | null {
  const c = itemBase(baseId).category;
  if (c === 'weapon') return 'weapon';
  if (c === 'launcher') return 'launcher';
  if (['armor', 'shield', 'helm', 'gloves', 'boots', 'cloak'].includes(c)) return 'armor';
  if (c === 'ring' || c === 'amulet') return 'jewelry';
  return null;
}

function pickAffixes(rng: RNG, group: string, depth: number, count: number, bad: boolean): string[] {
  const chosen: AffixDef[] = [];
  for (let i = 0; i < count; i++) {
    const pool = AFFIXES.filter((a) => !a.artifact && !!a.bad === bad && a.applies.includes(group) && a.minLevel <= depth
      && !chosen.some((c) => c.id === a.id || (c.kind === 'prefix' && a.kind === 'prefix' && chosen.filter((x) => x.kind === 'prefix').length >= 2)));
    if (!pool.length) break;
    chosen.push(rng.weighted(pool.map((a) => ({ item: a, weight: a.weight }))));
  }
  // Prefixos (adjetivos) antes dos sufixos ("espada Flamejante do Urso").
  chosen.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'prefix' ? -1 : 1));
  return chosen.map((a) => a.id);
}

const RARE_NOUNS = ['Fúria', 'Ruína', 'Sussurro', 'Lamento', 'Juramento', 'Presa', 'Sombra', 'Glória', 'Canção', 'Promessa', 'Ira', 'Vigília'];

/**
 * Sorteia a raridade de um equipamento:
 * comum (talvez encantado) · mágico (1–2 afixos) · raro (3–4 afixos + nome) · lendário (artefato único).
 * Às vezes o item é amaldiçoado (encantamento negativo + afixo ruim).
 */
export function applyRarity(game: Game, rng: RNG, item: Item, depth: number): void {
  const group = affixGroup(item.baseId);
  if (!group) return;
  const base = itemBase(item.baseId);
  // Artefato lendário (só um de cada por partida).
  if (depth >= 5 && rng.chance(1 + depth / 10)) {
    const options = ARTIFACTS.filter((a) => a.minDepth <= depth && !game.artifactsFound.includes(a.id));
    if (options.length) {
      const art = rng.pick(options);
      game.artifactsFound.push(art.id);
      Object.assign(item, { baseId: art.baseId, enchant: art.enchant, affixes: [...art.affixes], rarity: 'legendary', properName: art.name, identified: false, quantity: 1 });
      return;
    }
  }
  if (rng.chance(8)) {
    item.cursed = true;
    item.enchant = -rng.int(1, 3);
    item.affixes = rng.chance(60) ? pickAffixes(rng, group, depth, 1, true) : [];
    item.rarity = 'magic';
    item.identified = false;
    return;
  }
  const roll = rng.next() * 100;
  if (roll < 5 + depth / 2) {
    item.rarity = 'rare';
    item.affixes = pickAffixes(rng, group, depth, rng.int(3, 4), false);
    item.enchant = rng.int(1, 2 + Math.floor(depth / 5));
    item.properName = `${rng.pick(RARE_NOUNS)} de ${randomName(rng, 'monster')}`;
  } else if (roll < 25 + depth) {
    item.rarity = 'magic';
    item.affixes = pickAffixes(rng, group, depth, rng.chance(35) ? 2 : 1, false);
    if (rng.chance(40)) item.enchant = rng.int(1, 1 + Math.floor(depth / 6));
  } else if ((base.damage !== undefined || base.armor !== undefined) && rng.chance(15 + depth)) {
    item.enchant = rng.int(1, 1 + Math.floor(depth / 5));
  }
  // Itens com algo especial começam desconhecidos (revelados ao equipar ou identificar).
  if (item.rarity !== 'common' || item.enchant !== 0) item.identified = false;
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
