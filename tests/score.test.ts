import { describe, it, expect } from 'vitest';
import { createGame, enterLevel } from '../src/core/world';
import { level } from '../src/core/game';
import { computeScore, highScoreEntry, insertHighScore, VICTORY_BONUS, ESCAPE_BONUS } from '../src/core/score';
import type { HighScore } from '../src/core/score';
import { gainXp } from '../src/core/hero';
import { playerAction } from '../src/core/turn';
import { getTile } from '../src/core/map';
import { Tile } from '../src/data/tiles';
import { damage } from '../src/core/combat';

describe('pontuação', () => {
  it('soma ouro, profundidade e XP', () => {
    const g = createGame(1);
    const base = computeScore(g).total;
    g.hero.gold += 100;
    expect(computeScore(g).total).toBe(base + 100);
    enterLevel(g, 4, 'up');
    expect(computeScore(g).depth).toBe(200);
    const xp = g.hero.xp;
    gainXp(g, 50);
    expect(computeScore(g).xp).toBeGreaterThan(xp);
  });

  it('quadro de recordes mantém os 10 melhores em ordem', () => {
    const list: HighScore[] = [];
    const g = createGame(1);
    for (let i = 0; i < 15; i++) {
      const e = highScoreEntry(g);
      e.score = i * 10;
      insertHighScore(list, e);
    }
    expect(list).toHaveLength(10);
    expect(list[0].score).toBe(140);
    expect(list[9].score).toBe(50);
    const low = highScoreEntry(g);
    low.score = 1;
    expect(insertHighScore(list, low)).toBe(-1);
  });
});

describe('chefes e vitória', () => {
  it('andar 5 tem o Rei Goblin perto da escada', () => {
    const g = createGame(3);
    enterLevel(g, 5, 'up');
    const king = level(g).actors.find((a) => a.templateId === 'goblin_king');
    expect(king).toBeDefined();
    expect(g.log.some((m) => m.text.includes('Rei Goblin'))).toBe(true);
  });

  it('chefe morto não volta e conta pontos', () => {
    const g = createGame(3);
    enterLevel(g, 5, 'up');
    const king = level(g).actors.find((a) => a.templateId === 'goblin_king')!;
    const before = computeScore(g).uniques;
    damage(g, king, 9999, g.player);
    expect(g.uniquesKilled).toContain('goblin_king');
    expect(computeScore(g).uniques).toBe(before + 250);
  });

  it('andar 20: o Coração do Abismo fica no lugar da escada; pegar e escapar é a vitória máxima', () => {
    const g = createGame(9);
    enterLevel(g, 20, 'up');
    const lvl = level(g);
    expect(getTile(lvl.map, lvl.down.x, lvl.down.y)).not.toBe(Tile.StairsDown);
    const heart = lvl.items.find((i) => i.baseId === 'amulet_abyss')!;
    expect(heart).toBeDefined();
    expect(lvl.actors.some((a) => a.templateId === 'abyss_guardian')).toBe(true);
    // Teleporta o jogador para cima do Coração, sem monstros, e pega.
    lvl.actors = [];
    g.player.x = heart.x;
    g.player.y = heart.y;
    expect(playerAction(g, { type: 'pickup', itemId: heart.id })).toBe(true);
    expect(g.hasAmulet).toBe(true);
    // Volta ao andar 1 e sobe a escada.
    enterLevel(g, 1, 'down');
    level(g).actors = [];
    g.player.x = level(g).up.x;
    g.player.y = level(g).up.y;
    expect(playerAction(g, { type: 'ascend' })).toBe(true);
    expect(g.over).toMatchObject({ won: true, escaped: true });
    expect(computeScore(g).victory).toBe(VICTORY_BONUS + ESCAPE_BONUS);
  });

  it('invocar o Coração termina a partida com vitória (sem bônus de fuga)', () => {
    const g = createGame(9);
    g.hasAmulet = true;
    level(g).actors = [];
    expect(playerAction(g, { type: 'invoke' })).toBe(true);
    expect(g.over).toMatchObject({ won: true, escaped: false });
    expect(computeScore(g).victory).toBe(VICTORY_BONUS);
  });
});
