import type { RNG } from '../engine/rng';
import type { Color } from '../engine/colors';
import type { Element } from '../core/actor';
import type { SpellDef, SpellEffect, SpellSchool, SpellShape } from '../data/spells';
import { randomName } from './names';

/** Forma: substantivo (com gênero) e multiplicadores de custo/poder. */
const SHAPES: Record<'bolt' | 'beam' | 'ball', { nouns: [string, 'm' | 'f'][]; cost: number; power: number }> = {
  bolt: { nouns: [['Dardo', 'm'], ['Seta', 'f'], ['Lança', 'f'], ['Projétil', 'm']], cost: 1, power: 1 },
  beam: { nouns: [['Raio', 'm'], ['Feixe', 'm'], ['Torrente', 'f']], cost: 1.3, power: 0.85 },
  ball: { nouns: [['Esfera', 'f'], ['Nuvem', 'f'], ['Explosão', 'f'], ['Orbe', 'm']], cost: 1.6, power: 0.75 },
};

/** Elementos por escola, com adjetivo (m/f) e cor. */
const ELEMENTS: Record<SpellSchool, { el: Element; adj: [string, string]; color: Color }[]> = {
  arcane: [
    { el: 'fire', adj: ['Flamejante', 'Flamejante'], color: 'orange' },
    { el: 'cold', adj: ['Gélido', 'Gélida'], color: 'lightCyan' },
    { el: 'lightning', adj: ['Trovejante', 'Trovejante'], color: 'yellow' },
    { el: 'acid', adj: ['Ácido', 'Ácida'], color: 'lightGreen' },
    { el: 'poison', adj: ['Pestilento', 'Pestilenta'], color: 'green' },
    { el: 'arcane', adj: ['Arcano', 'Arcana'], color: 'lightMagenta' },
    { el: 'shadow', adj: ['Sombrio', 'Sombria'], color: 'magenta' },
  ],
  divine: [
    { el: 'holy', adj: ['Sagrado', 'Sagrada'], color: 'white' },
    { el: 'fire', adj: ['Purificador', 'Purificadora'], color: 'yellow' },
    { el: 'lightning', adj: ['Celestial', 'Celestial'], color: 'lightCyan' },
  ],
};

const MODIFIERS: { id: string; adj: [string, string]; cost: number; power: number; range: number }[] = [
  { id: 'potent', adj: ['Potente', 'Potente'], cost: 1.4, power: 1.5, range: 0 },
  { id: 'frugal', adj: ['Econômico', 'Econômica'], cost: 0.7, power: 0.8, range: 0 },
  { id: 'far', adj: ['Distante', 'Distante'], cost: 1.1, power: 1, range: 5 },
];

/** Efeitos não-dano que também podem ser gerados (bolt). */
const STATUS_EFFECTS: { effect: SpellEffect; noun: [string, 'm' | 'f']; color: Color; weight: number }[] = [
  { effect: 'slow', noun: ['Grilhão', 'm'], color: 'lightGray', weight: 3 },
  { effect: 'sleep', noun: ['Canção de Ninar', 'f'], color: 'lightBlue', weight: 2 },
  { effect: 'fear', noun: ['Visão Aterradora', 'f'], color: 'darkGray', weight: 2 },
];

/**
 * Gera uma magia por componentes: forma (dardo/raio/esfera) × elemento × modificador.
 * O custo e o poder são calculados a partir do nível, com teto de poder por nível.
 */
export function generateSpell(rng: RNG, depth: number, school: SpellSchool): SpellDef {
  const level = Math.max(1, Math.min(20, depth + rng.int(-1, 3)));
  const owner = randomName(rng, 'monster');
  const id = `gen_${school}_${level}_${owner.toLowerCase()}_${rng.int(0, 999999)}`;
  // 25% das magias geradas são de status (sem dano).
  if (rng.chance(25)) {
    const st = rng.weighted(STATUS_EFFECTS.map((s) => ({ item: s, weight: s.weight })));
    return {
      id, name: `${st.noun[0]} de ${owner}`, school, level, cost: Math.max(2, Math.round(2 + level * 0.6)),
      shape: 'bolt', effect: st.effect, range: 10, fail: Math.min(60, 18 + level * 2), color: st.color,
      desc: `Magia ${school === 'arcane' ? 'arcana' : 'divina'} procedural (${st.effect === 'slow' ? 'lentidão' : st.effect === 'sleep' ? 'sono' : 'medo'}).`,
      generated: true, duration: `2d6+${4 + Math.floor(level / 2)}`,
    };
  }
  const shapeId = rng.weighted<'bolt' | 'beam' | 'ball'>([{ item: 'bolt', weight: 45 }, { item: 'beam', weight: 25 }, { item: 'ball', weight: 30 }]);
  const shape = SHAPES[shapeId];
  const [noun, gender] = rng.pick(shape.nouns);
  const el = rng.pick(ELEMENTS[school]);
  const mod = rng.chance(40) ? rng.pick(MODIFIERS) : undefined;
  const powerMult = shape.power * (mod?.power ?? 1);
  const dice = Math.max(2, Math.round((2 + level / 2) * powerMult));
  const cost = Math.max(2, Math.round((3 + level * 1.1) * shape.cost * (mod?.cost ?? 1)));
  const g = gender === 'f' ? 1 : 0;
  const name = `${noun} ${el.adj[g]}${mod ? ` ${mod.adj[g]}` : ''} de ${owner}`;
  const shapeWord = shapeId === 'bolt' ? 'projétil' : shapeId === 'beam' ? 'raio que atravessa' : 'explosão em área';
  return {
    id, name, school, level, cost,
    shape: shapeId as SpellShape, effect: 'damage', element: el.el,
    power: `${dice}d6`, perLevel: 2, radius: shapeId === 'ball' ? (level >= 10 ? 2 : 1) : undefined,
    range: 10 + (mod?.range ?? 0), fail: Math.min(60, 18 + level * 2), color: el.color,
    desc: `${capitalizeFirst(shapeWord)} de ${ELEMENT_NAMES[el.el]} (${dice}d6).`, generated: true,
  };
}

const ELEMENT_NAMES: Partial<Record<Element, string>> = {
  fire: 'fogo', cold: 'gelo', lightning: 'eletricidade', acid: 'ácido', poison: 'veneno', arcane: 'energia arcana', shadow: 'sombras', holy: 'luz sagrada',
};

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
