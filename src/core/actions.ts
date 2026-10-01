import type { Actor } from './actor';
import { ACTION_COST, hasFlag } from './actor';
import type { Game } from './game';
import { actorAt, emit, level, message } from './game';
import type { Point } from './map';
import { getTile, isTransparent, isWalkable, setTile } from './map';
import { bresenham } from './fov';
import { Tile } from '../data/tiles';
import { meleeAttack, rangedAttack } from './combat';
import { enterLevel } from './world';
import { castSpell } from './spells';
import { useAbility } from './abilities';
import { MAX_DEPTH } from '../data/themes';
import { capitalize, theName } from './text';

/** Ações possíveis. Jogador e monstros usam exatamente as mesmas. */
export type Action =
  | { type: 'move'; dx: number; dy: number }
  | { type: 'attack'; dx: number; dy: number }
  | { type: 'throw'; tx: number; ty: number }
  | { type: 'wait' }
  | { type: 'descend' }
  | { type: 'ascend' }
  | { type: 'cast'; spellId: string; tx?: number; ty?: number }
  | { type: 'ability'; abilityId: string; dx?: number; dy?: number };

/**
 * Executa uma ação. Retorna a energia gasta (0 = ação inválida, não passa o tempo).
 */
export function perform(game: Game, actor: Actor, action: Action): number {
  switch (action.type) {
    case 'move':
      return doMove(game, actor, action.dx, action.dy);
    case 'attack': {
      const target = actorAt(game, actor.x + action.dx, actor.y + action.dy);
      if (!target || target === actor) return 0;
      meleeAttack(game, actor, target);
      return ACTION_COST;
    }
    case 'throw':
      return doThrow(game, actor, action.tx, action.ty);
    case 'wait':
      return ACTION_COST;
    case 'cast':
      return castSpell(game, actor, action.spellId, action.tx !== undefined ? { x: action.tx, y: action.ty! } : undefined);
    case 'ability':
      return actor.isPlayer ? useAbility(game, action.abilityId, action.dx, action.dy) : 0;
    case 'descend':
      return doStairs(game, actor, 'down');
    case 'ascend':
      return doStairs(game, actor, 'up');
  }
}

function doStairs(game: Game, actor: Actor, dir: 'up' | 'down'): number {
  if (!actor.isPlayer) return 0;
  const t = getTile(level(game).map, actor.x, actor.y);
  if (dir === 'down') {
    if (t !== Tile.StairsDown) {
      message(game, 'Não há escada para baixo aqui.', 'darkGray');
      return 0;
    }
    if (game.depth >= MAX_DEPTH) return 0;
    enterLevel(game, game.depth + 1, 'up');
    return ACTION_COST;
  }
  if (t !== Tile.StairsUp) {
    message(game, 'Não há escada para cima aqui.', 'darkGray');
    return 0;
  }
  if (game.depth === 1) {
    message(game, 'A saída está bloqueada por uma força mágica. Só o Coração do Abismo pode abri-la.', 'lightGray');
    return 0;
  }
  enterLevel(game, game.depth - 1, 'down');
  return ACTION_COST;
}

export const THROW_RANGE = 8;

/**
 * Arremessa um dardo (subetapa 1.7: estoque infinito; vira item de inventário na 2.4).
 * O projétil segue a linha de Bresenham e para no primeiro ator ou parede.
 */
function doThrow(game: Game, actor: Actor, tx: number, ty: number): number {
  if (tx === actor.x && ty === actor.y) return 0;
  const map = level(game).map;
  const line = bresenham(actor.x, actor.y, tx, ty).slice(1, THROW_RANGE + 1);
  const path: Point[] = [];
  let hit: Actor | undefined;
  for (const p of line) {
    if (!isTransparent(map, p.x, p.y)) break;
    path.push(p);
    const other = actorAt(game, p.x, p.y);
    if (other) {
      hit = other;
      break;
    }
  }
  if (actor.isPlayer) message(game, 'Você arremessa um dardo.', 'lightGray');
  emit(game, { type: 'projectile', path, glyph: projectileGlyph(tx - actor.x, ty - actor.y), color: 'lightGray' });
  if (hit) rangedAttack(game, actor, hit, { verb: 'acerta', damage: '1d4+1' }, 'o dardo');
  return ACTION_COST;
}

/** Glifo do projétil conforme a direção: - | / \ */
export function projectileGlyph(dx: number, dy: number): string {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ay * 2 < ax) return '-';
  if (ax * 2 < ay) return '|';
  return Math.sign(dx) === Math.sign(dy) ? '\\' : '/';
}

/** Mover: ataca se houver inimigo, abre porta se estiver fechada, senão anda. */
function doMove(game: Game, actor: Actor, dx: number, dy: number): number {
  const nx = actor.x + dx;
  const ny = actor.y + dy;
  const map = level(game).map;
  const other = actorAt(game, nx, ny);
  if (other) {
    // Monstros não se atacam entre si.
    if (actor.isPlayer || other.isPlayer) {
      meleeAttack(game, actor, other);
      return ACTION_COST;
    }
    return 0;
  }
  const t = getTile(map, nx, ny);
  if (t === Tile.DoorClosed) {
    if (!actor.isPlayer && !hasFlag(actor, 'opensDoors')) return 0;
    setTile(map, nx, ny, Tile.DoorOpen);
    if (actor.isPlayer) message(game, 'Você abre a porta.', 'lightGray');
    else if (map.visible[ny * map.width + nx]) message(game, `${capitalize(theName(actor))} abre uma porta.`, 'lightGray');
    return ACTION_COST;
  }
  if (t === Tile.DoorLocked) {
    if (actor.isPlayer) message(game, 'A porta está trancada.', 'lightGray');
    return 0;
  }
  if (!isWalkable(map, nx, ny)) return 0;
  actor.x = nx;
  actor.y = ny;
  return ACTION_COST;
}
