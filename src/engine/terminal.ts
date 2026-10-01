import type { Color } from './colors';

/** Buffer de células de um "terminal" ASCII. Não depende de DOM (testável). */
export class Terminal {
  readonly cols: number;
  readonly rows: number;
  readonly glyphs: string[];
  readonly fg: Color[];
  readonly bg: Color[];

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    const n = cols * rows;
    this.glyphs = new Array(n).fill(' ');
    this.fg = new Array(n).fill('lightGray');
    this.bg = new Array(n).fill('black');
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
