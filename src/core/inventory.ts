import type { Game } from './game';
import { emit, level, message } from './game';
import type { Item } from './item';
import { addItem, canStack, itemsAt, itemWeight, removeFloorItem } from './item';
import { itemName } from './itemText';
import type { EquipSlot, ItemBase } from '../data/items';
import { CATEGORY_SLOT, itemBase } from '../data/items';
import { raceById } from '../data/races';
import { capitalize } from './text';
import { Tile } from '../data/tiles';

export const MAX_INVENTORY = 26 + 26;
const LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function inventory(game: Game): Item[] {
  return game.hero.inventory;
}

/** Capacidade de carga (acima disso o personagem fica lento). */
export function carryCapacity(game: Game): number {
  return Math.round((30 + 6 * game.hero.stats.str) * raceById(game.hero.raceId).carry);
}

export function totalWeight(game: Game): number {
  return inventory(game).reduce((s, i) => s + itemWeight(i), 0);
}

/** 0 = normal, 1 = sobrecarregado (lento), 2 = não consegue andar. */
export function burden(game: Game): 0 | 1 | 2 {
  const w = totalWeight(game);
  const cap = carryCapacity(game);
  if (w > cap * 1.5) return 2;
  if (w > cap) return 1;
  return 0;
}

/** Coloca um item no inventário, juntando pilhas e dando uma letra fixa. */
export function addToInventory(game: Game, item: Item): Item | null {
  const inv = inventory(game);
  const same = inv.find((i) => canStack(i, item));
  if (same) {
    same.quantity += item.quantity;
    return same;
  }
  if (inv.length >= MAX_INVENTORY) return null;
  const used = new Set(inv.map((i) => i.letter));
  item.letter = [...LETTERS].find((l) => !used.has(l));
  inv.push(item);
  sortInventory(game);
  return item;
}

/** Retira `qty` unidades de um item (divide a pilha se preciso). Retorna o que saiu. */
export function takeFromInventory(game: Game, item: Item, qty = item.quantity): Item {
  const inv = inventory(game);
  if (qty >= item.quantity) {
    unequipItem(game, item);
    game.hero.inventory = inv.filter((i) => i !== item);
    return item;
  }
  item.quantity -= qty;
  return { ...item, id: game.nextId++, quantity: qty, letter: undefined };
}

const CATEGORY_ORDER = ['weapon', 'launcher', 'ammo', 'armor', 'shield', 'helm', 'gloves', 'boots', 'cloak', 'ring', 'amulet', 'light', 'potion', 'scroll', 'wand', 'book', 'food', 'corpse', 'artifact'];

export function sortInventory(game: Game): void {
  game.hero.inventory.sort((a, b) => {
    const ca = CATEGORY_ORDER.indexOf(itemBase(a.baseId).category);
    const cb = CATEGORY_ORDER.indexOf(itemBase(b.baseId).category);
    return ca - cb || (a.letter ?? '').localeCompare(b.letter ?? '');
  });
}

// ── Equipamento ──────────────────────────────────────────────────────

export function equippedId(game: Game, slot: EquipSlot): number | undefined {
  return game.hero.equipment[slot];
}

export function equipped(game: Game, slot: EquipSlot): Item | undefined {
  const id = game.hero.equipment[slot];
  return id === undefined ? undefined : inventory(game).find((i) => i.id === id);
}

export function slotOf(game: Game, item: Item): EquipSlot | undefined {
  return (Object.keys(game.hero.equipment) as EquipSlot[]).find((s) => game.hero.equipment[s] === item.id);
}

export function isEquipped(game: Game, item: Item): boolean {
  return slotOf(game, item) !== undefined;
}

/** Todos os itens equipados. */
export function allEquipped(game: Game): Item[] {
  return (Object.keys(game.hero.equipment) as EquipSlot[]).map((s) => equipped(game, s)).filter((i): i is Item => !!i);
}

export function canEquip(base: ItemBase): boolean {
  return CATEGORY_SLOT[base.category] !== undefined;
}

function unequipItem(game: Game, item: Item): void {
  const slot = slotOf(game, item);
  if (slot) delete game.hero.equipment[slot];
}

/**
 * Equipa um item (troca o que estiver no slot). Retorna false se não puder
 * (item amaldiçoado preso no slot, por exemplo).
 */
export function equip(game: Game, item: Item, quiet = false): boolean {
  const base = itemBase(item.baseId);
  let slot = CATEGORY_SLOT[base.category];
  if (!slot) return false;
  if (isEquipped(game, item)) {
    if (!quiet) message(game, 'Você já está usando isso.', 'darkGray');
    return false;
  }
  if (slot === 'ring1' && equippedId(game, 'ring1') !== undefined && equippedId(game, 'ring2') === undefined) slot = 'ring2';
  // Arma de duas mãos não combina com escudo.
  if (slot === 'weapon' && base.twoHanded && equipped(game, 'offhand')) {
    if (!unequip(game, 'offhand', quiet)) return false;
  }
  if (slot === 'offhand') {
    const w = equipped(game, 'weapon');
    if (w && itemBase(w.baseId).twoHanded) {
      if (!quiet) message(game, 'Você precisa das duas mãos para a sua arma.', 'lightGray');
      return false;
    }
  }
  if (equipped(game, slot) && !unequip(game, slot, quiet)) return false;
  // Pilhas de armas (adagas) equipam só uma; munição vai inteira para a aljava.
  if (item.quantity > 1 && slot !== 'quiver' && slot !== 'light') {
    const one = takeFromInventory(game, item, 1);
    const added = addToInventoryUnstacked(game, one);
    game.hero.equipment[slot] = added.id;
    item = added;
  } else {
    game.hero.equipment[slot] = item.id;
  }
  const wasUnknown = !item.identified;
  item.identified = true;
  if (!quiet) {
    if (wasUnknown) message(game, `Você descobre: é ${itemName(game, item)}!`, item.cursed ? 'lightRed' : 'lightCyan');
    const verb = slot === 'weapon' ? 'empunha' : slot === 'quiver' ? 'põe na aljava' : slot === 'light' ? 'acende' : 'veste';
    message(game, `Você ${verb} ${itemName(game, item)}.`, 'white');
    if (item.cursed) {
      item.identified = true;
      message(game, `${capitalize(itemName(game, item, 'the'))} gruda em você! Está amaldiçoad${itemBase(item.baseId).gender === 'f' ? 'a' : 'o'}.`, 'lightRed');
    }
  }
  return true;
}

/** Item separado de uma pilha (não junta de volta enquanto equipado). */
function addToInventoryUnstacked(game: Game, item: Item): Item {
  const used = new Set(inventory(game).map((i) => i.letter));
  item.letter = [...LETTERS].find((l) => !used.has(l));
  inventory(game).push(item);
  sortInventory(game);
  return item;
}

export function unequip(game: Game, slot: EquipSlot, quiet = false): boolean {
  const item = equipped(game, slot);
  if (!item) return false;
  if (item.cursed) {
    if (!quiet) message(game, `Você não consegue remover ${itemName(game, item, 'the')}: está amaldiçoad${itemBase(item.baseId).gender === 'f' ? 'a' : 'o'}!`, 'lightRed');
    return false;
  }
  delete game.hero.equipment[slot];
  if (!quiet) message(game, `Você tira ${itemName(game, item, 'the')}.`, 'lightGray');
  // Volta a juntar com pilhas iguais.
  const inv = inventory(game);
  const same = inv.find((i) => i !== item && canStack(i, item) && !isEquipped(game, i));
  if (same) {
    same.quantity += item.quantity;
    game.hero.inventory = inv.filter((i) => i !== item);
  }
  return true;
}

// ── Pegar e largar ───────────────────────────────────────────────────

/** Pega um item do chão. Ouro vai direto para a bolsa. */
export function pickUp(game: Game, item: Item): boolean {
  const lvl = level(game);
  if (item.baseId === 'gold') {
    game.hero.gold += item.quantity;
    removeFloorItem(lvl, item);
    message(game, `Você pega ${item.quantity} peças de ouro.`, 'gold');
    return true;
  }
  if (item.baseId === 'amulet_abyss') {
    game.hasAmulet = true;
    message(game, 'Você ergue o Coração do Abismo. Ele pulsa em sua mão como um coração vivo!', 'lightMagenta');
    message(game, 'Agora escape: volte ao andar 1 e suba a escada — ou invoque o Coração (tecla &) para voltar num instante.', 'gold');
  }
  const added = addToInventory(game, item);
  if (!added) {
    message(game, 'Você não tem espaço na mochila.', 'lightGray');
    return false;
  }
  removeFloorItem(lvl, item);
  emit(game, { type: 'pickup' });
  message(game, `${added.letter} - ${itemName(game, added)}.`, 'white');
  if (burden(game) > 0) message(game, burden(game) === 2 ? 'Você mal consegue se mexer com tanto peso!' : 'Você está sobrecarregado.', 'orange');
  return true;
}

export function dropItem(game: Game, item: Item, qty = item.quantity): boolean {
  const slot = slotOf(game, item);
  if (slot && !unequip(game, slot)) return false;
  const out = takeFromInventory(game, item, qty);
  out.x = game.player.x;
  out.y = game.player.y;
  out.letter = undefined;
  addItem(level(game), out);
  message(game, `Você larga ${itemName(game, out)}.`, 'lightGray');
  const map = level(game).map;
  if (map.tiles[game.player.y * map.width + game.player.x] === Tile.Altar && itemBase(out.baseId).category !== 'gold') {
    message(game, out.cursed ? 'Um brilho negro envolve o item: está amaldiçoado!' : 'Um brilho âmbar envolve o item: não está amaldiçoado.', out.cursed ? 'lightRed' : 'yellow');
  }
  return true;
}

/** Descreve o que há no chão quando o jogador pisa ali. */
export function describeFloor(game: Game): void {
  const items = itemsAt(level(game), game.player.x, game.player.y);
  if (!items.length) return;
  if (items.length === 1) message(game, `Você vê aqui ${itemName(game, items[0])}.`, 'lightGray');
  else message(game, `Há ${items.length} itens aqui (g para pegar).`, 'lightGray');
}
