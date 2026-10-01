import type { Game } from './game';
import { createRngs, emit, level, message, refreshFov } from './game';
import { createActor } from './actor';
import { buildLevel } from '../gen/level';
import { themeById, themeForDepth } from '../data/themes';
import { isWalkable, DIRS8 } from './map';

/** Cria uma partida nova com o primeiro andar gerado proceduralmente. */
export function createGame(seed: number): Game {
  const game: Game = {
    seed,
    turn: 0,
    depth: 1,
    maxDepth: 1,
    levels: {},
    player: createActor(1, {
      templateId: 'player', name: 'você', glyph: '@', color: 'white', isPlayer: true, energy: 100,
      hp: 20, maxHp: 20, accuracy: 3, defense: 3, attacks: [{ verb: 'acerta', damage: '1d6+1' }],
    }),
    log: [],
    events: [],
    rng: createRngs(seed),
    nextId: 2,
  };
  enterLevel(game, 1, 'up');
  message(game, 'Você desce para o Abismo. Encontre o caminho para baixo...', 'yellow');
  return game;
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
  if (depth > game.maxDepth) game.maxDepth = depth;
  refreshFov(game);
  emit(game, { type: 'stairs' });
  if (game.turn > 0) {
    const theme = themeById(lvl.theme);
    message(game, `Você ${arrive === 'up' ? 'desce' : 'sobe'} para o andar ${depth}.`, 'white');
    if (firstVisit && theme.id !== previousTheme) message(game, `— ${theme.name} —`, themeForDepth(depth).wall);
  }
}
