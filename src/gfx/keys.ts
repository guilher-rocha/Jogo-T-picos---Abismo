/**
 * Nomes (chaves) dos sprites. Fonte única: o construtor do atlas e o desenho do mapa usam as mesmas funções.
 * (Arquivo leve: não importa nenhuma arte, para as telas poderem usá-lo sem puxar o gerador de sprites.)
 */
export const K = {
  floor: (style: string, v: number) => `floor:${style}:${v}`,
  corr: (style: string, v: number) => `corr:${style}:${v}`,
  face: (style: string, v: number) => `face:${style}:${v}`,
  roof: (style: string, v: number) => `roof:${style}:${v}`,
  rim: (style: string, part: string) => `rim:${style}:${part}`,
  prop: (style: string, name: string) => `prop:${style}:${name}`,
  water: 'water',
  lava: 'lava',
  hero: (race: string, cls: string) => `hero:${race}:${cls}`,
  mon: (id: string) => `mon:${id}`,
  item: (id: string) => `item:${id}`,
  /** Item pela aparência sorteada (poções, varinhas, anéis, amuletos): `look:potion:borbulhante violeta`. */
  look: (cat: string, look: string) => `look:${cat}:${look}`,
  corpse: (color: string) => `corpse:${color}`,
  fx: (name: string) => `fx:${name}`,
  /** Telas de abertura e de fim: `logo`, `gameover`, `victory`, `tombstone`. */
  ui: (name: string) => `ui:${name}`,
};
