import type { Color } from '../engine/colors';
import type { Point } from './map';

/**
 * Eventos que o núcleo emite para a interface (animações, sons).
 * O núcleo não sabe como serão mostrados; só descreve o que aconteceu.
 */
export type GameEvent =
  | { type: 'damage'; x: number; y: number; amount: number; toPlayer: boolean }
  | { type: 'miss'; x: number; y: number }
  | { type: 'death'; x: number; y: number; isPlayer: boolean }
  | { type: 'projectile'; path: Point[]; glyph: string; color: Color }
  | { type: 'levelUp'; x: number; y: number }
  | { type: 'heal'; x: number; y: number }
  | { type: 'explosion'; x: number; y: number; radius: number; color: Color }
  | { type: 'bolt'; path: Point[]; color: Color }
  | { type: 'stairs' }
  | { type: 'pickup' }
  | { type: 'door' }
  | { type: 'spell'; color: Color }
  | { type: 'quaff' }
  | { type: 'read' }
  | { type: 'crit'; x: number; y: number }
  | { type: 'bossDeath'; x: number; y: number };

export function pushEvent(events: GameEvent[], e: GameEvent): void {
  events.push(e);
  if (events.length > 200) events.splice(0, events.length - 200);
}
