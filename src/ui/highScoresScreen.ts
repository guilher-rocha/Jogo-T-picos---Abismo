import type { Screen } from '../engine/screens';
import type { Terminal } from '../engine/terminal';
import type { KeyInput } from '../data/keymap';
import type { App } from './app';
import { SCREEN_COLS, SCREEN_ROWS } from './layout';

/** Quadro de recordes. No ciclo de "arcade" fica alguns segundos e volta ao título. */
export class HighScoresScreen implements Screen {
  private elapsed = 0;

  constructor(private app: App, private opts: { cycle?: boolean; highlight?: number; onDone?: () => void } = {}) {}

  update(dt: number): void {
    this.elapsed += dt;
    if (this.opts.cycle && this.elapsed > 10000) this.app.showTitle();
  }

  onKey(_k: KeyInput): void {
    if (this.opts.onDone) this.opts.onDone();
    else this.app.showTitle();
  }

  render(term: Terminal, time: number): void {
    term.box(0, 0, SCREEN_COLS, SCREEN_ROWS, 'darkGray');
    term.printCenter(2, '═══  SALÃO DOS HERÓIS  ═══', 'gold');
    const list = this.app.highScores;
    if (!list.length) {
      term.printCenter(10, 'Ninguém ainda voltou do Abismo para contar a história.', 'lightGray');
      term.printCenter(12, 'Seja o primeiro.', 'darkGray');
    }
    term.print(4, 5, '#   PONTOS   NOME             PERSONAGEM                ANDAR  DESTINO', 'darkGray');
    list.forEach((e, i) => {
      const hl = i === this.opts.highlight && Math.floor(time / 300) % 2 === 0;
      const color = hl ? 'yellow' : i === 0 ? 'gold' : e.won ? 'lightGreen' : 'lightGray';
      const who = `${e.race} ${e.cls} nv${e.level}`;
      const line = `${String(i + 1).padStart(2)}  ${String(e.score).padStart(7)}   ${e.name.padEnd(16).slice(0, 16)} ${who.padEnd(25).slice(0, 25)} ${String(e.depth).padStart(4)}   ${e.cause}`;
      term.print(4, 7 + i * 2, line, color, 'black', SCREEN_COLS - 6);
      term.print(16, 8 + i * 2, `${e.date} · ${e.turns} turnos · seed ${e.seed}${e.daily ? ` · desafio ${e.daily}` : ''}`, 'darkGray');
    });
    term.printCenter(SCREEN_ROWS - 2, this.opts.cycle ? 'Pressione qualquer tecla' : '[qualquer tecla] voltar', 'darkGray');
  }
}
