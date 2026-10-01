import { describe, it, expect } from 'vitest';
import { createGame } from '../src/core/world';
import { playerAction } from '../src/core/turn';
import { botAction } from '../src/ai/bot';
import { CLASSES } from '../src/data/classes';
import { RACES } from '../src/data/races';

/** Joga uma partida inteira com o bot. Retorna estatísticas. */
export function simulate(seed: number, raceId: string, classId: string, maxActions = 4000) {
  const g = createGame(seed, { name: 'Bot', raceId, classId });
  let actions = 0;
  let stuck = 0;
  while (!g.over && actions < maxActions) {
    const ok = playerAction(g, botAction(g));
    g.events.length = 0;
    actions++;
    stuck = ok ? 0 : stuck + 1;
    // Ação inválida repetida: espera um turno para não travar.
    if (stuck > 3) {
      playerAction(g, { type: 'wait' });
      stuck = 0;
    }
  }
  return { depth: g.maxDepth, level: g.hero.level, turns: g.turn, dead: !!g.over && !g.over.won, cause: g.over?.cause ?? 'vivo', kills: g.hero.kills };
}

describe('simulação com o bot', () => {
  it('o bot joga várias partidas sem erros e progride na masmorra', () => {
    const results = [];
    for (let i = 0; i < CLASSES.length * 2; i++) {
      const c = CLASSES[i % CLASSES.length];
      const r = RACES[i % RACES.length];
      results.push({ cls: c.id, race: r.id, ...simulate(1000 + i, r.id, c.id) });
    }
    const avgDepth = results.reduce((s, r) => s + r.depth, 0) / results.length;
    console.table(results);
    console.log('andar médio alcançado:', avgDepth.toFixed(1));
    expect(results.every((r) => r.turns > 50)).toBe(true);
    expect(avgDepth).toBeGreaterThan(1.5);
  }, 120000);
});
