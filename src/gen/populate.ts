import type { RNG } from '../engine/rng';
import type { Game, Level } from '../core/game';
import type { Point } from '../core/map';
import { DIRS8, idx, isWalkable } from '../core/map';
import { createMonster } from '../core/monster';
import type { MonsterTemplate } from '../data/monsters';
import { MONSTERS } from '../data/monsters';
import { Tile } from '../data/tiles';
import { bfsDistances } from './dungeon/common';
import { makeChampion, rollMonsterMods } from './monsterMods';

/** Células de chão comum longe da escada de chegada (onde monstros podem nascer). */
export function spawnPoints(level: Level, minDistFromUp: number): Point[] {
  const { map } = level;
  const dist = bfsDistances(map, level.up);
  const pts: Point[] = [];
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const t = map.tiles[idx(map, x, y)];
      if ((t === Tile.Floor || t === Tile.Corridor || t === Tile.Rubble) && dist[idx(map, x, y)] >= minDistFromUp) pts.push({ x, y });
    }
  }
  return pts;
}

/** Modelos que podem aparecer numa profundidade. */
export function monstersForDepth(depth: number): MonsterTemplate[] {
  const list = MONSTERS.filter((t) => !t.flags.includes('unique') && depth >= t.depth[0] && depth <= t.depth[1]);
  if (list.length) return list;
  // Fora de qualquer faixa: usa os mais fortes abaixo dessa profundidade.
  return MONSTERS.filter((t) => !t.flags.includes('unique') && t.depth[0] <= depth);
}

/**
 * Gasta um "orçamento de dificuldade" em monstros: cada monstro custa seu nível.
 * Às vezes sorteia um monstro "fora de profundidade" (2–4 andares mais difícil).
 */
export function spawnMonsters(game: Game, level: Level, rng: RNG, depth: number): void {
  let budget = 4 + depth * 3;
  const points = rng.shuffle(spawnPoints(level, 8));
  const occupied = new Set<number>();
  const free = (p: Point) => isWalkable(level.map, p.x, p.y) && !occupied.has(idx(level.map, p.x, p.y));
  let pi = 0;
  for (let attempts = 0; budget > 0 && attempts < 60 && pi < points.length; attempts++) {
    // Monstro "fora de profundidade": mais forte que o normal, mas sempre sozinho.
    const outOfDepth = depth >= 2 && rng.chance(8);
    const effDepth = outOfDepth ? depth + rng.int(2, 3) : depth;
    const t = rng.weighted(monstersForDepth(effDepth).map((m) => ({ item: m, weight: m.rarity })));
    const count = t.group && !outOfDepth ? rng.int(t.group[0], t.group[1]) : 1;
    const origin = points[pi++];
    if (!free(origin)) continue;
    const spots = [origin];
    // Bandos nascem juntos, em volta do primeiro.
    for (const d of rng.shuffle(DIRS8)) {
      if (spots.length >= count) break;
      const p = { x: origin.x + d.x, y: origin.y + d.y };
      if (free(p)) spots.push(p);
    }
    for (const p of spots) {
      occupied.add(idx(level.map, p.x, p.y));
      const mon = createMonster(game, t, p.x, p.y, rng);
      rollMonsterMods(rng, mon, depth);
      level.actors.push(mon);
    }
    budget -= Math.max(1, t.level) * spots.length;
  }
  // Às vezes um campeão com nome próprio.
  if (depth >= 3 && rng.chance(20) && level.actors.length) {
    const candidates = level.actors.filter((a) => !a.flags.includes('unique') && !a.flags.includes('stationary'));
    if (candidates.length) makeChampion(rng, rng.pick(candidates), depth);
  }
}
