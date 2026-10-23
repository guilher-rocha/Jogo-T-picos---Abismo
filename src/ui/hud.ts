import type { Terminal } from '../engine/terminal';
import type { Color } from '../engine/colors';
import type { Game } from '../core/game';
import { level, seesActor } from '../core/game';
import { distance } from '../core/map';
import { formatMessage } from '../core/log';
import type { LogMessage } from '../core/log';
import { memberTextColor } from '../core/party';
import { healthDesc } from '../core/text';
import { MAP_Y, MINI_Y, MSG_LINES, SIDE_W, SIDE_X } from './layout';
import { registry } from '../engine/atlas';
import { actorSpriteKey, heroSpriteKey } from './mapView';
import { themeById } from '../data/themes';
import { classById } from '../data/classes';
import { raceById } from '../data/races';
import { MAX_LEVEL, xpForLevel } from '../core/hero';
import { STATUS } from '../core/status';
import { visibleLength } from '../engine/terminal';

/** Fundo dos retratos no painel lateral. */
const PORTRAIT_BG = '#12102a';

/** Rótulo de fome para o HUD (vazio quando normal). */
export function hungerLabel(n: number): string {
  if (n <= 0) return '{red}Desmaiando{/}';
  if (n < 150) return '{lightRed}Fraco{/}';
  if (n < 600) return '{yellow}Faminto{/}';
  if (n > 3500) return '{lightGreen}Saciado{/}';
  return '';
}

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

/** Texto de uma mensagem; no multijogador, as de outro herói ganham o nome dele ("[Ana] Você acerta o rato."). */
export function messageLine(game: Game, m: LogMessage): string {
  const text = formatMessage(m);
  if (m.who === undefined || m.who === game.player.id) return text;
  const who = game.party?.members.find((x) => x.id === m.who);
  return who ? `{${memberTextColor(game, who.id)}}[${who.name}]{/} ${text}` : text;
}

/** Mensagens no topo: as últimas linhas, as recentes em destaque. */
export function drawMessages(term: Terminal, game: Game): void {
  const recent = game.log.slice(-MSG_LINES);
  recent.forEach((m, i) => {
    const fresh = m.turn >= game.turn - 1;
    term.print(1, i, messageLine(game, m), fresh ? m.color : 'darkGray', 'black', 98);
  });
}

/** Multijogador: uma linha por aliado — nome, vida e se o mundo está esperando por ele. */
function drawParty(term: Terminal, game: Game, x: number, y: number): number {
  const party = game.party;
  if (!party || party.members.length < 2) return y;
  term.print(x, y++, '── Grupo ──', 'darkGray');
  for (const m of party.members) {
    if (m.actor === game.player) continue;
    term.print(x, y, `{${memberTextColor(game, m.id)}}${m.name.slice(0, 8)}{/}`, 'white');
    if (m.dead) term.print(x + 9, y, 'caído', 'red');
    else bar(term, x + 9, y, 7, m.actor.hp, m.actor.maxHp, hpColor(m.actor.hp, m.actor.maxHp));
    const mark = !m.connected ? '{darkGray}off{/}' : party.waiting.includes(m.id) ? '{yellow}…{/}' : '';
    if (mark) term.print(x + 17, y, mark, 'lightGray');
    y++;
  }
  return y;
}

/** Painel lateral com o retrato do herói, o estado do jogador e os monstros visíveis. */
export function drawSidebar(term: Terminal, game: Game, time = 0): void {
  const p = game.player;
  const x = SIDE_X;
  let y = MAP_Y;
  const hero = game.hero;
  // Retrato (sprite do herói) com o nome, a raça e a classe ao lado.
  const portrait = heroSpriteKey(game);
  if (registry.has(portrait)) {
    term.icon(portrait, x, y, 4, 3, { frame: Math.floor(time / 560) % 2, align: 'bottom', backdrop: PORTRAIT_BG });
    const tx = x + 5;
    const w = SIDE_W - 5;
    term.print(tx, y, hero.name, 'white', 'black', w);
    term.print(tx, y + 1, raceById(hero.raceId).name, 'lightGray', 'black', w);
    term.print(tx, y + 2, classById(hero.classId).name, 'lightGray', 'black', w);
    y += 3;
  } else {
    term.print(x, y++, hero.name, 'white', 'black', SIDE_W);
    term.print(x, y++, `${raceById(hero.raceId).name} ${classById(hero.classId).name}`, 'lightGray', 'black', SIDE_W);
  }
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
  // Status ativos e fome.
  const tags: string[] = [];
  for (const e of p.effects ?? []) tags.push(`{${STATUS[e.id].good ? 'lightCyan' : 'orange'}}${STATUS[e.id].name}{/}`);
  const hunger = hungerLabel(game.hero.nutrition);
  if (hunger) tags.push(hunger);
  if (game.hasAmulet) tags.push('{lightMagenta}Coração!{/}');
  let line = '';
  for (const t of tags) {
    if (visibleLength(line + ' ' + t) > SIDE_W && line) {
      term.print(x, y++, line, 'lightGray');
      line = t;
    } else line = line ? `${line} ${t}` : t;
  }
  if (line) term.print(x, y++, line, 'lightGray');
  y = drawParty(term, game, x, y);

  const lvl = level(game);
  const visible = lvl.actors
    .filter((a) => seesActor(game, a))
    .sort((a, b) => distance(a, p) - distance(b, p));
  if (visible.length) {
    term.print(x, y++, '── À vista ──', 'darkGray');
    // O minimapa ocupa as últimas linhas do painel.
    const avail = MINI_Y - y;
    const all = visible.length * 2 <= avail;
    const count = all ? visible.length : Math.max(0, Math.floor((avail - 1) / 2));
    for (const a of visible.slice(0, count)) {
      const key = actorSpriteKey(game, a);
      const icon = registry.has(key);
      if (icon) {
        term.icon(key, x, y, 3, 2, { frame: Math.floor(time / 560) % 2, align: 'bottom', backdrop: PORTRAIT_BG });
      } else term.set(x, y, a.glyph, a.color);
      const tx = icon ? x + 4 : x + 2;
      const state = a.ai.state === 'sleeping' ? 'dormindo' : (a.effects ?? []).length ? `${healthDesc(a)}, ${STATUS[a.effects![0].id].name.toLowerCase()}` : healthDesc(a);
      term.print(tx, y++, `${a.name}`, 'lightGray', 'black', SIDE_W - (tx - x));
      term.print(tx, y++, state, a.ai.state === 'sleeping' ? 'lightBlue' : hpColor(a.hp, a.maxHp), 'black', SIDE_W - (tx - x));
    }
    if (count < visible.length) term.print(x, y++, `  ...e mais ${visible.length - count}`, 'darkGray');
  }
}
