import type { RNG } from '../engine/rng';
import type { Level } from '../core/game';
import type { Trap, TrapKind } from '../core/traps';
import { TRAP_INFO } from '../core/traps';
import { distance, getTile, idx, setTile, DIRS8 } from '../core/map';
import { Tile } from '../data/tiles';
import { spawnPoints } from './populate';
import { bfsDistances } from './dungeon/common';

/** Espalha armadilhas, fontes, altares, poças de água e lava pelo andar. */
export function placeFeatures(level: Level, rng: RNG, depth: number): void {
  const points = rng.shuffle(spawnPoints(level, 4).filter((p) => getTile(level.map, p.x, p.y) === Tile.Floor));
  let pi = 0;
  const next = () => points[pi++];

  // Armadilhas
  const traps: Trap[] = [];
  const nTraps = rng.int(0, 2 + Math.floor(depth / 4));
  const kinds = (Object.keys(TRAP_INFO) as TrapKind[]).filter((k) => TRAP_INFO[k].minDepth <= depth);
  for (let i = 0; i < nTraps; i++) {
    const p = next();
    if (!p || distance(p, level.down) < 2) continue;
    traps.push({ x: p.x, y: p.y, kind: rng.weighted(kinds.map((k) => ({ item: k, weight: TRAP_INFO[k].weight }))), hidden: true });
  }
  level.traps = traps;

  // Fonte e altar (em salas).
  if (rng.chance(35)) {
    const p = next();
    if (p) setTile(level.map, p.x, p.y, Tile.Fountain);
  }
  if (rng.chance(12)) {
    const p = next();
    if (p) setTile(level.map, p.x, p.y, Tile.Altar);
  }

  // Poças de água (e lava no Abismo) a partir de um ponto, sem bloquear o caminho.
  const liquid = depth >= 17 && rng.chance(60) ? Tile.Lava : Tile.Water;
  if (rng.chance(depth >= 9 ? 55 : 25)) {
    const start = next();
    if (start) growPool(level, rng, start, liquid, rng.int(5, 16));
  }
}

function growPool(level: Level, rng: RNG, start: { x: number; y: number }, tile: number, size: number): void {
  const map = level.map;
  const cells = [start];
  for (let n = 0; n < size && cells.length; n++) {
    const c = cells.splice(rng.int(0, cells.length - 1), 1)[0];
    if (getTile(map, c.x, c.y) !== Tile.Floor) continue;
    if (distance(c, level.up) <= 1 || distance(c, level.down) <= 1) continue;
    const i = idx(map, c.x, c.y);
    const before = map.tiles[i];
    map.tiles[i] = tile;
    // Lava não pode cortar o caminho entre as escadas.
    if (tile === Tile.Lava) {
      const old = map.tiles.slice();
      for (let k = 0; k < map.tiles.length; k++) if (map.tiles[k] === Tile.Lava) map.tiles[k] = Tile.Wall;
      const ok = bfsDistances(map, level.up)[idx(map, level.down.x, level.down.y)] >= 0;
      map.tiles = old;
      if (!ok) {
        map.tiles[i] = before;
        continue;
      }
    }
    for (const d of DIRS8) cells.push({ x: c.x + d.x, y: c.y + d.y });
  }
}
