import type { Actor } from './actor';
import { ACTION_COST, hasFlag } from './actor';
import type { Game } from './game';
import { actorAt, emit, level, message } from './game';
import { DIRS8, distance } from './map';
import { damage, meleeAttack } from './combat';
import { classById } from '../data/classes';
import type { ClassAbility } from '../data/classes';
import { capitalize, theName } from './text';

/** Dados de uso das habilidades ativas. */
interface AbilityRule {
  /** Recarga em turnos. */
  cooldown: number;
  mp?: number;
  /** Precisa de uma direção (ataques). */
  needsDirection?: boolean;
}

export const ABILITY_RULES: Record<string, AbilityRule> = {
  power_strike: { cooldown: 0, needsDirection: true },
  whirlwind: { cooldown: 6 },
  second_wind: { cooldown: 200 },
  vanish: { cooldown: 60 },
  turn_undead: { cooldown: 15, mp: 2 },
  track: { cooldown: 80 },
};

/** Habilidades ativas que o jogador já tem. */
export function activeAbilities(game: Game): ClassAbility[] {
  const cls = classById(game.hero.classId);
  return cls.abilities.filter((a) => a.active && a.level <= game.hero.level && ABILITY_RULES[a.id]);
}

export function abilityReadyIn(game: Game, id: string): number {
  return Math.max(0, (game.hero.cooldowns[id] ?? 0) - game.turn);
}

/** Usa uma habilidade de classe. Retorna energia gasta (0 = não usou). */
export function useAbility(game: Game, id: string, dx = 0, dy = 0): number {
  const rule = ABILITY_RULES[id];
  const p = game.player;
  if (!rule) return 0;
  const wait = abilityReadyIn(game, id);
  if (wait > 0) {
    message(game, `Ainda não: faltam ${wait} turnos.`, 'darkGray');
    return 0;
  }
  if (rule.mp && p.mp < rule.mp) {
    message(game, 'Você não tem mana suficiente.', 'lightBlue');
    return 0;
  }
  const cost = run(game, p, id, dx, dy);
  if (cost > 0) {
    if (rule.mp) p.mp -= rule.mp;
    if (rule.cooldown) game.hero.cooldowns[id] = game.turn + rule.cooldown;
  }
  return cost;
}

function run(game: Game, p: Actor, id: string, dx: number, dy: number): number {
  const lvl = level(game);
  switch (id) {
    case 'power_strike': {
      const target = actorAt(game, p.x + dx, p.y + dy);
      if (!target || target === p) {
        message(game, 'Não há ninguém ali.', 'darkGray');
        return 0;
      }
      message(game, 'Você desfere um golpe poderoso!', 'orange');
      meleeAttack(game, p, target, { damageMult: 2 });
      return ACTION_COST * 2;
    }
    case 'whirlwind': {
      const around = DIRS8.map((d) => actorAt(game, p.x + d.x, p.y + d.y)).filter((a): a is Actor => !!a && !a.isPlayer);
      if (!around.length) {
        message(game, 'Não há inimigos ao seu redor.', 'darkGray');
        return 0;
      }
      message(game, 'Você gira a arma num ataque giratório!', 'orange');
      for (const a of around) meleeAttack(game, p, a);
      return ACTION_COST;
    }
    case 'second_wind': {
      const heal = Math.round(p.maxHp * 0.3);
      p.hp = Math.min(p.maxHp, p.hp + heal);
      emit(game, { type: 'heal', x: p.x, y: p.y });
      message(game, `Você recupera o fôlego (+${heal} HP).`, 'lightGreen');
      return ACTION_COST;
    }
    case 'vanish': {
      for (const m of lvl.actors) {
        if (m.ai.state === 'hunting') {
          m.ai.state = 'wandering';
          m.ai.lastSeen = undefined;
        }
      }
      game.hero.cooldowns.hidden = game.turn + 8;
      message(game, 'Você some nas sombras. Os inimigos perdem seu rastro.', 'darkGray');
      return ACTION_COST;
    }
    case 'turn_undead': {
      const undead = lvl.actors.filter((m) => hasFlag(m, 'undead') && distance(m, p) <= 6);
      message(game, 'Você ergue o símbolo sagrado e invoca a luz divina!', 'white');
      emit(game, { type: 'explosion', x: p.x, y: p.y, radius: 3, color: 'white' });
      if (!undead.length) message(game, 'Nada acontece.', 'darkGray');
      for (const m of undead) {
        const dmg = game.rng.combat.roll('2d6') + p.level;
        message(game, `${capitalize(theName(m))} se contorce sob a luz!`, 'yellow');
        damage(game, m, dmg, p);
        if (m.hp > 0) {
          m.ai.state = 'fleeing';
          m.ai.fleeUntil = game.turn + 10 + p.level;
        }
      }
      return ACTION_COST;
    }
    case 'track': {
      game.hero.cooldowns.tracking = game.turn + 25;
      message(game, `Você estuda rastros e sons... sente ${lvl.actors.length} criatura(s) neste andar.`, 'lightGreen');
      return ACTION_COST;
    }
  }
  return 0;
}

/** O jogador está escondido (Desaparecer) — monstros não o percebem. */
export function playerHidden(game: Game): boolean {
  return (game.hero.cooldowns.hidden ?? 0) > game.turn;
}

/** Rastrear ativo: o mapa mostra todos os monstros. */
export function playerTracking(game: Game): boolean {
  return (game.hero.cooldowns.tracking ?? 0) > game.turn;
}
