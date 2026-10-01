import { Terminal } from './engine/terminal';
import { CanvasRenderer } from './engine/renderer';
import { ScreenManager } from './engine/screens';
import type { KeyInput } from './data/keymap';
import { SCREEN_COLS, SCREEN_ROWS } from './ui/layout';
import { GameScreen } from './ui/gameScreen';
import type { App } from './ui/app';
import { createGame, DEFAULT_HERO } from './core/world';
import type { HeroSpec } from './core/world';
import { freshSeed } from './engine/rng';
import { CreationScreen } from './ui/creationScreen';
import { insertHighScore } from './core/score';

const canvas = document.getElementById('screen') as HTMLCanvasElement;
const term = new Terminal(SCREEN_COLS, SCREEN_ROWS);
const renderer = new CanvasRenderer(canvas, term);
const screens = new ScreenManager();
window.addEventListener('resize', () => renderer.resize());

const params = new URLSearchParams(location.search);
const debug = params.get('debug') === '1';
const seedParam = params.get('seed');
const fixedSeed = seedParam !== null && seedParam !== '' ? Number(seedParam) >>> 0 : undefined;
const quick = params.get('quick') === '1';
const classParam = params.get('class');
const raceParam = params.get('race');

function startGame(spec: HeroSpec): void {
  screens.replace(new GameScreen(app, createGame(fixedSeed ?? freshSeed(), spec)));
}

const app: App = {
  screens,
  debug,
  restart: () => screens.replace(new CreationScreen(app, startGame)),
  highScores: [],
  recordScore: (entry) => insertHighScore(app.highScores, entry),
};

// ?quick=1 pula a criação (útil para testes); ?class=mage&race=elf escolhe a combinação.
if (quick) startGame({ ...DEFAULT_HERO, classId: classParam ?? DEFAULT_HERO.classId, raceId: raceParam ?? DEFAULT_HERO.raceId });
else app.restart();

/** Teclas que o navegador usaria para outra coisa (rolar a página, etc.). */
const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown', ' ', 'Tab', 'Backspace', '/', "'"]);

window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && ['r', 'R', 'F5'].includes(e.key)) return; // deixa recarregar
  if (PREVENT.has(e.key) || e.key.length === 1 || (debug && /^F\d+$/.test(e.key))) e.preventDefault();
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
