import type { Screen } from '../engine/screens';
import type { Terminal } from '../engine/terminal';
import type { KeyInput } from '../data/keymap';
import { commandForKey } from '../data/keymap';
import { tileDef } from '../data/tiles';
import type { Game } from '../core/game';
import { level } from '../core/game';
import { idx } from '../core/map';
import { playerAction } from '../core/turn';
import { formatMessage } from '../core/log';
import { FOOT_Y, MAP_X, MAP_Y, MSG_LINES, SIDE_X } from './layout';

export class GameScreen implements Screen {
  constructor(private game: Game) {}

  onKey(k: KeyInput): void {
    const cmd = commandForKey(k);
    if (!cmd) return;
    if (cmd.name === 'move' || cmd.name === 'run') playerAction(this.game, { type: 'move', dx: cmd.dx!, dy: cmd.dy! });
    else if (cmd.name === 'wait') playerAction(this.game, { type: 'wait' });
  }

  render(term: Terminal): void {
    const game = this.game;
    const { map, actors } = level(game);
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const def = tileDef(map.tiles[idx(map, x, y)]);
        term.set(MAP_X + x, MAP_Y + y, def.glyph, def.fg, def.bg);
      }
    }
    for (const a of actors) term.set(MAP_X + a.x, MAP_Y + a.y, a.glyph, a.color);
    const p = game.player;
    term.set(MAP_X + p.x, MAP_Y + p.y, p.glyph, p.color);

    // Mensagens: as últimas MSG_LINES, as do turno atual em destaque.
    const recent = game.log.slice(-MSG_LINES);
    recent.forEach((m, i) => {
      const fresh = m.turn >= game.turn - 1;
      term.print(1, i, formatMessage(m), fresh ? m.color : 'darkGray', 'black', 98);
    });

    term.print(SIDE_X, MAP_Y, 'Turno', 'darkGray');
    term.print(SIDE_X + 6, MAP_Y, String(game.turn), 'white');
    term.print(0, FOOT_Y + 1, 'Mova com {white}hjklyubn{/}, {white}setas{/} ou {white}numpad{/}. {white}.{/} espera.', 'darkGray');
  }
}
