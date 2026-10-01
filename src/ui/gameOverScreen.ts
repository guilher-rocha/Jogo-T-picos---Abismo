import type { Screen } from '../engine/screens';
import type { Terminal } from '../engine/terminal';
import type { KeyInput } from '../data/keymap';
import type { Game } from '../core/game';
import { computeScore } from '../core/score';
import { morgueLines } from '../core/morgue';
import { encodeChallenge } from '../core/challenge';
import { wrapText } from '../engine/terminal';
import type { App } from './app';
import { GAME_OVER, TOMBSTONE, VICTORY } from './art';
import { SCREEN_COLS, SCREEN_ROWS } from './layout';

/**
 * Fim de partida em duas fases: "GAME OVER" + lápide (ou "VITÓRIA"), depois o resumo.
 * Em seguida mostra o quadro de recordes destacando a posição e volta ao título.
 */
export class GameOverScreen implements Screen {
  private phase: 'banner' | 'summary' = 'banner';
  private elapsed = 0;
  private scroll = 0;
  private copied = false;

  /** Código para desafiar um amigo com este mesmo mundo e personagem. */
  private code(): string {
    return encodeChallenge({ seed: this.game.seed, raceId: this.game.hero.raceId, classId: this.game.hero.classId, score: computeScore(this.game).total });
  }

  constructor(private app: App, private game: Game, private rank: number) {}

  update(dt: number): void {
    this.elapsed += dt;
  }

  onKey(k: KeyInput): void {
    // Evita pular a tela sem querer logo após morrer.
    if (this.elapsed < 600) return;
    if (this.phase === 'banner') {
      this.phase = 'summary';
      return;
    }
    if (k.key === 'ArrowDown' || k.key === 'j') {
      this.scroll++;
      return;
    }
    if (k.key === 'ArrowUp' || k.key === 'k') {
      this.scroll = Math.max(0, this.scroll - 1);
      return;
    }
    if (k.key === 'x' || k.key === 'X') {
      this.app.exportMorgue(this.game);
      return;
    }
    if (k.key === 'c' || k.key === 'C') {
      navigator.clipboard?.writeText(this.code()).catch(() => {});
      this.copied = true;
      return;
    }
    this.app.showHighScores(false, this.rank);
  }

  render(term: Terminal, time: number): void {
    if (this.phase === 'banner') this.renderBanner(term, time);
    else this.renderSummary(term);
  }

  private renderBanner(term: Terminal, time: number): void {
    const won = !!this.game.over?.won;
    const art = won ? VICTORY : GAME_OVER;
    const w = Math.max(...art.map((l) => l.length));
    const x = Math.floor((SCREEN_COLS - w) / 2);
    // O texto "cai" linha a linha no começo.
    const shown = Math.min(art.length, Math.floor(this.elapsed / 120) + 1);
    art.slice(0, shown).forEach((l, i) => term.print(x, 2 + i, l, won ? 'gold' : Math.floor(time / 400) % 2 ? 'red' : 'lightRed'));
    const h = this.game.hero;
    const score = computeScore(this.game).total;
    if (won) {
      term.printCenter(10, `${h.name} conquistou o Coração do Abismo!`, 'yellow');
      term.printCenter(12, this.game.over!.cause, 'lightGray');
      term.printCenter(14, `${score} pontos`, 'gold');
    } else if (this.elapsed > 700) {
      const tx = Math.floor((SCREEN_COLS - TOMBSTONE[TOMBSTONE.length - 1].length) / 2);
      const cause = wrapText(this.game.over?.cause ?? '', 22);
      const text = [h.name, `nível ${h.level}`, ...cause, `no andar ${this.game.depth}`, `${score} pontos`];
      let ti = 0;
      TOMBSTONE.forEach((l, i) => {
        if (l.includes('@')) {
          const t = text[ti++] ?? '';
          const inner = 24;
          const pad = Math.floor((inner - t.length) / 2);
          term.print(tx, 9 + i, l.replace('@' + ' '.repeat(23), ' '.repeat(pad) + t + ' '.repeat(Math.max(0, inner - pad - t.length))), 'lightGray');
        } else term.print(tx, 9 + i, l, i === TOMBSTONE.length - 1 ? 'green' : 'lightGray');
      });
    }
    if (this.rank >= 0) term.printCenter(SCREEN_ROWS - 5, `Novo recorde: ${this.rank + 1}º lugar!`, Math.floor(time / 300) % 2 ? 'gold' : 'yellow');
    if (this.game.challenge) {
      const won = computeScore(this.game).total > this.game.challenge.target;
      term.printCenter(SCREEN_ROWS - 4, won ? `Desafio vencido! Você superou ${this.game.challenge.target} pontos.` : `Desafio perdido: a meta era ${this.game.challenge.target} pontos.`, won ? 'lightGreen' : 'lightRed');
    }
    if (this.elapsed > 600) term.printCenter(SCREEN_ROWS - 2, '[qualquer tecla] continuar', 'darkGray');
  }

  private renderSummary(term: Terminal): void {
    term.box(0, 0, SCREEN_COLS, SCREEN_ROWS, 'darkGray', 'Resumo da partida');
    const lines = morgueLines(this.game).flatMap((l) => (l.length > SCREEN_COLS - 6 ? wrapText(l, SCREEN_COLS - 6) : [l]));
    const page = SCREEN_ROWS - 6;
    this.scroll = Math.min(this.scroll, Math.max(0, lines.length - page));
    lines.slice(this.scroll, this.scroll + page).forEach((l, i) => {
      const color = i + this.scroll === 0 ? 'white' : l.startsWith('PONTUAÇÃO') ? 'gold' : l.endsWith(':') ? 'yellow' : 'lightGray';
      term.print(3, 2 + i, l, color, 'black', SCREEN_COLS - 6);
    });
    term.print(3, SCREEN_ROWS - 3, `Desafie um amigo com este código: {yellow}${this.code()}{/} ${this.copied ? '{lightGreen}(copiado!){/}' : '{darkGray}[c] copiar{/}'}`, 'lightGray');
    term.print(3, SCREEN_ROWS - 1, ' [↑/↓] rolar · [x] exportar morgue (.txt) · [c] copiar código · [qualquer tecla] recordes ', 'darkGray');
  }
}
