import type { RGBA } from './color';
import { hex, mix, darken } from './color';

/** Paleta de pixel art: um caractere → uma cor. '.' é sempre transparente. */
export type PixelPalette = Record<string, string>;

/**
 * Imagem RGBA em memória. Não depende de DOM: a mesma arte é usada pelo jogo
 * (que a copia para um canvas), pelos testes e pelo exportador de PNG.
 */
export class Pixmap {
  readonly data: Uint8ClampedArray;

  constructor(readonly w: number, readonly h: number, data?: Uint8ClampedArray) {
    this.data = data ?? new Uint8ClampedArray(w * h * 4);
  }

  clone(): Pixmap {
    return new Pixmap(this.w, this.h, new Uint8ClampedArray(this.data));
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x: number, y: number): RGBA {
    if (!this.inside(x, y)) return [0, 0, 0, 0];
    const i = (y * this.w + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  alpha(x: number, y: number): number {
    return this.inside(x, y) ? this.data[(y * this.w + x) * 4 + 3] : 0;
  }

  set(x: number, y: number, c: RGBA): void {
    if (!this.inside(x, y)) return;
    const i = (y * this.w + x) * 4;
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
    this.data[i + 3] = c[3];
  }

  /** Desenha `c` por cima (composição "source-over"). */
  over(x: number, y: number, c: RGBA): void {
    if (!this.inside(x, y) || c[3] <= 0) return;
    if (c[3] >= 255) {
      this.set(x, y, c);
      return;
    }
    const d = this.get(x, y);
    const a = c[3] / 255;
    const da = d[3] / 255;
    const oa = a + da * (1 - a);
    if (oa <= 0) return;
    this.set(x, y, [
      (c[0] * a + d[0] * da * (1 - a)) / oa,
      (c[1] * a + d[1] * da * (1 - a)) / oa,
      (c[2] * a + d[2] * da * (1 - a)) / oa,
      oa * 255,
    ]);
  }

  fillRect(x: number, y: number, w: number, h: number, c: RGBA): void {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.over(i, j, c);
  }

  /** Cola outra imagem em (dx, dy). */
  blit(src: Pixmap, dx = 0, dy = 0, flipX = false): this {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const c = src.get(flipX ? src.w - 1 - x : x, y);
        if (c[3] > 0) this.over(dx + x, dy + y, c);
      }
    }
    return this;
  }

  flipX(): Pixmap {
    const out = new Pixmap(this.w, this.h);
    out.blit(this, 0, 0, true);
    return out;
  }

  /** Desloca a imagem (o que sai da área é cortado). */
  shift(dx: number, dy: number): Pixmap {
    const out = new Pixmap(this.w, this.h);
    out.blit(this, dx, dy);
    return out;
  }

  crop(x: number, y: number, w: number, h: number): Pixmap {
    const out = new Pixmap(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out.set(i, j, this.get(x + i, y + j));
    return out;
  }

  /** Aplica `fn` em cada pixel não transparente. */
  map(fn: (c: RGBA, x: number, y: number) => RGBA): Pixmap {
    const out = new Pixmap(this.w, this.h);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.get(x, y);
        if (c[3] > 0) out.set(x, y, fn(c, x, y));
      }
    }
    return out;
  }

  /** Troca cores exatas (para variantes do mesmo desenho: dragão vermelho → azul). */
  swap(table: Record<string, string>): Pixmap {
    const m = new Map<string, RGBA>();
    for (const [from, to] of Object.entries(table)) m.set(key(hex(from)), hex(to));
    return this.map((c) => m.get(key(c)) ?? c);
  }

  /** Remove a linha `y` e empurra o que está acima dela para baixo (efeito de "respirar"). */
  squashRow(y: number): Pixmap {
    const out = new Pixmap(this.w, this.h);
    for (let j = 0; j < this.h; j++) {
      if (j === y) continue;
      const to = j < y ? j + 1 : j;
      for (let i = 0; i < this.w; i++) out.set(i, to, this.get(i, j));
    }
    return out;
  }

  /** Remove várias linhas (corpo mais baixo para anões, halflings e gnomos). */
  dropRows(rows: number[]): Pixmap {
    let p: Pixmap = this;
    for (const r of [...rows].sort((a, b) => a - b)) p = p.squashRow(r);
    return p;
  }

  /**
   * Contorno de 1 pixel em volta das partes opacas. A cor do contorno é a do vizinho
   * escurecida (contorno "seletivo": fica mais bonito que preto puro).
   */
  outline(strength = 0.72, fixed?: RGBA): Pixmap {
    const out = this.clone();
    for (let y = -1; y <= this.h; y++) {
      for (let x = -1; x <= this.w; x++) {
        if (this.alpha(x, y) > 0) continue;
        let r = 0, g = 0, b = 0, n = 0;
        for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
          const c = this.get(x + dx, y + dy);
          if (c[3] > 0) {
            r += c[0]; g += c[1]; b += c[2]; n++;
          }
        }
        if (!n) continue;
        const avg: RGBA = [r / n, g / n, b / n, 255];
        out.set(x, y, fixed ?? darken(avg, strength));
      }
    }
    return out;
  }

  /** Sombreia o lado inferior-direito e destaca o superior-esquerdo (luz vinda de cima à esquerda). */
  bevel(light = 0.18, dark = 0.22): Pixmap {
    const out = this.clone();
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.get(x, y);
        if (c[3] === 0) continue;
        const up = this.alpha(x, y - 1) === 0 || this.alpha(x - 1, y) === 0;
        const down = this.alpha(x, y + 1) === 0 || this.alpha(x + 1, y) === 0;
        if (up && !down) out.set(x, y, mix(c, [255, 250, 230, c[3]], light));
        else if (down && !up) out.set(x, y, darken(c, dark));
      }
    }
    return out;
  }

  /** Ampliação com vizinho mais próximo (só para exportar imagens e pré-visualizações). */
  scaled(n: number): Pixmap {
    const out = new Pixmap(this.w * n, this.h * n);
    for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) out.set(x, y, this.get((x / n) | 0, (y / n) | 0));
    return out;
  }

  isEmpty(): boolean {
    for (let i = 3; i < this.data.length; i += 4) if (this.data[i] > 0) return false;
    return true;
  }
}

function key(c: RGBA): string {
  return `${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])}`;
}

const PAL_CACHE = new WeakMap<PixelPalette, Map<string, RGBA>>();

function palColors(pal: PixelPalette): Map<string, RGBA> {
  let m = PAL_CACHE.get(pal);
  if (!m) {
    m = new Map();
    for (const [ch, h] of Object.entries(pal)) m.set(ch, hex(h));
    PAL_CACHE.set(pal, m);
  }
  return m;
}

/**
 * Monta uma imagem a partir de linhas de texto. Cada caractere é uma cor da paleta;
 * '.' e ' ' são transparentes. Caracteres desconhecidos geram erro (pega erro de digitação cedo).
 */
export function fromRows(rows: readonly string[], pal: PixelPalette, name = 'sprite', width?: number): Pixmap {
  const colors = palColors(pal);
  const w = width ?? Math.max(...rows.map((r) => r.length));
  const p = new Pixmap(w, rows.length);
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`${name}: linha ${y} tem ${row.length} colunas (esperado ${w}): "${row}"`);
    [...row].forEach((ch, x) => {
      if (ch === '.' || ch === ' ') return;
      const c = colors.get(ch);
      if (!c) throw new Error(`${name}: caractere desconhecido "${ch}" na linha ${y}, coluna ${x}`);
      p.set(x, y, c);
    });
  });
  return p;
}

/** Quebra um bloco de texto em linhas, ignorando a primeira linha vazia e a indentação comum. */
export function rowsOf(block: string): string[] {
  const lines = block.split('\n').map((l) => l.replace(/\r$/, ''));
  while (lines.length && lines[0].trim() === '') lines.shift();
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length));
  return lines.map((l) => l.slice(indent).trimEnd());
}

/** Metade esquerda (8 colunas) espelhada em 16: bom para criaturas simétricas. */
export function mirrored(halfRows: readonly string[]): string[] {
  return halfRows.map((r) => r + [...r].reverse().join(''));
}
