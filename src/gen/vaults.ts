import type { RNG } from '../engine/rng';
import type { Game, Level } from '../core/game';
import type { Point } from '../core/map';
import { DIRS4, getTile, idx, inBounds, setTile } from '../core/map';
import { Tile } from '../data/tiles';
import { addItem, createItem } from '../core/item';
import { createMonster } from '../core/monster';
import { generateItem } from './items';
import { monstersForDepth } from './populate';
import { isPassableForGen } from './dungeon/common';

/**
 * Salas pré-fabricadas ("vaults"). Legenda:
 *  # parede · . chão · + porta · S porta secreta · L porta trancada · $ ouro · * item bom
 *  M monstro (adormecido) · B tomo/pergaminho · ! poção · { fonte · _ altar · ~ água · & fungo gigante
 */
interface Vault {
  id: string;
  name: string;
  minDepth: number;
  weight: number;
  lines: string[];
}

export const VAULTS: Vault[] = [
  { id: 'treasury', name: 'tesouraria', minDepth: 3, weight: 4, lines: [
    '#########',
    '#$*.M.*$#',
    '#.#####.#',
    '#*#$*$#*#',
    '#.##S##.#',
    '#...M...#',
    '####S####',
  ] },
  { id: 'library', name: 'biblioteca', minDepth: 2, weight: 4, lines: [
    '###########',
    '#B.B.B.B.B#',
    '#.........#',
    '#B.B.M.B.B#',
    '#####+#####',
  ] },
  { id: 'shrine', name: 'santuário', minDepth: 1, weight: 4, lines: [
    '#########',
    '#~~...~~#',
    '#~..{..~#',
    '+..._...+',
    '#~.....~#',
    '#~~.*.~~#',
    '#########',
  ] },
  { id: 'nest', name: 'ninho de monstros', minDepth: 4, weight: 3, lines: [
    '###########',
    '#M.M.M.M.*#',
    '#.M.M.M.M.#',
    '#*.M.M.M.$#',
    '#####L#####',
  ] },
  { id: 'garden', name: 'jardim fúngico', minDepth: 6, weight: 2, lines: [
    '#########',
    '#&.&!&.&#',
    '#.&.*.&.#',
    '+..&M&..+',
    '#.&.!.&.#',
    '#&.&.&.&#',
    '#########',
  ] },
  { id: 'armory', name: 'arsenal', minDepth: 5, weight: 3, lines: [
    '#########',
    '#*.*.*.*#',
    '#.......#',
    '#M.....M#',
    '####+####',
  ] },
];

/** Tenta colocar uma sala especial numa área de rocha maciça e ligá-la ao resto do andar. */
export function placeVault(game: Game, level: Level, rng: RNG, depth: number): string | null {
  const pool = VAULTS.filter((v) => v.minDepth <= depth);
  if (!pool.length) return null;
  const v = rng.weighted(pool.map((x) => ({ item: x, weight: x.weight })));
  const h = v.lines.length;
  const w = Math.max(...v.lines.map((l) => l.length));
  const map = level.map;
  for (let attempt = 0; attempt < 80; attempt++) {
    const ox = rng.int(1, map.width - w - 2);
    const oy = rng.int(1, map.height - h - 2);
    // A área (com margem de 1) precisa ser só rocha.
    let solid = true;
    for (let y = oy - 1; y <= oy + h && solid; y++) for (let x = ox - 1; x <= ox + w && solid; x++) if (!inBounds(map, x, y) || getTile(map, x, y) !== Tile.Wall) solid = false;
    if (!solid) continue;
    const doors: Point[] = [];
    v.lines.forEach((line, y) => {
      [...line].forEach((ch, x) => {
        const px = ox + x;
        const py = oy + y;
        const tile = ({ '#': Tile.Wall, '.': Tile.Floor, '+': Tile.DoorClosed, S: Tile.SecretDoor, L: Tile.DoorLocked, '{': Tile.Fountain, _: Tile.Altar, '~': Tile.Water, '&': Tile.Fungus } as Record<string, number>)[ch] ?? Tile.Floor;
        setTile(map, px, py, tile);
        if (ch === '+' || ch === 'S' || ch === 'L') doors.push({ x: px, y: py });
        const at = { x: px, y: py };
        if (ch === '$') addItem(level, createItem(game, 'gold', { ...at, quantity: rng.roll(`${depth + 2}d10`) }));
        if (ch === '*') {
          const it = generateItem(game, rng, depth + 2, ['weapon', 'armor', 'shield', 'ring', 'amulet', 'wand', 'launcher', 'helm', 'boots', 'cloak']);
          if (it) addItem(level, { ...it, ...at });
        }
        if (ch === 'B') {
          const it = generateItem(game, rng, depth + 1, rng.chance(40) ? ['book'] : ['scroll']);
          if (it) addItem(level, { ...it, ...at });
        }
        if (ch === '!') {
          const it = generateItem(game, rng, depth + 1, ['potion']);
          if (it) addItem(level, { ...it, ...at });
        }
        if (ch === 'M') {
          const m = createMonster(game, rng.pick(monstersForDepth(depth + 1)), px, py, rng);
          m.ai.state = 'sleeping';
          level.actors.push(m);
        }
      });
    });
    // Liga cada porta ao andar por um túnel até a casa passável mais próxima.
    for (const d of doors) connectToLevel(level, d, { x: ox, y: oy, w, h });
    // Portas trancadas: a chave é força bruta (o jogador pode chutar com F) — aqui viram portas fechadas
    // para não prender o jogador; o "tranca" fica só visual nas portas extras.
    for (const d of doors) if (getTile(map, d.x, d.y) === Tile.DoorLocked) setTile(map, d.x, d.y, Tile.DoorClosed);
    return v.name;
  }
  return null;
}

function connectToLevel(level: Level, door: Point, box: { x: number; y: number; w: number; h: number }): void {
  const map = level.map;
  const inside = (x: number, y: number) => x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h;
  // BFS a partir da porta, só por fora da sala, até achar chão já existente.
  const prev = new Map<number, number>();
  const start = idx(map, door.x, door.y);
  const queue = [start];
  prev.set(start, -1);
  let found = -1;
  for (let head = 0; head < queue.length && found < 0; head++) {
    const cur = queue[head];
    const cx = cur % map.width;
    const cy = Math.floor(cur / map.width);
    for (const d of DIRS4) {
      const nx = cx + d.x;
      const ny = cy + d.y;
      if (nx <= 0 || ny <= 0 || nx >= map.width - 1 || ny >= map.height - 1 || inside(nx, ny)) continue;
      const ni = idx(map, nx, ny);
      if (prev.has(ni)) continue;
      prev.set(ni, cur);
      if (isPassableForGen(map.tiles[ni])) {
        found = ni;
        break;
      }
      queue.push(ni);
    }
  }
  // Escava o caminho encontrado.
  for (let c = prev.get(found) ?? -1; c >= 0 && c !== start; c = prev.get(c) ?? -1) {
    if (map.tiles[c] === Tile.Wall) map.tiles[c] = Tile.Corridor;
  }
}
