import { describe, it, expect } from 'vitest';
import { level } from '../src/core/game';
import { playerAction } from '../src/core/turn';
import { createMonster } from '../src/core/monster';
import { monsterTemplate } from '../src/data/monsters';
import { RNG } from '../src/engine/rng';
import { projectileGlyph } from '../src/core/actions';
import { createItem } from '../src/core/item';
import { addToInventory } from '../src/core/inventory';
import { createTestGame } from './helpers';

function withDarts(g: ReturnType<typeof createTestGame>) {
  return addToInventory(g, createItem(g, 'dart', { quantity: 5 }))!;
}

describe('arremesso', () => {
  it('o projétil para no primeiro monstro e emite evento com o caminho', () => {
    const g = createTestGame(3);
    g.player.x = 5;
    g.player.y = 4;
    const m = createMonster(g, monsterTemplate('goblin'), 9, 4, new RNG(1));
    m.ai.state = 'sleeping';
    level(g).actors.push(m);
    const darts = withDarts(g);
    expect(playerAction(g, { type: 'throw', itemId: darts.id, tx: 12, ty: 4 })).toBe(true);
    expect(darts.quantity).toBe(4);
    const proj = g.events.find((e) => e.type === 'projectile');
    expect(proj && proj.type === 'projectile' && proj.path[proj.path.length - 1]).toEqual({ x: 9, y: 4 });
    // Ser alvejado acorda o monstro.
    expect((m.ai.state as string) === 'hunting' || m.hp <= 0).toBe(true);
  });

  it('não atravessa paredes', () => {
    const g = createTestGame(3);
    g.player.x = 5;
    g.player.y = 2;
    playerAction(g, { type: 'throw', itemId: withDarts(g).id, tx: 5, ty: -5 });
    const proj = g.events.find((e) => e.type === 'projectile');
    expect(proj && proj.type === 'projectile' && proj.path.length).toBe(0);
  });

  it('glifo do projétil segue a direção', () => {
    expect(projectileGlyph(5, 0)).toBe('-');
    expect(projectileGlyph(0, -4)).toBe('|');
    expect(projectileGlyph(3, 3)).toBe('\\');
    expect(projectileGlyph(3, -3)).toBe('/');
  });
});
