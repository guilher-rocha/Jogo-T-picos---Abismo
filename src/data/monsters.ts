import type { Color } from '../engine/colors';

/** Modelo (arquétipo) de monstro. Monstros concretos são gerados a partir destes dados. */
export interface MonsterTemplate {
  id: string;
  name: string;
  glyph: string;
  color: Color;
  speed: number;
}

export const MONSTERS: MonsterTemplate[] = [
  { id: 'rat', name: 'rato', glyph: 'r', color: 'brown', speed: 100 },
  { id: 'goblin', name: 'goblin', glyph: 'g', color: 'green', speed: 100 },
  { id: 'bat', name: 'morcego', glyph: 'b', color: 'darkGray', speed: 150 },
];

export function monsterTemplate(id: string): MonsterTemplate {
  const t = MONSTERS.find((m) => m.id === id);
  if (!t) throw new Error(`Monstro desconhecido: ${id}`);
  return t;
}
