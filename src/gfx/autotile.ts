import { Tile } from '../data/tiles';
import type { GameMap } from '../core/map';
import { hash01 } from './color';

/** Quantas variações de cada tipo de tile existem no atlas. */
export const VARIANTS = { floor: 6, corridor: 3, face: 3, roof: 2 } as const;

const WALLISH = new Set<number>([Tile.Wall, Tile.SecretDoor, Tile.DoorClosed, Tile.DoorOpen, Tile.DoorLocked]);
const SOLID = new Set<number>([Tile.Wall, Tile.SecretDoor]);

/** Tile desconhecido para o jogador conta como parede (não vaza o que há do outro lado). */
export interface Neighborhood {
  /** Parede de verdade (rocha opaca). */
  solid(x: number, y: number): boolean;
  /** Parede ou porta: faz parte da linha da parede. */
  wallish(x: number, y: number): boolean;
  /** Espaço aberto que o jogador já conheceu. */
  open(x: number, y: number): boolean;
}

export function neighborhood(map: GameMap, requireExplored = true): Neighborhood {
  const at = (x: number, y: number): number => (x < 0 || y < 0 || x >= map.width || y >= map.height ? Tile.Wall : map.tiles[y * map.width + x]);
  const known = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < map.width && y < map.height && (!requireExplored || map.explored[y * map.width + x] === 1);
  return {
    solid: (x, y) => SOLID.has(at(x, y)),
    wallish: (x, y) => WALLISH.has(at(x, y)),
    open: (x, y) => known(x, y) && !WALLISH.has(at(x, y)),
  };
}

export type WallShape =
  | { kind: 'face'; capL: boolean; capR: boolean }
  | { kind: 'roof'; n: boolean; e: boolean; w: boolean; ne: boolean; nw: boolean; se: boolean; sw: boolean };

/**
 * Decide como desenhar uma parede vista de cima e um pouco de frente:
 * se o tile ao sul é aberto, vemos a face de tijolos; senão, vemos o topo escuro com
 * uma borda luminosa nos lados que encostam em espaço aberto.
 */
export function wallShape(nb: Neighborhood, x: number, y: number): WallShape {
  if (nb.open(x, y + 1)) {
    return { kind: 'face', capL: nb.open(x - 1, y), capR: nb.open(x + 1, y) };
  }
  const n = nb.open(x, y - 1), e = nb.open(x + 1, y), w = nb.open(x - 1, y);
  return {
    kind: 'roof', n, e, w,
    ne: !n && !e && nb.open(x + 1, y - 1),
    nw: !n && !w && nb.open(x - 1, y - 1),
    se: !e && nb.open(x + 1, y + 1),
    sw: !w && nb.open(x - 1, y + 1),
  };
}

/** Orientação de uma porta: 'h' = numa parede horizontal (vista de frente), 'v' = numa parede vertical. */
export function doorOrientation(map: GameMap, x: number, y: number): 'h' | 'v' {
  const nb = neighborhood(map, false);
  const horizWall = nb.wallish(x - 1, y) && nb.wallish(x + 1, y);
  const vertWall = nb.wallish(x, y - 1) && nb.wallish(x, y + 1);
  if (horizWall) return 'h';
  if (vertWall) return 'v';
  return 'h';
}

/** Variante pseudoaleatória estável para um tile (não muda a cada quadro). */
export function variantAt(x: number, y: number, salt: number, count: number): number {
  return Math.floor(hash01(x, y, salt) * count);
}
