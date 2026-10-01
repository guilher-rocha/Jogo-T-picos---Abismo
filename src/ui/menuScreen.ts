import type { Screen } from '../engine/screens';
import type { Terminal } from '../engine/terminal';
import type { Color } from '../engine/colors';
import type { KeyInput } from '../data/keymap';
import type { App } from './app';
import { SCREEN_COLS } from './layout';

export interface MenuEntry {
  label: string;
  detail?: string;
  color?: Color;
  disabled?: boolean;
}

export const LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Lista modal: escolhe por letra ou com setas + Enter. */
export class MenuScreen implements Screen {
  readonly modal = true;
  private cursor = 0;

  constructor(
    private app: App,
    private title: string,
    private entries: MenuEntry[],
    private onSelect: (index: number) => void,
    private opts: { width?: number; footer?: string; keepOpen?: boolean } = {},
  ) {
    this.cursor = Math.max(0, entries.findIndex((e) => !e.disabled));
  }

  onKey(k: KeyInput): void {
    if (k.key === 'Escape') {
      this.app.screens.pop();
      return;
    }
    if (k.key === 'ArrowDown' || k.key === 'ArrowUp') {
      const n = this.entries.length;
      if (!n) return;
      this.cursor = (this.cursor + (k.key === 'ArrowDown' ? 1 : -1) + n) % n;
      return;
    }
    let index = -1;
    if (k.key === 'Enter') index = this.cursor;
    else if (k.key.length === 1) index = LETTERS.indexOf(k.key);
    if (index < 0 || index >= this.entries.length || this.entries[index].disabled) return;
    if (!this.opts.keepOpen) this.app.screens.pop();
    this.onSelect(index);
  }

  render(term: Terminal): void {
    const w = this.opts.width ?? 70;
    const h = Math.min(26, this.entries.length + 4 + (this.opts.footer ? 1 : 0));
    const x = Math.floor((SCREEN_COLS - w) / 2);
    const y = 2;
    term.box(x, y, w, h, 'lightGray', this.title);
    if (!this.entries.length) term.print(x + 2, y + 2, '(nada)', 'darkGray');
    this.entries.slice(0, h - 4).forEach((e, i) => {
      const sel = i === this.cursor;
      const bg = sel ? 'darkBlue' : 'black';
      term.fill(x + 1, y + 2 + i, w - 2, 1, ' ', 'lightGray', bg);
      const color: Color = e.disabled ? 'darkGray' : e.color ?? 'white';
      term.print(x + 2, y + 2 + i, `${LETTERS[i]}) `, e.disabled ? 'darkGray' : 'yellow', bg);
      const detailW = e.detail ? e.detail.length + 2 : 0;
      term.print(x + 5, y + 2 + i, e.label, color, bg, w - 7 - detailW);
      if (e.detail) term.print(x + w - 2 - e.detail.length, y + 2 + i, e.detail, e.disabled ? 'darkGray' : 'lightGray', bg);
    });
    if (this.opts.footer) term.print(x + 2, y + h - 2, this.opts.footer, 'darkGray', 'black', w - 4);
  }
}

/** Pergunta uma direção ("Em que direção?"). */
export class DirectionPrompt implements Screen {
  readonly modal = true;

  constructor(
    private app: App,
    private prompt: string,
    private onDir: (dx: number, dy: number) => void,
    private toDir: (k: KeyInput) => [number, number] | null,
  ) {}

  onKey(k: KeyInput): void {
    if (k.key === 'Escape') {
      this.app.screens.pop();
      return;
    }
    const d = this.toDir(k);
    if (!d) return;
    this.app.screens.pop();
    this.onDir(d[0], d[1]);
  }

  render(term: Terminal): void {
    term.fill(0, 0, SCREEN_COLS, 3);
    term.print(1, 0, this.prompt, 'yellow');
    term.print(1, 1, '[direção] escolhe · [Esc] cancela', 'darkGray');
  }
}
