import type { Screen } from '../engine/screens';
import type { Terminal } from '../engine/terminal';
import type { KeyInput } from '../data/keymap';
import { THEMES } from '../engine/themes';
import type { App } from './app';
import { SCREEN_COLS, SCREEN_ROWS } from './layout';

export interface Settings {
  theme: string;
  /** Volume dos efeitos, 0–10. */
  sfx: number;
  music: boolean;
  /** Velocidade das animações: 0 = desligadas. */
  animSpeed: number;
  hints: boolean;
}

export const DEFAULT_SETTINGS: Settings = { theme: 'classic', sfx: 5, music: true, animSpeed: 1, hints: true };

const SPEEDS = [0, 0.5, 1, 2, 4];

interface Row {
  label: string;
  value: () => string;
  change: (dir: number) => void;
}

/** Opções: ←/→ mudam o valor, ↑/↓ escolhem a linha, Esc salva e volta. */
export class OptionsScreen implements Screen {
  private cursor = 0;
  private rows: Row[];

  constructor(private app: App, private onClose: () => void) {
    const s = app.settings;
    this.rows = [
      {
        label: 'Tema visual',
        value: () => THEMES.find((t) => t.id === s.theme)?.name ?? s.theme,
        change: (d) => {
          const i = THEMES.findIndex((t) => t.id === s.theme);
          s.theme = THEMES[(i + d + THEMES.length) % THEMES.length].id;
        },
      },
      { label: 'Volume dos efeitos', value: () => `${'█'.repeat(s.sfx)}${'░'.repeat(10 - s.sfx)} ${s.sfx}`, change: (d) => (s.sfx = Math.max(0, Math.min(10, s.sfx + d))) },
      { label: 'Música', value: () => (s.music ? 'ligada' : 'desligada'), change: () => (s.music = !s.music) },
      {
        label: 'Animações',
        value: () => (s.animSpeed === 0 ? 'desligadas' : `velocidade ×${s.animSpeed}`),
        change: (d) => {
          const i = SPEEDS.indexOf(s.animSpeed);
          s.animSpeed = SPEEDS[Math.max(0, Math.min(SPEEDS.length - 1, (i < 0 ? 2 : i) + d))];
        },
      },
      { label: 'Dicas para iniciantes', value: () => (s.hints ? 'sim' : 'não'), change: () => (s.hints = !s.hints) },
    ];
  }

  onKey(k: KeyInput): void {
    if (k.key === 'Escape' || k.key === 'Enter') {
      this.app.applySettings(true);
      this.onClose();
      return;
    }
    if (k.key === 'ArrowDown' || k.key === 'j') this.cursor = (this.cursor + 1) % this.rows.length;
    else if (k.key === 'ArrowUp' || k.key === 'k') this.cursor = (this.cursor - 1 + this.rows.length) % this.rows.length;
    else if (k.key === 'ArrowLeft' || k.key === 'h') this.rows[this.cursor].change(-1);
    else if (k.key === 'ArrowRight' || k.key === 'l' || k.key === ' ') this.rows[this.cursor].change(1);
    else return;
    this.app.applySettings(false);
  }

  render(term: Terminal): void {
    term.box(0, 0, SCREEN_COLS, SCREEN_ROWS, 'darkGray', 'Opções');
    this.rows.forEach((r, i) => {
      const sel = i === this.cursor;
      term.print(10, 5 + i * 2, `${sel ? '▶ ' : '  '}${r.label.padEnd(24)}`, sel ? 'yellow' : 'lightGray');
      term.print(38, 5 + i * 2, `◀ ${r.value()} ▶`, sel ? 'white' : 'lightGray');
    });
    term.printCenter(SCREEN_ROWS - 4, 'Exemplo de cores:  {red}vermelho{/} {green}verde{/} {yellow}amarelo{/} {lightBlue}azul{/} {lightMagenta}magenta{/} {lightCyan}ciano{/} {darkGray}cinza{/}', 'white');
    term.printCenter(SCREEN_ROWS - 2, '[↑/↓] escolhe · [←/→] muda · [Esc] salva e volta', 'darkGray');
  }
}
