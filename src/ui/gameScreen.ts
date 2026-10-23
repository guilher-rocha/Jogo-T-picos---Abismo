import type { Screen } from '../engine/screens';
import type { Terminal } from '../engine/terminal';
import type { KeyInput } from '../data/keymap';
import { commandForKey, directionForKey, KEY_HELP } from '../data/keymap';
import { spellById } from '../data/spells';
import type { SpellDef } from '../data/spells';
import { spellFailChance } from '../core/spells';
import { ABILITY_RULES, abilityReadyIn, activeAbilities } from '../core/abilities';
import type { MenuEntry } from './menuScreen';
import { DirectionPrompt, MenuScreen } from './menuScreen';
import type { Game } from '../core/game';
import { actorAt, isFree, level, message, seesActor } from '../core/game';
import { DIRS8, getTile, isWalkable } from '../core/map';
import { Tile } from '../data/tiles';
import { itemsAt } from '../core/item';
import type { App } from './app';
import { TextWindow } from './textWindow';
import { TargetScreen } from './targetScreen';
import { CharacterScreen } from './characterScreen';
import { gainXp, xpForLevel } from '../core/hero';
import { raceById } from '../data/races';
import { AnimationQueue } from '../engine/animations';
import { playEvents, playSounds, shake, trackEvents } from './effects';
import { sound } from '../engine/sound';
import type { Action } from '../core/actions';
import type { ItemHost } from './itemMenus';
import { EquipmentScreen, InventoryScreen, discoveriesScreen, fireCommand, pickFromInventory, pickupCommand, readCommand, throwCommand } from './itemMenus';
import { isEquipped, slotOf } from '../core/inventory';
import { itemBase } from '../data/items';
import { createMonster } from '../core/monster';
import { stepToward, threatsVisible } from '../ai/bot';
import { autoExploreStep } from '../ai/explore';
import { aName, capitalize } from '../core/text';
import { showHints } from '../core/hints';
import { damage } from '../core/combat';
import { saveGame } from '../persist/save';
import { monstersForDepth } from '../gen/populate';
import { createGame, enterLevel } from '../core/world';
import { playerAction } from '../core/turn';
import { FOOT_Y, SIDE_X } from './layout';
import { computeScore, highScoreEntry } from '../core/score';
import { drawMap } from './mapView';
import { drawMessages, drawSidebar, messageLine } from './hud';
import { SceneState, viewFocus } from './sceneState';
import type { ZoomMode } from '../engine/renderer';
import type { NetClient, StateMsg } from '../net/client';
import { decodeSnapshot } from '../net/protocol';
import { aliveMembers, memberById, memberTextColor, members } from '../core/party';

const ZOOM_ORDER: ZoomMode[] = ['auto', 'close', 'far'];

/**
 * Perigo para a trilha: 1 com algum monstro visível caçando o jogador (ou um chefe à vista), senão 0.
 * Liga a percussão de tensão da música da região.
 */
function dangerLevel(game: Game): number {
  for (const a of level(game).actors) {
    if (!seesActor(game, a)) continue;
    if (a.flags.includes('boss') || a.ai.state === 'hunting') return 1;
  }
  return 0;
}

export class GameScreen implements Screen, ItemHost {
  private anims = new AnimationQueue();
  /** Posições suavizadas, câmera e fantasmas: só visual, a lógica do jogo continua em tiles inteiros. */
  private state = new SceneState();
  private lastTime = 0;

  /** Multijogador: a partida roda no servidor; aqui só chegam estados e saem ações. */
  constructor(public app: App, public game: Game, private net?: NetClient) {}

  /** Multijogador: heróis que o mundo está esperando agora. */
  private waiting: number[] = [];
  /** Multijogador: digitando uma mensagem para o grupo. */
  private chatting = false;
  private draft = '';

  update(dt: number): void {
    this.anims.speed = this.app.settings.animSpeed;
    this.anims.update(dt);
    // Multijogador: aplica os estados que chegaram do servidor, em ordem.
    if (this.net) for (let msg = this.net.states.shift(); msg; msg = this.net.states.shift()) this.applyNet(msg);
  }

  onEnter(): void {
    viewFocus.point = null;
    sound.setMusicTheme(level(this.game).theme);
    sound.setIntensity(dangerLevel(this.game));
    if (this.app.settings.hints && this.game.turn === 0 && !this.net) showHints(this.game);
  }

  /** Multijogador: troca a partida pelo estado recebido e anima o que aconteceu (sons, golpes, magias). */
  applyNet(msg: StateMsg): void {
    const prevDepth = this.game.depth;
    this.game = decodeSnapshot(msg.snapshot, msg.you);
    this.waiting = msg.waiting;
    const speed = this.app.settings.animSpeed;
    playSounds(msg.events, speed === 0 ? 0 : 1 / speed);
    trackEvents(this.game, this.state, msg.events);
    playEvents(this.anims, msg.events);
    sound.setIntensity(dangerLevel(this.game));
    if (this.game.depth !== prevDepth) sound.setMusicTheme(level(this.game).theme);
    if (this.game.over && !this.recorded) {
      if (this.game.over.won) sound.play('victory');
      this.recorded = true;
      this.overAt = performance.now();
      this.rank = this.app.recordScore(highScoreEntry(this.game));
    }
  }

  private recorded = false;
  /** Itens em que o autoexplorar já parou (não volta para eles). */
  private exploredItems = new Set<number>();
  private lastSave = 0;
  private overAt = 0;
  private rank = -1;

  /** Executa uma ação do jogador e transforma o que aconteceu em animações. */
  act(action: Action): boolean {
    if (this.net) {
      // Multijogador: a ação vai para o servidor; o resultado volta como estado.
      if (this.game.over || memberById(this.game, this.game.player.id)?.dead) return false;
      if (action.type === 'move') this.state.face(this.game.player.id, action.dx);
      this.net.send({ t: 'action', action });
      return true;
    }
    const depth = this.game.depth;
    if (action.type === 'move') this.state.face(this.game.player.id, action.dx);
    const ok = playerAction(this.game, action);
    const speed = this.app.settings.animSpeed;
    playSounds(this.game.events, speed === 0 ? 0 : 1 / speed);
    sound.setIntensity(dangerLevel(this.game));
    if (this.app.settings.hints && ok) showHints(this.game);
    if (this.game.over?.won) sound.play('victory');
    if (this.game.depth !== depth) sound.setMusicTheme(level(this.game).theme);
    // Autosave ao trocar de andar e a cada 100 turnos.
    if (ok && !this.game.over && (this.game.depth !== depth || this.game.turn - this.lastSave >= 100)) {
      saveGame(this.game);
      this.lastSave = this.game.turn;
    }
    trackEvents(this.game, this.state, this.game.events);
    playEvents(this.anims, this.game.events);
    if (this.game.over && !this.recorded) {
      this.recorded = true;
      this.overAt = performance.now();
      this.rank = this.app.recordScore(highScoreEntry(this.game));
    }
    return ok;
  }

  onKey(k: KeyInput): void {
    if (k.repeat) {
      // Tecla segurada: as repetições não pulam animações (dá para ver o que acontece) e param
      // quando há perigo — senão o herói anda/espera dezenas de turnos sem o jogador perceber.
      if (this.anims.busy) return;
      const held = commandForKey(k);
      if (held && (held.name === 'move' || held.name === 'run' || held.name === 'wait') && this.holdBlocked(held.dx ?? 0, held.dy ?? 0, held.name === 'wait')) return;
    } else this.holdWarned = false;
    // Uma tecla durante a animação pula a animação (e o comando segue normalmente).
    if (this.anims.busy) this.anims.skipAll();
    if (this.net && this.chatKey(k)) return;
    if (this.app.debug && !this.net && this.debugKey(k)) return;
    if (this.game.over) {
      // Qualquer tecla (depois de um instante) mostra a tela de fim de partida.
      if (performance.now() - this.overAt > 500) this.app.gameOver(this.game, this.rank);
      return;
    }
    if (k.key === 'v' && !k.ctrl && !k.alt) {
      this.cycleZoom();
      return;
    }
    const cmd = commandForKey(k);
    if (!cmd) return;
    switch (cmd.name) {
      case 'move':
        this.act({ type: 'move', dx: cmd.dx!, dy: cmd.dy! });
        break;
      case 'run':
        // no multijogador o resultado de cada passo vem do servidor: correr vira um passo
        if (this.net) this.act({ type: 'move', dx: cmd.dx!, dy: cmd.dy! });
        else this.run(cmd.dx!, cmd.dy!);
        break;
      case 'wait':
        this.act({ type: 'wait' });
        break;
      case 'throw':
        throwCommand(this);
        break;
      case 'inventory':
        this.app.screens.push(new InventoryScreen(this));
        break;
      case 'equipment':
        this.app.screens.push(new EquipmentScreen(this));
        break;
      case 'pickup':
        pickupCommand(this);
        break;
      case 'drop':
        pickFromInventory(this, 'Largar o quê?', null, (i) => this.act({ type: 'drop', itemId: i.id }));
        break;
      case 'wield':
        pickFromInventory(this, 'Empunhar o quê?', ['weapon', 'launcher'], (i) => this.act({ type: 'equip', itemId: i.id }), (i) => !isEquipped(this.game, i));
        break;
      case 'wear':
        pickFromInventory(this, 'Vestir o quê?', ['armor', 'shield', 'helm', 'gloves', 'boots', 'cloak', 'light'], (i) => this.act({ type: 'equip', itemId: i.id }), (i) => !isEquipped(this.game, i));
        break;
      case 'puton':
        pickFromInventory(this, 'Colocar o quê?', ['ring', 'amulet'], (i) => this.act({ type: 'equip', itemId: i.id }), (i) => !isEquipped(this.game, i));
        break;
      case 'takeoff':
        pickFromInventory(this, 'Tirar o quê?', null, (i) => this.act({ type: 'unequip', slot: slotOf(this.game, i)! }), (i) => isEquipped(this.game, i));
        break;
      case 'quiver':
        pickFromInventory(this, 'Pôr o que na aljava?', ['ammo', 'weapon'], (i) => this.act({ type: 'equip', itemId: i.id }), (i) => itemBase(i.baseId).category === 'ammo' && !isEquipped(this.game, i));
        break;
      case 'quaff': {
        const map = level(this.game).map;
        if (map.tiles[this.game.player.y * map.width + this.game.player.x] === Tile.Fountain) {
          this.act({ type: 'fountain' });
          break;
        }
        pickFromInventory(this, 'Beber o quê?', ['potion'], (i) => this.act({ type: 'quaff', itemId: i.id }));
        break;
      }
      case 'explore':
        if (this.netBlocked()) break;
        this.autoExplore();
        break;
      case 'travel':
        if (this.netBlocked()) break;
        this.travelToStairs();
        break;
      case 'disarm':
        this.app.screens.push(new DirectionPrompt(this.app, 'Desarmar em que direção?', (dx, dy) => this.act({ type: 'disarm', dx, dy }), directionForKey));
        break;
      case 'eat':
        pickFromInventory(this, 'Comer o quê?', ['food', 'corpse'], (i) => this.act({ type: 'eat', itemId: i.id }));
        break;
      case 'read':
        pickFromInventory(this, 'Ler o quê?', ['scroll', 'book'], (i) => readCommand(this, i));
        break;
      case 'discoveries':
        discoveriesScreen(this);
        break;
      case 'zap':
        pickFromInventory(this, 'Usar qual varinha?', ['wand'], (i) => this.app.screens.push(new TargetScreen(this.app, this.game, {
          mode: 'aim', prompt: 'Apontar para onde?', onConfirm: (p) => this.act({ type: 'zap', itemId: i.id, tx: p.x, ty: p.y }),
        })));
        break;
      case 'fire':
        fireCommand(this);
        break;
      case 'invoke':
        this.act({ type: 'invoke' });
        break;
      case 'search':
        this.act({ type: 'search' });
        break;
      case 'rest':
        if (this.netBlocked()) break;
        this.rest();
        break;
      case 'save':
        if (this.netBlocked()) break;
        if (saveGame(this.game)) {
          this.app.showTitle();
        } else message(this.game, 'Não foi possível salvar (armazenamento do navegador indisponível).', 'lightRed');
        break;
      case 'descend':
        this.act({ type: 'descend' });
        break;
      case 'ascend':
        this.act({ type: 'ascend' });
        break;
      case 'cast':
        this.openSpells();
        break;
      case 'abilities':
        this.openAbilities();
        break;
      case 'character':
        this.app.screens.push(new CharacterScreen(this.app, () => this.game, (a) => this.act(a)));
        break;
      case 'look':
        this.app.screens.push(new TargetScreen(this.app, this.game, { mode: 'look', prompt: 'Olhar:' }));
        break;
      case 'messages':
        this.app.screens.push(new TextWindow(this.app, 'Mensagens', this.game.log.map((m) => `{${m.color}}${messageLine(this.game, m)}{/}`), { startAtEnd: true }));
        break;
      case 'help':
        this.app.screens.push(new TextWindow(this.app, 'Ajuda — teclas', KEY_HELP.map(([key, desc]) => `{white}${key.padEnd(28)}{/} ${desc}`)));
        break;
    }
  }

  /** Multijogador: comandos automáticos (que dependem de resposta imediata) e salvar ficam de fora. */
  private netBlocked(): boolean {
    if (!this.net) return false;
    message(this.game, 'Indisponível no multijogador.', 'darkGray');
    return true;
  }

  /** Multijogador: Enter abre a conversa com o grupo; devolve true se a tecla foi usada aqui. */
  private chatKey(k: KeyInput): boolean {
    if (!this.chatting) {
      if (k.key !== 'Enter' || k.repeat) return false;
      this.chatting = true;
      this.draft = '';
      return true;
    }
    if (k.key === 'Escape') this.chatting = false;
    else if (k.key === 'Enter') {
      if (this.draft.trim()) this.net!.send({ t: 'chat', text: this.draft });
      this.chatting = false;
    } else if (k.key === 'Backspace') this.draft = this.draft.slice(0, -1);
    else if (k.key.length === 1 && this.draft.length < 100) this.draft += k.key;
    return true;
  }

  /** `v`: tamanho dos sprites na tela — automático, mais perto, mais longe. */
  private cycleZoom(): void {
    const s = this.app.settings;
    s.zoom = ZOOM_ORDER[(ZOOM_ORDER.indexOf(s.zoom) + 1) % ZOOM_ORDER.length];
    this.app.applySettings(true);
  }

  private openSpells(): void {
    const g = this.game;
    const known = g.hero.spells
      .map((id) => spellById(id) ?? g.customSpells?.find((s) => s.id === id))
      .filter((s): s is SpellDef => !!s)
      .sort((a, b) => a.level - b.level);
    if (!known.length) {
      message(g, 'Você não conhece nenhuma magia.', 'darkGray');
      return;
    }
    const entries: MenuEntry[] = known.map((s) => ({
      label: `${s.name} — ${s.desc}`,
      detail: `${s.cost} MP · ${spellFailChance(g, s)}% falha`,
      color: s.color,
      disabled: g.player.mp < s.cost,
    }));
    this.app.screens.push(new MenuScreen(this.app, `Magias (MP ${g.player.mp}/${g.player.maxMp})`, entries, (i) => {
      const s = known[i];
      if (s.shape === 'self') this.act({ type: 'cast', spellId: s.id });
      else {
        this.app.screens.push(new TargetScreen(this.app, g, {
          mode: 'aim', prompt: `${s.name}: escolha o alvo.`, range: s.range,
          onConfirm: (p) => this.act({ type: 'cast', spellId: s.id, tx: p.x, ty: p.y }),
        }));
      }
    }, { width: 92 }));
  }

  private openAbilities(): void {
    const g = this.game;
    const list = activeAbilities(g);
    if (!list.length) {
      message(g, 'Você não tem habilidades ativas.', 'darkGray');
      return;
    }
    const entries: MenuEntry[] = list.map((a) => {
      const wait = abilityReadyIn(g, a.id);
      const mp = ABILITY_RULES[a.id].mp;
      return { label: `${a.name} — ${a.desc}`, detail: wait > 0 ? `${wait} turnos` : mp ? `${mp} MP` : 'pronta', disabled: wait > 0 };
    });
    this.app.screens.push(new MenuScreen(this.app, 'Habilidades', entries, (i) => {
      const a = list[i];
      if (ABILITY_RULES[a.id].needsTarget) {
        this.app.screens.push(new TargetScreen(this.app, g, {
          mode: 'aim', prompt: `${a.name}: escolha o alvo.`, range: 10,
          onConfirm: (p) => this.act({ type: 'ability', abilityId: a.id, dx: p.x, dy: p.y }),
        }));
      } else if (ABILITY_RULES[a.id].needsDirection) {
        this.app.screens.push(new DirectionPrompt(this.app, `${a.name}: em que direção?`, (dx, dy) => this.act({ type: 'ability', abilityId: a.id, dx, dy }), directionForKey));
      } else this.act({ type: 'ability', abilityId: a.id });
    }, { width: 92 }));
  }

  /** Explora sozinho até ver um monstro, achar um item, levar dano ou não ter mais o que explorar. */
  private autoExplore(): void {
    const g = this.game;
    if (threatsVisible(g).length) {
      message(g, 'Há inimigos por perto!', 'orange');
      return;
    }
    for (let i = 0; i < 400; i++) {
      if (g.over) return;
      const hp = g.player.hp;
      const step = autoExploreStep(g, this.exploredItems);
      if (!step) {
        message(g, 'Não há mais nada para explorar aqui. (G vai até a escada; s procura passagens secretas.)', 'lightGray');
        return;
      }
      if ('blockedBy' in step) {
        message(g, `${capitalize(aName(step.blockedBy))} bloqueia o caminho.`, 'orange');
        return;
      }
      if (!this.act(step)) return;
      if (threatsVisible(g).length || g.player.hp < hp) return;
      const here = itemsAt(level(g), g.player.x, g.player.y).filter((it) => !this.exploredItems.has(it.id));
      if (here.length) {
        // Para no item (uma vez só: da próxima vez segue explorando).
        for (const it of here) this.exploredItems.add(it.id);
        return;
      }
    }
  }

  /** Vai até a escada de descida já vista. */
  private travelToStairs(): void {
    const g = this.game;
    const map = level(g).map;
    const i = map.tiles.findIndex((t, k) => t === Tile.StairsDown && map.explored[k]);
    if (i < 0) {
      message(g, 'Você ainda não encontrou a escada para baixo.', 'lightGray');
      return;
    }
    const target = { x: i % map.width, y: Math.floor(i / map.width) };
    for (let n = 0; n < 300; n++) {
      if (g.over || (g.player.x === target.x && g.player.y === target.y)) return;
      if (threatsVisible(g).length) {
        message(g, 'Você para: há inimigos à vista.', 'orange');
        return;
      }
      const step = stepToward(g, [target]);
      if (!step || !this.act(step)) return;
    }
  }

  /** Descansa (procurando) até curar HP/MP, ser atacado ou ver um monstro. */
  private rest(): void {
    const g = this.game;
    if (threatsVisible(g).length) {
      message(g, 'Você não pode descansar com inimigos por perto!', 'orange');
      return;
    }
    const hp = g.player.hp;
    message(g, 'Você descansa...', 'darkGray');
    for (let i = 0; i < 500; i++) {
      if (g.over || threatsVisible(g).length || g.player.hp < hp) break;
      if (g.player.hp >= g.player.maxHp && g.player.mp >= g.player.maxMp) break;
      if (!this.act({ type: 'search' })) break;
    }
  }

  /** Já avisou que a tecla segurada parou (avisa uma vez por vez que a tecla é segurada). */
  private holdWarned = false;

  /**
   * Uma tecla segurada deve parar aqui? Sim se há inimigo acordado à vista ou se o passo seria um
   * ataque: daí em diante, só com um novo toque na tecla (como "correr", que também para).
   */
  private holdBlocked(dx: number, dy: number, waiting: boolean): boolean {
    const g = this.game;
    const target = waiting ? undefined : actorAt(g, g.player.x + dx, g.player.y + dy);
    const attack = !!target && !target.isPlayer;
    if (!attack && !threatsVisible(g).length) return false;
    if (!this.holdWarned) {
      message(g, attack ? 'Você para antes de atacar: aperte de novo para golpear.' : 'Inimigo à vista! Você para (aperte de novo para agir).', 'orange');
      this.holdWarned = true;
    }
    return true;
  }

  /** Corre numa direção até algo interessante acontecer. */
  private run(dx: number, dy: number): void {
    const g = this.game;
    // Com inimigos acordados à vista, correr vira um passo só.
    if (threatsVisible(g).length) {
      this.act({ type: 'move', dx, dy });
      return;
    }
    const visibleMonsters = () => level(g).actors.filter((a) => seesActor(g, a)).length;
    const seen = visibleMonsters();
    const hp = g.player.hp;
    for (let step = 0; step < 80; step++) {
      if (g.over) return;
      const nx = g.player.x + dx;
      const ny = g.player.y + dy;
      if (!isWalkable(level(g).map, nx, ny) || !isFree(g, nx, ny)) {
        if (step === 0) this.act({ type: 'move', dx, dy }); // ataca/abre porta como um passo normal
        return;
      }
      const before = this.openNeighbors();
      if (!this.act({ type: 'move', dx, dy })) return;
      if (g.player.hp < hp || visibleMonsters() > seen) return;
      if (itemsAt(level(g), g.player.x, g.player.y).length) return;
      const t = getTile(level(g).map, g.player.x, g.player.y);
      if (t !== Tile.Floor && t !== Tile.Corridor) return; // escada, porta, fonte...
      if (step > 0 && this.openNeighbors() !== before) return; // bifurcação ou entrada de sala
    }
  }

  private openNeighbors(): number {
    const g = this.game;
    return DIRS8.filter((d) => isWalkable(level(g).map, g.player.x + d.x, g.player.y + d.y)).length;
  }

  /** Comandos de depuração (só com ?debug=1 na URL). */
  private debugKey(k: KeyInput): boolean {
    if (k.key === 'F2') {
      this.game = createGame((this.game.seed * 31 + 7) >>> 0);
      message(this.game, `[debug] novo mapa, seed ${this.game.seed}`, 'lightMagenta');
      return true;
    }
    if (k.key === 'F6') {
      enterLevel(this.game, Math.min(20, this.game.depth + 1), 'up');
      message(this.game, `[debug] andar ${this.game.depth}`, 'lightMagenta');
      return true;
    }
    if (k.key === 'F7') {
      const h = this.game.hero;
      gainXp(this.game, Math.ceil((xpForLevel(h.level + 1) - h.xp) / raceById(h.raceId).xpMult));
      trackEvents(this.game, this.state, this.game.events);
      playEvents(this.anims, this.game.events);
      return true;
    }
    if (k.key === 'F9' || k.key === 'F10') {
      const g = this.game;
      if (k.key === 'F9') damage(g, g.player, 9999);
      else {
        g.hasAmulet = true;
        g.player.energy = 100;
      }
      this.act(k.key === 'F9' ? { type: 'wait' } : { type: 'invoke' });
      return true;
    }
    if (k.key === 'F3') {
      const map = level(this.game).map;
      map.explored.fill(1);
      map.visible.fill(1);
      for (const t of level(this.game).traps ?? []) t.hidden = false;
      message(this.game, '[debug] mapa revelado', 'lightMagenta');
      return true;
    }
    if (k.key === 'F4') {
      const g = this.game;
      const d = DIRS8.find((d) => isFree(g, g.player.x + d.x, g.player.y + d.y));
      if (d) {
        const m = createMonster(g, g.rng.loot.pick(monstersForDepth(g.depth)), g.player.x + d.x, g.player.y + d.y, g.rng.loot);
        m.ai.state = 'hunting';
        level(g).actors.push(m);
        message(g, `[debug] ${m.name} criado`, 'lightMagenta');
      }
      return true;
    }
    return false;
  }

  render(term: Terminal, time: number): void {
    const game = this.game;
    const dt = this.lastTime ? Math.min(100, Math.max(0, time - this.lastTime)) : 0;
    this.lastTime = time;
    const st = this.state;
    st.focus = viewFocus.point;
    // Multijogador: caído, a câmera acompanha um aliado de pé.
    if (!st.focus && this.net && memberById(game, game.player.id)?.dead) {
      const ally = aliveMembers(game)[0];
      if (ally) st.focus = { x: ally.actor.x, y: ally.actor.y };
    }
    st.instant = this.app.settings.animSpeed === 0;
    st.speed = Math.max(1, this.app.settings.animSpeed);
    st.update(game, dt, term.view.tilesW, term.view.tilesH);
    const shaking = performance.now() < shake.until && this.app.settings.animSpeed > 0;
    drawMap(term, game, st, time, shaking ? (Math.floor(time / 40) % 2 ? 1 : -1) : 0);
    this.anims.draw(term);
    drawMessages(term, game);
    drawSidebar(term, game, time);
    if (this.app.debug) term.print(SIDE_X, FOOT_Y - 1, `seed ${game.seed}`, 'lightMagenta');
    const score = computeScore(game).total;
    const best = Math.max(score, this.app.highScores[0]?.score ?? 0);
    const goal = game.challenge ? `   Meta {${score > game.challenge.target ? 'lightGreen' : 'yellow'}}${game.challenge.target}{/}` : '';
    const daily = game.daily ? `   {lightCyan}Desafio diário ${game.daily}{/}` : '';
    term.print(0, FOOT_Y, `Pontos {white}${score}{/}   Recorde {gold}${best}{/}${goal}${daily}`, 'lightGray');
    if (game.over) {
      const rank = this.rank >= 0 ? ` {gold}${this.rank + 1}º lugar no quadro de recordes!{/}` : '';
      const head = game.over.won ? '{gold}VITÓRIA!{/}' : '{red}Você morreu{/}';
      term.print(0, FOOT_Y + 1, `${head} (${game.over.cause}) — ${score} pontos.${rank} {white}[tecla]{/} continuar`, 'lightGray');
    } else if (this.net) {
      term.print(0, FOOT_Y + 1, this.chatting ? `{yellow}Para o grupo:{/} ${this.draft}${Math.floor(time / 400) % 2 ? '_' : ' '}  {darkGray}[Enter] enviar · [Esc] cancelar{/}` : this.turnLine(), 'darkGray', 'black', 98);
    } else {
      term.print(0, FOOT_Y + 1, 'Mova/ataque com {white}hjklyubn{/}/{white}setas{/}/{white}numpad{/} · {white}i{/} inventário · {white}?{/} ajuda', 'darkGray');
    }
  }

  /** Multijogador: de quem é a vez (e lembrete das teclas do grupo). */
  private turnLine(): string {
    const g = this.game;
    const me = g.player.id;
    const conn = this.net!.status === 'open' ? '' : ' {lightRed}(sem conexão — tentando de novo){/}';
    if (memberById(g, me)?.dead) return `{red}Você caiu.{/} Volta com metade da vida quando o grupo descer a escada.${conn}`;
    const others = this.waiting.filter((id) => id !== me).map((id) => memberById(g, id)).filter((m) => !!m).map((m) => `{${memberTextColor(g, m!.id)}}${m!.name}{/}`);
    const mine = this.waiting.includes(me) ? '{lightGreen}Sua vez!{/}' : others.length ? `Esperando ${others.join(', ')}...` : '';
    const solo = members(g).length > 1 ? ' · {white}Enter{/} conversar' : '';
    return `${mine}${mine && others.length && this.waiting.includes(me) ? ` (falta também ${others.join(', ')})` : ''}${solo} · {white}?{/} ajuda${conn}`;
  }
}
