import type { Animation } from '../engine/animations';
import type { Scene } from '../engine/scene';
import type { Point } from '../core/map';
import type { MeleeStyle } from '../core/events';
import { K } from '../gfx/keys';
import { hash01 } from '../gfx/color';

/**
 * Efeitos visuais de combate e magia. Cada função devolve uma Animation (t de 0 a 1) que desenha
 * na cena do quadro atual. Partículas são quadradinhos de 1–2 pixels de sprite: a cena alinha tudo
 * à grade de pixels, então os efeitos ficam no mesmo estilo das artes.
 *
 * Tudo é determinístico (hash da posição + semente): o mesmo efeito desenha igual a cada quadro.
 */

// ───────────────────────── cores por elemento/efeito ─────────────────────────

export interface ElementLook {
  /** Do mais claro (núcleo) ao mais escuro. */
  ramp: [string, string, string, string];
  glow: string;
}

const LOOKS: Record<string, ElementLook> = {
  fire: { ramp: ['#fff6c0', '#ffd24a', '#ff8a2a', '#d8401a'], glow: '#ff8a2a' },
  cold: { ramp: ['#ffffff', '#c8f4ff', '#7fd8ff', '#3a7ad8'], glow: '#7fd8ff' },
  lightning: { ramp: ['#ffffff', '#fff8c0', '#fff27a', '#9ac8ff'], glow: '#fff27a' },
  arcane: { ramp: ['#ffffff', '#f4d0ff', '#e08aff', '#8040d0'], glow: '#e08aff' },
  holy: { ramp: ['#ffffff', '#fff8d8', '#fff2b0', '#ffc840'], glow: '#fff2b0' },
  acid: { ramp: ['#f0ffd0', '#c4ff6a', '#7ae03a', '#3a8a2a'], glow: '#9cff5a' },
  poison: { ramp: ['#e0ffc8', '#9ae070', '#4aa83a', '#2a5a2a'], glow: '#7ad65a' },
  shadow: { ramp: ['#e8c8ff', '#a060e0', '#6030a0', '#2a1450'], glow: '#a060e0' },
  earth: { ramp: ['#f0d0a0', '#c89a60', '#92602c', '#5a3a1c'], glow: '#c09060' },
  physical: { ramp: ['#ffffff', '#ffeec8', '#d8c8a8', '#8a8070'], glow: '#ffe9c0' },
  sleep: { ramp: ['#ffffff', '#c8e4ff', '#7ab4ff', '#3a5ab0'], glow: '#7ab4ff' },
  slow: { ramp: ['#e0f0ff', '#9ac0ff', '#5a7ad8', '#2a3a80'], glow: '#5a8cff' },
  fear: { ramp: ['#f0d0ff', '#b070e0', '#6a2a9a', '#2a0e40'], glow: '#a060e0' },
  haste: { ramp: ['#ffffff', '#fff8c0', '#ffe04a', '#e0a020'], glow: '#ffe04a' },
  shield: { ramp: ['#ffffff', '#d0f0ff', '#7ad0ff', '#3a80c0'], glow: '#7ad0ff' },
  cure: { ramp: ['#ffffff', '#d8ffe0', '#6dff9a', '#2a9a4a'], glow: '#6dff9a' },
  teleport: { ramp: ['#ffffff', '#ffd0ff', '#e060ff', '#8030b0'], glow: '#e060ff' },
};
LOOKS.heal = LOOKS.cure;
LOOKS.blink = LOOKS.teleport;
LOOKS.detect = LOOKS.cure;
LOOKS.mapping = LOOKS.cold;
LOOKS.dig = LOOKS.earth;

export function look(el?: string): ElementLook {
  return LOOKS[el ?? ''] ?? LOOKS.arcane;
}

export const ELEMENT_IDS = Object.keys(LOOKS);

// ───────────────────────── utilitários ─────────────────────────

let seedCounter = 1;
/** Semente nova para cada efeito criado (para dois efeitos iguais não serem idênticos). */
export const nextSeed = (): number => (seedCounter = (seedCounter * 7 + 13) % 100003);

const rnd = (seed: number, i: number, k = 0): number => hash01(seed, i * 31 + k, 977);
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const easeOut = (t: number): number => 1 - (1 - t) * (1 - t);

/** Um "pixel" (ou bloco de `size` pixels) centrado em (x, y) do mundo. */
function px(s: Scene, x: number, y: number, size: number, color: string, a: number): void {
  if (a <= 0.02) return;
  const h = Math.floor(size / 2);
  s.prect(x, y, -h, -h, size, size, color, Math.min(1, a));
}

/** Pixels ao longo de um segmento (passo de 1 pixel de sprite). */
export function pxLine(s: Scene, x0: number, y0: number, x1: number, y1: number, size: number, color: string, a: number): void {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 16));
  for (let i = 0; i <= n; i++) px(s, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, size, color, a);
}

/** Anel de pixels (raio em tiles; `ry` achata para dar perspectiva). */
export function pxRing(s: Scene, cx: number, cy: number, r: number, size: number, color: string, a: number, ry = r): void {
  const n = Math.max(8, Math.ceil(Math.PI * 2 * Math.max(r, ry) * 16 * 0.9));
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2;
    px(s, cx + Math.cos(ang) * r, cy + Math.sin(ang) * ry, size, color, a);
  }
}

/** Disco de pixels com degradê do centro (cores[0]) para a borda (última cor). Raio em pixels de sprite. */
export function pxDisc(s: Scene, cx: number, cy: number, rpx: number, colors: string[], a: number, squash = 1): void {
  const r = Math.max(0.5, rpx);
  const ry = r * squash;
  for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
    for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
      const d = Math.hypot(dx / r, dy / ry);
      if (d > 1) continue;
      const c = colors[Math.min(colors.length - 1, Math.floor(d * colors.length))];
      s.prect(cx, cy, dx, dy, 1, 1, c, a);
    }
  }
}

/**
 * Cena "pixelada": linhas, anéis e elipses viram pixels alinhados à grade (o canvas desenharia traços
 * suaves e borrados, fora do estilo pixel art). Linhas com brilho ganham um halo de luz por baixo.
 */
function pixelScene(s: Scene): Scene {
  const p = Object.create(s) as Scene;
  p.line = (pts: number[], color: string, w = 2, a = 1, glow = false): void => {
    if (pts.length < 4) return;
    const size = w >= 2 ? 2 : 1;
    // Halo: um brilho a cada ~0,5 tile ao longo da linha inteira (somar brilhos demais estoura em branco).
    let carry = 0;
    for (let i = 2; i < pts.length; i += 2) {
      const [x0, y0, x1, y1] = [pts[i - 2], pts[i - 1], pts[i], pts[i + 1]];
      if (glow) {
        const len = Math.hypot(x1 - x0, y1 - y0);
        let d = i === 2 ? 0 : 0.5 - carry;
        for (; d <= len; d += 0.5) {
          const f = len > 0 ? d / len : 0;
          s.glow(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, 0.4 + w * 0.05, color, a * 0.2);
        }
        carry = (carry + len) % 0.5;
      }
      pxLine(s, x0, y0, x1, y1, size, color, a);
    }
  };
  p.ring = (cx: number, cy: number, r: number, color: string, lw = 1, a = 1): void => pxRing(s, cx, cy, r, lw >= 2 ? 2 : 1, color, a);
  p.ell = (cx: number, cy: number, rx: number, ry: number, color: string, a = 1): void => pxDisc(s, cx, cy, rx * 16, [color], a, ry / rx);
  return p;
}

/**
 * Crescente de pixels (corte de arma): arco de `a0` até `a1` em volta de (cx, cy), grosso no meio e
 * fino nas pontas, com a borda externa clara e a interna da cor do golpe. `ry` achata o arco.
 */
export function pxCrescent(
  s: Scene, cx: number, cy: number, r: number, a0: number, a1: number,
  thick: number, colors: [string, string, string], a: number, ry = 1,
): void {
  const steps = Math.max(6, Math.ceil(Math.abs(a1 - a0) * r * 16));
  const seen = new Set<string>();
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const ang = a0 + (a1 - a0) * u;
    // a ponta da frente (u = 1) é a mais grossa: o golpe "está ali"; a de trás afina
    const w = Math.max(1, Math.round(thick * Math.sin(Math.PI * (0.15 + u * 0.7)) * (0.45 + u * 0.55)));
    for (let k = 0; k < w; k++) {
      const rr = r - k / 16;
      const X = Math.round((cx + Math.cos(ang) * rr) * 16);
      const Y = Math.round((cy + Math.sin(ang) * rr * ry) * 16);
      const key = `${X},${Y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const c = k === 0 ? colors[0] : k < w - 1 || w <= 2 ? colors[1] : colors[2];
      s.prect(X / 16, Y / 16, 0, 0, 1, 1, c, a * (u < 0.25 ? 0.4 + u * 2.4 : 1));
    }
  }
}

const fx = (duration: number, draw: (s: Scene, t: number) => void): Animation => ({
  duration,
  draw: (term, t) => {
    const s = term.scene;
    if (s) draw(pixelScene(s), clamp01(t));
  },
});

const center = (p: Point): [number, number] => [p.x + 0.5, p.y + 0.5];

/** Pontos (centros de tile) por onde algo voa, começando no atirador quando se sabe onde ele está. */
export function flightPoints(path: Point[], from?: Point): [number, number][] {
  const pts = path.map(center);
  if (from) pts.unshift(center(from));
  return pts;
}

/** Posição e direção a uma fração `u` do caminho. */
export function along(pts: [number, number][], u: number): { x: number; y: number; ang: number } {
  if (pts.length === 1) return { x: pts[0][0], y: pts[0][1], ang: 0 };
  const total = pts.length - 1;
  const k = Math.min(total - 1, Math.max(0, Math.floor(u * total)));
  const f = clamp01(u * total - k);
  const [x0, y0] = pts[k];
  const [x1, y1] = pts[k + 1];
  return { x: x0 + (x1 - x0) * f, y: y0 + (y1 - y0) * f, ang: Math.atan2(y1 - y0, x1 - x0) };
}

// ───────────────────────── conjuração ─────────────────────────

export const CAST_MS = 240;

/** Círculo de runas no chão sob o conjurador, girando, com faíscas subindo; o brilho cresce até o disparo. */
export function castCircle(x: number, y: number, el?: string): Animation {
  const L = look(el);
  const seed = nextSeed();
  return fx(CAST_MS, (s, t) => {
    const cx = x + 0.5;
    const cy = y + 0.86;
    const grow = easeOut(clamp01(t * 1.6));
    const fade = t < 0.8 ? 1 : (1 - t) / 0.2;
    s.glow(cx, cy - 0.35, 0.7 + grow * 0.6, L.glow, 0.35 * fade + 0.25 * t);
    // anel externo de runas (pontos girando) e anel interno no sentido contrário
    for (const [r, n, dir, c] of [[0.56, 14, 1, L.ramp[2]], [0.34, 8, -1, L.ramp[1]]] as const) {
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + dir * t * 3.2;
        const rr = r * grow;
        const bright = (i + Math.floor(t * 12)) % 3 === 0;
        px(s, cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr * 0.36, 1, bright ? L.ramp[0] : c, fade * (bright ? 1 : 0.8));
      }
    }
    // faíscas subindo do círculo
    for (let i = 0; i < 8; i++) {
      const life = clamp01(t * 1.4 - rnd(seed, i) * 0.5);
      if (life <= 0 || life >= 1) continue;
      const ang = rnd(seed, i, 1) * Math.PI * 2;
      const sx = cx + Math.cos(ang) * 0.5 * grow;
      const sy = cy + Math.sin(ang) * 0.18 * grow - life * 0.9;
      px(s, sx, sy, life < 0.5 ? 2 : 1, life < 0.4 ? L.ramp[0] : L.ramp[1], 1 - life);
    }
    // clarão nas mãos no fim
    if (t > 0.65) s.glow(x + 0.5, y + 0.45, 0.5, '#ffffff', (t - 0.65) * 2);
  });
}

// ───────────────────────── projéteis mágicos ─────────────────────────

export const SPELL_STEP_MS = 30;
export const spellFlightMs = (path: Point[], from?: Point): number => Math.max(150, Math.max(1, path.length + (from ? 1 : 0) - 1) * SPELL_STEP_MS);

/** Projétil de magia com a cara do elemento: bola de fogo, estilhaço de gelo, orbe arcano... */
export function magicMissile(path: Point[], from: Point | undefined, el?: string): Animation {
  const pts = flightPoints(path, from);
  const L = look(el);
  const seed = nextSeed();
  return fx(spellFlightMs(path, from), (s, t) => {
    if (!pts.length) return;
    const head = along(pts, t);
    const len = Math.max(1, pts.length - 1);
    const du = 0.6 / len; // ~0,6 tile por passo do rastro
    // Rastro de partículas atrás da cabeça.
    for (let k = 1; k <= 12; k++) {
      const u = t - k * du * 0.5;
      if (u < 0) break;
      const q = along(pts, u);
      const age = k / 12;
      const jx = (rnd(seed, k, Math.floor(t * 20)) - 0.5) * 0.25 * age;
      let jy = (rnd(seed, k + 50, Math.floor(t * 20)) - 0.5) * 0.25 * age;
      if (el === 'fire') jy -= age * 0.25; // chamas sobem
      if (el === 'poison' || el === 'acid') jy += age * 0.3; // gotas caem
      const c = age < 0.3 ? L.ramp[1] : age < 0.65 ? L.ramp[2] : L.ramp[3];
      px(s, q.x + jx, q.y + jy, age < 0.4 ? 2 : 1, c, 1 - age);
    }
    s.glow(head.x, head.y, 0.9, L.glow, 0.7);
    switch (el) {
      case 'cold': {
        // Estilhaço de gelo apontando para a frente.
        const dx = Math.cos(head.ang) * 0.3;
        const dy = Math.sin(head.ang) * 0.3;
        s.line([head.x - dx, head.y - dy, head.x + dx, head.y + dy], L.ramp[2], 3, 1);
        s.line([head.x - dx * 0.6, head.y - dy * 0.6, head.x + dx, head.y + dy], L.ramp[0], 1, 1);
        break;
      }
      case 'arcane':
      case 'shadow': {
        pxDisc(s, head.x, head.y, 2.6 + (Math.floor(t * 20) % 2) * 0.5, [L.ramp[0], L.ramp[1], L.ramp[2], L.ramp[3]], 1);
        // brilhos que ficam para trás
        for (let k = 0; k < 3; k++) {
          const u = t - (k + 1) * du * 1.1;
          if (u < 0) break;
          const q = along(pts, u);
          s.spr(K.fx('spark'), q.x - 0.5 + (rnd(seed, k, 9) - 0.5) * 0.3, q.y - 0.5 + (rnd(seed, k, 8) - 0.5) * 0.3, { f: (Math.floor(t * 18) + k) % 5, a: 0.8 - k * 0.2 });
        }
        break;
      }
      case 'holy': {
        pxDisc(s, head.x, head.y, 2.6, [L.ramp[0], L.ramp[1], L.ramp[2]], 1);
        for (let r = 0; r < 4; r++) {
          const a = (r / 4) * Math.PI * 2 + t * 6;
          s.line([head.x, head.y, head.x + Math.cos(a) * 0.32, head.y + Math.sin(a) * 0.32], L.ramp[0], 1, 0.8);
        }
        break;
      }
      case 'fire': {
        // gota de chama: bola na frente, cauda afinando para trás (oposta ao voo)
        const bx = -Math.cos(head.ang);
        const by = -Math.sin(head.ang);
        for (let k = 0; k < 5; k++) {
          const r = 3.2 - k * 0.6 + (Math.floor(t * 24 + k) % 2) * 0.4;
          pxDisc(s, head.x + (bx * k * 1.6) / 16, head.y + (by * k * 1.6) / 16 - (k * 0.6) / 16, r, k < 2 ? [L.ramp[0], L.ramp[1], L.ramp[2], L.ramp[3]] : [L.ramp[2], L.ramp[3]], 1);
        }
        break;
      }
      default: {
        // ácido, veneno, raio...: orbe pulsando com núcleo claro
        const pulse = Math.floor(t * 24) % 2;
        pxDisc(s, head.x, head.y, 2.8 + pulse * 0.5, [L.ramp[0], L.ramp[1], L.ramp[2], L.ramp[3]], 1);
      }
    }
    s.glow(head.x, head.y, 0.35, '#ffffff', 0.6);
  });
}

// ───────────────────────── raios (atravessam) ─────────────────────────

export const BEAM_MS = 340;

/** Raio contínuo: relâmpago com ramificações, jato de fogo, feixe gelado ou poeira de escavação. */
export function beam(path: Point[], from: Point | undefined, el?: string): Animation {
  const pts = flightPoints(path, from);
  const L = look(el);
  const seed = nextSeed();
  return fx(BEAM_MS, (s, t) => {
    if (pts.length < 2) return;
    const grow = clamp01(t * 3.5);
    const fade = t < 0.55 ? 1 : Math.max(0, 1 - (t - 0.55) / 0.45);
    const end = along(pts, grow);
    const frame = Math.floor(t * 16);
    if (el === 'earth') {
      // Escavação: poeira e pedrinhas ao longo do túnel.
      for (let i = 0; i < 40; i++) {
        const u = rnd(seed, i) * grow;
        const q = along(pts, u);
        const life = clamp01((t - u * 0.3) * 1.6);
        const ox = (rnd(seed, i, 1) - 0.5) * 0.7 * life;
        const oy = (rnd(seed, i, 2) - 0.5) * 0.7 * life + life * life * 0.3;
        px(s, q.x + ox, q.y + oy, rnd(seed, i, 3) < 0.3 ? 2 : 1, L.ramp[Math.floor(rnd(seed, i, 4) * 4)], 1 - life);
      }
      return;
    }
    const flat: number[] = [];
    const n = Math.max(2, Math.ceil((pts.length - 1) * grow) + 1);
    const jag = el === 'lightning' ? 0.32 : el === 'fire' ? 0.12 : 0.06;
    for (let i = 0; i < n && i < pts.length; i++) {
      let [x, y] = pts[i];
      if (i > 0 && i < pts.length - 1) {
        x += (rnd(seed, i, frame) - 0.5) * jag;
        y += (rnd(seed, i, frame + 99) - 0.5) * jag;
      }
      flat.push(x, y);
    }
    if (grow < 1) flat.push(end.x, end.y);
    const width = el === 'fire' ? 5 : el === 'lightning' ? 3 : 4;
    s.line(flat, L.ramp[2], width, fade, true);
    s.line(flat, L.ramp[0], 1, fade, false);
    if (el === 'lightning') {
      // ramificações que piscam
      for (let b = 0; b < 3; b++) {
        if (rnd(seed, b, frame) < 0.35) continue;
        const u = 0.2 + rnd(seed, b, 5) * 0.6 * grow;
        const q = along(pts, u);
        const ang = q.ang + (rnd(seed, b, frame + 7) < 0.5 ? 1 : -1) * (0.6 + rnd(seed, b, 8) * 0.6);
        const l = 0.4 + rnd(seed, b, frame + 3) * 0.5;
        const mx = q.x + Math.cos(ang) * l * 0.5 + (rnd(seed, b, frame + 11) - 0.5) * 0.2;
        const my = q.y + Math.sin(ang) * l * 0.5 + (rnd(seed, b, frame + 13) - 0.5) * 0.2;
        s.line([q.x, q.y, mx, my, q.x + Math.cos(ang) * l, q.y + Math.sin(ang) * l], L.ramp[1], 1, fade * 0.9, true);
      }
    }
    // partículas soltas ao longo do raio (brasas, cristais, faíscas)
    for (let i = 0; i < 26; i++) {
      const u = rnd(seed, i) * grow;
      const q = along(pts, u);
      const life = clamp01((t - u * 0.25) * 1.8);
      if (life <= 0 || life >= 1) continue;
      const ox = (rnd(seed, i, 1) - 0.5) * 0.5;
      const oy = (rnd(seed, i, 2) - 0.5) * 0.5 - (el === 'fire' ? life * 0.4 : 0);
      px(s, q.x + ox, q.y + oy, 1, L.ramp[i % 3], 1 - life);
    }
    // faíscas na ponta
    if (grow < 1 || t < 0.6) s.glow(end.x, end.y, 0.8, L.glow, 0.8 * fade);
  });
}

// ───────────────────────── explosões ─────────────────────────

export const explosionMs = (radius: number): number => 220 + radius * 110;

/** Explosão: clarão, onda de choque e partículas do elemento voando para fora (fogo vira fumaça). */
export function explosion(x: number, y: number, radius: number, el?: string): Animation {
  const L = look(el);
  const seed = nextSeed();
  const cx = x + 0.5;
  const cy = y + 0.5;
  const n = 18 + radius * 12;
  return fx(explosionMs(radius), (s, t) => {
    const r = 0.3 + easeOut(t) * (radius + 0.5);
    // clarão central
    if (t < 0.35) s.glow(cx, cy, 0.6 + r, '#ffffff', 0.8 * (1 - t / 0.35));
    s.glow(cx, cy, r * 1.3, L.glow, 0.8 * (1 - t));
    // onda de choque (anel de pixels)
    const ringN = Math.round(10 + r * 14);
    for (let i = 0; i < ringN; i++) {
      const a = (i / ringN) * Math.PI * 2;
      px(s, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9, 1, i % 2 ? L.ramp[1] : L.ramp[2], 1 - t);
    }
    // brilho em cada tile alcançado (o fogo "lambe" o chão)
    const rr = Math.round(easeOut(t) * radius);
    for (let ty = y - rr; ty <= y + rr; ty++) {
      for (let tx = x - rr; tx <= x + rr; tx++) {
        if (Math.max(Math.abs(tx - x), Math.abs(ty - y)) > rr) continue;
        s.glow(tx + 0.5, ty + 0.6, 0.6, L.glow, 0.35 * (1 - t) * (0.6 + rnd(seed, tx, ty) * 0.4));
      }
    }
    // partículas
    for (let i = 0; i < n; i++) {
      const a = rnd(seed, i) * Math.PI * 2;
      const sp = (0.4 + rnd(seed, i, 1) * 0.8) * (radius + 0.6);
      const d = easeOut(t) * sp;
      let px0 = cx + Math.cos(a) * d;
      let py0 = cy + Math.sin(a) * d * 0.9;
      const life = clamp01(t * (0.9 + rnd(seed, i, 2) * 0.4));
      if (el === 'fire') py0 -= life * life * 0.5; // a fumaça sobe
      if (el === 'poison' || el === 'acid') py0 += life * life * 0.25;
      if (el === 'cold' || el === 'holy') {
        // estilhaços/raios: risquinhos na direção do voo
        const l = 0.12 + (1 - life) * 0.12;
        s.line([px0, py0, px0 - Math.cos(a) * l, py0 - Math.sin(a) * l], life < 0.5 ? L.ramp[0] : L.ramp[2], 1, 1 - life);
        continue;
      }
      let c = life < 0.25 ? L.ramp[0] : life < 0.5 ? L.ramp[1] : life < 0.75 ? L.ramp[2] : L.ramp[3];
      if (el === 'fire' && life > 0.7) c = '#5a4a48'; // vira fumaça
      px0 += 0;
      px(s, px0, py0, life < 0.4 ? 2 : 1, c, life > 0.7 ? (1 - life) / 0.3 : 1);
    }
    if (el === 'holy') {
      // raios de luz girando
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + t * 1.5;
        s.line([cx, cy, cx + Math.cos(a) * r * 1.1, cy + Math.sin(a) * r], L.ramp[1], 1, 0.7 * (1 - t), true);
      }
    }
  });
}

// ───────────────────────── impactos de magia ─────────────────────────

export const SPELL_HIT_MS = 520;

/** Magia atingindo um alvo: o efeito depende do elemento (dano) ou do efeito (sono, medo...). */
export function spellHit(x: number, y: number, effect: string, element?: string): Animation {
  const kind = effect === 'damage' ? element ?? 'arcane' : effect;
  const L = look(kind);
  const seed = nextSeed();
  const cx = x + 0.5;
  const cy = y + 0.55;
  return fx(SPELL_HIT_MS, (s, t) => {
    const fade = 1 - t;
    switch (kind) {
      case 'fire': {
        s.glow(cx, cy, 1.1, L.glow, 0.6 * fade);
        // labaredas subindo do corpo
        for (let i = 0; i < 16; i++) {
          const b = rnd(seed, i) * 0.5;
          const life = clamp01((t - b) / 0.5);
          if (life <= 0 || life >= 1) continue;
          const sx = x + 0.2 + rnd(seed, i, 1) * 0.6 + Math.sin((t + i) * 12) * 0.04;
          const sy = y + 0.9 - life * 0.9;
          px(s, sx, sy, life < 0.5 ? 2 : 1, life < 0.3 ? L.ramp[0] : life < 0.6 ? L.ramp[1] : L.ramp[2], 1 - life);
        }
        break;
      }
      case 'cold': {
        s.glow(cx, cy, 1, L.glow, 0.5 * fade);
        // cristais se espalhando e um anel de geada
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + rnd(seed, i) * 0.4;
          const d = 0.15 + easeOut(t) * 0.55;
          const l = 0.16 * fade;
          s.line([cx + Math.cos(a) * d, cy + Math.sin(a) * d, cx + Math.cos(a) * (d + l), cy + Math.sin(a) * (d + l)], i % 2 ? L.ramp[0] : L.ramp[2], 1, fade);
        }
        if (t < 0.6) s.ring(cx, cy + 0.3, 0.2 + t * 0.6, L.ramp[1], 1, (0.6 - t) * 1.5);
        break;
      }
      case 'lightning': {
        // choques zigue-zague em volta do alvo, piscando
        const frame = Math.floor(t * 18);
        if (frame % 3 !== 2) s.glow(cx, cy, 1.2, L.glow, 0.7 * fade);
        for (let b = 0; b < 4; b++) {
          if (rnd(seed, b, frame) < 0.3) continue;
          const a = rnd(seed, b, frame + 1) * Math.PI * 2;
          const pts: number[] = [cx, cy];
          let qx = cx;
          let qy = cy;
          for (let k = 1; k <= 3; k++) {
            qx += Math.cos(a) * 0.18 + (rnd(seed, b * 9 + k, frame) - 0.5) * 0.22;
            qy += Math.sin(a) * 0.18 + (rnd(seed, b * 9 + k, frame + 5) - 0.5) * 0.22;
            pts.push(qx, qy);
          }
          s.line(pts, L.ramp[0], 1, fade, true);
        }
        break;
      }
      case 'holy': {
        // coluna de luz descendo + cruz brilhante
        const h = 1.6 * fade;
        s.glow(cx, cy - 0.3, 1.2, L.glow, 0.6 * fade);
        s.line([cx, cy - 0.3 - h, cx, cy + 0.4], L.ramp[1], 4, fade * 0.7, true);
        s.line([cx, cy - 0.3 - h, cx, cy + 0.4], L.ramp[0], 1, fade, false);
        s.line([cx - 0.25, cy - 0.15, cx + 0.25, cy - 0.15], L.ramp[0], 1, fade * (t < 0.6 ? 1 : 0.5), false);
        break;
      }
      case 'acid':
      case 'poison': {
        s.glow(cx, cy, 0.9, L.glow, 0.45 * fade);
        // bolhas subindo e gotas pingando
        for (let i = 0; i < 12; i++) {
          const b = rnd(seed, i) * 0.4;
          const life = clamp01((t - b) / 0.6);
          if (life <= 0 || life >= 1) continue;
          const up = i % 3 !== 0;
          const sx = x + 0.15 + rnd(seed, i, 1) * 0.7;
          const sy = up ? y + 0.8 - life * 0.8 : y + 0.4 + life * life * 0.6;
          px(s, sx, sy, up && life < 0.6 ? 2 : 1, up ? L.ramp[1] : L.ramp[2], 1 - life);
        }
        break;
      }
      case 'shadow':
      case 'fear': {
        // fiapos escuros girando em volta e se fechando
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2 + t * 5;
          const d = 0.75 * (1 - easeOut(t)) + 0.12;
          px(s, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, i % 3 ? 1 : 2, i % 2 ? L.ramp[2] : L.ramp[3], fade);
        }
        s.glow(cx, cy, 0.9, L.glow, 0.35 * fade);
        if (kind === 'fear') s.text(cx, cy - 0.75 - t * 0.3, '!', L.ramp[1], 1.3, fade);
        break;
      }
      case 'sleep': {
        // três "z" subindo em zigue-zague
        for (let i = 0; i < 3; i++) {
          const life = clamp01((t - i * 0.18) / 0.6);
          if (life <= 0 || life >= 1) continue;
          s.text(cx + 0.15 + Math.sin(life * 6 + i) * 0.15, cy - 0.3 - life * 0.8, 'z', L.ramp[1], 0.8 + i * 0.15, 1 - life);
        }
        s.glow(cx, cy, 0.8, L.glow, 0.3 * fade);
        break;
      }
      case 'slow': {
        // anéis que se fecham devagar (o tempo pesa)
        for (let k = 0; k < 3; k++) {
          const u = clamp01(t * 1.3 - k * 0.2);
          if (u <= 0 || u >= 1) continue;
          s.ring(cx, cy + 0.25, 0.75 * (1 - u) + 0.12, L.ramp[2], 1, 1 - u);
        }
        s.glow(cx, cy, 0.8, L.glow, 0.3 * fade);
        break;
      }
      case 'haste': {
        // riscos de velocidade passando
        for (let i = 0; i < 6; i++) {
          const oy = (i / 6 - 0.5) * 0.8;
          const off = ((t * 3 + rnd(seed, i)) % 1) * 1.4 - 0.7;
          s.line([cx + off - 0.25, cy + oy, cx + off + 0.25, cy + oy], L.ramp[i % 2 ? 1 : 2], 1, fade);
        }
        break;
      }
      case 'shield': {
        // bolha se formando em volta do alvo
        const r = 0.3 + easeOut(clamp01(t * 2)) * 0.35;
        s.ring(cx, cy, r, L.ramp[1], 1, fade);
        s.glow(cx, cy, r * 1.6, L.glow, 0.35 * fade);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + t * 2;
          px(s, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1, L.ramp[0], fade);
        }
        break;
      }
      case 'cure':
      default: {
        // brilhos subindo
        s.glow(cx, cy, 1, L.glow, 0.45 * fade);
        for (let i = 0; i < 10; i++) {
          const b = rnd(seed, i) * 0.4;
          const life = clamp01((t - b) / 0.6);
          if (life <= 0 || life >= 1) continue;
          const sx = x + 0.15 + rnd(seed, i, 1) * 0.7;
          px(s, sx, y + 0.85 - life * 1.1, life < 0.5 ? 2 : 1, i % 2 ? L.ramp[0] : L.ramp[2], 1 - life);
        }
      }
    }
  });
}

// ───────────────────────── corpo a corpo ─────────────────────────

export const MELEE_MS = 170;

/**
 * Traço do golpe no alvo: arco de corte, estocada, pancada com poeira, três garras ou mordida.
 * (O avanço do atacante é desenhado pelo mapa, a partir do estado visual.)
 */
export function meleeSwing(x: number, y: number, tx: number, ty: number, style: MeleeStyle, element?: string, heavy = false): Animation {
  const seed = nextSeed();
  const ang = Math.atan2(ty - y, tx - x);
  const cx = tx + 0.5;
  const cy = ty + 0.5;
  const tint = element ? look(element) : null;
  const white = tint ? tint.ramp[0] : '#ffffff';
  const edge = tint ? tint.ramp[2] : '#d8e0f0';
  return fx(heavy ? MELEE_MS + 60 : MELEE_MS, (s, t) => {
    const fade = t < 0.6 ? 1 : (1 - t) / 0.4;
    switch (style) {
      case 'slash': {
        // arco que cruza o alvo (convexo para o lado de lá), varrido de cima para baixo, com rastro
        const span = heavy ? 2.3 : 1.8;
        const sweep = Math.cos(ang) >= 0 ? 1 : -1; // sempre de cima para baixo
        const a0 = ang - (sweep * span) / 2;
        const head = clamp01(t * 2.2);
        const tail = clamp01(t * 2.2 - 0.6);
        const r = heavy ? 0.72 : 0.6;
        const ox = cx - Math.cos(ang) * 0.42;
        const oy = cy - Math.sin(ang) * 0.42;
        const spanS = span * sweep;
        if (head > tail) {
          const mid = a0 + spanS * (head + tail) / 2;
          s.glow(ox + Math.cos(mid) * r * 0.8, oy + Math.sin(mid) * r * 0.8, 0.55, edge, 0.35 * fade);
          pxCrescent(s, ox, oy, r, a0 + spanS * tail, a0 + spanS * head, heavy ? 5 : 4, [white, edge, tint ? tint.ramp[3] : '#8a94b0'], fade);
        }
        break;
      }
      case 'pierce': {
        // estocada: risco curto que avança para dentro do alvo
        const u = easeOut(clamp01(t * 2.4));
        const sx = cx - Math.cos(ang) * 0.7;
        const sy = cy - Math.sin(ang) * 0.7;
        const ex = sx + Math.cos(ang) * (0.3 + u * 0.75);
        const ey = sy + Math.sin(ang) * (0.3 + u * 0.75);
        s.line([sx + Math.cos(ang) * u * 0.5, sy + Math.sin(ang) * u * 0.5, ex, ey], edge, 2, fade, true);
        s.line([ex - Math.cos(ang) * 0.15, ey - Math.sin(ang) * 0.15, ex, ey], white, 1, fade, false);
        break;
      }
      case 'blunt':
      case 'fist': {
        // pancada: anel de impacto e poeira saltando
        if (t > 0.3) {
          const u = (t - 0.3) / 0.7;
          s.ring(cx, cy + 0.15, 0.15 + u * (heavy ? 0.7 : 0.45), edge, 1, 1 - u);
          for (let i = 0; i < (heavy ? 10 : 6); i++) {
            const a = Math.PI + rnd(seed, i) * Math.PI; // para cima
            const d = u * (0.3 + rnd(seed, i, 1) * 0.4);
            px(s, cx + Math.cos(a) * d, cy + 0.35 + Math.sin(a) * d * 0.8 + u * u * 0.3, 1, '#b8a890', 1 - u);
          }
        }
        if (t < 0.45) s.glow(cx, cy, 0.6, '#ffffff', (0.45 - t) * 1.6);
        break;
      }
      case 'claw': {
        // três riscos paralelos em diagonal, um depois do outro
        for (let k = 0; k < 3; k++) {
          const u = clamp01(t * 2.6 - k * 0.25);
          if (u <= 0) continue;
          const off = (k - 1) * 0.25;
          const x0 = cx - 0.3 + off;
          const y0 = cy - 0.42;
          const x1 = x0 + 0.42 * u;
          const y1 = y0 + 0.78 * u;
          if (k === 1) s.glow((x0 + x1) / 2, (y0 + y1) / 2, 0.5, tint ? tint.glow : '#ff6a5a', 0.3 * fade);
          pxLine(s, x0 + 1 / 16, y0, x1 + 1 / 16, y1, 1, tint ? tint.ramp[3] : '#c02a2a', fade * 0.55);
          pxLine(s, x0, y0, x1, y1, 1, white, fade);
        }
        break;
      }
      case 'bite': {
        // duas mandíbulas se fechando
        const close = easeOut(clamp01(t * 2.2));
        const gap = 0.45 * (1 - close) + 0.06;
        for (const dir of [-1, 1]) {
          const yy = cy + dir * gap;
          const pts: number[] = [];
          for (let i = 0; i <= 6; i++) {
            const u = i / 6;
            pts.push(cx - 0.32 + u * 0.64, yy - dir * Math.sin(u * Math.PI) * 0.12);
          }
          s.line(pts, white, 1, fade, false);
          // dentes
          for (let i = 1; i < 6; i += 2) px(s, cx - 0.32 + (i / 6) * 0.64, yy - dir * 0.05, 1, white, fade);
        }
        break;
      }
      default: {
        // toque mágico/elemental: pulso da cor do elemento
        const L = tint ?? look('physical');
        s.glow(cx, cy, 0.4 + t * 0.6, L.glow, 0.7 * (1 - t));
        s.ring(cx, cy, 0.15 + t * 0.4, L.ramp[1], 1, 1 - t);
      }
    }
  });
}

// ───────────────────────── sopro de dragão ─────────────────────────

export const BREATH_MS = 560;

/** Jato em cone saindo da boca do dragão: dezenas de partículas que se abrem e esfriam. */
export function breath(path: Point[], from: Point, el: string): Animation {
  const L = look(el);
  const seed = nextSeed();
  const pts = flightPoints(path, from);
  const end = pts[pts.length - 1];
  const sx = from.x + 0.5;
  const sy = from.y + 0.4;
  const dx = end[0] - sx;
  const dy = end[1] - sy;
  const len = Math.max(0.5, Math.hypot(dx, dy));
  const ux = dx / len;
  const uy = dy / len;
  const n = 70;
  return fx(BREATH_MS, (s, t) => {
    s.glow(sx, sy, 0.8, L.glow, 0.8 * (1 - t));
    for (let i = 0; i < n; i++) {
      const birth = (i / n) * 0.55;
      const life = clamp01((t - birth) / 0.45);
      if (life <= 0 || life >= 1) continue;
      const d = life * len;
      const spread = (rnd(seed, i) - 0.5) * 0.9 * life * (0.4 + d * 0.25);
      const x = sx + ux * d - uy * spread;
      const y = sy + uy * d + ux * spread - (el === 'fire' ? life * life * 0.3 : 0);
      const c = life < 0.2 ? L.ramp[0] : life < 0.45 ? L.ramp[1] : life < 0.75 ? L.ramp[2] : L.ramp[3];
      px(s, x, y, life < 0.6 ? 2 : 1, c, life > 0.8 ? (1 - life) / 0.2 : 1);
    }
    // calor na ponta do jato
    const reach = clamp01(t / 0.6) * len;
    s.glow(sx + ux * reach, sy + uy * reach, 1.2, L.glow, 0.45 * (1 - t * 0.6));
    if (el === 'lightning' && Math.floor(t * 16) % 2 === 0) s.line([sx, sy, sx + ux * reach, sy + uy * reach], L.ramp[0], 1, 0.9, true);
  });
}

// ───────────────────────── teleporte, estilhaço, giro, fumaça ─────────────────────────

export const TELEPORT_MS = 460;

/** Coluna de brilhos que some no ponto de partida e reaparece no de chegada. */
export function teleport(x: number, y: number, tx: number, ty: number): Animation {
  const L = look('teleport');
  const seed = nextSeed();
  return fx(TELEPORT_MS, (s, t) => {
    const out = clamp01(t * 1.8);
    const inn = clamp01(t * 1.8 - 0.8);
    for (const [ex, ey, u, rising] of [[x, y, out, true], [tx, ty, inn, false]] as const) {
      if (u <= 0 || u >= 1) continue;
      const cx = ex + 0.5;
      s.glow(cx, ey + 0.5, 0.9, L.glow, 0.6 * (1 - u));
      s.line([cx, ey + 0.95, cx, ey - 0.4], L.ramp[1], 2, (1 - u) * 0.6, true);
      for (let i = 0; i < 12; i++) {
        const ph = (rnd(seed, i) + u) % 1;
        const yy = rising ? ey + 0.9 - ph * 1.3 : ey - 0.4 + ph * 1.3;
        const xx = cx + Math.sin(ph * 8 + i) * 0.3;
        px(s, xx, yy, i % 3 ? 1 : 2, i % 2 ? L.ramp[0] : L.ramp[2], (1 - u) * (1 - Math.abs(ph - 0.5)));
      }
    }
  });
}

export const SHATTER_MS = 420;

/** Frasco que se espatifa: cacos de vidro e gotas do líquido caindo. */
export function shatter(x: number, y: number, color: string): Animation {
  const seed = nextSeed();
  const cx = x + 0.5;
  const cy = y + 0.5;
  return fx(SHATTER_MS, (s, t) => {
    for (let i = 0; i < 16; i++) {
      const a = rnd(seed, i) * Math.PI * 2;
      const v = 0.3 + rnd(seed, i, 1) * 0.5;
      const glass = i < 6;
      const xx = cx + Math.cos(a) * v * t;
      const yy = cy + Math.sin(a) * v * t * 0.7 + t * t * (glass ? 0.4 : 0.6);
      px(s, xx, yy, glass ? 1 : 2, glass ? '#e8f4ff' : color, 1 - t);
    }
    if (t < 0.5) s.glow(cx, cy, 0.7, color, 0.6 * (1 - t * 2));
  });
}

export const WHIRL_MS = 300;

/** Ataque giratório: um arco que dá a volta completa em torno do herói. */
export function whirl(x: number, y: number): Animation {
  return fx(WHIRL_MS, (s, t) => {
    const cx = x + 0.5;
    const cy = y + 0.55;
    const head = t * Math.PI * 2.2;
    const tail = Math.max(0, head - 2.4);
    const a = 1 - t * 0.6;
    const mid = (head + tail) / 2;
    s.glow(cx + Math.cos(mid) * 0.8, cy + Math.sin(mid) * 0.65, 0.7, '#d8e0f0', 0.3 * a);
    pxCrescent(s, cx, cy, 0.95, tail, head, 5, ['#ffffff', '#d8e0f0', '#8a94b0'], a, 0.82);
    // poeira levantada pelo giro
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2;
      if (ang > head) continue;
      const life = clamp01((head - ang) / 2.5);
      px(s, cx + Math.cos(ang) * (1 + life * 0.3), cy + 0.35 + Math.sin(ang) * 0.5 - life * 0.2, 1, '#b8a890', (1 - life) * a);
    }
  });
}

export const SMOKE_MS = 600;

/** Nuvem de fumaça (Desaparecer): bolhas cinzentas que crescem e somem. */
export function smoke(x: number, y: number): Animation {
  const seed = nextSeed();
  return fx(SMOKE_MS, (s, t) => {
    for (let i = 0; i < 9; i++) {
      const a = rnd(seed, i) * Math.PI * 2;
      const d = easeOut(t) * (0.3 + rnd(seed, i, 1) * 0.5);
      const r = 0.18 + easeOut(t) * 0.3;
      s.ell(x + 0.5 + Math.cos(a) * d, y + 0.6 + Math.sin(a) * d * 0.7 - t * 0.3, r, r * 0.8, i % 2 ? '#3a3448' : '#5a5468', 0.55 * (1 - t));
    }
  });
}
