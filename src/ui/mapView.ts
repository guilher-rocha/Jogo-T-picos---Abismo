import type { Terminal } from '../engine/terminal';
import type { Color } from '../engine/colors';
import { Tile, tileDef } from '../data/tiles';
import { monsterTemplate } from '../data/monsters';
import type { Game } from '../core/game';
import { level } from '../core/game';
import { idx } from '../core/map';
import type { Item } from '../core/item';
import { MAP_X, MAP_Y } from './layout';
import { themeById } from '../data/themes';

/** Terrenos importantes que continuam bem visíveis na memória. */
const REMEMBER_BRIGHT = new Set<number>([Tile.StairsDown, Tile.StairsUp, Tile.DoorClosed, Tile.DoorOpen, Tile.Fountain, Tile.Altar]);

export function itemGlyph(item: Item): { glyph: string; color: Color } {
  if (item.baseId === 'corpse') {
    const color = item.corpseOf ? monsterTemplate(item.corpseOf).color : 'lightGray';
    return { glyph: '%', color };
  }
  return { glyph: '?', color: 'white' };
}

/** Desenha terreno (visível/memória), itens e atores visíveis. */
export function drawMap(term: Terminal, game: Game): void {
  const lvl = level(game);
  const { map } = lvl;
  const theme = themeById(lvl.theme);
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const i = idx(map, x, y);
      if (!map.explored[i]) continue;
      const t = map.tiles[i];
      const def = tileDef(t);
      if (map.visible[i]) {
        const fg = t === Tile.Wall || t === Tile.SecretDoor ? theme.wall : t === Tile.Floor ? theme.floor : def.fg;
        term.set(MAP_X + x, MAP_Y + y, def.glyph, fg, def.bg);
      }
      else term.set(MAP_X + x, MAP_Y + y, def.glyph, REMEMBER_BRIGHT.has(t) ? 'darkGray' : 'memory');
    }
  }
  // Itens: os vistos agora aparecem coloridos; os lembrados ficam apagados.
  for (const item of lvl.items) {
    const i = idx(map, item.x, item.y);
    if (!map.explored[i]) continue;
    const g = itemGlyph(item);
    term.set(MAP_X + item.x, MAP_Y + item.y, g.glyph, map.visible[i] ? g.color : 'darkGray');
  }
  for (const a of lvl.actors) {
    if (map.visible[idx(map, a.x, a.y)]) term.set(MAP_X + a.x, MAP_Y + a.y, a.glyph, a.color);
  }
  const p = game.player;
  term.set(MAP_X + p.x, MAP_Y + p.y, p.glyph, game.over ? 'red' : p.color);
}
