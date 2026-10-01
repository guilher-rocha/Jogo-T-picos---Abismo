import type { Color } from '../engine/colors';
import type { Attack, Gender } from '../core/actor';

/**
 * Modelo (arquétipo) de monstro. Monstros concretos são gerados a partir destes dados.
 * Flags: 'opensDoors', 'erratic' (anda aleatoriamente às vezes), 'group' (nasce em bando).
 */
export interface MonsterTemplate {
  id: string;
  name: string;
  gender: Gender;
  glyph: string;
  color: Color;
  level: number;
  hp: string;
  speed: number;
  accuracy: number;
  defense: number;
  attacks: Attack[];
  xp: number;
  flags: string[];
  desc: string;
}

export const MONSTERS: MonsterTemplate[] = [
  {
    id: 'rat', name: 'rato', gender: 'm', glyph: 'r', color: 'brown', level: 1, hp: '1d4+1', speed: 100,
    accuracy: 1, defense: 1, attacks: [{ verb: 'morde', damage: '1d3' }], xp: 2, flags: [],
    desc: 'Um rato enorme e sarnento, de olhos vermelhos.',
  },
  {
    id: 'bat', name: 'morcego', gender: 'm', glyph: 'b', color: 'darkGray', level: 1, hp: '1d4', speed: 150,
    accuracy: 2, defense: 3, attacks: [{ verb: 'morde', damage: '1d2' }], xp: 2, flags: ['erratic'],
    desc: 'Um morcego que voa em ziguezague.',
  },
  {
    id: 'kobold', name: 'kobold', gender: 'm', glyph: 'k', color: 'lightGreen', level: 1, hp: '1d6+1', speed: 100,
    accuracy: 2, defense: 2, attacks: [{ verb: 'golpeia', damage: '1d4' }], xp: 4, flags: ['opensDoors'],
    desc: 'Um pequeno humanoide reptiliano, covarde e traiçoeiro.',
  },
  {
    id: 'jackal', name: 'chacal', gender: 'm', glyph: 'c', color: 'yellow', level: 1, hp: '1d5', speed: 110,
    accuracy: 2, defense: 2, attacks: [{ verb: 'morde', damage: '1d3' }], xp: 3, flags: ['group'],
    desc: 'Um cão selvagem que caça em matilha.',
  },
  {
    id: 'goblin', name: 'goblin', gender: 'm', glyph: 'g', color: 'green', level: 2, hp: '2d5', speed: 100,
    accuracy: 3, defense: 3, attacks: [{ verb: 'golpeia', damage: '1d6' }], xp: 6, flags: ['opensDoors'],
    desc: 'Um goblin magricela armado com uma lâmina enferrujada.',
  },
];

export function monsterTemplate(id: string): MonsterTemplate {
  const t = MONSTERS.find((m) => m.id === id);
  if (!t) throw new Error(`Monstro desconhecido: ${id}`);
  return t;
}
