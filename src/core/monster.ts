import type { RNG } from '../engine/rng';
import type { Actor } from './actor';
import { createActor } from './actor';
import type { Game } from './game';
import { newId } from './game';
import type { MonsterTemplate } from '../data/monsters';

/** Cria um monstro concreto a partir do modelo (rola o HP etc.). */
export function createMonster(game: Game, t: MonsterTemplate, x: number, y: number, rng: RNG): Actor {
  const hp = Math.max(1, rng.roll(t.hp));
  return createActor(newId(game), {
    templateId: t.id,
    name: t.name,
    gender: t.gender,
    glyph: t.glyph,
    color: t.color,
    x,
    y,
    speed: t.speed,
    hp,
    maxHp: hp,
    accuracy: t.accuracy,
    defense: t.defense,
    attacks: t.attacks.map((a) => ({ ...a })),
    xpValue: t.xp,
    level: t.level,
    flags: [...t.flags],
    // A maioria dos monstros começa dormindo.
    ai: { state: rng.chance(70) ? 'sleeping' : 'wandering', lostTurns: 0 },
  });
}
