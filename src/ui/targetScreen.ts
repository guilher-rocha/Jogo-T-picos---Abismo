import type { Screen } from '../engine/screens';
import type { Terminal } from '../engine/terminal';
import type { KeyInput } from '../data/keymap';
import { directionForKey } from '../data/keymap';
import type { Game } from '../core/game';
import { level, seesActor } from '../core/game';
import type { Point } from '../core/map';
import { distance, inBounds } from '../core/map';
import { bresenham } from '../core/fov';
import { describeCell } from './describe';
import type { App } from './app';
import { MAP_X, MAP_Y, SCREEN_COLS } from './layout';

export interface TargetOptions {
  /** 'aim' escolhe um alvo; 'look' só inspeciona. */
  mode: 'aim' | 'look';
  prompt: string;
  range?: number;
  onConfirm?: (p: Point) => void;
}

/** Cursor sobre o mapa: Tab cicla alvos, direções movem, Enter confirma, Esc cancela. */
export class TargetScreen implements Screen {
  readonly modal = true;
  private cursor: Point;
  private targets: Point[];
  private targetIndex = 0;

  constructor(private app: App, private game: Game, private opts: TargetOptions) {
    const lvl = level(game);
    const p = game.player;
    this.targets = lvl.actors
      .filter((a) => seesActor(game, a))
      .sort((a, b) => distance(a, p) - distance(b, p))
      .map((a) => ({ x: a.x, y: a.y }));
    this.cursor = this.targets[0] ?? { x: p.x, y: p.y };
  }

  onKey(k: KeyInput): void {
    if (k.key === 'Escape') {
      this.app.screens.pop();
      return;
    }
    if (k.key === 'Tab' || k.key === '+' || k.key === '-') {
      if (!this.targets.length) return;
      const step = k.shift || k.key === '-' ? -1 : 1;
      this.targetIndex = (this.targetIndex + step + this.targets.length) % this.targets.length;
      this.cursor = { ...this.targets[this.targetIndex] };
      return;
    }
    const confirmKeys = ['Enter', 't', 'f', 'z', 'm', '.', ' '];
    if (this.opts.mode === 'aim' && confirmKeys.includes(k.key) && k.code !== 'Numpad5') {
      this.app.screens.pop();
      if (this.cursor.x !== this.game.player.x || this.cursor.y !== this.game.player.y) this.opts.onConfirm?.(this.cursor);
      return;
    }
    const dir = directionForKey(k);
    if (dir) {
      const n = k.shift || (k.key.length === 1 && k.key !== k.key.toLowerCase()) ? 5 : 1;
      const map = level(this.game).map;
      const nx = Math.max(0, Math.min(map.width - 1, this.cursor.x + dir[0] * n));
      const ny = Math.max(0, Math.min(map.height - 1, this.cursor.y + dir[1] * n));
      this.cursor = { x: nx, y: ny };
    }
  }

  render(term: Terminal, time: number): void {
    const map = level(this.game).map;
    const p = this.game.player;
    if (this.opts.mode === 'aim') {
      const line = bresenham(p.x, p.y, this.cursor.x, this.cursor.y).slice(1);
      line.forEach((c, i) => {
        if (!inBounds(map, c.x, c.y)) return;
        const inRange = this.opts.range === undefined || i < this.opts.range;
        term.setBg(MAP_X + c.x, MAP_Y + c.y, inRange ? 'darkBlue' : 'darkRed');
      });
    }
    const blink = Math.floor(time / 300) % 2 === 0;
    term.setBg(MAP_X + this.cursor.x, MAP_Y + this.cursor.y, blink ? 'brown' : 'darkGray');

    term.fill(0, 0, SCREEN_COLS, 3);
    term.print(1, 0, this.opts.prompt, 'yellow');
    const desc = describeCell(this.game, this.cursor.x, this.cursor.y);
    term.print(1, 1, desc, 'white', 'black', SCREEN_COLS - 2);
    const hint = this.opts.mode === 'aim'
      ? '[direções] move · [Tab] próximo alvo · [Enter] confirma · [Esc] cancela'
      : '[direções] move · [Tab] próximo monstro · [Esc] sai';
    term.print(1, 2, hint, 'darkGray');
  }
}
