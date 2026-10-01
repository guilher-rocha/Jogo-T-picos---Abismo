import type { Element } from '../core/actor';
import type { StatId } from '../core/hero';

/** Bônus que um afixo concede (somados em core/bonuses.ts). */
export interface AffixBonus {
  accuracy?: number;
  damage?: number;
  defense?: number;
  light?: number;
  speed?: number;
  hpPct?: number;
  mp?: number;
  lifeSteal?: number;
  stat?: StatId;
  statAmount?: number;
  resist?: Element;
  resistPct?: number;
  brand?: Element;
  brandDamage?: string;
  flag?: string;
}

export interface AffixDef {
  id: string;
  /** Prefixo (adjetivo depois do nome em português: "espada Flamejante") ou sufixo ("do Urso"). */
  kind: 'prefix' | 'suffix';
  /** Nome no masculino e feminino (para prefixos que são adjetivos). */
  name: [string, string];
  /** Categorias de item em que pode aparecer. */
  applies: string[];
  /** Nível mínimo do item. */
  minLevel: number;
  weight: number;
  bonus: AffixBonus;
  /** Afixo ruim (aparece em itens amaldiçoados). */
  bad?: boolean;
}

/** Afixos procedurais — preenchidos na Etapa 4 (subetapa 4.2). */
export const AFFIXES: AffixDef[] = [];

export function affixById(id: string): AffixDef | undefined {
  return AFFIXES.find((a) => a.id === id);
}
