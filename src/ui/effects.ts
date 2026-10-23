import type { AnimationQueue, Animation } from '../engine/animations';
import { CLASSIC_PALETTE } from '../engine/colors';
import type { Color } from '../engine/colors';
import { registry } from '../engine/atlas';
import type { GameEvent } from '../core/events';
import type { Point } from '../core/map';
import type { Game } from '../core/game';
import { actorAt } from '../core/game';
import { itemBase } from '../data/items';
import { ELEMENT_SOUND, sound } from '../engine/sound';
import type { SoundName } from '../engine/sound';
import type { MeleeStyle } from '../core/events';
import { K } from '../gfx/keys';
import type { SceneState } from './sceneState';
import {
  BEAM_MS, BREATH_MS, CAST_MS, MELEE_MS, SHATTER_MS, SMOKE_MS, SPELL_HIT_MS, TELEPORT_MS, WHIRL_MS,
  along, beam, breath, castCircle, explosion, explosionMs, flightPoints, magicMissile, meleeSwing, shatter, smoke,
  spellFlightMs, spellHit, teleport, whirl,
} from './vfx';

export { BEAM_MS, explosionMs, CAST_MS, MELEE_MS };

/** Tremor de tela (golpes críticos, morte de chefes). */
export const shake = { until: 0 };

const MELEE_SOUND: Record<MeleeStyle, SoundName> = {
  slash: 'slash', pierce: 'pierce', blunt: 'blunt', fist: 'blunt', claw: 'claw', bite: 'bite', touch: 'arcane',
};

/**
 * Toca os sons dos eventos de um turno, cada um no instante em que a animação dele acontece
 * (o estalo do golpe quando a arma chega, a explosão quando a bola de fogo cai). `scale` acompanha a
 * velocidade das animações (0 = tudo junto, sem animações).
 */
export function playSounds(events: GameEvent[], scale = 1): void {
  const { at } = schedule(events);
  const count = new Map<SoundName, number>();
  const play = (s: SoundName, i: number): void => {
    // o mesmo som no mesmo turno no máximo 3 vezes (uma horda não vira barulho)
    const n = count.get(s) ?? 0;
    if (n >= 3) return;
    count.set(s, n + 1);
    sound.play(s, at[i] * scale);
  };
  const whirling = events.some((e) => e.type === 'whirl');
  events.forEach((e, i) => {
    switch (e.type) {
      case 'damage': play(e.toPlayer ? 'hurt' : 'hit', i); break;
      case 'crit': play('crit', i); break;
      case 'miss': play('miss', i); break;
      case 'death': play(e.isPlayer ? 'death' : 'kill', i); break;
      case 'levelUp': play('levelUp', i); break;
      case 'pickup': play('pickup', i); break;
      case 'door': play('door', i); break;
      case 'stairs': play('stairs', i); break;
      case 'spell': play(ELEMENT_SOUND[e.element ?? ''] ?? 'arcane', i); break;
      case 'melee':
        if (!whirling) play(e.style === 'touch' && e.element ? ELEMENT_SOUND[e.element] ?? 'arcane' : MELEE_SOUND[e.style], i);
        break;
      case 'whirl': play('whirl', i); break;
      case 'quaff': play('quaff', i); break;
      case 'read': play('read', i); break;
      case 'explosion': case 'bossDeath': play('explosion', i); break;
      case 'breath': play('breath', i); break;
      case 'projectile':
        // magias já soaram ao conjurar; flechas e virotes estalam; o resto é arremesso
        if (e.glyph !== '*') play(e.item && itemBase(e.item).category === 'ammo' ? 'shoot' : 'throw', i);
        break;
      case 'teleport': play('teleport', i); break;
      case 'shatter': play('shatter', i); break;
      case 'smoke': play('smoke', i); break;
      default: break;
    }
  });
}

const PROJECTILE_STEP_MS = 36;
/** Durações (ms) das animações. */
export const DAMAGE_NUMBER_MS = 650;
const MISS_MS = 520;
const HEAL_MS = 650;
const LEVEL_UP_MS = 800;
const WIPE_MS = 320;
/** Quanto um golpe "pesa" antes da próxima ação (o resto do número de dano continua por cima). */
export const HIT_HOLD_MS = 110;
const MISS_HOLD_MS = 60;
/** O voo de um projétil comum: um passo por tile do caminho (a partir do atirador, quando se sabe onde ele está). */
export const projectileMs = (path: Point[], from?: Point): number => Math.max(160, Math.max(1, path.length + (from ? 1 : 0) - 1) * PROJECTILE_STEP_MS);

const css = (c: Color): string => CLASSIC_PALETTE[c];

/** Faísca de impacto + clarão redondo (vermelho; dourado nos críticos) em volta do alvo. */
function impact(x: number, y: number, toPlayer: boolean, crit: boolean): Animation {
  return {
    duration: crit ? 300 : 240,
    draw: (term, t) => {
      const s = term.scene;
      if (!s) return;
      s.glow(x + 0.5, y + 0.55, crit ? 1.3 : 1.0, crit ? '#ffd24a' : toPlayer ? '#e02020' : '#ff5a3a', (crit ? 0.55 : 0.38) * (1 - t));
      s.spr(K.fx('hit'), x, y, { f: Math.min(3, Math.floor(t * 4)) });
      if (crit) s.ring(x + 0.5, y + 0.5, 0.3 + t * 0.7, '#ffd24a', 2, 1 - t);
    },
  };
}

/** Número de dano subindo acima do alvo (com um "pulo" de escala no começo). */
function damageNumber(x: number, y: number, amount: number, toPlayer: boolean, crit: boolean): Animation {
  const text = crit ? `-${amount}!` : `-${amount}`;
  return {
    duration: DAMAGE_NUMBER_MS,
    draw: (term, t) => {
      const s = term.scene;
      if (!s) return;
      const rise = 1 - Math.pow(1 - Math.min(1, t * 1.6), 2);
      const pop = t < 0.12 ? 1 + (0.12 - t) * 3 : 1;
      s.text(x + 0.5, y - 0.15 - rise * 0.7, text, crit ? '#ffd24a' : toPlayer ? '#ff6a6a' : '#fff0a0', (crit ? 1.5 : 1.1) * pop, t < 0.7 ? 1 : (1 - t) / 0.3);
    },
  };
}

/** "errou" subindo e sumindo. */
function missText(x: number, y: number): Animation {
  return {
    duration: MISS_MS,
    draw: (term, t) => {
      term.scene?.text(x + 0.5, y - 0.1 - t * 0.5, 'errou', '#c8cce0', 0.9, 1 - t * t);
    },
  };
}

/** Qual sprite voa: flecha/virote/pedra apontando para a frente, o resto (adagas, machados, poções) girando. */
function missileSprite(item?: string, look?: { cat: string; look: string }): { key: string; spin: boolean } {
  if (look && registry.has(K.look(look.cat, look.look))) return { key: K.look(look.cat, look.look), spin: true };
  if (item) {
    const kind = itemBase(item).ammoKind;
    if (kind === 'arrow') return { key: K.fx('arrow'), spin: false };
    if (kind === 'bolt') return { key: K.fx('bolt'), spin: false };
    if (kind === 'stone') return { key: K.fx('stone'), spin: false };
    if (registry.has(K.item(item))) return { key: K.item(item), spin: true };
  }
  return { key: K.fx('arrow'), spin: false };
}

/** Projétil comum (flecha, adaga arremessada, poção girando), com um rastro de vento. */
function thrown(path: Point[], from?: Point, item?: string, look?: { cat: string; look: string }): Animation {
  const pts = flightPoints(path, from);
  const sprite = missileSprite(item, look);
  return {
    duration: projectileMs(path, from),
    draw: (term, t) => {
      const s = term.scene;
      if (!s || !pts.length) return;
      const u = Math.min(1, t);
      const p = along(pts, u);
      // rastro: dois riscos finos atrás do projétil
      const back = along(pts, Math.max(0, u - 0.6 / Math.max(1, pts.length - 1)));
      if (back.x !== p.x || back.y !== p.y) s.line([back.x, back.y, p.x, p.y], '#e8ecf8', 1, 0.35, false);
      const spin = sprite.spin ? u * Math.PI * 7 : p.ang;
      s.spr(sprite.key, p.x, p.y, { anchor: 'center', rot: spin });
    },
  };
}

/** O herói sobe de nível: brilho dourado, estrelas subindo e o aviso. */
function levelUp(x: number, y: number): Animation {
  return {
    duration: LEVEL_UP_MS,
    draw: (term, t) => {
      const s = term.scene;
      if (!s) return;
      s.glow(x + 0.5, y + 0.6, 1.4 + t * 0.6, '#ffd24a', 0.5 * (1 - t));
      s.line([x + 0.5, y + 1, x + 0.5, y - 1.2 * t], '#fff2b0', 3, 0.5 * (1 - t), true);
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + t * 2.2;
        const rr = 0.35 + t * 0.5;
        s.spr(K.fx('spark'), x + Math.cos(ang) * rr, y + Math.sin(ang) * rr * 0.6 - t * 0.5, { f: (Math.floor(t * 10) + i) % 5, a: 1 - t * t });
      }
      s.text(x + 0.5, y - 0.3 - t * 0.6, 'Nível!', '#ffd24a', 1.2, t < 0.75 ? 1 : (1 - t) / 0.25);
    },
  };
}

/** Cura: cruzes verdes subindo, com brilhos. */
function heal(x: number, y: number): Animation {
  const sparkles = spellHit(x, y, 'cure');
  return {
    duration: HEAL_MS,
    draw: (term, t) => {
      const s = term.scene;
      if (!s) return;
      s.glow(x + 0.5, y + 0.6, 1.3, '#58e878', 0.38 * (1 - t));
      s.spr(K.fx('plus'), x, y, { f: Math.min(2, Math.floor(t * 3)), oy: -Math.round(t * 8), a: 1 - t * t });
      sparkles.draw(term, Math.min(1, (t * HEAL_MS) / sparkles.duration));
    },
  };
}

/** Transição de andar: o mapa é "desenhado" de cima para baixo. */
function wipe(): Animation {
  return { duration: WIPE_MS, draw: (term, t) => term.scene?.wipe(t) };
}

// ───────────────────────── agendamento ─────────────────────────

/**
 * Um passo da linha do tempo de um turno:
 *  - `seq`: segura a fila (o jogo espera);
 *  - `bg`: animações de fundo, lançadas neste ponto; seguram a fila só por `hold` ms.
 */
type Step = { kind: 'seq'; anim: Animation; shake?: number } | { kind: 'bg'; anims: Animation[]; hold: number; shake?: number };

interface Schedule {
  steps: Step[];
  /** Instante (ms, sem a velocidade) em que o efeito de cada evento começa, por índice do evento. */
  at: number[];
}

/**
 * Converte os eventos de um turno numa linha do tempo. É a fonte única de tempos: a fila de animações
 * e o estado visual do mapa (flash de golpe, fumaça de morte, avanço do atacante) usam o mesmo cálculo.
 */
export function schedule(events: GameEvent[]): Schedule {
  const steps: Step[] = [];
  const at: number[] = new Array(events.length).fill(0);
  let clock = 0;
  let group: Animation[] = [];
  let hold = 0;
  let groupIdx: number[] = [];
  let groupShake = 0;
  const flush = (): void => {
    for (const i of groupIdx) at[i] = clock;
    groupIdx = [];
    if (!group.length) return;
    steps.push({ kind: 'bg', anims: group, hold: Math.max(1, hold), shake: groupShake || undefined });
    clock += Math.max(1, hold);
    group = [];
    hold = 0;
    groupShake = 0;
  };
  const seq = (i: number, anim: Animation, sh?: number): void => {
    flush();
    at[i] = clock;
    steps.push({ kind: 'seq', anim, shake: sh });
    clock += anim.duration;
  };
  const bg = (i: number, anims: Animation[], h: number): void => {
    group.push(...anims);
    groupIdx.push(i);
    hold = Math.max(hold, h);
  };
  const crits = new Set<string>();
  for (const e of events) if (e.type === 'crit') crits.add(`${e.x},${e.y}`);
  const whirling = events.some((e) => e.type === 'whirl');

  events.forEach((e, i) => {
    switch (e.type) {
      case 'damage': {
        const crit = crits.has(`${e.x},${e.y}`);
        bg(i, [impact(e.x, e.y, e.toPlayer, crit), damageNumber(e.x, e.y, e.amount, e.toPlayer, crit)], crit ? HIT_HOLD_MS + 60 : HIT_HOLD_MS);
        if (crit) groupShake = 220;
        break;
      }
      case 'death':
        // a fumaça acompanha o golpe que matou (mesmo instante do último grupo/passo)
        groupIdx.push(i);
        break;
      case 'miss':
        bg(i, [missText(e.x, e.y)], MISS_HOLD_MS);
        break;
      case 'heal':
        bg(i, [heal(e.x, e.y)], 1);
        break;
      case 'spellHit':
        bg(i, [spellHit(e.x, e.y, e.effect, e.element)], 1);
        break;
      case 'shatter':
        bg(i, [shatter(e.x, e.y, css(e.color))], 1);
        break;
      case 'smoke':
        bg(i, [smoke(e.x, e.y)], 120);
        break;
      case 'crit':
        groupIdx.push(i);
        break;
      case 'spell':
        if (e.x !== undefined && e.y !== undefined) seq(i, castCircle(e.x, e.y, e.element));
        break;
      case 'melee':
        // no ataque giratório, o arco do giro substitui os golpes individuais
        if (!whirling) seq(i, meleeSwing(e.x, e.y, e.tx, e.ty, e.style, e.element, e.heavy), e.heavy ? 200 : 0);
        break;
      case 'projectile':
        seq(i, e.glyph === '*' ? magicMissile(e.path, e.from, e.element) : thrown(e.path, e.from, e.item, e.look));
        break;
      case 'bolt':
        seq(i, beam(e.path, e.from, e.element));
        break;
      case 'breath':
        seq(i, breath(e.path, e.from, e.element), 300);
        break;
      case 'explosion':
        seq(i, explosion(e.x, e.y, e.radius, e.element), e.radius >= 2 ? 240 : 0);
        break;
      case 'teleport':
        seq(i, teleport(e.x, e.y, e.tx, e.ty));
        break;
      case 'whirl':
        seq(i, whirl(e.x, e.y));
        break;
      case 'levelUp':
        seq(i, levelUp(e.x, e.y));
        break;
      case 'stairs':
        seq(i, wipe());
        break;
      case 'bossDeath': {
        flush();
        const a = explosion(e.x, e.y, 4, 'holy');
        const b = explosion(e.x, e.y, 2, 'fire');
        at[i] = clock;
        steps.push({ kind: 'seq', anim: a, shake: 500 }, { kind: 'seq', anim: b });
        clock += a.duration + b.duration;
        break;
      }
      default:
        break;
    }
  });
  flush();
  return { steps, at };
}

/**
 * Atualiza o estado visual (flash de dano, fantasmas de morte, avanço do atacante) com o que aconteceu
 * no turno, nos mesmos instantes das animações. Chamar ANTES de `playEvents`, que consome a lista.
 */
export function trackEvents(game: Game, state: SceneState, events: GameEvent[]): void {
  const { at } = schedule(events);
  const scale = state.instant ? 0 : 1 / Math.max(1, state.speed);
  const bosses = new Set<string>();
  for (const e of events) if (e.type === 'bossDeath') bosses.add(`${e.x},${e.y}`);
  events.forEach((e, i) => {
    const when = at[i] * scale;
    switch (e.type) {
      case 'damage': {
        const a = actorAt(game, e.x, e.y);
        if (a) state.hurt(a.id, e.toPlayer ? 220 : 160, when);
        break;
      }
      case 'death':
        if (!e.isPlayer) state.ghostAt(e.x, e.y, bosses.has(`${e.x},${e.y}`), when);
        break;
      case 'melee': {
        const a = actorAt(game, e.x, e.y);
        if (a) state.lunge(a.id, e.tx - e.x, e.ty - e.y, when, (e.heavy ? MELEE_MS + 60 : MELEE_MS) * scale, e.heavy);
        break;
      }
      default:
        break;
    }
  });
}

/** Converte os eventos de um turno em animações (consome a lista). */
export function playEvents(queue: AnimationQueue, events: GameEvent[]): void {
  const { steps } = schedule(events);
  for (const st of steps) {
    if (st.kind === 'bg') {
      const sh = st.shake;
      if (sh) {
        // o tremor começa junto com o golpe (quando a fila chega neste ponto)
        let shaken = false;
        st.anims.push({ duration: 1, draw: () => { if (!shaken) { shaken = true; shake.until = performance.now() + sh; } } });
      }
      queue.pushBackground(st.anims, st.hold);
    } else if (st.shake) {
      const sh = st.shake;
      const anim = st.anim;
      let shaken = false;
      queue.push({
        duration: anim.duration,
        draw: (term, t) => {
          if (!shaken) {
            shaken = true;
            shake.until = performance.now() + sh;
          }
          anim.draw(term, t);
        },
      });
    } else queue.push(st.anim);
  }
  events.length = 0;
}

/** Durações exportadas para testes e para o laboratório de efeitos. */
export const DURATIONS = { CAST_MS, MELEE_MS, BEAM_MS, BREATH_MS, SPELL_HIT_MS, TELEPORT_MS, SHATTER_MS, WHIRL_MS, SMOKE_MS, spellFlightMs };
