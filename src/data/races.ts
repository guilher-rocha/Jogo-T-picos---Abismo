import type { Stats } from '../core/hero';

/**
 * Raças jogáveis. `mods` soma aos atributos da classe.
 * Traços (flags): 'poisonResist', 'sleepResist', 'confuseResist', 'regen', 'stealthy',
 * 'lucky', 'rage', 'wandSense', 'secretSense', 'darkvision'.
 */
export interface RaceDef {
  id: string;
  name: string;
  desc: string;
  mods: Stats;
  /** Multiplicador de XP ganho. */
  xpMult: number;
  /** Multiplicador de HP máximo. */
  hpMult: number;
  speed: number;
  /** Bônus no raio de luz/visão. */
  light: number;
  /** Multiplicador da capacidade de carga. */
  carry: number;
  traits: string[];
  /** Descrição curta dos traços para a tela de criação. */
  traitText: string;
}

export const RACES: RaceDef[] = [
  {
    id: 'human', name: 'Humano', desc: 'Versáteis e ambiciosos, aprendem mais rápido que qualquer outro povo.',
    mods: { str: 0, dex: 0, con: 0, int: 0, wis: 0 }, xpMult: 1.15, hpMult: 1, speed: 100, light: 0, carry: 1, traits: [],
    traitText: '+15% de XP ganho.',
  },
  {
    id: 'elf', name: 'Elfo', desc: 'Ágeis e perspicazes, enxergam longe na escuridão, mas são frágeis.',
    mods: { str: -1, dex: 2, con: -1, int: 1, wis: 0 }, xpMult: 1, hpMult: 0.9, speed: 100, light: 1, carry: 0.9, traits: ['sleepResist', 'darkvision'],
    traitText: 'Visão +1, resiste a sono e paralisia, -10% HP.',
  },
  {
    id: 'dwarf', name: 'Anão', desc: 'Robustos e teimosos, nascidos sob a montanha. Um pouco lentos.',
    mods: { str: 1, dex: -1, con: 2, int: 0, wis: -1 }, xpMult: 1, hpMult: 1.1, speed: 90, light: 0, carry: 1.2, traits: ['poisonResist', 'secretSense'],
    traitText: 'Resiste a veneno, acha portas secretas, +10% HP, velocidade 90.',
  },
  {
    id: 'halfling', name: 'Halfling', desc: 'Pequenos, silenciosos e incrivelmente sortudos.',
    mods: { str: -2, dex: 2, con: 0, int: 0, wis: 1 }, xpMult: 1, hpMult: 0.9, speed: 100, light: 0, carry: 0.8, traits: ['stealthy', 'lucky'],
    traitText: 'Furtivo, sorte em críticos e saques, carrega menos.',
  },
  {
    id: 'half_orc', name: 'Meio-Orc', desc: 'Fortes e ferozes; o sangue orc ferve quando estão em perigo.',
    mods: { str: 2, dex: 0, con: 1, int: -2, wis: -1 }, xpMult: 1, hpMult: 1.1, speed: 100, light: 0, carry: 1.1, traits: ['regen', 'rage'],
    traitText: 'Regenera rápido, fúria (+dano) com HP abaixo de 25%.',
  },
  {
    id: 'gnome', name: 'Gnomo', desc: 'Curiosos e engenhosos, têm afinidade natural com a magia.',
    mods: { str: -1, dex: 1, con: 0, int: 2, wis: 0 }, xpMult: 1, hpMult: 0.95, speed: 100, light: 0, carry: 0.9, traits: ['wandSense', 'confuseResist'],
    traitText: 'Identifica varinhas ao usar, -falha de magia, resiste a confusão.',
  },
];

export function raceById(id: string): RaceDef {
  return RACES.find((r) => r.id === id) ?? RACES[0];
}
