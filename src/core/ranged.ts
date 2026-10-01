import type { Actor } from './actor';
import { ACTION_COST } from './actor';
import type { Game } from './game';
import { actorAt, emit, level, message } from './game';
import type { Point } from './map';
import { isTransparent, isWalkable } from './map';
import { bresenham } from './fov';
import type { Item } from './item';
import { addItem } from './item';
import { equipped, takeFromInventory } from './inventory';
import { itemName } from './itemText';
import { itemBase } from '../data/items';
import { damage, hitChance } from './combat';
import { statMod } from './hero';
import { capitalize, theName } from './text';
import { potionEffect } from './consumables';

export const THROW_RANGE = 8;

/** Glifo do projétil conforme a direção: - | / \ */
export function projectileGlyph(dx: number, dy: number): string {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ay * 2 < ax) return '-';
  if (ax * 2 < ay) return '|';
  return Math.sign(dx) === Math.sign(dy) ? '\\' : '/';
}

/** Traça o voo de um projétil: para no primeiro ator ou antes de uma parede. */
export function traceProjectile(game: Game, from: Point, to: Point, range: number): { path: Point[]; hit?: Actor } {
  const map = level(game).map;
  const path: Point[] = [];
  for (const p of bresenham(from.x, from.y, to.x, to.y).slice(1, range + 1)) {
    if (!isTransparent(map, p.x, p.y)) break;
    path.push(p);
    const other = actorAt(game, p.x, p.y);
    if (other) return { path, hit: other };
  }
  return { path };
}

interface Shot {
  item: Item;
  damage: number;
  accuracyBonus: number;
  range: number;
  /** Chance (%) de o projétil quebrar ao acertar. */
  breakChance: number;
}

function resolveShot(game: Game, actor: Actor, target: Point, shot: Shot): void {
  const { path, hit } = traceProjectile(game, actor, target, shot.range);
  const base = itemBase(shot.item.baseId);
  const glyph = base.category === 'potion' ? '!' : projectileGlyph(target.x - actor.x, target.y - actor.y);
  emit(game, { type: 'projectile', path, glyph, color: base.color });
  const missile = itemName(game, { ...shot.item, quantity: 1 }, 'the');
  let broke = false;
  if (hit) {
    const chance = Math.max(5, Math.min(95, hitChance(actor, hit) + shot.accuracyBonus * 5));
    if (game.rng.combat.chance(chance)) {
      message(game, `${capitalize(missile)} acerta ${theName(hit)}.`, hit.isPlayer ? 'lightRed' : 'white');
      damage(game, hit, Math.max(1, shot.damage), actor);
      broke = game.rng.combat.chance(shot.breakChance);
    } else {
      emit(game, { type: 'miss', x: hit.x, y: hit.y });
      message(game, `${capitalize(missile)} erra ${theName(hit)}.`, 'lightGray');
    }
    if (!hit.isPlayer && hit.hp > 0) {
      hit.ai.state = 'hunting';
      hit.ai.lastSeen = { x: actor.x, y: actor.y };
    }
  }
  // Poções se quebram (e afetam quem foi atingido); o resto cai no chão onde parou.
  if (base.category === 'potion') {
    message(game, `${capitalize(missile)} se espatifa!`, 'lightGray');
    if (hit && hit.hp > 0 && base.effect) potionEffect(game, hit, base.effect);
    return;
  }
  if (broke) return;
  const land = path[path.length - 1] ?? { x: actor.x, y: actor.y };
  const spot = isWalkable(level(game).map, land.x, land.y) ? land : { x: actor.x, y: actor.y };
  addItem(level(game), { ...shot.item, quantity: 1, x: spot.x, y: spot.y, letter: undefined, id: game.nextId++ });
}

/** Arremessa um item do inventário. */
export function throwItem(game: Game, actor: Actor, item: Item, target: Point): number {
  if (target.x === actor.x && target.y === actor.y) return 0;
  const base = itemBase(item.baseId);
  const one = takeFromInventory(game, item, 1);
  const strMod = statMod(game.hero.stats.str);
  const dmg = base.throwDamage ? game.rng.combat.roll(base.throwDamage) + one.enchant + Math.max(0, strMod) : game.rng.combat.roll('1d2');
  message(game, `Você arremessa ${itemName(game, one)}.`, 'lightGray');
  resolveShot(game, actor, target, { item: one, damage: dmg, accuracyBonus: base.throwDamage ? 1 + one.enchant : -2, range: THROW_RANGE, breakChance: 10 });
  return ACTION_COST;
}

/** Munição na aljava compatível com a arma de disparo empunhada. */
export function readyAmmo(game: Game): { launcher?: Item; ammo?: Item; problem?: string } {
  const launcher = equipped(game, 'weapon');
  const lb = launcher ? itemBase(launcher.baseId) : undefined;
  if (!launcher || !lb || lb.category !== 'launcher') return { problem: 'Você não está empunhando uma arma de disparo.' };
  const ammo = equipped(game, 'quiver');
  if (!ammo) return { launcher, problem: 'Sua aljava está vazia (Q escolhe a munição).' };
  if (itemBase(ammo.baseId).ammoKind !== lb.ammoType) return { launcher, problem: 'Essa munição não serve nesta arma.' };
  return { launcher, ammo };
}

/** Dispara a arma de disparo empunhada. */
export function fire(game: Game, actor: Actor, target: Point): number {
  const { launcher, ammo, problem } = readyAmmo(game);
  if (problem || !launcher || !ammo) {
    message(game, problem ?? 'Você não pode disparar.', 'darkGray');
    return 0;
  }
  if (target.x === actor.x && target.y === actor.y) return 0;
  const lb = itemBase(launcher.baseId);
  const ab = itemBase(ammo.baseId);
  const one = takeFromInventory(game, ammo, 1);
  const mult = lb.multiplier ?? 2;
  const dmg = (game.rng.combat.roll(ab.damage ?? '1d4') + one.enchant + launcher.enchant) * mult;
  const archery = game.hero.classId === 'ranger' ? 3 : 0;
  const dexMod = statMod(game.hero.stats.dex);
  resolveShot(game, actor, target, {
    item: one, damage: dmg, accuracyBonus: archery + dexMod - statMod(game.hero.stats.str) + launcher.enchant,
    range: lb.range ?? 10, breakChance: 30,
  });
  return ACTION_COST;
}
