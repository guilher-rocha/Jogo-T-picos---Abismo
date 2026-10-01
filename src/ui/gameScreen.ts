import type { Screen } from '../engine/screens';
import type { Terminal } from '../engine/terminal';
import type { KeyInput } from '../data/keymap';
import { commandForKey } from '../data/keymap';
import { tileDef } from '../data/tiles';
import type { Game } from '../core/game';
import { movePlayer } from '../core/game';
import { idx } from '../core/map';
import { FOOT_Y, MAP_X, MAP_Y, SIDE_X } from './layout';

export class GameScreen implements Screen {
  constructor(private game: Game) {}

  onKey(k: KeyInput): void {
    const cmd = commandForKey(k);
    if (!cmd) return;
    if (cmd.name === 'move' || cmd.name === 'run') movePlayer(this.game, cmd.dx!, cmd.dy!);
    else if (cmd.name === 'wait') this.game.turn++;
  }

  render(term: Terminal): void {
    const { map, player } = this.game;
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const def = tileDef(map.tiles[idx(map, x, y)]);
        term.set(MAP_X + x, MAP_Y + y, def.glyph, def.fg, def.bg);
      }
    }
    term.set(MAP_X + player.x, MAP_Y + player.y, player.glyph, player.color);
    term.print(SIDE_X, MAP_Y, 'Turno', 'darkGray');
    term.print(SIDE_X + 6, MAP_Y, String(this.game.turn), 'white');
    term.print(0, FOOT_Y + 1, 'Mova com {white}hjklyubn{/}, {white}setas{/} ou {white}numpad{/}. {white}.{/} espera.', 'darkGray');
  }
}
