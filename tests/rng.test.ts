import { describe, it, expect } from 'vitest';
import { RNG, parseDice, diceToString } from '../src/engine/rng';

describe('RNG', () => {
  it('é determinístico para a mesma seed', () => {
    const a = new RNG(42);
    const b = new RNG(42);
    const sa = Array.from({ length: 100 }, () => a.next());
    const sb = Array.from({ length: 100 }, () => b.next());
    expect(sa).toEqual(sb);
  });

  it('seeds diferentes geram sequências diferentes', () => {
    const a = new RNG(1);
    const b = new RNG(2);
    expect(a.next()).not.toEqual(b.next());
  });

  it('aceita seed em texto', () => {
    expect(new RNG('abismo').next()).toEqual(new RNG('abismo').next());
  });

  it('pode salvar e restaurar o estado', () => {
    const a = new RNG(7);
    a.next();
    a.next();
    const saved = a.state;
    const x = a.next();
    const b = new RNG(0);
    b.state = saved;
    expect(b.next()).toEqual(x);
  });

  it('int() respeita os limites', () => {
    const r = new RNG(3);
    for (let i = 0; i < 2000; i++) {
      const v = r.int(-2, 5);
      expect(v).toBeGreaterThanOrEqual(-2);
      expect(v).toBeLessThanOrEqual(5);
    }
  });

  it('roll("2d6") fica entre 2 e 12 e cobre os extremos', () => {
    const r = new RNG(9);
    const seen = new Set<number>();
    for (let i = 0; i < 3000; i++) {
      const v = r.roll('2d6');
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(12);
      seen.add(v);
    }
    expect(seen.has(2) && seen.has(12)).toBe(true);
  });

  it('weighted() respeita os pesos aproximadamente', () => {
    const r = new RNG(11);
    let a = 0;
    for (let i = 0; i < 10000; i++) if (r.weighted([{ item: 'a', weight: 3 }, { item: 'b', weight: 1 }]) === 'a') a++;
    expect(a / 10000).toBeGreaterThan(0.7);
    expect(a / 10000).toBeLessThan(0.8);
  });

  it('fork() gera fluxos independentes e determinísticos', () => {
    const a = new RNG(5).fork('mapa');
    const b = new RNG(5).fork('mapa');
    const c = new RNG(5).fork('loot');
    expect(a.next()).toEqual(b.next());
    expect(new RNG(5).fork('mapa').next()).not.toEqual(c.next());
  });
});

describe('notação de dados', () => {
  it('interpreta várias formas', () => {
    expect(parseDice('2d6+1')).toEqual({ count: 2, sides: 6, bonus: 1 });
    expect(parseDice('d8')).toEqual({ count: 1, sides: 8, bonus: 0 });
    expect(parseDice('3d4-2')).toEqual({ count: 3, sides: 4, bonus: -2 });
    expect(parseDice('5')).toEqual({ count: 0, sides: 0, bonus: 5 });
    expect(diceToString(parseDice('1d10+3'))).toBe('1d10+3');
  });
});
