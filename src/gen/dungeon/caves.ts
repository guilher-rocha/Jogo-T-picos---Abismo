import type { RNG } from '../../engine/rng';
import type { GameMap, Point } from '../../core/map';
import { createMap, DIRS4, DIRS8, getTile, idx, MAP_H, MAP_W, setTile } from '../../core/map';
import { Tile } from '../../data/tiles';
import type { GeneratedLevel } from './common';
import { bfsDistances, sealEdges } from './common';

/**
 * Cavernas por autômato celular: começa com ruído (45% de rocha) e aplica a regra
 * "vira rocha se tiver 5+ vizinhos rocha" algumas vezes. O ruído vira cavernas orgânicas.
 * Depois mantém só a maior região conectada.
 */
export function generateCaveLevel(rng: RNG, _depth: number, width = MAP_W, height = MAP_H): GeneratedLevel {
  for (let attempt = 0; attempt < 30; attempt++) {
    const map = createMap(width, height);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) setTile(map, x, y, rng.chance(45) ? Tile.Wall : Tile.Floor);
    }
    for (let it = 0; it < 5; it++) step(map, it < 2);
    sealEdges(map);
    const region = largestRegion(map);
    if (region.length < 450) continue;
    const keep = new Set(region.map((p) => idx(map, p.x, p.y)));
    for (let i = 0; i < map.tiles.length; i++) if (map.tiles[i] === Tile.Floor && !keep.has(i)) map.tiles[i] = Tile.Wall;

    // Escadas: subida aleatória, descida no ponto mais distante.
    const up = rng.pick(region);
    const dist = bfsDistances(map, up);
    let down = up;
    for (const p of region) if (dist[idx(map, p.x, p.y)] > dist[idx(map, down.x, down.y)]) down = p;
    setTile(map, up.x, up.y, Tile.StairsUp);
    setTile(map, down.x, down.y, Tile.StairsDown);
    // Alguns escombros decorativos.
    for (let i = 0; i < 15; i++) {
      const p = rng.pick(region);
      if (getTile(map, p.x, p.y) === Tile.Floor) setTile(map, p.x, p.y, Tile.Rubble);
    }
    return { map, rooms: [], up, down };
  }
  throw new Error('Falha ao gerar caverna');
}

function step(map: GameMap, fillOpen: boolean): void {
  const next = map.tiles.slice();
  for (let y = 1; y < map.height - 1; y++) {
    for (let x = 1; x < map.width - 1; x++) {
      // Conta a vizinhança 3×3 incluindo a própria célula.
      let walls = getTile(map, x, y) === Tile.Wall ? 1 : 0;
      for (const d of DIRS8) if (getTile(map, x + d.x, y + d.y) === Tile.Wall) walls++;
      let walls2 = 0;
      if (fillOpen) {
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (getTile(map, x + dx, y + dy) === Tile.Wall) walls2++;
      }
      // Regra 4-5 (+ preenche grandes vazios nas primeiras iterações).
      const wall = walls >= 5 || (fillOpen && walls2 <= 2);
      next[idx(map, x, y)] = wall ? Tile.Wall : Tile.Floor;
    }
  }
  map.tiles = next;
}

function largestRegion(map: GameMap): Point[] {
  const seen = new Uint8Array(map.tiles.length);
  let best: Point[] = [];
  for (let y = 1; y < map.height - 1; y++) {
    for (let x = 1; x < map.width - 1; x++) {
      const i = idx(map, x, y);
      if (seen[i] || map.tiles[i] !== Tile.Floor) continue;
      const region: Point[] = [];
      const stack: Point[] = [{ x, y }];
      seen[i] = 1;
      while (stack.length) {
        const p = stack.pop()!;
        region.push(p);
        for (const d of DIRS4) {
          const nx = p.x + d.x;
          const ny = p.y + d.y;
          const j = idx(map, nx, ny);
          if (!seen[j] && map.tiles[j] === Tile.Floor) {
            seen[j] = 1;
            stack.push({ x: nx, y: ny });
          }
        }
      }
      if (region.length > best.length) best = region;
    }
  }
  return best;
}
