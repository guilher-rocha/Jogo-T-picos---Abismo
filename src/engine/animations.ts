import type { Terminal } from './terminal';

/** Uma animação curta desenhada por cima da tela. `t` vai de 0 a 1. */
export interface Animation {
  duration: number;
  draw(term: Terminal, t: number): void;
}

/**
 * Fila de animações tocadas em sequência. Enquanto houver animação, o jogo não aceita
 * comandos (o turno "acontece" visualmente); qualquer tecla pula todas.
 */
export class AnimationQueue {
  private queue: Animation[] = [];
  private elapsed = 0;
  /** Multiplicador de velocidade (opção do jogador). 0 = desligado. */
  speed = 1;

  get busy(): boolean {
    return this.queue.length > 0;
  }

  push(a: Animation): void {
    if (this.speed <= 0) return;
    this.queue.push(a);
  }

  /** Várias animações tocando ao mesmo tempo como uma só. */
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

  skipAll(): void {
    this.queue = [];
    this.elapsed = 0;
  }

  update(dt: number): void {
    if (!this.queue.length) return;
    this.elapsed += dt * this.speed;
    while (this.queue.length && this.elapsed >= this.queue[0].duration) {
      this.elapsed -= this.queue[0].duration;
      this.queue.shift();
    }
    if (!this.queue.length) this.elapsed = 0;
  }

  draw(term: Terminal): void {
    const a = this.queue[0];
    if (a) a.draw(term, Math.min(1, this.elapsed / a.duration));
  }
}
