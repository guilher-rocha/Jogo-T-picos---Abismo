import { affixById } from '../data/affixes';

/** Aplica o nome de um afixo ao nome do item: "espada longa" → "espada longa Flamejante do Urso". */
export function affixName(affixId: string, name: string, gender: 'm' | 'f'): string {
  const a = affixById(affixId);
  if (!a || a.artifact) return name;
  return `${name} ${a.name[gender === 'f' ? 1 : 0]}`;
}
