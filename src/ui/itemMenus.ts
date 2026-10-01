import type { Screen } from '../engine/screens';
import type { Terminal } from '../engine/terminal';
import { wrapText } from '../engine/terminal';
import type { KeyInput } from '../data/keymap';
import type { Game } from '../core/game';
import { level, message } from '../core/game';
import type { Item } from '../core/item';
import { itemsAt, itemWeight } from '../core/item';
import { itemColor, itemGlyph, itemName } from '../core/itemText';
import { carryCapacity, equipped, isEquipped, slotOf, totalWeight } from '../core/inventory';
import type { Action } from '../core/actions';
import { THROW_RANGE } from '../core/actions';
import { readyAmmo } from '../core/ranged';
import type { EquipSlot, ItemCategory } from '../data/items';
import { CATEGORY_NAMES, CATEGORY_SLOT, SLOT_NAMES, SLOT_ORDER, itemBase } from '../data/items';
import type { App } from './app';
import type { MenuEntry } from './menuScreen';
import { MenuScreen } from './menuScreen';
import { TargetScreen } from './targetScreen';
import { TextWindow } from './textWindow';
import { SCREEN_COLS, SCREEN_ROWS } from './layout';

/** O que a tela de jogo oferece aos menus de itens. */
export interface ItemHost {
  app: App;
  game: Game;
  act(action: Action): boolean;
}

const fmtWeight = (w: number) => (Math.round(w * 10) / 10).toString().replace('.', ',');

function equipTag(game: Game, item: Item): string {
  const slot = slotOf(game, item);
  if (!slot) return '';
  const tags: Partial<Record<EquipSlot, string>> = { weapon: 'empunhado', quiver: 'na aljava', light: 'aceso' };
  return ` {darkGray}(${tags[slot] ?? 'vestido'}){/}`;
}

/** Ações possíveis para um item do inventário. */
function itemActions(host: ItemHost, item: Item): { label: string; run: () => void }[] {
  const { game } = host;
  const base = itemBase(item.baseId);
  const list: { label: string; run: () => void }[] = [];
  const slot = slotOf(game, item);
  if (slot) list.push({ label: 'Tirar / desequipar', run: () => host.act({ type: 'unequip', slot }) });
  else if (CATEGORY_SLOT[base.category]) list.push({ label: base.category === 'ammo' ? 'Pôr na aljava' : base.category === 'weapon' || base.category === 'launcher' ? 'Empunhar' : 'Vestir / usar', run: () => host.act({ type: 'equip', itemId: item.id }) });
  if (base.category === 'potion') list.push({ label: 'Beber', run: () => host.act({ type: 'quaff', itemId: item.id }) });
  if (base.category === 'food' || base.category === 'corpse') list.push({ label: 'Comer', run: () => host.act({ type: 'eat', itemId: item.id }) });
  if (base.category === 'scroll' || base.category === 'book') list.push({ label: 'Ler', run: () => host.act({ type: 'read', itemId: item.id }) });
  if (base.category === 'wand') list.push({ label: 'Usar (apontar)', run: () => aimWith(host, item, 'zap') });
  list.push({ label: 'Arremessar', run: () => aimWith(host, item, 'throw') });
  list.push({ label: 'Largar', run: () => host.act({ type: 'drop', itemId: item.id }) });
  list.push({ label: 'Examinar', run: () => examine(host, item) });
  return list;
}

function aimWith(host: ItemHost, item: Item, mode: 'throw' | 'zap'): void {
  host.app.screens.push(new TargetScreen(host.app, host.game, {
    mode: 'aim',
    prompt: `${mode === 'throw' ? 'Arremessar' : 'Apontar'} ${itemName(host.game, { ...item, quantity: 1 }, 'the')} em quem?`,
    range: THROW_RANGE,
    onConfirm: (p) => host.act(mode === 'throw' ? { type: 'throw', itemId: item.id, tx: p.x, ty: p.y } : { type: 'zap', itemId: item.id, tx: p.x, ty: p.y }),
  }));
}

export function examine(host: ItemHost, item: Item): void {
  const { game } = host;
  const base = itemBase(item.baseId);
  const lines: string[] = [`{white}${itemName(game, item)}{/}`, ''];
  for (const l of wrapText(base.desc, 90)) lines.push(l);
  lines.push('');
  if (base.damage && base.category !== 'ammo' && base.category !== 'launcher') lines.push(`Dano: ${base.damage}${item.enchant ? ` ${item.enchant > 0 ? '+' : ''}${item.enchant}` : ''}${base.finesse ? ' (leve: usa DES)' : ''}${base.twoHanded ? ' · duas mãos' : ''}`);
  if (base.throwDamage) lines.push(`Arremesso: ${base.throwDamage}`);
  if (base.category === 'launcher') lines.push(`Multiplicador ×${base.multiplier} · alcance ${base.range} · usa ${base.ammoType === 'arrow' ? 'flechas' : base.ammoType === 'bolt' ? 'virotes' : 'pedras'}`);
  if (base.category === 'ammo') lines.push(`Dano: ${base.damage} (multiplicado pela arma de disparo)`);
  if (base.armor !== undefined) lines.push(`Armadura: +${base.armor + (item.enchant ?? 0)}${base.spellPenalty ? ` · atrapalha magias (${base.spellPenalty}%)` : ''}`);
  if (base.light) lines.push(`Luz: +${base.light}${item.fuel !== undefined ? ` · combustível ${item.fuel} turnos` : ''}`);
  if (base.nutrition) lines.push(`Alimenta: ${base.nutrition}`);
  lines.push(`Peso: ${fmtWeight(itemWeight(item))}`);
  host.app.screens.push(new TextWindow(host.app, 'Examinar', lines));
}

/** Inventário: lista agrupada por categoria; escolher um item abre suas ações. */
export class InventoryScreen implements Screen {
  readonly modal = true;

  constructor(private host: ItemHost, private title = 'Inventário', private filter?: (i: Item) => boolean, private onPick?: (i: Item) => void) {}

  private items(): Item[] {
    const inv = this.host.game.hero.inventory;
    return this.filter ? inv.filter(this.filter) : inv;
  }

  onKey(k: KeyInput): void {
    if (k.key === 'Escape' || (k.key === 'i' && !this.onPick)) {
      this.host.app.screens.pop();
      return;
    }
    const item = this.items().find((i) => i.letter === k.key);
    if (!item) return;
    this.host.app.screens.pop();
    if (this.onPick) {
      this.onPick(item);
      return;
    }
    const actions = itemActions(this.host, item);
    this.host.app.screens.push(new MenuScreen(this.host.app, itemName(this.host.game, item), actions.map((a) => ({ label: a.label })), (i) => actions[i].run(), { width: 60 }));
  }

  render(term: Terminal): void {
    const { game } = this.host;
    const items = this.items();
    const w = 76;
    const x = Math.floor((SCREEN_COLS - w) / 2);
    let lastCat: ItemCategory | undefined;
    const rows: string[] = [];
    for (const it of items) {
      const cat = itemBase(it.baseId).category;
      if (cat !== lastCat) {
        rows.push(`{darkGray}── ${CATEGORY_NAMES[cat]} ──{/}`);
        lastCat = cat;
      }
      rows.push(`{yellow}${it.letter}){/} {${itemColor(it)}}${itemGlyph(it)}{/} ${itemName(game, it)}${equipTag(game, it)}`);
    }
    const h = Math.min(SCREEN_ROWS - 2, Math.max(6, rows.length + 5));
    term.box(x, 1, w, h, 'lightGray', this.title);
    if (!rows.length) term.print(x + 2, 3, this.filter ? 'Nenhum item adequado.' : 'Sua mochila está vazia.', 'darkGray');
    rows.slice(0, h - 5).forEach((r, i) => term.print(x + 2, 3 + i, r, 'white', 'black', w - 4));
    const cap = carryCapacity(game);
    const wt = totalWeight(game);
    term.print(x + 2, h - 1, `Peso ${fmtWeight(wt)}/${cap}  ·  Ouro ${game.hero.gold}  ·  [letra] escolhe · [Esc] fecha`, wt > cap ? 'orange' : 'darkGray', 'black', w - 4);
  }
}

/** Equipamento: um slot por linha; escolher um slot ocupado tira o item. */
export class EquipmentScreen implements Screen {
  readonly modal = true;
  constructor(private host: ItemHost) {}

  onKey(k: KeyInput): void {
    if (k.key === 'Escape' || k.key === 'e') {
      this.host.app.screens.pop();
      return;
    }
    const i = 'abcdefghijkl'.indexOf(k.key);
    if (i < 0 || i >= SLOT_ORDER.length) return;
    const slot = SLOT_ORDER[i];
    this.host.app.screens.pop();
    if (equipped(this.host.game, slot)) this.host.act({ type: 'unequip', slot });
    else {
      // Slot vazio: escolhe algo do inventário que caiba nele.
      const fits = (it: Item) => {
        const s = CATEGORY_SLOT[itemBase(it.baseId).category];
        return !isEquipped(this.host.game, it) && (s === slot || (slot === 'ring2' && s === 'ring1'));
      };
      this.host.app.screens.push(new InventoryScreen(this.host, `Equipar em: ${SLOT_NAMES[slot]}`, fits, (it) => this.host.act({ type: 'equip', itemId: it.id })));
    }
  }

  render(term: Terminal): void {
    const { game } = this.host;
    const w = 70;
    const x = Math.floor((SCREEN_COLS - w) / 2);
    term.box(x, 2, w, SLOT_ORDER.length + 5, 'lightGray', 'Equipamento');
    SLOT_ORDER.forEach((slot, i) => {
      const it = equipped(game, slot);
      term.print(x + 2, 4 + i, `{yellow}${'abcdefghijkl'[i]}){/} ${SLOT_NAMES[slot].padEnd(12)} ${it ? `{${itemColor(it)}}${itemName(game, it)}{/}` : '{darkGray}—{/}'}`, 'lightGray', 'black', w - 4);
    });
    term.print(x + 2, SLOT_ORDER.length + 5, '[letra] tira / equipa · [Esc] fecha', 'darkGray');
  }
}

/** Abre um seletor de item do inventário filtrado por categoria. */
export function pickFromInventory(host: ItemHost, title: string, cats: ItemCategory[] | null, onPick: (i: Item) => void, extra?: (i: Item) => boolean): void {
  const filter = (i: Item) => (!cats || cats.includes(itemBase(i.baseId).category)) && (!extra || extra(i));
  if (!host.game.hero.inventory.some(filter)) {
    message(host.game, 'Você não tem nada adequado.', 'darkGray');
    return;
  }
  host.app.screens.push(new InventoryScreen(host, title, filter, onPick));
}

/** Pegar: com vários itens no chão, abre um menu. */
export function pickupCommand(host: ItemHost): void {
  const items = itemsAt(level(host.game), host.game.player.x, host.game.player.y);
  if (!items.length) {
    message(host.game, 'Não há nada aqui para pegar.', 'darkGray');
    return;
  }
  if (items.length === 1) {
    host.act({ type: 'pickup', itemId: items[0].id });
    return;
  }
  const entries: MenuEntry[] = items.map((i) => ({ label: itemName(host.game, i), color: itemColor(i) }));
  host.app.screens.push(new MenuScreen(host.app, 'Pegar o quê?', entries, (idx) => host.act({ type: 'pickup', itemId: items[idx].id })));
}

/** Disparar: confere arma/munição e abre a mira. */
export function fireCommand(host: ItemHost): void {
  const { problem, launcher } = readyAmmo(host.game);
  if (problem) {
    message(host.game, problem, 'darkGray');
    return;
  }
  host.app.screens.push(new TargetScreen(host.app, host.game, {
    mode: 'aim', prompt: 'Disparar em quem?', range: itemBase(launcher!.baseId).range,
    onConfirm: (p) => host.act({ type: 'fire', tx: p.x, ty: p.y }),
  }));
}

/** Arremessar: escolhe o item (armas de arremesso primeiro) e o alvo. */
export function throwCommand(host: ItemHost): void {
  pickFromInventory(host, 'Arremessar o quê?', null, (item) => aimWith(host, item, 'throw'), (i) => !isEquipped(host.game, i) || itemBase(i.baseId).throwDamage !== undefined);
}
