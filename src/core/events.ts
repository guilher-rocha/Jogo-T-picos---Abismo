import type { Color } from '../engine/colors';
import type { Point } from './map';

/**
 * Eventos que o núcleo emite para a interface (animações, sons).
 * O núcleo não sabe como serão mostrados; só descreve o que aconteceu.
 */
/** Estilo visual de um golpe corpo a corpo (escolhido pelo verbo do ataque ou pela arma). */
export type MeleeStyle = 'slash' | 'pierce' | 'blunt' | 'claw' | 'bite' | 'fist' | 'touch';

export type GameEvent =
  | { type: 'damage'; x: number; y: number; amount: number; toPlayer: boolean }
  | { type: 'miss'; x: number; y: number }
  | { type: 'death'; x: number; y: number; isPlayer: boolean }
  /** `item`: id do item que voa (flecha, adaga...); `from`: de onde sai (para a animação). */
  | { type: 'projectile'; path: Point[]; glyph: string; color: Color; item?: string; from?: Point; look?: { cat: string; look: string }; element?: string }
  | { type: 'levelUp'; x: number; y: number }
  | { type: 'heal'; x: number; y: number }
  | { type: 'explosion'; x: number; y: number; radius: number; color: Color; element?: string }
  | { type: 'bolt'; path: Point[]; color: Color; from?: Point; element?: string }
  | { type: 'stairs' }
  | { type: 'pickup' }
  | { type: 'door' }
  /** Alguém conjura (x, y = conjurador): o círculo de runas aparece antes do efeito. */
  | { type: 'spell'; color: Color; x?: number; y?: number; element?: string }
  /** Golpe corpo a corpo: o atacante (x, y) avança na direção do alvo (tx, ty). */
  | { type: 'melee'; x: number; y: number; tx: number; ty: number; style: MeleeStyle; element?: string; heavy?: boolean }
  /** Uma magia atinge alguém: brilho do elemento (dano) ou do efeito (sono, lentidão, medo...). */
  | { type: 'spellHit'; x: number; y: number; effect: string; element?: string; color: Color }
  /** Sopro de dragão: jato em cone do atacante até o fim do caminho. */
  | { type: 'breath'; path: Point[]; from: Point; element: string }
  | { type: 'teleport'; x: number; y: number; tx: number; ty: number }
  /** Frasco que se espatifa (poção arremessada). */
  | { type: 'shatter'; x: number; y: number; color: Color }
  /** Ataque giratório em volta de (x, y). */
  | { type: 'whirl'; x: number; y: number }
  /** Nuvem de fumaça (Desaparecer). */
  | { type: 'smoke'; x: number; y: number }
  | { type: 'quaff' }
  | { type: 'read' }
  | { type: 'crit'; x: number; y: number }
  | { type: 'bossDeath'; x: number; y: number };

export function pushEvent(events: GameEvent[], e: GameEvent): void {
  events.push(e);
  if (events.length > 200) events.splice(0, events.length - 200);
}
