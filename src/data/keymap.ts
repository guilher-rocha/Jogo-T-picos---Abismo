/** Comandos que o jogador pode emitir. A UI traduz teclas → comandos; o jogo traduz comandos → ações. */
export type CommandName =
  | 'move'
  | 'run'
  | 'wait'
  | 'messages'
  | 'help'
  | 'throw'
  | 'look'
  | 'descend'
  | 'ascend'
  | 'character'
  | 'cast'
  | 'abilities'
  | 'inventory'
  | 'equipment'
  | 'pickup'
  | 'drop'
  | 'wield'
  | 'wear'
  | 'takeoff'
  | 'puton'
  | 'quaff'
  | 'eat'
  | 'read'
  | 'zap'
  | 'fire'
  | 'quiver'
  | 'invoke'
  | 'search'
  | 'rest'
  | 'save';

export interface Command {
  name: CommandName;
  dx?: number;
  dy?: number;
}

export interface KeyInput {
  key: string;
  code: string;
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
}

const VI_DIRS: Record<string, [number, number]> = {
  h: [-1, 0], j: [0, 1], k: [0, -1], l: [1, 0],
  y: [-1, -1], u: [1, -1], b: [-1, 1], n: [1, 1],
};

const NUMPAD_DIRS: Record<string, [number, number]> = {
  Numpad4: [-1, 0], Numpad2: [0, 1], Numpad8: [0, -1], Numpad6: [1, 0],
  Numpad7: [-1, -1], Numpad9: [1, -1], Numpad1: [-1, 1], Numpad3: [1, 1],
};

const NAV_DIRS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1], ArrowRight: [1, 0],
  Home: [-1, -1], PageUp: [1, -1], End: [-1, 1], PageDown: [1, 1],
};

/** Direção (dx, dy) representada por uma tecla, ou null. Usado também em prompts "qual direção?". */
export function directionForKey(k: KeyInput): [number, number] | null {
  if (NUMPAD_DIRS[k.code]) return NUMPAD_DIRS[k.code];
  if (NAV_DIRS[k.key]) return NAV_DIRS[k.key];
  const lower = k.key.length === 1 ? k.key.toLowerCase() : '';
  if (VI_DIRS[lower]) return VI_DIRS[lower];
  return null;
}

/** Teclas de um caractere que viram comandos sem direção. */
const SIMPLE_KEYS: Record<string, CommandName> = {
  M: 'messages',
  '?': 'help',
  t: 'throw',
  x: 'look',
  ';': 'look',
  C: 'character',
  i: 'inventory',
  e: 'equipment',
  g: 'pickup',
  ',': 'pickup',
  d: 'drop',
  w: 'wield',
  W: 'wear',
  T: 'takeoff',
  P: 'puton',
  q: 'quaff',
  E: 'eat',
  r: 'read',
  z: 'zap',
  f: 'fire',
  Q: 'quiver',
  '&': 'invoke',
  s: 'search',
  R: 'rest',
  S: 'save',
  m: 'cast',
  Z: 'cast',
  A: 'abilities',
  '>': 'descend',
  '<': 'ascend',
};

/** Tabela de ajuda (mostrada com "?"). */
export const KEY_HELP: [string, string][] = [
  ['h j k l y u b n', 'mover / atacar (vi-keys)'],
  ['setas, Home/PgUp/End/PgDn', 'mover / atacar'],
  ['numpad 1-9', 'mover / atacar'],
  ['Shift + direção', 'correr'],
  ['. ou numpad 5', 'esperar um turno'],
  ['s', 'procurar portas secretas'],
  ['R', 'descansar até recuperar (ou algo aparecer)'],
  ['> / <', 'descer / subir escada'],
  ['i / e', 'inventário / equipamento'],
  ['g ou ,', 'pegar item'],
  ['d', 'largar item'],
  ['w / W', 'empunhar arma / vestir armadura'],
  ['T / P', 'tirar / colocar anel ou amuleto'],
  ['q / E', 'beber poção / comer'],
  ['r / z', 'ler pergaminho / usar varinha'],
  ['t', 'arremessar item'],
  ['f / Q', 'disparar arma de disparo / escolher munição'],
  ['&', 'invocar o Coração do Abismo (vitória)'],
  ['x ou ;', 'olhar (inspecionar o mapa)'],
  ['m ou Z', 'conjurar magia'],
  ['A', 'habilidades de classe'],
  ['C', 'ficha do personagem (e pontos de atributo)'],
  ['M ou Ctrl+P', 'histórico de mensagens'],
  ['S', 'salvar e voltar ao título'],
  ['?', 'esta ajuda'],
];

/** Traduz uma tecla do jogo principal num comando. Fonte única da verdade do mapa de teclas. */
export function commandForKey(k: KeyInput): Command | null {
  if (k.ctrl && (k.key === 'p' || k.key === 'P')) return { name: 'messages' };
  if (k.ctrl || k.alt) return null;
  const simple = SIMPLE_KEYS[k.key];
  if (simple) return { name: simple };
  if (k.code === 'Numpad5' || k.key === '.' || k.key === 'Clear') return { name: 'wait' };
  const viLower = k.key.length === 1 ? k.key.toLowerCase() : '';
  const isVi = VI_DIRS[viLower] !== undefined;
  const dir = directionForKey(k);
  if (dir) {
    // Correr: Shift + direção (vi-keys maiúsculas, setas ou numpad com Shift)
    const running = k.shift || (isVi && k.key !== viLower);
    return { name: running ? 'run' : 'move', dx: dir[0], dy: dir[1] };
  }
  return null;
}
