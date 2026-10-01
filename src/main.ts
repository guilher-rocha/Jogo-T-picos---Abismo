import { Terminal } from './engine/terminal';
import { CanvasRenderer } from './engine/renderer';
import { ScreenManager } from './engine/screens';
import type { KeyInput } from './data/keymap';
import { SCREEN_COLS, SCREEN_ROWS } from './ui/layout';
import { GameScreen } from './ui/gameScreen';
import { createTestGame } from './core/game';

const canvas = document.getElementById('screen') as HTMLCanvasElement;
const term = new Terminal(SCREEN_COLS, SCREEN_ROWS);
const renderer = new CanvasRenderer(canvas, term);
const screens = new ScreenManager();
window.addEventListener('resize', () => renderer.resize());

screens.replace(new GameScreen(createTestGame()));

/** Teclas que o navegador usaria para outra coisa (rolar a página, etc.). */
const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown', ' ', 'Tab', 'Backspace', '/', "'"]);

window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && ['r', 'R', 'F5'].includes(e.key)) return; // deixa recarregar
  if (PREVENT.has(e.key) || e.key.length === 1) e.preventDefault();
  if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
  const k: KeyInput = { key: e.key, code: e.code, shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey };
  screens.onKey(k);
});

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(100, now - last);
  last = now;
  screens.update(dt, now);
  screens.render(term, now);
  renderer.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
