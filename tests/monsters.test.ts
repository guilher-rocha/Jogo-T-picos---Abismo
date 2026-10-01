import { describe, it, expect } from 'vitest';
import { RNG } from '../src/engine/rng';
import { createGame, enterLevel } from '../src/core/world';
import { level } from '../src/core/game';
import { createMonster } from '../src/core/monster';
import { monsterTemplate } from '../src/data/monsters';
import { makeChampion, rollMonsterMods, MONSTER_MODS } from '../src/gen/monsterMods';
import { theName } from '../src/core/text';
import { playerAction } from '../src/core/turn';
import { monsterSpecial } from '../src/core/monsterSpecial';

describe('monstros procedurais', () => {
  it('modificadores mudam atributos e nome com concordância de gênero', () => {
    const g = createGame(1);
    const rng = new RNG(1);
    const spider = createMonster(g, monsterTemplate('giant_spider'), 1, 1, rng);
    const hp = spider.maxHp;
    MONSTER_MODS.find((m) => m.id === 'giant')!.apply(spider);
    expect(spider.maxHp).toBe(hp * 2);
    const orc = createMonster(g, monsterTemplate('orc'), 1, 1, rng);
    for (let i = 0; i < 200 && !orc.mods?.length; i++) rollMonsterMods(new RNG(i), orc, 20);
    expect(orc.mods?.length).toBe(1);
    expect(orc.name).not.toBe('orc');
  });

  it('campeões têm nome próprio, mais vida e aparecem nos andares', () => {
    const g = createGame(2);
    const m = createMonster(g, monsterTemplate('goblin'), 1, 1, new RNG(3));
    const hp = m.maxHp;
    makeChampion(new RNG(4), m, 6);
    expect(m.flags).toContain('champion');
    expect(m.maxHp).toBeGreaterThan(hp);
    expect(theName(m)).toBe(m.name); // sem artigo
    let found = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const gg = createGame(seed);
      enterLevel(gg, 6, 'up');
      if (level(gg).actors.some((a) => a.flags.includes('champion'))) found++;
    }
    expect(found).toBeGreaterThan(0);
  });

  it('andares fundos têm mais monstros com modificadores', () => {
    const count = (depth: number) => {
      let mods = 0;
      for (let seed = 1; seed <= 15; seed++) {
        const g = createGame(seed);
        enterLevel(g, depth, 'up');
        mods += level(g).actors.filter((a) => a.mods?.length).length;
      }
      return mods;
    };
    expect(count(16)).toBeGreaterThan(count(2));
  });

  it('dragões cospem fogo e conjuradores lançam magias', () => {
    const g = createGame(5);
    level(g).actors = [];
    g.player.hp = g.player.maxHp = 1000;
    const dragon = createMonster(g, monsterTemplate('red_dragon'), g.player.x, g.player.y, new RNG(1));
    dragon.x = g.player.x + 3;
    level(g).actors.push(dragon);
    monsterSpecial(g, dragon, 'breath');
    expect(g.player.hp).toBeLessThan(1000);
    const shaman = createMonster(g, monsterTemplate('goblin_shaman'), g.player.x - 2, g.player.y, new RNG(1));
    level(g).actors.push(shaman);
    monsterSpecial(g, shaman, 'cast');
    expect(g.log.some((l) => l.text.includes('conjura'))).toBe(true);
    void playerAction;
  });
});
