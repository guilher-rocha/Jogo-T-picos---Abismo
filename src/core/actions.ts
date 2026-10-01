import type { Actor } from './actor';
import { ACTION_COST, hasFlag } from './actor';
import type { Game } from './game';
import { actorAt, emit, level, message, setDeathCause } from './game';
import { DIRS8, getTile, isWalkable, setTile } from './map';
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
import { hasStatus } from './status';
import type { MonsterSpecial } from './monsterSpecial';
import { monsterSpecial } from './monsterSpecial';
import { disarm, searchTraps, trapAt, triggerTrap } from './traps';
import { damage, resistMult } from './combat';
import { addStatus, removeStatus } from './status';
import { gainXp } from './hero';
import { createMonster } from './monster';
import { monsterTemplate } from '../data/monsters';

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
  | { type: 'read'; itemId: number; targetId?: number }
  | { type: 'zap'; itemId: number; tx: number; ty: number }
  | { type: 'invoke' }
  | { type: 'search' }
  | { type: 'special'; kind: MonsterSpecial }
  | { type: 'fountain' }
  | { type: 'disarm'; dx: number; dy: number };

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
    case 'search':
      return actor.isPlayer ? doSearch(game) : 0;
    case 'special':
      return actor.isPlayer ? 0 : monsterSpecial(game, actor, action.kind);
    case 'fountain':
      return actor.isPlayer ? drinkFountain(game) : 0;
    case 'disarm':
      return actor.isPlayer ? disarm(game, action.dx, action.dy) : 0;
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
      return item ? readItem(game, item, action.targetId) : 0;
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

/** Efeitos de pisar em água, lava, fonte e altar. */
function enterTile(game: Game, t: number): void {
  const p = game.player;
  if (t === Tile.Water) {
    if (hasStatus(p, 'burning')) removeStatus(game, p, 'burning');
    message(game, 'Você atravessa a água gelada.', 'lightBlue');
  } else if (t === Tile.Lava) {
    message(game, 'A lava queima seus pés!', 'orange');
    damage(game, p, Math.round(game.rng.loot.roll('4d6') * resistMult(p, 'fire')));
    if (!game.over) addStatus(game, p, 'burning', 3, 2);
    setDeathCause(game, 'derretido na lava');
  } else if (t === Tile.Fountain) message(game, 'Há uma fonte aqui (q para beber).', 'lightCyan');
  else if (t === Tile.Altar) message(game, 'Há um altar aqui. Largue itens sobre ele para sentir sua aura.', 'white');
}

/** Bebe da fonte: efeito aleatório; às vezes ela seca. */
function drinkFountain(game: Game): number {
  const p = game.player;
  const map = level(game).map;
  if (getTile(map, p.x, p.y) !== Tile.Fountain) return 0;
  const roll = game.rng.loot.int(1, 100);
  if (roll <= 30) {
    p.hp = Math.min(p.maxHp, p.hp + game.rng.loot.roll('2d8'));
    message(game, 'A água é refrescante. Você se sente melhor.', 'lightGreen');
  } else if (roll <= 45) {
    p.mp = Math.min(p.maxMp, p.mp + game.rng.loot.roll('2d6'));
    message(game, 'A água formiga na sua língua.', 'lightBlue');
  } else if (roll <= 60) {
    addStatus(game, p, 'poisoned', 6, 1);
  } else if (roll <= 68) {
    gainXp(game, 10 * game.depth);
    message(game, 'Você sente uma sabedoria antiga fluir em você.', 'gold');
  } else if (roll <= 75) {
    addStatus(game, p, 'confused', 5);
  } else if (roll <= 80) {
    message(game, 'Uma serpente d\'água salta da fonte!', 'lightRed');
    const free = DIRS8.find((d) => isWalkable(map, p.x + d.x, p.y + d.y) && !actorAt(game, p.x + d.x, p.y + d.y));
    if (free) {
      const s = createMonster(game, monsterTemplate('serpent'), p.x + free.x, p.y + free.y, game.rng.loot);
      s.ai.state = 'hunting';
      level(game).actors.push(s);
    }
  } else message(game, 'A água tem um gosto metálico.', 'lightGray');
  if (game.rng.loot.chance(30)) {
    setTile(map, p.x, p.y, Tile.DryFountain);
    message(game, 'A fonte seca.', 'darkGray');
  }
  return ACTION_COST;
}

/** Procura portas secretas nas casas vizinhas. */
function doSearch(game: Game): number {
  const map = level(game).map;
  const p = game.player;
  const chance = 30 + (p.flags.includes('secretSense') ? 30 : 0) + 3 * game.hero.level;
  for (const d of DIRS8) {
    const x = p.x + d.x;
    const y = p.y + d.y;
    if (getTile(map, x, y) === Tile.SecretDoor && game.rng.loot.chance(chance)) {
      setTile(map, x, y, Tile.DoorClosed);
      message(game, 'Você encontra uma porta secreta!', 'yellow');
    }
  }
  searchTraps(game, chance + (game.hero.classId === 'rogue' ? 30 : 0));
  return ACTION_COST;
}

/** Mover: ataca se houver inimigo, abre porta se estiver fechada, senão anda. */
function doMove(game: Game, actor: Actor, dx: number, dy: number): number {
  // Confuso: metade das vezes vai para uma direção aleatória.
  if (hasStatus(actor, 'confused') && game.rng.ai.chance(50)) {
    const d = game.rng.ai.pick(DIRS8);
    dx = d.x;
    dy = d.y;
    if (actor.isPlayer) message(game, 'Você cambaleia...', 'magenta');
  }
  const nx = actor.x + dx;
  const ny = actor.y + dy;
  const map = level(game).map;
  const other = actorAt(game, nx, ny);
  if (other) {
    // Monstros não se atacam entre si.
    if (actor.isPlayer || other.isPlayer) {
      if (hasStatus(actor, 'afraid')) {
        if (actor.isPlayer) message(game, 'Você está apavorado demais para atacar!', 'orange');
        return actor.isPlayer ? 0 : ACTION_COST;
      }
      meleeAttack(game, actor, other);
      return game.hero.classId === 'warrior' && actor.isPlayer && game.hero.level >= 15 ? 75 : ACTION_COST;
    }
    return 0;
  }
  const t = getTile(map, nx, ny);
  if (t === Tile.DoorClosed) {
    if (!actor.isPlayer && !hasFlag(actor, 'opensDoors')) return 0;
    setTile(map, nx, ny, Tile.DoorOpen);
    if (map.visible[ny * map.width + nx]) emit(game, { type: 'door' });
    if (actor.isPlayer) message(game, 'Você abre a porta.', 'lightGray');
    else if (map.visible[ny * map.width + nx]) message(game, `${capitalize(theName(actor))} abre uma porta.`, 'lightGray');
    return ACTION_COST;
  }
  if (t === Tile.DoorLocked) {
    if (actor.isPlayer) message(game, 'A porta está trancada.', 'lightGray');
    return 0;
  }
  if (!isWalkable(map, nx, ny)) return 0;
  if (t === Tile.Lava && actor.isPlayer && (actor.resist?.fire ?? 0) < 100) {
    const key = `${game.depth},${nx},${ny}`;
    if (game.lavaWarned !== key && !hasStatus(actor, 'confused')) {
      game.lavaWarned = key;
      message(game, 'Isso é lava! Mova de novo nessa direção para atravessar mesmo assim.', 'orange');
      return 0;
    }
  }
  if (t === Tile.Lava && !actor.isPlayer && (actor.resist?.fire ?? 0) < 100) return 0;
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
    enterTile(game, t);
    const trap = trapAt(game, nx, ny);
    if (trap) triggerTrap(game, trap);
  }
  return ACTION_COST;
}
