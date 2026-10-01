import type { Stats, StatId } from '../core/hero';

/** Habilidade de classe ganha num certo nível. */
export interface ClassAbility {
  level: number;
  id: string;
  name: string;
  desc: string;
  /** true = ativada pelo jogador (menu de habilidades); false = passiva. */
  active: boolean;
}

export interface ClassDef {
  id: string;
  name: string;
  desc: string;
  /** Atributos base (antes da raça). */
  stats: Stats;
  hitDie: number;
  hpBase: number;
  /** Atributo de conjuração (null = não conjura). */
  castStat: StatId | null;
  mpBase: number;
  mpPerLevel: number;
  /** Ganho de precisão por nível. */
  accuracyPerLevel: number;
  /** Itens iniciais (ids de data/items.ts). */
  startingItems: string[];
  abilities: ClassAbility[];
  /** Combinações recomendadas (ids de raça) — só para a tela de criação. */
  goodRaces: string[];
}

export const CLASSES: ClassDef[] = [
  {
    id: 'warrior', name: 'Guerreiro', desc: 'Mestre das armas e armaduras. Simples, resistente e mortal de perto.',
    stats: { str: 16, dex: 12, con: 15, int: 8, wis: 10 }, hitDie: 10, hpBase: 12, castStat: null, mpBase: 0, mpPerLevel: 0,
    accuracyPerLevel: 0.9,
    startingItems: ['long_sword', 'chain_mail', 'small_shield', 'potion_heal', 'potion_heal', 'ration', 'ration', 'torch'],
    abilities: [
      { level: 1, id: 'power_strike', name: 'Golpe Poderoso', desc: 'Um ataque com o dobro de dano que leva 2 turnos.', active: true },
      { level: 5, id: 'whirlwind', name: 'Ataque Giratório', desc: 'Ataca todos os inimigos adjacentes.', active: true },
      { level: 10, id: 'second_wind', name: 'Segundo Fôlego', desc: 'Recupera 30% do HP (uma vez a cada 200 turnos).', active: true },
      { level: 15, id: 'extra_attack', name: 'Ataque Extra', desc: 'Ataques corpo a corpo custam 75% do tempo.', active: false },
      { level: 20, id: 'unshakable', name: 'Inabalável', desc: 'Imune a medo e confusão.', active: false },
    ],
    goodRaces: ['dwarf', 'half_orc', 'human'],
  },
  {
    id: 'mage', name: 'Mago', desc: 'Estudioso das artes arcanas. Frágil, mas devastador à distância.',
    stats: { str: 8, dex: 12, con: 12, int: 16, wis: 12 }, hitDie: 4, hpBase: 6, castStat: 'int', mpBase: 4, mpPerLevel: 2,
    accuracyPerLevel: 0.4,
    startingItems: ['quarterstaff', 'robe', 'potion_mana', 'potion_heal', 'scroll_identify', 'ration', 'torch'],
    abilities: [
      { level: 1, id: 'spellbook', name: 'Grimório', desc: 'Conjura magias arcanas (tecla m). Começa com Míssil Mágico.', active: false },
      { level: 5, id: 'arcane_sight', name: 'Visão Arcana', desc: 'Identifica pergaminhos ao lê-los e sente magia nos itens.', active: false },
      { level: 10, id: 'mana_shield', name: 'Escudo de Mana', desc: 'Parte do dano recebido é absorvida pelo MP.', active: false },
    ],
    goodRaces: ['elf', 'gnome', 'human'],
  },
  {
    id: 'rogue', name: 'Ladino', desc: 'Furtivo e oportunista. Ataca quem não o vê com dano triplo.',
    stats: { str: 11, dex: 16, con: 12, int: 12, wis: 10 }, hitDie: 6, hpBase: 8, castStat: null, mpBase: 0, mpPerLevel: 0,
    accuracyPerLevel: 0.7,
    startingItems: ['dagger', 'dagger', 'dagger', 'leather_armor', 'potion_heal', 'scroll_teleport', 'ration', 'torch'],
    abilities: [
      { level: 1, id: 'sneak_attack', name: 'Ataque Furtivo', desc: 'Dano ×3 contra monstros dormindo ou que não o veem.', active: false },
      { level: 1, id: 'vanish', name: 'Desaparecer', desc: 'Some nas sombras: os monstros perdem seu rastro.', active: true },
      { level: 5, id: 'trap_sense', name: 'Sentir Armadilhas', desc: 'Vê armadilhas ocultas com facilidade.', active: false },
      { level: 10, id: 'evasion', name: 'Evasão', desc: '+3 de defesa.', active: false },
    ],
    goodRaces: ['halfling', 'elf', 'human'],
  },
  {
    id: 'cleric', name: 'Clérigo', desc: 'Servo dos deuses. Cura, abençoa e destrói os mortos-vivos.',
    stats: { str: 13, dex: 10, con: 13, int: 9, wis: 16 }, hitDie: 8, hpBase: 10, castStat: 'wis', mpBase: 3, mpPerLevel: 2,
    accuracyPerLevel: 0.7,
    startingItems: ['mace', 'scale_mail', 'potion_heal', 'potion_heal', 'ration', 'ration', 'torch'],
    abilities: [
      { level: 1, id: 'prayers', name: 'Orações', desc: 'Conjura magias divinas (tecla m). Começa com Cura Leve.', active: false },
      { level: 1, id: 'turn_undead', name: 'Expulsar Mortos-vivos', desc: 'Mortos-vivos próximos fogem e sofrem dano sagrado.', active: true },
      { level: 10, id: 'divine_favor', name: 'Favor Divino', desc: 'Regenera MP mais rápido.', active: false },
    ],
    goodRaces: ['dwarf', 'human', 'halfling'],
  },
  {
    id: 'ranger', name: 'Patrulheiro', desc: 'Caçador das terras selvagens. Mestre do arco e do rastreamento.',
    stats: { str: 12, dex: 15, con: 13, int: 10, wis: 13 }, hitDie: 8, hpBase: 10, castStat: 'wis', mpBase: 1, mpPerLevel: 1,
    accuracyPerLevel: 0.8,
    startingItems: ['short_bow', 'arrow', 'short_sword', 'leather_armor', 'potion_heal', 'ration', 'ration', 'torch'],
    abilities: [
      { level: 1, id: 'archery', name: 'Arquearia', desc: '+3 de precisão com armas de disparo.', active: false },
      { level: 1, id: 'track', name: 'Rastrear', desc: 'Sente todos os monstros do andar por alguns turnos.', active: true },
      { level: 5, id: 'double_shot', name: 'Disparo Duplo', desc: 'Dispara duas flechas de uma vez.', active: true },
    ],
    goodRaces: ['elf', 'halfling', 'human'],
  },
];

export function classById(id: string): ClassDef {
  return CLASSES.find((c) => c.id === id) ?? CLASSES[0];
}
