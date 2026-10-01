import { describe, it, expect } from 'vitest';
import { RNG } from '../src/engine/rng';
import { generateDungeon } from '../src/gen/dungeon';
import { bfsDistances, isFullyConnected, isPassableForGen } from '../src/gen/dungeon/common';
import { getTile, idx } from '../src/core/map';
import { Tile } from '../src/data/tiles';
import { createGame } from '../src/core/world';
import { level } from '../src/core/game';

describe('geração de andares', () => {
  it('300 andares: todos conectados e com as duas escadas alcançáveis', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const depth = 1 + (seed % 20);
      const g = generateDungeon(new RNG(seed), depth);
      expect(isFullyConnected(g.map, g.up), `seed ${seed}`).toBe(true);
      expect(getTile(g.map, g.up.x, g.up.y)).toBe(Tile.StairsUp);
      expect(getTile(g.map, g.down.x, g.down.y)).toBe(Tile.StairsDown);
      const dist = bfsDistances(g.map, g.up);
      expect(dist[idx(g.map, g.down.x, g.down.y)]).toBeGreaterThan(0);
    }
  });

  it('a borda do mapa é sempre parede', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const { map } = generateDungeon(new RNG(seed), 1);
      for (let x = 0; x < map.width; x++) {
        expect(isPassableForGen(getTile(map, x, 0))).toBe(false);
        expect(isPassableForGen(getTile(map, x, map.height - 1))).toBe(false);
      }
      for (let y = 0; y < map.height; y++) {
        expect(isPassableForGen(getTile(map, 0, y))).toBe(false);
        expect(isPassableForGen(getTile(map, map.width - 1, y))).toBe(false);
      }
    }
  });

  it('salas não se sobrepõem', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const { rooms } = generateDungeon(new RNG(seed), 3);
      const real = rooms.filter((r) => !r.gone);
      for (let i = 0; i < real.length; i++) {
        for (let j = i + 1; j < real.length; j++) {
          const a = real[i];
          const b = real[j];
          const overlap = a.x - 1 <= b.x + b.w && b.x - 1 <= a.x + a.w && a.y - 1 <= b.y + b.h && b.y - 1 <= a.y + a.h;
          expect(overlap, `seed ${seed}`).toBe(false);
        }
      }
    }
  });

  it('mesma seed gera o mesmo andar', () => {
    const a = createGame(1234);
    const b = createGame(1234);
    expect(level(a).map.tiles).toEqual(level(b).map.tiles);
    expect(level(a).actors.map((m) => [m.templateId, m.x, m.y])).toEqual(level(b).actors.map((m) => [m.templateId, m.x, m.y]));
  });

  it('jogador começa na escada de subida e monstros nascem em chão livre', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const g = createGame(seed);
      const lvl = level(g);
      expect([g.player.x, g.player.y]).toEqual([lvl.up.x, lvl.up.y]);
      for (const m of lvl.actors) {
        expect(isPassableForGen(getTile(lvl.map, m.x, m.y))).toBe(true);
        expect(m.x === g.player.x && m.y === g.player.y).toBe(false);
      }
    }
  });
});
