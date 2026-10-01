import type { Color } from '../engine/colors';
import type { Gender } from '../core/actor';

export type ItemCategory =
  | 'weapon' | 'launcher' | 'ammo' | 'armor' | 'shield' | 'helm' | 'gloves' | 'boots' | 'cloak'
  | 'ring' | 'amulet' | 'light' | 'potion' | 'scroll' | 'wand' | 'food' | 'gold' | 'book' | 'corpse' | 'artifact';

export type EquipSlot = 'weapon' | 'offhand' | 'body' | 'head' | 'hands' | 'feet' | 'cloak' | 'ring1' | 'ring2' | 'amulet' | 'light' | 'quiver';

export const SLOT_NAMES: Record<EquipSlot, string> = {
  weapon: 'Arma', offhand: 'Escudo', body: 'Corpo', head: 'Cabeça', hands: 'Mãos', feet: 'Pés',
  cloak: 'Capa', ring1: 'Anel (esq.)', ring2: 'Anel (dir.)', amulet: 'Amuleto', light: 'Luz', quiver: 'Aljava',
};

export const SLOT_ORDER: EquipSlot[] = ['weapon', 'offhand', 'body', 'head', 'hands', 'feet', 'cloak', 'ring1', 'ring2', 'amulet', 'light', 'quiver'];

/** Categoria → slot onde é equipado. */
export const CATEGORY_SLOT: Partial<Record<ItemCategory, EquipSlot>> = {
  weapon: 'weapon', launcher: 'weapon', shield: 'offhand', armor: 'body', helm: 'head', gloves: 'hands',
  boots: 'feet', cloak: 'cloak', ring: 'ring1', amulet: 'amulet', light: 'light', ammo: 'quiver',
};

export const CATEGORY_GLYPH: Record<ItemCategory, string> = {
  weapon: ')', launcher: '}', ammo: ')', armor: '[', shield: '[', helm: '[', gloves: '[', boots: '[', cloak: '[',
  ring: '=', amulet: '"', light: '(', potion: '!', scroll: '?', wand: '/', food: '%', gold: '$', book: '+', corpse: '%', artifact: '*',
};

export const CATEGORY_NAMES: Record<ItemCategory, string> = {
  weapon: 'Armas', launcher: 'Armas de disparo', ammo: 'Munição', armor: 'Armaduras', shield: 'Escudos', helm: 'Elmos',
  gloves: 'Luvas', boots: 'Botas', cloak: 'Capas', ring: 'Anéis', amulet: 'Amuletos', light: 'Fontes de luz',
  potion: 'Poções', scroll: 'Pergaminhos', wand: 'Varinhas', food: 'Comida', gold: 'Ouro', book: 'Tomos', corpse: 'Cadáveres', artifact: 'Artefatos',
};

export interface ItemBase {
  id: string;
  name: string;
  plural?: string;
  gender: Gender;
  category: ItemCategory;
  color: Color;
  weight: number;
  /** Valor em ouro (pontuação/lojas). */
  value: number;
  /** Faixa de andares em que aparece; [0,0] = nunca é gerado no chão. */
  depth: [number, number];
  rarity: number;
  stackable?: boolean;
  // Armas
  damage?: string;
  /** Usa DES em vez de FOR para acertar. */
  finesse?: boolean;
  twoHanded?: boolean;
  /** Dano quando arremessada. */
  throwDamage?: string;
  /** Armas de disparo: tipo de munição que usam. */
  ammoType?: 'arrow' | 'bolt' | 'stone';
  /** Munição: tipo. */
  ammoKind?: 'arrow' | 'bolt' | 'stone';
  /** Multiplicador de dano da arma de disparo. */
  multiplier?: number;
  range?: number;
  // Armaduras
  armor?: number;
  /** Penalidade de magia (armaduras pesadas atrapalham conjuradores). */
  spellPenalty?: number;
  // Consumíveis e outros
  effect?: string;
  /** Cargas iniciais (varinhas). */
  charges?: string;
  nutrition?: number;
  /** Bônus de luz (fontes de luz). */
  light?: number;
  /** Turnos de combustível (tochas). */
  fuel?: number;
  desc: string;
}

const b = (x: ItemBase): ItemBase => x;

export const ITEMS: ItemBase[] = [
  // ── Armas corpo a corpo ─────────────────────────────────────────
  b({ id: 'dagger', name: 'adaga', gender: 'f', category: 'weapon', color: 'lightGray', weight: 1, value: 10, depth: [1, 8], rarity: 8,
    damage: '1d4', finesse: true, throwDamage: '1d4', stackable: true, desc: 'Leve e equilibrada, boa para arremessar.' }),
  b({ id: 'short_sword', name: 'espada curta', gender: 'f', category: 'weapon', color: 'lightGray', weight: 3, value: 25, depth: [1, 10], rarity: 7,
    damage: '1d6', finesse: true, desc: 'Uma lâmina curta e ágil.' }),
  b({ id: 'club', name: 'clava', gender: 'f', category: 'weapon', color: 'brown', weight: 4, value: 3, depth: [1, 5], rarity: 6,
    damage: '1d6', desc: 'Um pedaço de madeira pesado.' }),
  b({ id: 'quarterstaff', name: 'bordão', gender: 'm', category: 'weapon', color: 'brown', weight: 4, value: 5, depth: [1, 8], rarity: 5,
    damage: '1d6', twoHanded: true, desc: 'Um cajado longo de madeira dura, preferido por magos.' }),
  b({ id: 'mace', name: 'maça', gender: 'f', category: 'weapon', color: 'lightGray', weight: 5, value: 30, depth: [1, 10], rarity: 6,
    damage: '1d8', desc: 'Uma cabeça de ferro com flanges.' }),
  b({ id: 'long_sword', name: 'espada longa', gender: 'f', category: 'weapon', color: 'white', weight: 4, value: 60, depth: [2, 14], rarity: 6,
    damage: '1d8', desc: 'A arma clássica dos cavaleiros.' }),
  b({ id: 'axe', name: 'machado de batalha', gender: 'm', category: 'weapon', color: 'lightGray', weight: 6, value: 50, depth: [3, 14], rarity: 5,
    damage: '1d10', desc: 'Um machado de lâmina larga.' }),
  b({ id: 'spear', name: 'lança', gender: 'f', category: 'weapon', color: 'brown', weight: 5, value: 20, depth: [2, 10], rarity: 4,
    damage: '1d8', throwDamage: '1d8', desc: 'Pode ser arremessada.' }),
  b({ id: 'rapier', name: 'florete', gender: 'm', category: 'weapon', color: 'lightCyan', weight: 2, value: 70, depth: [4, 16], rarity: 4,
    damage: '1d8', finesse: true, desc: 'Uma lâmina fina e precisa.' }),
  b({ id: 'flail', name: 'mangual', gender: 'm', category: 'weapon', color: 'lightGray', weight: 7, value: 80, depth: [8, 20], rarity: 4,
    damage: '1d10+1', desc: 'Uma bola cravejada presa a uma corrente.' }),
  b({ id: 'greatsword', name: 'montante', gender: 'm', category: 'weapon', color: 'white', weight: 10, value: 120, depth: [8, 20], rarity: 4,
    damage: '2d6', twoHanded: true, desc: 'Uma espada enorme, de duas mãos.' }),
  b({ id: 'halberd', name: 'alabarda', gender: 'f', category: 'weapon', color: 'lightGray', weight: 12, value: 150, depth: [12, 20], rarity: 3,
    damage: '2d8', twoHanded: true, desc: 'Machado e lança numa só haste.' }),
  b({ id: 'mithril_blade', name: 'lâmina de mithril', gender: 'f', category: 'weapon', color: 'lightCyan', weight: 2, value: 400, depth: [14, 20], rarity: 2,
    damage: '2d6', finesse: true, desc: 'Leve como uma pena e mais dura que o aço.' }),
  b({ id: 'dart', name: 'dardo', gender: 'm', category: 'weapon', color: 'lightGray', weight: 0.2, value: 1, depth: [1, 6], rarity: 5,
    damage: '1d2', throwDamage: '1d4+1', stackable: true, finesse: true, desc: 'Pequeno projétil de arremesso.' }),

  // ── Armas de disparo e munição ──────────────────────────────────
  b({ id: 'sling', name: 'funda', gender: 'f', category: 'launcher', color: 'brown', weight: 0.5, value: 5, depth: [1, 6], rarity: 3,
    damage: '1d2', ammoType: 'stone', multiplier: 2, range: 8, twoHanded: true, desc: 'Arremessa pedras.' }),
  b({ id: 'short_bow', name: 'arco curto', gender: 'm', category: 'launcher', color: 'brown', weight: 2, value: 50, depth: [1, 12], rarity: 4,
    damage: '1d2', ammoType: 'arrow', multiplier: 2, range: 10, twoHanded: true, desc: 'Um arco de caça.' }),
  b({ id: 'long_bow', name: 'arco longo', gender: 'm', category: 'launcher', color: 'yellow', weight: 3, value: 120, depth: [6, 20], rarity: 3,
    damage: '1d2', ammoType: 'arrow', multiplier: 3, range: 12, twoHanded: true, desc: 'Um arco alto e poderoso.' }),
  b({ id: 'crossbow', name: 'besta', gender: 'f', category: 'launcher', color: 'lightGray', weight: 6, value: 150, depth: [8, 20], rarity: 3,
    damage: '1d3', ammoType: 'bolt', multiplier: 3, range: 10, twoHanded: true, desc: 'Lenta para recarregar, mas perfurante.' }),
  b({ id: 'arrow', name: 'flecha', gender: 'f', category: 'ammo', color: 'brown', weight: 0.1, value: 1, depth: [1, 20], rarity: 6,
    damage: '1d6', ammoKind: 'arrow', stackable: true, desc: 'Flechas com ponta de ferro.' }),
  b({ id: 'bolt', name: 'virote', gender: 'm', category: 'ammo', color: 'lightGray', weight: 0.1, value: 2, depth: [6, 20], rarity: 3,
    damage: '1d8', ammoKind: 'bolt', stackable: true, desc: 'Virotes pesados de besta.' }),
  b({ id: 'stone', name: 'pedra de funda', plural: 'pedras de funda', gender: 'f', category: 'ammo', color: 'darkGray', weight: 0.2, value: 0, depth: [1, 5], rarity: 3,
    damage: '1d4', ammoKind: 'stone', stackable: true, desc: 'Pedras lisas e redondas.' }),

  // ── Armaduras ───────────────────────────────────────────────────
  b({ id: 'robe', name: 'manto', gender: 'm', category: 'armor', color: 'blue', weight: 2, value: 5, depth: [1, 6], rarity: 4,
    armor: 1, desc: 'Um manto de tecido grosso.' }),
  b({ id: 'leather_armor', name: 'armadura de couro', plural: 'armaduras de couro', gender: 'f', category: 'armor', color: 'brown', weight: 8, value: 20, depth: [1, 8], rarity: 7,
    armor: 2, desc: 'Couro curtido e endurecido.' }),
  b({ id: 'studded_leather', name: 'couro batido', gender: 'm', category: 'armor', color: 'brown', weight: 10, value: 45, depth: [2, 10], rarity: 5,
    armor: 3, desc: 'Couro reforçado com rebites de metal.' }),
  b({ id: 'scale_mail', name: 'cota de escamas', plural: 'cotas de escamas', gender: 'f', category: 'armor', color: 'lightGray', weight: 18, value: 80, depth: [3, 12], rarity: 5,
    armor: 4, spellPenalty: 10, desc: 'Escamas de metal sobrepostas.' }),
  b({ id: 'chain_mail', name: 'cota de malha', plural: 'cotas de malha', gender: 'f', category: 'armor', color: 'lightGray', weight: 20, value: 100, depth: [4, 14], rarity: 5,
    armor: 5, spellPenalty: 15, desc: 'Anéis de aço entrelaçados.' }),
  b({ id: 'half_plate', name: 'meia-armadura', gender: 'f', category: 'armor', color: 'white', weight: 30, value: 250, depth: [9, 20], rarity: 3,
    armor: 6, spellPenalty: 25, desc: 'Placas de aço sobre malha.' }),
  b({ id: 'plate_mail', name: 'armadura de placas', plural: 'armaduras de placas', gender: 'f', category: 'armor', color: 'white', weight: 40, value: 450, depth: [12, 20], rarity: 2,
    armor: 8, spellPenalty: 35, desc: 'A melhor proteção que o aço pode comprar.' }),
  b({ id: 'mithril_mail', name: 'cota de mithril', plural: 'cotas de mithril', gender: 'f', category: 'armor', color: 'lightCyan', weight: 10, value: 1200, depth: [14, 20], rarity: 1,
    armor: 7, spellPenalty: 5, desc: 'Leve e brilhante como prata.' }),
  b({ id: 'small_shield', name: 'escudo pequeno', gender: 'm', category: 'shield', color: 'brown', weight: 5, value: 15, depth: [1, 10], rarity: 5,
    armor: 1, desc: 'Um broquel de madeira e couro.' }),
  b({ id: 'large_shield', name: 'escudo grande', gender: 'm', category: 'shield', color: 'lightGray', weight: 12, value: 60, depth: [5, 20], rarity: 3,
    armor: 2, spellPenalty: 5, desc: 'Um escudo de aço que cobre quase todo o corpo.' }),
  b({ id: 'leather_cap', name: 'gorro de couro', gender: 'm', category: 'helm', color: 'brown', weight: 1, value: 5, depth: [1, 8], rarity: 4,
    armor: 1, desc: 'Melhor que nada.' }),
  b({ id: 'iron_helm', name: 'elmo de ferro', gender: 'm', category: 'helm', color: 'lightGray', weight: 4, value: 30, depth: [4, 20], rarity: 3,
    armor: 2, desc: 'Um elmo fechado.' }),
  b({ id: 'leather_gloves', name: 'luvas de couro', plural: 'pares de luvas de couro', gender: 'f', category: 'gloves', color: 'brown', weight: 1, value: 5, depth: [1, 12], rarity: 3,
    armor: 1, desc: 'Luvas de couro macio.' }),
  b({ id: 'leather_boots', name: 'botas de couro', plural: 'pares de botas de couro', gender: 'f', category: 'boots', color: 'brown', weight: 2, value: 5, depth: [1, 12], rarity: 3,
    armor: 1, desc: 'Botas resistentes.' }),
  b({ id: 'cloak', name: 'capa', gender: 'f', category: 'cloak', color: 'green', weight: 1, value: 5, depth: [1, 15], rarity: 3,
    armor: 1, desc: 'Uma capa de viagem com capuz.' }),

  // ── Luz ─────────────────────────────────────────────────────────
  b({ id: 'torch', name: 'tocha', gender: 'f', category: 'light', color: 'orange', weight: 2, value: 1, depth: [1, 10], rarity: 4,
    light: 2, fuel: 3000, stackable: true, desc: 'Ilumina 2 casas ao redor. Queima com o tempo.' }),
  b({ id: 'lantern', name: 'lanterna', gender: 'f', category: 'light', color: 'yellow', weight: 4, value: 100, depth: [4, 20], rarity: 2,
    light: 3, fuel: 8000, desc: 'Uma lanterna de latão. Ilumina 3 casas.' }),

  // ── Comida ──────────────────────────────────────────────────────
  b({ id: 'ration', name: 'ração de viagem', plural: 'rações de viagem', gender: 'f', category: 'food', color: 'brown', weight: 1, value: 3, depth: [1, 20], rarity: 8,
    nutrition: 1500, stackable: true, desc: 'Carne seca, pão duro e queijo.' }),
  b({ id: 'apple', name: 'maçã', gender: 'f', category: 'food', color: 'lightRed', weight: 0.3, value: 1, depth: [1, 10], rarity: 4,
    nutrition: 300, stackable: true, desc: 'Uma maçã vermelha (e milagrosamente fresca).' }),
  b({ id: 'elven_bread', name: 'pão élfico', plural: 'pães élficos', gender: 'm', category: 'food', color: 'yellow', weight: 0.3, value: 20, depth: [5, 20], rarity: 2,
    nutrition: 2500, stackable: true, desc: 'Um pedaço sacia por dias.' }),

  // ── Poções (efeitos em core/consumables.ts) ─────────────────────
  b({ id: 'potion_heal', name: 'poção de cura', plural: 'poções de cura', gender: 'f', category: 'potion', color: 'lightRed', weight: 0.5, value: 20, depth: [1, 20], rarity: 10,
    effect: 'heal', stackable: true, desc: 'Cura ferimentos.' }),
  b({ id: 'potion_heal_major', name: 'poção de cura maior', plural: 'poções de cura maior', gender: 'f', category: 'potion', color: 'lightRed', weight: 0.5, value: 80, depth: [8, 20], rarity: 4,
    effect: 'heal_major', stackable: true, desc: 'Cura quase todos os ferimentos.' }),
  b({ id: 'potion_mana', name: 'poção de mana', plural: 'poções de mana', gender: 'f', category: 'potion', color: 'lightBlue', weight: 0.5, value: 30, depth: [1, 20], rarity: 5,
    effect: 'mana', stackable: true, desc: 'Restaura a energia mágica.' }),
  b({ id: 'potion_speed', name: 'poção de velocidade', plural: 'poções de velocidade', gender: 'f', category: 'potion', color: 'yellow', weight: 0.5, value: 60, depth: [3, 20], rarity: 3,
    effect: 'haste', stackable: true, desc: 'Acelera seus movimentos por um tempo.' }),
  b({ id: 'potion_strength', name: 'poção de força', plural: 'poções de força', gender: 'f', category: 'potion', color: 'orange', weight: 0.5, value: 300, depth: [6, 20], rarity: 1,
    effect: 'gain_str', stackable: true, desc: 'Aumenta permanentemente a força.' }),
  b({ id: 'potion_experience', name: 'poção de experiência', plural: 'poções de experiência', gender: 'f', category: 'potion', color: 'gold', weight: 0.5, value: 500, depth: [10, 20], rarity: 1,
    effect: 'gain_level', stackable: true, desc: 'Concede um nível de experiência.' }),
  b({ id: 'potion_cure_poison', name: 'poção de antídoto', plural: 'poções de antídoto', gender: 'f', category: 'potion', color: 'lightGreen', weight: 0.5, value: 15, depth: [2, 20], rarity: 4,
    effect: 'cure', stackable: true, desc: 'Cura veneno e confusão.' }),
  b({ id: 'potion_invisibility', name: 'poção de invisibilidade', plural: 'poções de invisibilidade', gender: 'f', category: 'potion', color: 'white', weight: 0.5, value: 60, depth: [5, 20], rarity: 2,
    effect: 'invisible', stackable: true, desc: 'Torna você difícil de ver.' }),
  b({ id: 'potion_restore', name: 'poção de restauração', plural: 'poções de restauração', gender: 'f', category: 'potion', color: 'lightCyan', weight: 0.5, value: 150, depth: [8, 20], rarity: 2,
    effect: 'restore', stackable: true, desc: 'Restaura níveis drenados.' }),
  b({ id: 'potion_poison', name: 'poção de veneno', plural: 'poções de veneno', gender: 'f', category: 'potion', color: 'green', weight: 0.5, value: 0, depth: [1, 15], rarity: 3,
    effect: 'poison', stackable: true, desc: 'Venenosa! Melhor arremessar em alguém.' }),
  b({ id: 'potion_confusion', name: 'poção de confusão', plural: 'poções de confusão', gender: 'f', category: 'potion', color: 'magenta', weight: 0.5, value: 0, depth: [1, 15], rarity: 3,
    effect: 'confuse', stackable: true, desc: 'Deixa a cabeça girando.' }),
  b({ id: 'potion_blindness', name: 'poção de cegueira', plural: 'poções de cegueira', gender: 'f', category: 'potion', color: 'darkGray', weight: 0.5, value: 0, depth: [1, 15], rarity: 2,
    effect: 'blind', stackable: true, desc: 'Escurece a visão.' }),

  // ── Pergaminhos ─────────────────────────────────────────────────
  b({ id: 'scroll_identify', name: 'pergaminho de identificação', plural: 'pergaminhos de identificação', gender: 'm', category: 'scroll', color: 'white', weight: 0.2, value: 20, depth: [1, 20], rarity: 9,
    effect: 'identify', stackable: true, desc: 'Revela a natureza de um item.' }),
  b({ id: 'scroll_teleport', name: 'pergaminho de teleporte', plural: 'pergaminhos de teleporte', gender: 'm', category: 'scroll', color: 'white', weight: 0.2, value: 40, depth: [1, 20], rarity: 5,
    effect: 'teleport', stackable: true, desc: 'Leva você a um lugar aleatório do andar.' }),
  b({ id: 'scroll_mapping', name: 'pergaminho de mapeamento', plural: 'pergaminhos de mapeamento', gender: 'm', category: 'scroll', color: 'white', weight: 0.2, value: 50, depth: [2, 20], rarity: 4,
    effect: 'mapping', stackable: true, desc: 'Revela a planta do andar.' }),
  b({ id: 'scroll_remove_curse', name: 'pergaminho de remover maldição', plural: 'pergaminhos de remover maldição', gender: 'm', category: 'scroll', color: 'white', weight: 0.2, value: 60, depth: [3, 20], rarity: 3,
    effect: 'uncurse', stackable: true, desc: 'Quebra maldições do equipamento.' }),
  b({ id: 'scroll_enchant_weapon', name: 'pergaminho de encantar arma', plural: 'pergaminhos de encantar arma', gender: 'm', category: 'scroll', color: 'white', weight: 0.2, value: 80, depth: [3, 20], rarity: 3,
    effect: 'enchant_weapon', stackable: true, desc: 'Aumenta o encantamento da arma.' }),
  b({ id: 'scroll_enchant_armor', name: 'pergaminho de encantar armadura', plural: 'pergaminhos de encantar armadura', gender: 'm', category: 'scroll', color: 'white', weight: 0.2, value: 80, depth: [3, 20], rarity: 3,
    effect: 'enchant_armor', stackable: true, desc: 'Aumenta o encantamento da armadura.' }),
  b({ id: 'scroll_light', name: 'pergaminho de luz', plural: 'pergaminhos de luz', gender: 'm', category: 'scroll', color: 'white', weight: 0.2, value: 10, depth: [1, 10], rarity: 4,
    effect: 'light', stackable: true, desc: 'Ilumina a área ao redor.' }),
  b({ id: 'scroll_fear', name: 'pergaminho de medo', plural: 'pergaminhos de medo', gender: 'm', category: 'scroll', color: 'white', weight: 0.2, value: 30, depth: [2, 20], rarity: 3,
    effect: 'scare', stackable: true, desc: 'Monstros próximos fogem de pavor.' }),
  b({ id: 'scroll_fire', name: 'pergaminho de fogo', plural: 'pergaminhos de fogo', gender: 'm', category: 'scroll', color: 'white', weight: 0.2, value: 30, depth: [3, 20], rarity: 3,
    effect: 'fireball_self', stackable: true, desc: 'Uma explosão de chamas ao seu redor.' }),
  b({ id: 'scroll_summon', name: 'pergaminho de invocação', plural: 'pergaminhos de invocação', gender: 'm', category: 'scroll', color: 'white', weight: 0.2, value: 0, depth: [2, 20], rarity: 2,
    effect: 'summon', stackable: true, desc: 'Invoca monstros. Ops.' }),
  b({ id: 'scroll_aggravate', name: 'pergaminho de provocação', plural: 'pergaminhos de provocação', gender: 'm', category: 'scroll', color: 'white', weight: 0.2, value: 0, depth: [2, 20], rarity: 2,
    effect: 'aggravate', stackable: true, desc: 'Acorda tudo no andar.' }),

  // ── Varinhas ────────────────────────────────────────────────────
  b({ id: 'wand_magic_missile', name: 'varinha de míssil mágico', plural: 'varinhas de míssil mágico', gender: 'f', category: 'wand', color: 'lightMagenta', weight: 1, value: 100, depth: [1, 20], rarity: 4,
    effect: 'magic_missile', charges: '1d6+4', desc: 'Dispara mísseis mágicos.' }),
  b({ id: 'wand_fire', name: 'varinha de fogo', plural: 'varinhas de fogo', gender: 'f', category: 'wand', color: 'orange', weight: 1, value: 200, depth: [5, 20], rarity: 3,
    effect: 'fire_bolt', charges: '1d4+3', desc: 'Dispara um raio de fogo.' }),
  b({ id: 'wand_cold', name: 'varinha de gelo', plural: 'varinhas de gelo', gender: 'f', category: 'wand', color: 'lightCyan', weight: 1, value: 200, depth: [5, 20], rarity: 3,
    effect: 'frost_bolt', charges: '1d4+3', desc: 'Dispara um raio de gelo.' }),
  b({ id: 'wand_lightning', name: 'varinha de relâmpago', plural: 'varinhas de relâmpago', gender: 'f', category: 'wand', color: 'yellow', weight: 1, value: 220, depth: [7, 20], rarity: 2,
    effect: 'lightning_beam', charges: '1d4+2', desc: 'Um relâmpago que atravessa os inimigos.' }),
  b({ id: 'wand_slow', name: 'varinha de lentidão', plural: 'varinhas de lentidão', gender: 'f', category: 'wand', color: 'lightGray', weight: 1, value: 80, depth: [2, 20], rarity: 3,
    effect: 'slow_monster', charges: '1d5+3', desc: 'Deixa um monstro lento.' }),
  b({ id: 'wand_sleep', name: 'varinha do sono', plural: 'varinhas do sono', gender: 'f', category: 'wand', color: 'lightBlue', weight: 1, value: 80, depth: [2, 20], rarity: 3,
    effect: 'sleep_monster', charges: '1d5+3', desc: 'Faz um monstro adormecer.' }),
  b({ id: 'wand_teleport_other', name: 'varinha de banimento', plural: 'varinhas de banimento', gender: 'f', category: 'wand', color: 'lightGreen', weight: 1, value: 250, depth: [6, 20], rarity: 2,
    effect: 'teleport_other', charges: '1d3+2', desc: 'Teleporta um monstro para longe.' }),
  b({ id: 'wand_digging', name: 'varinha de escavação', plural: 'varinhas de escavação', gender: 'f', category: 'wand', color: 'brown', weight: 1, value: 150, depth: [4, 20], rarity: 2,
    effect: 'dig', charges: '1d4+4', desc: 'Abre túneis através da rocha.' }),

  // ── Anéis e amuletos (efeitos via afixos fixos) ─────────────────
  b({ id: 'ring_protection', name: 'anel de proteção', plural: 'anéis de proteção', gender: 'm', category: 'ring', color: 'lightGray', weight: 0, value: 150, depth: [2, 20], rarity: 3,
    effect: 'protection', desc: '+defesa.' }),
  b({ id: 'ring_strength', name: 'anel de força', plural: 'anéis de força', gender: 'm', category: 'ring', color: 'orange', weight: 0, value: 200, depth: [4, 20], rarity: 2,
    effect: 'str', desc: '+força.' }),
  b({ id: 'ring_regeneration', name: 'anel de regeneração', plural: 'anéis de regeneração', gender: 'm', category: 'ring', color: 'lightGreen', weight: 0, value: 300, depth: [6, 20], rarity: 2,
    effect: 'regen', desc: 'Regenera HP mais rápido.' }),
  b({ id: 'ring_see_invisible', name: 'anel da visão', plural: 'anéis da visão', gender: 'm', category: 'ring', color: 'white', weight: 0, value: 200, depth: [5, 20], rarity: 2,
    effect: 'light', desc: '+1 de visão.' }),
  b({ id: 'ring_fire_resist', name: 'anel da chama', plural: 'anéis da chama', gender: 'm', category: 'ring', color: 'red', weight: 0, value: 180, depth: [5, 20], rarity: 2,
    effect: 'resist_fire', desc: 'Resistência a fogo.' }),
  b({ id: 'amulet_life', name: 'amuleto da vida', plural: 'amuletos da vida', gender: 'm', category: 'amulet', color: 'lightRed', weight: 0, value: 400, depth: [6, 20], rarity: 2,
    effect: 'life', desc: '+HP máximo.' }),
  b({ id: 'amulet_mind', name: 'amuleto da mente', plural: 'amuletos da mente', gender: 'm', category: 'amulet', color: 'lightBlue', weight: 0, value: 400, depth: [6, 20], rarity: 2,
    effect: 'mind', desc: '+MP máximo e resistência a confusão.' }),

  // ── Tomos ───────────────────────────────────────────────────────
  b({ id: 'tome_arcane', name: 'tomo arcano', plural: 'tomos arcanos', gender: 'm', category: 'book', color: 'lightMagenta', weight: 3, value: 150, depth: [1, 20], rarity: 3,
    effect: 'learn_arcane', desc: 'Contém magias arcanas (Inteligência).' }),
  b({ id: 'tome_divine', name: 'livro de orações', plural: 'livros de orações', gender: 'm', category: 'book', color: 'white', weight: 3, value: 150, depth: [1, 20], rarity: 3,
    effect: 'learn_divine', desc: 'Contém orações divinas (Sabedoria).' }),

  // ── Especiais ───────────────────────────────────────────────────
  b({ id: 'gold', name: 'peça de ouro', plural: 'peças de ouro', gender: 'f', category: 'gold', color: 'gold', weight: 0, value: 1, depth: [1, 20], rarity: 10,
    stackable: true, desc: 'Ouro reluzente.' }),
  b({ id: 'corpse', name: 'cadáver', gender: 'm', category: 'corpse', color: 'lightGray', weight: 20, value: 0, depth: [0, 0], rarity: 0,
    nutrition: 800, desc: 'Os restos de uma criatura.' }),
  b({ id: 'amulet_abyss', name: 'Coração do Abismo', gender: 'm', category: 'artifact', color: 'lightMagenta', weight: 1, value: 10000, depth: [0, 0], rarity: 0,
    desc: 'Uma gema pulsante, quente como um coração vivo. O motivo de toda a sua jornada.' }),
];

const BY_ID = new Map(ITEMS.map((i) => [i.id, i]));

export function itemBase(id: string): ItemBase {
  const b = BY_ID.get(id);
  if (!b) throw new Error(`Item desconhecido: ${id}`);
  return b;
}
