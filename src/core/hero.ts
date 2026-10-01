import type { RNG } from '../engine/rng';
import type { Game } from './game';
import { emit, message } from './game';
import { classById } from '../data/classes';
import { raceById } from '../data/races';
import { STARTING_SPELLS } from '../data/spells';
import type { Item } from './item';
import type { EquipSlot } from '../data/items';
import { itemBase } from '../data/items';
import { collectBonuses } from './bonuses';
import type { Bonuses } from './bonuses';
import { burden, equipped } from './inventory';
import { diceToString, parseDice } from '../engine/rng';

export type StatId = 'str' | 'dex' | 'con' | 'int' | 'wis';
export type Stats = Record<StatId, number>;

export const STAT_IDS: StatId[] = ['str', 'dex', 'con', 'int', 'wis'];
export const STAT_ABBR: Record<StatId, string> = { str: 'FOR', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB' };
export const STAT_NAME: Record<StatId, string> = { str: 'Força', dex: 'Destreza', con: 'Constituição', int: 'Inteligência', wis: 'Sabedoria' };

export const MAX_LEVEL = 30;
/** Sem fonte de luz, enxerga só as casas vizinhas. */
export const BASE_LIGHT = 1;

/** Dados persistentes do personagem do jogador (o Actor guarda só os valores derivados). */
export interface Hero {
  name: string;
  raceId: string;
  classId: string;
  /** Atributos atuais (classe + raça + aumentos). */
  stats: Stats;
  level: number;
  xp: number;
  /** HP rolado em cada nível a partir do 2 (índice 0 = nível 2). */
  hpRolls: number[];
  /** Pontos de atributo para distribuir (+1 a cada 4 níveis). */
  statPoints: number;
  gold: number;
  kills: number;
  /** Turno em que cada habilidade volta a ficar disponível. */
  cooldowns: Record<string, number>;
  /** Magias conhecidas (ids). */
  spells: string[];
  inventory: Item[];
  /** Nível de saciedade (fome). */
  nutrition: number;
  /** Slot → id do item equipado (o item continua no inventário). */
  equipment: Partial<Record<EquipSlot, number>>;
}

/** Modificador de atributo estilo D&D: (valor − 10) / 2, arredondado para baixo. */
export function statMod(value: number): number {
  return Math.floor((value - 10) / 2);
}

/** XP total necessário para alcançar o nível L. */
export function xpForLevel(L: number): number {
  if (L <= 1) return 0;
  return Math.round(10 * Math.pow(L - 1, 2.2));
}

export function createHero(name: string, raceId: string, classId: string, rng?: RNG): Hero {
  const cls = classById(classId);
  const race = raceById(raceId);
  const stats = {} as Stats;
  for (const s of [...Object.keys(cls.stats)] as StatId[]) {
    // Pequena variação aleatória opcional (rerrolar na criação).
    const variance = rng ? rng.int(-1, 2) : 0;
    stats[s] = Math.max(3, cls.stats[s] + race.mods[s] + variance);
  }
  return {
    name, raceId, classId, stats, level: 1, xp: 0, hpRolls: [], statPoints: 0, gold: 0, kills: 0, cooldowns: {},
    spells: [...(STARTING_SPELLS[classId] ?? [])],
    inventory: [],
    nutrition: 3000,
    equipment: {},
  };
}

/** Atributo efetivo (base + bônus de equipamento). */
export function effectiveStat(game: Game, s: StatId, bonuses?: Bonuses): number {
  return game.hero.stats[s] + (bonuses ?? collectBonuses(game)).stats[s];
}

/** Recalcula os valores derivados do jogador (HP/MP máximos, precisão, defesa...). */
export function recalcPlayer(game: Game): void {
  const hero = game.hero;
  const p = game.player;
  const cls = classById(hero.classId);
  const race = raceById(hero.raceId);
  const L = hero.level;
  const bon = collectBonuses(game);
  const m = (s: StatId) => statMod(hero.stats[s] + bon.stats[s]);

  const hp = (cls.hpBase + hero.hpRolls.reduce((a, b) => a + b, 0) + m('con') * L) * race.hpMult * (1 + bon.hpPct / 100);
  const oldMax = p.maxHp;
  p.maxHp = Math.max(L, Math.round(hp));
  // Ganhar HP máximo também cura a diferença.
  if (p.maxHp > oldMax && oldMax > 0) p.hp += p.maxHp - oldMax;
  p.hp = Math.min(p.hp, p.maxHp);

  const oldMp = p.maxMp;
  p.maxMp = cls.castStat ? Math.max(0, cls.mpBase + (cls.mpPerLevel + Math.max(0, m(cls.castStat))) * L) + bon.mp : bon.mp;
  if (p.maxMp > oldMp && oldMp > 0) p.mp += p.maxMp - oldMp;
  p.mp = Math.min(p.mp, p.maxMp);

  // Arma: dano da base + encantamento + FOR (ou DES para armas leves).
  const weapon = equipped(game, 'weapon');
  const wbase = weapon ? itemBase(weapon.baseId) : undefined;
  const finesse = !!wbase?.finesse && m('dex') > m('str');
  const statBonus = finesse ? m('dex') : m('str');
  const ench = weapon?.enchant ?? 0;
  let dice = parseDice(wbase && wbase.category === 'weapon' ? wbase.damage ?? '1d2' : wbase ? '1d2' : '1d3');
  dice = { ...dice, bonus: dice.bonus + statBonus + ench + bon.damage };
  p.accuracy = Math.floor(L * cls.accuracyPerLevel) + statBonus + ench + bon.accuracy;
  // Armadura: soma de todas as peças equipadas.
  let armor = 0;
  for (const slot of ['body', 'offhand', 'head', 'hands', 'feet', 'cloak'] as const) {
    const it = equipped(game, slot);
    if (it) armor += itemBase(it.baseId).armor ?? 0;
  }
  p.defense = 2 + m('dex') + armor + bon.defense + (hero.classId === 'rogue' && L >= 10 ? 3 : 0);
  p.attacks = [{ verb: wbase && wbase.category === 'weapon' ? 'acerta' : 'soca', damage: diceToString(dice) }];
  const load = burden(game);
  p.speed = race.speed + bon.speed - (load >= 1 ? 25 : 0);
  p.light = BASE_LIGHT + race.light + bon.light;
  p.level = L;
  p.flags = [...bon.flags, ...race.traits];
  p.resist = { ...bon.resist };
  if (race.traits.includes('poisonResist')) p.resist.poison = Math.max(p.resist.poison ?? 0, 50);
}

/** Ganha XP (com o bônus da raça) e sobe de nível se for o caso. */
export function gainXp(game: Game, amount: number): void {
  const hero = game.hero;
  const gain = Math.max(1, Math.round(amount * raceById(hero.raceId).xpMult));
  hero.xp += gain;
  while (hero.level < MAX_LEVEL && hero.xp >= xpForLevel(hero.level + 1)) levelUp(game);
}

/** XP por matar um monstro: escala com a diferença de nível. */
export function killXp(monsterXp: number, monsterLevel: number, heroLevel: number): number {
  const ratio = Math.max(0.25, Math.min(2, monsterLevel / heroLevel));
  return Math.max(1, Math.round(monsterXp * ratio));
}

function levelUp(game: Game): void {
  const hero = game.hero;
  const cls = classById(hero.classId);
  hero.level++;
  // Rola o dado de vida (no mínimo metade do dado, para não punir demais o azar).
  const roll = Math.max(Math.ceil(cls.hitDie / 2), game.rng.combat.int(1, cls.hitDie));
  hero.hpRolls.push(roll);
  if (hero.level % 4 === 0) hero.statPoints++;
  recalcPlayer(game);
  message(game, `Você chegou ao nível ${hero.level}!`, 'gold');
  emit(game, { type: 'levelUp', x: game.player.x, y: game.player.y });
  if (hero.level % 4 === 0) message(game, 'Você pode aumentar um atributo (tecla C).', 'gold');
  for (const ab of cls.abilities.filter((a) => a.level === hero.level)) {
    message(game, `Nova habilidade: ${ab.name} — ${ab.desc}`, 'lightCyan');
  }
}

/** Gasta um ponto de atributo. */
export function raiseStat(game: Game, stat: StatId): boolean {
  if (game.hero.statPoints <= 0) return false;
  game.hero.statPoints--;
  game.hero.stats[stat]++;
  recalcPlayer(game);
  message(game, `Sua ${STAT_NAME[stat].toLowerCase()} aumenta!`, 'gold');
  return true;
}
