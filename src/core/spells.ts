import type { Actor } from './actor';
import { ACTION_COST } from './actor';
import type { Game } from './game';
import { actorAt, emit, level, message } from './game';
import type { Point } from './map';
import { isTransparent } from './map';
import { bresenham } from './fov';
import { damage } from './combat';
import { statMod } from './hero';
import { classById } from '../data/classes';
import type { SpellDef } from '../data/spells';
import { spellById } from '../data/spells';
import { adj, capitalize, theName } from './text';

/** Chance de falha (%) de uma magia para o jogador. */
export function spellFailChance(game: Game, spell: SpellDef): number {
  const hero = game.hero;
  const cls = classById(hero.classId);
  const stat = cls.castStat ? statMod(hero.stats[cls.castStat]) : -3;
  let fail = spell.fail - 3 * stat - 2 * (hero.level - spell.level);
  if (hero.raceId === 'gnome') fail -= 5;
  return Math.max(5, Math.min(95, fail));
}

/** Poder (dano/cura) da magia conforme o nível do conjurador. */
export function spellPower(game: Game, caster: Actor, spell: SpellDef): number {
  const base = spell.power ? game.rng.combat.roll(spell.power) : 0;
  return base + (spell.perLevel ? Math.floor(caster.level / spell.perLevel) : 0);
}

/** Caminho de um projétil mágico até o alvo (para no primeiro ator/parede). */
function trace(game: Game, from: Point, to: Point, range: number, pierce: boolean): { path: Point[]; hits: Actor[] } {
  const map = level(game).map;
  const path: Point[] = [];
  const hits: Actor[] = [];
  // Estende a linha além do alvo até o alcance (raios continuam).
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const scale = Math.max(Math.abs(dx), Math.abs(dy));
  const far = scale > 0 ? { x: from.x + Math.round((dx * range) / scale), y: from.y + Math.round((dy * range) / scale) } : to;
  for (const p of bresenham(from.x, from.y, far.x, far.y).slice(1, range + 1)) {
    if (!isTransparent(map, p.x, p.y)) break;
    path.push(p);
    const a = actorAt(game, p.x, p.y);
    if (a) {
      hits.push(a);
      if (!pierce) break;
    }
  }
  return { path, hits };
}

/**
 * Conjura uma magia. Retorna energia gasta (0 = não conjurou).
 * Falha gasta metade do MP e o turno.
 */
export function castSpell(game: Game, caster: Actor, spellId: string, target?: Point): number {
  const spell = spellById(spellId);
  if (!spell) return 0;
  if (caster.isPlayer) {
    if (caster.mp < spell.cost) {
      message(game, 'Você não tem mana suficiente.', 'lightBlue');
      return 0;
    }
    if (game.rng.combat.chance(spellFailChance(game, spell))) {
      caster.mp -= Math.ceil(spell.cost / 2);
      message(game, 'Você perde a concentração e a magia falha!', 'lightBlue');
      return ACTION_COST;
    }
    caster.mp -= spell.cost;
  }
  emit(game, { type: 'spell', color: spell.color });
  const who = caster.isPlayer ? 'Você' : capitalize(theName(caster));
  switch (spell.shape) {
    case 'self':
      applyToTarget(game, caster, caster, spell);
      break;
    case 'bolt':
    case 'beam': {
      if (!target) return 0;
      const { path, hits } = trace(game, caster, target, spell.range ?? 10, spell.shape === 'beam');
      if (caster.isPlayer) message(game, `Você conjura ${spell.name}.`, spell.color);
      else message(game, `${who} conjura ${spell.name}!`, spell.color);
      emit(game, spell.shape === 'bolt' ? { type: 'projectile', path, glyph: '*', color: spell.color } : { type: 'bolt', path, color: spell.color });
      for (const h of hits) applyToTarget(game, caster, h, spell);
      break;
    }
    case 'ball': {
      if (!target) return 0;
      const { path, hits } = trace(game, caster, target, spell.range ?? 10, false);
      const center = hits[0] ? { x: hits[0].x, y: hits[0].y } : path[path.length - 1] ?? caster;
      message(game, `${who} conjura ${spell.name}!`, spell.color);
      emit(game, { type: 'projectile', path, glyph: '*', color: spell.color });
      const r = spell.radius ?? 1;
      emit(game, { type: 'explosion', x: center.x, y: center.y, radius: r, color: spell.color });
      const victims = [game.player, ...level(game).actors].filter((a) => Math.max(Math.abs(a.x - center.x), Math.abs(a.y - center.y)) <= r && a !== caster);
      for (const v of victims) applyToTarget(game, caster, v, spell);
      break;
    }
  }
  return ACTION_COST;
}

function applyToTarget(game: Game, caster: Actor, target: Actor, spell: SpellDef): void {
  switch (spell.effect) {
    case 'damage': {
      const dmg = spellPower(game, caster, spell);
      message(game, `${capitalize(theName(target))} ${target.isPlayer ? 'é atingido' : `é ${adj('atingido', target.gender)}`} (${dmg}).`, target.isPlayer ? 'lightRed' : 'white');
      damage(game, target, dmg, caster);
      if (!target.isPlayer && target.hp > 0) {
        target.ai.state = 'hunting';
        target.ai.lastSeen = { x: caster.x, y: caster.y };
      }
      break;
    }
    case 'heal': {
      const amount = spellPower(game, caster, spell);
      target.hp = Math.min(target.maxHp, target.hp + amount);
      emit(game, { type: 'heal', x: target.x, y: target.y });
      message(game, target.isPlayer ? `Você se sente melhor (+${amount}).` : `${capitalize(theName(target))} parece melhor.`, 'lightGreen');
      break;
    }
    default:
      break;
  }
}
