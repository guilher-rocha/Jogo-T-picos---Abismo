import type { Terminal } from './terminal';

/** Uma animação curta desenhada por cima da tela. `t` vai de 0 a 1. */
export interface Animation {
  duration: number;
  draw(term: Terminal, t: number): void;
}

interface Step {
  anim: Animation;
  /** Animações "de fundo" lançadas quando este passo começa (não seguram a fila). */
  launch?: Animation[];
  started?: boolean;
}

interface Running {
  anim: Animation;
  elapsed: number;
}

/**
 * Fila de animações. Há dois tipos:
 *  - passos em sequência (golpe, voo de projétil, explosão): enquanto houver um, o jogo espera
 *    (`busy`) — o turno "acontece" visualmente; qualquer tecla pula todos;
 *  - animações de fundo (números de dano, faíscas, cura): começam junto com um passo, mas continuam
 *    tocando por cima sem segurar a fila (o próximo golpe não espera o número de dano sumir).
 */
export class AnimationQueue {
  private queue: Step[] = [];
  private elapsed = 0;
  private background: Running[] = [];
  /** Multiplicador de velocidade (opção do jogador). 0 = desligado. */
  speed = 1;

  get busy(): boolean {
    return this.queue.length > 0;
  }

  /** Há algo desenhando (em sequência ou de fundo)? */
  get active(): boolean {
    return this.queue.length > 0 || this.background.length > 0;
  }

  push(a: Animation): void {
    if (this.speed <= 0) return;
    this.queue.push({ anim: a });
  }

  /** Várias animações tocando ao mesmo tempo como uma só (segura a fila pela mais longa). */
  pushParallel(list: Animation[]): void {
    if (list.length === 0) return;
    const duration = Math.max(...list.map((a) => a.duration));
    this.push({
      duration,
      draw: (term, t) => {
        for (const a of list) a.draw(term, Math.min(1, (t * duration) / a.duration));
      },
    });
  }

  /**
   * Lança animações de fundo quando a fila chegar neste ponto e segura a fila só por `hold` ms
   * (o tempo de o golpe "pesar" antes da próxima ação).
   */
  pushBackground(list: Animation[], hold: number): void {
    if (this.speed <= 0 || list.length === 0) return;
    this.queue.push({ anim: { duration: Math.max(1, hold), draw: () => {} }, launch: list });
  }

  /** Pula a sequência; o que já está tocando ao fundo termina sozinho. */
  skipAll(): void {
    this.queue = [];
    this.elapsed = 0;
  }

  update(dt: number): void {
    const step = dt * this.speed;
    for (const r of this.background) r.elapsed += step;
    this.background = this.background.filter((r) => r.elapsed < r.anim.duration);
    if (!this.queue.length) return;
    this.start(this.queue[0]);
    this.elapsed += step;
    while (this.queue.length && this.elapsed >= this.queue[0].anim.duration) {
      this.elapsed -= this.queue[0].anim.duration;
      this.queue.shift();
      // O próximo passo começa com o tempo que sobrou deste quadro.
      if (this.queue.length) {
        const leftover = this.elapsed;
        this.start(this.queue[0], leftover);
      }
    }
    if (!this.queue.length) this.elapsed = 0;
  }

  private start(s: Step, already = 0): void {
    if (s.started) return;
    s.started = true;
    for (const a of s.launch ?? []) this.background.push({ anim: a, elapsed: already });
  }

  draw(term: Terminal): void {
    for (const r of this.background) r.anim.draw(term, Math.min(1, r.elapsed / r.anim.duration));
    const s = this.queue[0];
    if (s) s.anim.draw(term, Math.min(1, this.elapsed / s.anim.duration));
  }
}
