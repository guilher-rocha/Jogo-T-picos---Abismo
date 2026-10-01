import type { Element } from './actor';
import type { Game } from './game';
import type { StatId } from './hero';
import { allEquipped, equipped } from './inventory';
import { itemBase } from '../data/items';
import { affixById } from '../data/affixes';

/** Soma de todos os bônus vindos de equipamento, afixos e efeitos ativos. */
export interface Bonuses {
  stats: Record<StatId, number>;
  accuracy: number;
  damage: number;
  defense: number;
  light: number;
  speed: number;
  hpPct: number;
  mp: number;
  /** Resistências em % (50 = metade do dano). */
  resist: Partial<Record<Element, number>>;
  /** Dano elemental extra nos ataques corpo a corpo. */
  brands: { element: Element; damage: string }[];
  /** Roubo de vida (% do dano causado). */
  lifeSteal: number;
  flags: Set<string>;
  spellPenalty: number;
}

export function emptyBonuses(): Bonuses {
  return {
    stats: { str: 0, dex: 0, con: 0, int: 0, wis: 0 },
    accuracy: 0, damage: 0, defense: 0, light: 0, speed: 0, hpPct: 0, mp: 0,
    resist: {}, brands: [], lifeSteal: 0, flags: new Set(), spellPenalty: 0,
  };
}

function addResist(b: Bonuses, el: Element, pct: number): void {
  b.resist[el] = Math.min(100, (b.resist[el] ?? 0) + pct);
}

export function collectBonuses(game: Game): Bonuses {
  const b = emptyBonuses();
  for (const item of allEquipped(game)) {
    const base = itemBase(item.baseId);
    const ench = item.enchant;
    if (base.spellPenalty) b.spellPenalty += base.spellPenalty;
    // Efeitos fixos de anéis e amuletos (o encantamento aumenta o efeito).
    switch (base.effect) {
      case 'protection': b.defense += 2 + ench; break;
      case 'str': b.stats.str += 1 + Math.max(0, ench); break;
      case 'regen': b.flags.add('regen'); break;
      case 'light': b.light += 1; break;
      case 'resist_fire': addResist(b, 'fire', 50); break;
      case 'life': b.hpPct += 15 + 5 * ench; break;
      case 'mind': b.mp += 5 + 2 * ench; b.flags.add('confuseResist'); break;
    }
    // Armaduras: o encantamento soma à defesa. Armas: a precisão e o dano são tratados no ataque.
    if (base.armor !== undefined) b.defense += ench;
    for (const id of item.affixes) {
      const a = affixById(id);
      if (!a) continue;
      const bo = a.bonus;
      if (bo.accuracy) b.accuracy += bo.accuracy;
      if (bo.damage) b.damage += bo.damage;
      if (bo.defense) b.defense += bo.defense;
      if (bo.light) b.light += bo.light;
      if (bo.speed) b.speed += bo.speed;
      if (bo.hpPct) b.hpPct += bo.hpPct;
      if (bo.mp) b.mp += bo.mp;
      if (bo.lifeSteal) b.lifeSteal += bo.lifeSteal;
      if (bo.stat) b.stats[bo.stat] += bo.statAmount ?? 1;
      if (bo.resist) addResist(b, bo.resist, bo.resistPct ?? 50);
      if (bo.brand) b.brands.push({ element: bo.brand, damage: bo.brandDamage ?? '1d6' });
      if (bo.flag) b.flags.add(bo.flag);
    }
  }
  if (game.hero.nutrition < 150) b.stats.str -= 2;
  const light = equipped(game, 'light');
  if (light && (light.fuel === undefined || light.fuel > 0)) b.light += itemBase(light.baseId).light ?? 0;
  return b;
}
