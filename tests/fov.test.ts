import { describe, it, expect } from 'vitest';
import { mapFromStrings, idx, isVisible } from '../src/core/map';
import { updatePlayerFov, bresenham, hasLineOfSight } from '../src/core/fov';

describe('campo de visão (shadowcasting)', () => {
  const room = [
    '###########',
    '#.........#',
    '#.........#',
    '#....#....#',
    '#.........#',
    '#.........#',
    '###########',
  ];

  it('numa sala aberta, vê tudo dentro do raio incluindo as paredes', () => {
    const map = mapFromStrings(room, 11, 7);
    updatePlayerFov(map, 2, 1, 20);
    expect(isVisible(map, 9, 1)).toBe(true);
    expect(isVisible(map, 1, 5)).toBe(true);
    expect(isVisible(map, 0, 0)).toBe(true);
    expect(isVisible(map, 10, 0)).toBe(true);
    expect(isVisible(map, 0, 6)).toBe(true);
  });

  it('pilar projeta sombra atrás dele', () => {
    const map = mapFromStrings(room, 11, 7);
    updatePlayerFov(map, 1, 3, 20);
    expect(isVisible(map, 5, 3)).toBe(true); // o próprio pilar
    expect(isVisible(map, 7, 3)).toBe(false); // logo atrás, na sombra
    expect(isVisible(map, 7, 1)).toBe(true); // fora da sombra
  });

  it('não vê através de paredes', () => {
    const map = mapFromStrings(['#####', '#.#.#', '#####'], 5, 3);
    updatePlayerFov(map, 1, 1, 10);
    expect(isVisible(map, 3, 1)).toBe(false);
    expect(isVisible(map, 2, 1)).toBe(true);
  });

  it('em área escura, só vê dentro do raio de luz', () => {
    const map = mapFromStrings(room, 11, 7);
    updatePlayerFov(map, 1, 1, 2);
    expect(isVisible(map, 3, 1)).toBe(true);
    expect(isVisible(map, 6, 1)).toBe(false);
  });

  it('áreas iluminadas são vistas de longe e ficam na memória', () => {
    const map = mapFromStrings(room, 11, 7);
    map.lit.fill(1);
    updatePlayerFov(map, 1, 1, 1);
    expect(isVisible(map, 9, 1)).toBe(true);
    map.lit.fill(0);
    updatePlayerFov(map, 1, 1, 1);
    expect(isVisible(map, 9, 1)).toBe(false);
    expect(map.explored[idx(map, 9, 1)]).toBe(1);
  });
});

describe('linha de Bresenham', () => {
  it('liga as pontas', () => {
    const l = bresenham(0, 0, 5, 2);
    expect(l[0]).toEqual({ x: 0, y: 0 });
    expect(l[l.length - 1]).toEqual({ x: 5, y: 2 });
    expect(l.length).toBe(6);
  });
  it('linha de visão é bloqueada por paredes', () => {
    const map = mapFromStrings(['#######', '#..#..#', '#######'], 7, 3);
    expect(hasLineOfSight(map, 1, 1, 2, 1)).toBe(true);
    expect(hasLineOfSight(map, 1, 1, 5, 1)).toBe(false);
  });
});
