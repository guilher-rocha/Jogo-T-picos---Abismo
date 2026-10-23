import type { Scene } from '../engine/scene';
import { hash01 } from '../gfx/color';

/**
 * Auras de estado sobre os atores (em chamas, envenenado, lento, confuso...). Tudo em partículas de
 * 1–2 pixels de sprite, no mesmo estilo das artes, e calculado só a partir do relógio: cada partícula
 * percorre um ciclo (fase 0 → 1) com deslocamento próprio, então nada precisa ser guardado entre quadros.
 *
 * (x, y) é o tile do ator (a mesma posição suavizada usada para o sprite); `id` desencontra os ciclos
 * de atores diferentes; `big` aumenta a área para chefes.
 */

/** Um pixel (ou bloco de `size` pixels) centrado em (x, y) do mundo. */
function dot(s: Scene, x: number, y: number, color: string, a: number, size = 1): void {
  if (a <= 0.02) return;
  const h = Math.floor(size / 2);
  s.prect(x, y, -h, -h, size, size, color, Math.min(1, a));
}

/** Fase (0–1) da partícula `i` num ciclo de `period` ms. */
const phase = (time: number, period: number, id: number, i: number): number => (time / period + hash01(id, i, 313)) % 1;

const FLAME = ['#fff6c0', '#ffd24a', '#ff8a2a', '#d8401a', '#5a4a48'];
const flameColor = (u: number): string => FLAME[Math.min(FLAME.length - 1, Math.floor(u * FLAME.length))];

export interface AuraOpts {
  big?: boolean;
}

/** Partes da aura que ficam ATRÁS do sprite (bolha do escudo, rastro de velocidade). */
export function drawAuraBack(s: Scene, statuses: Set<string>, x: number, y: number, time: number, id: number, o: AuraOpts = {}): void {
  const k = o.big ? 1.5 : 1;
  const cx = x + 0.5;
  if (statuses.has('hasted')) {
    // riscos de vento passando atrás do corpo
    for (let i = 0; i < 4; i++) {
      const u = phase(time, 420, id, i);
      const yy = y + 0.35 + hash01(id, i, 7) * 0.5;
      const xx = cx + (0.45 - u * 0.9) * k;
      for (let j = 0; j < 4; j++) dot(s, xx + j / 16, yy, j === 0 ? '#fff8c0' : '#ffe04a', (1 - u) * (1 - j * 0.22) * 0.8);
    }
  }
  if (statuses.has('shielded')) {
    // metade de trás da bolha (mais apagada)
    shieldBubble(s, cx, y + 0.5, time, k, false);
  }
}

/** Partes da aura que ficam NA FRENTE do sprite. */
export function drawAuraFront(s: Scene, statuses: Set<string>, x: number, y: number, time: number, id: number, o: AuraOpts = {}): void {
  const k = o.big ? 1.5 : 1;
  const cx = x + 0.5;
  const head = y + (o.big ? -0.35 : 0.08);

  if (statuses.has('burning')) {
    s.glow(cx, y + 0.6, 0.85 * k, '#ff8a2a', 0.28 + 0.1 * Math.sin(time / 70 + id));
    // labaredas subindo do corpo, amarelas embaixo, vermelhas em cima, fumaça no fim
    for (let i = 0; i < 11; i++) {
      const u = phase(time, 520 + hash01(id, i, 3) * 260, id, i);
      const bx = cx + (hash01(id, i, 1) - 0.5) * 0.7 * k * (1 - u * 0.5);
      const xx = bx + Math.sin(u * 9 + i) * 0.05;
      const yy = y + 0.92 - u * 1.25 * k;
      dot(s, xx, yy, flameColor(u), u > 0.75 ? (1 - u) * 3 : 1, u < 0.35 ? 2 : 1);
    }
  }

  if (statuses.has('poisoned')) {
    // bolhas verdes subindo devagar e estourando em cima
    for (let i = 0; i < 4; i++) {
      const u = phase(time, 1300, id, i);
      const xx = cx + (hash01(id, i, 1) - 0.5) * 0.6 * k + Math.sin(u * 6 + i) * 0.04;
      const yy = y + 0.75 - u * 0.75 * k;
      if (u < 0.85) {
        dot(s, xx, yy, '#4aa83a', 0.85, 2);
        dot(s, xx - 1 / 16, yy - 1 / 16, '#c4ff9a', 0.9);
      } else {
        // estouro: dois pixels se afastando
        const d = (u - 0.85) * 2.5;
        dot(s, xx - d * 0.6, yy - d * 0.3, '#9ae070', 1 - (u - 0.85) / 0.15);
        dot(s, xx + d * 0.6, yy - d * 0.3, '#9ae070', 1 - (u - 0.85) / 0.15);
      }
    }
  }

  if (statuses.has('slowed')) {
    // anel azul nos pés, com dois ponteiros girando devagar (o tempo pesa)
    const fy = y + 0.88;
    const n = 18;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      dot(s, cx + Math.cos(ang) * 0.42 * k, fy + Math.sin(ang) * 0.13 * k, '#5a7ad8', 0.75);
    }
    for (let h = 0; h < 2; h++) {
      const ang = time / (h ? 1600 : 4200) + h * 2;
      for (let j = 0; j < 3; j++) dot(s, cx + Math.cos(ang - j * 0.12) * 0.42 * k, fy + Math.sin(ang - j * 0.12) * 0.13 * k, j ? '#7ab4ff' : '#e0f0ff', 1 - j * 0.3);
    }
  }

  if (statuses.has('paralyzed')) {
    // faíscas em zigue-zague estalando em volta do corpo
    const frame = Math.floor(time / 90);
    for (let b = 0; b < 3; b++) {
      if (hash01(id + b, frame, 5) < 0.35) continue;
      // nasce na borda do corpo e estala para fora
      const side = hash01(id, frame, b * 3 + 3) < 0.5 ? -1 : 1;
      let xx = cx + side * (0.2 + hash01(id, frame, b * 3 + 1) * 0.2) * k;
      let yy = y + 0.25 + hash01(id, frame, b * 3 + 2) * 0.55 * k;
      for (let j = 0; j < 6; j++) {
        dot(s, xx, yy, j < 2 ? '#ffffff' : '#fff27a', 1 - j * 0.1);
        xx += side * (j % 3 === 2 ? 0 : 1) / 16;
        yy += (j % 3 === 2 ? 1 : j % 2 ? -1 : 1) / 16;
      }
    }
    s.glow(cx, y + 0.55, 0.6 * k, '#fff27a', 0.12 + (frame % 2) * 0.08);
  }

  if (statuses.has('confused')) {
    // três estrelinhas girando em volta da cabeça
    for (let i = 0; i < 3; i++) {
      const ang = time / 260 + (i / 3) * Math.PI * 2;
      const sx = cx + Math.cos(ang) * 0.32 * k;
      const sy = head - 0.06 + Math.sin(ang) * 0.08;
      const front = Math.sin(ang) > 0;
      const a = front ? 1 : 0.5;
      dot(s, sx, sy, '#fff27a', a);
      if (front || i === 0) {
        dot(s, sx - 1 / 16, sy, '#ffd24a', a * 0.9);
        dot(s, sx + 1 / 16, sy, '#ffd24a', a * 0.9);
        dot(s, sx, sy - 1 / 16, '#ffd24a', a * 0.9);
        dot(s, sx, sy + 1 / 16, '#ffd24a', a * 0.9);
      }
    }
  }

  if (statuses.has('afraid')) {
    // gota de suor escorrendo do lado da cabeça
    const u = phase(time, 1100, id, 0);
    const xx = cx + 0.28 * k;
    const yy = head + 0.12 + u * 0.3;
    const a = u < 0.7 ? 1 : (1 - u) / 0.3;
    dot(s, xx, yy - 1 / 16, '#c8f4ff', a);
    dot(s, xx, yy, '#7fd8ff', a);
    dot(s, xx - 1 / 16, yy, '#7fd8ff', a * 0.8);
    dot(s, xx, yy + 1 / 16, '#3a7ad8', a);
  }

  if (statuses.has('blind')) {
    // névoa cinzenta passando na altura dos olhos
    for (let i = 0; i < 7; i++) {
      const u = phase(time, 1600, id, i);
      const xx = cx + (u - 0.5) * 0.8 * k;
      const yy = head + 0.16 + Math.sin(u * 7 + i) * 0.04;
      dot(s, xx, yy, i % 2 ? '#9a90b0' : '#6a6080', 0.75 * Math.sin(u * Math.PI), 2);
    }
  }

  if (statuses.has('shielded')) shieldBubble(s, cx, y + 0.5, time, k, true);
}

/** Bolha do escudo: elipse de pixels com um brilho que gira; `front` desenha a metade da frente. */
function shieldBubble(s: Scene, cx: number, cy: number, time: number, k: number, front: boolean): void {
  const rx = 0.56 * k;
  const ry = 0.6 * k;
  const n = Math.ceil(Math.PI * 2 * rx * 16);
  const shine = (time / 700) % (Math.PI * 2);
  const pulse = 0.5 + 0.15 * Math.sin(time / 180);
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2;
    const isFront = Math.sin(ang) > -0.2;
    if (isFront !== front) continue;
    const d = Math.abs(((ang - shine + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    const bright = d > Math.PI - 0.5;
    dot(s, cx + Math.cos(ang) * rx, cy + Math.sin(ang) * ry, bright ? '#ffffff' : '#7ad0ff', (bright ? 0.95 : pulse * 0.6) * (front ? 1 : 0.6));
  }
  if (front) s.glow(cx, cy, rx * 1.4, '#7ad0ff', 0.1);
}

/** Quando o ator está com medo, o sprite treme (deslocamento em pixels). */
export function fearShake(time: number, id: number): number {
  const f = Math.floor(time / 70 + id);
  return f % 4 === 0 ? 1 : f % 4 === 2 ? -1 : 0;
}

/** Estados com aura desenhada (para o laboratório de efeitos). */
export const AURA_STATUSES = ['burning', 'poisoned', 'slowed', 'hasted', 'paralyzed', 'confused', 'afraid', 'blind', 'shielded'];
