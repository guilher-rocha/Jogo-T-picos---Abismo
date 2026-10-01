import { describe, it, expect } from 'vitest';
import { createGame } from '../src/core/world';
import { playerAction } from '../src/core/turn';
import { autoExploreStep } from '../src/ai/explore';
import { level } from '../src/core/game';

describe('autoexplorar', () => {
  it('sem monstros, explora o andar inteiro sem travar', () => {
    for (const seed of [42, 7, 99]) {
      const g = createGame(seed);
      level(g).actors = [];
      const ignored = new Set<number>();
      let steps = 0;
      for (; steps < 3000; steps++) {
        const a = autoExploreStep(g, ignored);
        if (!a || 'blockedBy' in a) break;
        if (!playerAction(g, a)) break;
        for (const it of level(g).items) if (it.x === g.player.x && it.y === g.player.y) ignored.add(it.id);
      }
      const map = level(g).map;
      const explored = map.explored.filter(Boolean).length;
      expect(steps, `seed ${seed}`).toBeGreaterThan(20);
      expect(explored).toBeGreaterThan(300);
      // A escada de descida foi encontrada.
      expect(map.explored[level(g).down.y * map.width + level(g).down.x]).toBe(1);
    }
  });
});
