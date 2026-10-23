/**
 * Cena de sprites: uma lista de comandos de desenho em coordenadas do MUNDO (tiles, fracionárias),
 * montada a cada quadro pela tela do jogo e desenhada pelo CanvasRenderer.
 * Nada aqui depende de DOM (dá para testar e montar cenas no Node).
 *
 * Convenções:
 *  - O tile (i, j) ocupa [i, i+1) × [j, j+1); um tile tem 16 × 16 "pixels de sprite".
 *  - `x`, `y` em tiles; `ox`, `oy`, larguras de barras etc. em pixels de sprite.
 *  - Ordem de desenho = ordem em que os comandos foram adicionados.
 */

export type SpriteAnchor = 'tile' | 'foot' | 'center';

export interface SprCmd {
  k: 'spr';
  key: string;
  f: number;
  x: number;
  y: number;
  /** 'tile': canto superior esquerdo do tile; 'foot': base centralizada no tile; 'center': centro em (x, y). */
  anchor: SpriteAnchor;
  ox: number;
  oy: number;
  flip: boolean;
  a: number;
  /** Cor (CSS) pintada sobre as partes opacas do sprite, com opacidade `ta`. */
  tint?: string;
  ta?: number;
  /** Rotação em radianos (só âncora 'center'). */
  rot?: number;
  /** Escala extra (só âncora 'center'). */
  zoom?: number;
}

export type SceneCmd =
  | SprCmd
  | { k: 'rect'; x: number; y: number; w: number; h: number; color: string; a: number }
  /** Retângulo em pixels de sprite, deslocado de (x, y) tiles: barras de vida, etc. */
  | { k: 'prect'; x: number; y: number; ox: number; oy: number; w: number; h: number; color: string; a: number }
  | { k: 'ell'; x: number; y: number; rx: number; ry: number; color: string; a: number }
  | { k: 'glow'; x: number; y: number; r: number; color: string; a: number }
  | { k: 'text'; x: number; y: number; text: string; color: string; size: number; a: number }
  | { k: 'line'; pts: number[]; color: string; w: number; a: number; glow: boolean }
  | { k: 'box'; x: number; y: number; w: number; h: number; color: string; lw: number; a: number }
  | { k: 'ring'; x: number; y: number; r: number; color: string; lw: number; a: number }
  /** Mapa de luz: uma imagem RGBA com 1 pixel por tile, cobrindo [x, x+w) × [y, y+h) tiles e desenhada suavizada. */
  | { k: 'light'; x: number; y: number; w: number; h: number; data: Uint8ClampedArray }
  /** Transição de andar em tela cheia (0 → 1). */
  | { k: 'wipe'; t: number };

export interface SprOpts {
  anchor?: SpriteAnchor;
  f?: number;
  ox?: number;
  oy?: number;
  flip?: boolean;
  a?: number;
  tint?: string;
  ta?: number;
  rot?: number;
  zoom?: number;
}

export class Scene {
  readonly cmds: SceneCmd[] = [];
  /** Mundo (em tiles) que fica no centro da janela do mapa. */
  camX = 0;
  camY = 0;
  /** Relógio da cena em ms (animações de tiles e de sprites). */
  time = 0;
  /**
   * Cena "de pôster" (título, fim de jogo): em vez do zoom do mapa, usa a maior escala inteira em que
   * um mundo de `w` × `h` tiles cabe na janela. A câmera deve ficar no centro desse mundo.
   */
  fit: { w: number; h: number } | null = null;

  constructor(
    /** Retângulo da janela do mapa, em células do terminal. */
    readonly cx: number,
    readonly cy: number,
    readonly cw: number,
    readonly ch: number,
  ) {}

  spr(key: string, x: number, y: number, o: SprOpts = {}): void {
    this.cmds.push({
      k: 'spr', key, x, y, f: o.f ?? 0, anchor: o.anchor ?? 'tile', ox: o.ox ?? 0, oy: o.oy ?? 0,
      flip: o.flip ?? false, a: o.a ?? 1, tint: o.tint, ta: o.ta, rot: o.rot, zoom: o.zoom,
    });
  }

  rect(x: number, y: number, w: number, h: number, color: string, a = 1): void {
    this.cmds.push({ k: 'rect', x, y, w, h, color, a });
  }

  prect(x: number, y: number, ox: number, oy: number, w: number, h: number, color: string, a = 1): void {
    this.cmds.push({ k: 'prect', x, y, ox, oy, w, h, color, a });
  }

  ell(x: number, y: number, rx: number, ry: number, color: string, a = 1): void {
    this.cmds.push({ k: 'ell', x, y, rx, ry, color, a });
  }

  glow(x: number, y: number, r: number, color: string, a = 1): void {
    this.cmds.push({ k: 'glow', x, y, r, color, a });
  }

  text(x: number, y: number, text: string, color: string, size = 1, a = 1): void {
    this.cmds.push({ k: 'text', x, y, text, color, size, a });
  }

  line(pts: number[], color: string, w = 2, a = 1, glow = false): void {
    this.cmds.push({ k: 'line', pts, color, w, a, glow });
  }

  box(x: number, y: number, w: number, h: number, color: string, lw = 1, a = 1): void {
    this.cmds.push({ k: 'box', x, y, w, h, color, lw, a });
  }

  ring(x: number, y: number, r: number, color: string, lw = 1, a = 1): void {
    this.cmds.push({ k: 'ring', x, y, r, color, lw, a });
  }

  light(x: number, y: number, w: number, h: number, data: Uint8ClampedArray): void {
    this.cmds.push({ k: 'light', x, y, w, h, data });
  }

  wipe(t: number): void {
    this.cmds.push({ k: 'wipe', t });
  }
}
