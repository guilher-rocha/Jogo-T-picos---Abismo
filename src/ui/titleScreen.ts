import type { Screen } from '../engine/screens';
import type { Terminal } from '../engine/terminal';
import type { Color } from '../engine/colors';
import type { KeyInput } from '../data/keymap';
import { KEY_HELP } from '../data/keymap';
import type { App } from './app';
import { LOGO, DUNGEON_GATE } from './art';
import { SCREEN_COLS, SCREEN_ROWS } from './layout';
import { TextWindow } from './textWindow';

/** Tempo parado na tela de título até começar a demonstração (ms). */
export const ATTRACT_DELAY = 20000;

const FLAME: Color[] = ['red', 'orange', 'yellow', 'orange', 'lightRed'];

/** Pseudoaleatório só para efeitos visuais (não afeta o jogo). */
function flicker(t: number, salt: number): number {
  const x = Math.sin(Math.floor(t / 110) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

interface Entry {
  label: string;
  enabled: () => boolean;
  run: () => void;
}

export class TitleScreen implements Screen {
  private idle = 0;
  private cursor = 0;
  private entries: Entry[];

  constructor(private app: App) {
    this.entries = [
      { label: 'Novo jogo', enabled: () => true, run: () => app.newGame() },
      { label: 'Continuar', enabled: () => app.hasSave(), run: () => app.continueGame() },
      { label: 'Desafio diário', enabled: () => app.features.daily, run: () => app.dailyChallenge() },
      { label: 'Aceitar desafio', enabled: () => app.features.daily, run: () => app.acceptChallenge() },
      { label: 'Recordes', enabled: () => true, run: () => app.showHighScores(false) },
      { label: 'Opções', enabled: () => app.features.options, run: () => app.showOptions() },
      { label: 'Como jogar', enabled: () => true, run: () => this.help() },
      { label: 'Créditos', enabled: () => true, run: () => this.credits() },
    ];
  }

  onEnter(): void {
    this.idle = 0;
    if (!this.entries[this.cursor].enabled()) this.cursor = 0;
  }

  update(dt: number): void {
    this.idle += dt;
    if (this.idle >= ATTRACT_DELAY && this.app.screens.top === this) this.app.startAttract();
  }

  onKey(k: KeyInput): void {
    this.idle = 0;
    const n = this.entries.length;
    if (k.key === 'ArrowDown' || k.key === 'j') {
      do this.cursor = (this.cursor + 1) % n; while (!this.entries[this.cursor].enabled());
      return;
    }
    if (k.key === 'ArrowUp' || k.key === 'k') {
      do this.cursor = (this.cursor - 1 + n) % n; while (!this.entries[this.cursor].enabled());
      return;
    }
    if (k.key === 'Enter' || k.key === ' ' || k.key === 'Mouse') {
      this.entries[this.cursor].run();
      return;
    }
    const i = 'abcdefgh'.indexOf(k.key);
    if (i >= 0 && i < n && this.entries[i].enabled()) this.entries[i].run();
  }

  private help(): void {
    const lines = [
      '{yellow}Objetivo{/}',
      'Desça os 20 andares do Abismo, derrote o Guardião e pegue o Coração do Abismo.',
      'Depois, invoque o Coração (&) para vencer — ou suba a pé até a superfície por muito mais pontos.',
      'A morte é permanente: se você morrer, a partida acaba.',
      '',
      '{yellow}Dicas{/}',
      '· Monstros só agem quando você age: pense antes de cada passo.',
      '· Esbarre num monstro para atacá-lo. Fuja de grupos para corredores.',
      '· Desça (>) para ganhar experiência, mas não rápido demais.',
      '· Descanse (R) para recuperar vida quando não houver inimigos por perto.',
      '· Procure (s) portas secretas em becos sem saída.',
      '',
      '{yellow}Teclas{/}',
      ...KEY_HELP.map(([key, desc]) => `{white}${key.padEnd(28)}{/} ${desc}`),
    ];
    this.app.screens.push(new TextWindow(this.app, 'Como jogar', lines));
  }

  private credits(): void {
    this.app.screens.push(new TextWindow(this.app, 'Créditos', [
      '{yellow}ABISMO{/} — um roguelike em ASCII',
      '',
      'Inspirado em Rogue (1980), NetHack e Angband.',
      'Feito em TypeScript + Canvas, rodando no navegador.',
      '',
      'Desenvolvido com um agente de codificação (Claude Code, modelo Claude Opus 5.5)',
      'para a Atividade 02 — Criando um Jogo.',
      '',
      'Gráficos: caracteres. Sons: sintetizados. Imaginação: sua.',
    ]));
  }

  render(term: Terminal, time: number): void {
    const logoW = Math.max(...LOGO.map((l) => l.length));
    const lx = Math.floor((SCREEN_COLS - logoW) / 2);
    // Logo com um brilho que "respira".
    LOGO.forEach((line, i) => {
      const phase = (Math.sin(time / 700 + i * 0.6) + 1) / 2;
      const color: Color = phase > 0.75 ? 'yellow' : phase > 0.4 ? 'orange' : 'red';
      term.print(lx, 2 + i, line, color);
    });
    // Tochas tremulando dos dois lados.
    for (const [x, salt] of [[lx - 8, 1], [lx + logoW + 6, 2]] as const) {
      const f = flicker(time, salt);
      term.set(x, 3, f > 0.5 ? '^' : '*', FLAME[Math.floor(f * FLAME.length)]);
      term.set(x, 4, '|', 'brown');
      term.set(x, 5, '|', 'brown');
    }
    term.printCenter(8, 'Uma descida às profundezas da terra', 'lightGray');

    // Portal da masmorra.
    const gx = Math.floor((SCREEN_COLS - DUNGEON_GATE[0].length) / 2);
    DUNGEON_GATE.forEach((l, i) => term.print(gx, 10 + i, l, 'darkGray'));
    term.set(gx + DUNGEON_GATE[5].indexOf('>'), 15, '>', Math.floor(time / 500) % 2 ? 'white' : 'yellow');

    // Menu
    const my = 17;
    this.entries.forEach((e, i) => {
      const sel = i === this.cursor;
      const enabled = e.enabled();
      const text = `${'abcdefgh'[i]}) ${e.label}`;
      const x = Math.floor(SCREEN_COLS / 2) - 9;
      term.print(x, my + i, sel ? `▶ ${text}` : `  ${text}`, !enabled ? 'darkGray' : sel ? 'yellow' : 'lightGray');
    });

    const best = this.app.highScores[0];
    if (best) term.printCenter(SCREEN_ROWS - 3, `Recorde: {gold}${best.score}{/} — ${best.name}, ${best.race} ${best.cls}`, 'darkGray');
    if (Math.floor(time / 600) % 2 === 0) term.printCenter(SCREEN_ROWS - 2, '[setas] escolhe · [Enter] confirma', 'darkGray');
  }
}
