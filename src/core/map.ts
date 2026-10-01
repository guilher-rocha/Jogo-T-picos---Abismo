import { Tile, tileDef } from '../data/tiles';

export const MAP_W = 80;
export const MAP_H = 24;

export interface Point {
  x: number;
  y: number;
}

/** Grade de terreno de um andar. Tudo em arrays simples para salvar em JSON. */
export interface GameMap {
  width: number;
  height: number;
  tiles: number[];
  /** 1 = o jogador já viu esta célula (memória do mapa). */
  explored: number[];
  /** 1 = visível neste turno (recalculado pelo FOV). */
  visible: number[];
  /** 1 = célula iluminada (sala com luz). */
  lit: number[];
}

export function createMap(width = MAP_W, height = MAP_H, fill: number = Tile.Wall): GameMap {
  const n = width * height;
  return {
    width,
    height,
    tiles: new Array(n).fill(fill),
    explored: new Array(n).fill(0),
    visible: new Array(n).fill(0),
    lit: new Array(n).fill(0),
  };
}

export function inBounds(map: GameMap, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.width && y < map.height;
}

export function idx(map: GameMap, x: number, y: number): number {
  return y * map.width + x;
}

export function getTile(map: GameMap, x: number, y: number): number {
  return inBounds(map, x, y) ? map.tiles[idx(map, x, y)] : Tile.Wall;
}

export function setTile(map: GameMap, x: number, y: number, t: number): void {
  if (inBounds(map, x, y)) map.tiles[idx(map, x, y)] = t;
}

export function isWalkable(map: GameMap, x: number, y: number): boolean {
  return inBounds(map, x, y) && tileDef(getTile(map, x, y)).walkable;
}

export function isTransparent(map: GameMap, x: number, y: number): boolean {
  return inBounds(map, x, y) && tileDef(getTile(map, x, y)).transparent;
}

export function isVisible(map: GameMap, x: number, y: number): boolean {
  return inBounds(map, x, y) && map.visible[idx(map, x, y)] === 1;
}

export function isExplored(map: GameMap, x: number, y: number): boolean {
  return inBounds(map, x, y) && map.explored[idx(map, x, y)] === 1;
}

const CHAR_TO_TILE: Record<string, number> = {
  '#': Tile.Wall,
  '.': Tile.Floor,
  ',': Tile.Corridor,
  '+': Tile.DoorClosed,
  "'": Tile.DoorOpen,
  '>': Tile.StairsDown,
  '<': Tile.StairsUp,
  '~': Tile.Water,
  '{': Tile.Fountain,
  '_': Tile.Altar,
  '&': Tile.Fungus,
  ':': Tile.Rubble,
};

/** Constrói um mapa a partir de linhas de texto (útil para testes e salas pré-fabricadas). */
export function mapFromStrings(lines: string[], width = MAP_W, height = MAP_H): GameMap {
  const map = createMap(width, height);
  lines.forEach((line, y) => {
    [...line].forEach((ch, x) => {
      const t = CHAR_TO_TILE[ch];
      if (t !== undefined) setTile(map, x, y, t);
    });
  });
  return map;
}

/** As 8 direções (dx, dy). */
export const DIRS8: readonly Point[] = [
  { x: 0, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 },
  { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1, y: 0 }, { x: -1, y: -1 },
];

export const DIRS4: readonly Point[] = [
  { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 },
];

/** Distância de Chebyshev (movimento em 8 direções). */
export function distance(a: Point, b: Point): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}
