import type { Color, Palette } from './colors';
import { CLASSIC_PALETTE } from './colors';
import type { Terminal } from './terminal';
import type { Scene, SceneCmd } from './scene';
import type { Atlas } from './atlas';

export interface Theme {
  id: string;
  name: string;
  palette: Palette;
  font: string;
  /** Pós-processamento opcional desenhado por cima de tudo (ex.: scanlines CRT). */
  overlay?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  /** Monitor monocromático: os sprites também são pintados nesta cor (r, g, b). */
  mono?: [number, number, number];
}

export const CLASSIC_THEME: Theme = {
  id: 'classic',
  name: 'Terminal clássico',
  palette: CLASSIC_PALETTE,
  font: 'Consolas, "DejaVu Sans Mono", "Courier New", monospace',
};

/** Tamanho dos sprites na tela: automático, mais perto (sprites maiores) ou mais longe (vê mais do mapa). */
export type ZoomMode = 'auto' | 'close' | 'far';

/** Retângulo do mapa em células do terminal. */
export interface CellRect {
  cx: number;
  cy: number;
  cw: number;
  ch: number;
}

/** Mínimo de tiles visíveis ao escolher a escala automática. */
const AUTO_MIN_COLS = 21;
const AUTO_MIN_ROWS = 11.5;

const colorCache = new Map<string, [number, number, number]>();
function rgb(css: string): [number, number, number] {
  let c = colorCache.get(css);
  if (!c) {
    const h = css.startsWith('#') ? css.slice(1) : css;
    const v = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
    c = [(v >> 16) & 255, (v >> 8) & 255, v & 255];
    colorCache.set(css, c);
  }
  return c;
}
const rgba = (css: string, a: number): string => {
  const [r, g, b] = rgb(css);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
};

/**
 * Desenha um Terminal num <canvas>.
 *
 * Camadas, de baixo para cima:
 *  1. a cena de sprites (o mapa), na janela do mapa, em escala inteira de pixels;
 *  2. as células de texto (a "camada de texto" só redesenha as células que mudaram; células
 *     marcadas como buracos ficam transparentes e deixam a cena aparecer);
 *  3. ícones em retângulos de células e o minimapa;
 *  4. o overlay do tema (scanlines CRT).
 */
export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private textCanvas: HTMLCanvasElement;
  private tctx: CanvasRenderingContext2D;
  private cellW = 10;
  private cellH = 18;
  private dpr = 1;
  private drawnGlyph: string[];
  private drawnFg: (Color | '')[];
  private drawnBg: (Color | '')[];
  private drawnHole: number[];
  private atlas: Atlas | null = null;
  private zoom: ZoomMode = 'auto';
  private sceneRect: CellRect = { cx: 0, cy: 3, cw: 80, ch: 24 };
  private view = { px: 0, py: 0, pw: 0, ph: 0, scale: 1 };
  private miniCanvas: HTMLCanvasElement | null = null;
  private lightCanvas: HTMLCanvasElement | null = null;
  private lastHadExtras = false;
  private needsFull = true;
  theme: Theme;

  constructor(private canvas: HTMLCanvasElement, private term: Terminal, theme: Theme = CLASSIC_THEME) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.textCanvas = document.createElement('canvas');
    this.tctx = this.textCanvas.getContext('2d')!;
    this.theme = theme;
    const n = term.cols * term.rows;
    this.drawnGlyph = new Array(n).fill('');
    this.drawnFg = new Array(n).fill('');
    this.drawnBg = new Array(n).fill('');
    this.drawnHole = new Array(n).fill(-1);
    this.resize();
  }

  setAtlas(atlas: Atlas): void {
    this.atlas = atlas;
    atlas.setMono(this.theme.mono ?? null);
    this.needsFull = true;
  }

  /** Janela do mapa, em células. */
  setSceneRect(r: CellRect): void {
    this.sceneRect = r;
    this.layoutView();
  }

  setZoom(z: ZoomMode): void {
    if (z === this.zoom) return;
    this.zoom = z;
    this.layoutView();
  }

  /** Ajusta o tamanho da célula para caber na janela. */
  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.dpr = dpr;
    const ratio = 0.56; // largura/altura típica de uma célula monoespaçada
    const cellH = Math.max(8, Math.floor(Math.min(window.innerHeight / this.term.rows, window.innerWidth / this.term.cols / ratio)));
    const cellW = Math.max(5, Math.floor(cellH * ratio));
    this.cellW = cellW;
    this.cellH = cellH;
    const w = cellW * this.term.cols;
    const h = cellH * this.term.rows;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.textCanvas.width = this.canvas.width;
    this.textCanvas.height = this.canvas.height;
    this.tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.layoutView();
    this.invalidate();
  }

  /** Retângulo de células → pixels do canvas. */
  private rectPx(r: CellRect): { px: number; py: number; pw: number; ph: number } {
    const dcw = this.canvas.width / this.term.cols;
    const dch = this.canvas.height / this.term.rows;
    const px = Math.round(r.cx * dcw);
    const py = Math.round(r.cy * dch);
    return { px, py, pw: Math.round((r.cx + r.cw) * dcw) - px, ph: Math.round((r.cy + r.ch) * dch) - py };
  }

  /** Calcula a janela do mapa em pixels e a escala inteira dos sprites. */
  private layoutView(): void {
    const { px, py, pw, ph } = this.rectPx(this.sceneRect);
    let auto = 1;
    for (let s = 1; s <= 24; s++) if (pw / (16 * s) >= AUTO_MIN_COLS && ph / (16 * s) >= AUTO_MIN_ROWS) auto = s;
    let scale = auto;
    if (this.zoom === 'close' && pw / (16 * (auto + 1)) >= 14 && ph / (16 * (auto + 1)) >= 8) scale = auto + 1;
    else if (this.zoom === 'far') scale = Math.max(1, auto - 1);
    this.view = { px, py, pw, ph, scale };
    this.term.view = { tilesW: pw / (16 * scale), tilesH: ph / (16 * scale), scale };
  }

  /** Janela e escala de uma cena: o mapa usa o zoom do jogador; cenas "de pôster" cabem o mundo inteiro. */
  private viewFor(scene: Scene): { px: number; py: number; pw: number; ph: number; scale: number } {
    const r = this.sceneRect;
    if (!scene.fit && scene.cx === r.cx && scene.cy === r.cy && scene.cw === r.cw && scene.ch === r.ch) return this.view;
    const { px, py, pw, ph } = this.rectPx({ cx: scene.cx, cy: scene.cy, cw: scene.cw, ch: scene.ch });
    let scale = 1;
    if (scene.fit) for (let s = 1; s <= 24; s++) if (pw >= scene.fit.w * 16 * s && ph >= scene.fit.h * 16 * s) scale = s;
    return { px, py, pw, ph, scale };
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
    this.toneCache.clear();
    this.atlas?.setMono(theme.mono ?? null);
    this.invalidate();
  }

  /** Força o redesenho completo no próximo render(). */
  invalidate(): void {
    this.drawnGlyph.fill('');
    this.needsFull = true;
  }

  /** Converte coordenadas de pixel (evento de mouse) em célula. */
  cellAt(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { x: Math.floor((clientX - rect.left) / this.cellW), y: Math.floor((clientY - rect.top) / this.cellH) };
  }

  // ───────────────────────── camada de texto ─────────────────────────

  /** Redesenha só as células que mudaram. Retorna true se alguma mudou. */
  private updateText(): boolean {
    const { tctx: ctx, term, cellW, cellH } = this;
    const pal = this.theme.palette;
    const n = term.cols * term.rows;
    let changed = false;
    ctx.font = `${Math.floor(cellH * 0.82)}px ${this.theme.font}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    for (let i = 0; i < n; i++) {
      const g = term.glyphs[i];
      const fg = term.fg[i];
      const bg = term.bg[i];
      const hole = term.holes[i];
      if (g === this.drawnGlyph[i] && fg === this.drawnFg[i] && bg === this.drawnBg[i] && hole === this.drawnHole[i]) continue;
      changed = true;
      this.drawnGlyph[i] = g;
      this.drawnFg[i] = fg;
      this.drawnBg[i] = bg;
      this.drawnHole[i] = hole;
      const px = (i % term.cols) * cellW;
      const py = Math.floor(i / term.cols) * cellH;
      if (hole) {
        ctx.clearRect(px, py, cellW, cellH);
        continue;
      }
      ctx.fillStyle = pal[bg];
      ctx.fillRect(px, py, cellW, cellH);
      if (g !== ' ') {
        // Recorta na célula: alguns glifos (█ ░) são mais altos que a célula e "vazariam".
        ctx.save();
        ctx.beginPath();
        ctx.rect(px, py, cellW, cellH);
        ctx.clip();
        ctx.fillStyle = pal[fg];
        if (g === '█') ctx.fillRect(px, py + 1, cellW, cellH - 2);
        else ctx.fillText(g, px + cellW / 2, py + cellH / 2 + 1);
        ctx.restore();
      }
    }
    return changed;
  }

  // ───────────────────────── quadro ─────────────────────────

  render(): void {
    const { ctx, term } = this;
    const textChanged = this.updateText();
    const hasExtras = !!term.scene || term.icons.length > 0 || !!term.minimap;
    if (!textChanged && !hasExtras && !this.lastHadExtras && !this.needsFull) return;
    this.lastHadExtras = hasExtras;
    this.needsFull = false;
    const W = this.canvas.width;
    const H = this.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = this.theme.palette.black;
    ctx.fillRect(0, 0, W, H);
    if (term.scene && this.atlas) this.drawScene(term.scene);
    ctx.drawImage(this.textCanvas, 0, 0);
    if (this.atlas) {
      for (const ic of term.icons) this.drawIcon(ic);
      if (term.minimap) this.drawMinimap(term.minimap);
    }
    if (this.theme.overlay) {
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.theme.overlay(ctx, this.cellW * term.cols, this.cellH * term.rows);
    }
  }

  // ───────────────────────── cena ─────────────────────────

  private toneCache = new Map<string, string>();

  /** Cor de um comando da cena. Nos monitores monocromáticos só o brilho conta: tudo sai na cor do monitor. */
  private tone(css: string): string {
    const mono = this.theme.mono;
    if (!mono) return css;
    let out = this.toneCache.get(css);
    if (!out) {
      const [r, g, b] = rgb(css);
      const lum = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
      // Como nos sprites, mas o preto continua preto (máscaras, sombras): o piso de brilho só vale a partir de um cinza escuro.
      const k = Math.min(1, Math.min(1, lum * 8) * 0.16 + Math.pow(lum, 0.85) * 1.05);
      out = `#${mono.map((x) => Math.round(x * k).toString(16).padStart(2, '0')).join('')}`;
      this.toneCache.set(css, out);
    }
    return out;
  }

  private drawScene(scene: Scene): void {
    const { ctx, atlas } = this;
    if (!atlas) return;
    const view = this.viewFor(scene);
    const s = view.scale;
    const ts = 16 * s;
    const cx0 = view.px + Math.round(view.pw / 2);
    const cy0 = view.py + Math.round(view.ph / 2);
    const camGX = Math.round(scene.camX * 16);
    const camGY = Math.round(scene.camY * 16);
    const toX = (wx: number): number => cx0 + (Math.round(wx * 16) - camGX) * s;
    const toY = (wy: number): number => cy0 + (Math.round(wy * 16) - camGY) * s;
    const left = view.px;
    const top = view.py;
    const right = view.px + view.pw;
    const bottom = view.py + view.ph;
    const img = atlas.image;

    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, view.pw, view.ph);
    ctx.clip();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000';
    ctx.fillRect(left, top, view.pw, view.ph);

    for (const c of scene.cmds as SceneCmd[]) {
      switch (c.k) {
        case 'spr': {
          const ref = atlas.ref(c.key);
          if (!ref) break;
          const f = Math.min(c.f, ref.n - 1);
          const sw = ref.w * s;
          const sh = ref.h * s;
          let dx: number;
          let dy: number;
          if (c.anchor === 'tile') {
            dx = toX(c.x) + c.ox * s;
            dy = toY(c.y) + c.oy * s;
          } else if (c.anchor === 'foot') {
            dx = toX(c.x) + Math.round((16 - ref.w) / 2 + c.ox) * s;
            dy = toY(c.y) + (16 - ref.h + c.oy) * s;
          } else {
            const z = c.zoom ?? 1;
            dx = toX(c.x) + c.ox * s - (sw * z) / 2;
            dy = toY(c.y) + c.oy * s - (sh * z) / 2;
          }
          if (c.anchor !== 'center' && (dx > right || dy > bottom || dx + sw < left || dy + sh < top)) break;
          ctx.globalAlpha = c.a;
          const sx = ref.x + f * ref.w;
          if (c.anchor === 'center' && (c.rot || c.zoom)) {
            const z = c.zoom ?? 1;
            ctx.save();
            ctx.translate(Math.round(dx + (sw * z) / 2), Math.round(dy + (sh * z) / 2));
            if (c.rot) ctx.rotate(c.rot);
            if (c.flip) ctx.scale(-1, 1);
            ctx.drawImage(img, sx, ref.y, ref.w, ref.h, Math.round(-(sw * z) / 2), Math.round(-(sh * z) / 2), Math.round(sw * z), Math.round(sh * z));
            ctx.restore();
          } else if (c.flip) {
            ctx.save();
            ctx.translate(dx + sw, dy);
            ctx.scale(-1, 1);
            ctx.drawImage(img, sx, ref.y, ref.w, ref.h, 0, 0, sw, sh);
            ctx.restore();
          } else {
            ctx.drawImage(img, sx, ref.y, ref.w, ref.h, dx, dy, sw, sh);
          }
          if (c.tint && c.ta) {
            const sil = atlas.silhouette(c.key, f, this.tone(c.tint));
            if (sil) {
              ctx.globalAlpha = c.a * c.ta;
              if (c.flip) {
                ctx.save();
                ctx.translate(dx + sw, dy);
                ctx.scale(-1, 1);
                ctx.drawImage(sil, 0, 0, sw, sh);
                ctx.restore();
              } else ctx.drawImage(sil, dx, dy, sw, sh);
            }
          }
          ctx.globalAlpha = 1;
          break;
        }
        case 'rect': {
          const x0 = toX(c.x), y0 = toY(c.y);
          ctx.globalAlpha = c.a;
          ctx.fillStyle = this.tone(c.color);
          ctx.fillRect(x0, y0, toX(c.x + c.w) - x0, toY(c.y + c.h) - y0);
          ctx.globalAlpha = 1;
          break;
        }
        case 'prect': {
          ctx.globalAlpha = c.a;
          ctx.fillStyle = this.tone(c.color);
          ctx.fillRect(toX(c.x) + c.ox * s, toY(c.y) + c.oy * s, c.w * s, c.h * s);
          ctx.globalAlpha = 1;
          break;
        }
        case 'ell': {
          ctx.globalAlpha = c.a;
          ctx.fillStyle = this.tone(c.color);
          ctx.beginPath();
          ctx.ellipse(toX(c.x), toY(c.y), c.rx * ts, c.ry * ts, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          break;
        }
        case 'glow': {
          const x = toX(c.x), y = toY(c.y), r = c.r * ts;
          if (x + r < left || x - r > right || y + r < top || y - r > bottom) break;
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          const gc = this.tone(c.color);
          g.addColorStop(0, rgba(gc, c.a));
          g.addColorStop(0.45, rgba(gc, c.a * 0.4));
          g.addColorStop(1, rgba(gc, 0));
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = g;
          ctx.fillRect(x - r, y - r, r * 2, r * 2);
          ctx.globalCompositeOperation = 'source-over';
          break;
        }
        case 'text': {
          const px = Math.max(9, Math.round(ts * 0.34 * c.size));
          ctx.font = `bold ${px}px ${this.theme.font}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.globalAlpha = c.a;
          ctx.lineJoin = 'round';
          ctx.lineWidth = Math.max(3, Math.round(px / 4));
          ctx.strokeStyle = '#0b0910';
          ctx.strokeText(c.text, toX(c.x), toY(c.y));
          ctx.fillStyle = this.tone(c.color);
          ctx.fillText(c.text, toX(c.x), toY(c.y));
          ctx.globalAlpha = 1;
          break;
        }
        case 'line': {
          if (c.pts.length < 4) break;
          const path = (): void => {
            ctx.beginPath();
            ctx.moveTo(toX(c.pts[0]), toY(c.pts[1]));
            for (let i = 2; i < c.pts.length; i += 2) ctx.lineTo(toX(c.pts[i]), toY(c.pts[i + 1]));
          };
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          if (c.glow) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = rgba(this.tone(c.color), c.a * 0.35);
            ctx.lineWidth = c.w * s * 3;
            path();
            ctx.stroke();
            ctx.globalCompositeOperation = 'source-over';
          }
          ctx.strokeStyle = rgba(this.tone(c.color), c.a);
          ctx.lineWidth = Math.max(1, c.w * s);
          path();
          ctx.stroke();
          break;
        }
        case 'box': {
          ctx.strokeStyle = rgba(this.tone(c.color), c.a);
          ctx.lineWidth = Math.max(1, c.lw * s);
          const x0 = toX(c.x), y0 = toY(c.y);
          const h = ctx.lineWidth / 2;
          ctx.strokeRect(x0 + h, y0 + h, toX(c.x + c.w) - x0 - ctx.lineWidth, toY(c.y + c.h) - y0 - ctx.lineWidth);
          break;
        }
        case 'ring': {
          ctx.strokeStyle = rgba(this.tone(c.color), c.a);
          ctx.lineWidth = Math.max(1, c.lw * s);
          ctx.beginPath();
          ctx.arc(toX(c.x), toY(c.y), c.r * ts, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 'light': {
          if (!this.lightCanvas) this.lightCanvas = document.createElement('canvas');
          const lc = this.lightCanvas;
          if (lc.width !== c.w || lc.height !== c.h) {
            lc.width = c.w;
            lc.height = c.h;
          }
          const mono = this.theme.mono;
          const data = new Uint8ClampedArray(c.data);
          if (mono) {
            // Monitores monocromáticos: o escuro também fica na cor do monitor.
            for (let i = 0; i < data.length; i += 4) {
              const lum = (0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2]) / 255;
              const k = Math.min(1, 0.16 + lum);
              data[i] = mono[0] * k * 0.2;
              data[i + 1] = mono[1] * k * 0.2;
              data[i + 2] = mono[2] * k * 0.2;
            }
          }
          lc.getContext('2d')!.putImageData(new ImageData(data, c.w, c.h), 0, 0);
          const x0 = toX(c.x), y0 = toY(c.y);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'medium';
          ctx.drawImage(lc, 0, 0, c.w, c.h, x0, y0, toX(c.x + c.w) - x0, toY(c.y + c.h) - y0);
          ctx.imageSmoothingEnabled = false;
          break;
        }
        case 'wipe': {
          const shown = Math.floor(c.t * view.ph);
          ctx.fillStyle = '#000';
          ctx.fillRect(left, top + shown, view.pw, view.ph - shown);
          if (shown < view.ph) {
            ctx.fillStyle = this.tone('#7080a0');
            ctx.fillRect(left, top + shown, view.pw, Math.max(2, s));
          }
          break;
        }
      }
    }
    ctx.restore();
  }

  // ───────────────────────── ícones e minimapa ─────────────────────────

  private cellPx(cx: number, cy: number, cw: number, ch: number): { x: number; y: number; w: number; h: number } {
    const r = this.rectPx({ cx, cy, cw, ch });
    return { x: r.px, y: r.py, w: r.pw, h: r.ph };
  }

  private drawIcon(ic: Terminal['icons'][number]): void {
    const { ctx, atlas } = this;
    const ref = atlas?.ref(ic.key);
    if (!atlas || !ref || !this.term.isHole(ic.cx, ic.cy, ic.cw, ic.ch)) return;
    const r = this.cellPx(ic.cx, ic.cy, ic.cw, ic.ch);
    if (ic.backdrop) {
      ctx.fillStyle = ic.backdrop;
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
    let sc = Math.max(1, Math.floor(Math.min(r.w / ref.w, r.h / ref.h)));
    if (ic.maxScale) sc = Math.min(sc, ic.maxScale);
    const w = ref.w * sc;
    const h = ref.h * sc;
    const dx = r.x + Math.floor((r.w - w) / 2);
    const dy = ic.align === 'bottom' ? r.y + r.h - h : r.y + Math.floor((r.h - h) / 2);
    const f = Math.min(ic.frame, ref.n - 1);
    ctx.save();
    ctx.globalAlpha = ic.alpha ?? 1;
    ctx.imageSmoothingEnabled = false;
    if (ic.flip) {
      ctx.translate(dx + w, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(atlas.image, ref.x + f * ref.w, ref.y, ref.w, ref.h, 0, 0, w, h);
    } else ctx.drawImage(atlas.image, ref.x + f * ref.w, ref.y, ref.w, ref.h, dx, dy, w, h);
    ctx.restore();
  }

  private drawMinimap(m: NonNullable<Terminal['minimap']>): void {
    const { ctx } = this;
    if (!this.term.isHole(m.cx, m.cy, m.cw, m.ch)) return;
    const r = this.cellPx(m.cx, m.cy, m.cw, m.ch);
    const f = Math.max(1, Math.floor(Math.min((r.w - 2) / m.w, (r.h - 2) / m.h)));
    if (!this.miniCanvas || this.miniCanvas.width !== m.w || this.miniCanvas.height !== m.h) {
      this.miniCanvas = document.createElement('canvas');
      this.miniCanvas.width = m.w;
      this.miniCanvas.height = m.h;
    }
    const data = new Uint8ClampedArray(m.data);
    if (this.theme.mono) {
      const [mr, mg, mb] = this.theme.mono;
      for (let i = 0; i < data.length; i += 4) {
        const lum = (0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2]) / 255;
        const k = Math.min(1, 0.2 + lum);
        data[i] = mr * k;
        data[i + 1] = mg * k;
        data[i + 2] = mb * k;
      }
    }
    this.miniCanvas.getContext('2d')!.putImageData(new ImageData(data, m.w, m.h), 0, 0);
    const w = m.w * f;
    const h = m.h * f;
    const dx = r.x + Math.floor((r.w - w) / 2);
    const dy = r.y + Math.floor((r.h - h) / 2);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#07060c';
    ctx.fillRect(dx - 1, dy - 1, w + 2, h + 2);
    ctx.drawImage(this.miniCanvas, 0, 0, m.w, m.h, dx, dy, w, h);
    ctx.strokeStyle = this.theme.mono ? 'rgba(255,255,255,0.35)' : '#394058';
    ctx.lineWidth = 1;
    ctx.strokeRect(dx - 0.5, dy - 0.5, w + 1, h + 1);
    ctx.restore();
  }
}
