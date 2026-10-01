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
import { isFree, level, message } from '../core/game';
import { DIRS8, getTile, idx, isWalkable } from '../core/map';
import { Tile } from '../data/tiles';
import { formatMessage } from '../core/log';
import { itemsAt } from '../core/item';
import type { App } from './app';
import { TextWindow } from './textWindow';
import { TargetScreen } from './targetScreen';
import { CharacterScreen } from './characterScreen';
import { gainXp, xpForLevel } from '../core/hero';
import { raceById } from '../data/races';
import { AnimationQueue } from '../engine/animations';
import { playEvents } from './effects';
import type { Action } from '../core/actions';
import type { ItemHost } from './itemMenus';
import { EquipmentScreen, InventoryScreen, fireCommand, pickFromInventory, pickupCommand, throwCommand } from './itemMenus';
import { isEquipped, slotOf } from '../core/inventory';
import { itemBase } from '../data/items';
import { createMonster } from '../core/monster';
import { monstersForDepth } from '../gen/populate';
import { createGame, enterLevel } from '../core/world';
import { playerAction } from '../core/turn';
import { FOOT_Y, SIDE_X } from './layout';
import { drawMap } from './mapView';
import { drawMessages, drawSidebar } from './hud';

export class GameScreen implements Screen, ItemHost {
  private anims = new AnimationQueue();

  constructor(public app: App, public game: Game) {}

  update(dt: number): void {
    this.anims.update(dt);
  }

  /** Executa uma ação do jogador e transforma o que aconteceu em animações. */
  act(action: Action): boolean {
    const ok = playerAction(this.game, action);
    playEvents(this.anims, this.game.events);
    return ok;
  }

  onKey(k: KeyInput): void {
    // Uma tecla durante a animação pula a animação (e o comando segue normalmente).
    if (this.anims.busy) this.anims.skipAll();
    if (this.app.debug && this.debugKey(k)) return;
    if (this.game.over) {
      // Provisório (a tela de Game Over vem na Etapa 3): Enter volta à criação de personagem.
      if (k.key === 'Enter') this.app.restart();
      return;
    }
    const cmd = commandForKey(k);
    if (!cmd) return;
    switch (cmd.name) {
      case 'move':
        this.act({ type: 'move', dx: cmd.dx!, dy: cmd.dy! });
        break;
      case 'run':
        this.run(cmd.dx!, cmd.dy!);
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
      case 'quaff':
        pickFromInventory(this, 'Beber o quê?', ['potion'], (i) => this.act({ type: 'quaff', itemId: i.id }));
        break;
      case 'eat':
        pickFromInventory(this, 'Comer o quê?', ['food', 'corpse'], (i) => this.act({ type: 'eat', itemId: i.id }));
        break;
      case 'read':
        pickFromInventory(this, 'Ler o quê?', ['scroll', 'book'], (i) => this.act({ type: 'read', itemId: i.id }));
        break;
      case 'zap':
        pickFromInventory(this, 'Usar qual varinha?', ['wand'], (i) => this.app.screens.push(new TargetScreen(this.app, this.game, {
          mode: 'aim', prompt: 'Apontar para onde?', onConfirm: (p) => this.act({ type: 'zap', itemId: i.id, tx: p.x, ty: p.y }),
        })));
        break;
      case 'fire':
        fireCommand(this);
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
        this.app.screens.push(new CharacterScreen(this.app, this.game));
        break;
      case 'look':
        this.app.screens.push(new TargetScreen(this.app, this.game, { mode: 'look', prompt: 'Olhar:' }));
        break;
      case 'messages':
        this.app.screens.push(new TextWindow(this.app, 'Mensagens', this.game.log.map((m) => `{${m.color}}${formatMessage(m)}{/}`), { startAtEnd: true }));
        break;
      case 'help':
        this.app.screens.push(new TextWindow(this.app, 'Ajuda — teclas', KEY_HELP.map(([key, desc]) => `{white}${key.padEnd(28)}{/} ${desc}`)));
        break;
    }
  }

  private openSpells(): void {
    const g = this.game;
    const known = g.hero.spells.map((id) => spellById(id)).filter((s): s is SpellDef => !!s);
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
      if (ABILITY_RULES[a.id].needsDirection) {
        this.app.screens.push(new DirectionPrompt(this.app, `${a.name}: em que direção?`, (dx, dy) => this.act({ type: 'ability', abilityId: a.id, dx, dy }), directionForKey));
      } else this.act({ type: 'ability', abilityId: a.id });
    }, { width: 92 }));
  }

  /** Corre numa direção até algo interessante acontecer. */
  private run(dx: number, dy: number): void {
    const g = this.game;
    const visibleMonsters = () => level(g).actors.filter((a) => level(g).map.visible[idx(level(g).map, a.x, a.y)]).length;
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
      playEvents(this.anims, this.game.events);
      return true;
    }
    if (k.key === 'F3') {
      const map = level(this.game).map;
      map.explored.fill(1);
      map.visible.fill(1);
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

  render(term: Terminal): void {
    const game = this.game;
    drawMap(term, game);
    this.anims.draw(term);
    drawMessages(term, game);
    drawSidebar(term, game);
    if (this.app.debug) term.print(SIDE_X, FOOT_Y - 1, `seed ${game.seed}`, 'lightMagenta');
    if (game.over) {
      term.print(0, FOOT_Y + 1, `{red}Você morreu{/} (${game.over.cause}). Pressione {white}Enter{/} para recomeçar.`, 'lightGray');
    } else {
      term.print(0, FOOT_Y + 1, 'Mova/ataque com {white}hjklyubn{/}, {white}setas{/} ou {white}numpad{/}. {white}.{/} espera.', 'darkGray');
    }
  }
}
