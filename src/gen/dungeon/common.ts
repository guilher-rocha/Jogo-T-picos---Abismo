import type { RNG } from '../../engine/rng';
import { Tile, tileDef } from '../../data/tiles';
import type { GameMap, Point } from '../../core/map';
import { DIRS4, DIRS8, getTile, idx, inBounds, setTile } from '../../core/map';

/** Sala retangular. (x, y) é o canto superior esquerdo do CHÃO; as paredes ficam em volta. */
export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  lit: boolean;
  /** Sala "sumida" (estilo Rogue): só um cruzamento de corredores. */
  gone?: boolean;
}

/** Resultado de qualquer gerador de andar. */
export interface GeneratedLevel {
  map: GameMap;
  rooms: Room[];
  up: Point;
  down: Point;
}

export function roomCenter(r: Room): Point {
  return { x: r.x + Math.floor(r.w / 2), y: r.y + Math.floor(r.h / 2) };
}

export function roomContains(r: Room, x: number, y: number): boolean {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

/** Ponto aleatório dentro do chão da sala. */
export function randomPointInRoom(rng: RNG, r: Room): Point {
  return { x: rng.int(r.x, r.x + r.w - 1), y: rng.int(r.y, r.y + r.h - 1) };
}

export function carveRoom(map: GameMap, r: Room): void {
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      setTile(map, x, y, Tile.Floor);
      if (r.lit) map.lit[idx(map, x, y)] = 1;
    }
  }
  // As paredes de uma sala iluminada também são "iluminadas" (vistas ao entrar).
  if (r.lit) {
    for (let y = r.y - 1; y <= r.y + r.h; y++) {
      for (let x = r.x - 1; x <= r.x + r.w; x++) if (inBounds(map, x, y)) map.lit[idx(map, x, y)] = 1;
    }
  }
}

/** Escava corredor só onde for rocha (não estraga salas existentes). */
export function carveCorridorCell(map: GameMap, x: number, y: number): void {
  if (!inBounds(map, x, y)) return;
  if (getTile(map, x, y) === Tile.Wall) setTile(map, x, y, Tile.Corridor);
}

export function carveHLine(map: GameMap, x1: number, x2: number, y: number): void {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) carveCorridorCell(map, x, y);
}

export function carveVLine(map: GameMap, y1: number, y2: number, x: number): void {
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) carveCorridorCell(map, x, y);
}

/** Corredor em "L" entre dois pontos (ordem horizontal/vertical aleatória). */
export function carveLCorridor(map: GameMap, rng: RNG, a: Point, b: Point): void {
  if (rng.chance(50)) {
    carveHLine(map, a.x, b.x, a.y);
    carveVLine(map, a.y, b.y, b.x);
  } else {
    carveVLine(map, a.y, b.y, a.x);
    carveHLine(map, a.x, b.x, b.y);
  }
}

/** Passável para fins de conectividade (portas fechadas/secretas contam). */
export function isPassableForGen(t: number): boolean {
  return tileDef(t).walkable || t === Tile.DoorClosed || t === Tile.SecretDoor || t === Tile.DoorLocked;
}

/** Distâncias (BFS em 8 direções) a partir de `start`. -1 = inalcançável. */
export function bfsDistances(map: GameMap, start: Point): number[] {
  const dist = new Array(map.width * map.height).fill(-1);
  const queue: Point[] = [start];
  dist[idx(map, start.x, start.y)] = 0;
  for (let head = 0; head < queue.length; head++) {
    const p = queue[head];
    const d = dist[idx(map, p.x, p.y)];
    for (const dir of DIRS8) {
      const nx = p.x + dir.x;
      const ny = p.y + dir.y;
      if (!inBounds(map, nx, ny)) continue;
      const i = idx(map, nx, ny);
      if (dist[i] !== -1 || !isPassableForGen(map.tiles[i])) continue;
      dist[i] = d + 1;
      queue.push({ x: nx, y: ny });
    }
  }
  return dist;
}

/** Verdadeiro se todas as células passáveis são alcançáveis a partir de `start`. */
export function isFullyConnected(map: GameMap, start: Point): boolean {
  const dist = bfsDistances(map, start);
  for (let i = 0; i < map.tiles.length; i++) if (isPassableForGen(map.tiles[i]) && dist[i] === -1) return false;
  return true;
}

/**
 * Coloca portas onde corredores atravessam a parede de uma sala.
 * Só vira porta quando é uma "passagem de verdade" (paredes dos dois lados).
 */
export function placeDoors(map: GameMap, rng: RNG, rooms: Room[], depth: number): void {
  for (const r of rooms) {
    if (r.gone) continue;
    for (let y = r.y - 1; y <= r.y + r.h; y++) {
      for (let x = r.x - 1; x <= r.x + r.w; x++) {
        const onRing = x === r.x - 1 || x === r.x + r.w || y === r.y - 1 || y === r.y + r.h;
        if (!onRing || getTile(map, x, y) !== Tile.Corridor) continue;
        const horizWalls = getTile(map, x - 1, y) === Tile.Wall && getTile(map, x + 1, y) === Tile.Wall;
        const vertWalls = getTile(map, x, y - 1) === Tile.Wall && getTile(map, x, y + 1) === Tile.Wall;
        if (!horizWalls && !vertWalls) {
          setTile(map, x, y, Tile.Floor);
          continue;
        }
        const roll = rng.int(1, 100);
        const secretChance = Math.min(15, 2 + depth);
        if (roll <= secretChance) setTile(map, x, y, Tile.SecretDoor);
        else if (roll <= 45) setTile(map, x, y, Tile.DoorClosed);
        else if (roll <= 60) setTile(map, x, y, Tile.DoorOpen);
        else setTile(map, x, y, Tile.Floor); // passagem sem porta
      }
    }
  }
}

/** Escolhe escadas: subida numa sala, descida na sala mais distante (por caminho). */
export function placeStairs(map: GameMap, rng: RNG, rooms: Room[]): { up: Point; down: Point } {
  const real = rooms.filter((r) => !r.gone);
  const upRoom = rng.pick(real);
  const up = randomPointInRoom(rng, upRoom);
  const dist = bfsDistances(map, up);
  let best = real[0];
  let bestD = -1;
  for (const r of real) {
    if (r === upRoom && real.length > 1) continue;
    const c = roomCenter(r);
    const d = dist[idx(map, c.x, c.y)];
    if (d > bestD) {
      bestD = d;
      best = r;
    }
  }
  let down = randomPointInRoom(rng, best);
  for (let tries = 0; tries < 20 && down.x === up.x && down.y === up.y; tries++) down = randomPointInRoom(rng, best);
  setTile(map, up.x, up.y, Tile.StairsUp);
  setTile(map, down.x, down.y, Tile.StairsDown);
  return { up, down };
}

/** Garante uma borda de parede em volta do mapa. */
export function sealEdges(map: GameMap): void {
  for (let x = 0; x < map.width; x++) {
    setTile(map, x, 0, Tile.Wall);
    setTile(map, x, map.height - 1, Tile.Wall);
  }
  for (let y = 0; y < map.height; y++) {
    setTile(map, 0, y, Tile.Wall);
    setTile(map, map.width - 1, y, Tile.Wall);
  }
}

/** Número de vizinhos (4 direções) passáveis. */
export function passableNeighbors4(map: GameMap, x: number, y: number): number {
  return DIRS4.filter((d) => isPassableForGen(getTile(map, x + d.x, y + d.y))).length;
}
