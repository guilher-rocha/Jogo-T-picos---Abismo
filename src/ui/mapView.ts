import type { Terminal } from '../engine/terminal';
import type { Color } from '../engine/colors';
import { Tile, tileDef } from '../data/tiles';
import { itemColor, itemGlyph } from '../core/itemText';
import type { Game } from '../core/game';
import { level } from '../core/game';
import { idx } from '../core/map';
import type { Item } from '../core/item';
import { MAP_X as MAP_X0, MAP_Y } from './layout';
import { themeById } from '../data/themes';
import { playerTracking } from '../core/abilities';
import { TRAP_INFO } from '../core/traps';

/** Terrenos importantes que continuam bem visíveis na memória. */
const REMEMBER_BRIGHT = new Set<number>([Tile.StairsDown, Tile.StairsUp, Tile.DoorClosed, Tile.DoorOpen, Tile.Fountain, Tile.Altar]);

export function itemGlyphColor(item: Item): { glyph: string; color: Color } {
  return { glyph: itemGlyph(item), color: itemColor(item) };
}

/** Desenha terreno (visível/memória), itens e atores visíveis. */
export function drawMap(term: Terminal, game: Game, time = 0, offsetX = 0): void {
  const MAP_X = MAP_X0 + offsetX;
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
        if (t === Tile.Water || t === Tile.Lava) {
          // Líquidos ondulam devagar.
          const wave = Math.sin(time / 500 + x * 0.7 + y * 1.3) > 0.3;
          const color = t === Tile.Lava ? (wave ? 'yellow' : 'orange') : wave ? 'lightCyan' : 'lightBlue';
          term.set(MAP_X + x, MAP_Y + y, wave ? '≈' : '~', color, def.bg);
        } else term.set(MAP_X + x, MAP_Y + y, def.glyph, fg, def.bg);
      }
      else term.set(MAP_X + x, MAP_Y + y, def.glyph, REMEMBER_BRIGHT.has(t) ? 'darkGray' : 'memory');
    }
  }
  for (const t of lvl.traps ?? []) {
    const i = idx(map, t.x, t.y);
    if (t.hidden || !map.explored[i]) continue;
    term.set(MAP_X + t.x, MAP_Y + t.y, '^', map.visible[i] ? TRAP_INFO[t.kind].color : 'darkGray');
  }
  // Itens: os vistos agora aparecem coloridos; os lembrados ficam apagados.
  for (const item of lvl.items) {
    const i = idx(map, item.x, item.y);
    if (!map.explored[i]) continue;
    const g = itemGlyphColor(item);
    term.set(MAP_X + item.x, MAP_Y + item.y, g.glyph, map.visible[i] ? g.color : 'darkGray');
  }
  const tracking = playerTracking(game);
  for (const a of lvl.actors) {
    const hidden = a.flags.includes('invisible') && Math.max(Math.abs(a.x - game.player.x), Math.abs(a.y - game.player.y)) > 1;
    if (map.visible[idx(map, a.x, a.y)] && !hidden) term.set(MAP_X + a.x, MAP_Y + a.y, a.glyph, a.color, a.flags.includes('champion') ? 'darkRed' : 'black');
    else if (tracking) term.set(MAP_X + a.x, MAP_Y + a.y, a.glyph, a.color, 'darkGreen');
  }
  const p = game.player;
  term.set(MAP_X + p.x, MAP_Y + p.y, p.glyph, game.over ? 'red' : p.color);
}
