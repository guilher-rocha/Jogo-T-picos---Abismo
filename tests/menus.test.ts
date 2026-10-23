import { describe, expect, it } from 'vitest';
import { createGame } from '../src/core/world';
import type { App } from '../src/ui/app';
import type { Action } from '../src/core/actions';
import type { KeyInput } from '../src/data/keymap';
import { EquipmentScreen, InventoryScreen } from '../src/ui/itemMenus';
import { MenuScreen } from '../src/ui/menuScreen';

const key = (k: string): KeyInput => ({ key: k, code: k, shift: false, ctrl: false, alt: false });

/** Hospedeiro falso: registra o que as telas empilham/desempilham e as ações pedidas. */
function fakeHost() {
  const game = createGame(3, { name: 'T', raceId: 'human', classId: 'warrior' });
  const log: string[] = [];
  const acts: Action[] = [];
  const app = {
    screens: {
      push: (s: object) => log.push(`push:${s.constructor.name}`),
      pop: () => log.push('pop'),
    },
  } as unknown as App;
  return { host: { app, game, act: (a: Action) => (acts.push(a), true) }, log, acts };
}

describe('teclas das telas de itens', () => {
  it('um item na letra "i" pode ser escolhido no inventário (não fecha a tela)', () => {
    const { host, log } = fakeHost();
    const inv = host.game.hero.inventory;
    expect(inv.length).toBeGreaterThan(0);
    inv[0].letter = 'i';
    new InventoryScreen(host).onKey(key('i'));
    expect(log).toEqual(['pop', `push:${MenuScreen.name}`]);
  });

  it('"i" ainda fecha o inventário quando nenhum item usa essa letra', () => {
    const { host, log } = fakeHost();
    for (const it of host.game.hero.inventory) if (it.letter === 'i') it.letter = 'z';
    new InventoryScreen(host).onKey(key('i'));
    expect(log).toEqual(['pop']);
  });

  it('"e" escolhe o slot das luvas no equipamento; Esc fecha', () => {
    const { host, log } = fakeHost();
    new EquipmentScreen(host).onKey(key('e'));
    expect(log).not.toEqual(['pop']); // não só fechou: tentou equipar/tirar algo nas luvas
    const other = fakeHost();
    new EquipmentScreen(other.host).onKey(key('Escape'));
    expect(other.log).toEqual(['pop']);
  });
});
