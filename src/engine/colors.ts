// Paleta de 16 cores estilo terminal (CGA/ANSI) + algumas extras.
// O núcleo do jogo usa apenas os NOMES das cores; o tema visual decide o valor real.
export const COLOR_NAMES = [
  'black', 'red', 'green', 'brown', 'blue', 'magenta', 'cyan', 'lightGray',
  'darkGray', 'lightRed', 'lightGreen', 'yellow', 'lightBlue', 'lightMagenta', 'lightCyan', 'white',
  'orange', 'darkRed', 'darkBlue', 'darkGreen', 'gold', 'memory',
] as const;

export type Color = (typeof COLOR_NAMES)[number];

export type Palette = Record<Color, string>;

export const CLASSIC_PALETTE: Palette = {
  black: '#000000',
  red: '#aa0000',
  green: '#00aa00',
  brown: '#aa5500',
  blue: '#0000aa',
  magenta: '#aa00aa',
  cyan: '#00aaaa',
  lightGray: '#aaaaaa',
  darkGray: '#555555',
  lightRed: '#ff5555',
  lightGreen: '#55ff55',
  yellow: '#ffff55',
  lightBlue: '#5555ff',
  lightMagenta: '#ff55ff',
  lightCyan: '#55ffff',
  white: '#ffffff',
  orange: '#ff8c1a',
  darkRed: '#4a0000',
  darkBlue: '#0a0a3a',
  darkGreen: '#003300',
  gold: '#ffd700',
  memory: '#3a3a5a',
};
