import type { Color } from '../engine/colors';

/**
 * Aparências dos itens não identificados (embaralhadas a cada partida em core/identify.ts).
 * A cor de cada aparência é a que o jogador VÊ — no texto e no sprite — antes e depois de identificar,
 * para a cor nunca entregar o tipo verdadeiro do item.
 */

export const POTION_LOOKS = [
  'borbulhante violeta', 'turva marrom', 'cintilante dourada', 'espessa verde', 'fumegante cinza', 'leitosa branca',
  'efervescente rosa', 'oleosa negra', 'brilhante azul', 'viscosa amarela', 'gelada prateada', 'morna vermelha',
  'fosforescente esmeralda', 'perolada', 'âmbar', 'cor de vinho', 'enevoada', 'cristalina',
];
export const SCROLL_SYLLABLES = ['xu', 'qa', 'zab', 'mor', 'tel', 'fi', 'gra', 'nok', 'ul', 'veth', 'sar', 'kor', 'ix', 'pla', 'dun', 'eth', 'yol', 'ram'];
export const WAND_LOOKS = ['de ébano', 'de carvalho', 'de osso', 'de cristal', 'de cobre', 'de prata', 'de marfim', 'de ferro', 'de vidro', 'de jade', 'retorcida', 'de bambu'];
export const RING_LOOKS = ['de jade', 'de rubi', 'de safira', 'de ônix', 'de ferro', 'de ouro', 'de prata', 'de osso', 'de opala', 'de âmbar', 'de esmeralda'];
export const AMULET_LOOKS = ['de ossos', 'de prata trançada', 'com um olho', 'de obsidiana', 'em espiral'];

export type LookCategory = 'potion' | 'wand' | 'ring' | 'amulet';

export const LOOKS: Record<LookCategory, string[]> = {
  potion: POTION_LOOKS,
  wand: WAND_LOOKS,
  ring: RING_LOOKS,
  amulet: AMULET_LOOKS,
};

/** Cor de cada aparência (líquido da poção, material da varinha, pedra do anel, pingente do amuleto). */
export const LOOK_COLORS: Record<LookCategory, Record<string, Color>> = {
  potion: {
    'borbulhante violeta': 'magenta', 'turva marrom': 'brown', 'cintilante dourada': 'gold', 'espessa verde': 'green',
    'fumegante cinza': 'darkGray', 'leitosa branca': 'white', 'efervescente rosa': 'lightMagenta', 'oleosa negra': 'black',
    'brilhante azul': 'lightBlue', 'viscosa amarela': 'yellow', 'gelada prateada': 'lightGray', 'morna vermelha': 'red',
    'fosforescente esmeralda': 'lightGreen', perolada: 'white', 'âmbar': 'orange', 'cor de vinho': 'darkRed',
    enevoada: 'lightGray', cristalina: 'lightCyan',
  },
  wand: {
    'de ébano': 'darkGray', 'de carvalho': 'brown', 'de osso': 'white', 'de cristal': 'lightCyan', 'de cobre': 'orange',
    'de prata': 'lightGray', 'de marfim': 'white', 'de ferro': 'darkGray', 'de vidro': 'cyan', 'de jade': 'green',
    retorcida: 'brown', 'de bambu': 'yellow',
  },
  ring: {
    'de jade': 'green', 'de rubi': 'red', 'de safira': 'blue', 'de ônix': 'black', 'de ferro': 'darkGray', 'de ouro': 'gold',
    'de prata': 'lightGray', 'de osso': 'white', 'de opala': 'lightCyan', 'de âmbar': 'orange', 'de esmeralda': 'lightGreen',
  },
  amulet: {
    'de ossos': 'white', 'de prata trançada': 'lightGray', 'com um olho': 'lightBlue', 'de obsidiana': 'darkGray', 'em espiral': 'cyan',
  },
};

export function isLookCategory(c: string): c is LookCategory {
  return c === 'potion' || c === 'wand' || c === 'ring' || c === 'amulet';
}
