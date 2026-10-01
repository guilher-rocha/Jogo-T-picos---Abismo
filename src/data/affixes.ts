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
  /** Prefixo = adjetivo depois do nome ("espada Flamejante"); sufixo = "do Urso". */
  kind: 'prefix' | 'suffix';
  /** Nome no masculino e no feminino (iguais para sufixos). */
  name: [string, string];
  /** Grupos de item em que pode aparecer: 'weapon', 'armor' (vestíveis), 'jewelry' (anéis/amuletos), 'launcher'. */
  applies: string[];
  /** Nível mínimo do item (≈ profundidade). */
  minLevel: number;
  weight: number;
  bonus: AffixBonus;
  /** Afixo ruim (itens amaldiçoados). */
  bad?: boolean;
  /** Só aparece em artefatos. */
  artifact?: boolean;
  desc: string;
}

const W = ['weapon'];
const A = ['armor'];
const ANY = ['weapon', 'armor', 'jewelry', 'launcher'];
const WEAR = ['armor', 'jewelry'];

export const AFFIXES: AffixDef[] = [
  // ── Prefixos de arma ────────────────────────────────────────────
  { id: 'sharp', kind: 'prefix', name: ['Afiado', 'Afiada'], applies: W, minLevel: 1, weight: 10, bonus: { damage: 2 }, desc: '+2 de dano' },
  { id: 'keen', kind: 'prefix', name: ['Preciso', 'Precisa'], applies: [...W, 'launcher'], minLevel: 1, weight: 10, bonus: { accuracy: 3 }, desc: '+3 de precisão' },
  { id: 'brutal', kind: 'prefix', name: ['Brutal', 'Brutal'], applies: W, minLevel: 6, weight: 5, bonus: { damage: 4, accuracy: -1 }, desc: '+4 de dano, -1 de precisão' },
  { id: 'flaming', kind: 'prefix', name: ['Flamejante', 'Flamejante'], applies: W, minLevel: 3, weight: 6, bonus: { brand: 'fire', brandDamage: '1d6' }, desc: 'causa +1d6 de dano de fogo' },
  { id: 'frost', kind: 'prefix', name: ['Gélido', 'Gélida'], applies: W, minLevel: 3, weight: 6, bonus: { brand: 'cold', brandDamage: '1d6' }, desc: 'causa +1d6 de dano de gelo' },
  { id: 'shocking', kind: 'prefix', name: ['Elétrico', 'Elétrica'], applies: W, minLevel: 5, weight: 5, bonus: { brand: 'lightning', brandDamage: '1d8' }, desc: 'causa +1d8 de dano elétrico' },
  { id: 'venomous', kind: 'prefix', name: ['Venenoso', 'Venenosa'], applies: W, minLevel: 4, weight: 5, bonus: { brand: 'poison', brandDamage: '1d6' }, desc: 'causa +1d6 de dano de veneno' },
  { id: 'holy', kind: 'prefix', name: ['Sagrado', 'Sagrada'], applies: W, minLevel: 7, weight: 3, bonus: { brand: 'holy', brandDamage: '2d6' }, desc: '+2d6 de dano sagrado (mortos-vivos sofrem o dobro)' },
  { id: 'vampiric', kind: 'prefix', name: ['Vampírico', 'Vampírica'], applies: W, minLevel: 8, weight: 3, bonus: { lifeSteal: 15 }, desc: 'rouba 15% do dano causado como vida' },
  { id: 'quick', kind: 'prefix', name: ['Veloz', 'Veloz'], applies: ANY, minLevel: 10, weight: 2, bonus: { speed: 10 }, desc: '+10 de velocidade' },
  // ── Prefixos de armadura ────────────────────────────────────────
  { id: 'reinforced', kind: 'prefix', name: ['Reforçado', 'Reforçada'], applies: A, minLevel: 1, weight: 10, bonus: { defense: 2 }, desc: '+2 de defesa' },
  { id: 'warded', kind: 'prefix', name: ['Encantado', 'Encantada'], applies: A, minLevel: 6, weight: 5, bonus: { defense: 4 }, desc: '+4 de defesa' },
  { id: 'glowing', kind: 'prefix', name: ['Luminoso', 'Luminosa'], applies: ANY, minLevel: 2, weight: 4, bonus: { light: 1 }, desc: '+1 de luz' },
  // ── Sufixos ─────────────────────────────────────────────────────
  { id: 'of_bear', kind: 'suffix', name: ['do Urso', 'do Urso'], applies: ANY, minLevel: 1, weight: 8, bonus: { stat: 'str', statAmount: 2 }, desc: '+2 de Força' },
  { id: 'of_fox', kind: 'suffix', name: ['da Raposa', 'da Raposa'], applies: ANY, minLevel: 1, weight: 8, bonus: { stat: 'dex', statAmount: 2 }, desc: '+2 de Destreza' },
  { id: 'of_ox', kind: 'suffix', name: ['do Boi', 'do Boi'], applies: ANY, minLevel: 1, weight: 8, bonus: { stat: 'con', statAmount: 2 }, desc: '+2 de Constituição' },
  { id: 'of_sage', kind: 'suffix', name: ['do Sábio', 'do Sábio'], applies: ANY, minLevel: 1, weight: 6, bonus: { stat: 'int', statAmount: 2 }, desc: '+2 de Inteligência' },
  { id: 'of_oracle', kind: 'suffix', name: ['do Oráculo', 'do Oráculo'], applies: ANY, minLevel: 1, weight: 6, bonus: { stat: 'wis', statAmount: 2 }, desc: '+2 de Sabedoria' },
  { id: 'of_vitality', kind: 'suffix', name: ['da Vitalidade', 'da Vitalidade'], applies: WEAR, minLevel: 3, weight: 6, bonus: { hpPct: 15 }, desc: '+15% de HP máximo' },
  { id: 'of_arcana', kind: 'suffix', name: ['do Arcano', 'do Arcano'], applies: ANY, minLevel: 3, weight: 5, bonus: { mp: 6 }, desc: '+6 de MP máximo' },
  { id: 'of_sight', kind: 'suffix', name: ['da Visão', 'da Visão'], applies: WEAR, minLevel: 2, weight: 4, bonus: { light: 1 }, desc: '+1 de luz' },
  { id: 'of_flame', kind: 'suffix', name: ['da Chama', 'da Chama'], applies: WEAR, minLevel: 4, weight: 5, bonus: { resist: 'fire', resistPct: 50 }, desc: 'resistência a fogo' },
  { id: 'of_frost', kind: 'suffix', name: ['do Inverno', 'do Inverno'], applies: WEAR, minLevel: 4, weight: 5, bonus: { resist: 'cold', resistPct: 50 }, desc: 'resistência a gelo' },
  { id: 'of_storm', kind: 'suffix', name: ['da Tempestade', 'da Tempestade'], applies: WEAR, minLevel: 6, weight: 4, bonus: { resist: 'lightning', resistPct: 50 }, desc: 'resistência a eletricidade' },
  { id: 'of_antidote', kind: 'suffix', name: ['do Antídoto', 'do Antídoto'], applies: WEAR, minLevel: 3, weight: 4, bonus: { resist: 'poison', resistPct: 50 }, desc: 'resistência a veneno' },
  { id: 'of_regen', kind: 'suffix', name: ['da Regeneração', 'da Regeneração'], applies: WEAR, minLevel: 7, weight: 3, bonus: { flag: 'regen' }, desc: 'regenera HP mais rápido' },
  { id: 'of_shadows', kind: 'suffix', name: ['das Sombras', 'das Sombras'], applies: WEAR, minLevel: 5, weight: 3, bonus: { flag: 'stealthy' }, desc: 'furtividade (monstros demoram a acordar)' },
  { id: 'of_protection', kind: 'suffix', name: ['da Proteção', 'da Proteção'], applies: ANY, minLevel: 2, weight: 7, bonus: { defense: 2 }, desc: '+2 de defesa' },
  { id: 'of_slaying', kind: 'suffix', name: ['da Matança', 'da Matança'], applies: [...W, 'launcher'], minLevel: 8, weight: 3, bonus: { damage: 3, accuracy: 3 }, desc: '+3 de dano e precisão' },
  // ── Afixos ruins (amaldiçoados) ─────────────────────────────────
  { id: 'rusty', kind: 'prefix', name: ['Enferrujado', 'Enferrujada'], applies: W, minLevel: 1, weight: 5, bad: true, bonus: { damage: -2 }, desc: '-2 de dano' },
  { id: 'of_weakness', kind: 'suffix', name: ['da Fraqueza', 'da Fraqueza'], applies: ANY, minLevel: 1, weight: 5, bad: true, bonus: { stat: 'str', statAmount: -2 }, desc: '-2 de Força' },
  { id: 'of_clumsiness', kind: 'suffix', name: ['da Inépcia', 'da Inépcia'], applies: ANY, minLevel: 1, weight: 5, bad: true, bonus: { stat: 'dex', statAmount: -2 }, desc: '-2 de Destreza' },
  { id: 'of_slowness', kind: 'suffix', name: ['da Lentidão', 'da Lentidão'], applies: ANY, minLevel: 3, weight: 3, bad: true, bonus: { speed: -10 }, desc: '-10 de velocidade' },
  { id: 'of_darkness', kind: 'suffix', name: ['da Escuridão', 'da Escuridão'], applies: WEAR, minLevel: 1, weight: 3, bad: true, bonus: { light: -1 }, desc: '-1 de luz' },
  // ── Exclusivos de artefatos ─────────────────────────────────────
  { id: 'art_fury', kind: 'suffix', name: ['', ''], applies: [], minLevel: 0, weight: 0, artifact: true, bonus: { lifeSteal: 10, stat: 'str', statAmount: 3 }, desc: '+3 de Força, rouba 10% do dano' },
  { id: 'art_whisper', kind: 'suffix', name: ['', ''], applies: [], minLevel: 0, weight: 0, artifact: true, bonus: { stat: 'dex', statAmount: 4, flag: 'stealthy' }, desc: '+4 de Destreza, furtividade' },
  { id: 'art_aegis', kind: 'suffix', name: ['', ''], applies: [], minLevel: 0, weight: 0, artifact: true, bonus: { hpPct: 20, resist: 'fire', resistPct: 50 }, desc: '+20% de HP, resistência a fogo' },
  { id: 'art_aegis2', kind: 'suffix', name: ['', ''], applies: [], minLevel: 0, weight: 0, artifact: true, bonus: { resist: 'cold', resistPct: 50 }, desc: 'resistência a gelo' },
  { id: 'art_north', kind: 'suffix', name: ['', ''], applies: [], minLevel: 0, weight: 0, artifact: true, bonus: { speed: 10, accuracy: 5 }, desc: '+10 de velocidade, +5 de precisão' },
  { id: 'art_crown', kind: 'suffix', name: ['', ''], applies: [], minLevel: 0, weight: 0, artifact: true, bonus: { stat: 'wis', statAmount: 3, flag: 'regen' }, desc: '+3 de Sabedoria, regeneração' },
  { id: 'art_crown2', kind: 'suffix', name: ['', ''], applies: [], minLevel: 0, weight: 0, artifact: true, bonus: { stat: 'int', statAmount: 3, mp: 10 }, desc: '+3 de Inteligência, +10 MP' },
  { id: 'art_star', kind: 'suffix', name: ['', ''], applies: [], minLevel: 0, weight: 0, artifact: true, bonus: { light: 2, mp: 15 }, desc: '+2 de luz, +15 MP' },
];

/** Artefatos lendários (no máximo um de cada por partida). */
export interface ArtifactDef {
  id: string;
  name: string;
  baseId: string;
  enchant: number;
  affixes: string[];
  minDepth: number;
}

export const ARTIFACTS: ArtifactDef[] = [
  { id: 'kragg', name: 'Fúria de Kragg', baseId: 'greatsword', enchant: 3, affixes: ['flaming', 'art_fury'], minDepth: 8 },
  { id: 'whisper', name: 'Sussurro da Noite', baseId: 'dagger', enchant: 4, affixes: ['venomous', 'art_whisper'], minDepth: 5 },
  { id: 'aegis', name: 'Égide de Valória', baseId: 'large_shield', enchant: 3, affixes: ['art_aegis', 'art_aegis2'], minDepth: 8 },
  { id: 'north_wind', name: 'Arco do Vento Norte', baseId: 'long_bow', enchant: 3, affixes: ['art_north', 'shocking'], minDepth: 8 },
  { id: 'dead_crown', name: 'Coroa do Rei Morto', baseId: 'iron_helm', enchant: 3, affixes: ['art_crown', 'art_crown2'], minDepth: 10 },
  { id: 'ystar_eye', name: 'Olho de Ystar', baseId: 'amulet_mind', enchant: 2, affixes: ['art_star'], minDepth: 10 },
  { id: 'dawnbringer', name: 'Portadora da Aurora', baseId: 'long_sword', enchant: 4, affixes: ['holy', 'glowing', 'of_vitality'], minDepth: 6 },
  { id: 'mithril_coat', name: 'Manto de Prata Viva', baseId: 'mithril_mail', enchant: 4, affixes: ['of_regen', 'of_storm'], minDepth: 14 },
];

export function affixById(id: string): AffixDef | undefined {
  return AFFIXES.find((a) => a.id === id);
}
