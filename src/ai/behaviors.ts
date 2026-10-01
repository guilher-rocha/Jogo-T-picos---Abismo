import type { Actor } from '../core/actor';
import { hasFlag } from '../core/actor';
import type { Action } from '../core/actions';
import type { Game } from '../core/game';
import { actorAt, level, message } from '../core/game';
import type { Point } from '../core/map';
import { DIRS8, distance, isWalkable } from '../core/map';
import { hasLineOfSight } from '../core/fov';
import { Tile } from '../data/tiles';
import { capitalize, theName } from '../core/text';
import { distanceMapTo, stepDownhill } from './pathing';
import { playerHidden } from '../core/abilities';

/** Distância máxima em que um monstro percebe o jogador. */
const SIGHT = 10;
/** Turnos sem ver o jogador até desistir da caçada. */
const GIVE_UP = 20;

export function canSeePlayer(game: Game, m: Actor): boolean {
  const p = game.player;
  if (playerHidden(game) && distance(m, p) > 1) return false;
  if (distance(m, p) > SIGHT) return false;
  return hasLineOfSight(level(game).map, m.x, m.y, p.x, p.y);
}

/** Decide a próxima ação de um monstro (máquina de estados simples). */
export function decideAction(game: Game, m: Actor): Action {
  const rng = game.rng.ai;
  const sees = canSeePlayer(game, m);

  switch (m.ai.state) {
    case 'sleeping': {
      // Chance de acordar quando o jogador está à vista (e maior se estiver perto).
      // Chefes acordam assim que veem o jogador.
      const wakeChance = hasFlag(m, 'boss') ? 100 : distance(m, game.player) <= 3 ? 40 : 15;
      if (sees && rng.chance(wakeChance)) {
        m.ai.state = 'hunting';
        m.ai.lastSeen = { x: game.player.x, y: game.player.y };
        if (level(game).map.visible[m.y * level(game).map.width + m.x]) message(game, `${capitalize(theName(m))} acorda!`, 'orange');
      }
      return { type: 'wait' };
    }
    case 'wandering':
      if (sees) {
        m.ai.state = 'hunting';
        m.ai.lastSeen = { x: game.player.x, y: game.player.y };
        return hunt(game, m);
      }
      return wander(game, m);
    case 'fleeing':
      if ((m.ai.fleeUntil ?? 0) <= game.turn) {
        m.ai.state = 'hunting';
        return hunt(game, m);
      }
      return flee(game, m);
    case 'hunting':
      if (sees) {
        m.ai.lastSeen = { x: game.player.x, y: game.player.y };
        m.ai.lostTurns = 0;
      } else if (++m.ai.lostTurns > GIVE_UP) {
        m.ai.state = 'wandering';
        m.ai.lostTurns = 0;
        return wander(game, m);
      }
      return hunt(game, m);
  }
}

function blockedFor(game: Game, m: Actor) {
  const map = level(game).map;
  return (x: number, y: number): boolean => {
    const other = actorAt(game, x, y);
    if (other && !other.isPlayer) return true;
    const t = map.tiles[y * map.width + x];
    if (t === Tile.DoorClosed) return !hasFlag(m, 'opensDoors');
    return !isWalkable(map, x, y) && !other;
  };
}

/** Persegue o jogador (ou sua última posição conhecida) descendo o mapa de Dijkstra. */
function hunt(game: Game, m: Actor): Action {
  const rng = game.rng.ai;
  if (hasFlag(m, 'erratic') && rng.chance(40)) return randomStep(game, m);
  const target: Point = m.ai.lastSeen ?? { x: game.player.x, y: game.player.y };
  const p = game.player;
  if (distance(m, p) === 1 && canSeePlayer(game, m)) return { type: 'move', dx: p.x - m.x, dy: p.y - m.y };
  const map = level(game).map;
  const dist = distanceMapTo(map, target, game.turn);
  const step = stepDownhill(map, dist, m, blockedFor(game, m));
  if (!step) {
    // Chegou à última posição conhecida e não viu ninguém: volta a passear.
    if (m.x === target.x && m.y === target.y) m.ai.state = 'wandering';
    return { type: 'wait' };
  }
  return { type: 'move', dx: step.x, dy: step.y };
}

/** Foge: passo que mais aumenta a distância até o jogador. Encurralado, luta. */
function flee(game: Game, m: Actor): Action {
  const p = game.player;
  const blocked = blockedFor(game, m);
  let best: Point | null = null;
  let bestD = distance(m, p);
  for (const d of DIRS8) {
    const nx = m.x + d.x;
    const ny = m.y + d.y;
    if (blocked(nx, ny) || (nx === p.x && ny === p.y)) continue;
    const nd = distance({ x: nx, y: ny }, p);
    if (nd > bestD) {
      bestD = nd;
      best = d;
    }
  }
  if (best) return { type: 'move', dx: best.x, dy: best.y };
  if (distance(m, p) === 1) return { type: 'move', dx: p.x - m.x, dy: p.y - m.y };
  return { type: 'wait' };
}

function wander(game: Game, m: Actor): Action {
  const rng = game.rng.ai;
  const lvl = level(game);
  if (!m.ai.wanderTarget || (m.x === m.ai.wanderTarget.x && m.y === m.ai.wanderTarget.y) || rng.chance(3)) {
    // Destino: um ponto de chão aleatório do andar.
    m.ai.wanderTarget = undefined;
    for (let tries = 0; tries < 30 && !m.ai.wanderTarget; tries++) {
      const x = rng.int(1, lvl.map.width - 2);
      const y = rng.int(1, lvl.map.height - 2);
      if (isWalkable(lvl.map, x, y)) m.ai.wanderTarget = { x, y };
    }
    if (!m.ai.wanderTarget) return randomStep(game, m);
  }
  if (rng.chance(30)) return { type: 'wait' };
  const dist = distanceMapTo(lvl.map, m.ai.wanderTarget, game.turn);
  const step = stepDownhill(lvl.map, dist, m, blockedFor(game, m));
  if (!step) {
    m.ai.wanderTarget = undefined;
    return randomStep(game, m);
  }
  return { type: 'move', dx: step.x, dy: step.y };
}

function randomStep(game: Game, m: Actor): Action {
  const blocked = blockedFor(game, m);
  const options = DIRS8.filter((d) => !blocked(m.x + d.x, m.y + d.y));
  if (options.length === 0) return { type: 'wait' };
  const d = game.rng.ai.pick(options);
  return { type: 'move', dx: d.x, dy: d.y };
}
