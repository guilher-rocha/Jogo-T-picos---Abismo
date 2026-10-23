import type { Terminal, MinimapData } from '../engine/terminal';
import { Scene } from '../engine/scene';
import { registry } from '../engine/atlas';
import { CLASSIC_PALETTE } from '../engine/colors';
import type { Game } from '../core/game';
import { level, seesActor } from '../core/game';
import type { Actor } from '../core/actor';
import type { Item } from '../core/item';
import { Tile } from '../data/tiles';
import { idx, inBounds } from '../core/map';
import type { GameMap } from '../core/map';
import { themeById } from '../data/themes';
import { monsterTemplate } from '../data/monsters';
import { playerTracking } from '../core/abilities';
import { hasStatus } from '../core/status';
import { itemColor, itemGlyph } from '../core/itemText';
import { lookOf } from '../core/identify';
import { MAP_X, MAP_Y, MINI_H, MINI_W, MINI_X, MINI_Y } from './layout';
import { K } from '../gfx/keys';
import { STYLES } from '../gfx/terrain';
import { VARIANTS, doorOrientation, neighborhood, variantAt, wallShape } from '../gfx/autotile';
import type { Neighborhood } from '../gfx/autotile';
import { hash01, hex, lighten, toHex } from '../gfx/color';
import type { SceneState, Vis } from './sceneState';
import { PUFF_MS } from './sceneState';
import { drawAuraBack, drawAuraFront, fearShake } from './auras';
import { AIR, airMote, fountainDrops, lavaBubbles, risingMotes, torchEmbers, waterGlints } from './ambient';
import { DECOR_FRAMES, DECOR_GLOW } from '../gfx/decor';

/** Janela do mapa em células do terminal. */
export const MAP_COLS = 80;
export const MAP_ROWS = 24;

/** Opacidade do "véu" sobre o que o jogador só lembra. */
const REMEMBER_ALPHA = 0.62;
const REMEMBER_BRIGHT_ALPHA = 0.5;
/** Terrenos importantes continuam mais claros na memória (como no mapa em ASCII). */
const REMEMBER_BRIGHT = new Set<number>([Tile.StairsDown, Tile.StairsUp]);

// ───────────────────────── chaves dos sprites ─────────────────────────

/** Chave do sprite de um ator (o jogador usa o herói da sua raça e classe). */
export function actorSpriteKey(game: Game, a: Actor): string {
  if (!a.isPlayer) return K.mon(a.templateId);
  // Multijogador: cada herói do grupo com a sua raça e classe.
  const hero = game.party?.members.find((m) => m.actor === a || m.id === a.id)?.hero ?? game.hero;
  return K.hero(hero.raceId, hero.classId);
}

export function heroSpriteKey(game: Game): string {
  return K.hero(game.hero.raceId, game.hero.classId);
}

/**
 * Chave do sprite de um item no chão. Cadáveres usam a cor do monstro; poções, varinhas, anéis e
 * amuletos usam a aparência sorteada na partida (a cor do tipo verdadeiro entregaria a identificação).
 */
export function itemSpriteKey(item: Item, game?: Game): string {
  if (item.baseId === 'corpse') return K.corpse(item.corpseOf ? monsterTemplate(item.corpseOf).color : 'lightGray');
  const look = game ? lookOf(game, item.baseId) : undefined;
  if (look) return K.look(look.cat, look.look);
  return K.item(item.baseId);
}

// ───────────────────────── decoração ─────────────────────────

export interface DecorRule {
  name: string;
  p: number;
}

/** Enfeites de parede (só nas faces de tijolo), por tema. As chances são por tile de face. */
export const WALL_DECOR: Record<string, DecorRule[]> = {
  crypt: [
    { name: 'torch', p: 0.06 }, { name: 'chains', p: 0.03 }, { name: 'skeleton', p: 0.02 }, { name: 'banner', p: 0.012 }, { name: 'blood_wall', p: 0.015 },
    { name: 'window_slit', p: 0.01 }, { name: 'candle_niche', p: 0.03 }, { name: 'plaque', p: 0.02 }, { name: 'wall_crack', p: 0.035 }, { name: 'wall_moss', p: 0.02 },
  ],
  mines: [
    { name: 'torch', p: 0.04 }, { name: 'chains', p: 0.012 }, { name: 'skeleton', p: 0.012 }, { name: 'blood_wall', p: 0.01 }, { name: 'support_beam', p: 0.06 },
    { name: 'ore_vein', p: 0.05 }, { name: 'lantern', p: 0.03 }, { name: 'pickaxe_wall', p: 0.012 }, { name: 'wall_crack', p: 0.035 },
  ],
  fungal: [
    { name: 'slime_wall', p: 0.04 }, { name: 'torch', p: 0.02 }, { name: 'skeleton', p: 0.012 }, { name: 'chains', p: 0.008 }, { name: 'vines', p: 0.08 },
    { name: 'shelf_fungus', p: 0.05 }, { name: 'wall_moss', p: 0.04 }, { name: 'wall_crack', p: 0.02 },
  ],
  fortress: [
    { name: 'torch', p: 0.05 }, { name: 'banner', p: 0.035 }, { name: 'window_slit', p: 0.025 }, { name: 'chains', p: 0.015 }, { name: 'arch_gate', p: 0.01 },
    { name: 'shield_trophy', p: 0.025 }, { name: 'drip_stain', p: 0.05 }, { name: 'wall_moss', p: 0.03 }, { name: 'wall_crack', p: 0.03 },
  ],
  abyss: [
    { name: 'torch', p: 0.04 }, { name: 'blood_wall', p: 0.03 }, { name: 'chains', p: 0.03 }, { name: 'skeleton', p: 0.02 }, { name: 'banner', p: 0.008 },
    { name: 'rune_glow', p: 0.03 }, { name: 'lava_seep', p: 0.035 }, { name: 'wall_crack', p: 0.035 },
  ],
};

/** Detalhes do chão (sem bloquear nada), por tema. */
export const FLOOR_DECOR: Record<string, DecorRule[]> = {
  crypt: [
    { name: 'bones', p: 0.012 }, { name: 'skull', p: 0.008 }, { name: 'pebbles', p: 0.02 }, { name: 'puddle_blood', p: 0.006 }, { name: 'puddle_water', p: 0.006 },
    { name: 'moss', p: 0.02 }, { name: 'floor_crack', p: 0.025 }, { name: 'candles', p: 0.006 },
  ],
  mines: [
    { name: 'pebbles', p: 0.04 }, { name: 'bones', p: 0.008 }, { name: 'puddle_water', p: 0.015 }, { name: 'moss', p: 0.01 }, { name: 'ore_chunks', p: 0.02 },
    { name: 'planks', p: 0.012 }, { name: 'floor_crack', p: 0.015 },
  ],
  fungal: [
    { name: 'moss', p: 0.05 }, { name: 'puddle_slime', p: 0.02 }, { name: 'bones', p: 0.008 }, { name: 'pebbles', p: 0.01 }, { name: 'grass', p: 0.07 },
    { name: 'roots', p: 0.03 }, { name: 'mushrooms', p: 0.025 }, { name: 'crystals', p: 0.008 },
  ],
  fortress: [
    { name: 'bones', p: 0.008 }, { name: 'skull', p: 0.006 }, { name: 'puddle_water', p: 0.03 }, { name: 'pebbles', p: 0.01 }, { name: 'puddle_blood', p: 0.005 },
    { name: 'shells', p: 0.012 }, { name: 'seaweed', p: 0.025 }, { name: 'rusty_helm', p: 0.005 }, { name: 'floor_crack', p: 0.025 },
  ],
  abyss: [
    { name: 'bones', p: 0.02 }, { name: 'skull', p: 0.015 }, { name: 'puddle_blood', p: 0.02 }, { name: 'pebbles', p: 0.015 }, { name: 'obsidian', p: 0.02 },
    { name: 'ash', p: 0.03 }, { name: 'lava_crack', p: 0.025 }, { name: 'floor_crack', p: 0.02 },
  ],
};

/** Objetos encostados na parede de cima (urnas, lápides, caixotes, braseiros...). Chance por tile de chão junto à parede. */
export const EDGE_DECOR: Record<string, DecorRule[]> = {
  crypt: [{ name: 'urn', p: 0.05 }, { name: 'tombstone', p: 0.04 }, { name: 'broken_pillar', p: 0.025 }, { name: 'candles', p: 0.03 }],
  mines: [{ name: 'crate', p: 0.06 }, { name: 'barrel', p: 0.06 }, { name: 'ore_chunks', p: 0.03 }],
  fungal: [{ name: 'mushrooms', p: 0.08 }, { name: 'crystals', p: 0.04 }],
  fortress: [{ name: 'broken_pillar', p: 0.05 }, { name: 'urn', p: 0.03 }, { name: 'barrel', p: 0.02 }, { name: 'rusty_helm', p: 0.015 }],
  abyss: [{ name: 'brazier', p: 0.04 }, { name: 'urn', p: 0.02 }, { name: 'obsidian', p: 0.03 }],
};

function pick(rules: DecorRule[] | undefined, r: number): string | null {
  if (!rules) return null;
  for (const d of rules) {
    if (r < d.p) return d.name;
    r -= d.p;
  }
  return null;
}

const wallDecorRaw = (style: string, x: number, y: number): string | null => pick(WALL_DECOR[style] ?? WALL_DECOR.crypt, hash01(x, y, 17));

/** Enfeite da parede (x, y); o vizinho da esquerda "ganha": dois enfeites nunca ficam lado a lado. */
function wallDecor(style: string, x: number, y: number): string | null {
  const here = wallDecorRaw(style, x, y);
  if (!here) return null;
  return wallDecorRaw(style, x - 1, y) ? null : here;
}

function floorDecor(style: string, x: number, y: number): string | null {
  return pick(FLOOR_DECOR[style] ?? FLOOR_DECOR.crypt, hash01(x, y, 29));
}

/** Objeto encostado na parede; dois nunca ficam lado a lado (o da esquerda ganha). */
function edgeDecor(style: string, x: number, y: number): string | null {
  const raw = (xx: number): string | null => pick(EDGE_DECOR[style] ?? EDGE_DECOR.crypt, hash01(xx, y, 53));
  const here = raw(x);
  return here && !raw(x - 1) ? here : null;
}

/** Quadro atual de um enfeite animado (cada tile com sua fase). */
function decorFrame(name: string, x: number, y: number, time: number): number {
  const a = DECOR_FRAMES[name];
  return a ? Math.floor((time + hash01(x, y, 5) * 900) / a.ms) % a.frames : 0;
}

/** Luz de um enfeite (tochas, velas, braseiros, runas...). */
function decorGlow(glows: Glow[], name: string, x: number, y: number, time: number): void {
  const gl = DECOR_GLOW[name];
  if (!gl) return;
  const flicker = name === 'torch' || name === 'brazier' || name === 'candles' || name === 'candle_niche' || name === 'lantern'
    ? 0.07 * Math.sin(time / 130 + x * 5 + y * 3)
    : 0.05 * Math.sin(time / 600 + x + y);
  glows.push({ x: x + 0.5, y: y + gl.dy, r: gl.r, color: gl.color, a: gl.a + flicker });
}

// ───────────────────────── luz ─────────────────────────

/** Opacidade do escuro sobre um tile: memória, borda da luz do jogador, salas iluminadas. */
function darkness(map: GameMap, i: number, t: number, x: number, y: number, px: number, py: number, radius: number): number {
  if (!map.visible[i]) return REMEMBER_BRIGHT.has(t) ? REMEMBER_BRIGHT_ALPHA : REMEMBER_ALPHA;
  const d = Math.hypot(x - px, y - py);
  let a: number;
  if (map.lit[i]) a = 0.2 * Math.min(1, Math.max(0, (d - radius) / 16));
  else {
    const f = Math.min(1, Math.max(0, (d - 0.7) / (radius + 1.2)));
    a = 0.62 * Math.pow(f, 1.6);
  }
  return a;
}

interface Glow {
  x: number;
  y: number;
  r: number;
  color: string;
  a: number;
}

// ───────────────────────── terreno ─────────────────────────

function drawWall(scene: Scene, nb: Neighborhood, style: string, x: number, y: number): boolean {
  const s = wallShape(nb, x, y);
  if (s.kind === 'face') {
    scene.spr(K.face(style, variantAt(x, y, 3, VARIANTS.face)), x, y);
    if (s.capL) scene.spr(K.rim(style, 'capL'), x, y);
    if (s.capR) scene.spr(K.rim(style, 'capR'), x, y);
    return true;
  }
  scene.spr(K.roof(style, variantAt(x, y, 4, VARIANTS.roof)), x, y);
  if (s.n) scene.spr(K.rim(style, 'rimN'), x, y);
  if (s.e) scene.spr(K.rim(style, 'rimE'), x, y);
  if (s.w) scene.spr(K.rim(style, 'rimW'), x, y);
  if (s.ne) scene.spr(K.rim(style, 'inNE'), x, y);
  if (s.nw) scene.spr(K.rim(style, 'inNW'), x, y);
  if (s.se) scene.spr(K.rim(style, 'inSE'), x, y);
  if (s.sw) scene.spr(K.rim(style, 'inSW'), x, y);
  return false;
}

const floorKey = (style: string, x: number, y: number): string => K.floor(style, variantAt(x, y, 2, VARIANTS.floor));
const corridorKey = (style: string, x: number, y: number): string => K.corr(style, variantAt(x, y, 1, VARIANTS.corridor));

interface View {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Terreno, enfeites, armadilhas e itens do que o jogador já conhece. Devolve as luzes encontradas. */
function drawWorld(scene: Scene, game: Game, style: string, v: View, time: number): Glow[] {
  const lvl = level(game);
  const map = lvl.map;
  const nb = neighborhood(map, true);
  const nbAll = neighborhood(map, false);
  const glows: Glow[] = [];
  const st = STYLES[style] ?? STYLES.crypt;
  // Partículas do ambiente: desenhadas depois de todos os tiles (senão o tile de baixo as cobriria).
  const later: (() => void)[] = [];

  for (let y = v.y0; y <= v.y1; y++) {
    for (let x = v.x0; x <= v.x1; x++) {
      if (!inBounds(map, x, y)) continue;
      const i = idx(map, x, y);
      if (!map.explored[i]) continue;
      const t = map.tiles[i];
      const seen = map.visible[i] === 1;
      switch (t) {
        case Tile.Wall:
        case Tile.SecretDoor: {
          const face = drawWall(scene, nb, style, x, y);
          if (face) {
            const d = wallDecor(style, x, y);
            if (d) {
              scene.spr(K.prop(style, d), x, y, { f: decorFrame(d, x, y, time) });
              if (seen) {
                decorGlow(glows, d, x, y, time);
                if (d === 'torch') later.push(() => torchEmbers(scene, x, y, time));
                if (d === 'window_slit') glows.push({ x: x + 0.5, y: y + 0.5, r: 1.1, color: st.glow, a: 0.1 });
              }
            }
          }
          break;
        }
        case Tile.Corridor:
          scene.spr(corridorKey(style, x, y), x, y);
          break;
        case Tile.DoorClosed:
        case Tile.DoorOpen:
        case Tile.DoorLocked: {
          const o = doorOrientation(map, x, y);
          scene.spr(o === 'h' ? K.face(style, 0) : corridorKey(style, x, y), x, y);
          const state = t === Tile.DoorOpen ? 'open' : t === Tile.DoorLocked ? 'locked' : 'closed';
          scene.spr(K.prop(style, `door_${o}_${state}`), x, y);
          break;
        }
        case Tile.Water:
          scene.spr(K.water, x, y, { f: Math.floor(time / 420) % 4 });
          if (seen) later.push(() => waterGlints(scene, x, y, time));
          break;
        case Tile.Lava:
          scene.spr(K.lava, x, y, { f: Math.floor(time / 520) % 4 });
          if (seen) {
            glows.push({ x: x + 0.5, y: y + 0.5, r: 1.5, color: '#ff5a1a', a: 0.17 + 0.05 * Math.sin(time / 400 + x * 1.7 + y * 2.3) });
            later.push(() => lavaBubbles(scene, x, y, time));
          }
          break;
        default: {
          // Chão com algo por cima.
          scene.spr(floorKey(style, x, y), x, y);
          if (t === Tile.Floor) {
            // Junto à parede de cima: às vezes um objeto encostado; senão, um detalhe do chão.
            const nS = nb.solid(x, y - 1);
            const d = (nS ? edgeDecor(style, x, y) : null) ?? floorDecor(style, x, y);
            if (d) {
              scene.spr(K.prop(style, d), x, y, { f: decorFrame(d, x, y, time) });
              if (seen) {
                decorGlow(glows, d, x, y, time);
                if (d === 'brazier') later.push(() => torchEmbers(scene, x, y + 0.1, time));
              }
            }
            // Teias nos cantos das salas.
            if (nbAll.solid(x, y - 1) && hash01(x, y, 41) < 0.5) {
              if (nbAll.solid(x - 1, y)) scene.spr(K.prop(style, 'web_tl'), x, y);
              else if (nbAll.solid(x + 1, y)) scene.spr(K.prop(style, 'web_tr'), x, y);
            }
          } else if (t === Tile.StairsDown) scene.spr(K.prop(style, 'stairs_down'), x, y);
          else if (t === Tile.StairsUp) scene.spr(K.prop(style, 'stairs_up'), x, y);
          else if (t === Tile.Fountain) {
            scene.spr(K.prop(style, 'fountain'), x, y);
            if (seen) {
              glows.push({ x: x + 0.5, y: y + 0.5, r: 1.3, color: '#80d8ff', a: 0.12 });
              later.push(() => fountainDrops(scene, x, y, time));
            }
          } else if (t === Tile.DryFountain) scene.spr(K.prop(style, 'fountain_dry'), x, y);
          else if (t === Tile.Altar) {
            scene.spr(K.prop(style, 'altar'), x, y);
            if (seen) {
              glows.push({ x: x + 0.5, y: y + 0.5, r: 1.4, color: '#c080ff', a: 0.13 + 0.04 * Math.sin(time / 500) });
              later.push(() => risingMotes(scene, x, y, time, ['#f0d0ff', '#c080ff', '#ffffff'], 3, 2400));
            }
          } else if (t === Tile.Fungus) {
            scene.spr(K.prop(style, 'fungus'), x, y);
            if (seen) {
              glows.push({ x: x + 0.5, y: y + 0.5, r: 1.3, color: st.glow, a: 0.12 + 0.04 * Math.sin(time / 650 + x + y) });
              later.push(() => risingMotes(scene, x, y, time, [st.glow, st.moss], 2, 3000));
            }
          } else if (t === Tile.Rubble) scene.spr(K.prop(style, 'rubble'), x, y);
        }
      }
    }
  }

  for (const f of later) f();

  // Poeira/esporos/brasas no ar, só onde o jogador vê agora.
  const air = AIR[style];
  if (air) {
    for (let y = v.y0; y <= v.y1; y++) {
      for (let x = v.x0; x <= v.x1; x++) {
        if (!inBounds(map, x, y)) continue;
        const i = idx(map, x, y);
        if (map.visible[i] && map.tiles[i] !== Tile.Wall && map.tiles[i] !== Tile.SecretDoor) airMote(scene, air, x, y, time);
      }
    }
  }

  // Armadilhas descobertas.
  for (const trap of lvl.traps ?? []) {
    if (trap.hidden || trap.x < v.x0 || trap.x > v.x1 || trap.y < v.y0 || trap.y > v.y1) continue;
    if (!map.explored[idx(map, trap.x, trap.y)]) continue;
    scene.spr(K.prop(style, `trap_${trap.kind}`), trap.x, trap.y);
  }

  // Itens no chão: os vistos agora e os lembrados (o escuro da memória vem depois).
  for (const item of lvl.items) {
    if (item.x < v.x0 || item.x > v.x1 || item.y < v.y0 || item.y > v.y1) continue;
    const i = idx(map, item.x, item.y);
    if (!map.explored[i]) continue;
    const key = itemSpriteKey(item, game);
    if (registry.has(key)) {
      scene.ell(item.x + 0.5, item.y + 0.82, 0.3, 0.1, '#000', 0.35);
      scene.spr(key, item.x, item.y);
      if (map.visible[i] && item.identified && item.rarity !== 'common') {
        scene.spr(K.fx('spark'), item.x, item.y, { f: Math.floor((time + item.id * 97) / 150) % 5, a: 0.9 });
      }
    } else scene.text(item.x + 0.5, item.y + 0.5, itemGlyph(item), CLASSIC_PALETTE[itemColor(item, game)]);
  }
  return glows;
}

/** Cor do "véu" de escuro (azul-marinho quase preto). */
const VEIL: [number, number, number] = [8, 7, 24];

/**
 * O "véu" de escuro: memória, borda da luz, salas iluminadas. Vira um mapa de luz de 1 pixel por tile
 * que o renderizador amplia suavizado — a luz esmaece de forma gradual, sem degraus de tile.
 */
function drawDarkness(scene: Scene, game: Game, v: View): void {
  const map = level(game).map;
  const p = game.player;
  const radius = Math.max(1, p.light);
  const w = v.x1 - v.x0 + 1;
  const h = v.y1 - v.y0 + 1;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = v.y0; y <= v.y1; y++) {
    for (let x = v.x0; x <= v.x1; x++) {
      let a = 1;
      if (inBounds(map, x, y)) {
        const i = idx(map, x, y);
        if (map.explored[i]) a = darkness(map, i, map.tiles[i], x, y, p.x, p.y, radius);
      }
      const o = ((y - v.y0) * w + (x - v.x0)) * 4;
      data[o] = VEIL[0];
      data[o + 1] = VEIL[1];
      data[o + 2] = VEIL[2];
      data[o + 3] = Math.round(a * 255);
    }
  }
  scene.light(v.x0, v.y0, w, h, data);
}

/** Cobre de preto o que o jogador nunca viu (os brilhos e a luz do herói não vazam para o desconhecido). */
function drawUnexplored(scene: Scene, game: Game, v: View): void {
  const map = level(game).map;
  for (let y = v.y0; y <= v.y1; y++) {
    let start = -1;
    for (let x = v.x0; x <= v.x1 + 1; x++) {
      const unknown = x <= v.x1 && (!inBounds(map, x, y) || !map.explored[idx(map, x, y)]);
      if (unknown) {
        if (start < 0) start = x;
      } else if (start >= 0) {
        scene.rect(start, y, x - start, 1, '#000', 1);
        start = -1;
      }
    }
  }
}

// ───────────────────────── atores ─────────────────────────

const HP_GOOD = '#58d868';
const HP_MID = '#e8c840';
const HP_LOW = '#e84848';

function hpColorCss(hp: number, max: number): string {
  const f = hp / max;
  return f > 0.6 ? HP_GOOD : f > 0.3 ? HP_MID : HP_LOW;
}

interface Drawn {
  a: Actor;
  v: Vis;
  key: string;
  boss: boolean;
  /** Visível de verdade (senão é só o rastreamento do jogador). */
  seen: boolean;
}

function glyphFallback(scene: Scene, a: Actor, x: number, y: number, alpha = 1): void {
  scene.rect(x, y, 1, 1, '#000', 0.55 * alpha);
  scene.text(x + 0.5, y + 0.5, a.glyph, CLASSIC_PALETTE[a.color], 1.4, alpha);
}

function drawActors(scene: Scene, game: Game, state: SceneState, time: number): void {
  const lvl = level(game);
  const tracking = playerTracking(game);
  const list: Drawn[] = [];
  for (const a of lvl.actors) {
    const seen = seesActor(game, a);
    if (!seen && !tracking) continue;
    const key = actorSpriteKey(game, a);
    const v = state.at(a.id, a);
    v.key = key;
    list.push({ a, v, key, boss: a.flags.includes('boss'), seen });
  }
  const p = game.player;
  const pv = state.at(p.id, p);
  const pkey = actorSpriteKey(game, p);
  pv.key = pkey;
  list.push({ a: p, v: pv, key: pkey, boss: false, seen: true });
  // Multijogador: os aliados (sempre visíveis para o grupo, mesmo fora do campo de visão).
  for (const m of game.party?.members ?? []) {
    if (m.actor === p || m.id === p.id) continue;
    const v = state.at(m.actor.id, m.actor);
    const key = actorSpriteKey(game, m.actor);
    v.key = key;
    list.push({ a: m.actor, v, key, boss: false, seen: true });
  }
  list.sort((m, n) => m.v.y - n.v.y || m.a.id - n.a.id);

  // Poeira dos passos (no chão, por baixo de todos).
  const map = lvl.map;
  const dust = toHex(lighten(hex((STYLES[themeById(lvl.theme).id] ?? STYLES.crypt).floor.light), 0.45));
  for (const p of state.puffs) {
    if (!inBounds(map, p.x, p.y) || !map.visible[idx(map, p.x, p.y)]) continue;
    const tt = Math.min(1, (state.time - p.t0) / PUFF_MS);
    const t = map.tiles[idx(map, p.x, p.y)];
    if (t === Tile.Water || t === Tile.Lava) continue;
    for (let i = 0; i < 6; i++) {
      const side = i % 2 ? 1 : -1;
      const px = p.x + 0.5 + side * (0.1 + tt * (0.18 + (i >> 1) * 0.06)) - p.dx * tt * 0.15;
      const py = p.y + 0.9 - tt * (0.1 + (i >> 1) * 0.07);
      scene.prect(px, py, 0, 0, i < 2 ? 2 : 1, i < 2 && tt < 0.5 ? 2 : 1, dust, 0.85 * (1 - tt));
    }
  }

  const bars: Drawn[] = [];
  for (const d of list) {
    const { a, v } = d;
    const x = v.x;
    const y = v.y;
    const has = registry.has(d.key);
    const member = a.isPlayer ? game.party?.members.find((m) => m.actor === a || m.id === a.id) : undefined;
    const dead = a.isPlayer && ((!!game.over && !game.over.won) || !!member?.dead);
    // Ator "rastreado" (não visível): silhueta verde translúcida.
    if (!d.seen) {
      if (has) scene.spr(d.key, x, y, { anchor: 'foot', f: 0, flip: v.face < 0, a: 0.5, tint: '#3dff6a', ta: 1 });
      else glyphFallback(scene, a, x, y, 0.5);
      continue;
    }
    const idle = Math.floor((time + a.id * 211) / (a.ai.state === 'sleeping' && !a.isPlayer ? 900 : 560)) % 2;
    const hop = v.walking ? -(Math.floor(time / 80) % 2) : 0;
    const champion = a.flags.includes('champion');
    // Sombra (e aura dos campeões).
    const big = d.boss ? 1.5 : 1;
    if (!dead) {
      if (champion) {
        scene.ell(x + 0.5, y + 0.86, 0.62, 0.22, '#d02020', 0.5);
        scene.glow(x + 0.5, y + 0.8, 1.2, '#ff3030', 0.22 + 0.06 * Math.sin(time / 200));
      }
      if (d.boss) scene.glow(x + 0.5, y + 0.8, 1.9, '#ffd24a', 0.14);
      scene.ell(x + 0.5, y + 0.9, 0.36 * big, 0.12 * big, '#000', 0.4);
      // Multijogador: anel de pixels da cor do jogador sob os pés (a metade da frente mais forte).
      if (member) {
        for (let i = 0; i < 22; i++) {
          const ang = (i / 22) * Math.PI * 2;
          scene.prect(x + 0.5 + Math.cos(ang) * 0.4, y + 0.9 + Math.sin(ang) * 0.13, 0, 0, 1, 1, member.color, Math.sin(ang) > 0 ? 0.85 : 0.4);
        }
      }
    }
    if (!has) {
      glyphFallback(scene, a, x, y);
      continue;
    }
    let tint: string | undefined;
    let ta = 0;
    if (state.time >= v.hurtFrom && state.time < v.hurtUntil) {
      tint = '#ffffff';
      ta = 0.72;
    } else if (dead) {
      tint = '#8a0000';
      ta = 0.55;
    } else if (hasStatus(a, 'burning')) {
      tint = '#ff7a1a';
      ta = 0.25 + 0.15 * Math.abs(Math.sin(time / 90));
    } else if (hasStatus(a, 'poisoned')) {
      tint = '#58d84a';
      ta = 0.28;
    } else if (hasStatus(a, 'slowed')) {
      tint = '#5a8cff';
      ta = 0.25;
    } else if (hasStatus(a, 'paralyzed')) {
      tint = '#e8e8ff';
      ta = 0.22;
    }
    const invisible = hasStatus(a, 'invisible') || a.flags.includes('invisible');
    const statuses = new Set((a.effects ?? []).filter((e) => e.turns > 0).map((e) => e.id as string));
    const auraOpts = { big: d.boss };
    if (!dead && statuses.size) drawAuraBack(scene, statuses, x, y, time, a.id, auraOpts);
    if (dead) {
      // O herói caído deita no chão.
      scene.spr(d.key, x, y, { anchor: 'center', ox: 8, oy: 11, f: 0, flip: v.face < 0, rot: Math.PI / 2 * (v.face < 0 ? -1 : 1), a: 0.9, tint, ta });
    } else {
      const lunge = state.lungeOffset(v);
      const shiver = statuses.has('afraid') ? fearShake(time, a.id) : 0;
      if (statuses.has('hasted')) {
        // imagem residual atrás de quem está acelerado
        for (const k of [2, 1]) {
          scene.spr(d.key, x, y, { anchor: 'foot', f: idle, ox: lunge.ox - v.face * k * 3, oy: hop + lunge.oy, flip: v.face < 0, a: 0.18 * (3 - k), tint: '#ffe04a', ta: 0.7 });
        }
      }
      scene.spr(d.key, x, y, {
        anchor: 'foot', f: hasStatus(a, 'paralyzed') ? 0 : idle, ox: lunge.ox + shiver, oy: hop + lunge.oy, flip: v.face < 0, a: invisible ? 0.5 : 1, tint, ta: tint ? ta : undefined,
      });
      // Dentro d'água (ou de lava): pés submersos e ondinhas em volta.
      const under = inBounds(map, a.x, a.y) ? map.tiles[idx(map, a.x, a.y)] : Tile.Floor;
      if ((under === Tile.Water || under === Tile.Lava) && !v.walking && !HOVERING.has(a.isPlayer ? '' : a.templateId)) wade(scene, x, y, time, a.id, under === Tile.Lava, d.boss);
      if (statuses.size) drawAuraFront(scene, statuses, x, y, time, a.id, auraOpts);
    }
    // Multijogador: nome dos aliados em cima da cabeça.
    if (member && a !== game.player) scene.text(x + 0.5, y - 0.18, dead ? `${member.name} (caído)` : member.name, member.color, 0.6, dead ? 0.6 : 0.95);
    if (!a.isPlayer && a.ai.state === 'sleeping') scene.spr(K.fx('zzz'), x, y, { oy: d.boss ? -14 : -9, ox: 5, f: Math.floor(time / 600) % 2 });
    if (a.isPlayer && hasStatus(a, 'asleep') && !dead) scene.spr(K.fx('zzz'), x, y, { oy: -9, ox: 5, f: Math.floor(time / 600) % 2 });
    if (!a.isPlayer && (a.hp < a.maxHp || d.boss)) bars.push(d);
  }

  // Barras de vida por cima de todos os sprites.
  for (const d of bars) {
    const { a, v } = d;
    const w = d.boss ? 20 : 12;
    const ox = d.boss ? -2 : 2;
    const oy = d.boss ? -10 : -3;
    const fill = Math.max(1, Math.round((w * Math.max(0, a.hp)) / a.maxHp));
    scene.prect(v.x, v.y, ox - 1, oy - 1, w + 2, 4, '#0b0910', 0.9);
    scene.prect(v.x, v.y, ox, oy, w, 2, '#34283e', 1);
    scene.prect(v.x, v.y, ox, oy, fill, 2, hpColorCss(a.hp, a.maxHp), 1);
  }

  // Fantasmas de mortes: o sprite some numa nuvem de fumaça (antes da hora do golpe, ainda aparece inteiro).
  for (const g of state.ghosts) {
    const wait = state.time < g.t0;
    const t = wait ? 0 : Math.min(1, (state.time - g.t0) / 700);
    if (registry.has(g.key)) scene.spr(g.key, g.x, g.y, { anchor: 'foot', f: g.frame, flip: g.face < 0, a: 1 - t, tint: '#ffffff', ta: wait ? undefined : 0.5 * (1 - t) });
    if (!wait) scene.spr(K.fx('puff'), g.x, g.y, { f: Math.min(4, Math.floor(t * 5)), oy: g.boss ? -4 : 0 });
  }
}

/** Quem paira (não molha os pés). */
const HOVERING = new Set(['bat', 'wraith', 'fire_elemental', 'frost_elemental', 'abyssal_horror']);

/** Faixa de líquido sobre os pés do ator e um anel de ondas que se abre devagar. */
export function wade(scene: Scene, x: number, y: number, time: number, id: number, lava: boolean, big: boolean): void {
  const deep = lava ? '#c2521c' : '#3a68b4';
  const hi = lava ? '#fcc444' : '#b4deff';
  const w = big ? 14 : 10;
  const x0 = 8 - w / 2;
  scene.prect(x, y, x0, 13, w, 3, deep, 0.85);
  // linha d'água ondulando
  for (let i = 0; i < w; i++) {
    const up = Math.sin(time / 180 + i * 0.9 + id) > 0.3 ? 1 : 0;
    scene.prect(x, y, x0 + i, 12 + (1 - up), 1, 1, hi, 0.8);
  }
  // anel de ondas
  const u = ((time + id * 137) % 1400) / 1400;
  const rx = (0.3 + u * 0.35) * (big ? 1.4 : 1);
  const ry = rx * 0.32;
  const n = 22;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2;
    if (Math.sin(ang) < -0.2) continue; // só a metade da frente aparece
    scene.prect(x + 0.5 + Math.cos(ang) * rx, y + 0.86 + Math.sin(ang) * ry, 0, 0, 1, 1, hi, 0.7 * (1 - u));
  }
  if (lava) scene.glow(x + 0.5, y + 0.85, 0.6, '#ff8a2a', 0.3);
}

// ───────────────────────── minimapa ─────────────────────────

function buildMinimap(game: Game, state: SceneState, time: number, tilesW: number, tilesH: number): MinimapData {
  const lvl = level(game);
  const map = lvl.map;
  const w = map.width;
  const h = map.height;
  const data = new Uint8ClampedArray(w * h * 4);
  const put = (x: number, y: number, r: number, g: number, b: number, a = 255): void => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const o = (y * w + x) * 4;
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
    data[o + 3] = a;
  };
  const rgb = (css: string): [number, number, number] => {
    const v = parseInt(css.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  };
  const paint = (x: number, y: number, css: string, a = 255): void => {
    const [r, g, b] = rgb(css);
    put(x, y, r, g, b, a);
  };
  const solid = (t: number): boolean => t === Tile.Wall || t === Tile.SecretDoor;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!map.explored[i]) continue;
      const t = map.tiles[i];
      const seen = map.visible[i] === 1;
      if (solid(t)) {
        // Só as paredes que encostam em espaço conhecido (o contorno das salas).
        let edge = false;
        for (let dy = -1; dy <= 1 && !edge; dy++) {
          for (let dx = -1; dx <= 1 && !edge; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const j = ny * w + nx;
            if (map.explored[j] && !solid(map.tiles[j])) edge = true;
          }
        }
        if (edge) paint(x, y, seen ? '#4a5278' : '#2c3250');
        continue;
      }
      switch (t) {
        case Tile.Corridor: paint(x, y, seen ? '#7a84a6' : '#4a5274'); break;
        case Tile.DoorClosed: case Tile.DoorOpen: case Tile.DoorLocked: paint(x, y, '#d09a54'); break;
        case Tile.StairsDown: case Tile.StairsUp: paint(x, y, '#fff2a8'); break;
        case Tile.Water: paint(x, y, seen ? '#3f82e0' : '#2c5a9a'); break;
        case Tile.Lava: paint(x, y, seen ? '#f06a2a' : '#a04a24'); break;
        case Tile.Fountain: paint(x, y, '#6ad8e8'); break;
        case Tile.Altar: paint(x, y, '#c070e0'); break;
        case Tile.Fungus: paint(x, y, '#5ab060'); break;
        default: paint(x, y, seen ? '#a2acd0' : '#5a6488');
      }
    }
  }
  for (const it of lvl.items) if (map.explored[it.y * w + it.x]) paint(it.x, it.y, '#f0c050');
  const tracking = playerTracking(game);
  for (const a of lvl.actors) {
    if (seesActor(game, a)) paint(a.x, a.y, '#ff4a4a');
    else if (tracking) paint(a.x, a.y, '#ff9a40');
  }
  // Janela da câmera: contorno claro e translúcido.
  const vx0 = Math.round(state.camX - tilesW / 2);
  const vy0 = Math.round(state.camY - tilesH / 2);
  const vx1 = vx0 + Math.round(tilesW) - 1;
  const vy1 = vy0 + Math.round(tilesH) - 1;
  const edge = (x: number, y: number): void => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const o = (y * w + x) * 4;
    if (data[o + 3] === 0) put(x, y, 255, 255, 255, 70);
    else {
      data[o] = data[o] * 0.6 + 255 * 0.4;
      data[o + 1] = data[o + 1] * 0.6 + 255 * 0.4;
      data[o + 2] = data[o + 2] * 0.6 + 255 * 0.4;
    }
  };
  for (let x = vx0; x <= vx1; x++) {
    edge(x, vy0);
    edge(x, vy1);
  }
  for (let y = vy0 + 1; y < vy1; y++) {
    edge(vx0, y);
    edge(vx1, y);
  }
  // Multijogador: aliados de pé, cada um na sua cor.
  for (const m of game.party?.members ?? []) if (!m.dead && m.actor !== game.player) paint(m.actor.x, m.actor.y, m.color);
  // O jogador: ponto piscante com uma cruz.
  const p = game.player;
  const blink = Math.floor(time / 350) % 2 === 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(p.x + dx, p.y + dy, 255, 255, 255, 110);
  paint(p.x, p.y, blink ? '#ffffff' : '#ffe070');
  return { cx: MINI_X, cy: MINI_Y, cw: MINI_W, ch: MINI_H, w, h, data };
}

// ───────────────────────── entrada principal ─────────────────────────

/**
 * Monta a cena do mapa (sprites, luz, atores) e o minimapa, e deixa a janela do mapa transparente
 * para a cena aparecer. `shake` desloca a câmera (tremor de tela).
 */
export function drawMap(term: Terminal, game: Game, state: SceneState, time = 0, shake = 0): void {
  const lvl = level(game);
  const theme = themeById(lvl.theme);
  const style = STYLES[theme.id] ? theme.id : 'crypt';
  const scene = new Scene(MAP_X, MAP_Y, MAP_COLS, MAP_ROWS);
  scene.camX = state.camX + shake * 0.09;
  scene.camY = state.camY + (shake ? 0.03 * (shake > 0 ? 1 : -1) : 0);
  scene.time = time;
  const { tilesW, tilesH } = term.view;
  const v: View = {
    x0: Math.floor(state.camX - tilesW / 2) - 1,
    y0: Math.floor(state.camY - tilesH / 2) - 1,
    x1: Math.ceil(state.camX + tilesW / 2) + 1,
    y1: Math.ceil(state.camY + tilesH / 2) + 1,
  };
  const glows = drawWorld(scene, game, style, v, time);
  drawDarkness(scene, game, v);
  for (const g of glows) scene.glow(g.x, g.y, g.r, g.color, g.a);
  // Halo quente da tocha do jogador.
  const p = game.player;
  const pv = state.at(p.id, p);
  scene.glow(pv.x + 0.5, pv.y + 0.55, Math.max(1, p.light) + 1.4, '#ffb060', 0.13 + 0.02 * Math.sin(time / 170));
  drawUnexplored(scene, game, v);
  drawActors(scene, game, state, time);
  term.hole(MAP_X, MAP_Y, MAP_COLS, MAP_ROWS);
  term.scene = scene;
  term.minimap = buildMinimap(game, state, time, tilesW, tilesH);
  term.hole(MINI_X, MINI_Y, MINI_W, MINI_H);
}
