import type { ClientMsg, LobbyPlayer, ServerMsg } from './protocol';
import type { HeroSpec } from '../core/world';

/**
 * Conexão do navegador com o servidor da rede local. Guarda o que chega (sala, estados da partida,
 * erros) para as telas lerem a cada quadro; reconecta sozinha se a rede piscar (com o mesmo token,
 * o servidor devolve o mesmo herói).
 */

export type StateMsg = Extract<ServerMsg, { t: 'state' }>;
export type LobbyMsg = Extract<ServerMsg, { t: 'lobby' }>;

/** Token por aba (sessionStorage): duas abas no mesmo computador são dois jogadores. */
const TOKEN_KEY = 'abismo.net.token';
const readToken = (): string | undefined => {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? undefined;
  } catch {
    return undefined;
  }
};
const writeToken = (t: string | null): void => {
  try {
    if (t) sessionStorage.setItem(TOKEN_KEY, t);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* sem armazenamento: sem reconexão */
  }
};

export class NetClient {
  status: 'connecting' | 'open' | 'closed' = 'connecting';
  lobby: LobbyMsg | null = null;
  myId: string | null = null;
  error = '';
  /** Estados recebidos e ainda não aplicados pela tela do jogo (em ordem). */
  states: StateMsg[] = [];
  private ws: WebSocket | null = null;
  private left = false;
  private retries = 0;

  constructor(readonly url: string, private spec: HeroSpec) {
    this.connect();
  }

  private connect(): void {
    this.status = 'connecting';
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url);
    } catch {
      this.status = 'closed';
      this.error = `Endereço inválido: ${this.url}`;
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      this.status = 'open';
      this.retries = 0;
      this.error = '';
      this.send({ t: 'hello', name: this.spec.name, raceId: this.spec.raceId, classId: this.spec.classId, token: readToken() });
    };
    ws.onmessage = (ev) => {
      try {
        this.receive(JSON.parse(String(ev.data)) as ServerMsg);
      } catch {
        /* mensagem quebrada: ignora */
      }
    };
    ws.onerror = () => {
      if (this.status !== 'open') this.error = `Não foi possível conectar a ${this.url}.`;
    };
    ws.onclose = () => {
      this.ws = null;
      this.status = 'closed';
      if (this.left) return;
      if (this.retries++ < 40) setTimeout(() => !this.left && this.connect(), 1500);
      else this.error = 'Sem conexão com o servidor.';
    };
  }

  private receive(msg: ServerMsg): void {
    switch (msg.t) {
      case 'welcome':
        this.myId = msg.id;
        writeToken(msg.token);
        break;
      case 'lobby':
        this.lobby = msg;
        break;
      case 'state':
        this.states.push(msg);
        if (this.states.length > 60) this.states.splice(0, this.states.length - 60);
        break;
      case 'error':
        this.error = msg.text;
        break;
    }
  }

  send(msg: ClientMsg): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  /** Eu na sala de espera. */
  me(): LobbyPlayer | undefined {
    return this.lobby?.players.find((p) => p.id === this.myId);
  }

  /** Sai da sala de vez (não reconecta). */
  leave(): void {
    this.left = true;
    writeToken(null);
    this.ws?.close();
    if (active === this) active = null;
  }
}

let active: NetClient | null = null;

/** Conexão em uso (null fora do multijogador). */
export const activeNet = (): NetClient | null => active;

export function startNet(url: string, spec: HeroSpec): NetClient {
  active?.leave();
  active = new NetClient(url, spec);
  return active;
}
