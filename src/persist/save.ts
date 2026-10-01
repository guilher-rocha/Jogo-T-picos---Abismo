import { RNG } from '../engine/rng';
import type { Game, GameRngs } from '../core/game';
import type { HighScore } from '../core/score';

/** Versão do formato do save; saves de outra versão são descartados com aviso. */
export const SAVE_VERSION = 5;

const KEY_SAVE = 'abismo.save';
const KEY_SCORES = 'abismo.highscores';
const KEY_SETTINGS = 'abismo.settings';

type RngStates = Record<keyof GameRngs, number>;

interface SaveFile {
  version: number;
  savedAt: string;
  game: Omit<Game, 'rng' | 'events'> & { rng: RngStates };
}

/** Converte a partida num texto JSON (os RNGs viram só o número de estado). */
export function serializeGame(game: Game): string {
  const rng: RngStates = { map: game.rng.map.state, combat: game.rng.combat.state, loot: game.rng.loot.state, ai: game.rng.ai.state };
  const { events: _events, rng: _rng, ...rest } = game;
  const file: SaveFile = { version: SAVE_VERSION, savedAt: new Date().toISOString(), game: { ...rest, rng } };
  return JSON.stringify(file);
}

/** Reconstrói a partida a partir do JSON. Lança erro se a versão for incompatível. */
export function deserializeGame(text: string): Game {
  const file = JSON.parse(text) as SaveFile;
  if (file.version !== SAVE_VERSION) throw new Error(`Save de versão ${file.version} (esperada ${SAVE_VERSION})`);
  const make = (state: number) => {
    const r = new RNG(0);
    r.state = state;
    return r;
  };
  const g = file.game;
  return {
    ...g,
    rng: { map: make(g.rng.map), combat: make(g.rng.combat), loot: make(g.rng.loot), ai: make(g.rng.ai) },
    events: [],
  } as Game;
}

// ── localStorage (tudo protegido: pode não existir ou estar bloqueado) ──────────

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function read(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(key: string, value: string): boolean {
  try {
    storage()?.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function remove(key: string): void {
  try {
    storage()?.removeItem(key);
  } catch {
    /* sem armazenamento: nada a fazer */
  }
}

export function saveGame(game: Game): boolean {
  if (game.over) {
    deleteSave();
    return false;
  }
  return write(KEY_SAVE, serializeGame(game));
}

export function hasSave(): boolean {
  return read(KEY_SAVE) !== null;
}

/** Carrega o save; se estiver corrompido/incompatível, apaga e devolve null. */
export function loadGame(): { game: Game | null; error?: string } {
  const text = read(KEY_SAVE);
  if (!text) return { game: null };
  try {
    return { game: deserializeGame(text) };
  } catch (e) {
    deleteSave();
    return { game: null, error: String(e) };
  }
}

export function deleteSave(): void {
  remove(KEY_SAVE);
}

export function loadHighScores(): HighScore[] {
  try {
    const list = JSON.parse(read(KEY_SCORES) ?? '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveHighScores(list: HighScore[]): void {
  write(KEY_SCORES, JSON.stringify(list));
}

export function loadSettings<T extends object>(defaults: T): T {
  try {
    return { ...defaults, ...JSON.parse(read(KEY_SETTINGS) ?? '{}') };
  } catch {
    return defaults;
  }
}

export function saveSettings(settings: object): void {
  write(KEY_SETTINGS, JSON.stringify(settings));
}
