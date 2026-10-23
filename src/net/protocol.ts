import type { Action } from '../core/actions';
import type { GameEvent } from '../core/events';
import type { Game } from '../core/game';
import { createRngs, level } from '../core/game';
import { aliveMembers, memberById } from '../core/party';

/**
 * Protocolo do multijogador em rede local (JSON por WebSocket).
 * O servidor roda a partida; os navegadores mandam ações e recebem o estado já na perspectiva de cada um.
 */

export type ClientMsg =
  | { t: 'hello'; name: string; raceId: string; classId: string; token?: string }
  | { t: 'ready'; ready: boolean }
  | { t: 'start' }
  | { t: 'action'; action: Action }
  | { t: 'chat'; text: string };

export interface LobbyPlayer {
  id: string;
  name: string;
  raceId: string;
  classId: string;
  ready: boolean;
  leader: boolean;
  connected: boolean;
}

export type ServerMsg =
  /** Resposta ao "hello": quem você é e o token para reconectar. */
  | { t: 'welcome'; id: string; token: string }
  | { t: 'lobby'; players: LobbyPlayer[]; inGame: boolean; chat: string[] }
  /** Estado da partida na perspectiva de `you` (id do seu herói), com os eventos para animar. */
  | { t: 'state'; you: number; snapshot: string; events: GameEvent[]; waiting: number[] }
  | { t: 'error'; text: string };

/** Quantas mensagens do registro vão em cada estado. */
const LOG_TAIL = 60;

/**
 * Estado para um jogador: só o andar atual, o grupo e o fim do registro. A visão (`map.visible`) é a do
 * herói dele — ou, se ele caiu, a de um aliado de pé (o caído assiste ao grupo).
 */
export function snapshotFor(game: Game, memberId: number): string {
  const lvl = level(game);
  const me = memberById(game, memberId);
  const viewer = me && me.dead ? aliveMembers(game)[0] ?? me : me;
  const n = lvl.map.tiles.length;
  const visible = viewer && viewer.visible.length === n ? viewer.visible : new Array(n).fill(0);
  // Fora do JSON: eventos (vão à parte), RNG (o cliente não simula), outros andares e o "jogador da vez".
  const { events: _e, rng: _r, levels: _l, log, player: _p, hero: _h, party, ...rest } = game;
  const out = {
    ...rest,
    levels: { [game.depth]: { ...lvl, map: { ...lvl.map, visible } } },
    log: log.slice(-LOG_TAIL),
    party: party && { ...party, members: party.members.map((m) => ({ ...m, visible: [] })) },
  };
  return JSON.stringify(out);
}

/** Reconstrói a partida recebida, com `game.player`/`game.hero` apontando para o herói de `you`. */
export function decodeSnapshot(text: string, you: number): Game {
  const g = JSON.parse(text) as Game;
  const members = g.party?.members ?? [];
  const me = members.find((m) => m.id === you) ?? members[0];
  if (!me) throw new Error('estado sem grupo');
  g.player = me.actor;
  g.hero = me.hero;
  g.rng = createRngs(g.seed);
  g.events = [];
  return g;
}

/** Endereço do servidor: o mesmo de onde a página veio (servidor da rede local) ou ?server=ip:porta. */
export function serverUrl(loc: { protocol: string; host: string; hostname: string; search: string }, servedByLan: boolean): string {
  const param = new URLSearchParams(loc.search).get('server');
  const host = param ?? (servedByLan ? loc.host : `${loc.hostname}:${LAN_PORT}`);
  return `${loc.protocol === 'https:' ? 'wss' : 'ws'}://${host}/ws`;
}

export const LAN_PORT = 8080;
