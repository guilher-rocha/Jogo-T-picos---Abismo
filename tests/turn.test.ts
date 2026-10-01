import { describe, it, expect } from 'vitest';
import { createTestGame, level } from '../src/core/game';
import { playerAction } from '../src/core/turn';
import { createActor } from '../src/core/actor';

describe('loop de turnos (energia)', () => {
  it('monstros só se movem quando o jogador age', () => {
    const g = createTestGame();
    const before = level(g).actors.map((a) => [a.x, a.y]);
    // Sem ação do jogador, nada muda.
    expect(level(g).actors.map((a) => [a.x, a.y])).toEqual(before);
    for (let i = 0; i < 10; i++) playerAction(g, { type: 'wait' });
    expect(level(g).actors.map((a) => [a.x, a.y])).not.toEqual(before);
    expect(g.turn).toBe(10);
  });

  it('velocidade 150 age 1,5× mais que velocidade 100', () => {
    const g = createTestGame();
    let fastActs = 0;
    let normalActs = 0;
    const fast = createActor(90, { templateId: 'bat', name: 'rápido', glyph: 'b', color: 'white', speed: 150, x: 1, y: 1 });
    const normal = createActor(91, { templateId: 'rat', name: 'normal', glyph: 'r', color: 'white', speed: 100, x: 1, y: 1 });
    level(g).actors = [fast, normal];
    let lastFast = fast.energy;
    let lastNormal = normal.energy;
    for (let i = 0; i < 100; i++) {
      playerAction(g, { type: 'wait' });
      // Cada vez que a energia "cai", o ator agiu.
      if (fast.energy < lastFast + fast.speed) fastActs += Math.round((lastFast + fast.speed - fast.energy) / 100);
      if (normal.energy < lastNormal + normal.speed) normalActs += Math.round((lastNormal + normal.speed - normal.energy) / 100);
      lastFast = fast.energy;
      lastNormal = normal.energy;
    }
    expect(normalActs).toBeGreaterThanOrEqual(99);
    expect(fastActs / normalActs).toBeGreaterThan(1.4);
    expect(fastActs / normalActs).toBeLessThan(1.6);
  });

  it('é determinístico para a mesma seed', () => {
    const run = () => {
      const g = createTestGame(77);
      for (let i = 0; i < 30; i++) playerAction(g, { type: 'wait' });
      return level(g).actors.map((a) => [a.x, a.y]);
    };
    expect(run()).toEqual(run());
  });
});
