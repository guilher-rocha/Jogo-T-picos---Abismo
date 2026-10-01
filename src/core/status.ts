import type { Actor } from './actor';
import type { Game } from './game';
import { emit, level, message } from './game';
import { capitalize, theName, adj } from './text';

export type StatusId =
  | 'poisoned' | 'burning' | 'confused' | 'blind' | 'hasted' | 'slowed'
  | 'asleep' | 'paralyzed' | 'afraid' | 'invisible' | 'regenerating' | 'shielded';

export interface StatusEffect {
  id: StatusId;
  turns: number;
  /** Intensidade (dano por turno do veneno, bônus do escudo...). */
  power: number;
}

interface StatusDef {
  name: string;
  /** Mensagens para o jogador: ao começar / ao terminar. */
  start: string;
  end: string;
  /** Mensagem para monstros visíveis ("O goblin [fica confuso]."). */
  monster: string;
  good: boolean;
}

export const STATUS: Record<StatusId, StatusDef> = {
  poisoned: { name: 'Envenenado', start: 'Você está envenenado!', end: 'O veneno sai do seu corpo.', monster: 'parece envenenado', good: false },
  burning: { name: 'Em chamas', start: 'Você pega fogo!', end: 'As chamas se apagam.', monster: 'pega fogo', good: false },
  confused: { name: 'Confuso', start: 'Sua cabeça gira... você está confuso!', end: 'Você volta a pensar com clareza.', monster: 'parece confuso', good: false },
  blind: { name: 'Cego', start: 'Você não enxerga nada!', end: 'Sua visão volta.', monster: 'parece cego', good: false },
  hasted: { name: 'Acelerado', start: 'Você se sente muito rápido!', end: 'Você volta à velocidade normal.', monster: 'acelera', good: true },
  slowed: { name: 'Lento', start: 'Você se sente lento.', end: 'Você volta à velocidade normal.', monster: 'fica mais lento', good: false },
  asleep: { name: 'Dormindo', start: 'Você cai no sono!', end: 'Você acorda.', monster: 'cai no sono', good: false },
  paralyzed: { name: 'Paralisado', start: 'Você não consegue se mexer!', end: 'Você volta a se mexer.', monster: 'fica paralisado', good: false },
  afraid: { name: 'Com medo', start: 'Você está apavorado!', end: 'Você recupera a coragem.', monster: 'foge apavorado', good: false },
  invisible: { name: 'Invisível', start: 'Seu corpo some diante dos seus olhos!', end: 'Você volta a ser visível.', monster: 'some', good: true },
  regenerating: { name: 'Regenerando', start: 'Você sente seu corpo se regenerar.', end: 'A regeneração para.', monster: 'se regenera', good: true },
  shielded: { name: 'Escudo', start: 'Um escudo mágico envolve você.', end: 'O escudo mágico se dissipa.', monster: 'é envolvido por um escudo', good: true },
};

export function effects(a: Actor): StatusEffect[] {
  if (!a.effects) a.effects = [];
  return a.effects;
}

export function hasStatus(a: Actor, id: StatusId): boolean {
  return (a.effects ?? []).some((e) => e.id === id && e.turns > 0);
}

export function statusPower(a: Actor, id: StatusId): number {
  return (a.effects ?? []).find((e) => e.id === id)?.power ?? 0;
}

/** Resistências naturais a status (raças, flags). */
function resists(a: Actor, id: StatusId): boolean {
  const f = a.flags;
  if ((id === 'asleep' || id === 'paralyzed') && f.includes('sleepResist')) return true;
  if (id === 'confused' && f.includes('confuseResist')) return true;
  if (id === 'poisoned' && ((a.resist?.poison ?? 0) >= 100)) return true;
  if (id === 'burning' && ((a.resist?.fire ?? 0) >= 100)) return true;
  if ((id === 'afraid' || id === 'confused') && f.includes('unshakable')) return true;
  if ((id === 'asleep' || id === 'afraid' || id === 'confused') && f.includes('undead') && !a.isPlayer) return id === 'asleep';
  return false;
}

/** Aplica um status (ou prolonga, se já houver). Retorna false se resistiu. */
export function addStatus(game: Game, a: Actor, id: StatusId, turns: number, power = 1): boolean {
  if (resists(a, id)) {
    if (a.isPlayer) message(game, 'Você resiste!', 'lightCyan');
    return false;
  }
  // Veneno é reduzido pela metade com resistência parcial.
  if (id === 'poisoned' && (a.resist?.poison ?? 0) >= 50) turns = Math.ceil(turns / 2);
  const list = effects(a);
  const cur = list.find((e) => e.id === id);
  if (cur) {
    cur.turns = Math.max(cur.turns, turns) + (id === 'poisoned' ? Math.floor(turns / 2) : 0);
    cur.power = Math.max(cur.power, power);
    return true;
  }
  list.push({ id, turns, power });
  const def = STATUS[id];
  if (a.isPlayer) message(game, def.start, def.good ? 'lightCyan' : 'orange');
  else if (isSeen(game, a)) message(game, `${capitalize(theName(a))} ${genderize(def.monster, a)}.`, 'lightGray');
  if (id === 'asleep' && !a.isPlayer) a.ai.state = 'sleeping';
  if (id === 'afraid' && !a.isPlayer) {
    a.ai.state = 'fleeing';
    a.ai.fleeUntil = game.turn + turns;
  }
  return true;
}

function genderize(text: string, a: Actor): string {
  return text.replace(/(envenenado|confuso|cego|lento|paralisado|apavorado|envolvido)/, (w) => adj(w, a.gender));
}

export function removeStatus(game: Game, a: Actor, id: StatusId, quiet = false): void {
  const list = effects(a);
  const had = list.some((e) => e.id === id);
  a.effects = list.filter((e) => e.id !== id);
  if (had && !quiet && a.isPlayer) message(game, STATUS[id].end, 'lightGray');
}

function isSeen(game: Game, a: Actor): boolean {
  const map = level(game).map;
  return map.visible[a.y * map.width + a.x] === 1;
}

/** Velocidade efetiva com acelerar/lentidão. */
export function effectiveSpeed(a: Actor): number {
  let s = a.speed;
  if (hasStatus(a, 'hasted')) s = Math.round(s * 1.5);
  if (hasStatus(a, 'slowed')) s = Math.round(s * 0.5);
  return Math.max(10, s);
}

/** Bônus de defesa vindo de status (escudo mágico). */
export function statusDefense(a: Actor): number {
  return hasStatus(a, 'shielded') ? statusPower(a, 'shielded') : 0;
}

/** O ator perde o turno (dormindo ou paralisado). */
export function isIncapacitated(a: Actor): boolean {
  return hasStatus(a, 'asleep') || hasStatus(a, 'paralyzed');
}

/**
 * Avança os status de um ator em um turno: dano de veneno/fogo, regeneração e duração.
 * Retorna o dano sofrido (para o chamador aplicar com a causa certa).
 */
export function tickStatuses(game: Game, a: Actor): { damage: number; cause?: string } {
  let damage = 0;
  let cause: string | undefined;
  for (const e of effects(a)) {
    if (e.id === 'poisoned') {
      damage += e.power;
      cause = 'envenenado';
    } else if (e.id === 'burning') {
      damage += e.power + game.rng.combat.int(0, 2);
      cause = 'queimado vivo';
    } else if (e.id === 'regenerating' && a.hp < a.maxHp) {
      a.hp = Math.min(a.maxHp, a.hp + e.power);
    }
    e.turns--;
  }
  for (const e of effects(a).filter((x) => x.turns <= 0)) {
    removeStatus(game, a, e.id);
    if (e.id === 'asleep' && !a.isPlayer && a.ai.state === 'sleeping') a.ai.state = 'wandering';
  }
  if (damage > 0) emit(game, { type: 'damage', x: a.x, y: a.y, amount: damage, toPlayer: a.isPlayer });
  return { damage, cause };
}
