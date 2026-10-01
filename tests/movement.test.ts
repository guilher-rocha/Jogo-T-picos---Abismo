import { describe, it, expect } from 'vitest';
import { level } from '../src/core/game';
import { createTestGame } from './helpers';
import { playerAction } from '../src/core/turn';
import { commandForKey, type KeyInput } from '../src/data/keymap';

const key = (key: string, extra: Partial<KeyInput> = {}): KeyInput => ({ key, code: '', shift: false, ctrl: false, alt: false, ...extra });

/** Partida de teste sem monstros, para testar só o movimento. */
function emptyGame() {
  const g = createTestGame();
  level(g).actors = [];
  return g;
}

describe('movimento', () => {
  it('anda nas 8 direções em chão livre', () => {
    const g = emptyGame();
    g.player.x = 8;
    g.player.y = 4;
    const dirs = [[1, 0], [-1, 0], [0, -1], [0, 1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
    for (const [dx, dy] of dirs) {
      const { x, y } = g.player;
      expect(playerAction(g, { type: 'move', dx, dy })).toBe(true);
      expect(g.player).toMatchObject({ x: x + dx, y: y + dy });
    }
  });

  it('não atravessa paredes e não gasta turno ao bater', () => {
    const g = emptyGame();
    g.player.x = 4;
    g.player.y = 2;
    const turn = g.turn;
    expect(playerAction(g, { type: 'move', dx: -1, dy: 0 })).toBe(false);
    expect(playerAction(g, { type: 'move', dx: 0, dy: -1 })).toBe(false);
    expect(g.player).toMatchObject({ x: 4, y: 2 });
    expect(g.turn).toBe(turn);
  });
});

describe('mapa de teclas', () => {
  it('vi-keys, setas e numpad viram movimento', () => {
    expect(commandForKey(key('h'))).toEqual({ name: 'move', dx: -1, dy: 0 });
    expect(commandForKey(key('n'))).toEqual({ name: 'move', dx: 1, dy: 1 });
    expect(commandForKey(key('ArrowUp'))).toEqual({ name: 'move', dx: 0, dy: -1 });
    expect(commandForKey(key('7', { code: 'Numpad7' }))).toEqual({ name: 'move', dx: -1, dy: -1 });
  });

  it('maiúscula ou Shift = correr', () => {
    expect(commandForKey(key('L', { shift: true }))).toEqual({ name: 'run', dx: 1, dy: 0 });
    expect(commandForKey(key('ArrowLeft', { shift: true }))).toEqual({ name: 'run', dx: -1, dy: 0 });
  });

  it('. e numpad 5 esperam', () => {
    expect(commandForKey(key('.'))).toEqual({ name: 'wait' });
    expect(commandForKey(key('5', { code: 'Numpad5' }))).toEqual({ name: 'wait' });
  });
});
