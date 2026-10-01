import type { Actor } from './actor';
import { ACTION_COST } from './actor';
import type { Game } from './game';
import { actorAt, emit, level, message, refreshFov } from './game';
import type { Point } from './map';
import { getTile, idx, isTransparent, isWalkable, setTile } from './map';
import { bresenham } from './fov';
import { damage, resistMult } from './combat';
import { statMod } from './hero';
import { classById } from '../data/classes';
import type { SpellDef } from '../data/spells';
import { spellById } from '../data/spells';
import { adj, capitalize, theName } from './text';
import { addStatus, removeStatus } from './status';
import { collectBonuses } from './bonuses';
import { Tile } from '../data/tiles';

/** Chance de falha (%) de uma magia para o jogador. */
export function spellFailChance(game: Game, spell: SpellDef): number {
  const hero = game.hero;
  const cls = classById(hero.classId);
  // Magias da "outra escola" são mais difíceis (mago rezando, clérigo com magia arcana).
  const stat = spell.school === 'arcane' ? 'int' : 'wis';
  const castStat = cls.castStat === stat ? stat : cls.castStat ?? stat;
  let fail = spell.fail - 3 * statMod(hero.stats[castStat]) - 2 * (hero.level - spell.level);
  if (cls.castStat !== stat) fail += 15;
  if (hero.raceId === 'gnome') fail -= 5;
  fail += Math.round(collectBonuses(game).spellPenalty / 2);
  return Math.max(5, Math.min(95, fail));
}

/** Poder (dano/cura) da magia conforme o nível do conjurador. */
export function spellPower(game: Game, caster: Actor, spell: SpellDef): number {
  const base = spell.power ? game.rng.combat.roll(spell.power) : 0;
  return base + (spell.perLevel ? Math.floor(caster.level / spell.perLevel) : 0);
}

/** Caminho de um efeito mágico até o alvo (para no primeiro ator, a menos que atravesse). */
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
 * Conjura uma magia conhecida. Retorna energia gasta (0 = não conjurou).
 * Falha gasta metade do MP e o turno.
 */
export function castSpell(game: Game, caster: Actor, spellId: string, target?: Point): number {
  const spell = spellById(spellId) ?? game.customSpells?.find((s) => s.id === spellId);
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
  if (spell.shape !== 'self' && !target) return 0;
  const who = caster.isPlayer ? 'Você conjura' : `${capitalize(theName(caster))} conjura`;
  message(game, `${who} ${spell.name}${caster.isPlayer ? '.' : '!'}`, spell.color);
  invokeEffect(game, caster, spell, target);
  return ACTION_COST;
}

/** Aplica um efeito mágico (magia, varinha, pergaminho) a partir do conjurador. */
export function invokeEffect(game: Game, caster: Actor, spell: SpellDef, target?: Point): Actor[] {
  emit(game, { type: 'spell', color: spell.color });
  const affected: Actor[] = [];
  switch (spell.shape) {
    case 'self':
      affected.push(caster);
      applyToTarget(game, caster, caster, spell);
      break;
    case 'bolt':
    case 'beam': {
      if (!target) break;
      if (spell.effect === 'dig') {
        dig(game, caster, target, spell.range ?? 8);
        break;
      }
      const { path, hits } = trace(game, caster, target, spell.range ?? 10, spell.shape === 'beam');
      emit(game, spell.shape === 'bolt' ? { type: 'projectile', path, glyph: '*', color: spell.color } : { type: 'bolt', path, color: spell.color });
      for (const h of hits) {
        affected.push(h);
        applyToTarget(game, caster, h, spell);
      }
      break;
    }
    case 'ball': {
      if (!target) break;
      const { path, hits } = trace(game, caster, target, spell.range ?? 10, false);
      const center = hits[0] ? { x: hits[0].x, y: hits[0].y } : path[path.length - 1] ?? { x: caster.x, y: caster.y };
      emit(game, { type: 'projectile', path, glyph: '*', color: spell.color });
      const r = spell.radius ?? 1;
      emit(game, { type: 'explosion', x: center.x, y: center.y, radius: r, color: spell.color });
      const victims = [game.player, ...level(game).actors].filter((a) => Math.max(Math.abs(a.x - center.x), Math.abs(a.y - center.y)) <= r && a !== caster);
      for (const v of victims) {
        affected.push(v);
        applyToTarget(game, caster, v, spell);
      }
      break;
    }
  }
  return affected;
}

function turnsOf(game: Game, spell: SpellDef, fallback: string): number {
  return game.rng.combat.roll(spell.duration ?? fallback);
}

/** Teleporta um ator para uma casa livre aleatória (longe, se possível). */
export function teleportActor(game: Game, a: Actor, maxDist?: number): void {
  const map = level(game).map;
  const rng = game.rng.loot;
  for (let tries = 0; tries < 300; tries++) {
    const x = rng.int(1, map.width - 2);
    const y = rng.int(1, map.height - 2);
    if (!isWalkable(map, x, y) || actorAt(game, x, y)) continue;
    const d = Math.max(Math.abs(x - a.x), Math.abs(y - a.y));
    if (maxDist !== undefined ? d > maxDist || d < 2 : d < 10 && tries < 200) continue;
    a.x = x;
    a.y = y;
    if (a.isPlayer) refreshFov(game);
    return;
  }
}

function applyToTarget(game: Game, caster: Actor, target: Actor, spell: SpellDef): void {
  const name = capitalize(theName(target));
  const hostile = !target.isPlayer && caster.isPlayer;
  switch (spell.effect) {
    case 'damage': {
      const dmg = Math.round(spellPower(game, caster, spell) * resistMult(target, spell.element));
      message(game, `${name} ${target.isPlayer ? 'é atingido' : `é ${adj('atingido', target.gender)}`} (${dmg}).`, target.isPlayer ? 'lightRed' : 'white');
      damage(game, target, dmg, caster);
      if (spell.element === 'fire' && target.hp > 0 && game.rng.combat.chance(25)) addStatus(game, target, 'burning', 3, 2);
      break;
    }
    case 'heal': {
      const amount = spellPower(game, caster, spell);
      target.hp = Math.min(target.maxHp, target.hp + amount);
      emit(game, { type: 'heal', x: target.x, y: target.y });
      message(game, target.isPlayer ? `Você se sente melhor (+${amount}).` : `${name} parece melhor.`, 'lightGreen');
      break;
    }
    case 'slow':
      addStatus(game, target, 'slowed', turnsOf(game, spell, '2d6+8'));
      break;
    case 'sleep':
      addStatus(game, target, 'asleep', turnsOf(game, spell, '2d6+6'));
      break;
    case 'fear':
      addStatus(game, target, 'afraid', turnsOf(game, spell, '2d6+6'));
      break;
    case 'haste':
      addStatus(game, target, 'hasted', turnsOf(game, spell, '2d10+10'));
      break;
    case 'shield':
      addStatus(game, target, 'shielded', turnsOf(game, spell, '3d10+20'), 4 + Math.floor(caster.level / 4));
      break;
    case 'cure':
      for (const s of ['poisoned', 'confused', 'blind', 'burning'] as const) removeStatus(game, target, s);
      message(game, target.isPlayer ? 'Você se sente purificado.' : `${name} parece melhor.`, 'lightGreen');
      break;
    case 'teleport':
      teleportActor(game, target);
      message(game, target.isPlayer ? 'O mundo gira e você aparece em outro lugar!' : `${name} desaparece!`, 'lightMagenta');
      break;
    case 'blink':
      teleportActor(game, target, 7);
      message(game, target.isPlayer ? 'Você pisca e reaparece alguns passos adiante.' : `${name} pisca para outro lugar.`, 'lightMagenta');
      break;
    case 'detect':
      game.hero.cooldowns.tracking = game.turn + 30;
      message(game, `Você sente a presença de ${level(game).actors.length} criatura(s) neste andar.`, 'lightGreen');
      break;
    case 'mapping':
      magicMap(game);
      break;
  }
  if (hostile && target.hp > 0 && target.ai.state !== 'sleeping' && target.ai.state !== 'fleeing') {
    target.ai.state = 'hunting';
    target.ai.lastSeen = { x: caster.x, y: caster.y };
  }
}

/** Revela a planta do andar (paredes junto a chão). */
export function magicMap(game: Game): void {
  const map = level(game).map;
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const t = getTile(map, x, y);
      if (t === Tile.Wall) {
        let near = false;
        for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1 && !near; dx++) if (getTile(map, x + dx, y + dy) !== Tile.Wall) near = true;
        if (!near) continue;
      }
      if (t === Tile.SecretDoor) continue;
      map.explored[idx(map, x, y)] = 1;
    }
  }
  message(game, 'Uma imagem do andar se forma em sua mente!', 'lightCyan');
}

/** Escava um túnel em linha reta. */
function dig(game: Game, caster: Actor, target: Point, range: number): void {
  const map = level(game).map;
  const path: Point[] = [];
  for (const p of bresenham(caster.x, caster.y, target.x, target.y).slice(1, range + 1)) {
    if (p.x <= 0 || p.y <= 0 || p.x >= map.width - 1 || p.y >= map.height - 1) break;
    const t = getTile(map, p.x, p.y);
    if (t === Tile.Wall || t === Tile.SecretDoor || t === Tile.Fungus || t === Tile.DoorLocked || t === Tile.DoorClosed) setTile(map, p.x, p.y, Tile.Corridor);
    path.push(p);
  }
  emit(game, { type: 'bolt', path, color: 'brown' });
  message(game, 'A rocha se desfaz diante de você!', 'brown');
  refreshFov(game);
}
