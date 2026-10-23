import type { Color } from './colors';
import type { Scene } from './scene';

/** Ícone (sprite) desenhado por cima de um retângulo de células: retratos no painel, itens, pré-visualização. */
export interface IconCmd {
  key: string;
  frame: number;
  /** Retângulo em células. */
  cx: number;
  cy: number;
  cw: number;
  ch: number;
  flip?: boolean;
  alpha?: number;
  /** 'center' (padrão) ou 'bottom' (pés encostados na borda de baixo). */
  align?: 'center' | 'bottom';
  /** Escala máxima (inteira); padrão: a maior que couber. */
  maxScale?: number;
  /** Cor de fundo (CSS) pintada atrás do sprite, no retângulo todo. */
  backdrop?: string;
}

/** Minimapa: uma imagem RGBA (1 pixel por tile) desenhada num retângulo de células. */
export interface MinimapData {
  cx: number;
  cy: number;
  cw: number;
  ch: number;
  w: number;
  h: number;
  data: Uint8ClampedArray;
}

/** Informações sobre a janela do mapa em sprites; o renderizador escreve, a tela do jogo lê. */
export interface ViewInfo {
  /** Quantos tiles cabem na janela do mapa (fracionário). */
  tilesW: number;
  tilesH: number;
  /** Pixels de tela por pixel de sprite. */
  scale: number;
}

/**
 * Buffer de células de um "terminal" ASCII. Não depende de DOM (testável).
 * Além das células de texto, carrega uma cena de sprites (o mapa), "buracos" por onde a cena aparece,
 * ícones e um minimapa — o renderizador junta tudo.
 */
export class Terminal {
  readonly cols: number;
  readonly rows: number;
  readonly glyphs: string[];
  readonly fg: Color[];
  readonly bg: Color[];
  /** 1 = célula transparente (a cena de sprites aparece por baixo). Qualquer escrita na célula a torna opaca. */
  readonly holes: Uint8Array;
  scene: Scene | null = null;
  icons: IconCmd[] = [];
  minimap: MinimapData | null = null;
  view: ViewInfo = { tilesW: 24, tilesH: 13, scale: 1 };

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    const n = cols * rows;
    this.glyphs = new Array(n).fill(' ');
    this.fg = new Array(n).fill('lightGray');
    this.bg = new Array(n).fill('black');
    this.holes = new Uint8Array(n);
  }

  /** Deixa o retângulo transparente: a cena de sprites aparece ali (até alguém escrever nas células). */
  hole(x: number, y: number, w: number, h: number): void {
    for (let j = y; j < y + h; j++) {
      for (let i = x; i < x + w; i++) {
        if (!this.inBounds(i, j)) continue;
        const k = j * this.cols + i;
        this.glyphs[k] = ' ';
        this.fg[k] = 'lightGray';
        this.bg[k] = 'black';
        this.holes[k] = 1;
      }
    }
  }

  /**
   * Pede um sprite do atlas desenhado no retângulo de células (centralizado, em escala inteira).
   * As células viram "buracos": se uma janela escrever por cima depois, o ícone deixa de ser desenhado.
   */
  icon(key: string, cx: number, cy: number, cw: number, ch: number, extra: Partial<IconCmd> = {}): void {
    this.hole(cx, cy, cw, ch);
    this.icons.push({ key, frame: 0, cx, cy, cw, ch, ...extra });
  }

  /** Todas as células do retângulo ainda são buracos (ninguém escreveu por cima)? */
  isHole(x: number, y: number, w: number, h: number): boolean {
    for (let j = y; j < y + h; j++) {
      for (let i = x; i < x + w; i++) if (!this.inBounds(i, j) || !this.holes[j * this.cols + i]) return false;
    }
    return true;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows;
  }

  set(x: number, y: number, glyph: string, fg: Color = 'lightGray', bg: Color = 'black'): void {
    if (!this.inBounds(x, y)) return;
    const i = y * this.cols + x;
    this.glyphs[i] = glyph;
    this.fg[i] = fg;
    this.bg[i] = bg;
    this.holes[i] = 0;
  }

  get(x: number, y: number): { glyph: string; fg: Color; bg: Color } {
    const i = y * this.cols + x;
    return { glyph: this.glyphs[i], fg: this.fg[i], bg: this.bg[i] };
  }

  setBg(x: number, y: number, bg: Color): void {
    if (!this.inBounds(x, y)) return;
    const i = y * this.cols + x;
    this.set(x, y, this.glyphs[i], this.fg[i], bg);
  }

  /** Escreve texto; aceita marcação de cor inline: "{red}texto{/}". Retorna a largura escrita. */
  print(x: number, y: number, text: string, fg: Color = 'lightGray', bg: Color = 'black', maxWidth = Infinity): number {
    let cx = x;
    let color: Color = fg;
    let i = 0;
    while (i < text.length && cx - x < maxWidth) {
      if (text[i] === '{') {
        const end = text.indexOf('}', i);
        if (end > i) {
          const tag = text.slice(i + 1, end);
          color = tag === '/' ? fg : (tag as Color);
          i = end + 1;
          continue;
        }
      }
      this.set(cx, y, text[i], color, bg);
      cx++;
      i++;
    }
    return cx - x;
  }

  /** Texto centralizado horizontalmente na linha y. */
  printCenter(y: number, text: string, fg: Color = 'lightGray', bg: Color = 'black'): void {
    const len = visibleLength(text);
    this.print(Math.floor((this.cols - len) / 2), y, text, fg, bg);
  }

  fill(x: number, y: number, w: number, h: number, glyph = ' ', fg: Color = 'lightGray', bg: Color = 'black'): void {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, glyph, fg, bg);
  }

  clear(): void {
    this.fill(0, 0, this.cols, this.rows);
    this.holes.fill(0);
    this.scene = null;
    this.icons = [];
    this.minimap = null;
  }

  /** Caixa com borda de linha simples e título opcional. */
  box(x: number, y: number, w: number, h: number, fg: Color = 'lightGray', title?: string): void {
    this.fill(x, y, w, h);
    for (let i = x + 1; i < x + w - 1; i++) {
      this.set(i, y, '─', fg);
      this.set(i, y + h - 1, '─', fg);
    }
    for (let j = y + 1; j < y + h - 1; j++) {
      this.set(x, j, '│', fg);
      this.set(x + w - 1, j, '│', fg);
    }
    this.set(x, y, '┌', fg);
    this.set(x + w - 1, y, '┐', fg);
    this.set(x, y + h - 1, '└', fg);
    this.set(x + w - 1, y + h - 1, '┘', fg);
    if (title) this.print(x + 2, y, ` ${title} `, 'yellow');
  }
}

/** Comprimento do texto ignorando a marcação de cor. */
export function visibleLength(text: string): number {
  return text.replace(/\{[^}]*\}/g, '').length;
}

/** Quebra texto em linhas de no máximo `width` caracteres visíveis (quebra por palavras). */
export function wrapText(text: string, width: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (visibleLength(candidate) > width && line) {
      lines.push(line);
      line = w;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}
