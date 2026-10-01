import type { RNG } from '../engine/rng';

/** Sílabas por "sotaque" (raça). Nomes = 2–3 sílabas combinadas. */
const SYLLABLES: Record<string, { start: string[]; mid: string[]; end: string[] }> = {
  human: { start: ['Al', 'Bre', 'Cor', 'Da', 'Ed', 'Gar', 'Hel', 'Ma', 'Ro', 'Se', 'Tor', 'Vi'], mid: ['an', 'ri', 'el', 'or', 'a', 'mi'], end: ['ric', 'na', 'do', 'win', 'ra', 'mon', 'lia', 'go'] },
  elf: { start: ['Ae', 'Ca', 'El', 'Fae', 'Gal', 'Il', 'Lae', 'Sil', 'Tha', 'Ya'], mid: ['la', 'ri', 'the', 'va', 'lin', 'nu'], end: ['dir', 'wen', 'riel', 'las', 'thil', 'ndra', 'mir'] },
  dwarf: { start: ['Bal', 'Bor', 'Dur', 'Gim', 'Grom', 'Kaz', 'Thor', 'Brun', 'Dvar'], mid: ['in', 'a', 'ur', 'om', 'ri'], end: ['in', 'dur', 'grim', 'li', 'bek', 'rak', 'mund'] },
  halfling: { start: ['Bil', 'Fro', 'Mer', 'Pip', 'Sam', 'Ros', 'Tob', 'Dai', 'Lob'], mid: ['bo', 'a', 'ri', 'li', 'o'], end: ['bo', 'do', 'ry', 'pin', 'sy', 'kins', 'wise'] },
  half_orc: { start: ['Gro', 'Kru', 'Mog', 'Thrak', 'Ug', 'Zug', 'Gor', 'Rak', 'Nar'], mid: ['ash', 'u', 'ra', 'go', 'a'], end: ['ash', 'nak', 'gul', 'mok', 'tar', 'dush', 'uk'] },
  gnome: { start: ['Bim', 'Fiz', 'Nim', 'Pod', 'Tink', 'Zan', 'Wob', 'Quil', 'Gli'], mid: ['ble', 'i', 'wi', 'o', 'pe'], end: ['wick', 'bik', 'fen', 'nock', 'zle', 'pip', 'ble'] },
  monster: { start: ['Gr', 'Kz', 'Mor', 'Ul', 'Vash', 'Zar', 'Xo', 'Thul', 'Skor'], mid: ['ak', 'og', 'ul', 'ix', 'ar', 'eth'], end: ['nak', 'goth', 'rax', 'mul', 'zug', 'thar', 'vex'] },
};

export function randomName(rng: RNG, raceId: string): string {
  const s = SYLLABLES[raceId] ?? SYLLABLES.human;
  const parts = [rng.pick(s.start)];
  if (rng.chance(45)) parts.push(rng.pick(s.mid));
  parts.push(rng.pick(s.end));
  return parts.join('');
}

const EPITHETS = [
  'o Devorador de Tochas', 'o Impiedoso', 'a Sombra Faminta', 'o Quebra-Ossos', 'o Sussurrante',
  'o Antigo', 'Olho-Rubro', 'o Profanador', 'a Fúria do Abismo', 'o Carniceiro', 'Garra-de-Ferro', 'o Insone',
];

/** "Grukk, o Devorador de Tochas" — para campeões e itens raros. */
export function epithetName(rng: RNG): string {
  return `${randomName(rng, 'monster')}, ${rng.pick(EPITHETS)}`;
}
