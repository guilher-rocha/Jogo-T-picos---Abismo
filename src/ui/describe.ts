import type { Game } from '../core/game';
import { actorAt, level } from '../core/game';
import { idx, inBounds } from '../core/map';
import { tileDef } from '../data/tiles';
import { monsterTemplate } from '../data/monsters';
import { aName, capitalize, healthDesc } from '../core/text';
import { itemsAt } from '../core/item';
import { itemName } from '../core/itemText';
import { STATUS } from '../core/status';

const AI_STATE: Record<string, string> = {
  sleeping: 'dormindo',
  wandering: 'passeando',
  hunting: 'caçando você',
  fleeing: 'fugindo',
};

/** Texto do modo "olhar": o que há numa célula do mapa. */
export function describeCell(game: Game, x: number, y: number): string {
  const lvl = level(game);
  const map = lvl.map;
  if (!inBounds(map, x, y) || !map.explored[idx(map, x, y)]) return 'Você não sabe o que há ali.';
  const visible = map.visible[idx(map, x, y)] === 1;
  const parts: string[] = [];
  const a = visible ? actorAt(game, x, y) : undefined;
  if (a?.isPlayer) parts.push('Você.');
  else if (a) {
    const t = monsterTemplate(a.templateId);
    const st = (a.effects ?? []).map((e) => STATUS[e.id].name.toLowerCase());
    parts.push(`${capitalize(aName(a))} (${[healthDesc(a), AI_STATE[a.ai.state], ...st].join(', ')}). ${t.desc}`);
  }
  const items = itemsAt(lvl, x, y);
  if (items.length) parts.push(`Itens: ${items.map((i) => itemName(game, i)).join(', ')}.`);
  if (!a) parts.push(`${capitalize(tileDef(map.tiles[idx(map, x, y)]).name)}${visible ? '' : ' (lembrança)'}.`);
  return parts.join(' ');
}
