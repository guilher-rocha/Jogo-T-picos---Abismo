import { describe, it, expect } from 'vitest';
import { createGame } from '../src/core/world';
import { level } from '../src/core/game';
import { playerAction } from '../src/core/turn';
import { equipped, addToInventory } from '../src/core/inventory';
import { createItem } from '../src/core/item';
import { setTile } from '../src/core/map';
import { Tile } from '../src/data/tiles';
import { DIRS8, isWalkable } from '../src/core/map';

function fresh(seed = 31) {
  const g = createGame(seed);
  level(g).actors = [];
  level(g).traps = [];
  return g;
}

/** Direção para uma casa de chão livre ao lado do jogador. */
function freeDir(g: ReturnType<typeof fresh>) {
  const map = level(g).map;
  return DIRS8.find((d) => isWalkable(map, g.player.x + d.x, g.player.y + d.y) && map.tiles[(g.player.y + d.y) * map.width + g.player.x + d.x] === Tile.Floor)!;
}

describe('fome', () => {
  it('a saciedade cai com o tempo; fraco de fome perde força; sem comer, morre', () => {
    const g = fresh();
    const n = g.hero.nutrition;
    for (let i = 0; i < 10; i++) playerAction(g, { type: 'wait' });
    expect(g.hero.nutrition).toBe(n - 10);
    g.hero.nutrition = 151;
    const acc = g.player.accuracy;
    for (let i = 0; i < 3; i++) playerAction(g, { type: 'wait' });
    expect(g.player.accuracy).toBeLessThan(acc);
    g.hero.nutrition = -399;
    g.player.hp = g.player.maxHp;
    for (let i = 0; i < 5 && !g.over; i++) playerAction(g, { type: 'wait' });
    expect(g.over?.cause).toBe('morreu de fome');
  });

  it('comer restaura a saciedade', () => {
    const g = fresh();
    g.hero.nutrition = 100;
    const ration = g.hero.inventory.find((i) => i.baseId === 'ration')!;
    playerAction(g, { type: 'eat', itemId: ration.id });
    expect(g.hero.nutrition).toBeGreaterThan(1000);
  });
});

describe('luz', () => {
  it('a tocha queima e, ao apagar, o raio de luz diminui', () => {
    const g = fresh();
    const torch = equipped(g, 'light')!;
    const light = g.player.light;
    torch.fuel = 3;
    for (let i = 0; i < 5; i++) playerAction(g, { type: 'wait' });
    expect(torch.fuel).toBe(0);
    expect(g.player.light).toBe(light - 2);
  });
});

describe('armadilhas', () => {
  it('pisar numa armadilha oculta a revela e causa efeito', () => {
    const g = fresh();
    const d = freeDir(g);
    g.player.hp = g.player.maxHp = 500;
    g.hero.stats.dex = 3; // sem reflexos para escapar
    level(g).traps = [{ x: g.player.x + d.x, y: g.player.y + d.y, kind: 'dart', hidden: true }];
    let triggered = false;
    for (let i = 0; i < 20 && !triggered; i++) {
      g.player.x = level(g).traps![0].x - d.x;
      g.player.y = level(g).traps![0].y - d.y;
      const hp = g.player.hp;
      playerAction(g, { type: 'move', dx: d.x, dy: d.y });
      triggered = g.player.hp < hp;
    }
    expect(level(g).traps![0].hidden).toBe(false);
    expect(triggered).toBe(true);
  });

  it('alçapão derruba para o andar de baixo', () => {
    const g = fresh();
    const d = freeDir(g);
    g.player.hp = g.player.maxHp = 500;
    g.hero.stats.dex = 3;
    for (let i = 0; i < 30 && g.depth === 1; i++) {
      level(g).traps = [{ x: g.player.x + d.x, y: g.player.y + d.y, kind: 'trapdoor', hidden: true }];
      playerAction(g, { type: 'move', dx: d.x, dy: d.y });
      if (g.depth === 1) playerAction(g, { type: 'move', dx: -d.x, dy: -d.y });
    }
    expect(g.depth).toBe(2);
  });

  it('desarmar remove a armadilha (com sorte)', () => {
    const g = fresh();
    const d = freeDir(g);
    g.hero.stats.dex = 18;
    g.player.hp = g.player.maxHp = 500;
    for (let i = 0; i < 20 && (level(g).traps?.length ?? 0) > 0 || i === 0; i++) {
      if (!level(g).traps?.length && i > 0) break;
      level(g).traps = [{ x: g.player.x + d.x, y: g.player.y + d.y, kind: 'alarm', hidden: false }];
      playerAction(g, { type: 'disarm', dx: d.x, dy: d.y });
      if (!level(g).traps!.length) break;
    }
    expect(level(g).traps).toHaveLength(0);
  });
});

describe('terreno especial', () => {
  it('lava pede confirmação e queima', () => {
    const g = fresh();
    const d = freeDir(g);
    g.player.hp = g.player.maxHp = 500;
    setTile(level(g).map, g.player.x + d.x, g.player.y + d.y, Tile.Lava);
    const x = g.player.x;
    expect(playerAction(g, { type: 'move', dx: d.x, dy: d.y })).toBe(false);
    expect(g.player.x).toBe(x);
    expect(playerAction(g, { type: 'move', dx: d.x, dy: d.y })).toBe(true);
    expect(g.player.hp).toBeLessThan(500);
  });

  it('altar revela se um item largado está amaldiçoado', () => {
    const g = fresh();
    setTile(level(g).map, g.player.x, g.player.y, Tile.Altar);
    const ring = addToInventory(g, createItem(g, 'ring_protection', { cursed: true, identified: false }))!;
    playerAction(g, { type: 'drop', itemId: ring.id });
    expect(g.log.some((m) => m.text.includes('brilho negro'))).toBe(true);
  });

  it('beber da fonte faz algo', () => {
    const g = fresh();
    setTile(level(g).map, g.player.x, g.player.y, Tile.Fountain);
    const before = g.log.length;
    expect(playerAction(g, { type: 'fountain' })).toBe(true);
    expect(g.log.length).toBeGreaterThan(before);
  });
});
