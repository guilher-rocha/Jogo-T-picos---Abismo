import type { Game } from './game';
import type { Item } from './item';
import { itemBase } from '../data/items';
import { monsterTemplate } from '../data/monsters';
import type { Color } from '../engine/colors';
import { CATEGORY_GLYPH } from '../data/items';
import { affixName } from './affixText';

const RARITY_COLOR: Record<string, Color> = { common: 'white', magic: 'lightBlue', rare: 'yellow', legendary: 'orange' };

export type Article = 'a' | 'the' | 'none';

/** Nome "verdadeiro" ou aparente (consumíveis não identificados) da base. */
function baseName(game: Game | undefined, item: Item, plural: boolean): { name: string; gender: 'm' | 'f' } {
  const base = itemBase(item.baseId);
  void game; // a identificação de consumíveis (aparências aleatórias) entra na Etapa 4
  if (item.baseId === 'corpse') return { name: plural ? 'cadáveres' : `cadáver de ${item.corpseName ?? 'criatura'}`, gender: 'm' };
  const name = plural ? base.plural ?? pluralize(base.name) : base.name;
  return { name, gender: base.gender };
}

export function pluralize(name: string): string {
  // Pluraliza só a primeira palavra ("poção de cura" → "poções de cura").
  const [first, ...rest] = name.split(' ');
  let p: string;
  if (first.endsWith('ão')) p = `${first.slice(0, -2)}ões`;
  else if (first.endsWith('l')) p = `${first.slice(0, -1)}is`;
  else if (/[rsz]$/.test(first)) p = `${first}es`;
  else if (first.endsWith('m')) p = `${first.slice(0, -1)}ns`;
  else p = `${first}s`;
  return [p, ...rest].join(' ');
}

/**
 * Nome completo de um item para o jogador:
 * "uma espada longa +1 Flamejante", "3 poções de cura", "o Arco de Korvath".
 */
export function itemName(game: Game | undefined, item: Item, article: Article = 'a'): string {
  const plural = item.quantity > 1;
  const { name, gender } = baseName(game, item, plural);
  let full = name;
  if (item.identified) {
    if (item.enchant !== 0) full += ` ${item.enchant > 0 ? '+' : ''}${item.enchant}`;
    for (const a of item.affixes) full = affixName(a, full, gender);
    // Raros e lendários: o nome próprio vem na frente, sem artigo.
    if (item.properName) return `${item.properName} (${full})`;
  } else if (item.rarity !== 'common' || item.enchant !== 0 || item.cursed) {
    const word = item.rarity === 'legendary' ? 'lendári' : item.rarity === 'rare' ? 'rar' : 'mágic';
    full += ` (${word}${gender === 'f' ? 'a' : 'o'}?)`;
  }
  const base = itemBase(item.baseId);
  if (base.category === 'wand' && item.identified && item.charges !== undefined) full += ` (${item.charges})`;
  if (base.category === 'light' && item.fuel !== undefined && item.fuel <= 200) full += ' (quase apagando)';
  if (item.cursed && item.identified) full += ' {amaldiçoad' + (gender === 'f' ? 'a' : 'o') + '}';
  if (plural) return `${item.quantity} ${full}`;
  if (article === 'none') return full;
  if (article === 'the') return `${gender === 'f' ? 'a' : 'o'} ${full}`;
  return `${gender === 'f' ? 'uma' : 'um'} ${full}`;
}

export function itemColor(item: Item): Color {
  const base = itemBase(item.baseId);
  if (item.baseId === 'corpse' && item.corpseOf) return monsterTemplate(item.corpseOf).color;
  if (item.rarity !== 'common' && item.identified) return RARITY_COLOR[item.rarity];
  return base.color;
}

export function itemGlyph(item: Item): string {
  return CATEGORY_GLYPH[itemBase(item.baseId).category];
}
