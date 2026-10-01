import { describe, it, expect } from 'vitest';
import { createGame } from '../src/core/world';
import { gainXp, killXp, MAX_LEVEL, raiseStat, statMod, xpForLevel } from '../src/core/hero';
import { RACES } from '../src/data/races';
import { CLASSES } from '../src/data/classes';

describe('atributos e XP', () => {
  it('modificador de atributo segue a regra (v-10)/2', () => {
    expect(statMod(10)).toBe(0);
    expect(statMod(11)).toBe(0);
    expect(statMod(16)).toBe(3);
    expect(statMod(8)).toBe(-1);
    expect(statMod(7)).toBe(-2);
  });

  it('curva de XP é crescente até o nível máximo', () => {
    for (let L = 2; L <= MAX_LEVEL; L++) expect(xpForLevel(L)).toBeGreaterThan(xpForLevel(L - 1));
    expect(xpForLevel(2)).toBe(10);
  });

  it('XP por morte escala com a diferença de nível, com limites', () => {
    expect(killXp(10, 5, 5)).toBe(10);
    expect(killXp(10, 10, 1)).toBe(20); // no máximo ×2
    expect(killXp(10, 1, 20)).toBe(3); // no mínimo ×0,25
  });

  it('subir de nível aumenta HP máximo e precisão', () => {
    const g = createGame(1, { name: 'T', raceId: 'dwarf', classId: 'warrior' });
    const hp = g.player.maxHp;
    const acc = g.player.accuracy;
    gainXp(g, xpForLevel(5));
    expect(g.hero.level).toBe(5);
    expect(g.player.maxHp).toBeGreaterThan(hp);
    expect(g.player.accuracy).toBeGreaterThan(acc);
    expect(g.log.some((m) => m.text.includes('nível 5'))).toBe(true);
  });

  it('a cada 4 níveis ganha um ponto de atributo', () => {
    const g = createGame(1);
    gainXp(g, xpForLevel(8) + 5);
    expect(g.hero.level).toBeGreaterThanOrEqual(8);
    expect(g.hero.statPoints).toBe(2);
    const str = g.hero.stats.str;
    expect(raiseStat(g, 'str')).toBe(true);
    expect(g.hero.stats.str).toBe(str + 1);
    expect(g.hero.statPoints).toBe(1);
  });

  it('humanos ganham 15% a mais de XP', () => {
    const h = createGame(1, { name: 'H', raceId: 'human', classId: 'warrior' });
    const d = createGame(1, { name: 'D', raceId: 'dwarf', classId: 'warrior' });
    gainXp(h, 100);
    gainXp(d, 100);
    expect(h.hero.xp).toBe(115);
    expect(d.hero.xp).toBe(100);
  });

  it('raças e classes geram personagens diferentes', () => {
    const elfMage = createGame(1, { name: 'E', raceId: 'elf', classId: 'mage' });
    const orcWar = createGame(1, { name: 'O', raceId: 'half_orc', classId: 'warrior' });
    expect(orcWar.player.maxHp).toBeGreaterThan(elfMage.player.maxHp * 1.5);
    expect(elfMage.player.maxMp).toBeGreaterThan(0);
    expect(orcWar.player.maxMp).toBe(0);
    expect(elfMage.player.light).toBe(orcWar.player.light + 1);
    expect(elfMage.hero.stats.int).toBeGreaterThan(orcWar.hero.stats.int);
  });

  it('todas as combinações raça×classe são válidas', () => {
    for (const r of RACES) {
      for (const c of CLASSES) {
        const g = createGame(3, { name: 'X', raceId: r.id, classId: c.id });
        expect(g.player.maxHp, `${r.id}/${c.id}`).toBeGreaterThan(0);
        expect(g.player.hp).toBe(g.player.maxHp);
      }
    }
  });
});
