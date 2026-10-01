import type { Action } from '../core/actions';
import type { Game } from '../core/game';
import { level } from '../core/game';
import type { Actor } from '../core/actor';
import type { Point } from '../core/map';
import { DIRS8, distance, idx, inBounds, isWalkable } from '../core/map';
import { itemsAt } from '../core/item';
import { equipped, isEquipped } from '../core/inventory';
import { readyAmmo } from '../core/ranged';
import { spellById } from '../data/spells';
import { itemBase } from '../data/items';
import { Tile } from '../data/tiles';
import { dijkstraMap, stepDownhill, UNREACHABLE } from './pathing';
import { hasLineOfSight } from '../core/fov';
import { activeAbilities, abilityReadyIn } from '../core/abilities';

/**
 * "Jogador automático": decide uma ação para o herói.
 * Usado no attract mode (demonstração), na simulação de balanceamento e no autoexplorar.
 * Estratégia simples: curar quando ferido, lutar com quem está perto, pegar itens, explorar,
 * descansar e descer quando o andar estiver explorado.
 */
export function botAction(game: Game): Action {
  const p = game.player;
  const lvl = level(game);
  const map = lvl.map;
  const visible = lvl.actors.filter((a) => map.visible[idx(map, a.x, a.y)]);
  const hpFrac = p.hp / p.maxHp;

  // 1. Emergência: beber poção de cura.
  if (hpFrac < 0.35) {
    const potion = game.hero.inventory.find((i) => i.baseId === 'potion_heal' || i.baseId === 'potion_heal_major');
    if (potion) return { type: 'quaff', itemId: potion.id };
    if (game.hero.spells.includes('cure_light') && p.mp >= 3) return { type: 'cast', spellId: 'cure_light' };
  }

  // 2. Inimigo adjacente: ataca o mais fraco.
  const adjacent = visible.filter((a) => distance(a, p) === 1).sort((a, b) => a.hp - b.hp);
  if (adjacent.length) {
    const t = adjacent[0];
    if (game.hero.classId === 'warrior' && adjacent.length >= 3 && activeAbilities(game).some((a) => a.id === 'whirlwind') && abilityReadyIn(game, 'whirlwind') === 0) {
      return { type: 'ability', abilityId: 'whirlwind' };
    }
    return { type: 'move', dx: t.x - p.x, dy: t.y - p.y };
  }

  // 3. Inimigo à vista: ataque à distância se possível.
  const target = visible.filter((a) => a.ai.state !== 'sleeping' || distance(a, p) <= 6).sort((a, b) => distance(a, p) - distance(b, p))[0];
  if (target && hasLineOfSight(map, p.x, p.y, target.x, target.y)) {
    const missile = spellById('magic_missile');
    if (missile && game.hero.spells.includes('magic_missile') && p.mp >= missile.cost && distance(target, p) <= (missile.range ?? 10)) {
      return { type: 'cast', spellId: 'magic_missile', tx: target.x, ty: target.y };
    }
    if (!readyAmmo(game).problem && distance(target, p) <= 10) return { type: 'fire', tx: target.x, ty: target.y };
    // Vai até ele.
    const step = stepToward(game, [target]);
    if (step) return step;
  }

  // 4. Item embaixo: pega (menos cadáveres e coisas pesadas demais).
  const here = itemsAt(lvl, p.x, p.y).filter((i) => i.baseId !== 'corpse');
  if (here.length) return { type: 'pickup', itemId: here[0].id };

  // 5. Melhorar equipamento.
  const upgrade = findUpgrade(game);
  if (upgrade) return upgrade;

  // 6. Descansar se ferido e sem ninguém por perto.
  if (hpFrac < 0.7 && !visible.length) return { type: 'wait' };

  // 7. Ir até itens visíveis.
  const items = lvl.items.filter((i) => i.baseId !== 'corpse' && map.visible[idx(map, i.x, i.y)]);
  if (items.length) {
    const step = stepToward(game, items);
    if (step) return step;
  }

  // 8. Explorar (fronteira: células conhecidas ao lado do desconhecido).
  const frontier = explorationFrontier(game);
  if (frontier.length) {
    const step = stepToward(game, frontier);
    if (step) return step;
  }

  // 9. Andar explorado: desce.
  if (map.tiles[idx(map, p.x, p.y)] === Tile.StairsDown) return { type: 'descend' };
  const stairs = findTile(game, Tile.StairsDown);
  if (stairs) {
    const step = stepToward(game, [stairs]);
    if (step) return step;
  }
  // No andar final: vai atrás do Coração ou invoca.
  if (game.hasAmulet) return { type: 'invoke' };
  const heart = lvl.items.find((i) => i.baseId === 'amulet_abyss' && map.explored[idx(map, i.x, i.y)]);
  if (heart) {
    const step = stepToward(game, [heart]);
    if (step) return step;
  }
  return searchForSecrets(game);
}

const searchState = new WeakMap<Game, { spot: Point; count: number; depth: number }>();

/** Vai até um ponto junto a paredes e procura portas secretas por alguns turnos. */
function searchForSecrets(game: Game): Action {
  const map = level(game).map;
  const p = game.player;
  let st = searchState.get(game);
  if (!st || st.depth !== game.depth || st.count >= 12) {
    const spots: Point[] = [];
    for (let y = 1; y < map.height - 1; y++) {
      for (let x = 1; x < map.width - 1; x++) {
        if (!map.explored[idx(map, x, y)] || !isWalkable(map, x, y)) continue;
        const walls = DIRS8.filter((d) => map.tiles[idx(map, x + d.x, y + d.y)] === Tile.Wall || map.tiles[idx(map, x + d.x, y + d.y)] === Tile.SecretDoor).length;
        if (walls >= 5) spots.push({ x, y }); // becos sem saída e cantos
      }
    }
    if (!spots.length) return randomStep(game);
    st = { spot: game.rng.ai.pick(spots), count: 0, depth: game.depth };
    searchState.set(game, st);
  }
  if (p.x === st.spot.x && p.y === st.spot.y) {
    st.count++;
    return { type: 'search' };
  }
  const step = stepToward(game, [st.spot]);
  if (step) return step;
  st.count = 99;
  return randomStep(game);
}

/** Células exploradas e passáveis vizinhas de células nunca vistas. */
export function explorationFrontier(game: Game): Point[] {
  const map = level(game).map;
  const out: Point[] = [];
  for (let y = 1; y < map.height - 1; y++) {
    for (let x = 1; x < map.width - 1; x++) {
      const i = idx(map, x, y);
      if (!map.explored[i]) continue;
      const t = map.tiles[i];
      if (!isWalkable(map, x, y) && t !== Tile.DoorClosed) continue;
      for (const d of DIRS8) {
        const nx = x + d.x;
        const ny = y + d.y;
        if (inBounds(map, nx, ny) && !map.explored[idx(map, nx, ny)]) {
          out.push({ x, y });
          break;
        }
      }
    }
  }
  return out;
}

function findTile(game: Game, tile: number): Point | undefined {
  const map = level(game).map;
  for (let i = 0; i < map.tiles.length; i++) {
    if (map.tiles[i] === tile && map.explored[i]) return { x: i % map.width, y: Math.floor(i / map.width) };
  }
  return undefined;
}

/** Passo em direção ao objetivo mais próximo (por caminho, não em linha reta). */
function stepToward(game: Game, goals: Point[]): Action | null {
  const map = level(game).map;
  const p = game.player;
  // Só caminha por células conhecidas (o bot não "trapaceia" vendo o mapa inteiro).
  const known = { ...map, tiles: map.tiles.map((t, i) => (map.explored[i] ? t : Tile.Wall)) };
  const dist = dijkstraMap(known, goals);
  if (dist[idx(map, p.x, p.y)] >= UNREACHABLE) return null;
  const blocked = (x: number, y: number) =>
    (!isWalkable(map, x, y) && map.tiles[idx(map, x, y)] !== Tile.DoorClosed) || level(game).actors.some((m) => m.x === x && m.y === y);
  const step = stepDownhill(map, dist, p, blocked);
  return step ? { type: 'move', dx: step.x, dy: step.y } : null;
}

function randomStep(game: Game): Action {
  const p = game.player;
  const map = level(game).map;
  const options = DIRS8.filter((d) => isWalkable(map, p.x + d.x, p.y + d.y));
  if (!options.length) return { type: 'wait' };
  const d = game.rng.ai.pick(options);
  return { type: 'move', dx: d.x, dy: d.y };
}

/** Equipa arma/armadura melhor que a atual, se houver no inventário. */
function findUpgrade(game: Game): Action | null {
  const score = (baseId: string, enchant: number) => {
    const b = itemBase(baseId);
    if (b.armor !== undefined) return b.armor + enchant;
    if (b.damage && b.category === 'weapon') {
      const m = /^(\d*)d(\d+)([+-]\d+)?$/.exec(b.damage);
      const avg = m ? (Number(m[1] || 1) * (Number(m[2]) + 1)) / 2 + Number(m[3] ?? 0) : 1;
      return avg + enchant;
    }
    return -1;
  };
  for (const item of game.hero.inventory) {
    if (isEquipped(game, item) || item.cursed) continue;
    const b = itemBase(item.baseId);
    const slot = b.category === 'weapon' ? 'weapon' : b.category === 'armor' ? 'body' : b.category === 'shield' ? 'offhand' : b.category === 'helm' ? 'head' : b.category === 'boots' ? 'feet' : b.category === 'gloves' ? 'hands' : b.category === 'cloak' ? 'cloak' : null;
    if (!slot) continue;
    const cur = equipped(game, slot);
    // Não troca o arco do Patrulheiro por uma arma corpo a corpo, nem pega escudo com arma de duas mãos.
    if (slot === 'weapon' && cur && itemBase(cur.baseId).category === 'launcher') continue;
    if (slot === 'offhand') {
      const w = equipped(game, 'weapon');
      if (w && itemBase(w.baseId).twoHanded) continue;
    }
    if (slot === 'weapon' && b.twoHanded && equipped(game, 'offhand')) continue;
    const curScore = cur ? score(cur.baseId, cur.enchant) : -1;
    if (score(item.baseId, item.enchant) > curScore) return { type: 'equip', itemId: item.id };
  }
  return null;
}

/** Um monstro ameaça o jogador? (usado para interromper descanso/autoexplorar). */
export function threatsVisible(game: Game): Actor[] {
  const lvl = level(game);
  return lvl.actors.filter((a) => lvl.map.visible[idx(lvl.map, a.x, a.y)] && a.ai.state !== 'sleeping');
}
