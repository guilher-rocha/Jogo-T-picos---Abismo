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
  | 'ascend';

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
  ['> / <', 'descer / subir escada'],
  ['t', 'arremessar (dardo)'],
  ['x ou ;', 'olhar (inspecionar o mapa)'],
  ['M ou Ctrl+P', 'histórico de mensagens'],
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
