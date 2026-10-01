import { describe, it, expect } from 'vitest';
import { level } from '../src/core/game';
import { playerAction } from '../src/core/turn';
import { createMonster } from '../src/core/monster';
import { hitChance } from '../src/core/combat';
import { monsterTemplate } from '../src/data/monsters';
import { RNG } from '../src/engine/rng';
import { distance } from '../src/core/map';
import { createTestGame } from './helpers';

function gameWith(monsterId: string, x: number, y: number) {
  const g = createTestGame(5);
  const m = createMonster(g, monsterTemplate(monsterId), x, y, new RNG(1));
  m.ai.state = 'hunting';
  level(g).actors.push(m);
  return { g, m };
}

describe('combate', () => {
  it('chance de acerto fica entre 5% e 95%', () => {
    const { g, m } = gameWith('rat', 8, 4);
    m.defense = 100;
    expect(hitChance(g.player, m)).toBe(5);
    m.defense = -100;
    expect(hitChance(g.player, m)).toBe(95);
  });

  it('o jogador mata um rato atacando (esbarrando) e ele vira cadáver', () => {
    const { g, m } = gameWith('rat', 8, 4);
    g.player.x = 7;
    g.player.y = 4;
    g.player.hp = 999;
    for (let i = 0; i < 50 && level(g).actors.includes(m); i++) {
      // Ataca na direção do rato onde quer que ele esteja (ele também se move)
      playerAction(g, { type: 'move', dx: Math.sign(m.x - g.player.x), dy: Math.sign(m.y - g.player.y) });
    }
    expect(level(g).actors.includes(m)).toBe(false);
    expect(level(g).items.some((i) => i.baseId === 'corpse' && i.corpseOf === 'rat')).toBe(true);
    expect(g.log.some((l) => l.text.includes('Você mata o rato'))).toBe(true);
  });

  it('um monstro pode matar o jogador, terminando a partida', () => {
    const { g } = gameWith('goblin', 8, 4);
    g.player.x = 7;
    g.player.y = 4;
    g.player.hp = 3;
    g.player.defense = -50;
    for (let i = 0; i < 100 && !g.over; i++) playerAction(g, { type: 'wait' });
    expect(g.over?.won).toBe(false);
    expect(g.over?.cause).toBe('morto por um goblin');
    // Depois de morto, nenhuma ação é aceita.
    expect(playerAction(g, { type: 'wait' })).toBe(false);
  });
});

describe('IA de perseguição', () => {
  it('monstro caçando se aproxima do jogador contornando paredes', () => {
    // Jogador na sala de cima, goblin na sala de baixo: precisa usar o corredor.
    const { g, m } = gameWith('goblin', 36, 13);
    g.player.x = 6;
    g.player.y = 3;
    g.player.hp = 999;
    m.ai.lastSeen = { x: 6, y: 3 };
    const start = distance(m, g.player);
    for (let i = 0; i < 15; i++) {
      m.ai.lastSeen = { x: g.player.x, y: g.player.y };
      playerAction(g, { type: 'wait' });
    }
    expect(distance(m, g.player)).toBeLessThan(start - 10);
  });

  it('monstro dormindo não se mexe enquanto não acorda', () => {
    const { g, m } = gameWith('rat', 40, 13);
    m.ai.state = 'sleeping';
    g.player.x = 6;
    g.player.y = 3;
    for (let i = 0; i < 20; i++) playerAction(g, { type: 'wait' });
    expect([m.x, m.y]).toEqual([40, 13]);
  });
});
