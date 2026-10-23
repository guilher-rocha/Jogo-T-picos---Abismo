import type { Screen } from '../engine/screens';
import type { Terminal } from '../engine/terminal';
import type { KeyInput } from '../data/keymap';
import type { Game } from '../core/game';
import { createGame } from '../core/world';
import { playerAction } from '../core/turn';
import { botAction } from '../ai/bot';
import { AnimationQueue } from '../engine/animations';
import { RNG } from '../engine/rng';
import { CLASSES } from '../data/classes';
import { RACES } from '../data/races';
import { randomName } from '../gen/names';
import type { App } from './app';
import { drawMap } from './mapView';
import { drawMessages, drawSidebar } from './hud';
import { playEvents, trackEvents } from './effects';
import { SceneState } from './sceneState';
import { FOOT_Y, SCREEN_COLS } from './layout';

const STEP_MS = 90;
const DURATION_MS = 40000;

/** Modo demonstração: o bot joga sozinho; qualquer tecla volta ao título. */
export class AttractScreen implements Screen {
  private game: Game;
  private anims = new AnimationQueue();
  private state = new SceneState();
  private lastTime = 0;
  private acc = 0;
  private elapsed = 0;
  private deadFor = 0;

  constructor(private app: App, demoSeed: number) {
    const rng = new RNG(demoSeed);
    const race = rng.pick(RACES).id;
    this.game = createGame(demoSeed, { name: randomName(rng, race), raceId: race, classId: rng.pick(CLASSES).id });
    this.anims.speed = 2;
  }

  update(dt: number): void {
    this.elapsed += dt;
    this.anims.update(dt);
    if (this.game.over) {
      this.deadFor += dt;
      if (this.deadFor > 2500) this.app.showHighScores(true);
      return;
    }
    if (this.elapsed > DURATION_MS) {
      this.app.showHighScores(true);
      return;
    }
    if (this.anims.busy) return;
    this.acc += dt;
    while (this.acc >= STEP_MS && !this.game.over) {
      this.acc -= STEP_MS;
      if (!playerAction(this.game, botAction(this.game))) playerAction(this.game, { type: 'wait' });
      trackEvents(this.game, this.state, this.game.events);
      playEvents(this.anims, this.game.events);
    }
  }

  onKey(_k: KeyInput): void {
    this.app.showTitle();
  }

  render(term: Terminal, time: number): void {
    const dt = this.lastTime ? Math.min(100, Math.max(0, time - this.lastTime)) : 0;
    this.lastTime = time;
    this.state.speed = 2;
    this.state.update(this.game, dt, term.view.tilesW, term.view.tilesH);
    drawMap(term, this.game, this.state, time);
    this.anims.draw(term);
    drawMessages(term, this.game);
    drawSidebar(term, this.game, time);
    const blink = Math.floor(time / 500) % 2 === 0;
    term.fill(0, FOOT_Y, SCREEN_COLS, 2);
    term.printCenter(FOOT_Y, '══  DEMONSTRAÇÃO  ══', blink ? 'yellow' : 'orange');
    term.printCenter(FOOT_Y + 1, 'Pressione qualquer tecla para jogar', 'lightGray');
  }
}
