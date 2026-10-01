import type { GameMap } from './map';
import { idx, inBounds, isTransparent } from './map';

// Multiplicadores que transformam o octante 0 nos outros 7.
const MULT = [
  [1, 0, 0, -1, -1, 0, 0, 1],
  [0, 1, -1, 0, 0, -1, 1, 0],
  [0, 1, 1, 0, 0, -1, -1, 0],
  [1, 0, 0, 1, -1, 0, 0, -1],
];

/**
 * Campo de visão por "shadowcasting" recursivo (Björn Bergström).
 * Varre cada um dos 8 octantes linha a linha; quando encontra um bloqueio,
 * continua a varredura recursivamente só na parte do cone que não ficou na sombra.
 * Chama `visit(x, y)` para cada célula visível (incluindo paredes que bloqueiam).
 */
export function computeFov(
  ox: number,
  oy: number,
  radius: number,
  blocks: (x: number, y: number) => boolean,
  visit: (x: number, y: number) => void,
): void {
  visit(ox, oy);
  for (let oct = 0; oct < 8; oct++) {
    castLight(ox, oy, 1, 1.0, 0.0, radius, MULT[0][oct], MULT[1][oct], MULT[2][oct], MULT[3][oct], blocks, visit);
  }
}

function castLight(
  cx: number, cy: number, row: number, start: number, end: number, radius: number,
  xx: number, xy: number, yx: number, yy: number,
  blocks: (x: number, y: number) => boolean, visit: (x: number, y: number) => void,
): void {
  if (start < end) return;
  const r2 = (radius + 0.5) * (radius + 0.5);
  let newStart = 0;
  for (let j = row; j <= radius; j++) {
    let dx = -j - 1;
    const dy = -j;
    let blocked = false;
    while (dx <= 0) {
      dx++;
      const X = cx + dx * xx + dy * xy;
      const Y = cy + dx * yx + dy * yy;
      const lSlope = (dx - 0.5) / (dy + 0.5);
      const rSlope = (dx + 0.5) / (dy - 0.5);
      if (start < rSlope) continue;
      if (end > lSlope) break;
      if (dx * dx + dy * dy < r2) visit(X, Y);
      if (blocked) {
        if (blocks(X, Y)) {
          newStart = rSlope;
          continue;
        }
        blocked = false;
        start = newStart;
      } else if (blocks(X, Y) && j < radius) {
        blocked = true;
        castLight(cx, cy, j + 1, start, lSlope, radius, xx, xy, yx, yy, blocks, visit);
        newStart = rSlope;
      }
    }
    if (blocked) break;
  }
}

/** Alcance máximo de visão (para enxergar salas iluminadas de longe). */
export const MAX_SIGHT = 30;

/**
 * Atualiza o que o jogador vê. Uma célula é visível se está na linha de visão E
 * (dentro do raio de luz do jogador OU numa área iluminada). Tudo que é visto vai para a memória.
 */
export function updatePlayerFov(map: GameMap, px: number, py: number, lightRadius: number, blind = false): void {
  map.visible.fill(0);
  if (blind) {
    map.visible[idx(map, px, py)] = 1;
    return;
  }
  const blocks = (x: number, y: number) => !isTransparent(map, x, y);
  computeFov(px, py, MAX_SIGHT, blocks, (x, y) => {
    if (!inBounds(map, x, y)) return;
    const i = idx(map, x, y);
    const near = Math.max(Math.abs(x - px), Math.abs(y - py)) <= lightRadius;
    if (near || map.lit[i]) {
      map.visible[i] = 1;
      map.explored[i] = 1;
    }
  });
}

/** Linha de visão simples entre dois pontos (usada por monstros). */
export function hasLineOfSight(map: GameMap, x0: number, y0: number, x1: number, y1: number): boolean {
  for (const p of bresenham(x0, y0, x1, y1).slice(1, -1)) if (!isTransparent(map, p.x, p.y)) return false;
  return true;
}

/** Linha de Bresenham de (x0,y0) até (x1,y1), incluindo as pontas. */
export function bresenham(x0: number, y0: number, x1: number, y1: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    pts.push({ x, y });
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  return pts;
}
