import { RNG } from '../engine/rng';
import type { Color } from '../engine/colors';
import type { Actor } from './actor';
import type { GameMap, Point } from './map';
import type { Room } from '../gen/dungeon/common';
import { isWalkable } from './map';
import type { Item } from './item';
import type { Hero } from './hero';
import type { LogMessage } from './log';
import { pushMessage } from './log';
import { updatePlayerFov } from './fov';
import type { GameEvent } from './events';
import { pushEvent } from './events';

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
  /** Artefatos lendários já gerados (ids) — um de cada por partida. */
  artifactsFound: string[];
  /** O jogador pegou o Coração do Abismo. */
  hasAmulet: boolean;
  /** Data do desafio diário (seed do dia), se for o caso. */
  daily?: string;
  /** Preenchido quando a partida termina. */
  over?: { won: boolean; cause: string; escaped?: boolean };
}

export function createRngs(seed: number): GameRngs {
  const root = new RNG(seed);
  return { map: root.fork('map'), combat: root.fork('combat'), loot: root.fork('loot'), ai: root.fork('ai') };
}

export function level(game: Game): Level {
  return game.levels[game.depth];
}

export function message(game: Game, text: string, color: Color = 'lightGray'): void {
  pushMessage(game.log, text, color, game.turn);
}

/** Recalcula o campo de visão do jogador no andar atual. */
export function refreshFov(game: Game): void {
  updatePlayerFov(level(game).map, game.player.x, game.player.y, game.player.light);
}

export function emit(game: Game, e: GameEvent): void {
  pushEvent(game.events, e);
}

export function newId(game: Game): number {
  return game.nextId++;
}

/** Ator (jogador ou monstro) na posição, se houver. */
export function actorAt(game: Game, x: number, y: number): Actor | undefined {
  if (game.player.x === x && game.player.y === y) return game.player;
  return level(game).actors.find((a) => a.x === x && a.y === y);
}

/** Célula livre: terreno passável e sem ninguém. */
export function isFree(game: Game, x: number, y: number): boolean {
  return isWalkable(level(game).map, x, y) && !actorAt(game, x, y);
}
