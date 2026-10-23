import { RNG } from '../engine/rng';
import type { Color } from '../engine/colors';
import type { Actor } from './actor';
import type { GameMap, Point } from './map';
import type { Room } from '../gen/dungeon/common';
import { isWalkable } from './map';
import type { Item } from './item';
import type { Hero } from './hero';
import type { IdState } from './identify';
import type { SpellDef } from '../data/spells';
import type { Trap } from './traps';
import type { LogMessage } from './log';
import { pushMessage } from './log';
import { updatePlayerFov } from './fov';
import type { GameEvent } from './events';
import { pushEvent } from './events';
import type { Party } from './party';

/** Um andar da masmorra: mapa + monstros. */
export interface Level {
  depth: number;
  map: GameMap;
  /** Monstros do andar (o jogador fica em Game.player). */
  actors: Actor[];
  /** Itens no chão. */
  items: Item[];
  up: Point;
  down: Point;
  rooms: Room[];
  /** Id do tema visual (data/themes.ts). */
  theme: string;
  generator: string;
  /** O jogador já esteve aqui. */
  visited: boolean;
  traps?: Trap[];
  /** Nome da sala especial do andar, se houver. */
  vault?: string;
}

/** Fluxos independentes de números aleatórios. */
export interface GameRngs {
  map: RNG;
  combat: RNG;
  loot: RNG;
  ai: RNG;
}

/** Estado completo de uma partida. */
export interface Game {
  seed: number;
  turn: number;
  depth: number;
  /** Andar mais profundo já alcançado. */
  maxDepth: number;
  levels: Record<number, Level>;
  player: Actor;
  hero: Hero;
  log: LogMessage[];
  rng: GameRngs;
  nextId: number;
  /** Eventos para a interface (transitório: não vai para o save). */
  events: GameEvent[];
  /** Chefes únicos já derrotados (ids). */
  uniquesKilled: string[];
  /** Aparências aleatórias e tipos de item já identificados. */
  idState: IdState;
  /** Magias geradas proceduralmente nesta partida (tomos raros). */
  customSpells?: SpellDef[];
  /** Artefatos lendários já gerados (ids) — um de cada por partida. */
  artifactsFound: string[];
  /** O jogador pegou o Coração do Abismo. */
  hasAmulet: boolean;
  /** O jogador caiu por um alçapão (resolvido ao fim da ação). */
  pendingFall?: boolean;
  /** Casa de lava que o jogador já foi avisado (próximo passo atravessa). */
  lavaWarned?: string;
  /** Data do desafio diário (seed do dia), se for o caso. */
  daily?: string;
  /** Desafio de um amigo: pontuação a superar. */
  challenge?: { target: number };
  /** Dicas para iniciantes já mostradas. */
  hintsShown?: string[];
  /** Preenchido quando a partida termina. */
  over?: { won: boolean; cause: string; escaped?: boolean };
  /** Multijogador: todos os heróis do grupo (`player`/`hero` apontam para o da vez — ver core/party.ts). */
  party?: Party;
}

export function createRngs(seed: number): GameRngs {
  const root = new RNG(seed);
  return { map: root.fork('map'), combat: root.fork('combat'), loot: root.fork('loot'), ai: root.fork('ai') };
}

export function level(game: Game): Level {
  return game.levels[game.depth];
}

/**
 * Adiciona uma mensagem ao registro. No multijogador ela é marcada com o herói da vez (`who`), para os
 * outros verem de quem é ("[Ana] Você acerta o rato."); `who = null` marca como mensagem do grupo todo.
 */
export function message(game: Game, text: string, color: Color = 'lightGray', who?: number | null): void {
  const tag = who === null ? undefined : who ?? (game.party ? game.player.id : undefined);
  pushMessage(game.log, text, color, game.turn, tag);
}

/** Recalcula o campo de visão do jogador no andar atual. */
export function refreshFov(game: Game): void {
  const blind = (game.player.effects ?? []).some((e) => e.id === 'blind' && e.turns > 0);
  updatePlayerFov(level(game).map, game.player.x, game.player.y, blind ? 0 : game.player.light, blind);
}

/** Ajusta a causa da morte (ex.: "morreu de fome") se o jogador acabou de morrer. */
export function setDeathCause(game: Game, cause: string): void {
  if (game.over && !game.over.won) game.over.cause = cause;
  // Multijogador: o herói da vez caiu sem acabar a partida.
  const m = game.party?.members.find((x) => x.actor === game.player);
  if (m?.dead) m.cause = cause;
}

export function emit(game: Game, e: GameEvent): void {
  pushEvent(game.events, e);
}

export function newId(game: Game): number {
  return game.nextId++;
}

/** Ator (jogador ou monstro) na posição, se houver. */
export function actorAt(game: Game, x: number, y: number): Actor | undefined {
  const party = game.party;
  if (game.player.x === x && game.player.y === y && !(party && game.player.hp <= 0)) return game.player;
  // Multijogador: os outros heróis vivos também ocupam casas.
  if (party) for (const m of party.members) if (!m.dead && m.actor !== game.player && m.actor.x === x && m.actor.y === y) return m.actor;
  return level(game).actors.find((a) => a.x === x && a.y === y);
}

/** O jogador enxerga este monstro? (campo de visão + invisibilidade) */
export function seesActor(game: Game, a: Actor): boolean {
  const map = level(game).map;
  if (map.visible[a.y * map.width + a.x] !== 1) return false;
  if (a.flags.includes('invisible') && Math.max(Math.abs(a.x - game.player.x), Math.abs(a.y - game.player.y)) > 1) return false;
  return true;
}

/** Célula livre: terreno passável e sem ninguém. */
export function isFree(game: Game, x: number, y: number): boolean {
  return isWalkable(level(game).map, x, y) && !actorAt(game, x, y);
}
