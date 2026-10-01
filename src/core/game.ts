import { RNG } from '../engine/rng';
import type { Color } from '../engine/colors';
import type { Actor } from './actor';
import type { GameMap, Point } from './map';
import type { Room } from '../gen/dungeon/common';
import { isWalkable } from './map';
import type { Item } from './item';
import type { LogMessage } from './log';
import { pushMessage } from './log';
import { updatePlayerFov } from './fov';

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
  levels: Record<number, Level>;
  player: Actor;
  log: LogMessage[];
  rng: GameRngs;
  nextId: number;
  /** Preenchido quando a partida termina. */
  over?: { won: boolean; cause: string };
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

/** Raio de luz do jogador (tocha). */
export const PLAYER_LIGHT = 3;

/** Recalcula o campo de visão do jogador no andar atual. */
export function refreshFov(game: Game): void {
  updatePlayerFov(level(game).map, game.player.x, game.player.y, PLAYER_LIGHT);
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
