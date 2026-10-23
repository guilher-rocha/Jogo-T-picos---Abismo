import type { Game } from '../core/game';
import { level } from '../core/game';
import type { Point } from '../core/map';

/**
 * Ponto que a câmera deve acompanhar no lugar do jogador (cursor de mira / olhar).
 * A tela de mira escreve aqui; a tela do jogo lê a cada quadro.
 */
export const viewFocus: { point: Point | null } = { point: null };

/** Posição desenhada de um ator (segue a posição lógica suavemente) e pequenos estados visuais. */
export interface Vis {
  x: number;
  y: number;
  /** 1 = olhando para a direita, -1 = para a esquerda. */
  face: 1 | -1;
  /** Janela (ms da cena) em que o sprite fica branco por causa de um golpe: de `hurtFrom` até `hurtUntil`. */
  hurtFrom: number;
  hurtUntil: number;
  /** Última chave de sprite usada (para o "fantasma" de morte). */
  key: string;
  frames: number;
  /** Quando o ator começou a andar (para o saltinho do passo). */
  walking: boolean;
  /** Avanço de ataque: começa em `lungeFrom` (ms da cena), dura `lungeMs`, na direção (ldx, ldy). */
  lungeFrom?: number;
  lungeMs?: number;
  ldx?: number;
  ldy?: number;
  lheavy?: boolean;
  /** Última posição lógica vista (para soltar a poeira do passo quando ela muda). */
  lx?: number;
  ly?: number;
}

/** Poeirinha levantada por um passo (some em PUFF_MS). */
export interface Puff {
  x: number;
  y: number;
  t0: number;
  /** Direção do passo (a poeira sai para trás). */
  dx: number;
}

export const PUFF_MS = 320;

/** Sprite que some depois que o monstro morre. */
export interface Ghost {
  key: string;
  frame: number;
  x: number;
  y: number;
  face: 1 | -1;
  t0: number;
  boss: boolean;
}

/**
 * Estado visual da janela do jogo, separado do estado do jogo: posições suavizadas dos atores,
 * câmera, fantasmas de mortes. A lógica do jogo continua em tiles inteiros; aqui só "desliza".
 */
export class SceneState {
  readonly vis = new Map<number, Vis>();
  ghosts: Ghost[] = [];
  puffs: Puff[] = [];
  /** Relógio da cena (ms). */
  time = 0;
  camX = 0;
  camY = 0;
  private camReady = false;
  private levelRef: unknown = null;
  /** Quando definido (mira, olhar), a câmera acompanha este ponto em vez do jogador. */
  focus: Point | null = null;
  /** Animações desligadas nas opções: posições e câmera pulam direto para o destino. */
  instant = false;
  /** Multiplicador de velocidade (opção de animações). */
  speed = 1;

  /** Avança o relógio, as posições suavizadas e a câmera. */
  update(game: Game, dt: number, tilesW: number, tilesH: number): void {
    this.time += dt;
    const mdt = dt * this.speed;
    const lvl = level(game);
    // Mesmo andar = mesma partida e mesma profundidade (no multijogador o objeto do andar é trocado a cada estado).
    const key = `${game.seed}|${game.depth}`;
    if (this.levelRef !== key) {
      this.levelRef = key;
      this.vis.clear();
      this.ghosts = [];
      this.puffs = [];
      this.camReady = false;
    }
    const seen = new Set<number>();
    const party = (game.party?.members ?? []).map((m) => m.actor).filter((a) => a !== game.player);
    for (const a of [game.player, ...party, ...lvl.actors]) {
      seen.add(a.id);
      let v = this.vis.get(a.id);
      if (!v) {
        v = { x: a.x, y: a.y, face: 1, hurtFrom: 0, hurtUntil: 0, key: '', frames: 1, walking: false };
        this.vis.set(a.id, v);
      }
      // Um passo de uma casa deixa uma poeirinha onde o pé saiu.
      if (v.lx !== undefined && v.ly !== undefined && (v.lx !== a.x || v.ly !== a.y)) {
        const step = Math.max(Math.abs(a.x - v.lx), Math.abs(a.y - v.ly));
        if (step === 1 && !this.instant) {
          this.puffs.push({ x: v.lx, y: v.ly, t0: this.time, dx: Math.sign(a.x - v.lx) });
          if (this.puffs.length > 40) this.puffs.shift();
        }
      }
      v.lx = a.x;
      v.ly = a.y;
      const dx = a.x - v.x;
      const dy = a.y - v.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.001) {
        if (Math.abs(dx) > 0.2) v.face = dx > 0 ? 1 : -1;
        // Passos curtos: ~11 casas/s; saltos longos (correr, teleporte) são rápidos ou instantâneos.
        const speed = dist > 8 ? 999 : dist > 3 ? 36 : dist > 1.5 ? 20 : 11;
        const step = (speed * mdt) / 1000;
        if (this.instant || dist <= step) {
          v.x = a.x;
          v.y = a.y;
          v.walking = false;
        } else {
          v.x += (dx / dist) * step;
          v.y += (dy / dist) * step;
          v.walking = true;
        }
      } else {
        v.walking = false;
        // Monstro encostado no jogador olha para ele.
        if (!a.isPlayer && Math.max(Math.abs(a.x - game.player.x), Math.abs(a.y - game.player.y)) === 1 && a.ai.state === 'hunting') {
          const side = game.player.x - a.x;
          if (side !== 0) v.face = side > 0 ? 1 : -1;
        }
      }
    }
    for (const id of this.vis.keys()) if (!seen.has(id)) this.vis.delete(id);
    this.ghosts = this.ghosts.filter((g) => this.time - g.t0 < 700);
    this.puffs = this.puffs.filter((p) => this.time - p.t0 < PUFF_MS);

    // Câmera: segue o jogador (ou o foco da mira), sem mostrar além das bordas do mapa.
    const map = lvl.map;
    const pv = this.vis.get(game.player.id);
    const tx = this.focus ? this.focus.x + 0.5 : (pv?.x ?? game.player.x) + 0.5;
    const ty = this.focus ? this.focus.y + 0.5 : (pv?.y ?? game.player.y) + 0.5;
    const clampAxis = (target: number, size: number, view: number): number =>
      view >= size ? size / 2 : Math.max(view / 2, Math.min(size - view / 2, target));
    const gx = clampAxis(tx, map.width, tilesW);
    const gy = clampAxis(ty, map.height, tilesH);
    if (!this.camReady) {
      this.camX = gx;
      this.camY = gy;
      this.camReady = true;
    } else {
      const k = this.instant ? 1 : 1 - Math.exp(-mdt / (this.focus ? 90 : 70));
      this.camX += (gx - this.camX) * k;
      this.camY += (gy - this.camY) * k;
    }
  }

  /** Posição suavizada de um ator (ou a lógica, se ainda não há registro). */
  at(id: number, fallback: Point): Vis {
    return this.vis.get(id) ?? { x: fallback.x, y: fallback.y, face: 1, hurtFrom: 0, hurtUntil: 0, key: '', frames: 1, walking: false };
  }

  /** O sprite pisca em branco por `ms`, começando daqui a `delay` ms (o golpe de uma flecha ou magia só chega depois do voo). */
  hurt(actorId: number, ms = 150, delay = 0): void {
    const v = this.vis.get(actorId);
    if (!v) return;
    v.hurtFrom = this.time + delay;
    v.hurtUntil = this.time + delay + ms;
  }

  /** O atacante avança na direção do alvo e volta (começa daqui a `delay` ms). */
  lunge(actorId: number, dx: number, dy: number, delay = 0, ms = 170, heavy = false): void {
    const v = this.vis.get(actorId);
    if (!v) return;
    v.lungeFrom = this.time + delay;
    v.lungeMs = Math.max(1, ms);
    v.ldx = Math.sign(dx);
    v.ldy = Math.sign(dy);
    v.lheavy = heavy;
    if (dx !== 0) v.face = dx > 0 ? 1 : -1;
  }

  /** Deslocamento atual do avanço de ataque, em pixels de sprite (0 fora da janela). */
  lungeOffset(v: Vis): { ox: number; oy: number } {
    if (v.lungeFrom === undefined || !v.lungeMs) return { ox: 0, oy: 0 };
    const u = (this.time - v.lungeFrom) / v.lungeMs;
    if (u <= 0 || u >= 1) return { ox: 0, oy: 0 };
    // vai rápido e volta devagar
    const k = u < 0.35 ? u / 0.35 : 1 - (u - 0.35) / 0.65;
    const amp = v.lheavy ? 7 : 5;
    return { ox: Math.round((v.ldx ?? 0) * amp * k), oy: Math.round((v.ldy ?? 0) * amp * k) };
  }

  /** O ator virou para o lado (ataque, golpe contra a parede). */
  face(actorId: number, dx: number): void {
    const v = this.vis.get(actorId);
    if (v && dx !== 0) v.face = dx > 0 ? 1 : -1;
  }

  /**
   * Procura o ator visual que estava neste tile (para criar o fantasma quando ele morre).
   * Com `delay`, o sprite continua inteiro até a hora do golpe e só então some na fumaça.
   */
  ghostAt(x: number, y: number, boss: boolean, delay = 0): void {
    let best: Vis | undefined;
    for (const v of this.vis.values()) {
      if (v.key && Math.abs(v.x - x) < 0.6 && Math.abs(v.y - y) < 0.6 && !v.key.startsWith('hero:')) best = v;
    }
    if (best) this.ghosts.push({ key: best.key, frame: 0, x: best.x, y: best.y, face: best.face, t0: this.time + delay, boss });
  }

  /** Reinicia a câmera (troca de andar, novo jogo). */
  reset(): void {
    this.vis.clear();
    this.ghosts = [];
    this.camReady = false;
    this.levelRef = null;
  }
}
