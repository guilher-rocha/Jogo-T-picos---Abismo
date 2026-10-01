import type { RNG } from '../../engine/rng';
import type { Point } from '../../core/map';
import { createMap, MAP_H, MAP_W } from '../../core/map';
import type { GeneratedLevel, Room } from './common';
import { carveCorridorCell, carveHLine, carveRoom, carveVLine, placeDoors, placeStairs, sealEdges } from './common';

const COLS = 3;
const ROWS = 3;

interface Cell {
  x0: number;
  y0: number;
  w: number;
  h: number;
}

/**
 * Gerador clássico do Rogue: o mapa é dividido numa grade 3×3; cada célula recebe uma sala
 * (ou um cruzamento de corredores, a "sala sumida") e células vizinhas são ligadas por corredores
 * formando uma árvore geradora + algumas ligações extras (ciclos).
 */
export function generateRogueLevel(rng: RNG, depth: number, width = MAP_W, height = MAP_H): GeneratedLevel {
  const map = createMap(width, height);
  const cells: Cell[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x0 = 1 + Math.floor((c * (width - 2)) / COLS);
      const x1 = 1 + Math.floor(((c + 1) * (width - 2)) / COLS);
      const y0 = 1 + Math.floor((r * (height - 2)) / ROWS);
      const y1 = 1 + Math.floor(((r + 1) * (height - 2)) / ROWS);
      cells.push({ x0, y0, w: x1 - x0, h: y1 - y0 });
    }
  }

  // Até 2 salas "sumidas" (nunca todas).
  const goneCount = rng.int(0, 2);
  const gone = new Set(rng.shuffle(cells.map((_, i) => i)).slice(0, goneCount));
  const litChance = Math.max(15, 90 - depth * 6);

  const rooms: Room[] = cells.map((cell, i) => {
    if (gone.has(i)) {
      const p = { x: rng.int(cell.x0 + 2, cell.x0 + cell.w - 3), y: rng.int(cell.y0 + 1, cell.y0 + cell.h - 2) };
      return { x: p.x, y: p.y, w: 1, h: 1, lit: false, gone: true };
    }
    const w = rng.int(4, cell.w - 4);
    const h = rng.int(2, cell.h - 3);
    const x = rng.int(cell.x0 + 2, cell.x0 + cell.w - 2 - w);
    const y = rng.int(cell.y0 + 1, cell.y0 + cell.h - 2 - h);
    return { x, y, w, h, lit: rng.chance(litChance) };
  });

  for (const r of rooms) {
    if (r.gone) carveCorridorCell(map, r.x, r.y);
    else carveRoom(map, r);
  }

  // Árvore geradora aleatória sobre a grade (vizinhos ortogonais).
  const neighbors = (i: number): number[] => {
    const c = i % COLS;
    const r = Math.floor(i / COLS);
    const out: number[] = [];
    if (c > 0) out.push(i - 1);
    if (c < COLS - 1) out.push(i + 1);
    if (r > 0) out.push(i - COLS);
    if (r < ROWS - 1) out.push(i + COLS);
    return out;
  };
  const connected = new Set<number>([rng.int(0, cells.length - 1)]);
  const edges = new Set<string>();
  const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  while (connected.size < cells.length) {
    const frontier: [number, number][] = [];
    for (const a of connected) for (const b of neighbors(a)) if (!connected.has(b)) frontier.push([a, b]);
    const [a, b] = rng.pick(frontier);
    connected.add(b);
    edges.add(key(a, b));
  }
  // Ligações extras criam ciclos (o mapa não fica uma árvore "linear").
  const extra = rng.int(1, 3);
  for (let n = 0; n < extra; n++) {
    const a = rng.int(0, cells.length - 1);
    const b = rng.pick(neighbors(a));
    edges.add(key(a, b));
  }

  for (const e of edges) {
    const [a, b] = e.split('-').map(Number);
    connectRooms(map, rng, rooms[a], rooms[b], b - a === 1);
  }

  placeDoors(map, rng, rooms, depth);
  const { up, down } = placeStairs(map, rng, rooms);
  sealEdges(map);
  return { map, rooms, up, down };
}

/** Liga duas salas vizinhas na grade: porta na parede de cada uma + corredor em "Z". */
function connectRooms(map: ReturnType<typeof createMap>, rng: RNG, a: Room, b: Room, horizontal: boolean): void {
  if (horizontal) {
    const da: Point = a.gone ? { x: a.x, y: a.y } : { x: a.x + a.w, y: rng.int(a.y, a.y + a.h - 1) };
    const db: Point = b.gone ? { x: b.x, y: b.y } : { x: b.x - 1, y: rng.int(b.y, b.y + b.h - 1) };
    const midX = da.x + 1 <= db.x - 1 ? rng.int(da.x + 1, db.x - 1) : da.x;
    carveHLine(map, da.x, midX, da.y);
    carveVLine(map, da.y, db.y, midX);
    carveHLine(map, midX, db.x, db.y);
  } else {
    const da: Point = a.gone ? { x: a.x, y: a.y } : { x: rng.int(a.x, a.x + a.w - 1), y: a.y + a.h };
    const db: Point = b.gone ? { x: b.x, y: b.y } : { x: rng.int(b.x, b.x + b.w - 1), y: b.y - 1 };
    const midY = da.y + 1 <= db.y - 1 ? rng.int(da.y + 1, db.y - 1) : da.y;
    carveVLine(map, da.y, midY, da.x);
    carveHLine(map, da.x, db.x, midY);
    carveVLine(map, midY, db.y, db.x);
  }
}
