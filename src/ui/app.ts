import type { ScreenManager } from '../engine/screens';

/** Contexto compartilhado entre as telas. */
export interface App {
  screens: ScreenManager;
  debug: boolean;
}
