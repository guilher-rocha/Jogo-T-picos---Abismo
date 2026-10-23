import type { RGBA } from './color';
import { hex, mix, darken, hash01 } from './color';
import { PAL } from './palette';
import { Pixmap, fromRows, rowsOf } from './pixmap';
import type { TerrainStyle } from './terrain';
import { makeDecor } from './decor';

/** Atalho: cor da paleta mestra. */
export function pc(ch: string): RGBA {
  return hex(PAL[ch]);
}

const T = 16;
const blank = (): Pixmap => new Pixmap(T, T);
const g = (name: string, block: string): Pixmap => fromRows(rowsOf(block), PAL, name, T);

// ───────────────────────── escadas ─────────────────────────

/**
 * Escadas. `down`: abertura no chão com degraus que estreitam e escurecem até o breu.
 * `up`: lance de pedra subindo até uma passagem escura em arco, com sombra no chão.
 * Uma setinha clara indica o sentido (as duas não podem ser confundidas).
 */
function stairs(style: TerrainStyle, down: boolean): Pixmap {
  const p = blank();
  const K = pc('K');
  const wl = hex(style.wall.light), wb = hex(style.wall.base), wd = hex(style.wall.dark);
  const fl = hex(style.floor.light), fd = hex(style.floor.dark);
  const arrow = hex('#c0f4f0d0');
  if (down) {
    // borda de pedra (cantos arredondados), clara em cima, escura nos lados
    for (let y = 1; y <= 14; y++) for (let x = 1; x <= 14; x++) {
      if ((x === 1 || x === 14) && (y === 1 || y === 14)) continue;
      p.set(x, y, y <= 2 ? (y === 1 ? wl : wb) : y === 14 ? mix(wb, wl, 0.4) : x <= 2 ? mix(wd, wb, 0.4) : wd);
    }
    p.fillRect(3, 3, 10, 11, K);
    // degraus: cada um mais estreito e mais escuro que o anterior
    for (let i = 0; i < 5; i++) {
      const y = 3 + i * 2;
      const inset = i;
      const shade = 1 - i * 0.21;
      const x0 = 3 + Math.floor(inset / 2), x1 = 12 - Math.floor(inset / 2);
      for (let x = x0; x <= x1; x++) {
        p.set(x, y, mix(K, mix(fl, wl, 0.3), shade * 0.85));
        p.set(x, y + 1, mix(K, fd, shade * 0.55));
      }
      // paredes laterais do poço
      for (let x = 3; x < x0; x++) { p.set(x, y, darken(wd, 0.55)); p.set(x, y + 1, darken(wd, 0.6)); }
      for (let x = x1 + 1; x <= 12; x++) { p.set(x, y, darken(wd, 0.65)); p.set(x, y + 1, darken(wd, 0.7)); }
    }
    p.fillRect(5, 12, 6, 2, K);
    // seta para baixo
    for (const [x, y] of [[6, 8], [9, 8], [7, 9], [8, 9]] as const) p.set(x, y, arrow);
  } else {
    // passagem escura em arco no alto
    p.fillRect(4, 1, 8, 4, K);
    p.set(4, 1, pc('0'));
    p.set(11, 1, pc('0'));
    for (let x = 3; x <= 12; x++) p.set(x, 0, x === 3 || x === 12 ? wd : wl);
    p.fillRect(3, 1, 1, 4, wb);
    p.fillRect(12, 1, 1, 4, wd);
    // degraus subindo (os de baixo, mais perto, mais largos e mais claros)
    for (let i = 0; i < 5; i++) {
      const y = 5 + i * 2;
      const inset = 4 - i;
      const x0 = 3 + Math.floor(inset / 2), x1 = 12 - Math.floor(inset / 2);
      const shade = 0.5 + i * 0.1;
      for (let x = x0; x <= x1; x++) {
        p.set(x, y, mix(K, fl, shade));
        p.set(x, y + 1, mix(K, wd, shade * 0.8));
      }
      p.set(x0 - 1, y, wb);
      p.set(x0 - 1, y + 1, wd);
      p.set(x1 + 1, y, wd);
      p.set(x1 + 1, y + 1, darken(wd, 0.3));
    }
    // sombra do lance no chão, à direita
    for (let y = 6; y < 15; y++) p.set(14, y, hex('#0b091060'));
    // seta para cima (dentro da passagem)
    for (const [x, y] of [[7, 2], [8, 2], [6, 3], [9, 3]] as const) p.set(x, y, arrow);
  }
  return p.outline(0.5);
}

// ───────────────────────── portas ─────────────────────────

function doorH(state: 'closed' | 'open' | 'locked', style: TerrainStyle): Pixmap {
  const p = blank();
  const wood = ['b', 'c', 'd', 'e'].map(pc);
  // moldura de pedra em arco
  const fr = hex(style.wall.light), frd = hex(style.wall.dark);
  p.fillRect(2, 2, 12, 14, pc('k'));
  p.fillRect(3, 2, 10, 14, frd);
  p.fillRect(3, 2, 10, 1, fr);
  p.fillRect(3, 3, 1, 13, mix(frd, fr, 0.45));
  if (state === 'open') {
    // vão escuro com um pouco de piso, folha da porta encostada à esquerda
    p.fillRect(4, 3, 8, 13, pc('K'));
    p.fillRect(4, 3, 8, 1, pc('0'));
    for (let y = 12; y < 16; y++) p.fillRect(4, y, 8, 1, mix(pc('K'), hex(style.floor.dark), (y - 11) / 4.5));
    p.fillRect(4, 3, 2, 13, wood[1]);
    p.fillRect(4, 3, 1, 13, wood[2]);
    p.fillRect(5, 3, 1, 13, wood[0]);
    p.fillRect(4, 6, 2, 1, pc('3'));
    p.fillRect(4, 11, 2, 1, pc('3'));
    return p;
  }
  // folha fechada: tábuas verticais
  p.fillRect(4, 3, 8, 13, wood[1]);
  for (let x = 4; x < 12; x += 2) {
    p.fillRect(x, 3, 1, 13, wood[2]);
    p.fillRect(x + 1, 3, 1, 13, wood[1]);
  }
  p.fillRect(4, 3, 8, 1, wood[3]);
  p.fillRect(4, 15, 8, 1, wood[0]);
  // faixas de ferro
  for (const y of [5, 11]) {
    p.fillRect(4, y, 8, 2, pc('2'));
    p.fillRect(4, y, 8, 1, pc('4'));
    p.set(4, y + 1, pc('1'));
    p.set(11, y + 1, pc('1'));
  }
  if (state === 'locked') {
    p.fillRect(7, 7, 3, 3, pc('k'));
    p.fillRect(7, 7, 3, 2, pc('y'));
    p.set(8, 8, pc('K'));
    p.set(8, 9, pc('K'));
    p.fillRect(6, 7, 1, 1, pc('Y'));
  } else {
    p.set(10, 8, pc('y'));
    p.set(10, 9, pc('o'));
  }
  return p;
}

function doorV(state: 'closed' | 'open' | 'locked', style: TerrainStyle): Pixmap {
  const p = blank();
  const wood = ['a', 'b', 'c', 'd', 'e'].map(pc);
  if (state === 'open') {
    // passagem aberta: piso escuro e folha encostada à parede de cima
    const f = hex(style.corridor.dark);
    p.fillRect(0, 0, T, T, f);
    p.fillRect(0, 0, T, 3, pc('0'));
    p.fillRect(0, 3, T, 1, darken(f, 0.5));
    p.fillRect(2, 0, 12, 3, wood[2]);
    p.fillRect(2, 0, 12, 1, wood[4]);
    p.fillRect(2, 2, 12, 1, wood[1]);
    p.fillRect(4, 1, 1, 1, pc('3'));
    p.fillRect(11, 1, 1, 1, pc('3'));
    return p;
  }
  // folha de lado: tábuas horizontais num painel estreito
  p.fillRect(4, 0, 8, T, pc('k'));
  p.fillRect(5, 0, 6, T, wood[2]);
  for (let y = 0; y < T; y += 3) {
    p.fillRect(5, y, 6, 1, wood[4]);
    p.fillRect(5, y + 2, 6, 1, wood[1]);
  }
  p.fillRect(5, 0, 1, T, wood[3]);
  p.fillRect(10, 0, 1, T, wood[1]);
  for (const x of [6, 9]) {
    p.fillRect(x, 0, 1, T, pc('2'));
  }
  p.fillRect(5, 6, 6, 1, pc('4'));
  p.fillRect(5, 11, 6, 1, pc('4'));
  if (state === 'locked') {
    p.fillRect(7, 7, 3, 3, pc('y'));
    p.set(8, 8, pc('K'));
  } else p.set(9, 8, pc('y'));
  return p;
}

// ───────────────────────── fonte, altar, fungo, escombros ─────────────────────────

const FOUNTAIN = `
................
................
....kkkkkkkk....
...k44444444k...
..k4uUUUUUUU4k..
..k4UiiIiiiU4k..
.k4uUiIIvIiUU4k.
.k4UiIvWvIiiu4k.
.k4uUiIvIiiUu4k.
.k4UUiiIiiUUu3k.
..k3uUUUUUUu3k..
..k33uuuuuu33k..
...kk333333kk...
....kk2222kk....
................
................
`;

const FOUNTAIN_DRY = `
................
................
....kkkkkkkk....
...k44444444k...
..k4232323232k..
..k4323232321k..
.k4323wW32w231k.
.k4232W3232321k.
.k4323232w3231k.
.k4232323232 1k.
..k3232323231k..
..k33211112 33k.
...kk333333kk...
....kk2222kk....
................
................
`;

const ALTAR = `
................
................
................
...kkkkkkkkkk...
..k5555555555k..
..k4RRRRRRRR4k..
..k4RqqqqqqR4k..
.kk4RqQQQQqR4kk.
.k44RqqqqqqR344k
.k43RRRRRRRR333k
.k43333333333 3k
.k33222222223 3k
..kk11111111kk..
...kkkkkkkkkk...
................
................
`;

const FUNGUS = `
................
................
.....kkkkkk.....
....kGGllllGk...
...kGllLLLLllGk.
..kGlLLvLLLLllGk
..kGlLLLLLvLLlGk
..kGllLLLLLLllGk
..kgGGllllllGGgk
...kkgGGGGGGgkk.
.....kkWWWWkk...
......kWvvWk....
......kWvWWk....
.....kkWWWWkk...
....kGGkkkkGGk..
................
`;

const RUBBLE = `
................
................
................
................
......kkk.......
.....k545k......
....k54443k.....
..kkk44333kkk...
.k454k3322k343k.
k54443kkkkk3223k
k43332k444k22 1k
.kk22kk4333k11k.
...kkk3322 kkk..
.....kkkkkk.....
................
................
`;

// ───────────────────────── armadilhas ─────────────────────────

/** Alçapão: escotilha de tábuas com argola de ferro. */
const TRAPDOOR = `
................
................
..kkkkkkkkkkkk..
..kbbbbbbbbbbk..
..kb2dddddd2bk..
..kbccccccccbk..
..kbaaaaaaaabk..
..kbddddddddbk..
..kbccc44cccbk..
..kbcc4kk4ccbk..
..kbaa4kk4aabk..
..kbddc44cddbk..
..kbccccccccbk..
..kbbbbbbbbbbk..
..kkkkkkkkkkkk..
................
`;

/** Sino sobre uma placa de pressão. */
const ALARM_TRAP = `
................
................
......kkkk......
.....kYyyyk.....
....kYyyyyok....
....kYyyyyok....
...kYyyyyyyok...
...kYyyyyyyok...
..kYyyyyyyyyok..
..kYyyyyyyyyok..
.kYyyyyyyyyyyok.
.kkkkkkkkkkkkkk.
.......kk.......
...kkkkkkkkkk...
...k33333333k...
................
`;

function trap(kind: string): Pixmap {
  const p = blank();
  switch (kind) {
    case 'dart': {
      p.fillRect(2, 3, 12, 11, hex('#00000000'));
      for (const [x, y] of [[3, 4], [10, 4], [3, 9], [10, 9]] as const) {
        p.fillRect(x, y, 3, 3, pc('k'));
        p.set(x + 1, y + 1, pc('K'));
        p.set(x + 1, y, pc('5'));
        p.set(x + 1, y - 1, pc('6'));
      }
      p.fillRect(6, 6, 4, 4, pc('2'));
      p.fillRect(7, 7, 2, 2, pc('4'));
      return p;
    }
    case 'pit': {
      for (let y = 3; y < 14; y++) for (let x = 2; x < 14; x++) {
        const d = ((x - 7.5) / 6) ** 2 + ((y - 8.5) / 5) ** 2;
        if (d < 1) p.set(x, y, d < 0.55 ? pc('K') : d < 0.8 ? pc('0') : pc('1'));
        if (d >= 1 && d < 1.25) p.set(x, y, pc('2'));
      }
      for (let x = 4; x < 12; x += 2) p.set(x, 13, pc('5'));
      return p;
    }
    case 'alarm': return g('trap_alarm', ALARM_TRAP);
    case 'sleep': {
      p.fillRect(3, 6, 10, 8, pc('k'));
      p.fillRect(4, 7, 8, 6, pc('2'));
      for (let x = 5; x < 12; x += 2) p.fillRect(x, 7, 1, 6, pc('K'));
      p.set(5, 4, hex('#9ff0a0b0'));
      p.set(6, 3, hex('#9ff0a0c0'));
      p.set(9, 4, hex('#9ff0a0a0'));
      p.set(10, 2, hex('#9ff0a090'));
      p.set(7, 5, hex('#c8ffd0a0'));
      return p;
    }
    case 'teleport': {
      for (let y = 1; y < 15; y++) for (let x = 1; x < 15; x++) {
        const d = Math.hypot(x - 7.5, y - 8.2);
        if (d > 5.0 && d < 6.4) p.set(x, y, pc('m'));
        else if (d > 3.2 && d < 3.9) p.set(x, y, pc('P'));
        else if (d < 2.0) p.set(x, y, hex('#e0bcfc90'));
      }
      for (const [x, y] of [[7, 1], [8, 14], [1, 8], [14, 8]] as const) p.set(x, y, pc('M'));
      return p;
    }
    case 'trapdoor': return g('trap_trapdoor', TRAPDOOR);
    case 'fire': default: {
      for (let y = 1; y < 15; y++) for (let x = 1; x < 15; x++) {
        const d = Math.hypot(x - 7.5, y - 8.2);
        if (d > 5.0 && d < 6.4) p.set(x, y, pc('o'));
        else if (d > 3.3 && d < 4.0) p.set(x, y, pc('O'));
      }
      p.fillRect(7, 5, 2, 6, pc('y'));
      p.fillRect(6, 7, 4, 3, pc('O'));
      p.set(7, 4, pc('Y'));
      p.set(8, 7, pc('Y'));
      return p;
    }
  }
}

// ───────────────────────── decoração de parede (sobre a face) ─────────────────────────

/** Tocha com 3 quadros de chama. */
function torchFrames(): Pixmap[] {
  const stick = (p: Pixmap) => {
    p.fillRect(7, 8, 2, 6, pc('c'));
    p.set(7, 8, pc('e'));
    p.fillRect(6, 7, 4, 1, pc('2'));
    p.fillRect(5, 6, 1, 2, pc('3'));
    p.fillRect(10, 6, 1, 2, pc('3'));
    p.fillRect(6, 13, 4, 1, pc('2'));
  };
  const flames: string[][] = [
    ['..........', '....y.....', '...yOy....', '..yOYOy...', '..oOYYOo..', '...oOOo...'],
    ['..........', '...y......', '..yOy.y...', '..oOYOyo..', '..oOYYOo..', '...oOOo...'],
    ['..........', '.....y....', '...yOyy...', '..yOYOo...', '..oOYYOo..', '...oOOo...'],
  ];
  return flames.map((rows) => {
    const p = blank();
    stick(p);
    rows.forEach((row, j) => [...row].forEach((ch, i) => {
      if (ch !== '.') p.set(3 + i, 1 + j, pc(ch));
    }));
    return p.outline(0.6);
  });
}

const CHAINS = `
................
...3.......3....
...4.......4....
...3.......3....
...4.......4....
...3.......3....
...4.......4....
...3.......3....
..k3k.....k3k...
..3kk3...3kk3...
..3...3..3...3..
..3k.k3..3k.k3..
...333.....333..
................
................
................
`;

const SKELETON = `
................
................
..w..WWWWW..w...
..Wv.WvvvW.vW...
..Wv.WkvkW.vW...
..wW..vvv..Ww...
...wW.WWW.Wv....
...3W..W..W3....
....3.WwW.3.....
....4.WwW.4.....
.....3WwW3......
......wWw.......
.....w.w.w......
.....W...W......
....wW...Ww.....
................
`;

const ARCH_GATE = `
................
................
....kkkkkkkk....
...k44444444k...
..k4KKKKKKKK4k..
..k4K3K3K3K3K4k.
..k4K3K3K3K3K4k.
..k4K3K3K3K3K4k.
..k4K3K3K3K3K4k.
..k4K3K3K3K3K4k.
..k4K3K3K3K3K4k.
..k4KgK3K3KgK4k.
..k4GlGgKGgGl4k.
..kk4444444444kk
................
................
`;

const BANNER = `
................
....kkkkkkkk....
....k666666k....
....kqqqqqqk....
....kqRRRRqk....
....kqRyyRqk....
....kqRyyRqk....
....kqRRRRqk....
....kqqqqqqk....
....kRqqqqRk....
....kRqqqqRk....
.....kRqqRk.....
......kRRk......
.......kk.......
................
................
`;

const WINDOW_SLIT = `
................
................
................
......kkkk......
.....k1111k.....
.....k1KK1k.....
.....k1KK1k.....
.....k1KK1k.....
.....k1KK1k.....
.....k1KK1k.....
.....k1KK1k.....
.....k1111k.....
......kkkk......
................
................
................
`;

const BLOOD_WALL = `
................
................
................
....q...........
...qRq...q......
...RRq..qRq.....
...rRq..RRq.....
....Rq..rRq.....
....rR...rR.....
.....R....r.....
.....r..........
................
................
................
................
................
`;

const SLIME_WALL = `
................
................
.....l..........
....lLl.....l...
....lLl....lLl..
.....Ll....lLl..
.....lL.....Ll..
......L.....lL..
......l......L..
.............l..
................
................
................
................
................
................
`;

function web(corner: 'tl' | 'tr'): Pixmap {
  const p = blank();
  const col = hex('#dcd2b4a8');
  const dim = hex('#a89e8468');
  for (let i = 0; i < 8; i++) {
    p.set(i, 0, col);
    p.set(0, i, col);
  }
  for (let i = 1; i < 6; i++) p.set(i, i, col);
  for (let i = 0; i < 4; i++) p.set(i + 1, 1 + (i >> 1), dim);
  p.set(3, 3, dim);
  p.set(2, 4, dim);
  p.set(4, 2, dim);
  p.set(5, 1, dim);
  p.set(1, 5, dim);
  p.set(2, 2, col);
  return corner === 'tl' ? p : p.flipX();
}

// ───────────────────────── decoração de chão ─────────────────────────

const BONES = `
................
................
................
................
................
................
....W.....w.....
...WwW...wWw....
....wW..WW......
.....wWWw.......
...w..WW..Ww....
..wWW....wWW....
...ww.........w.
................
................
................
`;

const SKULL = `
................
................
................
................
................
................
................
......kkkk......
.....kWvvWk.....
.....kvkvkW.....
.....kWvvWk.....
......kWWk......
.....kwkkwk.....
......kkkk......
................
................
`;

const PEBBLES = `
................
................
................
................
................
...........kk...
..kk......k43k..
.k43k.....kkkk..
.kkkk...........
........kk......
.......k43k.....
.......kkkk.....
..kk............
.k32k...........
..kk............
................
`;

function puddle(color: 'water' | 'blood' | 'slime'): Pixmap {
  const p = blank();
  const base = color === 'water' ? hex('#3a68b4a0') : color === 'blood' ? hex('#8a1c28b8') : hex('#56ae4cb0');
  const hi = color === 'water' ? hex('#b4deffb0') : color === 'blood' ? hex('#d84a3eb8') : hex('#98dc70b8');
  const cx = 7.5, cy = 9, rx = 5.5, ry = 3.4;
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + (hash01(x, y, 7) - 0.5) * 0.35;
    if (d < 1) p.set(x, y, base);
  }
  p.set(5, 8, hi);
  p.set(6, 8, hi);
  p.set(9, 10, hi);
  return p;
}

function mossPatch(color: string): Pixmap {
  const p = blank();
  const base = hex(color);
  for (let y = 2; y < 15; y++) for (let x = 1; x < 15; x++) {
    const d = ((x - 7.5) / 6) ** 2 + ((y - 9) / 4.2) ** 2 + (hash01(x, y, 3) - 0.5) * 0.9;
    if (d < 0.8) p.set(x, y, hash01(x, y, 9) > 0.55 ? mix(base, [255, 255, 200, 255], 0.2) : darken(base, 0.15));
  }
  return p;
}

/** Todas as props de um tema, por nome (cada entrada = quadros de animação). */
export function makeProps(style: TerrainStyle): Record<string, Pixmap[]> {
  const out: Record<string, Pixmap[]> = {};
  out.stairs_down = [stairs(style, true)];
  out.stairs_up = [stairs(style, false)];
  for (const s of ['closed', 'open', 'locked'] as const) {
    out[`door_h_${s}`] = [doorH(s, style)];
    out[`door_v_${s}`] = [doorV(s, style)];
  }
  out.fountain = [g('fountain', FOUNTAIN).outline(0.6)];
  out.fountain_dry = [g('fountain_dry', FOUNTAIN_DRY).outline(0.6)];
  out.altar = [g('altar', ALTAR)];
  out.fungus = [g('fungus', FUNGUS)];
  out.rubble = [g('rubble', RUBBLE)];
  for (const k of ['dart', 'pit', 'alarm', 'sleep', 'teleport', 'trapdoor', 'fire']) out[`trap_${k}`] = [trap(k)];
  out.torch = torchFrames();
  out.chains = [g('chains', CHAINS)];
  out.skeleton = [g('skeleton', SKELETON)];
  out.arch_gate = [g('arch_gate', ARCH_GATE)];
  out.banner = [g('banner', BANNER)];
  out.window_slit = [g('window_slit', WINDOW_SLIT)];
  out.blood_wall = [g('blood_wall', BLOOD_WALL)];
  out.slime_wall = [g('slime_wall', SLIME_WALL)];
  out.web_tl = [web('tl')];
  out.web_tr = [web('tr')];
  out.bones = [g('bones', BONES)];
  out.skull = [g('skull', SKULL)];
  out.pebbles = [g('pebbles', PEBBLES)];
  out.puddle_water = [puddle('water')];
  out.puddle_blood = [puddle('blood')];
  out.puddle_slime = [puddle('slime')];
  out.moss = [mossPatch(style.moss)];
  Object.assign(out, makeDecor(style));
  return out;
}

// ───────────────────────── líquidos animados (tile inteiro) ─────────────────────────

export function makeWater(frames = 4): Pixmap[] {
  const deep = pc('u'), mid = pc('U'), lite = pc('i'), foam = pc('I');
  const out: Pixmap[] = [];
  for (let f = 0; f < frames; f++) {
    const p = new Pixmap(T, T);
    const ph = (f / frames) * Math.PI * 2;
    for (let y = 0; y < T; y++) {
      for (let x = 0; x < T; x++) {
        const v = Math.sin((x / T) * Math.PI * 2 * 2 + ph) * 0.5 + Math.sin((y / T) * Math.PI * 2 * 3 - ph + x * 0.35) * 0.5;
        let col = mix(deep, mid, 0.5 + v * 0.35);
        if (v > 0.72) col = lite;
        if (v > 0.93 && (x + y + f) % 2 === 0) col = foam;
        p.set(x, y, col);
      }
    }
    out.push(p);
  }
  return out;
}

/**
 * Lava: placas de crosta escura que derivam devagar, separadas por canais incandescentes
 * (laranja na borda, amarelo no meio). Emenda perfeita com os vizinhos (distâncias com volta).
 */
export function makeLava(frames = 4): Pixmap[] {
  const crust = darken(pc('r'), 0.25), crustHi = pc('R'), hot = pc('o'), bright = pc('O'), glow = pc('y'), core = pc('Y');
  const sites: [number, number][] = [];
  for (let gy = 0; gy < 2; gy++) for (let gx = 0; gx < 2; gx++) {
    sites.push([gx * 8 + 1 + hash01(gx, gy, 71) * 5, gy * 8 + 1 + hash01(gx + 5, gy, 72) * 5]);
  }
  sites.push([hash01(9, 9, 73) * 16, hash01(9, 9, 74) * 16]);
  const out: Pixmap[] = [];
  for (let f = 0; f < frames; f++) {
    const p = new Pixmap(T, T);
    const ph = (f / frames) * Math.PI * 2;
    // as placas derivam num pequeno círculo (o quadro final emenda com o primeiro)
    const ox = Math.cos(ph) * 0.7, oy = Math.sin(ph) * 0.5;
    for (let y = 0; y < T; y++) {
      for (let x = 0; x < T; x++) {
        let d1 = 99, d2 = 99, id = 0;
        sites.forEach(([sx, sy], i) => {
          const dx0 = Math.abs(x - (sx + ox * (i % 2 ? 1 : -1)) + T * 4) % T;
          const dy0 = Math.abs(y - (sy + oy) + T * 4) % T;
          const d = Math.hypot(Math.min(dx0, T - dx0), Math.min(dy0, T - dy0));
          if (d < d1) { d2 = d1; d1 = d; id = i; } else if (d < d2) d2 = d;
        });
        const gap = d2 - d1;
        let col: RGBA;
        if (gap < 0.5) col = (x + y + f) % 3 ? glow : core;
        else if (gap < 1.15) col = bright;
        else if (gap < 1.8) col = hot;
        else {
          // crosta: escura no miolo, com um brilho fraco que pulsa por placa
          const pulse = 0.5 + 0.5 * Math.sin(ph + id * 1.7);
          col = mix(crust, crustHi, Math.min(1, (gap < 2.8 ? 0.55 : 0.12) + pulse * 0.12));
          if (hash01(x, y, id + 9) < 0.08) col = mix(col, hot, 0.5);
        }
        p.set(x, y, col);
      }
    }
    out.push(p);
  }
  return out;
}
