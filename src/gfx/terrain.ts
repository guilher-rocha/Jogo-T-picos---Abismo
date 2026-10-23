import { RNG } from '../engine/rng';
import type { RGBA } from './color';
import { hex, mix, shade, darken, lighten, hash01 } from './color';
import { Pixmap } from './pixmap';

/** Aparência de um tema de andar: cores e tipo de pedra. */
export interface TerrainStyle {
  id: string;
  seed: number;
  /** 'flag' lajotas, 'dirt' terra batida, 'slab' lajes grandes, 'basalt' basalto rachado, 'moss' terra com musgo */
  floorKind: 'flag' | 'dirt' | 'slab' | 'basalt' | 'moss';
  floor: { dark: string; base: string; light: string };
  corridor: { dark: string; base: string; light: string };
  /** 'brick' tijolos, 'rock' rocha bruta */
  wallKind: 'brick' | 'rock';
  wall: { mortar: string; dark: string; base: string; light: string; shadow: string };
  rim: { dark: string; mid: string; bright: string };
  roof: { base: string; light: string; dark: string };
  /** Cor de musgo/limo/brasa usada em detalhes. */
  moss: string;
  /** Cor de brilho dos detalhes mágicos (runas, cogumelos). */
  glow: string;
}

export const STYLES: Record<string, TerrainStyle> = {
  crypt: {
    id: 'crypt', seed: 11, floorKind: 'flag',
    floor: { dark: '#3c4258', base: '#4d5670', light: '#6a7694' },
    corridor: { dark: '#30354a', base: '#3e4660', light: '#566180' },
    wallKind: 'brick',
    wall: { mortar: '#2a2f45', dark: '#3a4262', base: '#4a5478', light: '#6676a0', shadow: '#1f2338' },
    rim: { dark: '#2a7a88', mid: '#46aab8', bright: '#9ae6ea' },
    roof: { base: '#221a2e', light: '#2e2440', dark: '#181220' },
    moss: '#4a7a48', glow: '#7ad0d6',
  },
  mines: {
    id: 'mines', seed: 23, floorKind: 'dirt',
    floor: { dark: '#5a4838', base: '#705c46', light: '#8c7458' },
    corridor: { dark: '#483a2e', base: '#5a4a3a', light: '#72604a' },
    wallKind: 'rock',
    wall: { mortar: '#241a14', dark: '#4a3828', base: '#62503c', light: '#84705a', shadow: '#1c130e' },
    rim: { dark: '#8a5a2c', mid: '#c08a48', bright: '#f0cc86' },
    roof: { base: '#1c1510', light: '#2a2018', dark: '#120d0a' },
    moss: '#6a8a3a', glow: '#ffc060',
  },
  fungal: {
    id: 'fungal', seed: 37, floorKind: 'moss',
    floor: { dark: '#243e34', base: '#305040', light: '#44705a' },
    corridor: { dark: '#1c3028', base: '#27413a', light: '#385c4c' },
    wallKind: 'rock',
    wall: { mortar: '#0f1e1a', dark: '#2a4a3c', base: '#38604c', light: '#5a8a68', shadow: '#0d1a16' },
    rim: { dark: '#3a8a4a', mid: '#6cc060', bright: '#c4f896' },
    roof: { base: '#0f1a18', light: '#16262a', dark: '#0a1210' },
    moss: '#7ad060', glow: '#b8ff7a',
  },
  fortress: {
    id: 'fortress', seed: 53, floorKind: 'slab',
    floor: { dark: '#4c5a7e', base: '#62729a', light: '#8496bc' },
    corridor: { dark: '#3e4a68', base: '#4e5c82', light: '#6a7ba2' },
    wallKind: 'brick',
    wall: { mortar: '#232c4e', dark: '#34508c', base: '#4468ac', light: '#6c92d0', shadow: '#161c36' },
    rim: { dark: '#3a96c0', mid: '#62c6e8', bright: '#c0f2ff' },
    roof: { base: '#161a30', light: '#1f2644', dark: '#0f1224' },
    moss: '#4a8a7a', glow: '#8ee8ff',
  },
  abyss: {
    id: 'abyss', seed: 71, floorKind: 'basalt',
    floor: { dark: '#2a2530', base: '#3a3340', light: '#52485a' },
    corridor: { dark: '#221e28', base: '#2f2a36', light: '#443c4e' },
    wallKind: 'rock',
    wall: { mortar: '#0f0a12', dark: '#3a2630', base: '#523440', light: '#7a4a58', shadow: '#0c070e' },
    rim: { dark: '#a02a24', mid: '#e0562a', bright: '#ffb070' },
    roof: { base: '#120a12', light: '#1c1018', dark: '#0b060c' },
    moss: '#d8442a', glow: '#ff7a3a',
  },
};

export const STYLE_IDS = Object.keys(STYLES);

const T = 16;

function c(s: string): RGBA {
  return hex(s);
}

function rngFor(style: TerrainStyle, kind: number, variant: number): RNG {
  return new RNG((style.seed * 7919 + kind * 104729 + variant * 1299709) >>> 0);
}

/** Tom de uma pedra: pequena variação de brilho aleatória por pedra. */
function tone(base: RGBA, amount: number, r: number): RGBA {
  return shade(base, 1 + (r - 0.5) * 2 * amount);
}

// ───────────────────────── chão ─────────────────────────

/** Lajotas em "fiada" (tijolo deitado): reticulado fixo para os tiles se emendarem. */
function floorFlag(style: TerrainStyle, pal: TerrainStyle['floor'], variant: number, bigSlabs = false): Pixmap {
  const rng = rngFor(style, bigSlabs ? 2 : 1, variant);
  const p = new Pixmap(T, T);
  const base = c(pal.base), dark = c(pal.dark), light = c(pal.light);
  const seam = darken(dark, 0.18);
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      let stone: number;
      let edgeX: boolean;
      let edgeY: boolean;
      if (bigSlabs) {
        stone = 0;
        edgeX = x === 0;
        edgeY = y === 0;
      } else {
        const row = y < 8 ? 0 : 1;
        const sx = row === 0 ? x : (x + 4) % T;
        stone = row * 2 + (sx < 8 ? 0 : 1);
        edgeX = sx % 8 === 0;
        edgeY = y % 8 === 0;
      }
      const sr = hash01(stone, variant, style.seed);
      let col = tone(base, bigSlabs ? 0.05 : 0.10, sr);
      // Bisel: realce no canto superior-esquerdo, sombra embaixo/direita.
      const lx = bigSlabs ? x : ((y < 8 ? x : (x + 4) % T) % 8);
      const ly = bigSlabs ? y : y % 8;
      const span = bigSlabs ? T : 8;
      if (lx === 1 && !edgeY && ly > 0) col = mix(col, light, 0.22);
      if (ly === 1 && !edgeX) col = mix(col, light, 0.30);
      if (ly === span - 1) col = mix(col, dark, 0.35);
      if (lx === span - 1) col = mix(col, dark, 0.25);
      if (edgeX || edgeY) col = seam;
      if (edgeX && edgeY) col = darken(seam, 0.15);
      p.set(x, y, col);
    }
  }
  speckle(p, rng, base, light, dark, bigSlabs ? 6 : 9);
  decorateFloorVariant(style, p, rng, variant, base, dark, light);
  return p;
}

/** Terra batida / musgo: sem reticulado, só ruído e pedrinhas. */
function floorDirt(style: TerrainStyle, pal: TerrainStyle['floor'], variant: number, mossy: boolean): Pixmap {
  const rng = rngFor(style, 3, variant);
  const p = new Pixmap(T, T);
  const base = c(pal.base), dark = c(pal.dark), light = c(pal.light);
  const moss = c(style.moss);
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      // Ruído de baixa frequência (manchas) + alta frequência (granulado).
      const lo = Math.sin(x * 0.9 + variant * 1.7) * Math.cos(y * 0.8 - variant) * 0.5 + 0.5;
      const hi = rng.next();
      let col = mix(dark, base, 0.35 + lo * 0.65);
      if (hi > 0.9) col = mix(col, light, 0.6);
      else if (hi < 0.1) col = mix(col, dark, 0.7);
      if (mossy && lo > 0.62 && hi > 0.3) col = mix(col, moss, 0.35 + hi * 0.3);
      p.set(x, y, col);
    }
  }
  // Pedrinhas com sombra.
  const pebbles = 2 + (variant % 3);
  for (let i = 0; i < pebbles; i++) {
    const x = rng.int(1, 13), y = rng.int(1, 13);
    const w = rng.int(1, 2);
    p.fillRect(x, y + 1, w + 1, 1, darken(base, 0.45));
    p.fillRect(x, y, w + 1, 1, mix(base, light, 0.65));
    p.set(x, y, lighten(light, 0.25));
  }
  decorateFloorVariant(style, p, rng, variant, base, dark, light);
  return p;
}

/** Basalto do Abismo: lajes escuras com rachaduras que brilham. */
function floorBasalt(style: TerrainStyle, pal: TerrainStyle['floor'], variant: number): Pixmap {
  const p = floorFlag(style, pal, variant);
  const rng = rngFor(style, 4, variant);
  const glow = c(style.moss);
  const hot = c(style.glow);
  if (variant === 3) {
    // Rachadura com brasa no fundo (só uma das seis variantes: o chão não pode parecer carimbado;
    // as rachaduras de lava animadas vêm como enfeite à parte).
    let x = rng.int(2, 13), y = rng.int(0, 3);
    const len = rng.int(6, 10);
    for (let i = 0; i < len && y < T; i++) {
      p.set(x, y, i % 3 === 1 ? mix(glow, hot, 0.15) : darken(glow, 0.35));
      if (p.alpha(x - 1, y)) p.set(x - 1, y, darken(c(pal.dark), 0.5));
      y++;
      x += rng.int(-1, 1);
      x = Math.max(1, Math.min(14, x));
    }
  }
  return p;
}

/** Manchas e detalhes por variante: rachaduras, poças, ossinhos. */
function decorateFloorVariant(_style: TerrainStyle, p: Pixmap, rng: RNG, variant: number, base: RGBA, dark: RGBA, light: RGBA): void {
  if (variant === 1) {
    // rachadura escura (só uma das seis variantes: o chão não pode parecer carimbado)
    let x = rng.int(3, 12), y = rng.int(1, 4);
    const len = rng.int(5, 9);
    const crack = darken(dark, 0.5);
    for (let i = 0; i < len; i++) {
      p.set(x, y, crack);
      if (i % 2 === 0) p.set(x - 1, y + 1, darken(base, 0.3));
      y++;
      x += rng.int(-1, 1);
    }
  } else if (variant % 4 === 2) {
    // mancha de umidade
    const cx = rng.int(4, 11), cy = rng.int(4, 11);
    for (let y = -3; y <= 3; y++) {
      for (let x = -4; x <= 4; x++) {
        if ((x * x) / 16 + (y * y) / 9 < 0.8 && rng.next() > 0.25) {
          const q = p.get(cx + x, cy + y);
          if (q[3]) p.set(cx + x, cy + y, mix(q, dark, 0.28));
        }
      }
    }
  } else if (variant % 4 === 3) {
    // pontos claros
    for (let i = 0; i < 4; i++) p.set(rng.int(1, 14), rng.int(1, 14), mix(base, light, 0.55));
  } else if (variant === 5) {
    // lasca num canto da laje
    const cx = rng.chance(50) ? 1 : 12;
    const cy = rng.chance(50) ? 1 : 12;
    for (let i = 0; i < 4; i++) p.set(cx + rng.int(0, 2), cy + rng.int(0, 2), darken(dark, 0.3));
  }
}

function speckle(p: Pixmap, rng: RNG, base: RGBA, light: RGBA, dark: RGBA, n: number): void {
  for (let i = 0; i < n; i++) {
    const x = rng.int(0, 15), y = rng.int(0, 15);
    const q = p.get(x, y);
    if (q[3] === 0) continue;
    p.set(x, y, rng.chance(55) ? mix(q, light, 0.28) : mix(q, dark, 0.3));
  }
  void base;
}

export function makeFloor(style: TerrainStyle, variant: number): Pixmap {
  switch (style.floorKind) {
    case 'flag': return floorFlag(style, style.floor, variant);
    case 'slab': return floorFlag(style, style.floor, variant, true);
    case 'dirt': return floorDirt(style, style.floor, variant, false);
    case 'moss': return floorDirt(style, style.floor, variant, true);
    case 'basalt': return floorBasalt(style, style.floor, variant);
  }
}

/** Corredor: mais escuro e mais "áspero" que o piso das salas. */
export function makeCorridor(style: TerrainStyle, variant: number): Pixmap {
  const rng = rngFor(style, 5, variant);
  const pal = style.corridor;
  const base = c(pal.base), dark = c(pal.dark), light = c(pal.light);
  const p = new Pixmap(T, T);
  // Pedras redondas irregulares (Voronoi) com emenda periódica.
  const sites: [number, number][] = [];
  for (let gy = 0; gy < 3; gy++) for (let gx = 0; gx < 3; gx++) {
    sites.push([gx * 5.4 + hash01(gx, gy, style.seed) * 2.6, gy * 5.4 + hash01(gx + 9, gy + 3, style.seed) * 2.6]);
  }
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      let d1 = 99, d2 = 99, id = 0;
      sites.forEach(([sx, sy], i) => {
        const dx = Math.min(Math.abs(x - sx), T - Math.abs(x - sx));
        const dy = Math.min(Math.abs(y - sy), T - Math.abs(y - sy));
        const d = Math.hypot(dx, dy);
        if (d < d1) { d2 = d1; d1 = d; id = i; } else if (d < d2) d2 = d;
      });
      let col = tone(base, 0.12, hash01(id, variant, 3));
      if (d2 - d1 < 1.1) col = darken(dark, 0.25);
      else if (d1 < 1.6) col = mix(col, light, 0.2);
      p.set(x, y, col);
    }
  }
  speckle(p, rng, base, light, dark, 8);
  return p;
}

// ───────────────────────── paredes ─────────────────────────

const RIM_ROWS = 2;

/** Face frontal da parede (a parte de "tijolos" que o jogador vê). */
export function makeFace(style: TerrainStyle, variant: number): Pixmap {
  return style.wallKind === 'brick' ? faceBrick(style, variant) : faceRock(style, variant);
}

function faceBrick(style: TerrainStyle, variant: number): Pixmap {
  const rng = rngFor(style, 6, variant);
  const p = new Pixmap(T, T);
  const w = style.wall;
  const base = c(w.base), light = c(w.light), dark = c(w.dark), mortar = c(w.mortar), sh = c(w.shadow);
  // Fiadas de 4 px: 3 de tijolo + 1 de argamassa; deslocadas 4 px a cada fiada.
  for (let course = 0; course < 3; course++) {
    const y0 = RIM_ROWS + course * 4;
    const off = course % 2 === 0 ? 0 : 4;
    for (let x = 0; x < T; x++) {
      const bx = (x + T - off) % T;
      const brick = Math.floor(bx / 8);
      const joint = bx % 8 === 0;
      const tn = tone(base, 0.11, hash01(brick + course * 3, variant, style.seed + 5));
      for (let r = 0; r < 4; r++) {
        const y = y0 + r;
        let col: RGBA;
        if (r === 3 || joint) col = mortar;
        else if (r === 0) col = mix(tn, light, 0.55);
        else if (r === 2) col = mix(tn, dark, 0.5);
        else col = tn;
        if (!joint && r < 3 && bx % 8 === 1) col = mix(col, light, 0.25);
        p.set(x, y, col);
      }
    }
  }
  // topo (borda iluminada) e base (sombra)
  for (let x = 0; x < T; x++) {
    p.set(x, 0, c(style.rim.bright));
    p.set(x, 1, c(style.rim.mid));
    p.set(x, 14, mix(dark, sh, 0.55));
    p.set(x, 15, sh);
  }
  // defeitos: tijolo rachado, lascas
  for (let i = 0; i < 3; i++) {
    const x = rng.int(0, 15), y = rng.int(3, 12);
    p.set(x, y, rng.chance(50) ? darken(dark, 0.4) : mix(base, light, 0.4));
  }
  if (variant % 3 === 1) crackV(p, rng, mortar, 4 + rng.int(0, 8));
  if (variant % 5 === 2) mossTuft(p, rng, c(style.moss));
  return p;
}

function faceRock(style: TerrainStyle, variant: number): Pixmap {
  const rng = rngFor(style, 7, variant);
  const p = new Pixmap(T, T);
  const w = style.wall;
  const base = c(w.base), light = c(w.light), dark = c(w.dark), mortar = c(w.mortar), sh = c(w.shadow);
  // Blocos irregulares: sítios fixos (emenda horizontal) e tom aleatório por bloco.
  const sites: [number, number][] = [
    [2, 5], [7, 3], [12, 6], [4, 10], [10, 11], [14, 13], [0, 13],
  ].map(([x, y]) => [x + (hash01(x, y, style.seed) - 0.5) * 1.5, y + (hash01(y, x, style.seed) - 0.5) * 1.5]);
  for (let y = RIM_ROWS; y < 14; y++) {
    for (let x = 0; x < T; x++) {
      let d1 = 99, d2 = 99, id = 0;
      sites.forEach(([sx, sy], i) => {
        const dx = Math.min(Math.abs(x - sx), T - Math.abs(x - sx));
        const d = Math.hypot(dx, (y - sy) * 1.15);
        if (d < d1) { d2 = d1; d1 = d; id = i; } else if (d < d2) d2 = d;
      });
      let col = tone(base, 0.16, hash01(id, 2, style.seed));
      const nearEdge = d2 - d1;
      if (nearEdge < 1.0) col = mortar;
      else if (nearEdge < 1.9) col = mix(col, dark, 0.45);
      else if (d1 < 1.8) col = mix(col, light, 0.3);
      p.set(x, y, col);
    }
  }
  for (let x = 0; x < T; x++) {
    p.set(x, 0, c(style.rim.bright));
    p.set(x, 1, c(style.rim.mid));
    p.set(x, 14, mix(dark, sh, 0.55));
    p.set(x, 15, sh);
  }
  if (variant % 3 === 1) crackV(p, rng, mortar, 4 + rng.int(0, 8));
  if (variant % 4 === 2) mossTuft(p, rng, c(style.moss));
  return p;
}

function crackV(p: Pixmap, rng: RNG, col: RGBA, x0: number): void {
  let x = x0;
  for (let y = 3; y < 13; y++) {
    p.set(x, y, col);
    if (rng.chance(40)) x += rng.chance(50) ? 1 : -1;
  }
}

function mossTuft(p: Pixmap, rng: RNG, col: RGBA): void {
  const x0 = rng.int(1, 10);
  for (let i = 0; i < 6; i++) {
    const x = x0 + rng.int(0, 4);
    const y = rng.int(11, 13);
    p.set(x, y, mix(col, [0, 0, 0, 255], 0.2 + rng.next() * 0.2));
    if (rng.chance(60)) p.set(x, y - 1, col);
  }
}

/** Topo da parede (visto de cima): escuro, só para dar corpo ao contorno das salas. */
export function makeRoof(style: TerrainStyle, variant: number): Pixmap {
  const rng = rngFor(style, 8, variant);
  const p = new Pixmap(T, T);
  const base = c(style.roof.base), light = c(style.roof.light), dark = c(style.roof.dark);
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      let col = base;
      const r = rng.next();
      if (r > 0.93) col = light;
      else if (r < 0.1) col = dark;
      p.set(x, y, col);
    }
  }
  // Linhas de junta bem sutis, como lajes vistas de cima.
  const seam = darken(base, 0.35);
  const sx = 4 + (variant % 3) * 3;
  for (let y = 0; y < T; y++) p.set(sx, y, seam);
  for (let x = 0; x < T; x++) p.set(x, 7 + (variant % 2) * 2, seam);
  return p;
}

/** Peças que se sobrepõem ao topo/face conforme os vizinhos abertos. */
export interface RimParts {
  rimN: Pixmap;
  rimE: Pixmap;
  rimW: Pixmap;
  /** Cantos internos (diagonal aberta, ortogonais fechados). */
  inNE: Pixmap;
  inNW: Pixmap;
  inSE: Pixmap;
  inSW: Pixmap;
  /** Pontas de parede (faces): tampa esquerda/direita. */
  capL: Pixmap;
  capR: Pixmap;
}

export function makeRimParts(style: TerrainStyle): RimParts {
  const br = c(style.rim.bright), md = c(style.rim.mid), dk = c(style.rim.dark);
  const mk = (fn: (p: Pixmap) => void) => {
    const p = new Pixmap(T, T);
    fn(p);
    return p;
  };
  const rimN = mk((p) => {
    for (let x = 0; x < T; x++) {
      p.set(x, 0, br);
      p.set(x, 1, md);
      p.set(x, 2, mix(dk, [20, 14, 30, 255], 0.3));
    }
  });
  const rimE = mk((p) => {
    for (let y = 0; y < T; y++) {
      p.set(15, y, br);
      p.set(14, y, md);
      p.set(13, y, mix(dk, [20, 14, 30, 255], 0.3));
    }
  });
  const rimW = rimE.flipX();
  const corner = (x0: number, y0: number) => mk((p) => {
    p.set(x0, y0, br);
    p.set(x0 + (x0 === 0 ? 1 : -1), y0, md);
    p.set(x0, y0 + (y0 === 0 ? 1 : -1), md);
  });
  const capL = mk((p) => {
    for (let y = 0; y < T; y++) {
      p.set(0, y, y < 2 ? br : y > 13 ? mix(dk, [0, 0, 0, 255], 0.5) : mix(md, dk, 0.2));
      p.set(1, y, y < 2 ? md : y > 13 ? mix(dk, [0, 0, 0, 255], 0.5) : mix(dk, [0, 0, 0, 255], 0.2));
    }
  });
  return {
    rimN, rimE, rimW,
    inNE: corner(15, 0), inNW: corner(0, 0), inSE: corner(15, 15), inSW: corner(0, 15),
    capL, capR: capL.flipX(),
  };
}

export { shade, hash01 };
