import type { Color } from '../engine/colors';

/** Tipos de terreno. Guardados no mapa como números (compacto e serializável). */
export const Tile = {
  Wall: 0,
  Floor: 1,
  Corridor: 2,
  DoorClosed: 3,
  DoorOpen: 4,
  StairsDown: 5,
  StairsUp: 6,
  Water: 7,
  Lava: 8,
  SecretDoor: 9,
  Fountain: 10,
  Altar: 11,
  Fungus: 12,
  Rubble: 13,
  DoorLocked: 14,
  DryFountain: 15,
} as const;

export type TileId = (typeof Tile)[keyof typeof Tile];

export interface TileDef {
  name: string;
  glyph: string;
  fg: Color;
  bg: Color;
  walkable: boolean;
  transparent: boolean;
}

export const TILES: Record<number, TileDef> = {
  [Tile.Wall]: { name: 'parede', glyph: '#', fg: 'lightGray', bg: 'black', walkable: false, transparent: false },
  [Tile.Floor]: { name: 'chão', glyph: '.', fg: 'lightGray', bg: 'black', walkable: true, transparent: true },
  [Tile.Corridor]: { name: 'corredor', glyph: '.', fg: 'darkGray', bg: 'black', walkable: true, transparent: true },
  [Tile.DoorClosed]: { name: 'porta fechada', glyph: '+', fg: 'brown', bg: 'black', walkable: false, transparent: false },
  [Tile.DoorOpen]: { name: 'porta aberta', glyph: "'", fg: 'brown', bg: 'black', walkable: true, transparent: true },
  [Tile.StairsDown]: { name: 'escada para baixo', glyph: '>', fg: 'white', bg: 'black', walkable: true, transparent: true },
  [Tile.StairsUp]: { name: 'escada para cima', glyph: '<', fg: 'white', bg: 'black', walkable: true, transparent: true },
  [Tile.Water]: { name: 'água', glyph: '~', fg: 'lightBlue', bg: 'darkBlue', walkable: true, transparent: true },
  [Tile.Lava]: { name: 'lava', glyph: '~', fg: 'orange', bg: 'darkRed', walkable: true, transparent: true },
  [Tile.SecretDoor]: { name: 'parede', glyph: '#', fg: 'lightGray', bg: 'black', walkable: false, transparent: false },
  [Tile.Fountain]: { name: 'fonte', glyph: '{', fg: 'lightCyan', bg: 'black', walkable: true, transparent: true },
  [Tile.Altar]: { name: 'altar', glyph: '_', fg: 'white', bg: 'black', walkable: true, transparent: true },
  [Tile.Fungus]: { name: 'fungo gigante', glyph: '&', fg: 'green', bg: 'black', walkable: false, transparent: false },
  [Tile.Rubble]: { name: 'escombros', glyph: ':', fg: 'brown', bg: 'black', walkable: true, transparent: true },
  [Tile.DoorLocked]: { name: 'porta trancada', glyph: '+', fg: 'yellow', bg: 'black', walkable: false, transparent: false },
  [Tile.DryFountain]: { name: 'fonte seca', glyph: '{', fg: 'darkGray', bg: 'black', walkable: true, transparent: true },
};

export function tileDef(id: number): TileDef {
  return TILES[id] ?? TILES[Tile.Wall];
}
