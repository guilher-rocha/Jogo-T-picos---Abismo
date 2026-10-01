import type { Screen } from '../engine/screens';
import type { Terminal } from '../engine/terminal';
import type { KeyInput } from '../data/keymap';
import type { ChallengeCode } from '../core/challenge';
import { decodeChallenge } from '../core/challenge';
import { RACES } from '../data/races';
import { CLASSES } from '../data/classes';
import type { App } from './app';
import { SCREEN_COLS, SCREEN_ROWS } from './layout';

/** Digitar (ou colar com Ctrl+V) um código de desafio recebido de um amigo. */
export class CodeEntryScreen implements Screen {
  private text = '';
  private error = '';

  constructor(private app: App, private onAccept: (c: ChallengeCode) => void) {}

  onKey(k: KeyInput): void {
    if (k.key === 'Escape') {
      this.app.showTitle();
      return;
    }
    if (k.ctrl && (k.key === 'v' || k.key === 'V')) {
      navigator.clipboard?.readText().then((t) => (this.text = t.trim().toUpperCase().slice(0, 40))).catch(() => {});
      return;
    }
    if (k.key === 'Backspace') this.text = this.text.slice(0, -1);
    else if (k.key === 'Enter') {
      const c = decodeChallenge(this.text);
      if (c) this.onAccept(c);
      else this.error = 'Código inválido. Confira as letras e os traços.';
    } else if (k.key.length === 1 && /[0-9a-zA-Z-]/.test(k.key) && this.text.length < 40) {
      this.text += k.key.toUpperCase();
      this.error = '';
    }
  }

  render(term: Terminal, time: number): void {
    term.box(0, 0, SCREEN_COLS, SCREEN_ROWS, 'darkGray', 'Aceitar desafio');
    term.print(4, 3, 'Um amigo jogou uma partida e te desafiou a fazer mais pontos com o mesmo mundo e o mesmo personagem.', 'lightGray', 'black', SCREEN_COLS - 8);
    term.print(4, 5, 'Digite o código do desafio (ou cole com Ctrl+V):', 'white');
    term.print(4, 7, `> ${this.text}${Math.floor(time / 400) % 2 ? '_' : ' '}`, 'yellow');
    const c = decodeChallenge(this.text);
    if (c) {
      const race = RACES.find((r) => r.id === c.raceId)!.name;
      const cls = CLASSES.find((x) => x.id === c.classId)!.name;
      term.print(4, 10, `Personagem: {white}${race} ${cls}{/}   Meta: {gold}${c.score} pontos{/}`, 'lightGray');
      term.print(4, 12, '[Enter] aceitar o desafio', 'lightGreen');
    }
    if (this.error) term.print(4, 10, this.error, 'lightRed');
    term.print(4, SCREEN_ROWS - 2, '[Esc] voltar', 'darkGray');
  }
}
