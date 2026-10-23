import type { Action } from '../core/actions';
import type { Game } from '../core/game';
import { message } from '../core/game';
import { MAX_PARTY, advanceParty, createPartyGame, memberById, queueAction } from '../core/party';
import { RACES } from '../data/races';
import { CLASSES } from '../data/classes';
import type { ClientMsg, LobbyPlayer, ServerMsg } from './protocol';
import { snapshotFor } from './protocol';

/**
 * A sala do multijogador: sala de espera, início da partida, ações, chat, desconexão e reconexão.
 * Não conhece a rede — recebe mensagens já decodificadas e responde por `Conn.send` — então dá para
 * testar com conexões falsas (tests/net.test.ts). O servidor (server/lan.ts) liga isto ao WebSocket.
 */

export interface Conn {
  send(msg: ServerMsg): void;
}

interface RoomPlayer {
  id: string;
  /** Segredo para reconectar (o navegador guarda e manda de novo no "hello"). */
  token: string;
  name: string;
  raceId: string;
  classId: string;
  ready: boolean;
  conn: Conn | null;
  /** Herói deste jogador na partida em andamento. */
  memberId?: number;
}

const MAX_CHAT = 20;
/** Tira caracteres de controle e chaves de cor ({red}) e limita o tamanho. */
const clean = (s: unknown, max: number): string => String(s ?? '').replace(/[\u0000-\u001f{}]/g, '').trim().slice(0, max);

export class Room {
  players: RoomPlayer[] = [];
  game: Game | null = null;
  chat: string[] = [];
  private seq = 0;

  constructor(
    private newSeed: () => number = () => Date.now() >>> 0,
    private newToken: () => string = () => globalThis.crypto.randomUUID(),
  ) {}

  /** Primeiro jogador conectado: é quem inicia a partida. */
  get leader(): RoomPlayer | null {
    return this.players.find((p) => p.conn) ?? null;
  }

  handle(conn: Conn, msg: ClientMsg): void {
    if (msg.t === 'hello') {
      this.hello(conn, msg);
      return;
    }
    const p = this.players.find((x) => x.conn === conn);
    if (!p) {
      conn.send({ t: 'error', text: 'Entre na sala primeiro.' });
      return;
    }
    switch (msg.t) {
      case 'ready':
        if (!this.game) {
          p.ready = !!msg.ready;
          this.broadcastLobby();
        }
        break;
      case 'start':
        this.start(p);
        break;
      case 'action':
        if (this.game && p.memberId !== undefined && msg.action && typeof msg.action.type === 'string') {
          queueAction(this.game, p.memberId, msg.action as Action);
          this.advance();
        }
        break;
      case 'chat':
        this.say(p, msg.text);
        break;
    }
  }

  private hello(conn: Conn, msg: Extract<ClientMsg, { t: 'hello' }>): void {
    // Reconexão: o mesmo navegador volta com o token que recebeu.
    const old = msg.token ? this.players.find((p) => p.token === msg.token) : undefined;
    if (old) {
      old.conn = conn;
      conn.send({ t: 'welcome', id: old.id, token: old.token });
      const m = this.game && old.memberId !== undefined ? memberById(this.game, old.memberId) : undefined;
      if (m) {
        m.connected = true;
        message(this.game!, `${old.name} voltou.`, 'lightGray', null);
        this.sendState(old, []);
      }
      this.broadcastLobby();
      return;
    }
    if (this.game) {
      conn.send({ t: 'error', text: 'Já há uma partida em andamento nesta sala. Espere ela acabar.' });
      return;
    }
    if (this.players.length >= MAX_PARTY) {
      conn.send({ t: 'error', text: `A sala está cheia (${MAX_PARTY} jogadores).` });
      return;
    }
    const id = `p${++this.seq}`;
    const p: RoomPlayer = {
      id, token: this.newToken(), name: clean(msg.name, 16) || `Jogador ${this.seq}`,
      raceId: RACES.some((r) => r.id === msg.raceId) ? msg.raceId : RACES[0].id,
      classId: CLASSES.some((c) => c.id === msg.classId) ? msg.classId : CLASSES[0].id,
      ready: false, conn,
    };
    this.players.push(p);
    conn.send({ t: 'welcome', id, token: p.token });
    this.broadcastLobby();
  }

  /** A conexão caiu: na sala de espera o jogador sai; na partida, o herói passa a esperar. */
  disconnect(conn: Conn): void {
    const p = this.players.find((x) => x.conn === conn);
    if (!p) return;
    p.conn = null;
    if (!this.game) {
      this.players = this.players.filter((x) => x !== p);
      this.broadcastLobby();
      return;
    }
    if (!this.players.some((x) => x.conn)) {
      // Todo mundo saiu: a partida acaba e a sala esvazia.
      this.game = null;
      this.players = [];
      return;
    }
    const m = p.memberId !== undefined ? memberById(this.game, p.memberId) : undefined;
    if (m) {
      m.connected = false;
      message(this.game, `${p.name} se desconectou (o herói fica esperando).`, 'darkGray', null);
    }
    this.advance();
  }

  private start(p: RoomPlayer): void {
    if (this.game) return;
    if (p !== this.leader) {
      p.conn?.send({ t: 'error', text: 'Só o líder da sala (o primeiro a entrar) pode iniciar.' });
      return;
    }
    const active = this.players.filter((x) => x.conn);
    if (active.some((x) => x !== p && !x.ready)) {
      p.conn?.send({ t: 'error', text: 'Espere todos marcarem "pronto".' });
      return;
    }
    const game = createPartyGame(this.newSeed(), active.map((x) => ({ name: x.name, raceId: x.raceId, classId: x.classId })));
    active.forEach((x, i) => (x.memberId = game.party!.members[i].id));
    this.players = active;
    this.game = game;
    if (active.length > 1) message(game, `Grupo: ${active.map((x) => x.name).join(', ')}. Fiquem juntos!`, 'yellow', null);
    this.advance();
  }

  private say(p: RoomPlayer, text: unknown): void {
    const t = clean(text, 120);
    if (!t) return;
    if (this.game) {
      message(this.game, `${p.name}: ${t}`, 'lightCyan', null);
      this.broadcastState([]);
      return;
    }
    this.chat.push(`${p.name}: ${t}`);
    if (this.chat.length > MAX_CHAT) this.chat.splice(0, this.chat.length - MAX_CHAT);
    this.broadcastLobby();
  }

  /** Roda o mundo até alguém precisar decidir e manda o estado a todos. */
  private advance(): void {
    const g = this.game;
    if (!g) return;
    advanceParty(g);
    const events = g.events;
    g.events = [];
    this.broadcastState(events);
    if (g.over) this.finish();
  }

  /** Fim da partida: a sala volta a esperar (os jogadores continuam conectados). */
  private finish(): void {
    this.game = null;
    this.players = this.players.filter((p) => p.conn);
    for (const p of this.players) {
      p.ready = false;
      p.memberId = undefined;
    }
    this.broadcastLobby();
  }

  private sendState(p: RoomPlayer, events: Game['events']): void {
    const g = this.game;
    if (!g || !p.conn || p.memberId === undefined) return;
    p.conn.send({ t: 'state', you: p.memberId, snapshot: snapshotFor(g, p.memberId), events, waiting: g.party?.waiting ?? [] });
  }

  private broadcastState(events: Game['events']): void {
    for (const p of this.players) this.sendState(p, events);
  }

  lobby(): ServerMsg {
    const leader = this.leader;
    const players: LobbyPlayer[] = this.players.map((p) => ({
      id: p.id, name: p.name, raceId: p.raceId, classId: p.classId, ready: p.ready, leader: p === leader, connected: !!p.conn,
    }));
    return { t: 'lobby', players, inGame: !!this.game, chat: [...this.chat] };
  }

  private broadcastLobby(): void {
    const msg = this.lobby();
    for (const p of this.players) p.conn?.send(msg);
  }
}
