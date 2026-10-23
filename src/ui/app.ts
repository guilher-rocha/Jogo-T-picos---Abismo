import type { ScreenManager } from '../engine/screens';
import type { HighScore } from '../core/score';
import type { Game } from '../core/game';
import type { Settings } from './optionsScreen';

/** Contexto compartilhado entre as telas (o "controlador" do fluxo de telas). */
export interface App {
  screens: ScreenManager;
  debug: boolean;
  /** Volta à tela de título. */
  showTitle: () => void;
  /** Mesmo que showTitle (compatibilidade). */
  restart: () => void;
  newGame: () => void;
  hasSave: () => boolean;
  continueGame: () => void;
  /** Desafio diário (seed do dia). */
  dailyChallenge: () => void;
  /** Aceitar o desafio de um amigo (código). */
  acceptChallenge: () => void;
  /** Multijogador em rede local: criar o herói e entrar na sala. */
  multiplayer: () => void;
  /** Multijogador: volta para a sala de espera (false se não há conexão ativa). */
  backToLobby: () => boolean;
  showOptions: () => void;
  showHighScores: (cycle: boolean, highlight?: number) => void;
  startAttract: () => void;
  /** Fim de partida: mostra GAME OVER / vitória. */
  gameOver: (game: Game, rank: number) => void;
  exportMorgue: (game: Game) => void;
  /** Quadro de recordes (top 10). */
  highScores: HighScore[];
  settings: Settings;
  /** Aplica as configurações (tema, sons); `save` grava no navegador. */
  applySettings: (save: boolean) => void;
  /** Funcionalidades disponíveis (vão sendo ligadas conforme as etapas). */
  features: { daily: boolean; options: boolean };
  /** Registra uma pontuação; retorna a posição no quadro (-1 = não entrou). */
  recordScore: (entry: HighScore) => number;
}
