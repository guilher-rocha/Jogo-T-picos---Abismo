import type { RNG } from '../../engine/rng';
import { createMap, MAP_H, MAP_W } from '../../core/map';
import type { GeneratedLevel, Room } from './common';
import { carveLCorridor, carveRoom, placeDoors, placeStairs, randomPointInRoom, sealEdges } from './common';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Node {
  rect: Rect;
  left?: Node;
  right?: Node;
  room?: Room;
}

const MIN_W = 10;
const MIN_H = 7;

/**
 * Particionamento binário do espaço (BSP): divide o mapa recursivamente em retângulos,
 * coloca uma sala em cada folha e liga as salas de cada par de "irmãos" da árvore.
 * Assim, toda a árvore fica conectada.
 */
export function generateBspLevel(rng: RNG, depth: number, width = MAP_W, height = MAP_H): GeneratedLevel {
  const map = createMap(width, height);
  const root: Node = { rect: { x: 1, y: 1, w: width - 2, h: height - 2 } };
  split(rng, root, 0);
  const rooms: Room[] = [];
  const litChance = Math.max(10, 75 - depth * 4);
  placeRooms(rng, root, rooms, litChance);
  for (const r of rooms) carveRoom(map, r);
  connect(rng, root, map);
  // Algumas ligações extras entre salas aleatórias criam ciclos.
  for (let i = 0; i < rng.int(0, 2); i++) {
    const a = rng.pick(rooms);
    const b = rng.pick(rooms);
    if (a !== b) carveLCorridor(map, rng, randomPointInRoom(rng, a), randomPointInRoom(rng, b));
  }
  placeDoors(map, rng, rooms, depth);
  const { up, down } = placeStairs(map, rng, rooms);
  sealEdges(map);
  return { map, rooms, up, down };
}

function split(rng: RNG, node: Node, level: number): void {
  const { x, y, w, h } = node.rect;
  const canH = w >= MIN_W * 2;
  const canV = h >= MIN_H * 2;
  if ((!canH && !canV) || (level > 2 && rng.chance(20))) return;
  // Divide na direção mais "comprida" (com alguma aleatoriedade).
  const vertical = canH && canV ? (w / h > 1.6 ? true : h / w > 1.2 ? false : rng.chance(50)) : canH;
  if (vertical) {
    const cut = rng.int(MIN_W, w - MIN_W);
    node.left = { rect: { x, y, w: cut, h } };
    node.right = { rect: { x: x + cut, y, w: w - cut, h } };
  } else {
    const cut = rng.int(MIN_H, h - MIN_H);
    node.left = { rect: { x, y, w, h: cut } };
    node.right = { rect: { x, y: y + cut, w, h: h - cut } };
  }
  split(rng, node.left, level + 1);
  split(rng, node.right, level + 1);
}

function placeRooms(rng: RNG, node: Node, rooms: Room[], litChance: number): void {
  if (node.left && node.right) {
    placeRooms(rng, node.left, rooms, litChance);
    placeRooms(rng, node.right, rooms, litChance);
    return;
  }
  const { x, y, w, h } = node.rect;
  // Margem de 1 para as paredes + 1 de folga entre folhas vizinhas.
  const rw = rng.int(Math.min(4, w - 4), w - 4);
  const rh = rng.int(Math.min(3, h - 4), h - 4);
  const rx = rng.int(x + 2, x + w - 2 - rw);
  const ry = rng.int(y + 2, y + h - 2 - rh);
  node.room = { x: rx, y: ry, w: rw, h: rh, lit: rng.chance(litChance) };
  rooms.push(node.room);
}

function anyRoom(rng: RNG, node: Node): Room {
  if (node.room) return node.room;
  return rng.chance(50) ? anyRoom(rng, node.left!) : anyRoom(rng, node.right!);
}

function connect(rng: RNG, node: Node, map: ReturnType<typeof createMap>): void {
  if (!node.left || !node.right) return;
  connect(rng, node.left, map);
  connect(rng, node.right, map);
  const a = anyRoom(rng, node.left);
  const b = anyRoom(rng, node.right);
  carveLCorridor(map, rng, randomPointInRoom(rng, a), randomPointInRoom(rng, b));
}
