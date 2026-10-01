import type { AnimationQueue, Animation } from '../engine/animations';
import type { Color } from '../engine/colors';
import type { GameEvent } from '../core/events';
import type { Point } from '../core/map';
import { MAP_X, MAP_Y } from './layout';

const FLASH_MS = 110;
const PROJECTILE_STEP_MS = 28;

function flash(x: number, y: number, color: Color, ms = FLASH_MS): Animation {
  return { duration: ms, draw: (term) => term.setBg(MAP_X + x, MAP_Y + y, color) };
}

function projectile(path: Point[], glyph: string, color: Color): Animation {
  return {
    duration: Math.max(1, path.length) * PROJECTILE_STEP_MS,
    draw: (term, t) => {
      const i = Math.min(path.length - 1, Math.floor(t * path.length));
      const p = path[i];
      if (p) term.set(MAP_X + p.x, MAP_Y + p.y, glyph, color);
    },
  };
}

/** Raio: a linha inteira acende e se apaga. */
function bolt(path: Point[], color: Color): Animation {
  return {
    duration: 220,
    draw: (term, t) => {
      const n = Math.min(path.length, Math.ceil(t * 2 * path.length));
      for (let i = 0; i < n; i++) term.set(MAP_X + path[i].x, MAP_Y + path[i].y, '*', color);
    },
  };
}

/** Explosão: anel que se expande. */
function explosion(cx: number, cy: number, radius: number, color: Color): Animation {
  return {
    duration: 120 + radius * 70,
    draw: (term, t) => {
      const r = Math.max(0, Math.round(t * radius));
      for (let y = cy - r; y <= cy + r; y++) {
        for (let x = cx - r; x <= cx + r; x++) {
          const d = Math.max(Math.abs(x - cx), Math.abs(y - cy));
          if (d <= r) term.set(MAP_X + x, MAP_Y + y, d === r ? '*' : '·', d === r ? color : 'yellow');
        }
      }
    },
  };
}

/** O "@" pisca em dourado. */
function sparkle(x: number, y: number, color: Color): Animation {
  return {
    duration: 450,
    draw: (term, t) => {
      if (Math.floor(t * 6) % 2 === 0) term.setBg(MAP_X + x, MAP_Y + y, color);
    },
  };
}

/** Converte os eventos de um turno em animações (consome a lista). */
export function playEvents(queue: AnimationQueue, events: GameEvent[]): void {
  let flashes: Animation[] = [];
  const flushFlashes = () => {
    queue.pushParallel(flashes);
    flashes = [];
  };
  for (const e of events) {
    switch (e.type) {
      case 'damage':
        flashes.push(flash(e.x, e.y, e.toPlayer ? 'red' : 'darkRed'));
        break;
      case 'projectile':
        flushFlashes();
        queue.push(projectile(e.path, e.glyph, e.color));
        break;
      case 'bolt':
        flushFlashes();
        queue.push(bolt(e.path, e.color));
        break;
      case 'explosion':
        flushFlashes();
        queue.push(explosion(e.x, e.y, e.radius, e.color));
        break;
      case 'levelUp':
        flushFlashes();
        queue.push(sparkle(e.x, e.y, 'gold'));
        break;
      case 'heal':
        flashes.push(flash(e.x, e.y, 'darkGreen', 200));
        break;
      default:
        break;
    }
  }
  flushFlashes();
  events.length = 0;
}
