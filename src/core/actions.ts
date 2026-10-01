import type { Actor } from './actor';
import { ACTION_COST, hasFlag } from './actor';
import type { Game } from './game';
import { actorAt, level, message } from './game';
import { getTile, isWalkable, setTile } from './map';
import { Tile } from '../data/tiles';
import { meleeAttack } from './combat';
import { enterLevel } from './world';
import { castSpell } from './spells';
import { useAbility } from './abilities';
import { MAX_DEPTH } from '../data/themes';
import { capitalize, theName } from './text';
import type { EquipSlot } from '../data/items';
import { itemBase } from '../data/items';
import { itemsAt } from './item';
import { burden, describeFloor, dropItem, equip, pickUp, unequip } from './inventory';
import { eat, quaff, readItem, zapWand } from './consumables';
import { fire, throwItem } from './ranged';
import { recalcPlayer } from './hero';

export { THROW_RANGE, projectileGlyph } from './ranged';

/** Ações possíveis. Jogador e monstros usam exatamente as mesmas. */
export type Action =
  | { type: 'move'; dx: number; dy: number }
  | { type: 'attack'; dx: number; dy: number }
  | { type: 'wait' }
  | { type: 'descend' }
  | { type: 'ascend' }
  | { type: 'cast'; spellId: string; tx?: number; ty?: number }
  | { type: 'ability'; abilityId: string; dx?: number; dy?: number }
  | { type: 'pickup'; itemId?: number }
  | { type: 'drop'; itemId: number; quantity?: number }
  | { type: 'equip'; itemId: number }
  | { type: 'unequip'; slot: EquipSlot }
  | { type: 'quaff'; itemId: number }
  | { type: 'eat'; itemId: number }
  | { type: 'throw'; itemId: number; tx: number; ty: number }
  | { type: 'fire'; tx: number; ty: number }
  | { type: 'read'; itemId: number }
  | { type: 'zap'; itemId: number; tx: number; ty: number }
  | { type: 'invoke' };

/**
 * Executa uma ação. Retorna a energia gasta (0 = ação inválida, não passa o tempo).
 */
export function perform(game: Game, actor: Actor, action: Action): number {
  switch (action.type) {
    case 'move':
      return doMove(game, actor, action.dx, action.dy);
    case 'attack': {
      const target = actorAt(game, actor.x + action.dx, actor.y + action.dy);
      if (!target || target === actor) return 0;
      meleeAttack(game, actor, target);
      return ACTION_COST;
    }
    case 'wait':
      return ACTION_COST;
    case 'cast':
      return castSpell(game, actor, action.spellId, action.tx !== undefined ? { x: action.tx, y: action.ty! } : undefined);
    case 'ability':
      return actor.isPlayer ? useAbility(game, action.abilityId, action.dx, action.dy) : 0;
    case 'descend':
      return doStairs(game, actor, 'down');
    case 'ascend':
      return doStairs(game, actor, 'up');
    case 'fire':
      return actor.isPlayer ? fire(game, actor, { x: action.tx, y: action.ty }) : 0;
    case 'invoke':
      if (!actor.isPlayer || !game.hasAmulet) {
        message(game, 'Você não tem nada para invocar.', 'darkGray');
        return 0;
      }
      message(game, 'O Coração do Abismo brilha e o mundo se dobra ao seu redor...', 'lightMagenta');
      game.over = { won: true, escaped: false, cause: 'venceu: invocou o Coração do Abismo' };
      return ACTION_COST;
  }
  // Ações de inventário: só o jogador.
  if (!actor.isPlayer) return 0;
  return performItemAction(game, action);
}

function findItem(game: Game, id: number) {
  return game.hero.inventory.find((i) => i.id === id);
}

function performItemAction(game: Game, action: Action): number {
  switch (action.type) {
    case 'pickup': {
      const here = itemsAt(level(game), game.player.x, game.player.y);
      const item = action.itemId !== undefined ? here.find((i) => i.id === action.itemId) : here[0];
      if (!item) {
        message(game, 'Não há nada aqui para pegar.', 'darkGray');
        return 0;
      }
      if (!pickUp(game, item)) return 0;
      recalcPlayer(game);
      return ACTION_COST;
    }
    case 'drop': {
      const item = findItem(game, action.itemId);
      if (!item || !dropItem(game, item, action.quantity)) return 0;
      recalcPlayer(game);
      return ACTION_COST;
    }
    case 'equip': {
      const item = findItem(game, action.itemId);
      if (!item || !equip(game, item)) return 0;
      recalcPlayer(game);
      return ACTION_COST;
    }
    case 'unequip':
      if (!unequip(game, action.slot)) return 0;
      recalcPlayer(game);
      return ACTION_COST;
    case 'quaff': {
      const item = findItem(game, action.itemId);
      return item ? quaff(game, item) : 0;
    }
    case 'eat': {
      const item = findItem(game, action.itemId);
      return item ? eat(game, item) : 0;
    }
    case 'throw': {
      const item = findItem(game, action.itemId);
      if (!item) return 0;
      const cost = throwItem(game, game.player, item, { x: action.tx, y: action.ty });
      recalcPlayer(game);
      return cost;
    }
    case 'read': {
      const item = findItem(game, action.itemId);
      return item ? readItem(game, item) : 0;
    }
    case 'zap': {
      const item = findItem(game, action.itemId);
      return item ? zapWand(game, item, { x: action.tx, y: action.ty }) : 0;
    }
  }
  return 0;
}

function doStairs(game: Game, actor: Actor, dir: 'up' | 'down'): number {
  if (!actor.isPlayer) return 0;
  const t = getTile(level(game).map, actor.x, actor.y);
  if (dir === 'down') {
    if (t !== Tile.StairsDown) {
      message(game, 'Não há escada para baixo aqui.', 'darkGray');
      return 0;
    }
    if (game.depth >= MAX_DEPTH) return 0;
    enterLevel(game, game.depth + 1, 'up');
    return ACTION_COST;
  }
  if (t !== Tile.StairsUp) {
    message(game, 'Não há escada para cima aqui.', 'darkGray');
    return 0;
  }
  if (game.depth === 1) {
    if (game.hasAmulet) {
      message(game, 'Você sobe para a luz do dia com o Coração do Abismo nas mãos!', 'gold');
      game.over = { won: true, escaped: true, cause: 'escapou do Abismo com o Coração' };
      return ACTION_COST;
    }
    message(game, 'A saída está bloqueada por uma força mágica. Só o Coração do Abismo pode abri-la.', 'lightGray');
    return 0;
  }
  enterLevel(game, game.depth - 1, 'down');
  return ACTION_COST;
}

/** Mover: ataca se houver inimigo, abre porta se estiver fechada, senão anda. */
function doMove(game: Game, actor: Actor, dx: number, dy: number): number {
  const nx = actor.x + dx;
  const ny = actor.y + dy;
  const map = level(game).map;
  const other = actorAt(game, nx, ny);
  if (other) {
    // Monstros não se atacam entre si.
    if (actor.isPlayer || other.isPlayer) {
      meleeAttack(game, actor, other);
      return ACTION_COST;
    }
    return 0;
  }
  const t = getTile(map, nx, ny);
  if (t === Tile.DoorClosed) {
    if (!actor.isPlayer && !hasFlag(actor, 'opensDoors')) return 0;
    setTile(map, nx, ny, Tile.DoorOpen);
    if (actor.isPlayer) message(game, 'Você abre a porta.', 'lightGray');
    else if (map.visible[ny * map.width + nx]) message(game, `${capitalize(theName(actor))} abre uma porta.`, 'lightGray');
    return ACTION_COST;
  }
  if (t === Tile.DoorLocked) {
    if (actor.isPlayer) message(game, 'A porta está trancada.', 'lightGray');
    return 0;
  }
  if (!isWalkable(map, nx, ny)) return 0;
  if (actor.isPlayer && burden(game) === 2) {
    message(game, 'Você está carregando peso demais para andar!', 'orange');
    return 0;
  }
  actor.x = nx;
  actor.y = ny;
  if (actor.isPlayer) {
    // Ouro é pego automaticamente.
    for (const it of itemsAt(level(game), nx, ny)) if (itemBase(it.baseId).category === 'gold') pickUp(game, it);
    describeFloor(game);
  }
  return ACTION_COST;
}
