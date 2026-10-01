import type { Screen } from '../engine/screens';
import type { Terminal } from '../engine/terminal';
import type { KeyInput } from '../data/keymap';
import { commandForKey } from '../data/keymap';
import type { Game } from '../core/game';
import { isFree, level, message } from '../core/game';
import { DIRS8 } from '../core/map';
import { createMonster } from '../core/monster';
import { MONSTERS } from '../data/monsters';
import { createGame } from '../core/world';
import { playerAction } from '../core/turn';
import { FOOT_Y, SIDE_X } from './layout';
import { drawMap } from './mapView';
import { drawMessages, drawSidebar } from './hud';

export interface GameScreenOptions {
  debug: boolean;
}

export class GameScreen implements Screen {
  constructor(private game: Game, private opts: GameScreenOptions = { debug: false }) {}

  onKey(k: KeyInput): void {
    if (this.opts.debug && this.debugKey(k)) return;
    if (this.game.over) {
      // Provisório (a tela de Game Over vem na Etapa 3): Enter recomeça.
      if (k.key === 'Enter') this.game = createGame((this.game.seed * 31 + 7) >>> 0);
      return;
    }
    const cmd = commandForKey(k);
    if (!cmd) return;
    if (cmd.name === 'move' || cmd.name === 'run') playerAction(this.game, { type: 'move', dx: cmd.dx!, dy: cmd.dy! });
    else if (cmd.name === 'wait') playerAction(this.game, { type: 'wait' });
  }

  /** Comandos de depuração (só com ?debug=1 na URL). */
  private debugKey(k: KeyInput): boolean {
    if (k.key === 'F2') {
      this.game = createGame((this.game.seed * 31 + 7) >>> 0);
      message(this.game, `[debug] novo mapa, seed ${this.game.seed}`, 'lightMagenta');
      return true;
    }
    if (k.key === 'F3') {
      const map = level(this.game).map;
      map.explored.fill(1);
      map.visible.fill(1);
      message(this.game, '[debug] mapa revelado', 'lightMagenta');
      return true;
    }
    if (k.key === 'F4') {
      const g = this.game;
      const d = DIRS8.find((d) => isFree(g, g.player.x + d.x, g.player.y + d.y));
      if (d) {
        const m = createMonster(g, g.rng.loot.pick(MONSTERS), g.player.x + d.x, g.player.y + d.y, g.rng.loot);
        m.ai.state = 'hunting';
        level(g).actors.push(m);
        message(g, `[debug] ${m.name} criado`, 'lightMagenta');
      }
      return true;
    }
    return false;
  }

  render(term: Terminal): void {
    const game = this.game;
    drawMap(term, game);
    drawMessages(term, game);
    drawSidebar(term, game);
    if (this.opts.debug) term.print(SIDE_X, FOOT_Y - 1, `seed ${game.seed}`, 'lightMagenta');
    if (game.over) {
      term.print(0, FOOT_Y + 1, `{red}Você morreu{/} (${game.over.cause}). Pressione {white}Enter{/} para recomeçar.`, 'lightGray');
    } else {
      term.print(0, FOOT_Y + 1, 'Mova/ataque com {white}hjklyubn{/}, {white}setas{/} ou {white}numpad{/}. {white}.{/} espera.', 'darkGray');
    }
  }
}
