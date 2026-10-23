import type { SpriteEntry } from '../gfx/library';

/** Onde um sprite está no atlas. `n` quadros lado a lado, cada um com `w` × `h`. */
export interface AtlasRef {
  x: number;
  y: number;
  w: number;
  h: number;
  n: number;
}

/** Chaves dos sprites existentes (as telas consultam antes de pedir um sprite; vazio = tudo existe, para testes). */
export const registry = {
  keys: new Set<string>(),
  has(key: string): boolean {
    return this.keys.size === 0 || this.keys.has(key);
  },
};

/**
 * Atlas de sprites: todas as imagens do jogo empacotadas numa só <canvas>.
 * Há uma variante por tema de cor (monocromática para os temas de monitor CRT).
 */
export class Atlas {
  private index = new Map<string, AtlasRef>();
  private variants = new Map<string, HTMLCanvasElement>();
  private silhouettes = new Map<string, HTMLCanvasElement>();
  private variant = 'color';
  readonly width: number;
  readonly height: number;

  constructor(entries: SpriteEntry[], width = 2048) {
    // Empacotamento em "prateleiras": ordena por altura e preenche linha a linha.
    const sorted = [...entries].sort((a, b) => b.h - a.h || b.w * b.frames.length - a.w * a.frames.length);
    let x = 0;
    let y = 0;
    let rowH = 0;
    for (const e of sorted) {
      const w = e.w * e.frames.length;
      // Uma animação tem de caber numa linha do atlas (os quadros ficam lado a lado).
      if (w > width) throw new Error(`Sprite "${e.key}" é largo demais para o atlas (${w} > ${width} px)`);
      if (x + w > width) {
        x = 0;
        y += rowH;
        rowH = 0;
      }
      this.index.set(e.key, { x, y, w: e.w, h: e.h, n: e.frames.length });
      x += w;
      rowH = Math.max(rowH, e.h);
    }
    this.width = width;
    this.height = y + rowH;
    const data = new Uint8ClampedArray(this.width * this.height * 4);
    for (const e of sorted) {
      const ref = this.index.get(e.key)!;
      e.frames.forEach((fr, f) => {
        for (let j = 0; j < e.h; j++) {
          const src = j * e.w * 4;
          const dst = ((ref.y + j) * this.width + ref.x + f * e.w) * 4;
          data.set(fr.data.subarray(src, src + e.w * 4), dst);
        }
      });
    }
    const base = document.createElement('canvas');
    base.width = this.width;
    base.height = this.height;
    base.getContext('2d')!.putImageData(new ImageData(data, this.width, this.height), 0, 0);
    this.variants.set('color', base);
    for (const k of this.index.keys()) registry.keys.add(k);
  }

  has(key: string): boolean {
    return this.index.has(key);
  }

  ref(key: string): AtlasRef | undefined {
    return this.index.get(key);
  }

  /** A imagem do atlas na variante ativa. */
  get image(): HTMLCanvasElement {
    return this.variants.get(this.variant)!;
  }

  /** Variante de cor: `null` = cores originais; [r,g,b] = monitor monocromático dessa cor. */
  setMono(rgb: [number, number, number] | null): void {
    const name = rgb ? `mono:${rgb.join(',')}` : 'color';
    if (!this.variants.has(name) && rgb) {
      const base = this.variants.get('color')!;
      const ctx = base.getContext('2d')!;
      const img = ctx.getImageData(0, 0, base.width, base.height);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] === 0) continue;
        const lum = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255;
        const k = Math.min(1, 0.16 + Math.pow(lum, 0.85) * 1.05);
        d[i] = rgb[0] * k;
        d[i + 1] = rgb[1] * k;
        d[i + 2] = rgb[2] * k;
      }
      const c = document.createElement('canvas');
      c.width = base.width;
      c.height = base.height;
      c.getContext('2d')!.putImageData(img, 0, 0);
      this.variants.set(name, c);
    }
    if (this.variant !== name) {
      this.variant = name;
      this.silhouettes.clear();
    }
  }

  /** Silhueta de um quadro pintada de uma cor (flash de dano, veneno...). Guardada em cache. */
  silhouette(key: string, frame: number, color: string): HTMLCanvasElement | null {
    const ref = this.index.get(key);
    if (!ref) return null;
    const f = Math.min(frame, ref.n - 1);
    const id = `${key}|${f}|${color}`;
    let c = this.silhouettes.get(id);
    if (!c) {
      c = document.createElement('canvas');
      c.width = ref.w;
      c.height = ref.h;
      const g = c.getContext('2d')!;
      g.drawImage(this.image, ref.x + f * ref.w, ref.y, ref.w, ref.h, 0, 0, ref.w, ref.h);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = color;
      g.fillRect(0, 0, ref.w, ref.h);
      this.silhouettes.set(id, c);
    }
    return c;
  }
}
