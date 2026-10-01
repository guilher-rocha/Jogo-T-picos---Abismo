import type { GameMap, Point } from '../core/map';
import { DIRS8, idx, inBounds } from '../core/map';
import { Tile, tileDef } from '../data/tiles';

export const UNREACHABLE = 1e9;

/** Pode ser atravessado por um monstro (portas fechadas contam: podem ser abertas). */
function pathable(map: GameMap, x: number, y: number): boolean {
  const t = map.tiles[idx(map, x, y)];
  if (t === Tile.Lava) return false;
  return tileDef(t).walkable || t === Tile.DoorClosed;
}

/**
 * Mapa de Dijkstra: para cada célula, a distância (em passos) até o objetivo mais próximo.
 * Monstros "descem a ladeira" escolhendo o vizinho com menor valor.
 * Um único mapa rumo ao jogador serve para todos os monstros no mesmo turno.
 */
export function dijkstraMap(map: GameMap, goals: Point[]): number[] {
  const dist = new Array(map.width * map.height).fill(UNREACHABLE);
  const queue: Point[] = [];
  for (const g of goals) {
    dist[idx(map, g.x, g.y)] = 0;
    queue.push(g);
  }
  for (let head = 0; head < queue.length; head++) {
    const p = queue[head];
    const d = dist[idx(map, p.x, p.y)];
    for (const dir of DIRS8) {
      const nx = p.x + dir.x;
      const ny = p.y + dir.y;
      if (!inBounds(map, nx, ny) || !pathable(map, nx, ny)) continue;
      const i = idx(map, nx, ny);
      if (dist[i] <= d + 1) continue;
      dist[i] = d + 1;
      queue.push({ x: nx, y: ny });
    }
  }
  return dist;
}

/** Cache de mapas de distância por alvo, válido durante um turno (o terreno pode mudar: portas). */
const cache = new WeakMap<GameMap, { turn: number; byTarget: Map<string, number[]> }>();

export function distanceMapTo(map: GameMap, target: Point, turn: number): number[] {
  let c = cache.get(map);
  if (!c || c.turn !== turn) {
    c = { turn, byTarget: new Map() };
    cache.set(map, c);
  }
  const key = `${target.x},${target.y}`;
  let dist = c.byTarget.get(key);
  if (!dist) {
    dist = dijkstraMap(map, [target]);
    c.byTarget.set(key, dist);
  }
  return dist;
}

/** Melhor passo (dx, dy) descendo o mapa de distâncias, evitando células bloqueadas. */
export function stepDownhill(map: GameMap, dist: number[], from: Point, blocked: (x: number, y: number) => boolean): Point | null {
  let best: Point | null = null;
  let bestD = dist[idx(map, from.x, from.y)];
  for (const d of DIRS8) {
    const nx = from.x + d.x;
    const ny = from.y + d.y;
    if (!inBounds(map, nx, ny) || blocked(nx, ny)) continue;
    const v = dist[idx(map, nx, ny)];
    if (v < bestD) {
      bestD = v;
      best = d;
    }
  }
  return best;
}
