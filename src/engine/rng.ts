/**
 * Gerador de números aleatórios com seed (mulberry32).
 * Todo o estado é um único inteiro de 32 bits, então pode ser salvo/restaurado no save.
 * NUNCA use Math.random() na lógica do jogo.
 */
export class RNG {
  state: number;

  constructor(seed: number | string) {
    this.state = typeof seed === 'string' ? hashString(seed) : seed >>> 0;
  }

  /** Float em [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Inteiro em [min, max] (inclusivo). */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** true com probabilidade `percent`% (0–100). */
  chance(percent: number): boolean {
    return this.next() * 100 < percent;
  }

  pick<T>(list: readonly T[]): T {
    if (list.length === 0) throw new Error('pick() em lista vazia');
    return list[Math.floor(this.next() * list.length)];
  }

  /** Escolha ponderada: cada item tem um peso >= 0. */
  weighted<T>(entries: readonly { item: T; weight: number }[]): T {
    const total = entries.reduce((s, e) => s + Math.max(0, e.weight), 0);
    if (total <= 0) throw new Error('weighted() sem pesos positivos');
    let r = this.next() * total;
    for (const e of entries) {
      r -= Math.max(0, e.weight);
      if (r < 0) return e.item;
    }
    return entries[entries.length - 1].item;
  }

  /** Embaralha uma cópia da lista (Fisher-Yates). */
  shuffle<T>(list: readonly T[]): T[] {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** Rola dados em notação "XdY+Z" (também aceita "XdY-Z", "dY", "Z"). */
  roll(expr: string): number {
    const d = parseDice(expr);
    let total = d.bonus;
    for (let i = 0; i < d.count; i++) total += this.int(1, d.sides);
    return total;
  }

  /** Cria um RNG derivado e independente (para separar "fluxos": mapa, combate, loot...). */
  fork(label: string): RNG {
    return new RNG((hashString(label) ^ this.int(0, 0x7fffffff)) >>> 0);
  }
}

export interface Dice {
  count: number;
  sides: number;
  bonus: number;
}

export function parseDice(expr: string): Dice {
  const m = /^\s*(\d*)d(\d+)\s*([+-]\s*\d+)?\s*$/i.exec(expr);
  if (m) {
    return {
      count: m[1] === '' ? 1 : Number(m[1]),
      sides: Number(m[2]),
      bonus: m[3] ? Number(m[3].replace(/\s/g, '')) : 0,
    };
  }
  const n = Number(expr);
  if (!Number.isNaN(n)) return { count: 0, sides: 0, bonus: n };
  throw new Error(`Notação de dados inválida: ${expr}`);
}

export function diceToString(d: Dice): string {
  if (d.count === 0) return String(d.bonus);
  const b = d.bonus === 0 ? '' : d.bonus > 0 ? `+${d.bonus}` : String(d.bonus);
  return `${d.count}d${d.sides}${b}`;
}

export function diceAverage(d: Dice): number {
  return d.count * (d.sides + 1) / 2 + d.bonus;
}

/** Hash de string para seed (FNV-1a 32 bits). */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Seed "nova" para uma partida, baseada no relógio (fora da lógica do jogo). */
export function freshSeed(): number {
  return (Date.now() ^ (performance.now() * 1000)) >>> 0;
}
