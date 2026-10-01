import type { RNG } from '../engine/rng';
import type { Game, Level } from '../core/game';
import type { Point } from '../core/map';
import { distance, isWalkable, setTile } from '../core/map';
import { createMonster } from '../core/monster';
import { addItem, createItem } from '../core/item';
import { bossForDepth } from '../data/bosses';
import { monsterTemplate } from '../data/monsters';
import { Tile } from '../data/tiles';
import { MAX_DEPTH } from '../data/themes';

/** Células livres perto de um ponto (anéis crescentes). */
function freeCellsAround(level: Level, center: Point, maxR: number): Point[] {
  const out: Point[] = [];
  for (let r = 1; r <= maxR; r++) {
    for (let y = center.y - r; y <= center.y + r; y++) {
      for (let x = center.x - r; x <= center.x + r; x++) {
        if (distance({ x, y }, center) !== r) continue;
        if (!isWalkable(level.map, x, y)) continue;
        if (level.actors.some((a) => a.x === x && a.y === y)) continue;
        out.push({ x, y });
      }
    }
  }
  return out;
}

/**
 * Nos andares 5, 10, 15 e 20 um chefe único guarda a escada de descida
 * (no 20, guarda o Coração do Abismo, que fica no lugar da escada).
 */
export function placeBoss(game: Game, level: Level, rng: RNG, depth: number): void {
  const boss = bossForDepth(depth);
  if (!boss || game.uniquesKilled.includes(boss.id)) return;
  const home = level.down;
  if (depth === MAX_DEPTH) {
    setTile(level.map, home.x, home.y, Tile.Floor);
    addItem(level, createItem(game, 'amulet_abyss', { x: home.x, y: home.y }));
  }
  // Abre espaço: monstros comuns muito perto da escada saem dali.
  level.actors = level.actors.filter((a) => distance(a, home) > 4);
  const spots = freeCellsAround(level, home, 4);
  if (!spots.length) return;
  const b = createMonster(game, boss, spots[0].x, spots[0].y, rng);
  b.ai.state = 'sleeping';
  level.actors.push(b);
  let i = 1;
  for (const e of boss.escort) {
    const n = rng.int(e.count[0], e.count[1]);
    for (let k = 0; k < n && i < spots.length; k++, i++) {
      const m = createMonster(game, monsterTemplate(e.id), spots[i].x, spots[i].y, rng);
      m.ai.state = 'sleeping';
      level.actors.push(m);
    }
  }
}
