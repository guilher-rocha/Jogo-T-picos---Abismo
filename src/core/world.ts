import type { Game } from './game';
import { RNG } from '../engine/rng';
import { createRngs, emit, level, message, refreshFov } from './game';
import { createActor } from './actor';
import { buildLevel } from '../gen/level';
import { themeById, themeForDepth } from '../data/themes';
import { bossForDepth } from '../data/bosses';
import { isWalkable, DIRS8 } from './map';
import { createHero, gainXp, recalcPlayer } from './hero';
import { classById } from '../data/classes';
import { CATEGORY_SLOT, itemBase } from '../data/items';
import { createItem } from './item';
import type { Item } from './item';
import { createIdState, learn } from './identify';
import { addToInventory, equip, equipped } from './inventory';
import { partyArrives } from './party';

/** Escolhas feitas na criação do personagem. */
export interface HeroSpec {
  name: string;
  raceId: string;
  classId: string;
  /** Se presente, aplica a variação aleatória de atributos com esta seed. */
  rollSeed?: number;
}

export const DEFAULT_HERO: HeroSpec = { name: 'Aventureiro', raceId: 'human', classId: 'warrior' };

/** Cria uma partida nova com o primeiro andar gerado proceduralmente. */
export function createGame(seed: number, spec: HeroSpec = DEFAULT_HERO): Game {
  const game: Game = {
    seed,
    turn: 0,
    depth: 1,
    maxDepth: 1,
    levels: {},
    player: createActor(1, { templateId: 'player', name: 'você', glyph: '@', color: 'white', isPlayer: true, energy: 100 }),
    hero: createHero(spec.name, spec.raceId, spec.classId, spec.rollSeed !== undefined ? new RNG(spec.rollSeed) : undefined),
    log: [],
    events: [],
    uniquesKilled: [],
    artifactsFound: [],
    idState: createIdState(seed),
    hasAmulet: false,
    rng: createRngs(seed),
    nextId: 2,
  };
  giveStartingKit(game);
  // O personagem conhece o próprio equipamento inicial.
  for (const it of game.hero.inventory) learn(game, it.baseId);
  recalcPlayer(game);
  game.player.hp = game.player.maxHp;
  game.player.mp = game.player.maxMp;
  enterLevel(game, 1, 'up');
  game.events = [];
  message(game, 'Você desce para o Abismo. Encontre o caminho para baixo...', 'yellow');
  return game;
}

/** Itens iniciais da classe, já equipados. */
export function giveStartingKit(game: Game): void {
  const added: Item[] = [];
  for (const id of classById(game.hero.classId).startingItems) {
    const base = itemBase(id);
    const item = addToInventory(game, createItem(game, id, { quantity: base.category === 'ammo' ? 40 : 1 }));
    if (item && !added.includes(item)) added.push(item);
  }
  // Equipa, na ordem da lista da classe, o primeiro item de cada slot.
  for (const item of added) {
    const slot = CATEGORY_SLOT[itemBase(item.baseId).category];
    if (slot && equipped(game, slot) === undefined) {
      if (slot === 'offhand' && equipped(game, 'weapon') && itemBase(equipped(game, 'weapon')!.baseId).twoHanded) continue;
      equip(game, item, true);
    }
  }
}

/**
 * Leva o jogador para outro andar (gerando-o na primeira visita).
 * `arrive` diz em qual escada ele aparece: descendo, chega na escada de subida ('up').
 */
export function enterLevel(game: Game, depth: number, arrive: 'up' | 'down'): void {
  const previousTheme = game.levels[game.depth]?.theme;
  if (!game.levels[depth]) game.levels[depth] = buildLevel(game, depth);
  game.depth = depth;
  const lvl = level(game);
  const p = arrive === 'up' ? lvl.up : lvl.down;
  // Se houver um monstro na escada, aparece ao lado.
  let spot = p;
  if (lvl.actors.some((a) => a.x === p.x && a.y === p.y)) {
    const d = DIRS8.find((d) => isWalkable(lvl.map, p.x + d.x, p.y + d.y) && !lvl.actors.some((a) => a.x === p.x + d.x && a.y === p.y + d.y));
    if (d) spot = { x: p.x + d.x, y: p.y + d.y };
  }
  game.player.x = spot.x;
  game.player.y = spot.y;
  const firstVisit = !lvl.visited;
  lvl.visited = true;
  const deeper = depth > game.maxDepth;
  if (deeper) game.maxDepth = depth;
  refreshFov(game);
  emit(game, { type: 'stairs' });
  if (previousTheme !== undefined) {
    const theme = themeById(lvl.theme);
    message(game, `Você ${arrive === 'up' ? 'desce' : 'sobe'} para o andar ${depth}.`, 'white');
    if (firstVisit && theme.id !== previousTheme) message(game, `— ${theme.name} —`, themeForDepth(depth).wall);
    const boss = bossForDepth(depth);
    if (firstVisit && boss && !game.uniquesKilled.includes(boss.id)) message(game, boss.intro, 'lightRed');
  }
  // Explorar mais fundo também dá experiência.
  if (deeper) gainXp(game, 5 * depth);
  // Multijogador: os outros heróis chegam junto (e os caídos voltam).
  if (game.party) partyArrives(game, game.player);
}
