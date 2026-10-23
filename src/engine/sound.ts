import { SONGS } from '../data/music';
import { MUSIC_LEVEL, MusicEngine } from './music';
import { impulse } from './synth';

/**
 * Efeitos sonoros e trilha sintetizados com Web Audio (sem arquivos de som).
 * Os efeitos misturam osciladores e ruído filtrado (golpes, fogo, gelo, raios...); a trilha é composta
 * por região (`src/data/music.ts` + `MusicEngine`). O AudioContext só pode começar depois de uma
 * interação do usuário (regra dos navegadores).
 */
export type SoundName =
  | 'hit' | 'miss' | 'hurt' | 'kill' | 'levelUp' | 'pickup' | 'door' | 'stairs'
  | 'spell' | 'quaff' | 'read' | 'explosion' | 'death' | 'victory' | 'menu' | 'shoot'
  // golpes por estilo
  | 'slash' | 'pierce' | 'blunt' | 'claw' | 'bite' | 'whirl'
  // magias por elemento/efeito
  | 'fire' | 'cold' | 'lightning' | 'holy' | 'arcane' | 'acid' | 'shadow' | 'sleep' | 'slow' | 'haste' | 'shield' | 'heal'
  | 'teleport' | 'breath' | 'shatter' | 'smoke' | 'throw' | 'crit';

interface Note {
  freq: number;
  dur: number;
  type?: OscillatorType;
  /** Frequência final (desliza até ela). */
  slide?: number;
  gain?: number;
  delay?: number;
  /** Ataque em segundos (padrão: imediato). */
  attack?: number;
  /** Em vez de oscilador, ruído (branco ou marrom) passando por `filter`. */
  noise?: 'white' | 'brown';
  filter?: { type: BiquadFilterType; freq: number; to?: number; q?: number };
}

const swish = (from: number, to: number, dur: number, gain = 0.6, delay = 0): Note =>
  ({ freq: 0, dur, noise: 'white', filter: { type: 'bandpass', freq: from, to, q: 1.4 }, gain, attack: dur * 0.3, delay });
const thud = (f: number, dur: number, gain = 0.8, delay = 0): Note => ({ freq: f, slide: f * 0.45, dur, type: 'sine', gain, delay });

const SFX: Record<SoundName, Note[]> = {
  hit: [{ freq: 190, dur: 0.07, type: 'square', slide: 90, gain: 0.45 }, { freq: 0, dur: 0.08, noise: 'white', filter: { type: 'bandpass', freq: 900, q: 1 }, gain: 0.5 }],
  miss: [swish(900, 2600, 0.14, 0.35)],
  hurt: [{ freq: 150, dur: 0.15, type: 'sawtooth', slide: 65, gain: 0.5 }, { freq: 0, dur: 0.12, noise: 'brown', filter: { type: 'lowpass', freq: 700 }, gain: 0.9 }],
  kill: [thud(160, 0.18, 0.8), { freq: 300, dur: 0.06, type: 'square', gain: 0.3 }, { freq: 150, dur: 0.14, type: 'square', delay: 0.06, slide: 55, gain: 0.3 }],
  crit: [{ freq: 0, dur: 0.12, noise: 'white', filter: { type: 'highpass', freq: 2500 }, gain: 0.5 }, { freq: 1200, dur: 0.15, type: 'triangle', slide: 400, gain: 0.35 }],
  levelUp: [
    ...[523, 659, 784, 1047].map((f, i) => ({ freq: f, dur: 0.14, type: 'square' as OscillatorType, delay: i * 0.09, gain: 0.35 })),
    ...[1568, 2093, 2637].map((f, i) => ({ freq: f, dur: 0.3, type: 'sine' as OscillatorType, delay: 0.4 + i * 0.06, gain: 0.2 })),
  ],
  pickup: [{ freq: 880, dur: 0.05, type: 'square', gain: 0.3 }, { freq: 1320, dur: 0.07, type: 'square', delay: 0.05, gain: 0.3 }],
  // rangido de dobradiça + batida da porta
  door: [
    { freq: 95, dur: 0.28, type: 'sawtooth', slide: 150, gain: 0.25, filter: { type: 'lowpass', freq: 600 } } as Note,
    thud(90, 0.12, 0.6, 0.24),
  ],
  // passos descendo a escada
  stairs: [0, 1, 2, 3].map((i) => ({ freq: 0, dur: 0.07, noise: 'brown' as const, filter: { type: 'lowpass' as BiquadFilterType, freq: 500 - i * 70 }, gain: 1.4, delay: i * 0.13 })),
  spell: [{ freq: 400, dur: 0.25, type: 'sine', slide: 1200, gain: 0.4 }],
  quaff: [{ freq: 300, dur: 0.08, type: 'sine', slide: 520, gain: 0.5 }, { freq: 480, dur: 0.08, type: 'sine', delay: 0.1, slide: 720, gain: 0.5 }, { freq: 420, dur: 0.08, type: 'sine', delay: 0.2, slide: 640, gain: 0.4 }],
  read: [swish(2500, 4500, 0.2, 0.35), { freq: 700, dur: 0.2, type: 'triangle', slide: 950, gain: 0.3, delay: 0.1 }],
  explosion: [
    { freq: 0, dur: 0.7, noise: 'brown', filter: { type: 'lowpass', freq: 1400, to: 140 }, gain: 2.2 },
    thud(95, 0.5, 1),
  ],
  death: [392, 349, 311, 262, 196].map((f, i) => ({ freq: f, dur: 0.32, type: 'triangle' as OscillatorType, delay: i * 0.25, gain: 0.55 })),
  victory: [523, 659, 784, 659, 784, 1047].map((f, i) => ({ freq: f, dur: 0.2, type: 'square' as OscillatorType, delay: i * 0.15, gain: 0.35 })),
  menu: [{ freq: 660, dur: 0.03, type: 'square', gain: 0.2 }],
  // arco: estalo da corda + flecha cortando o ar
  shoot: [{ freq: 220, dur: 0.09, type: 'triangle', slide: 160, gain: 0.5 }, swish(1500, 4000, 0.12, 0.3, 0.02)],
  throw: [swish(700, 2000, 0.16, 0.35)],
  // golpes
  slash: [swish(1200, 5000, 0.13, 0.55)],
  pierce: [swish(2500, 3500, 0.07, 0.5), { freq: 1800, dur: 0.04, type: 'triangle', gain: 0.2, delay: 0.05 }],
  blunt: [swish(500, 1200, 0.1, 0.35), thud(130, 0.14, 0.9, 0.06)],
  claw: [0, 0.06, 0.12].map((d) => swish(2000, 4500, 0.06, 0.4, d)),
  bite: [{ freq: 0, dur: 0.03, noise: 'white', filter: { type: 'bandpass', freq: 1600, q: 2 }, gain: 0.6 }, { freq: 0, dur: 0.04, noise: 'white', filter: { type: 'bandpass', freq: 1200, q: 2 }, gain: 0.7, delay: 0.07 }],
  whirl: [swish(600, 3500, 0.3, 0.6), swish(3500, 900, 0.25, 0.4, 0.22)],
  // magias
  fire: [{ freq: 0, dur: 0.5, noise: 'brown', filter: { type: 'bandpass', freq: 350, to: 1600, q: 0.8 }, gain: 2, attack: 0.08 }, { freq: 0, dur: 0.35, noise: 'white', filter: { type: 'highpass', freq: 3000 }, gain: 0.15, delay: 0.1 }],
  cold: [
    ...[1760, 2349, 2637, 3136].map((f, i) => ({ freq: f, dur: 0.25, type: 'sine' as OscillatorType, gain: 0.2, delay: i * 0.05 })),
    { freq: 0, dur: 0.4, noise: 'white', filter: { type: 'highpass', freq: 6000 }, gain: 0.25, attack: 0.1 },
  ],
  lightning: [{ freq: 0, dur: 0.3, noise: 'white', filter: { type: 'highpass', freq: 1800 }, gain: 0.7 }, { freq: 70, dur: 0.25, type: 'sawtooth', gain: 0.35, slide: 55 }],
  holy: [523, 659, 784, 1047].map((f) => ({ freq: f, dur: 0.9, type: 'sine' as OscillatorType, gain: 0.18, attack: 0.05 })),
  arcane: [{ freq: 400, dur: 0.25, type: 'sine', slide: 1200, gain: 0.4 }, { freq: 600, dur: 0.25, type: 'triangle', slide: 1800, gain: 0.2 }],
  acid: [0, 0.07, 0.14].map((d, i) => ({ freq: 280 + i * 60, dur: 0.06, type: 'sine' as OscillatorType, slide: 700 + i * 80, gain: 0.45, delay: d })),
  shadow: [{ freq: 220, dur: 0.5, type: 'sawtooth', slide: 90, gain: 0.3, filter: { type: 'lowpass', freq: 600 } } as Note, { freq: 0, dur: 0.5, noise: 'brown', filter: { type: 'lowpass', freq: 300 }, gain: 1, attack: 0.15 }],
  sleep: [660, 550, 440].map((f, i) => ({ freq: f, dur: 0.3, type: 'triangle' as OscillatorType, gain: 0.3, delay: i * 0.18 })),
  slow: [{ freq: 440, dur: 0.6, type: 'sine', slide: 180, gain: 0.4 }],
  haste: [0, 0.1].map((d) => ({ freq: 440, dur: 0.12, type: 'triangle' as OscillatorType, slide: 1400, gain: 0.35, delay: d })),
  shield: [{ freq: 520, dur: 0.5, type: 'sine', gain: 0.3, attack: 0.08 }, { freq: 780, dur: 0.5, type: 'sine', gain: 0.2, attack: 0.08 }],
  heal: [523, 659, 784, 1047].map((f, i) => ({ freq: f, dur: 0.25, type: 'sine' as OscillatorType, gain: 0.25, delay: i * 0.06 })),
  teleport: [{ freq: 300, dur: 0.22, type: 'sine', slide: 1800, gain: 0.35 }, { freq: 1800, dur: 0.22, type: 'sine', slide: 300, gain: 0.3, delay: 0.24 }],
  // sopro de dragão: rugido grave e chiado
  breath: [{ freq: 0, dur: 0.8, noise: 'brown', filter: { type: 'lowpass', freq: 500, to: 2200 }, gain: 2.4, attack: 0.1 }, { freq: 80, dur: 0.6, type: 'sawtooth', slide: 60, gain: 0.3 }],
  shatter: [{ freq: 0, dur: 0.12, noise: 'white', filter: { type: 'highpass', freq: 4000 }, gain: 0.5 }, ...[2600, 3300, 4100].map((f, i) => ({ freq: f, dur: 0.12, type: 'sine' as OscillatorType, gain: 0.2, delay: 0.02 + i * 0.03 }))],
  smoke: [{ freq: 0, dur: 0.5, noise: 'brown', filter: { type: 'lowpass', freq: 900 }, gain: 1.2, attack: 0.12 }],
};

/** Som de cada elemento de magia (o que não estiver aqui usa 'arcane'). */
export const ELEMENT_SOUND: Record<string, SoundName> = {
  fire: 'fire', cold: 'cold', lightning: 'lightning', holy: 'holy', arcane: 'arcane', acid: 'acid', poison: 'acid',
  shadow: 'shadow', fear: 'shadow', sleep: 'sleep', slow: 'slow', haste: 'haste', shield: 'shield',
  heal: 'heal', cure: 'heal', teleport: 'teleport', blink: 'teleport', earth: 'blunt', dig: 'blunt', detect: 'read', mapping: 'read',
};

export class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxSend: GainNode | null = null;
  private white: AudioBuffer | null = null;
  private brown: AudioBuffer | null = null;
  private engine: MusicEngine | null = null;
  private theme = 'title';
  private intensity = 0;
  sfxVolume = 0.5;
  /** Volume da música, 0–1. */
  musicVolume = 0.5;
  musicOn = true;

  /** Chamar numa interação do usuário (keydown/click). */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.connect(ctx.destination);
      // Eco dos efeitos: muda com a região (cripta ecoa mais que as minas).
      const room = ctx.createConvolver();
      room.buffer = impulse(ctx, 2.2, 2.8);
      this.sfxSend = ctx.createGain();
      this.master.connect(this.sfxSend);
      this.sfxSend.connect(room);
      room.connect(ctx.destination);
      this.musicGain = ctx.createGain();
      this.musicGain.connect(ctx.destination);
      this.engine = new MusicEngine(ctx, this.musicGain);
      this.white = this.engine.synth.white;
      this.brown = this.engine.synth.brown;
      this.applyVolumes();
      this.setMusicTheme(this.theme);
      window.setInterval(() => this.tick(), 250);
      this.tick();
    } catch {
      this.ctx = null;
    }
  }

  private tick(): void {
    if (!this.ctx || !this.engine || !this.musicOn) return;
    this.engine.intensity = this.intensity;
    this.engine.scheduleUntil(this.ctx.currentTime + 1.2);
  }

  applyVolumes(): void {
    if (this.master) this.master.gain.value = this.sfxVolume * 0.3;
    if (this.musicGain) this.musicGain.gain.value = this.musicOn ? this.musicVolume * MUSIC_LEVEL : 0;
  }

  /** Toca um efeito, opcionalmente daqui a `delayMs` (para coincidir com a animação). */
  play(name: SoundName, delayMs = 0): void {
    if (!this.ctx || !this.master || this.sfxVolume <= 0) return;
    for (const n of SFX[name]) this.tone(n, this.master, delayMs / 1000);
  }

  private tone(n: Note, dest: AudioNode, extra: number): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + extra + (n.delay ?? 0);
    const g = ctx.createGain();
    const peak = n.gain ?? 0.7;
    if (n.attack) {
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + n.attack);
    } else g.gain.setValueAtTime(peak, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + n.dur);
    let src: AudioScheduledSourceNode;
    if (n.noise) {
      const s = ctx.createBufferSource();
      s.buffer = n.noise === 'white' ? this.white : this.brown;
      src = s;
      s.start(t0, ((t0 * 7.31) % 1) * Math.max(0, (s.buffer?.duration ?? 1) - n.dur - 0.05));
    } else {
      const osc = ctx.createOscillator();
      osc.type = n.type ?? 'square';
      osc.frequency.setValueAtTime(n.freq, t0);
      if (n.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, n.slide), t0 + n.dur);
      src = osc;
      osc.start(t0);
    }
    let head: AudioNode = src;
    if (n.filter) {
      const f = ctx.createBiquadFilter();
      f.type = n.filter.type;
      f.frequency.setValueAtTime(n.filter.freq, t0);
      if (n.filter.to) f.frequency.exponentialRampToValueAtTime(n.filter.to, t0 + n.dur);
      f.Q.value = n.filter.q ?? 0.7;
      src.connect(f);
      head = f;
    }
    head.connect(g);
    g.connect(dest);
    src.stop(t0 + n.dur + 0.03);
  }

  /** Troca a música (ao mudar de região, voltar ao título, morrer, vencer). */
  setMusicTheme(theme: string): void {
    this.theme = SONGS[theme] ? theme : 'title';
    if (this.sfxSend) this.sfxSend.gain.value = SONGS[this.theme].sfxReverb;
    this.engine?.play(this.theme);
  }

  /** 0–1: perigo por perto (liga a percussão de tensão a partir do próximo compasso). */
  setIntensity(v: number): void {
    this.intensity = Math.max(0, Math.min(1, v));
  }
}

export const sound = new SoundManager();
