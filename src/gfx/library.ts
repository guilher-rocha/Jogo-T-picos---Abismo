import { Pixmap } from './pixmap';
import { STYLES, STYLE_IDS, makeFloor, makeCorridor, makeFace, makeRoof, makeRimParts } from './terrain';
import { VARIANTS } from './autotile';
import { makeProps, makeWater, makeLava } from './props';
import { RACE_IDS, CLASS_IDS, heroFrames } from './heroes';
import * as MA from './monsters_a';
import * as MB from './monsters_b';
import * as MC from './monsters_c';
import * as MD from './monsters_d';
import * as BO from './bosses';
import { itemIcon, corpseIcon, lookIcon } from './items';
import { LOOKS } from '../data/appearances';
import type { LookCategory } from '../data/appearances';
import * as FX from './fx';
import { logoFrames, tombstone, LOGO_FIRE, LOGO_BLOOD, LOGO_GOLD } from './ui';
import { ITEMS } from '../data/items';
import { MONSTERS } from '../data/monsters';
import { BOSSES } from '../data/bosses';
import { COLOR_NAMES } from '../engine/colors';
import { K } from './keys';

/** Um sprite (ou animação) do atlas: todos os quadros têm o mesmo tamanho. */
export interface SpriteEntry {
  key: string;
  frames: Pixmap[];
  w: number;
  h: number;
}

export { K };

/** Id de monstro → função que desenha seus quadros. */
export const MONSTER_ART: Record<string, () => Pixmap[]> = {
  rat: MA.rat, bat: MA.bat, jackal: MA.jackal, wolf: MA.wolf, cave_spider: MA.caveSpider, giant_spider: MA.giantSpider,
  green_jelly: MA.greenJelly, poison_fungus: MA.poisonFungus, serpent: MA.serpent,
  kobold: MB.kobold, goblin: MB.goblin, goblin_shaman: MB.goblinShaman, skeleton: MB.skeleton, orc: MB.orc,
  zombie: MB.zombie, dwarf: MB.dwarf, gnoll: MB.gnoll,
  ogre: MC.ogre, troll: MC.troll, hill_giant: MC.hillGiant, wraith: MC.wraith, nymph: MC.nymph,
  dark_elf: MC.darkElf, vampire: MC.vampire, stone_golem: MC.stoneGolem,
  naga: MD.naga, fire_elemental: MD.fireElemental, frost_elemental: MD.frostElemental, mind_flayer: MD.mindFlayer,
  lich: MD.lich, red_dragon: MD.redDragon, blue_dragon: MD.blueDragon, demon: MD.demon, abyssal_horror: MD.abyssalHorror,
  goblin_king: BO.goblinKing, ancient_troll: BO.ancientTroll, lesser_lich: BO.lesserLich, abyss_guardian: BO.abyssGuardian,
};

function entry(key: string, frames: Pixmap[]): SpriteEntry {
  return { key, frames, w: frames[0].w, h: frames[0].h };
}

/** Sprites do cenário de um tema de andar. */
export function terrainEntries(styleId: string): SpriteEntry[] {
  const style = STYLES[styleId];
  const out: SpriteEntry[] = [];
  for (let v = 0; v < VARIANTS.floor; v++) out.push(entry(K.floor(styleId, v), [makeFloor(style, v)]));
  for (let v = 0; v < VARIANTS.corridor; v++) out.push(entry(K.corr(styleId, v), [makeCorridor(style, v)]));
  for (let v = 0; v < VARIANTS.face; v++) out.push(entry(K.face(styleId, v), [makeFace(style, v)]));
  for (let v = 0; v < VARIANTS.roof; v++) out.push(entry(K.roof(styleId, v), [makeRoof(style, v)]));
  for (const [part, img] of Object.entries(makeRimParts(style))) out.push(entry(K.rim(styleId, part), [img]));
  for (const [name, frames] of Object.entries(makeProps(style))) out.push(entry(K.prop(styleId, name), frames));
  return out;
}

/** Tudo que não depende do tema do andar. */
export function commonEntries(): SpriteEntry[] {
  const out: SpriteEntry[] = [];
  out.push(entry(K.water, makeWater(4)), entry(K.lava, makeLava(4)));
  for (const race of RACE_IDS) for (const cls of CLASS_IDS) out.push(entry(K.hero(race, cls), heroFrames(race, cls)));
  const ids = [...MONSTERS.map((m) => m.id), ...BOSSES.map((b) => b.id)];
  for (const id of ids) {
    const art = MONSTER_ART[id];
    if (art) out.push(entry(K.mon(id), art()));
  }
  for (const b of ITEMS) out.push(entry(K.item(b.id), itemIcon(b)));
  for (const [cat, looks] of Object.entries(LOOKS) as [LookCategory, string[]][]) {
    for (const look of looks) out.push(entry(K.look(cat, look), lookIcon(cat, look)));
  }
  for (const c of COLOR_NAMES) out.push(entry(K.corpse(c), corpseIcon(c)));
  for (const [name, fn] of Object.entries(FX)) out.push(entry(K.fx(name), (fn as () => Pixmap[])()));
  out.push(
    entry(K.ui('logo'), logoFrames('ABISMO', LOGO_FIRE)),
    entry(K.ui('gameover'), logoFrames('GAME OVER', LOGO_BLOOD)),
    entry(K.ui('victory'), logoFrames('VITÓRIA', LOGO_GOLD)),
    entry(K.ui('tombstone'), [tombstone()]),
  );
  return out;
}

/** Todos os sprites do jogo (cenário de todos os temas incluso). */
export function allEntries(): SpriteEntry[] {
  return [...STYLE_IDS.flatMap(terrainEntries), ...commonEntries()];
}

/** Ids de monstros sem desenho (usado nos testes e como alerta). */
export function monstersWithoutArt(): string[] {
  return [...MONSTERS.map((m) => m.id), ...BOSSES.map((b) => b.id)].filter((id) => !MONSTER_ART[id]);
}
