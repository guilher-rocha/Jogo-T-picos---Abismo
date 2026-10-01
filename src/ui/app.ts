import type { ScreenManager } from '../engine/screens';

/** Contexto compartilhado entre as telas. */
export interface App {
  screens: ScreenManager;
  debug: boolean;
  /** Volta ao início (criação de personagem / tela de título). */
  restart: () => void;
}
