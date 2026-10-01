import { describe, it, expect } from 'vitest';
import { level } from '../src/core/game';
import { playerAction } from '../src/core/turn';
import { createItem, addItem } from '../src/core/item';
import { addToInventory, burden, equipped, isEquipped, totalWeight } from '../src/core/inventory';
import { createHero, recalcPlayer } from '../src/core/hero';
import { giveStartingKit, createGame, enterLevel } from '../src/core/world';
import { itemName, pluralize } from '../src/core/itemText';
import { createMonster } from '../src/core/monster';
import { monsterTemplate } from '../src/data/monsters';
import { CLASSES } from '../src/data/classes';
import { RNG } from '../src/engine/rng';
import { createTestGame } from './helpers';

function warriorGame() {
  const g = createTestGame(4);
  g.hero = createHero('T', 'human', 'warrior');
  recalcPlayer(g);
  g.player.x = 8;
  g.player.y = 4;
  return g;
}

describe('nomes de itens', () => {
  it('artigos, plurais e encantamento em português', () => {
    const g = warriorGame();
    expect(itemName(g, createItem(g, 'long_sword'))).toBe('uma espada longa');
    expect(itemName(g, createItem(g, 'long_sword', { enchant: 2 }), 'the')).toBe('a espada longa +2');
    expect(itemName(g, createItem(g, 'potion_heal', { quantity: 3 }))).toBe('3 poções de cura');
    expect(itemName(g, createItem(g, 'arrow', { quantity: 12 }))).toBe('12 flechas');
    expect(pluralize('bordão')).toBe('bordões');
  });
});

describe('inventário', () => {
  it('pegar item do chão coloca no inventário com letra; pilhas iguais se juntam', () => {
    const g = warriorGame();
    addItem(level(g), createItem(g, 'potion_heal', { x: 8, y: 4 }));
    expect(playerAction(g, { type: 'pickup' })).toBe(true);
    addItem(level(g), createItem(g, 'potion_heal', { x: 8, y: 4 }));
    playerAction(g, { type: 'pickup' });
    expect(g.hero.inventory).toHaveLength(1);
    expect(g.hero.inventory[0].quantity).toBe(2);
    expect(g.hero.inventory[0].letter).toBe('a');
    expect(level(g).items).toHaveLength(0);
  });

  it('ouro é pego automaticamente ao andar', () => {
    const g = warriorGame();
    addItem(level(g), createItem(g, 'gold', { x: 9, y: 4, quantity: 37 }));
    playerAction(g, { type: 'move', dx: 1, dy: 0 });
    expect(g.hero.gold).toBe(37);
  });

  it('largar devolve o item ao chão', () => {
    const g = warriorGame();
    const it = addToInventory(g, createItem(g, 'ration', { quantity: 3 }))!;
    playerAction(g, { type: 'drop', itemId: it.id, quantity: 1 });
    expect(it.quantity).toBe(2);
    expect(level(g).items.some((i) => i.baseId === 'ration' && i.quantity === 1)).toBe(true);
  });
});

describe('equipamento', () => {
  it('empunhar uma arma muda o dano; vestir armadura aumenta a defesa', () => {
    const g = warriorGame();
    const fist = g.player.attacks[0].damage;
    const sword = addToInventory(g, createItem(g, 'greatsword', { enchant: 1 }))!;
    playerAction(g, { type: 'equip', itemId: sword.id });
    expect(g.player.attacks[0].damage).not.toBe(fist);
    expect(g.player.attacks[0].damage.startsWith('2d6')).toBe(true);
    const def = g.player.defense;
    const mail = addToInventory(g, createItem(g, 'chain_mail'))!;
    playerAction(g, { type: 'equip', itemId: mail.id });
    expect(g.player.defense).toBe(def + 5);
  });

  it('arma de duas mãos tira o escudo', () => {
    const g = warriorGame();
    const shield = addToInventory(g, createItem(g, 'small_shield'))!;
    playerAction(g, { type: 'equip', itemId: shield.id });
    expect(isEquipped(g, shield)).toBe(true);
    const bow = addToInventory(g, createItem(g, 'long_bow'))!;
    playerAction(g, { type: 'equip', itemId: bow.id });
    expect(isEquipped(g, bow)).toBe(true);
    expect(isEquipped(g, shield)).toBe(false);
  });

  it('item amaldiçoado não sai', () => {
    const g = warriorGame();
    const ring = addToInventory(g, createItem(g, 'ring_protection', { cursed: true, enchant: -2 }))!;
    playerAction(g, { type: 'equip', itemId: ring.id });
    expect(playerAction(g, { type: 'unequip', slot: 'ring1' })).toBe(false);
    expect(isEquipped(g, ring)).toBe(true);
  });

  it('dois anéis ocupam os dois slots', () => {
    const g = warriorGame();
    const a = addToInventory(g, createItem(g, 'ring_protection'))!;
    const b = addToInventory(g, createItem(g, 'ring_strength'))!;
    playerAction(g, { type: 'equip', itemId: a.id });
    playerAction(g, { type: 'equip', itemId: b.id });
    expect(equipped(g, 'ring1')?.id).toBe(a.id);
    expect(equipped(g, 'ring2')?.id).toBe(b.id);
  });

  it('tocha acesa aumenta o raio de luz', () => {
    const g = warriorGame();
    const before = g.player.light;
    const torch = addToInventory(g, createItem(g, 'torch'))!;
    playerAction(g, { type: 'equip', itemId: torch.id });
    expect(g.player.light).toBe(before + 2);
  });

  it('peso demais deixa sobrecarregado e mais lento', () => {
    const g = warriorGame();
    const speed = g.player.speed;
    for (let i = 0; i < 6; i++) addToInventory(g, createItem(g, 'plate_mail'));
    recalcPlayer(g);
    expect(totalWeight(g)).toBeGreaterThan(200);
    expect(burden(g)).toBeGreaterThan(0);
    expect(g.player.speed).toBeLessThan(speed);
  });
});

describe('kit inicial', () => {
  it('todas as classes começam com arma/armadura/tocha equipadas', () => {
    for (const c of CLASSES) {
      const g = createGame(2, { name: 'K', raceId: 'human', classId: c.id });
      expect(equipped(g, 'weapon'), c.id).toBeDefined();
      expect(equipped(g, 'body'), c.id).toBeDefined();
      expect(equipped(g, 'light'), c.id).toBeDefined();
      expect(g.player.light).toBeGreaterThanOrEqual(3);
    }
  });

  it('o Patrulheiro começa com arco e flechas na aljava e consegue disparar', () => {
    const g = createGame(2, { name: 'R', raceId: 'elf', classId: 'ranger' });
    expect(equipped(g, 'weapon')?.baseId).toBe('short_bow');
    const ammo = equipped(g, 'quiver')!;
    expect(ammo.baseId).toBe('arrow');
    level(g).actors = [];
    const m = createMonster(g, monsterTemplate('rat'), g.player.x, g.player.y, new RNG(1));
    // Coloca o rato numa célula livre ao lado.
    m.x = g.player.x + 1;
    if (level(g).map.tiles[m.y * level(g).map.width + m.x] === 0) m.x = g.player.x - 1;
    level(g).actors.push(m);
    const n = ammo.quantity;
    expect(playerAction(g, { type: 'fire', tx: m.x, ty: m.y })).toBe(true);
    expect(ammo.quantity).toBe(n - 1);
  });

  it('giveStartingKit é idempotente quanto a slots (não equipa duas armas)', () => {
    const g = warriorGame();
    giveStartingKit(g);
    const weapons = g.hero.inventory.filter((i) => isEquipped(g, i) && ['long_sword', 'small_shield'].includes(i.baseId));
    expect(weapons).toHaveLength(2);
  });
});

describe('itens no chão', () => {
  it('andares têm itens e ouro', () => {
    const g = createGame(8);
    enterLevel(g, 3, 'up');
    expect(level(g).items.length).toBeGreaterThan(3);
    expect(level(g).items.some((i) => i.baseId === 'gold')).toBe(true);
  });
});
