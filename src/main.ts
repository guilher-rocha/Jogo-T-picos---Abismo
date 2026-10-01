import { Terminal } from './engine/terminal';
import { CanvasRenderer } from './engine/renderer';
import { COLOR_NAMES } from './engine/colors';
import { RNG } from './engine/rng';

export const COLS = 100;
export const ROWS = 30;

const canvas = document.getElementById('screen') as HTMLCanvasElement;
const term = new Terminal(COLS, ROWS);
const renderer = new CanvasRenderer(canvas, term);
window.addEventListener('resize', () => renderer.resize());

// Tela de teste da subetapa 0.2: paleta, caixas, texto colorido e glifos aleatórios com seed.
const rng = new RNG(12345);
term.box(0, 0, COLS, ROWS, 'darkGray', 'Abismo — teste do renderizador');
COLOR_NAMES.forEach((c, i) => {
  term.print(2, 2 + i, `██ ${c}`, c);
});
term.print(30, 2, 'Texto com {red}cores{/} {yellow}inline{/} e {lightCyan}marcação{/}.');
term.print(30, 4, 'Glifos: @ # . + \' < > ~ ^ { _ ) [ ! ? / = " % $ * &');
const glyphs = '.#@!?$%)[=/"*&~^';
for (let y = 7; y < 27; y++) {
  for (let x = 30; x < 97; x++) {
    term.set(x, y, rng.pick(glyphs.split('')), rng.pick(COLOR_NAMES.slice(1, 16)));
  }
}
term.printCenter(28, `seed 12345 → primeiros dados: ${rng.roll('3d6')}, ${rng.roll('1d20')}, ${rng.roll('2d4+1')}`, 'white');
renderer.render();
