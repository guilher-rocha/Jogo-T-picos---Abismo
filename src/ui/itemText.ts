import type { Item } from '../core/item';

/** Nome de um item para mostrar ao jogador. */
export function itemName(item: Item): string {
  if (item.baseId === 'corpse') return `um cadáver de ${item.corpseName ?? 'criatura'}`;
  return 'um objeto estranho';
}
