import type { Color } from '../engine/colors';

export type GeneratorId = 'rogue' | 'bsp' | 'caves';

/** Tema visual e de geração de uma faixa de andares. */
export interface DepthTheme {
  id: string;
  name: string;
  depths: [number, number];
  wall: Color;
  floor: Color;
  generators: { item: GeneratorId; weight: number }[];
}

export const THEMES: DepthTheme[] = [
  { id: 'crypt', name: 'Cripta Superior', depths: [1, 4], wall: 'lightGray', floor: 'lightGray',
    generators: [{ item: 'rogue', weight: 70 }, { item: 'bsp', weight: 30 }] },
  { id: 'mines', name: 'Minas Abandonadas', depths: [5, 8], wall: 'brown', floor: 'lightGray',
    generators: [{ item: 'bsp', weight: 45 }, { item: 'rogue', weight: 20 }, { item: 'caves', weight: 35 }] },
  { id: 'fungal', name: 'Cavernas Fúngicas', depths: [9, 12], wall: 'green', floor: 'green',
    generators: [{ item: 'caves', weight: 60 }, { item: 'bsp', weight: 40 }] },
  { id: 'fortress', name: 'Fortaleza Afundada', depths: [13, 16], wall: 'lightBlue', floor: 'lightGray',
    generators: [{ item: 'bsp', weight: 70 }, { item: 'rogue', weight: 30 }] },
  { id: 'abyss', name: 'O Abismo', depths: [17, 20], wall: 'red', floor: 'lightGray',
    generators: [{ item: 'caves', weight: 50 }, { item: 'bsp', weight: 50 }] },
];

export function themeForDepth(depth: number): DepthTheme {
  return THEMES.find((t) => depth >= t.depths[0] && depth <= t.depths[1]) ?? THEMES[THEMES.length - 1];
}

export function themeById(id: string): DepthTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** Profundidade do andar final (onde está o amuleto). */
export const MAX_DEPTH = 20;
