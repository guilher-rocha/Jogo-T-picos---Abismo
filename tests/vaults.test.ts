import { describe, it, expect } from 'vitest';
import { createGame, enterLevel } from '../src/core/world';
import { level } from '../src/core/game';
import { isFullyConnected } from '../src/gen/dungeon/common';
import { gainXp, xpForLevel } from '../src/core/hero';
import { playerAction } from '../src/core/turn';
import { createMonster } from '../src/core/monster';
import { monsterTemplate } from '../src/data/monsters';
import { RNG } from '../src/engine/rng';
import { equipped } from '../src/core/inventory';

describe('salas especiais', () => {
  it('aparecem em alguns andares e o andar continua todo conectado', () => {
    let vaults = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const g = createGame(seed);
      for (const d of [3, 6, 9]) {
        enterLevel(g, d, 'up');
        const lvl = level(g);
        if (lvl.vault) vaults++;
        expect(isFullyConnected(lvl.map, lvl.up), `seed ${seed} andar ${d}`).toBe(true);
      }
    }
    expect(vaults).toBeGreaterThan(5);
  });
});

describe('disparo duplo', () => {
  it('o Patrulheiro nível 5 dispara duas flechas', () => {
    const g = createGame(4, { name: 'R', raceId: 'elf', classId: 'ranger' });
    gainXp(g, xpForLevel(5));
    level(g).actors = [];
    const m = createMonster(g, monsterTemplate('ogre'), g.player.x + 1, g.player.y, new RNG(1));
    m.hp = m.maxHp = 999;
    level(g).actors.push(m);
    const ammo = equipped(g, 'quiver')!;
    const n = ammo.quantity;
    playerAction(g, { type: 'ability', abilityId: 'double_shot', dx: m.x, dy: m.y });
    expect(ammo.quantity).toBe(n - 2);
  });
});
