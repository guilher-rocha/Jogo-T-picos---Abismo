import type { ScreenManager } from '../engine/screens';
import type { HighScore } from '../core/score';

/** Contexto compartilhado entre as telas. */
export interface App {
  screens: ScreenManager;
  debug: boolean;
  /** Volta ao início (criação de personagem / tela de título). */
  restart: () => void;
  /** Quadro de recordes (top 10). */
  highScores: HighScore[];
  /** Registra uma pontuação; retorna a posição no quadro (-1 = não entrou). */
  recordScore: (entry: HighScore) => number;
}
