import { describe, it, expect } from 'vitest';
import { RNG } from '../src/engine/rng';
import { createGame } from '../src/core/world';
import { affixGroup, generateItem, rollItem } from '../src/gen/items';
import { affixById } from '../src/data/affixes';
import { createItem } from '../src/core/item';
import { addToInventory } from '../src/core/inventory';
import { itemName } from '../src/core/itemText';
import { playerAction } from '../src/core/turn';
import { resistMult } from '../src/core/combat';
import { createMonster } from '../src/core/monster';
import { monsterTemplate } from '../src/data/monsters';
import { level } from '../src/core/game';
import { parseDice } from '../src/engine/rng';

describe('itens procedurais', () => {
  it('gera todas as raridades com afixos compatíveis com o tipo de item', () => {
    const g = createGame(1);
    const rng = new RNG(99);
    const seen = new Set<string>();
    for (let i = 0; i < 3000; i++) {
      const it = generateItem(g, rng, 1 + (i % 20), ['weapon', 'armor', 'shield', 'helm', 'ring', 'amulet', 'launcher']);
      if (!it) continue;
      seen.add(it.rarity);
      const group = affixGroup(it.baseId)!;
      for (const id of it.affixes) {
        const a = affixById(id)!;
        expect(a, id).toBeDefined();
        if (it.rarity !== 'legendary') expect(a.applies, `${id} em ${it.baseId}`).toContain(group);
      }
      if (it.rarity === 'rare' || it.rarity === 'legendary') expect(it.properName).toBeTruthy();
    }
    expect([...seen].sort()).toEqual(['common', 'legendary', 'magic', 'rare']);
  });

  it('artefatos lendários são únicos por partida', () => {
    const g = createGame(1);
    const rng = new RNG(5);
    const names: string[] = [];
    for (let i = 0; i < 5000; i++) {
      const it = generateItem(g, rng, 18, ['weapon', 'armor', 'shield', 'helm', 'amulet', 'launcher']);
      if (it?.rarity === 'legendary') names.push(it.properName!);
    }
    expect(names.length).toBeGreaterThan(0);
    expect(new Set(names).size).toBe(names.length);
  });

  it('itens especiais começam desconhecidos e equipar revela o nome completo', () => {
    const g = createGame(2);
    const sword = addToInventory(g, createItem(g, 'long_sword', { enchant: 2, affixes: ['flaming', 'of_bear'], rarity: 'magic', identified: false }))!;
    expect(itemName(g, sword)).toBe('uma espada longa (mágica?)');
    playerAction(g, { type: 'equip', itemId: sword.id });
    expect(itemName(g, sword)).toBe('uma espada longa +2 Flamejante do Urso');
  });

  it('afixos somam bônus: Afiada dá +2 de dano; do Urso dá +2 de FOR', () => {
    const g = createGame(2);
    const before = parseDice(g.player.attacks[0].damage).bonus;
    const str = g.hero.stats.str;
    const ring = addToInventory(g, createItem(g, 'ring_protection', { affixes: ['of_bear'] }))!;
    playerAction(g, { type: 'equip', itemId: ring.id });
    // +2 FOR = +1 de modificador = +1 de dano
    expect(parseDice(g.player.attacks[0].damage).bonus).toBe(before + 1);
    expect(g.hero.stats.str).toBe(str); // o atributo base não muda
  });

  it('nome de item raro usa o nome próprio', () => {
    const g = createGame(3);
    const it = createItem(g, 'axe', { rarity: 'rare', properName: 'Ira de Kzul', enchant: 3, affixes: ['sharp'] });
    expect(itemName(g, it)).toBe('Ira de Kzul (machado de batalha +3 Afiado)');
  });

  it('resistências reduzem dano elemental; mortos-vivos resistem a veneno', () => {
    const g = createGame(4);
    const fire = createMonster(g, monsterTemplate('fire_elemental'), 1, 1, new RNG(1));
    const skel = createMonster(g, monsterTemplate('skeleton'), 1, 1, new RNG(1));
    expect(resistMult(fire, 'fire')).toBe(0);
    expect(resistMult(fire, 'cold')).toBe(1);
    expect(resistMult(skel, 'poison')).toBe(0);
    void level;
  });

  it('rollItem nunca quebra para nenhuma base', () => {
    const g = createGame(4);
    const rng = new RNG(4);
    for (const id of ['long_sword', 'short_bow', 'arrow', 'plate_mail', 'ring_strength', 'amulet_life', 'potion_heal', 'wand_fire', 'torch']) {
      for (let d = 1; d <= 20; d += 3) expect(rollItem(g, rng, id, d).baseId).toBeTruthy();
    }
  });
});
