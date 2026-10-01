import type { Color } from '../engine/colors';
import { ACTION_COST } from './actor';
import type { Game } from './game';
import { level, message, emit } from './game';
import { DIRS8 } from './map';
import { damage, resistMult } from './combat';
import { addStatus } from './status';
import { teleportActor } from './spells';
import { statMod } from './hero';
import { MAX_DEPTH } from '../data/themes';

export type TrapKind = 'dart' | 'pit' | 'teleport' | 'alarm' | 'sleep' | 'trapdoor' | 'fire';

export interface Trap {
  x: number;
  y: number;
  kind: TrapKind;
  hidden: boolean;
}

export const TRAP_INFO: Record<TrapKind, { name: string; color: Color; minDepth: number; weight: number }> = {
  dart: { name: 'armadilha de dardos', color: 'lightGray', minDepth: 1, weight: 10 },
  pit: { name: 'fosso', color: 'brown', minDepth: 1, weight: 8 },
  alarm: { name: 'armadilha de alarme', color: 'yellow', minDepth: 1, weight: 5 },
  sleep: { name: 'armadilha de gás sonífero', color: 'lightBlue', minDepth: 2, weight: 5 },
  teleport: { name: 'runa de teleporte', color: 'lightMagenta', minDepth: 3, weight: 5 },
  trapdoor: { name: 'alçapão', color: 'darkGray', minDepth: 2, weight: 4 },
  fire: { name: 'runa de fogo', color: 'orange', minDepth: 5, weight: 5 },
};

export function trapAt(game: Game, x: number, y: number) {
  return (level(game).traps ?? []).find((t) => t.x === x && t.y === y);
}

/** O jogador pisou numa armadilha. Retorna true se algo aconteceu. */
export function triggerTrap(game: Game, trap: Trap): void {
  const p = game.player;
  const info = TRAP_INFO[trap.kind];
  const wasHidden = trap.hidden;
  trap.hidden = false;
  // Chance de escapar de armadilhas visíveis (pulando) ou ocultas (reflexo).
  const dodge = (wasHidden ? 10 : 40) + statMod(game.hero.stats.dex) * 5 + (game.hero.raceId === 'halfling' ? 15 : 0);
  if (game.rng.loot.chance(dodge)) {
    message(game, `Você escapa de ${info.name}!`, 'lightGray');
    return;
  }
  message(game, wasHidden ? `Uma armadilha! Você ativa ${info.name}.` : `Você ativa ${info.name}.`, 'orange');
  switch (trap.kind) {
    case 'dart':
      damage(game, p, game.rng.loot.roll('1d4+1'));
      if (game.rng.loot.chance(40)) addStatus(game, p, 'poisoned', 6, 1);
      break;
    case 'pit':
      message(game, 'Você cai num fosso!', 'orange');
      damage(game, p, game.rng.loot.roll('2d4'));
      break;
    case 'alarm':
      message(game, 'Um sino ensurdecedor toca! Todos os monstros acordam.', 'yellow');
      for (const m of level(game).actors) {
        m.ai.state = 'hunting';
        m.ai.lastSeen = { x: p.x, y: p.y };
      }
      break;
    case 'sleep':
      addStatus(game, p, 'asleep', game.rng.loot.roll('1d4+2'));
      break;
    case 'teleport':
      teleportActor(game, p);
      message(game, 'O mundo gira ao seu redor!', 'lightMagenta');
      break;
    case 'trapdoor':
      if (game.depth >= MAX_DEPTH) break;
      message(game, 'O chão se abre sob seus pés e você cai!', 'orange');
      game.pendingFall = true;
      break;
    case 'fire': {
      emit(game, { type: 'explosion', x: p.x, y: p.y, radius: 1, color: 'orange' });
      damage(game, p, Math.round(game.rng.loot.roll('3d6') * resistMult(p, 'fire')));
      addStatus(game, p, 'burning', 3, 1);
      break;
    }
  }
}

/** Procurar também revela armadilhas vizinhas. */
export function searchTraps(game: Game, chance: number): void {
  const p = game.player;
  for (const d of [{ x: 0, y: 0 }, ...DIRS8]) {
    const t = trapAt(game, p.x + d.x, p.y + d.y);
    if (t && t.hidden && game.rng.loot.chance(chance)) {
      t.hidden = false;
      message(game, `Você encontra ${TRAP_INFO[t.kind].name}!`, 'yellow');
    }
  }
}

/** Tenta desarmar uma armadilha vizinha. */
export function disarm(game: Game, dx: number, dy: number): number {
  const p = game.player;
  const t = trapAt(game, p.x + dx, p.y + dy);
  if (!t || t.hidden) {
    message(game, 'Você não vê nenhuma armadilha ali.', 'darkGray');
    return 0;
  }
  const rogue = game.hero.classId === 'rogue' ? 30 : 0;
  const chance = 40 + rogue + statMod(game.hero.stats.dex) * 6 + game.hero.level * 2;
  if (game.rng.loot.chance(chance)) {
    level(game).traps = (level(game).traps ?? []).filter((x) => x !== t);
    message(game, `Você desarma ${TRAP_INFO[t.kind].name}.`, 'lightGreen');
  } else if (game.rng.loot.chance(30)) {
    message(game, 'Ops! Você ativa a armadilha.', 'orange');
    triggerTrap(game, { ...t, hidden: false });
  } else message(game, 'Você não consegue desarmar a armadilha.', 'lightGray');
  return ACTION_COST;
}
