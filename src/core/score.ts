import type { Game } from './game';
import { classById } from '../data/classes';
import { raceById } from '../data/races';

/** Detalhamento da pontuação (mostrado na tela final). */
export interface ScoreBreakdown {
  gold: number;
  depth: number;
  xp: number;
  uniques: number;
  victory: number;
  total: number;
}

export const VICTORY_BONUS = 5000;
export const ESCAPE_BONUS = 10000;

/**
 * Pontuação = ouro + 50 × andar mais profundo + XP total + bônus por chefes
 * + bônus de vitória (pegar o Coração do Abismo / escapar com ele).
 */
export function computeScore(game: Game): ScoreBreakdown {
  const gold = game.hero.gold;
  const depth = 50 * game.maxDepth;
  const xp = game.hero.xp;
  const uniques = 250 * game.uniquesKilled.length;
  let victory = 0;
  if (game.hasAmulet) victory += VICTORY_BONUS;
  if (game.over?.won && game.over.escaped) victory += ESCAPE_BONUS;
  return { gold, depth, xp, uniques, victory, total: gold + depth + xp + uniques + victory };
}

/** Uma entrada do quadro de recordes. */
export interface HighScore {
  name: string;
  race: string;
  cls: string;
  level: number;
  score: number;
  depth: number;
  cause: string;
  turns: number;
  won: boolean;
  date: string;
  seed: number;
  /** Desafio diário (seed do dia), se for o caso. */
  daily?: string;
}

export function highScoreEntry(game: Game, date = new Date()): HighScore {
  return {
    name: game.hero.name,
    race: raceById(game.hero.raceId).name,
    cls: classById(game.hero.classId).name,
    level: game.hero.level,
    score: computeScore(game).total,
    depth: game.maxDepth,
    cause: game.over?.cause ?? 'ainda vivo',
    turns: game.turn,
    won: !!game.over?.won,
    date: date.toISOString().slice(0, 10),
    seed: game.seed,
    daily: game.daily,
  };
}

export const MAX_HIGH_SCORES = 10;

/** Insere uma pontuação na lista (ordenada, no máximo 10). Retorna a posição (0-based) ou -1. */
export function insertHighScore(list: HighScore[], entry: HighScore): number {
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  const pos = list.indexOf(entry);
  list.splice(MAX_HIGH_SCORES);
  return pos < MAX_HIGH_SCORES ? pos : -1;
}
