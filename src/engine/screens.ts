import type { KeyInput } from '../data/keymap';
import type { Terminal } from './terminal';

/** Uma "tela" do jogo (título, jogo, inventário...). Telas modais ficam empilhadas. */
export interface Screen {
  /** Se true, a tela de baixo é desenhada antes desta (janelas modais). */
  readonly modal?: boolean;
  render(term: Terminal, time: number): void;
  onKey(k: KeyInput): void;
  update?(dt: number, time: number): void;
  onEnter?(): void;
}

export class ScreenManager {
  private stack: Screen[] = [];

  get top(): Screen | undefined {
    return this.stack[this.stack.length - 1];
  }

  push(s: Screen): void {
    this.stack.push(s);
    s.onEnter?.();
  }

  pop(): void {
    this.stack.pop();
    this.top?.onEnter?.();
  }

  /** Substitui toda a pilha por uma única tela. */
  replace(s: Screen): void {
    this.stack = [];
    this.push(s);
  }

  has(s: Screen): boolean {
    return this.stack.includes(s);
  }

  render(term: Terminal, time: number): void {
    // Desenha a partir da tela não modal mais alta.
    let start = this.stack.length - 1;
    while (start > 0 && this.stack[start].modal) start--;
    term.clear();
    for (let i = Math.max(0, start); i < this.stack.length; i++) this.stack[i].render(term, time);
  }

  update(dt: number, time: number): void {
    this.top?.update?.(dt, time);
  }

  onKey(k: KeyInput): void {
    this.top?.onKey(k);
  }
}
