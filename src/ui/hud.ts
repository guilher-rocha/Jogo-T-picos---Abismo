import type { Terminal } from '../engine/terminal';
import type { Color } from '../engine/colors';
import type { Game } from '../core/game';
import { level } from '../core/game';
import { distance, idx } from '../core/map';
import { formatMessage } from '../core/log';
import { healthDesc } from '../core/text';
import { FOOT_Y, MAP_Y, MSG_LINES, SIDE_W, SIDE_X } from './layout';
import { themeById } from '../data/themes';
import { classById } from '../data/classes';
import { raceById } from '../data/races';
import { MAX_LEVEL, xpForLevel } from '../core/hero';

/** Barra de progresso "████░░░░". */
export function bar(term: Terminal, x: number, y: number, width: number, value: number, max: number, color: Color): void {
  const filled = max > 0 ? Math.round((Math.max(0, value) / max) * width) : 0;
  for (let i = 0; i < width; i++) term.set(x + i, y, i < filled ? '█' : '░', i < filled ? color : 'darkGray');
}

export function hpColor(hp: number, max: number): Color {
  const f = hp / max;
  if (f > 0.6) return 'lightGreen';
  if (f > 0.3) return 'yellow';
  return 'lightRed';
}

/** Mensagens no topo: as últimas linhas, as recentes em destaque. */
export function drawMessages(term: Terminal, game: Game): void {
  const recent = game.log.slice(-MSG_LINES);
  recent.forEach((m, i) => {
    const fresh = m.turn >= game.turn - 1;
    term.print(1, i, formatMessage(m), fresh ? m.color : 'darkGray', 'black', 98);
  });
}

/** Painel lateral com o estado do jogador e os monstros visíveis. */
export function drawSidebar(term: Terminal, game: Game): void {
  const p = game.player;
  const x = SIDE_X;
  let y = MAP_Y;
  const hero = game.hero;
  term.print(x, y++, hero.name, 'white', 'black', SIDE_W);
  term.print(x, y++, `${raceById(hero.raceId).name} ${classById(hero.classId).name}`, 'lightGray', 'black', SIDE_W);
  term.print(x, y, `Nível {white}${hero.level}{/}`, 'lightGray');
  if (hero.statPoints > 0) term.print(x + 10, y, '+atrib!', 'gold');
  y++;
  const base = xpForLevel(hero.level);
  const next = hero.level < MAX_LEVEL ? xpForLevel(hero.level + 1) : hero.xp;
  bar(term, x, y++, SIDE_W - 1, hero.xp - base, Math.max(1, next - base), 'gold');
  term.print(x, y, 'HP', 'lightGray');
  term.print(x + 3, y, `${p.hp}/${p.maxHp}`, hpColor(p.hp, p.maxHp));
  y++;
  bar(term, x, y++, SIDE_W - 1, p.hp, p.maxHp, hpColor(p.hp, p.maxHp));
  if (p.maxMp > 0) {
    term.print(x, y, 'MP', 'lightGray');
    term.print(x + 3, y, `${p.mp}/${p.maxMp}`, 'lightBlue');
    y++;
    bar(term, x, y++, SIDE_W - 1, p.mp, p.maxMp, 'lightBlue');
  }
  const theme = themeById(level(game).theme);
  term.print(x, y++, `Andar {white}${game.depth}{/}`, 'lightGray');
  term.print(x, y++, theme.name, theme.wall, 'black', SIDE_W);
  term.print(x, y++, `Turno {white}${game.turn}{/}`, 'lightGray');

  const lvl = level(game);
  const visible = lvl.actors
    .filter((a) => lvl.map.visible[idx(lvl.map, a.x, a.y)])
    .sort((a, b) => distance(a, p) - distance(b, p));
  if (visible.length) {
    term.print(x, y++, '── À vista ──', 'darkGray');
    const room = Math.floor((FOOT_Y - 2 - y) / 2);
    const shown = visible.length > room ? visible.slice(0, room - 1) : visible;
    for (const a of shown) {
      term.set(x, y, a.glyph, a.color);
      const state = a.ai.state === 'sleeping' ? 'dormindo' : healthDesc(a);
      term.print(x + 2, y++, `${a.name}`, 'lightGray', 'black', SIDE_W - 2);
      term.print(x + 2, y++, state, a.ai.state === 'sleeping' ? 'lightBlue' : hpColor(a.hp, a.maxHp), 'black', SIDE_W - 2);
    }
    if (shown.length < visible.length) term.print(x, y++, `  ...e mais ${visible.length - shown.length}`, 'darkGray');
  }
}
