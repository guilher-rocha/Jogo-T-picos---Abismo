import { Terminal } from './engine/terminal';
import { CanvasRenderer } from './engine/renderer';
import { Atlas } from './engine/atlas';
import { FxLabScreen } from './ui/fxLab';
import { allEntries } from './gfx/library';
import { MAP_X, MAP_Y } from './ui/layout';
import { ScreenManager } from './engine/screens';
import type { KeyInput } from './data/keymap';
import { SCREEN_COLS, SCREEN_ROWS } from './ui/layout';
import { GameScreen } from './ui/gameScreen';
import type { App } from './ui/app';
import { createGame, DEFAULT_HERO } from './core/world';
import type { HeroSpec } from './core/world';
import type { Game } from './core/game';
import { freshSeed } from './engine/rng';
import { CreationScreen } from './ui/creationScreen';
import { insertHighScore } from './core/score';
import { TitleScreen } from './ui/titleScreen';
import { HighScoresScreen } from './ui/highScoresScreen';
import { AttractScreen } from './ui/attractScreen';
import { GameOverScreen } from './ui/gameOverScreen';
import { morgueLines } from './core/morgue';
import { deleteSave, hasSave, loadGame, loadHighScores, loadSettings, saveGame, saveHighScores, saveSettings } from './persist/save';
import { DEFAULT_SETTINGS, OptionsScreen } from './ui/optionsScreen';
import { LobbyScreen } from './ui/lobbyScreen';
import { activeNet, startNet } from './net/client';
import { serverUrl } from './net/protocol';
import { themeById } from './engine/themes';
import { dailyChallenge, todayString } from './core/challenge';
import { CodeEntryScreen } from './ui/codeEntryScreen';
import { sound } from './engine/sound';
import { message } from './core/game';

const canvas = document.getElementById('screen') as HTMLCanvasElement;
const term = new Terminal(SCREEN_COLS, SCREEN_ROWS);
const renderer = new CanvasRenderer(canvas, term);
// Todos os sprites são desenhados em código (pixel art procedural) e empacotados num atlas na largada.
renderer.setAtlas(new Atlas(allEntries()));
renderer.setSceneRect({ cx: MAP_X, cy: MAP_Y, cw: 80, ch: 24 });
const screens = new ScreenManager();
window.addEventListener('resize', () => renderer.resize());

const params = new URLSearchParams(location.search);
const debug = params.get('debug') === '1';
const seedParam = params.get('seed');
const fixedSeed = seedParam !== null && seedParam !== '' ? Number(seedParam) >>> 0 : undefined;
const quick = params.get('quick') === '1';
const classParam = params.get('class');
const raceParam = params.get('race');

function startGame(spec: HeroSpec, seed = fixedSeed ?? freshSeed(), extras: { daily?: string; target?: number } = {}): void {
  const game = createGame(seed, spec);
  if (extras.daily) game.daily = extras.daily;
  if (extras.target !== undefined) {
    game.challenge = { target: extras.target };
    message(game, `Desafio aceito: faça mais de ${extras.target} pontos!`, 'gold');
  }
  screens.replace(new GameScreen(app, game));
}

/** Baixa um arquivo de texto (morgue). */
function download(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

let attractCount = 0;

const app: App = {
  screens,
  debug,
  showTitle: () => screens.replace(new TitleScreen(app)),
  restart: () => app.showTitle(),
  newGame: () => screens.replace(new CreationScreen(app, (spec) => startGame(spec))),
  hasSave: () => hasSave(),
  continueGame: () => {
    const { game, error } = loadGame();
    if (!game) {
      if (error) console.warn('Save descartado:', error);
      app.showTitle();
      return;
    }
    message(game, `Bem-vindo de volta, ${game.hero.name}.`, 'yellow');
    screens.replace(new GameScreen(app, game));
  },
  dailyChallenge: () => {
    const date = todayString();
    const d = dailyChallenge(date);
    screens.replace(new CreationScreen(app, (spec) => startGame(spec, d.seed, { daily: date }), { raceId: d.raceId, classId: d.classId, title: `Desafio diário — ${date}` }));
  },
  acceptChallenge: () => {
    screens.replace(new CodeEntryScreen(app, (c) => {
      screens.replace(new CreationScreen(app, (spec) => startGame(spec, c.seed, { target: c.score }), { raceId: c.raceId, classId: c.classId, title: 'Desafio de um amigo' }));
    }));
  },
  multiplayer: () => {
    screens.replace(new CreationScreen(app, (spec) => {
      const lan = (window as unknown as { __ABISMO_LAN__?: boolean }).__ABISMO_LAN__ === true;
      screens.replace(new LobbyScreen(app, startNet(serverUrl(location, lan), spec)));
    }, undefined));
  },
  backToLobby: () => {
    const net = activeNet();
    if (!net) return false;
    screens.replace(new LobbyScreen(app, net));
    return true;
  },
  showOptions: () => screens.push(new OptionsScreen(app, () => screens.pop())),
  settings: loadSettings(DEFAULT_SETTINGS),
  applySettings: (save: boolean) => {
    renderer.setTheme(themeById(app.settings.theme));
    renderer.setZoom(app.settings.zoom);
    sound.sfxVolume = app.settings.sfx / 10;
    sound.musicOn = app.settings.music && app.settings.musicVol > 0;
    sound.musicVolume = app.settings.musicVol / 10;
    sound.applyVolumes();
    if (save) saveSettings(app.settings);
  },
  showHighScores: (cycle, highlight) => screens.replace(new HighScoresScreen(app, { cycle, highlight })),
  startAttract: () => screens.replace(new AttractScreen(app, 777 + attractCount++ * 101)),
  gameOver: (game: Game, rank: number) => {
    deleteSave();
    screens.replace(new GameOverScreen(app, game, rank));
  },
  exportMorgue: (game: Game) => download(`abismo-${game.hero.name}-${game.seed}.txt`, morgueLines(game).join('\n')),
  highScores: loadHighScores(),
  features: { daily: true, options: true },
  recordScore: (entry) => {
    const rank = insertHighScore(app.highScores, entry);
    saveHighScores(app.highScores);
    return rank;
  },
};

// Fechar a aba no meio de uma partida salva o progresso.
window.addEventListener('beforeunload', () => {
  const top = screens.top;
  if (top instanceof GameScreen && !top.game.over) saveGame(top.game);
});

app.applySettings(false);

// ?quick=1 pula título e criação (útil para testes); ?class=mage&race=elf escolhe a combinação.
// ?fxlab=1&page=0&t=0.4 abre o laboratório de efeitos (ferramenta de revisão das animações).
if (params.get('fxlab') === '1') {
  const t = params.get('t');
  screens.replace(new FxLabScreen(app, Number(params.get('page') ?? 0), t !== null ? Number(t) : null));
} else if (params.get('lan') === '1') {
  // ?lan=1 abre o multijogador; com &quick=1&name=Ana&class=mage entra direto na sala (testes).
  if (quick) {
    const lan = (window as unknown as { __ABISMO_LAN__?: boolean }).__ABISMO_LAN__ === true;
    const spec = { ...DEFAULT_HERO, name: params.get('name') ?? DEFAULT_HERO.name, classId: classParam ?? DEFAULT_HERO.classId, raceId: raceParam ?? DEFAULT_HERO.raceId };
    screens.replace(new LobbyScreen(app, startNet(serverUrl(location, lan), spec)));
  } else app.multiplayer();
} else if (quick) startGame({ ...DEFAULT_HERO, classId: classParam ?? DEFAULT_HERO.classId, raceId: raceParam ?? DEFAULT_HERO.raceId });
else app.showTitle();

/** Teclas que o navegador usaria para outra coisa (rolar a página, etc.). */
const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown', ' ', 'Tab', 'Backspace', '/', "'"]);

window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && ['r', 'R', 'F5'].includes(e.key)) return; // deixa recarregar
  if (PREVENT.has(e.key) || e.key.length === 1 || (debug && /^F\d+$/.test(e.key))) e.preventDefault();
  if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
  sound.unlock();
  const k: KeyInput = { key: e.key, code: e.code, shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey, repeat: e.repeat };
  screens.onKey(k);
});
// Clique também conta como "interagir" (tela de título, demonstração).
window.addEventListener('mousedown', () => sound.unlock());
window.addEventListener('mousedown', () => screens.onKey({ key: 'Mouse', code: 'Mouse', shift: false, ctrl: false, alt: false }));

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
