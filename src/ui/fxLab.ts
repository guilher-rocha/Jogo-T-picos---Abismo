import type { Screen } from '../engine/screens';
import type { Terminal } from '../engine/terminal';
import type { Animation } from '../engine/animations';
import type { KeyInput } from '../data/keymap';
import type { Point } from '../core/map';
import type { Scene } from '../engine/scene';
import { K } from '../gfx/keys';
import { VARIANTS, variantAt } from '../gfx/autotile';
import { poster, showPoster } from './stage';
import { SCREEN_COLS, SCREEN_ROWS } from './layout';
import type { App } from './app';
import {
  beam, breath, castCircle, explosion, magicMissile, meleeSwing, shatter, smoke, spellHit, teleport, whirl,
} from './vfx';
import { drawAuraBack, drawAuraFront, fearShake } from './auras';
import { AIR, airMote, fountainDrops, lavaBubbles, risingMotes, torchEmbers, waterGlints } from './ambient';
import { STYLES } from '../gfx/terrain';
import { wade } from './mapView';

/**
 * Laboratório de efeitos (ferramenta de desenvolvimento): `?fxlab=1&page=0&t=0.4`.
 * Mostra vários efeitos lado a lado, cada um numa "baia" com um herói e um goblin.
 * Com `t`, todos ficam congelados naquele instante (0–1) — ótimo para screenshots de revisão;
 * sem `t`, ficam em loop. ←/→ trocam de página.
 */

interface Slot {
  name: string;
  /** Monta o efeito numa baia: o herói fica em `a`, o alvo em `b` (mesma linha, 3 casas à direita). */
  make?: (a: Point, b: Point) => Animation;
  /** Efeito contínuo (auras, ambiente): desenhado a cada quadro com o relógio. `o` = canto da baia. */
  live?: (s: Scene, o: Point, time: number) => void;
  /** Sem herói nem alvo (baias de ambiente). */
  empty?: boolean;
  /** Herói colado no alvo (golpes corpo a corpo). */
  adjacent?: boolean;
  /** Sem alvo na baia. */
  noTarget?: boolean;
}

const line = (a: Point, b: Point): Point[] => {
  const out: Point[] = [];
  for (let x = a.x + 1; x <= b.x; x++) out.push({ x, y: a.y });
  return out;
};

const SLOTS: Slot[] = [
  { name: 'conjurar', make: (a) => castCircle(a.x, a.y, 'arcane'), noTarget: true },
  { name: 'míssil arcano', make: (a, b) => magicMissile(line(a, b), a, 'arcane') },
  { name: 'fogo', make: (a, b) => magicMissile(line(a, b), a, 'fire') },
  { name: 'gelo', make: (a, b) => magicMissile(line(a, b), a, 'cold') },
  { name: 'ácido', make: (a, b) => magicMissile(line(a, b), a, 'acid') },
  { name: 'sagrado', make: (a, b) => magicMissile(line(a, b), a, 'holy') },
  { name: 'relâmpago', make: (a, b) => beam(line(a, b), a, 'lightning') },
  { name: 'jato de fogo', make: (a, b) => beam(line(a, b), a, 'fire') },
  { name: 'escavar', make: (a, b) => beam(line(a, b), a, 'earth'), noTarget: true },
  { name: 'bola de fogo', make: (_a, b) => explosion(b.x, b.y, 1, 'fire') },
  { name: 'nova de gelo', make: (_a, b) => explosion(b.x, b.y, 1, 'cold') },
  { name: 'luz sagrada', make: (_a, b) => explosion(b.x, b.y, 1, 'holy') },
  { name: 'atinge: fogo', make: (_a, b) => spellHit(b.x, b.y, 'damage', 'fire') },
  { name: 'atinge: gelo', make: (_a, b) => spellHit(b.x, b.y, 'damage', 'cold') },
  { name: 'atinge: raio', make: (_a, b) => spellHit(b.x, b.y, 'damage', 'lightning') },
  { name: 'atinge: sagrado', make: (_a, b) => spellHit(b.x, b.y, 'damage', 'holy') },
  { name: 'atinge: veneno', make: (_a, b) => spellHit(b.x, b.y, 'damage', 'poison') },
  { name: 'atinge: sombra', make: (_a, b) => spellHit(b.x, b.y, 'damage', 'shadow') },
  { name: 'sono', make: (_a, b) => spellHit(b.x, b.y, 'sleep') },
  { name: 'lentidão', make: (_a, b) => spellHit(b.x, b.y, 'slow') },
  { name: 'medo', make: (_a, b) => spellHit(b.x, b.y, 'fear') },
  { name: 'escudo', make: (a) => spellHit(a.x, a.y, 'shield'), noTarget: true },
  { name: 'aceleração', make: (a) => spellHit(a.x, a.y, 'haste'), noTarget: true },
  { name: 'cura', make: (a) => spellHit(a.x, a.y, 'cure'), noTarget: true },
  { name: 'corte', make: (a, b) => meleeSwing(a.x, a.y, b.x, b.y, 'slash'), adjacent: true },
  { name: 'golpe pesado', make: (a, b) => meleeSwing(a.x, a.y, b.x, b.y, 'slash', undefined, true), adjacent: true },
  { name: 'estocada', make: (a, b) => meleeSwing(a.x, a.y, b.x, b.y, 'pierce'), adjacent: true },
  { name: 'pancada', make: (a, b) => meleeSwing(a.x, a.y, b.x, b.y, 'blunt'), adjacent: true },
  { name: 'garras', make: (a, b) => meleeSwing(a.x, a.y, b.x, b.y, 'claw'), adjacent: true },
  { name: 'mordida', make: (a, b) => meleeSwing(a.x, a.y, b.x, b.y, 'bite'), adjacent: true },
  { name: 'toque gélido', make: (a, b) => meleeSwing(a.x, a.y, b.x, b.y, 'touch', 'cold'), adjacent: true },
  { name: 'sopro de fogo', make: (a, b) => breath(line(a, b), a, 'fire') },
  { name: 'sopro elétrico', make: (a, b) => breath(line(a, b), a, 'lightning') },
  { name: 'teleporte', make: (a, b) => teleport(a.x, a.y, b.x, b.y), noTarget: true },
  { name: 'frasco quebrando', make: (_a, b) => shatter(b.x, b.y, '#d84a3e') },
  { name: 'giro', make: (a) => whirl(a.x, a.y), noTarget: true },
  { name: 'fumaça', make: (a) => smoke(a.x, a.y), noTarget: true },
];

/** Um goblin com um estado, no meio da baia. */
const aura = (status: string): Slot => ({
  name: status,
  empty: true,
  live: (s, o, time) => {
    const x = o.x + 1.5;
    const y = o.y + 1;
    const st = new Set([status]);
    drawAuraBack(s, st, x, y, time, 7);
    if (status === 'hasted') for (const k of [2, 1]) s.spr(K.mon('goblin'), x, y, { anchor: 'foot', ox: k * 3, a: 0.18 * (3 - k), tint: '#ffe04a', ta: 0.7, flip: true });
    s.spr(K.mon('goblin'), x, y, { anchor: 'foot', flip: true, ox: status === 'afraid' ? fearShake(time, 7) : 0, f: Math.floor(time / 560) % 2 });
    drawAuraFront(s, st, x, y, time, 7);
  },
});

/** Uma baia de terreno de uma região, com algo animado. */
const tiles = (name: string, style: string, fill: (s: Scene, x: number, y: number, time: number) => void): Slot => ({
  name,
  empty: true,
  live: (s, o, time) => {
    for (let y = o.y + 1; y < o.y + 3; y++) for (let x = o.x; x < o.x + 4; x++) s.spr(K.floor(style, variantAt(x, y, 2, VARIANTS.floor)), x, y);
    for (let y = o.y + 1; y < o.y + 3; y++) for (let x = o.x; x < o.x + 4; x++) fill(s, x, y, time);
    const air = AIR[style];
    if (air) for (let y = o.y + 1; y < o.y + 3; y++) for (let x = o.x; x < o.x + 4; x++) airMote(s, { ...air, density: air.density * 4 }, x, y, time);
  },
});

const LIVE: Slot[] = [
  ...['burning', 'poisoned', 'slowed', 'hasted', 'paralyzed', 'confused', 'afraid', 'blind', 'shielded'].map(aura),
  ...(['água', 'lava'] as const).map((liquid): Slot => ({
    name: `na ${liquid}`,
    empty: true,
    live: (s, o, time) => {
      for (let y = o.y + 1; y < o.y + 3; y++) for (let x = o.x; x < o.x + 4; x++) s.spr(liquid === 'água' ? K.water : K.lava, x, y, { f: Math.floor(time / 450) % 4 });
      s.spr(K.mon('goblin'), o.x + 1.5, o.y + 1, { anchor: 'foot', flip: true, f: Math.floor(time / 560) % 2 });
      wade(s, o.x + 1.5, o.y + 1, time, 7, liquid === 'lava', false);
    },
  })),
  { name: '', empty: true },
  tiles('tocha (cripta)', 'crypt', (s, x, y, time) => {
    if (x % 2 || y % 3 !== 1) return;
    s.spr(K.face('crypt', 0), x, y);
    s.spr(K.prop('crypt', 'torch'), x, y, { f: Math.floor(time / 110) % 3 });
    s.glow(x + 0.5, y + 0.42, 1.6, '#ff9a3c', 0.3);
    torchEmbers(s, x, y, time);
  }),
  tiles('lava (abismo)', 'abyss', (s, x, y, time) => {
    s.spr(K.lava, x, y, { f: Math.floor(time / 520) % 4 });
    s.glow(x + 0.5, y + 0.5, 1.2, '#ff5a1a', 0.18);
    lavaBubbles(s, x, y, time);
  }),
  tiles('água (fortaleza)', 'fortress', (s, x, y, time) => {
    s.spr(K.water, x, y, { f: Math.floor(time / 420) % 4 });
    waterGlints(s, x, y, time);
  }),
  tiles('fonte e altar', 'crypt', (s, x, y, time) => {
    if (x % 4 === 0 && y % 3 === 1) {
      s.spr(K.prop('crypt', 'fountain'), x, y);
      fountainDrops(s, x, y, time);
    }
    if (x % 4 === 2 && y % 3 === 1) {
      s.spr(K.prop('crypt', 'altar'), x, y);
      s.glow(x + 0.5, y + 0.5, 1.2, '#c080ff', 0.15);
      risingMotes(s, x, y, time, ['#f0d0ff', '#c080ff', '#ffffff'], 3, 2400);
    }
  }),
  tiles('fungos (cavernas)', 'fungal', (s, x, y, time) => {
    if ((x + y) % 2) return;
    s.spr(K.prop('fungal', 'fungus'), x, y);
    s.glow(x + 0.5, y + 0.5, 1.1, STYLES.fungal.glow, 0.14);
    risingMotes(s, x, y, time, [STYLES.fungal.glow, STYLES.fungal.moss], 2, 3000);
  }),
  tiles('poeira (minas)', 'mines', () => {}),
  tiles('poeira (cripta)', 'crypt', () => {}),
  tiles('brasas (abismo)', 'abyss', () => {}),
];

const ALL: Slot[] = [...SLOTS, ...Array.from({ length: (12 - (SLOTS.length % 12)) % 12 }, () => ({ name: '', empty: true })), ...LIVE];

const COLS = 4;
const ROWS = 3;
const CELL_W = 4;
const CELL_H = 3;
const PER_PAGE = COLS * ROWS;

export class FxLabScreen implements Screen {
  private anims: Animation[] = [];

  constructor(private app: App, private page: number, private frozen: number | null) {
    this.build();
  }

  private build(): void {
    this.page = Math.max(0, Math.min(Math.ceil(ALL.length / PER_PAGE) - 1, this.page));
    this.anims = ALL.slice(this.page * PER_PAGE, (this.page + 1) * PER_PAGE).flatMap((s, i) => {
      const { a, b } = this.spots(i, s);
      return s.make ? [s.make(a, b)] : [];
    });
  }

  private spots(i: number, s: Slot): { a: Point; b: Point } {
    const ox = (i % COLS) * CELL_W;
    const oy = Math.floor(i / COLS) * CELL_H;
    const b = { x: ox + 3, y: oy + 1 };
    const a = s.adjacent ? { x: ox + 2, y: oy + 1 } : { x: ox, y: oy + 1 };
    return { a, b };
  }

  onKey(k: KeyInput): void {
    if (k.key === 'ArrowRight') this.page++;
    else if (k.key === 'ArrowLeft') this.page--;
    else if (k.key === 'Escape') {
      this.app.showTitle();
      return;
    }
    this.build();
  }

  render(term: Terminal, time: number): void {
    const rect = { cx: 0, cy: 1, cw: SCREEN_COLS, ch: SCREEN_ROWS - 2 };
    const W = COLS * CELL_W;
    const H = ROWS * CELL_H;
    const scene = poster(rect, W, H, time);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) scene.spr(K.floor('crypt', variantAt(x, y, 2, VARIANTS.floor)), x, y);
    const slots = ALL.slice(this.page * PER_PAGE, (this.page + 1) * PER_PAGE);
    // Relógio das baias contínuas: congelado em t × 3 s, ou o tempo real.
    const clock = this.frozen !== null ? this.frozen * 3000 : time;
    slots.forEach((s, i) => {
      const { a, b } = this.spots(i, s);
      const ox = (i % COLS) * CELL_W;
      const oy = Math.floor(i / COLS) * CELL_H;
      scene.rect(ox, oy, CELL_W, CELL_H, '#000', 0.35);
      s.live?.(scene, { x: ox, y: oy }, clock);
      scene.box(ox, oy, CELL_W, CELL_H, '#4a5278', 1);
      scene.text(ox + 2, oy + 0.32, s.name, '#e8ecf8', 0.8);
      if (s.empty) return;
      scene.spr(K.hero('human', 'mage'), a.x, a.y, { anchor: 'foot' });
      if (!s.noTarget) scene.spr(K.mon('goblin'), b.x, b.y, { anchor: 'foot', flip: true });
    });
    showPoster(term, rect, scene);
    this.anims.forEach((anim) => {
      const t = this.frozen ?? ((time % (anim.duration + 500)) / anim.duration);
      if (t <= 1) anim.draw(term, t);
    });
    const pages = Math.ceil(ALL.length / PER_PAGE);
    term.print(1, 0, `Laboratório de efeitos — página ${this.page + 1}/${pages}${this.frozen !== null ? ` · t = ${this.frozen}` : ''} · ←/→ página · Esc sai`, 'yellow');
  }
}
