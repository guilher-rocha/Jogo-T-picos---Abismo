import type { DrumId, InstrumentId, SongDef, SongLayer, Voicing } from '../data/music';
import { RNG } from './rng';

/**
 * Compositor: transforma a descrição de uma música (`src/data/music.ts`) em notas, um compasso por vez.
 * É determinístico (o compasso N de uma música é sempre igual) e não depende de áudio — dá para testar no Node.
 *
 * A melodia é feita de frases de 4 compassos com dois motivos alternados (A B A B...): cada motivo é um
 * contorno sorteado uma vez e reaproveitado, então a música tem repetição, como uma melodia de verdade.
 * As notas fortes caem nas notas do acorde; o último compasso da frase termina na tônica (cadência).
 */

export interface MusicNote {
  /** Início, em segundos a partir do começo do compasso. */
  t: number;
  dur: number;
  midi: number;
  inst: InstrumentId;
  gain: number;
}

export interface MusicHit {
  t: number;
  drum: DrumId;
  gain: number;
}

export interface Bar {
  notes: MusicNote[];
  hits: MusicHit[];
  /** Duração do compasso em segundos. */
  seconds: number;
}

export const barSeconds = (s: SongDef): number => (s.beats * 60) / s.bpm;

/** Nota MIDI de um grau da escala (graus negativos ou acima de 7 mudam de oitava). */
export function midiOf(song: SongDef, degree: number, octave: number): number {
  const n = song.mode.length;
  const o = Math.floor(degree / n);
  return song.root + 12 * (octave + o) + song.mode[degree - o * n];
}

/** Grau do acorde de um compasso. */
export const chordAt = (song: SongDef, bar: number): number => song.chords[((bar % song.chords.length) + song.chords.length) % song.chords.length];

/** Graus das notas de um acorde. */
export function chordTones(n: number, deg: number, voicing: Voicing): number[] {
  switch (voicing) {
    case 'triad': return [deg, deg + 2, deg + 4];
    case 'open': return [deg, deg + 4, deg + 2 + n];
    case 'power': return [deg, deg + 4, deg + n];
    case 'cluster': return [deg, deg + 1, deg + 4];
  }
}

/** k-ésima nota do acorde em arpejo: 0 tônica, 1 terça, 2 quinta, 3 oitava, 4 décima... */
const arpTone = (n: number, deg: number, k: number): number => deg + [0, 2, 4][k % 3] + n * Math.floor(k / 3);

const BASS_STEP: Record<string, (n: number) => number> = {
  '1': () => 0, '2': () => 1, '3': () => 2, '5': () => 4, '7': () => 6, '8': (n) => n,
};

/** Posições tocadas de um padrão ("x..x" → [0, 3]). */
const onsets = (pattern: string, chars: string): number[] => [...pattern].flatMap((c, i) => (chars.includes(c) ? [i] : []));

/** Passos até a próxima nota (para saber quanto cada nota dura). */
const gapAfter = (list: number[], k: number, steps: number): number => (list[k + 1] ?? steps) - list[k];

/** Nota do acorde mais próxima (em graus relativos à tônica do acorde). */
function snapToChord(rel: number, n: number): number {
  const tones = [-n, -n + 2, -n + 4, 0, 2, 4, n, n + 2, n + 4];
  let best = tones[0];
  for (const t of tones) if (Math.abs(t - rel) < Math.abs(best - rel)) best = t;
  return best;
}

function melodyBar(song: SongDef, L: Extract<SongLayer, { type: 'melody' }>, li: number, bar: number, deg: number, stepSec: number, gain: number): MusicNote[] {
  const n = song.mode.length;
  const phrase = Math.floor(bar / 4);
  const pos = bar % 4;
  const beatSteps = song.steps / song.beats;
  // O motivo depende só de (A ou B, posição na frase): repete igual a cada duas frases.
  const r = new RNG(`${song.id}|mel|${li}|${phrase % 2}|${pos}`);
  // Pequenas variações quando a frase volta (sorteadas pelo compasso real).
  const vary = new RNG(`${song.id}|var|${li}|${bar}`);
  const rhythm = L.rhythms[r.int(0, L.rhythms.length - 1)];
  const at = onsets(rhythm, 'xX');
  const out: MusicNote[] = [];
  let rel = r.pick([0, 2, 4]);
  at.forEach((i, k) => {
    if (k > 0) rel += r.pick([-2, -1, -1, 1, 1, 2, 0, 3]);
    if (i % beatSteps === 0) rel = snapToChord(rel, n);
    rel = Math.max(-3, Math.min(n + 4, rel));
    const pause = r.next() < (L.rest ?? 0);
    const last = k === at.length - 1;
    let use = rel;
    if (phrase >= 2 && vary.next() < 0.2) use = rel + vary.pick([-1, 1, 2]);
    if (pos === 3 && last) use = rel > n / 2 ? n : 0; // cadência na tônica do acorde
    else if (pause) return;
    const dur = Math.min(gapAfter(at, k, song.steps), beatSteps * 2) * stepSec * (last ? 1.6 : 1.1);
    out.push({ t: i * stepSec, dur, midi: midiOf(song, deg + use, L.octave), inst: L.inst, gain: gain * (i % beatSteps === 0 ? 1 : 0.82) });
  });
  return out;
}

/**
 * Notas e batidas do compasso `bar`. `intensity` (0–1) liga as camadas de tensão (`combat`) quando há
 * monstros caçando o jogador.
 */
export function composeBar(song: SongDef, bar: number, intensity = 0): Bar {
  const n = song.mode.length;
  const seconds = barSeconds(song);
  const stepSec = seconds / song.steps;
  const beatSteps = song.steps / song.beats;
  const deg = chordAt(song, bar);
  const notes: MusicNote[] = [];
  const hits: MusicHit[] = [];
  song.layers.forEach((L, li) => {
    if (L.combat && intensity < 0.5) return;
    const every = L.every ?? 1;
    if (bar % every !== (L.offset ?? 0) % every) return;
    const gain = L.gain * (L.combat ? Math.min(1, intensity) : 1);
    switch (L.type) {
      case 'chord': {
        const dur = (L.hold ?? every) * seconds;
        for (const d of chordTones(n, deg, L.voicing)) notes.push({ t: 0, dur, midi: midiOf(song, d, L.octave), inst: L.inst, gain });
        break;
      }
      case 'bass': {
        const at = onsets(L.pattern, Object.keys(BASS_STEP).join(''));
        at.forEach((i, k) => {
          const off = BASS_STEP[L.pattern[i]](n);
          notes.push({
            t: i * stepSec, dur: gapAfter(at, k, song.steps) * stepSec * 0.95, midi: midiOf(song, deg + off, L.octave),
            inst: L.inst, gain: gain * (i % beatSteps === 0 ? 1 : 0.8),
          });
        });
        break;
      }
      case 'arp': {
        const at = onsets(L.pattern, 'xX');
        at.forEach((i, k) => {
          notes.push({
            t: i * stepSec, dur: Math.min(gapAfter(at, k, song.steps), 4) * stepSec * 1.5,
            midi: midiOf(song, arpTone(n, deg, L.order[k % L.order.length]), L.octave), inst: L.inst,
            gain: gain * (i % beatSteps === 0 ? 1 : 0.75),
          });
        });
        break;
      }
      case 'melody':
        notes.push(...melodyBar(song, L, li, bar, deg, stepSec, gain));
        break;
      case 'drum': {
        const rng = new RNG(`${song.id}|drum|${li}|${bar}`);
        for (const i of onsets(L.pattern, 'xXo')) {
          if (L.chance !== undefined && rng.next() >= L.chance) continue;
          const c = L.pattern[i];
          hits.push({ t: i * stepSec, drum: L.drum, gain: gain * (c === 'X' ? 1.25 : c === 'o' ? 0.55 : 1) });
        }
        break;
      }
    }
  });
  return { notes, hits, seconds };
}
