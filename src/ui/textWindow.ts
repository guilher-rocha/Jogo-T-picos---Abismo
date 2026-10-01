import type { Screen } from '../engine/screens';
import type { Terminal } from '../engine/terminal';
import type { KeyInput } from '../data/keymap';
import type { App } from './app';
import { SCREEN_COLS, SCREEN_ROWS } from './layout';

/** Janela modal com texto rolável (histórico de mensagens, ajuda, descrições). */
export class TextWindow implements Screen {
  readonly modal = true;
  private scroll: number;

  constructor(
    private app: App,
    private title: string,
    private lines: string[],
    opts: { startAtEnd?: boolean } = {},
  ) {
    this.scroll = opts.startAtEnd ? Math.max(0, lines.length - this.pageSize) : 0;
  }

  private get pageSize(): number {
    return SCREEN_ROWS - 4;
  }

  onKey(k: KeyInput): void {
    const max = Math.max(0, this.lines.length - this.pageSize);
    switch (k.key) {
      case 'Escape':
      case 'Enter':
      case ' ':
      case 'q':
        this.app.screens.pop();
        return;
      case 'ArrowDown':
      case 'j':
        this.scroll = Math.min(max, this.scroll + 1);
        return;
      case 'ArrowUp':
      case 'k':
        this.scroll = Math.max(0, this.scroll - 1);
        return;
      case 'PageDown':
        this.scroll = Math.min(max, this.scroll + this.pageSize);
        return;
      case 'PageUp':
        this.scroll = Math.max(0, this.scroll - this.pageSize);
        return;
    }
  }

  render(term: Terminal): void {
    term.box(0, 0, SCREEN_COLS, SCREEN_ROWS, 'darkGray', this.title);
    const visible = this.lines.slice(this.scroll, this.scroll + this.pageSize);
    visible.forEach((l, i) => term.print(2, 2 + i, l, 'lightGray', 'black', SCREEN_COLS - 4));
    const more = this.lines.length > this.pageSize;
    const hint = more ? '↑/↓ PgUp/PgDn rolam · Esc fecha' : 'Esc fecha';
    term.print(SCREEN_COLS - hint.length - 3, SCREEN_ROWS - 1, ` ${hint} `, 'darkGray');
  }
}
