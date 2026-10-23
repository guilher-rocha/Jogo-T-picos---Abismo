import { describe, it, expect } from 'vitest';
import { createGame, enterLevel } from '../src/core/world';
import { level } from '../src/core/game';
import type { GameEvent } from '../src/core/events';
import { SceneState } from '../src/ui/sceneState';
import { trackEvents, BEAM_MS, explosionMs, HIT_HOLD_MS, CAST_MS, MELEE_MS, projectileMs } from '../src/ui/effects';

/**
 * O flash branco e a fumaça da morte (estado visual do mapa) têm de coincidir com o golpe nas animações:
 * se uma flecha, um raio ou uma explosão vem antes no mesmo turno, o monstro continua inteiro até ela chegar.
 */

function setup() {
  const g = createGame(5, { name: 'Teste', raceId: 'human', classId: 'ranger' });
  enterLevel(g, 1, 'down');
  const m = level(g).actors[0];
  const state = new SceneState();
  state.update(g, 16, 40, 24); // cria o estado visual dos atores
  state.vis.get(m.id)!.key = 'mon:teste'; // o mapView preenche isto ao desenhar
  const hit: GameEvent[] = [
    { type: 'damage', x: m.x, y: m.y, amount: 3, toPlayer: false },
    { type: 'death', x: m.x, y: m.y, isPlayer: false },
  ];
  const wait = (): { hurt: number; ghost: number } => ({ hurt: state.vis.get(m.id)!.hurtFrom - state.time, ghost: state.ghosts[0].t0 - state.time });
  return { g, m, state, hit, wait };
}

const path = (n: number) => Array.from({ length: n }, (_, i) => ({ x: 10 + i, y: 4 }));

describe('efeitos: o golpe só aparece quando o projétil chega', () => {
  it('golpe corpo a corpo: flash e fumaça começam na hora', () => {
    const { g, state, hit, wait } = setup();
    trackEvents(g, state, hit);
    expect(wait()).toEqual({ hurt: 0, ghost: 0 });
  });

  it('flecha: esperam o voo (um passo de 36 ms por tile, no mínimo 160 ms)', () => {
    const far = setup();
    trackEvents(far.g, far.state, [{ type: 'projectile', path: path(8), glyph: '|', color: 'white', item: 'arrow', from: { x: 9, y: 4 } }, ...far.hit]);
    expect(far.wait()).toEqual({ hurt: 9 * 36 - 36, ghost: 9 * 36 - 36 }); // 8 tiles + a casa do atirador = 8 passos
    const near = setup();
    trackEvents(near.g, near.state, [{ type: 'projectile', path: path(2), glyph: '|', color: 'white', from: { x: 9, y: 4 } }, ...near.hit]);
    expect(near.wait()).toEqual({ hurt: 160, ghost: 160 });
  });

  it('raio e explosão também seguram o golpe até acabarem', () => {
    const b = setup();
    trackEvents(b.g, b.state, [{ type: 'bolt', path: path(4), color: 'yellow', from: { x: 9, y: 4 } }, ...b.hit]);
    expect(b.wait().hurt).toBe(BEAM_MS);
    const e = setup();
    trackEvents(e.g, e.state, [{ type: 'explosion', x: 12, y: 4, radius: 2, color: 'orange' }, ...e.hit]);
    expect(e.wait().hurt).toBe(explosionMs(2));
  });

  it('o que acontece antes do projétil não espera por ele; o que vem depois espera só a pausa do golpe', () => {
    const { g, m, state, hit } = setup();
    const arrow: GameEvent = { type: 'projectile', path: path(8), glyph: '|', color: 'white', item: 'arrow', from: { x: 9, y: 4 } };
    const events: GameEvent[] = [hit[0], arrow, { type: 'damage', x: g.player.x, y: g.player.y, amount: 2, toPlayer: true }];
    trackEvents(g, state, events);
    expect(state.vis.get(m.id)!.hurtFrom - state.time).toBe(0);
    // o número de dano continua ao fundo: o golpe seguinte não espera ele sumir, só a pausa do golpe
    expect(state.vis.get(g.player.id)!.hurtFrom - state.time).toBe(HIT_HOLD_MS + projectileMs(path(8), { x: 9, y: 4 }));
  });

  it('magia: o círculo de conjuração vem antes do voo; corpo a corpo: o avanço vem antes do golpe', () => {
    const c = setup();
    const missile: GameEvent = { type: 'projectile', path: path(3), glyph: '*', color: 'lightMagenta', from: { x: 9, y: 4 }, element: 'arcane' };
    trackEvents(c.g, c.state, [{ type: 'spell', color: 'lightMagenta', x: 9, y: 4, element: 'arcane' }, missile, ...c.hit]);
    expect(c.wait().hurt).toBeGreaterThan(CAST_MS);
    const mm = setup();
    const p = mm.g.player;
    trackEvents(mm.g, mm.state, [{ type: 'melee', x: p.x, y: p.y, tx: mm.m.x, ty: mm.m.y, style: 'slash' }, ...mm.hit]);
    expect(mm.wait().hurt).toBe(MELEE_MS);
    // o herói avança (deslocamento diferente de zero no meio do avanço)
    const v = mm.state.vis.get(p.id)!;
    mm.state.time += MELEE_MS * 0.3;
    const off = mm.state.lungeOffset(v);
    expect(Math.abs(off.ox) + Math.abs(off.oy)).toBeGreaterThan(0);
  });

  it('animações desligadas ou aceleradas: tudo na hora / mais depressa', () => {
    const off = setup();
    off.state.instant = true;
    trackEvents(off.g, off.state, [{ type: 'projectile', path: path(8), glyph: '|', color: 'white', item: 'arrow', from: { x: 9, y: 4 } }, ...off.hit]);
    expect(off.wait()).toEqual({ hurt: 0, ghost: 0 });
    const fast = setup();
    fast.state.speed = 2;
    trackEvents(fast.g, fast.state, [{ type: 'projectile', path: path(8), glyph: '|', color: 'white', item: 'arrow', from: { x: 9, y: 4 } }, ...fast.hit]);
    expect(fast.wait()).toEqual({ hurt: 144, ghost: 144 });
  });
});
