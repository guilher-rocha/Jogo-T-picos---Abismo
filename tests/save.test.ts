import { describe, it, expect } from 'vitest';
import { createGame, enterLevel } from '../src/core/world';
import { playerAction } from '../src/core/turn';
import { botAction } from '../src/ai/bot';
import { deserializeGame, serializeGame, SAVE_VERSION } from '../src/persist/save';
import { level } from '../src/core/game';

function play(g: ReturnType<typeof createGame>, n: number) {
  for (let i = 0; i < n && !g.over; i++) {
    if (!playerAction(g, botAction(g))) playerAction(g, { type: 'wait' });
    g.events.length = 0;
  }
}

describe('save/load', () => {
  it('salvar → carregar devolve um estado idêntico', () => {
    const g = createGame(55, { name: 'S', raceId: 'elf', classId: 'mage' });
    play(g, 150);
    enterLevel(g, 2, 'up');
    const text = serializeGame(g);
    const loaded = deserializeGame(text);
    expect(JSON.parse(serializeGame(loaded)).game).toEqual(JSON.parse(text).game);
    expect(loaded.hero.name).toBe('S');
    expect(level(loaded).map.tiles).toEqual(level(g).map.tiles);
  });

  it('a partida carregada continua exatamente igual à original (RNG restaurado)', () => {
    const a = createGame(77);
    play(a, 100);
    const b = deserializeGame(serializeGame(a));
    play(a, 200);
    play(b, 200);
    expect(b.turn).toBe(a.turn);
    expect([b.player.x, b.player.y, b.player.hp]).toEqual([a.player.x, a.player.y, a.player.hp]);
    expect(b.log.map((m) => m.text)).toEqual(a.log.map((m) => m.text));
  });

  it('rejeita saves de outra versão', () => {
    const text = serializeGame(createGame(1)).replace(`"version":${SAVE_VERSION}`, '"version":1');
    expect(() => deserializeGame(text)).toThrow();
  });
});
