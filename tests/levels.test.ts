import { describe, it, expect } from 'vitest';
import { RNG } from '../src/engine/rng';
import { generateDungeon } from '../src/gen/dungeon';
import { isFullyConnected } from '../src/gen/dungeon/common';
import { getTile } from '../src/core/map';
import { Tile } from '../src/data/tiles';
import { createGame, enterLevel } from '../src/core/world';
import { level } from '../src/core/game';
import { playerAction } from '../src/core/turn';
import { monsterTemplate } from '../src/data/monsters';

describe('geradores de andar', () => {
  for (const gen of ['rogue', 'bsp', 'caves'] as const) {
    it(`${gen}: 150 andares conectados com escadas`, () => {
      for (let seed = 1; seed <= 150; seed++) {
        const g = generateDungeon(new RNG(seed * 7), 1 + (seed % 20), gen);
        expect(isFullyConnected(g.map, g.up), `${gen} seed ${seed}`).toBe(true);
        expect(getTile(g.map, g.up.x, g.up.y)).toBe(Tile.StairsUp);
        expect(getTile(g.map, g.down.x, g.down.y)).toBe(Tile.StairsDown);
        expect(g.up).not.toEqual(g.down);
      }
    });
  }
});

describe('múltiplos andares', () => {
  it('descer pela escada leva ao andar seguinte; subir volta ao mesmo mapa', () => {
    const g = createGame(99);
    const first = level(g);
    g.player.x = first.down.x;
    g.player.y = first.down.y;
    level(g).actors = [];
    expect(playerAction(g, { type: 'descend' })).toBe(true);
    expect(g.depth).toBe(2);
    expect(g.maxDepth).toBe(2);
    expect([g.player.x, g.player.y]).toEqual([level(g).up.x, level(g).up.y]);
    level(g).actors = [];
    expect(playerAction(g, { type: 'ascend' })).toBe(true);
    expect(g.depth).toBe(1);
    expect(level(g)).toBe(first);
    expect([g.player.x, g.player.y]).toEqual([first.down.x, first.down.y]);
  });

  it('não desce fora da escada e não sai pelo andar 1', () => {
    const g = createGame(5);
    level(g).actors = [];
    g.player.x = level(g).up.x;
    g.player.y = level(g).up.y;
    expect(playerAction(g, { type: 'descend' })).toBe(false);
    expect(playerAction(g, { type: 'ascend' })).toBe(false);
    expect(g.depth).toBe(1);
  });

  it('andares mais fundos têm monstros mais fortes', () => {
    const avgLevel = (depth: number) => {
      let total = 0;
      let n = 0;
      for (let seed = 1; seed <= 20; seed++) {
        const g = createGame(seed);
        enterLevel(g, depth, 'up');
        for (const m of level(g).actors) {
          total += monsterTemplate(m.templateId).level;
          n++;
        }
      }
      return total / n;
    };
    const shallow = avgLevel(1);
    const mid = avgLevel(10);
    const deep = avgLevel(18);
    expect(mid).toBeGreaterThan(shallow * 2);
    expect(deep).toBeGreaterThan(mid);
  });

  it('o mesmo andar sai igual para a mesma seed, independente da ordem de visita', () => {
    const a = createGame(321);
    enterLevel(a, 3, 'up');
    const b = createGame(321);
    enterLevel(b, 2, 'up');
    enterLevel(b, 3, 'up');
    expect(a.levels[3].map.tiles).toEqual(b.levels[3].map.tiles);
  });
});
