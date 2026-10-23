import type { Screen } from '../engine/screens';
import type { Terminal } from '../engine/terminal';
import type { KeyInput } from '../data/keymap';
import { registry } from '../engine/atlas';
import { sound } from '../engine/sound';
import { RACES } from '../data/races';
import { CLASSES } from '../data/classes';
import { K } from '../gfx/keys';
import { PARTY_TEXT_COLORS } from '../core/party';
import type { NetClient } from '../net/client';
import { decodeSnapshot } from '../net/protocol';
import type { App } from './app';
import { GameScreen } from './gameScreen';
import { SCREEN_COLS, SCREEN_ROWS } from './layout';

/**
 * Sala de espera do multijogador: quem está conectado, quem está pronto, chat. O líder (primeiro a entrar)
 * inicia a partida; quando o primeiro estado chega, todos vão para o jogo.
 */
export class LobbyScreen implements Screen {
  private chatting = false;
  private draft = '';

  constructor(private app: App, private net: NetClient) {}

  onEnter(): void {
    sound.setMusicTheme('title');
    // Estados velhos (de uma partida que acabou) não contam.
    if (!this.net.lobby?.inGame) this.net.states = [];
  }

  update(): void {
    const first = this.net.states.shift();
    if (!first) return;
    // A partida começou (ou voltamos para ela depois de reconectar).
    const game = decodeSnapshot(first.snapshot, first.you);
    const screen = new GameScreen(this.app, game, this.net);
    screen.applyNet(first);
    this.app.screens.replace(screen);
  }

  onKey(k: KeyInput): void {
    if (this.chatting) {
      if (k.key === 'Escape') this.chatting = false;
      else if (k.key === 'Enter') {
        if (this.draft.trim()) this.net.send({ t: 'chat', text: this.draft });
        this.draft = '';
        this.chatting = false;
      } else if (k.key === 'Backspace') this.draft = this.draft.slice(0, -1);
      else if (k.key.length === 1 && this.draft.length < 100) this.draft += k.key;
      return;
    }
    const me = this.net.me();
    if (k.key === 'Escape') {
      this.net.leave();
      this.app.showTitle();
    } else if (k.key === ' ' && me) this.net.send({ t: 'ready', ready: !me.ready });
    else if (k.key === 'Enter' && me?.leader) this.net.send({ t: 'start' });
    else if (k.key === 'c' || k.key === 'C') this.chatting = true;
  }

  render(term: Terminal, time: number): void {
    const net = this.net;
    term.box(0, 0, SCREEN_COLS, SCREEN_ROWS, 'darkGray', 'Multijogador — rede local');
    const status =
      net.status === 'open' ? `{lightGreen}Conectado{/} a ${net.url}`
        : net.status === 'connecting' ? `{yellow}Conectando a ${net.url}...{/}`
          : `{lightRed}Sem conexão{/} com ${net.url} — tentando de novo...`;
    term.print(3, 2, status, 'lightGray', 'black', SCREEN_COLS - 6);
    if (net.error) term.print(3, 3, net.error, 'lightRed', 'black', SCREEN_COLS - 6);

    const players = net.lobby?.players ?? [];
    term.print(3, 5, `Jogadores na sala (${players.length}/4):`, 'white');
    players.forEach((p, i) => {
      const y = 7 + i * 4;
      const key = K.hero(p.raceId, p.classId);
      if (registry.has(key)) term.icon(key, 4, y, 4, 3, { frame: Math.floor(time / 560) % 2, align: 'bottom', backdrop: '#12102a' });
      const race = RACES.find((r) => r.id === p.raceId)?.name ?? p.raceId;
      const cls = CLASSES.find((c) => c.id === p.classId)?.name ?? p.classId;
      const color = PARTY_TEXT_COLORS[i % PARTY_TEXT_COLORS.length];
      const tags = [p.leader ? '{gold}líder{/}' : '', p.id === net.myId ? '{lightCyan}você{/}' : '', p.connected ? '' : '{darkGray}desconectado{/}'].filter(Boolean).join(' · ');
      term.print(10, y, `{${color}}${p.name}{/}  ${tags}`, 'white', 'black', 50);
      term.print(10, y + 1, `${race} ${cls}`, 'lightGray');
      term.print(10, y + 2, p.ready || p.leader ? '{lightGreen}✓ pronto{/}' : '{darkGray}esperando...{/}', 'lightGray');
    });
    if (!players.length && net.status === 'open') term.print(4, 7, 'Entrando na sala...', 'darkGray');

    // Chat
    const cx = 64;
    term.print(cx, 5, 'Conversa:', 'white');
    const chat = net.lobby?.chat ?? [];
    chat.slice(-12).forEach((line, i) => term.print(cx, 7 + i, line, 'lightCyan', 'black', SCREEN_COLS - cx - 3));
    if (this.chatting) term.print(cx, 20, `> ${this.draft}${Math.floor(time / 400) % 2 ? '_' : ' '}`, 'yellow', 'black', SCREEN_COLS - cx - 3);

    const me = net.me();
    const hints = [
      me?.leader ? '{white}[Enter]{/} iniciar a partida' : 'o líder inicia a partida',
      me && !me.leader ? `{white}[Espaço]{/} ${me.ready ? 'não estou pronto' : 'estou pronto'}` : '',
      '{white}[c]{/} conversar',
      '{white}[Esc]{/} sair',
    ].filter(Boolean);
    term.print(3, SCREEN_ROWS - 4, hints.join('  ·  '), 'darkGray', 'black', SCREEN_COLS - 6);
    term.print(3, SCREEN_ROWS - 3, `Amigos na mesma rede: abram {white}http://${location.host}{/} no navegador e escolham "Multijogador".`, 'darkGray', 'black', SCREEN_COLS - 6);
  }
}
