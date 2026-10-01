import { describe, it, expect } from 'vitest';
import { createGame } from '../src/core/world';
import { level } from '../src/core/game';
import { playerAction } from '../src/core/turn';
import { createItem } from '../src/core/item';
import { addToInventory } from '../src/core/inventory';
import { itemName } from '../src/core/itemText';
import { isKnown } from '../src/core/identify';
import { addStatus, hasStatus, effectiveSpeed } from '../src/core/status';
import { createMonster } from '../src/core/monster';
import { monsterTemplate } from '../src/data/monsters';
import { RNG } from '../src/engine/rng';
import { gainXp, xpForLevel } from '../src/core/hero';
import { drainLevel } from '../src/core/combat';
import { IMPLEMENTED } from '../src/core/consumables';
import { ITEMS } from '../src/data/items';

function fresh(seed = 21) {
  const g = createGame(seed, { name: 'T', raceId: 'human', classId: 'warrior' });
  level(g).actors = [];
  return g;
}

describe('identificação', () => {
  it('poções têm aparências aleatórias diferentes por partida', () => {
    const a = fresh(1);
    const b = fresh(2);
    const names = (g: ReturnType<typeof fresh>) => ['potion_speed', 'potion_poison', 'potion_confusion'].map((id) => itemName(g, createItem(g, id)));
    expect(names(a)).not.toEqual(names(b));
    expect(names(a)[0]).toMatch(/^uma poção /);
  });

  it('beber uma poção a identifica para o resto da partida', () => {
    const g = fresh();
    const p = addToInventory(g, createItem(g, 'potion_speed', { quantity: 2 }))!;
    expect(isKnown(g, 'potion_speed')).toBe(false);
    playerAction(g, { type: 'quaff', itemId: p.id });
    expect(isKnown(g, 'potion_speed')).toBe(true);
    expect(itemName(g, p)).toBe('uma poção de velocidade');
    expect(hasStatus(g.player, 'hasted')).toBe(true);
  });

  it('pergaminho de identificação revela um item desconhecido', () => {
    const g = fresh();
    const sword = addToInventory(g, createItem(g, 'long_sword', { enchant: 3, rarity: 'magic', identified: false }))!;
    const scroll = addToInventory(g, createItem(g, 'scroll_identify'))!;
    playerAction(g, { type: 'read', itemId: scroll.id, targetId: sword.id });
    expect(sword.identified).toBe(true);
    expect(itemName(g, sword)).toContain('+3');
  });

  it('o equipamento inicial já é conhecido', () => {
    const g = fresh();
    expect(isKnown(g, 'potion_heal')).toBe(true);
  });

  it('todos os efeitos de consumíveis dos dados estão implementados', () => {
    for (const b of ITEMS) if (b.effect) expect(IMPLEMENTED.has(b.effect), `${b.id}: ${b.effect}`).toBe(true);
  });
});

describe('status', () => {
  it('veneno causa dano por turno e acaba', () => {
    const g = fresh();
    g.player.hp = g.player.maxHp = 100;
    addStatus(g, g.player, 'poisoned', 5, 2);
    for (let i = 0; i < 8; i++) playerAction(g, { type: 'wait' });
    expect(g.player.hp).toBeLessThanOrEqual(92);
    expect(hasStatus(g.player, 'poisoned')).toBe(false);
  });

  it('acelerado age 1,5× mais rápido; lento, metade', () => {
    const g = fresh();
    addStatus(g, g.player, 'hasted', 10);
    expect(effectiveSpeed(g.player)).toBe(150);
    g.player.effects = [];
    addStatus(g, g.player, 'slowed', 10);
    expect(effectiveSpeed(g.player)).toBe(50);
  });

  it('dormindo, o jogador perde turnos; dano acorda', () => {
    const g = fresh();
    addStatus(g, g.player, 'asleep', 5);
    const t = g.turn;
    playerAction(g, { type: 'wait' });
    expect(g.turn - t).toBeGreaterThan(1);
  });

  it('elfos resistem a sono', () => {
    const g = createGame(3, { name: 'E', raceId: 'elf', classId: 'mage' });
    expect(addStatus(g, g.player, 'asleep', 5)).toBe(false);
  });

  it('poção arremessada afeta o monstro atingido', () => {
    const g = fresh();
    const m = createMonster(g, monsterTemplate('orc'), g.player.x, g.player.y, new RNG(1));
    // coloca o orc numa casa livre próxima
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) {
      const x = g.player.x + dx;
      const y = g.player.y + dy;
      if (level(g).map.tiles[y * level(g).map.width + x] !== 0) {
        m.x = x;
        m.y = y;
        break;
      }
    }
    m.ai.state = 'sleeping';
    level(g).actors.push(m);
    const potion = addToInventory(g, createItem(g, 'potion_confusion'))!;
    g.player.accuracy = 200;
    playerAction(g, { type: 'throw', itemId: potion.id, tx: m.x, ty: m.y });
    expect(hasStatus(m, 'confused')).toBe(true);
  });

  it('dreno de nível tira um nível e a poção de restauração devolve', () => {
    const g = fresh();
    gainXp(g, xpForLevel(4));
    const lvl = g.hero.level;
    drainLevel(g);
    expect(g.hero.level).toBe(lvl - 1);
    const p = addToInventory(g, createItem(g, 'potion_restore'))!;
    playerAction(g, { type: 'quaff', itemId: p.id });
    expect(g.hero.level).toBe(lvl);
  });
});

describe('varinhas', () => {
  it('varinha de gelo causa dano, gasta carga e se identifica', () => {
    const g = fresh();
    const m = createMonster(g, monsterTemplate('ogre'), 0, 0, new RNG(1));
    m.hp = m.maxHp = 500;
    // procura uma casa de chão em linha reta
    const map = level(g).map;
    let placed = false;
    for (let d = 2; d <= 5 && !placed; d++) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        let ok = true;
        for (let k = 1; k <= d; k++) if (![1, 2].includes(map.tiles[(g.player.y + dy * k) * map.width + g.player.x + dx * k])) ok = false;
        if (ok) {
          m.x = g.player.x + dx * d;
          m.y = g.player.y + dy * d;
          placed = true;
          break;
        }
      }
    }
    expect(placed).toBe(true);
    level(g).actors.push(m);
    const wand = addToInventory(g, createItem(g, 'wand_cold', { charges: 3 }))!;
    playerAction(g, { type: 'zap', itemId: wand.id, tx: m.x, ty: m.y });
    expect(wand.charges).toBe(2);
    expect(m.hp).toBeLessThan(500);
    expect(isKnown(g, 'wand_cold')).toBe(true);
  });
});

describe('aparências', () => {
  it('cada tipo de pergaminho/poção tem aparência única', async () => {
    const { createIdState } = await import('../src/core/identify');
    for (let seed = 1; seed <= 50; seed++) {
      const st = createIdState(seed);
      for (const cat of ['potion', 'scroll']) {
        const looks = ITEMS.filter((b) => b.category === cat).map((b) => st.appearances[b.id]);
        expect(new Set(looks).size, `seed ${seed} ${cat}`).toBe(looks.length);
      }
    }
  });
});
