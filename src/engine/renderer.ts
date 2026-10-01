import type { Color, Palette } from './colors';
import { CLASSIC_PALETTE } from './colors';
import type { Terminal } from './terminal';

export interface Theme {
  id: string;
  name: string;
  palette: Palette;
  font: string;
  /** Pós-processamento opcional desenhado por cima de tudo (ex.: scanlines CRT). */
  overlay?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}

export const CLASSIC_THEME: Theme = {
  id: 'classic',
  name: 'Terminal clássico',
  palette: CLASSIC_PALETTE,
  font: 'Consolas, "DejaVu Sans Mono", "Courier New", monospace',
};

/**
 * Desenha um Terminal num <canvas>. Guarda o que já foi desenhado (double buffer)
 * e só redesenha as células que mudaram desde o último quadro.
 */
export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private cellW = 10;
  private cellH = 18;
  private drawnGlyph: string[];
  private drawnFg: (Color | '')[];
  private drawnBg: (Color | '')[];
  theme: Theme;

  constructor(private canvas: HTMLCanvasElement, private term: Terminal, theme: Theme = CLASSIC_THEME) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.theme = theme;
    const n = term.cols * term.rows;
    this.drawnGlyph = new Array(n).fill('');
    this.drawnFg = new Array(n).fill('');
    this.drawnBg = new Array(n).fill('');
    this.resize();
  }

  /** Ajusta o tamanho da célula para caber na janela. */
  resize(): void {
    const dpr = window.devicePixelRatio || 1;
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
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.invalidate();
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
    this.invalidate();
  }

  /** Força o redesenho completo no próximo render(). */
  invalidate(): void {
    this.drawnGlyph.fill('');
  }

  /** Converte coordenadas de pixel (evento de mouse) em célula. */
  cellAt(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { x: Math.floor((clientX - rect.left) / this.cellW), y: Math.floor((clientY - rect.top) / this.cellH) };
  }

  render(): void {
    const { ctx, term, cellW, cellH } = this;
    const pal = this.theme.palette;
    const n = term.cols * term.rows;
    let changed = false;
    for (let i = 0; i < n; i++) {
      if (term.glyphs[i] !== this.drawnGlyph[i] || term.fg[i] !== this.drawnFg[i] || term.bg[i] !== this.drawnBg[i]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    // Com overlay, tudo precisa ser redesenhado para o efeito não se acumular.
    if (this.theme.overlay) this.invalidate();
    ctx.font = `${Math.floor(cellH * 0.82)}px ${this.theme.font}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    for (let i = 0; i < n; i++) {
      const g = term.glyphs[i];
      const fg = term.fg[i];
      const bg = term.bg[i];
      if (g === this.drawnGlyph[i] && fg === this.drawnFg[i] && bg === this.drawnBg[i]) continue;
      this.drawnGlyph[i] = g;
      this.drawnFg[i] = fg;
      this.drawnBg[i] = bg;
      const px = (i % term.cols) * cellW;
      const py = Math.floor(i / term.cols) * cellH;
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
    if (this.theme.overlay) this.theme.overlay(ctx, term.cols * cellW, term.rows * cellH);
  }
}
