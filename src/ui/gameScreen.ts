import type { Screen } from '../engine/screens';
import type { Terminal } from '../engine/terminal';
import type { KeyInput } from '../data/keymap';
import { commandForKey, KEY_HELP } from '../data/keymap';
import type { Game } from '../core/game';
import { isFree, level, message } from '../core/game';
import { DIRS8, getTile, idx, isWalkable } from '../core/map';
import { Tile } from '../data/tiles';
import { formatMessage } from '../core/log';
import { itemsAt } from '../core/item';
import type { App } from './app';
import { TextWindow } from './textWindow';
import { TargetScreen } from './targetScreen';
import { AnimationQueue } from '../engine/animations';
import { playEvents } from './effects';
import { THROW_RANGE } from '../core/actions';
import type { Action } from '../core/actions';
import { createMonster } from '../core/monster';
import { MONSTERS } from '../data/monsters';
import { createGame } from '../core/world';
import { playerAction } from '../core/turn';
import { FOOT_Y, SIDE_X } from './layout';
import { drawMap } from './mapView';
import { drawMessages, drawSidebar } from './hud';

export class GameScreen implements Screen {
  private anims = new AnimationQueue();

  constructor(private app: App, private game: Game) {}

  update(dt: number): void {
    this.anims.update(dt);
  }

  /** Executa uma ação do jogador e transforma o que aconteceu em animações. */
  private act(action: Action): boolean {
    const ok = playerAction(this.game, action);
    playEvents(this.anims, this.game.events);
    return ok;
  }

  onKey(k: KeyInput): void {
    // Uma tecla durante a animação pula a animação (e o comando segue normalmente).
    if (this.anims.busy) this.anims.skipAll();
    if (this.app.debug && this.debugKey(k)) return;
    if (this.game.over) {
      // Provisório (a tela de Game Over vem na Etapa 3): Enter recomeça.
      if (k.key === 'Enter') this.game = createGame((this.game.seed * 31 + 7) >>> 0);
      return;
    }
    const cmd = commandForKey(k);
    if (!cmd) return;
    switch (cmd.name) {
      case 'move':
        this.act({ type: 'move', dx: cmd.dx!, dy: cmd.dy! });
        break;
      case 'run':
        this.run(cmd.dx!, cmd.dy!);
        break;
      case 'wait':
        this.act({ type: 'wait' });
        break;
      case 'throw':
        this.app.screens.push(new TargetScreen(this.app, this.game, {
          mode: 'aim',
          prompt: 'Arremessar o dardo em quem?',
          range: THROW_RANGE,
          onConfirm: (p) => this.act({ type: 'throw', tx: p.x, ty: p.y }),
        }));
        break;
      case 'look':
        this.app.screens.push(new TargetScreen(this.app, this.game, { mode: 'look', prompt: 'Olhar:' }));
        break;
      case 'messages':
        this.app.screens.push(new TextWindow(this.app, 'Mensagens', this.game.log.map((m) => `{${m.color}}${formatMessage(m)}{/}`), { startAtEnd: true }));
        break;
      case 'help':
        this.app.screens.push(new TextWindow(this.app, 'Ajuda — teclas', KEY_HELP.map(([key, desc]) => `{white}${key.padEnd(28)}{/} ${desc}`)));
        break;
    }
  }

  /** Corre numa direção até algo interessante acontecer. */
  private run(dx: number, dy: number): void {
    const g = this.game;
    const visibleMonsters = () => level(g).actors.filter((a) => level(g).map.visible[idx(level(g).map, a.x, a.y)]).length;
    const seen = visibleMonsters();
    const hp = g.player.hp;
    for (let step = 0; step < 80; step++) {
      if (g.over) return;
      const nx = g.player.x + dx;
      const ny = g.player.y + dy;
      if (!isWalkable(level(g).map, nx, ny) || !isFree(g, nx, ny)) {
        if (step === 0) this.act({ type: 'move', dx, dy }); // ataca/abre porta como um passo normal
        return;
      }
      const before = this.openNeighbors();
      if (!this.act({ type: 'move', dx, dy })) return;
      if (g.player.hp < hp || visibleMonsters() > seen) return;
      if (itemsAt(level(g), g.player.x, g.player.y).length) return;
      const t = getTile(level(g).map, g.player.x, g.player.y);
      if (t !== Tile.Floor && t !== Tile.Corridor) return; // escada, porta, fonte...
      if (step > 0 && this.openNeighbors() !== before) return; // bifurcação ou entrada de sala
    }
  }

  private openNeighbors(): number {
    const g = this.game;
    return DIRS8.filter((d) => isWalkable(level(g).map, g.player.x + d.x, g.player.y + d.y)).length;
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
    this.anims.draw(term);
    drawMessages(term, game);
    drawSidebar(term, game);
    if (this.app.debug) term.print(SIDE_X, FOOT_Y - 1, `seed ${game.seed}`, 'lightMagenta');
    if (game.over) {
      term.print(0, FOOT_Y + 1, `{red}Você morreu{/} (${game.over.cause}). Pressione {white}Enter{/} para recomeçar.`, 'lightGray');
    } else {
      term.print(0, FOOT_Y + 1, 'Mova/ataque com {white}hjklyubn{/}, {white}setas{/} ou {white}numpad{/}. {white}.{/} espera.', 'darkGray');
    }
  }
}
