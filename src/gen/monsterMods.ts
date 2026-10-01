import type { RNG } from '../engine/rng';
import type { Color } from '../engine/colors';
import type { Actor, Element } from '../core/actor';
import { parseDice, diceToString } from '../engine/rng';
import { adj } from '../core/text';
import { epithetName } from './names';

/** Modificador procedural de monstro: muda atributos, cor e nome. */
interface MonsterMod {
  id: string;
  /** Adjetivo (masculino) que vai depois do nome: "orc Veloz". */
  adj: string;
  minDepth: number;
  weight: number;
  color?: Color;
  apply: (m: Actor) => void;
}

function addDamage(m: Actor, extra: number): void {
  m.attacks = m.attacks.map((a) => {
    const d = parseDice(a.damage);
    return { ...a, damage: diceToString({ ...d, bonus: d.bonus + extra }) };
  });
}

function elemental(el: Element, color: Color) {
  return (m: Actor) => {
    m.attacks = m.attacks.map((a) => ({ ...a, element: el }));
    addDamage(m, 2);
    m.resist = { ...m.resist, [el]: 100 };
    m.color = color;
  };
}

export const MONSTER_MODS: MonsterMod[] = [
  { id: 'swift', adj: 'veloz', minDepth: 1, weight: 10, apply: (m) => { m.speed = Math.round(m.speed * 1.5); } },
  { id: 'giant', adj: 'gigante', minDepth: 2, weight: 8, apply: (m) => {
    m.maxHp *= 2; m.hp = m.maxHp; addDamage(m, Math.max(1, Math.round(m.level / 2))); m.speed = Math.round(m.speed * 0.9);
  } },
  { id: 'venomous', adj: 'venenoso', minDepth: 2, weight: 7, color: 'lightGreen', apply: (m) => {
    m.attacks = m.attacks.map((a) => ({ ...a, effect: a.effect ?? { status: 'poisoned', chance: 40, duration: '2d4' } }));
  } },
  { id: 'flaming', adj: 'flamejante', minDepth: 4, weight: 5, apply: elemental('fire', 'orange') },
  { id: 'frozen', adj: 'gélido', minDepth: 4, weight: 5, apply: elemental('cold', 'lightCyan') },
  { id: 'shocking', adj: 'elétrico', minDepth: 6, weight: 4, apply: elemental('lightning', 'yellow') },
  { id: 'vampiric', adj: 'vampírico', minDepth: 7, weight: 3, color: 'red', apply: (m) => { m.flags.push('lifeSteal'); } },
  { id: 'armored', adj: 'blindado', minDepth: 3, weight: 6, color: 'white', apply: (m) => { m.defense += 4; } },
  { id: 'shaman', adj: 'místico', minDepth: 3, weight: 4, color: 'lightMagenta', apply: (m) => { if (!m.flags.includes('caster')) m.flags.push('caster'); } },
  { id: 'invisible', adj: 'invisível', minDepth: 8, weight: 2, apply: (m) => { m.flags.push('invisible'); } },
  { id: 'ancient', adj: 'ancestral', minDepth: 10, weight: 3, color: 'gold', apply: (m) => {
    m.level += 3; m.maxHp = Math.round(m.maxHp * 1.5); m.hp = m.maxHp; m.accuracy += 3; m.defense += 3;
  } },
];

function applyMod(m: Actor, mod: MonsterMod): void {
  mod.apply(m);
  if (mod.color) m.color = mod.color;
  m.mods = [...(m.mods ?? []), mod.id];
  m.name = `${m.name} ${adj(mod.adj, m.gender)}`;
  m.xpValue = Math.round(m.xpValue * 1.4);
}

/** Sorteia modificadores para um monstro recém-criado (mais comuns nas profundezas). */
export function rollMonsterMods(rng: RNG, m: Actor, depth: number): void {
  if (m.flags.includes('unique')) return;
  const chance = Math.min(35, 3 + depth * 1.5);
  if (!rng.chance(chance)) return;
  const pool = MONSTER_MODS.filter((x) => x.minDepth <= depth);
  applyMod(m, rng.weighted(pool.map((x) => ({ item: x, weight: x.weight }))));
}

/**
 * Transforma um monstro em "campeão": 2–3 modificadores, nome próprio,
 * mais vida e XP, e um saque garantido ao morrer.
 */
export function makeChampion(rng: RNG, m: Actor, depth: number): void {
  const pool = MONSTER_MODS.filter((x) => x.minDepth <= depth + 2);
  const n = rng.int(2, 3);
  const chosen = rng.shuffle(pool).slice(0, n);
  for (const mod of chosen) applyMod(m, mod);
  const title = epithetName(rng);
  m.name = `${title} (${m.name})`;
  m.properName = true;
  m.flags.push('champion');
  m.maxHp = Math.round(m.maxHp * 1.5);
  m.hp = m.maxHp;
  m.xpValue *= 2;
}
