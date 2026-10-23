import { sound } from '../engine/sound';
import type { Screen } from '../engine/screens';
import type { Terminal } from '../engine/terminal';
import type { KeyInput } from '../data/keymap';
import type { Game } from '../core/game';
import { computeScore } from '../core/score';
import { morgueLines } from '../core/morgue';
import { encodeChallenge } from '../core/challenge';
import { wrapText } from '../engine/terminal';
import type { App } from './app';
import { K } from '../gfx/keys';
import { drawGraveScene } from './graveScene';
import { drawHeroStage } from './heroStage';
import { SCREEN_COLS, SCREEN_ROWS } from './layout';

/** Janelas do fim de partida (em células): o logotipo em cima, a cena (lápide ou herói vitorioso) embaixo. */
const LOGO_RECT = { cx: 14, cy: 1, cw: 72, ch: 6 };
const SCENE_RECT = { cx: 30, cy: 8, cw: 40, ch: 13 };

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

  constructor(private app: App, private game: Game, private rank: number) {
    sound.setMusicTheme(game.over?.won ? 'victory' : 'gameover');
  }

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
    // Multijogador: todos voltam para a sala de espera para jogar de novo.
    if (this.app.backToLobby()) return;
    this.app.showHighScores(false, this.rank);
  }

  render(term: Terminal, time: number): void {
    if (this.phase === 'banner') this.renderBanner(term, time);
    else this.renderSummary(term);
  }

  private renderBanner(term: Terminal, time: number): void {
    const won = !!this.game.over?.won;
    const h = this.game.hero;
    const score = computeScore(this.game).total;
    // Logotipo em pixel art: surge aos poucos e um brilho passa pelas letras.
    const { cx, cy, cw, ch } = LOGO_RECT;
    term.icon(won ? K.ui('victory') : K.ui('gameover'), cx, cy, cw, ch, { frame: Math.floor(this.elapsed / 85) % 16, alpha: Math.min(1, this.elapsed / 500) });
    if (won) {
      drawHeroStage(term, SCENE_RECT, h.raceId, h.classId, time, { victory: true });
      term.printCenter(22, `${h.name} conquistou o Coração do Abismo!`, 'yellow');
      term.printCenter(23, this.game.over!.cause, 'lightGray');
      term.printCenter(24, `${score} pontos`, 'gold');
    } else {
      drawGraveScene(term, SCENE_RECT, time);
      term.printCenter(21, `{white}${h.name}{/} — nível ${h.level}`, 'lightGray');
      wrapText(this.game.over?.cause ?? '', 70).slice(0, 2).forEach((l, i) => term.printCenter(22 + i, l, 'lightGray'));
      term.printCenter(24, `no andar ${this.game.depth} · {gold}${score} pontos{/}`, 'lightGray');
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
