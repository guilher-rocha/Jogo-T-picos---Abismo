import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { allEntries, terrainEntries, monstersWithoutArt, K } from '../src/gfx/library';
import { STYLE_IDS } from '../src/gfx/terrain';
import { VARIANTS } from '../src/gfx/autotile';
import { THEMES } from '../src/data/themes';
import { MONSTERS } from '../src/data/monsters';
import { BOSSES } from '../src/data/bosses';
import { ITEMS } from '../src/data/items';
import { RACES } from '../src/data/races';
import { CLASSES } from '../src/data/classes';
import { COLOR_NAMES } from '../src/engine/colors';
import { TRAP_INFO } from '../src/core/traps';
import { createGame, enterLevel } from '../src/core/world';
import { level } from '../src/core/game';
import { Terminal } from '../src/engine/terminal';
import { SceneState } from '../src/ui/sceneState';
import { drawMap, WALL_DECOR, FLOOR_DECOR, EDGE_DECOR } from '../src/ui/mapView';

const entries = allEntries();
const keys = new Set(entries.map((e) => e.key));

/** Largura da linha do atlas (src/engine/atlas.ts): uma animação inteira precisa caber nela. */
const ATLAS_WIDTH = 2048;

describe('sprites: cobertura', () => {
  it('todo monstro e todo chefe tem sprite', () => {
    expect(monstersWithoutArt()).toEqual([]);
    for (const m of [...MONSTERS, ...BOSSES]) expect(keys.has(K.mon(m.id)), `mon:${m.id}`).toBe(true);
  });

  it('todo herói (raça × classe) tem sprite', () => {
    for (const r of RACES) for (const c of CLASSES) expect(keys.has(K.hero(r.id, c.id)), `hero:${r.id}:${c.id}`).toBe(true);
  });

  it('todo item base tem ícone e há cadáver para cada cor', () => {
    for (const b of ITEMS) expect(keys.has(K.item(b.id)), `item:${b.id}`).toBe(true);
    for (const c of COLOR_NAMES) expect(keys.has(K.corpse(c)), `corpse:${c}`).toBe(true);
  });

  it('os efeitos e as telas de abertura e fim existem', () => {
    for (const fx of ['arrow', 'bolt', 'hit', 'plus', 'puff', 'spark', 'stone', 'zzz']) expect(keys.has(K.fx(fx)), `fx:${fx}`).toBe(true);
    for (const ui of ['logo', 'gameover', 'victory', 'tombstone']) expect(keys.has(K.ui(ui)), `ui:${ui}`).toBe(true);
    expect(keys.has(K.water) && keys.has(K.lava)).toBe(true);
  });

  it('todo tema de andar tem cenário completo (tiles, bordas, portas, escadas, armadilhas, enfeites)', () => {
    for (const t of THEMES) expect(STYLE_IDS, `tema ${t.id}`).toContain(t.id);
    for (const id of STYLE_IDS) {
      const have = new Set(terrainEntries(id).map((e) => e.key));
      const need: string[] = [];
      for (let v = 0; v < VARIANTS.floor; v++) need.push(K.floor(id, v));
      for (let v = 0; v < VARIANTS.corridor; v++) need.push(K.corr(id, v));
      for (let v = 0; v < VARIANTS.face; v++) need.push(K.face(id, v));
      for (let v = 0; v < VARIANTS.roof; v++) need.push(K.roof(id, v));
      for (const part of ['rimN', 'rimE', 'rimW', 'inNE', 'inNW', 'inSE', 'inSW', 'capL', 'capR']) need.push(K.rim(id, part));
      const props = ['stairs_down', 'stairs_up', 'fountain', 'fountain_dry', 'altar', 'fungus', 'rubble', 'torch', 'web_tl', 'web_tr'];
      for (const o of ['h', 'v']) for (const s of ['closed', 'open', 'locked']) props.push(`door_${o}_${s}`);
      for (const kind of Object.keys(TRAP_INFO)) props.push(`trap_${kind}`);
      for (const rules of [WALL_DECOR[id] ?? [], FLOOR_DECOR[id] ?? [], EDGE_DECOR[id] ?? []]) for (const r of rules) props.push(r.name);
      for (const p of props) need.push(K.prop(id, p));
      for (const k of need) expect(have.has(k), k).toBe(true);
      // a tocha tem três quadros (a animação do mapa usa os três)
      expect(terrainEntries(id).find((e) => e.key === K.prop(id, 'torch'))!.frames.length).toBe(3);
    }
  });
});

describe('sprites: formato', () => {
  it('os quadros de cada animação têm o mesmo tamanho e a animação cabe numa linha do atlas', () => {
    for (const e of entries) {
      expect(e.frames.length, e.key).toBeGreaterThan(0);
      for (const f of e.frames) {
        expect([f.w, f.h], e.key).toEqual([e.w, e.h]);
        expect(f.data.length, e.key).toBe(e.w * e.h * 4);
      }
      expect(e.w * e.frames.length, `${e.key} largo demais para o atlas`).toBeLessThanOrEqual(ATLAS_WIDTH);
    }
  });

  it('as chaves não se repetem e nenhum sprite é totalmente transparente', () => {
    expect(keys.size).toBe(entries.length);
    for (const e of entries) {
      const opaque = e.frames.some((f) => f.data.some((v, i) => i % 4 === 3 && v > 0));
      expect(opaque, e.key).toBe(true);
    }
  });

  it('desenhar duas vezes dá exatamente os mesmos pixels (nada de acaso na arte)', () => {
    const again = allEntries();
    expect(again.length).toBe(entries.length);
    for (let i = 0; i < entries.length; i += 7) {
      expect(again[i].key).toBe(entries[i].key);
      for (let f = 0; f < entries[i].frames.length; f++) expect(Buffer.compare(Buffer.from(again[i].frames[f].data), Buffer.from(entries[i].frames[f].data))).toBe(0);
    }
  });
});

describe('sprites: o mapa só pede o que existe', () => {
  it('todos os andares, com tudo revelado, desenham apenas sprites do atlas', () => {
    for (let depth = 1; depth <= 20; depth++) {
      const g = createGame(900 + depth, { name: 'Teste', raceId: RACES[depth % RACES.length].id, classId: CLASSES[depth % CLASSES.length].id });
      enterLevel(g, depth, 'down');
      const lvl = level(g);
      lvl.map.explored.fill(1);
      lvl.map.visible.fill(1);
      for (const t of lvl.traps ?? []) t.hidden = false;
      const state = new SceneState();
      const term = new Terminal(100, 30);
      state.update(g, 16, 40, 24);
      drawMap(term, g, state, 1234);
      const missing = new Set<string>();
      for (const c of term.scene!.cmds) if (c.k === 'spr' && !keys.has(c.key)) missing.add(c.key);
      expect([...missing], `andar ${depth}`).toEqual([]);
      expect(term.scene!.cmds.some((c) => c.k === 'spr')).toBe(true);
    }
  });
});

describe('regras do projeto', () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(join(dir, d.name)) : d.name.endsWith('.ts') ? [join(dir, d.name)] : []));

  it('a lógica e a arte não usam Math.random (só o RNG com seed)', () => {
    for (const dir of ['src/core', 'src/gen', 'src/ai', 'src/data', 'src/gfx', 'src/ui']) {
      for (const f of walk(dir)) expect(readFileSync(f, 'utf8').includes('Math.random'), f).toBe(false);
    }
  });

  it('core, gen, ai, data e gfx não tocam no DOM', () => {
    for (const dir of ['src/core', 'src/gen', 'src/ai', 'src/data', 'src/gfx']) {
      for (const f of walk(dir)) {
        const code = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
        expect(/\b(document|window|HTMLCanvasElement|CanvasRenderingContext2D)\b/.test(code), f).toBe(false);
      }
    }
  });
});

describe('sprites: identificação', () => {
  it('toda aparência de poção, varinha, anel e amuleto tem sprite próprio', async () => {
    const { LOOKS } = await import('../src/data/appearances');
    for (const [cat, looks] of Object.entries(LOOKS)) for (const look of looks) expect(keys.has(K.look(cat, look)), `${cat}:${look}`).toBe(true);
  });

  it('o sprite e a cor de uma poção vêm da aparência sorteada, não do tipo verdadeiro', async () => {
    const { itemSpriteKey } = await import('../src/ui/mapView');
    const { itemColor } = await import('../src/core/itemText');
    const { createItem } = await import('../src/core/item');
    const { learn } = await import('../src/core/identify');
    const { LOOK_COLORS } = await import('../src/data/appearances');
    const keysFor = new Set<string>();
    for (let seed = 1; seed <= 6; seed++) {
      const g = createGame(seed);
      const potion = createItem(g, 'potion_heal');
      const look = g.idState.appearances.potion_heal;
      expect(itemSpriteKey(potion, g)).toBe(K.look('potion', look));
      expect(itemColor(potion, g)).toBe(LOOK_COLORS.potion[look]);
      // Identificar não muda o desenho (como no NetHack): só o nome.
      learn(g, 'potion_heal');
      expect(itemSpriteKey(potion, g)).toBe(K.look('potion', look));
      keysFor.add(itemSpriteKey(potion, g));
    }
    // Em partidas diferentes, a poção de cura não tem sempre a mesma cara.
    expect(keysFor.size).toBeGreaterThan(1);
  });
});
