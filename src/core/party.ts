import type { Game } from './game';
import { actorAt, level, message, newId, refreshFov } from './game';
import type { Actor } from './actor';
import { ACTION_COST, createActor } from './actor';
import type { Hero } from './hero';
import { createHero, recalcPlayer } from './hero';
import type { Action } from './actions';
import { perform } from './actions';
import { decideAction } from '../ai/behaviors';
import { effectiveSpeed, hasStatus, isIncapacitated, tickStatuses } from './status';
import { damage } from './combat';
import { isWalkable } from './map';
import type { Point } from './map';
import { createGame, giveStartingKit } from './world';
import type { HeroSpec } from './world';
import { learn } from './identify';
import { heroRegen, hungerAndFuel, resolveFall } from './turn';
import { RNG } from '../engine/rng';

/**
 * Grupo de heróis (multijogador cooperativo). O núcleo do jogo foi escrito do ponto de vista de "o jogador"
 * (`game.player` / `game.hero`); em vez de reescrevê-lo, o grupo troca a PERSPECTIVA antes de cada passo:
 * - quando um herói age, ele é "o jogador";
 * - quando um monstro age, "o jogador" é o herói mais próximo dele (a IA persegue e ataca quem está perto);
 * - a visão (`map.visible`) é de cada herói; a memória do mapa (`explored`) é do grupo.
 *
 * Turnos: o sistema de energia continua o mesmo. Quando um herói pode agir, o mundo espera a ação dele
 * (cada um pode deixar UMA ação na fila); monstros só agem quando nenhum herói está pronto.
 */

export interface PartyMember {
  /** Id do ator do herói (identifica o jogador na partida). */
  id: number;
  name: string;
  actor: Actor;
  hero: Hero;
  /** Campo de visão deste herói no andar atual. */
  visible: number[];
  /** Caiu em combate: vira espectador até o grupo descer de andar. */
  dead: boolean;
  cause?: string;
  /** Jogador conectado (desconectado: o herói só espera, para não travar os outros). */
  connected: boolean;
  /** Cor de identificação (nome e marca no chão). */
  color: string;
}

export interface Party {
  members: PartyMember[];
  /** Próxima ação de cada herói (por id). */
  queue: Record<number, Action>;
  /** Heróis que o mundo está esperando agora. */
  waiting: number[];
}

export const PARTY_COLORS = ['#5ad8ff', '#ff7ad8', '#ffd24a', '#7aff8a'];
/** As mesmas cores, com os nomes da paleta do terminal (para textos: nomes, painel, mensagens). */
export const PARTY_TEXT_COLORS = ['lightCyan', 'lightMagenta', 'yellow', 'lightGreen'] as const;

/** Cor de texto de um herói do grupo (pela posição dele no grupo). */
export function memberTextColor(game: Game, id: number): string {
  const i = members(game).findIndex((m) => m.id === id);
  return PARTY_TEXT_COLORS[Math.max(0, i) % PARTY_TEXT_COLORS.length];
}
export const MAX_PARTY = 4;

export const members = (game: Game): PartyMember[] => game.party?.members ?? [];
export const aliveMembers = (game: Game): PartyMember[] => members(game).filter((m) => !m.dead);
export const memberById = (game: Game, id: number): PartyMember | undefined => members(game).find((m) => m.id === id);
export const memberOfActor = (game: Game, a: Actor): PartyMember | undefined => members(game).find((m) => m.actor === a || m.id === a.id);

/** Faz de `m` "o jogador" (herói, ator e campo de visão). */
export function setPerspective(game: Game, m: PartyMember): void {
  game.player = m.actor;
  game.hero = m.hero;
  const map = level(game).map;
  if (m.visible.length !== map.tiles.length) m.visible = new Array(map.tiles.length).fill(0);
  map.visible = m.visible;
}

/** Cria uma partida com um herói por jogador (o primeiro da lista é o "líder"). */
export function createPartyGame(seed: number, specs: HeroSpec[]): Game {
  if (!specs.length) throw new Error('grupo vazio');
  const game = createGame(seed, specs[0]);
  const first: PartyMember = {
    id: game.player.id, name: specs[0].name, actor: game.player, hero: game.hero,
    visible: level(game).map.visible, dead: false, connected: true, color: PARTY_COLORS[0],
  };
  game.party = { members: [first], queue: {}, waiting: [] };
  specs.slice(1, MAX_PARTY).forEach((spec, i) => addMember(game, spec, PARTY_COLORS[(i + 1) % PARTY_COLORS.length]));
  setPerspective(game, first);
  refreshAll(game);
  game.events = [];
  return game;
}

function addMember(game: Game, spec: HeroSpec, color: string): PartyMember {
  const actor = createActor(newId(game), { templateId: 'player', name: 'você', glyph: '@', color: 'white', isPlayer: true, energy: ACTION_COST });
  const hero = createHero(spec.name, spec.raceId, spec.classId, spec.rollSeed !== undefined ? new RNG(spec.rollSeed) : undefined);
  const m: PartyMember = { id: actor.id, name: spec.name, actor, hero, visible: [], dead: false, connected: true, color };
  const leader = members(game)[0].actor;
  game.party!.members.push(m);
  const spot = freeSpotNear(game, leader);
  actor.x = spot.x;
  actor.y = spot.y;
  setPerspective(game, m);
  giveStartingKit(game);
  for (const it of hero.inventory) learn(game, it.baseId);
  recalcPlayer(game);
  actor.hp = actor.maxHp;
  actor.mp = actor.maxMp;
  return m;
}

/** Casa livre mais próxima de `p` (busca em anéis), para pôr um herói ao lado do outro. */
export function freeSpotNear(game: Game, p: Point): Point {
  const map = level(game).map;
  for (let r = 1; r <= 8; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = p.x + dx;
        const y = p.y + dy;
        if (isWalkable(map, x, y) && !actorAt(game, x, y)) return { x, y };
      }
    }
  }
  return { x: p.x, y: p.y };
}

/** Recalcula a visão de todos os heróis vivos (a memória do mapa soma o que cada um vê). */
export function refreshAll(game: Game): void {
  const keep = game.player;
  for (const m of aliveMembers(game)) {
    setPerspective(game, m);
    refreshFov(game);
  }
  const back = memberOfActor(game, keep);
  if (back) setPerspective(game, back);
}

/** Herói vivo mais próximo de um monstro (é quem a IA dele enxerga como "o jogador"). */
export function nearestMember(game: Game, a: Point): PartyMember | undefined {
  let best: PartyMember | undefined;
  let bestD = Infinity;
  for (const m of aliveMembers(game)) {
    const d = Math.max(Math.abs(m.actor.x - a.x), Math.abs(m.actor.y - a.y));
    if (d < bestD) {
      best = m;
      bestD = d;
    }
  }
  return best;
}

/**
 * O grupo chegou a um andar (escada ou alçapão): quem não viajou aparece ao lado de quem viajou,
 * os caídos voltam com metade da vida e todos recalculam a visão no mapa novo.
 */
export function partyArrives(game: Game, traveller: Actor): void {
  const map = level(game).map;
  for (const m of members(game)) {
    m.visible = new Array(map.tiles.length).fill(0);
    if (m.actor === traveller) continue;
    if (m.dead) {
      m.dead = false;
      m.cause = undefined;
      m.actor.hp = Math.max(1, Math.ceil(m.actor.maxHp / 2));
      m.actor.effects = [];
      m.actor.energy = ACTION_COST;
      message(game, `${m.name} se levanta de novo!`, 'lightGreen', null);
    }
    const spot = freeSpotNear(game, traveller);
    m.actor.x = spot.x;
    m.actor.y = spot.y;
  }
  game.party!.queue = {};
  if (members(game).length > 1) message(game, 'O grupo segue junto.', 'darkGray', null);
  const back = memberOfActor(game, traveller);
  refreshAll(game);
  if (back) setPerspective(game, back);
}

/** Um herói caiu. Devolve true se ainda há alguém de pé (a partida continua). */
export function memberFalls(game: Game, a: Actor, cause: string): boolean {
  const m = memberOfActor(game, a);
  if (!m) return false;
  m.dead = true;
  m.cause = cause;
  m.actor.effects = [];
  delete game.party!.queue[m.id];
  message(game, `${m.name} cai!`, 'red', null);
  return aliveMembers(game).length > 0;
}

/** Guarda a próxima ação de um herói (substitui a anterior, se ainda não foi feita). */
export function queueAction(game: Game, id: number, action: Action): void {
  const m = memberById(game, id);
  if (!m || m.dead || game.over) return;
  // Ações livres (gastar ponto de atributo) valem na hora, sem esperar a vez.
  if (FREE_ACTIONS.has(action.type)) {
    const keep = game.player;
    setPerspective(game, m);
    perform(game, m.actor, action);
    const back = memberOfActor(game, keep);
    if (back) setPerspective(game, back);
    return;
  }
  game.party!.queue[id] = action;
}

/** Ações que não gastam tempo (feitas na hora, fora da fila). */
const FREE_ACTIONS = new Set<Action['type']>(['raiseStat']);

/**
 * Avança o mundo até alguém precisar decidir: heróis prontos com ação na fila agem; quando um herói
 * pronto não tem ação, o mundo para e devolve quem está sendo esperado. Heróis desconectados esperam
 * (gastam o turno) para não travar os outros.
 */
export function advanceParty(game: Game): number[] {
  const party = game.party;
  if (!party) return [];
  for (let guard = 0; guard < 20000; guard++) {
    if (game.over) return (party.waiting = []);
    const ready = aliveMembers(game).filter((m) => m.actor.energy >= ACTION_COST);
    if (ready.length) {
      let progressed = false;
      const waiting: number[] = [];
      for (const m of ready) {
        if (m.dead || m.actor.energy < ACTION_COST) continue;
        setPerspective(game, m);
        if (isIncapacitated(m.actor)) {
          // Dormindo/paralisado: o turno passa sozinho.
          m.actor.energy -= ACTION_COST;
          progressed = true;
          continue;
        }
        const action = party.queue[m.id] ?? (m.connected ? undefined : ({ type: 'search' } as Action));
        if (!action) {
          waiting.push(m.id);
          continue;
        }
        delete party.queue[m.id];
        const cost = perform(game, m.actor, action);
        if (cost > 0) {
          m.actor.energy -= cost;
          progressed = true;
          resolveFall(game);
        } else waiting.push(m.id); // ação inválida (parede, escada errada): espera outra
        refreshAll(game);
        if (game.over) return (party.waiting = []);
      }
      if (!progressed) {
        party.waiting = waiting;
        const first = memberById(game, waiting[0]);
        if (first) setPerspective(game, first);
        return waiting;
      }
      continue;
    }
    // Nenhum herói pronto: os monstros agem, cada um "vendo" o herói mais próximo.
    let acted = false;
    for (const mon of [...level(game).actors]) {
      if (game.over) return (party.waiting = []);
      if (mon.hp <= 0 || mon.energy < ACTION_COST) continue;
      if (isIncapacitated(mon)) {
        mon.energy -= ACTION_COST;
        acted = true;
        continue;
      }
      const target = nearestMember(game, mon);
      if (!target) break;
      setPerspective(game, target);
      const cost = perform(game, mon, decideAction(game, mon));
      mon.energy -= cost > 0 ? cost : ACTION_COST;
      acted = true;
    }
    if (acted) refreshAll(game);
    else tickParty(game);
  }
  return (party.waiting = []);
}

/** Um "tick" de tempo para o grupo: energia, estados, fome, luz e regeneração de cada herói, e dos monstros. */
function tickParty(game: Game): void {
  game.turn++;
  for (const m of aliveMembers(game)) m.actor.energy += effectiveSpeed(m.actor);
  for (const a of level(game).actors) a.energy += effectiveSpeed(a);
  for (const m of aliveMembers(game)) {
    if (!m.actor.effects?.length) continue;
    setPerspective(game, m);
    const { damage: dmg, cause } = tickStatuses(game, m.actor);
    if (dmg > 0) {
      damage(game, m.actor, dmg);
      if (cause && m.dead) m.cause = cause;
      if (cause && game.over && !game.over.won) game.over.cause = cause;
    }
    if (game.over) return;
  }
  for (const a of [...level(game).actors]) {
    if (!a.effects?.length) continue;
    const near = nearestMember(game, a);
    if (near) setPerspective(game, near);
    const { damage: dmg } = tickStatuses(game, a);
    if (dmg > 0) damage(game, a, dmg);
    if (game.over) return;
  }
  for (const m of aliveMembers(game)) {
    setPerspective(game, m);
    hungerAndFuel(game);
    if (game.over) return;
    if (!m.dead) heroRegen(game);
  }
  if (game.turn % 10 === 0) for (const a of level(game).actors) if (a.hp < a.maxHp && !hasStatus(a, 'poisoned')) a.hp++;
  if (game.turn % 4 === 0) for (const a of level(game).actors) if (a.flags.includes('regenerates') && a.hp < a.maxHp) a.hp += 2;
}
