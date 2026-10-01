import { RNG } from '../engine/rng';
import type { Game } from './game';
import type { Item } from './item';
import { ITEMS, itemBase } from '../data/items';

/**
 * Identificação no estilo NetHack: no começo de cada partida as aparências de poções,
 * pergaminhos, varinhas e anéis são embaralhadas. Usar um item revela seu tipo para o resto da partida.
 */
export interface IdState {
  /** baseId → aparência ("borbulhante violeta", "XUQ ZAB", "de ébano"). */
  appearances: Record<string, string>;
  /** Tipos já conhecidos. */
  known: string[];
}

const POTION_LOOKS = [
  'borbulhante violeta', 'turva marrom', 'cintilante dourada', 'espessa verde', 'fumegante cinza', 'leitosa branca',
  'efervescente rosa', 'oleosa negra', 'brilhante azul', 'viscosa amarela', 'gelada prateada', 'morna vermelha',
  'fosforescente esmeralda', 'perolada', 'âmbar', 'cor de vinho', 'enevoada', 'cristalina',
];
const SCROLL_SYLLABLES = ['xu', 'qa', 'zab', 'mor', 'tel', 'fi', 'gra', 'nok', 'ul', 'veth', 'sar', 'kor', 'ix', 'pla', 'dun', 'eth', 'yol', 'ram'];
const WAND_LOOKS = ['de ébano', 'de carvalho', 'de osso', 'de cristal', 'de cobre', 'de prata', 'de marfim', 'de ferro', 'de vidro', 'de jade', 'retorcida', 'de bambu'];
const RING_LOOKS = ['de jade', 'de rubi', 'de safira', 'de ônix', 'de ferro', 'de ouro', 'de prata', 'de osso', 'de opala', 'de âmbar', 'de esmeralda'];
const AMULET_LOOKS = ['de ossos', 'de prata trançada', 'com um olho', 'de obsidiana', 'em espiral'];

const LOOK_CATEGORIES = ['potion', 'scroll', 'wand', 'ring', 'amulet'];

/** Gera as aparências da partida (determinístico pela seed). */
export function createIdState(seed: number): IdState {
  const rng = new RNG(seed).fork('identify');
  const appearances: Record<string, string> = {};
  const assign = (cat: string, looks: string[]) => {
    const bases = ITEMS.filter((b) => b.category === cat);
    const pool = rng.shuffle(looks);
    bases.forEach((b, i) => {
      appearances[b.id] = pool[i % pool.length];
    });
  };
  assign('potion', POTION_LOOKS);
  assign('wand', WAND_LOOKS);
  assign('ring', RING_LOOKS);
  assign('amulet', AMULET_LOOKS);
  const usedLabels = new Set<string>();
  for (const b of ITEMS.filter((x) => x.category === 'scroll')) {
    let label = '';
    do {
      const n = rng.int(2, 3);
      label = Array.from({ length: n }, () => rng.pick(SCROLL_SYLLABLES)).join(' ').toUpperCase();
    } while (usedLabels.has(label));
    usedLabels.add(label);
    appearances[b.id] = label;
  }
  return { appearances, known: [] };
}

export function needsIdentification(baseId: string): boolean {
  return LOOK_CATEGORIES.includes(itemBase(baseId).category);
}

export function isKnown(game: Game, baseId: string): boolean {
  return !needsIdentification(baseId) || game.idState.known.includes(baseId);
}

/** Marca o tipo como conhecido. Retorna true se era desconhecido. */
export function learn(game: Game, baseId: string): boolean {
  if (isKnown(game, baseId)) return false;
  game.idState.known.push(baseId);
  return true;
}

/** Identifica completamente um item (tipo + encantamento/afixos). */
export function identifyItem(game: Game, item: Item): void {
  learn(game, item.baseId);
  item.identified = true;
}

/** Nome aparente de um tipo desconhecido (ou undefined se já conhecido). */
export function unknownName(game: Game, baseId: string, plural: boolean): { name: string; gender: 'm' | 'f' } | undefined {
  if (isKnown(game, baseId)) return undefined;
  const look = game.idState.appearances[baseId] ?? '???';
  switch (itemBase(baseId).category) {
    case 'potion': return { name: plural ? `poções (${look})` : `poção ${look}`, gender: 'f' };
    case 'scroll': return { name: `${plural ? 'pergaminhos' : 'pergaminho'} "${look}"`, gender: 'm' };
    case 'wand': return { name: `${plural ? 'varinhas' : 'varinha'} ${look}`, gender: 'f' };
    case 'ring': return { name: `${plural ? 'anéis' : 'anel'} ${look}`, gender: 'm' };
    case 'amulet': return { name: `${plural ? 'amuletos' : 'amuleto'} ${look}`, gender: 'm' };
  }
  return undefined;
}
