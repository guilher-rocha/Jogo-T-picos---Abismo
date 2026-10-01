import type { Actor } from './actor';

/** "o rato", "a aranha", "você". */
export function theName(a: Actor): string {
  if (a.isPlayer) return 'você';
  if (a.properName) return a.name;
  return `${a.gender === 'f' ? 'a' : 'o'} ${a.name}`;
}

/** "um rato", "uma aranha". */
export function aName(a: Actor): string {
  if (a.isPlayer) return 'você';
  if (a.properName) return a.name;
  return `${a.gender === 'f' ? 'uma' : 'um'} ${a.name}`;
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Contração "de + o/a" → "do/da" ("morto por um rato" usa aName). */
export function ofThe(a: Actor): string {
  if (a.isPlayer) return 'de você';
  return `${a.gender === 'f' ? 'da' : 'do'} ${a.name}`;
}

/** Adjetivo concordando em gênero: adj('ferido', 'f') → "ferida". */
export function adj(masc: string, g: 'm' | 'f'): string {
  if (g === 'm') return masc;
  return masc.endsWith('o') ? `${masc.slice(0, -1)}a` : masc;
}

/** Descrição do estado de saúde a partir da fração de HP. */
export function healthDesc(a: Actor): string {
  const f = a.hp / a.maxHp;
  if (f >= 1) return adj('ileso', a.gender);
  if (f > 0.66) return adj('arranhado', a.gender);
  if (f > 0.33) return adj('ferido', a.gender);
  if (f > 0.1) return adj('muito ferido', a.gender);
  return adj('quase morto', a.gender);
}
