import { describe, it, expect } from 'vitest';
import { RNG } from '../src/engine/rng';
import { generateSpell } from '../src/gen/spells';
import { createGame } from '../src/core/world';
import { gainXp, xpForLevel } from '../src/core/hero';
import { SPELLS } from '../src/data/spells';
import { parseDice } from '../src/engine/rng';
import { createItem } from '../src/core/item';
import { addToInventory } from '../src/core/inventory';
import { playerAction } from '../src/core/turn';
import { level } from '../src/core/game';

describe('magias procedurais', () => {
  it('toda magia gerada é válida e o custo cresce com o nível', () => {
    const rng = new RNG(8);
    for (let i = 0; i < 500; i++) {
      const s = generateSpell(rng, 1 + (i % 20), i % 2 ? 'arcane' : 'divine');
      expect(s.name.length).toBeGreaterThan(5);
      expect(s.cost).toBeGreaterThanOrEqual(2);
      expect(s.fail).toBeLessThanOrEqual(60);
      if (s.effect === 'damage') {
        expect(() => parseDice(s.power!)).not.toThrow();
        expect(s.element).toBeTruthy();
      }
    }
    const low = Array.from({ length: 50 }, () => generateSpell(rng, 1, 'arcane')).filter((s) => s.effect === 'damage');
    const high = Array.from({ length: 50 }, () => generateSpell(rng, 18, 'arcane')).filter((s) => s.effect === 'damage');
    const avg = (l: typeof low) => l.reduce((a, s) => a + s.cost, 0) / l.length;
    expect(avg(high)).toBeGreaterThan(avg(low) * 2);
  });

  it('nomes procedurais seguem o padrão forma + elemento + de Nome', () => {
    const s = generateSpell(new RNG(3), 10, 'arcane');
    expect(s.name).toMatch(/ de [A-Z]/);
  });
});

describe('aprendizado de magias', () => {
  it('magos aprendem magias arcanas ao subir de nível; guerreiros não', () => {
    const mage = createGame(1, { name: 'M', raceId: 'elf', classId: 'mage' });
    gainXp(mage, xpForLevel(11));
    expect(mage.hero.spells).toContain('fireball');
    expect(mage.hero.spells).toContain('frost_bolt');
    const war = createGame(1, { name: 'W', raceId: 'dwarf', classId: 'warrior' });
    gainXp(war, xpForLevel(11));
    expect(war.hero.spells).toHaveLength(0);
  });

  it('clérigos aprendem as orações da escola divina', () => {
    const c = createGame(1, { name: 'C', raceId: 'human', classId: 'cleric' });
    gainXp(c, xpForLevel(9));
    expect(c.hero.spells).toEqual(expect.arrayContaining(['cure_light', 'bless', 'purify', 'holy_light', 'smite']));
    expect(c.hero.spells.some((id) => SPELLS.find((s) => s.id === id)?.school === 'arcane')).toBe(false);
  });

  it('tomo com magia procedural ensina essa magia (ou recusa se for avançada demais)', () => {
    const g = createGame(2, { name: 'M', raceId: 'gnome', classId: 'mage' });
    level(g).actors = [];
    const spell = generateSpell(new RNG(1), 1, 'arcane');
    spell.level = 2;
    g.customSpells = [spell];
    const tome = addToInventory(g, createItem(g, 'tome_arcane', { spellId: spell.id }))!;
    expect(playerAction(g, { type: 'read', itemId: tome.id })).toBe(true);
    expect(g.hero.spells).toContain(spell.id);
    const hard = generateSpell(new RNG(2), 20, 'arcane');
    hard.level = 20;
    g.customSpells.push(hard);
    const tome2 = addToInventory(g, createItem(g, 'tome_arcane', { spellId: hard.id }))!;
    expect(playerAction(g, { type: 'read', itemId: tome2.id })).toBe(false);
    expect(g.hero.spells).not.toContain(hard.id);
  });
});
