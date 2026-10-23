import type { AmbienceId, DrumId, InstrumentId } from '../data/music';

/**
 * Sintetizador da trilha (Web Audio, sem arquivos de som): instrumentos, percussão e sons de fundo
 * montados com osciladores, ruído e filtros. Funciona com AudioContext (jogo) e OfflineAudioContext
 * (para renderizar e analisar as músicas fora do jogo).
 */

export const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

/** Gerador pseudoaleatório simples para ruído e variações de timbre (o áudio não usa Math.random). */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function noiseBuffer(ctx: BaseAudioContext, seconds: number, kind: 'white' | 'brown', seed: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  const rnd = lcg(seed);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = rnd() * 2 - 1;
    if (kind === 'white') d[i] = w;
    else {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
  }
  return buf;
}

/** Resposta ao impulso de uma sala (ruído estéreo decaindo): o reverb. */
export function impulse(ctx: BaseAudioContext, seconds = 3, decay = 2.4): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    const rnd = lcg(91 + ch * 7);
    for (let i = 0; i < len; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

export interface Ambience {
  stop(t: number): void;
}

export class Synth {
  readonly white: AudioBuffer;
  readonly brown: AudioBuffer;
  private rnd = lcg(7);

  constructor(readonly ctx: BaseAudioContext) {
    this.white = noiseBuffer(ctx, 2, 'white', 11);
    this.brown = noiseBuffer(ctx, 4, 'brown', 23);
  }

  // ───────────── blocos ─────────────

  private osc(type: OscillatorType, freq: number, t0: number, t1: number, detune = 0): OscillatorNode {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (detune) o.detune.setValueAtTime(detune, t0);
    o.start(t0);
    o.stop(t1);
    return o;
  }

  private gain(v = 1): GainNode {
    const g = this.ctx.createGain();
    g.gain.value = v;
    return g;
  }

  private filter(type: BiquadFilterType, freq: number, q = 0.7): BiquadFilterNode {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  }

  private noise(buf: AudioBuffer, t0: number, t1: number, loop = false): AudioBufferSourceNode {
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.loop = loop;
    // começa num ponto diferente do buffer a cada vez (o ruído não soa "carimbado")
    s.start(t0, loop ? 0 : this.rnd() * Math.max(0, buf.duration - (t1 - t0) - 0.01));
    s.stop(t1);
    return s;
  }

  /** Envelope: sobe em `a`, cai para `s` (fração) com constante `d`, solta em `r` depois de `dur`. */
  private env(g: GainNode, t0: number, peak: number, a: number, d: number, s: number, dur: number, r: number): number {
    const p = g.gain;
    p.setValueAtTime(0.0001, t0);
    p.linearRampToValueAtTime(peak, t0 + a);
    if (s < 1) p.setTargetAtTime(Math.max(0.0001, peak * s), t0 + a, d);
    const off = t0 + Math.max(a, dur);
    p.setTargetAtTime(0.0001, off, r / 4);
    return off + r * 1.3;
  }

  /** Envelope percussivo: ataque curto e decaimento exponencial. */
  private hitEnv(g: GainNode, t0: number, peak: number, a: number, tc: number): number {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + a);
    g.gain.setTargetAtTime(0.0001, t0 + a, tc);
    return t0 + a + tc * 7;
  }

  // ───────────── instrumentos ─────────────

  note(inst: InstrumentId, midi: number, t0: number, dur: number, gain: number, dest: AudioNode): void {
    const f = mtof(midi);
    const out = this.gain(1);
    out.connect(dest);
    switch (inst) {
      case 'organ': {
        // órgão de tubos: fundamental + harmônicos, com leve trêmulo
        const end = this.env(out, t0, gain * 0.28, 0.06, 0.3, 0.85, dur, 0.4);
        const lp = this.filter('lowpass', 2600);
        lp.connect(out);
        [1, 2, 3, 4].forEach((h, i) => {
          const g = this.gain([1, 0.45, 0.22, 0.1][i]);
          this.osc('sine', f * h, t0, end).connect(g);
          g.connect(lp);
        });
        break;
      }
      case 'pad': {
        // cordas sintéticas: dois dentes-de-serra desafinados + triângulo grave, filtro que abre e fecha
        const end = this.env(out, t0, gain * 0.12, Math.min(0.9, dur * 0.4), 0.5, 0.9, dur, 1.3);
        const lp = this.filter('lowpass', 600, 0.6);
        lp.frequency.setValueAtTime(600, t0);
        lp.frequency.linearRampToValueAtTime(1500, t0 + dur * 0.5);
        lp.frequency.linearRampToValueAtTime(700, t0 + dur + 1);
        lp.connect(out);
        this.osc('sawtooth', f, t0, end, -8).connect(lp);
        this.osc('sawtooth', f, t0, end, 8).connect(lp);
        const tri = this.gain(0.3);
        this.osc('triangle', f / 2, t0, end).connect(tri);
        tri.connect(lp);
        break;
      }
      case 'glass': {
        // vidro: senoides quase harmônicas (batimento lento), ataque suave
        const end = this.env(out, t0, gain * 0.3, 0.35, 0.8, 0.7, dur, 1.6);
        this.osc('sine', f, t0, end).connect(out);
        const g2 = this.gain(0.3);
        this.osc('sine', f * 2.003, t0, end).connect(g2);
        g2.connect(out);
        const g3 = this.gain(0.08);
        this.osc('sine', f * 3.01, t0, end).connect(g3);
        g3.connect(out);
        break;
      }
      case 'choir': {
        // coro "aaah": três vozes desafinadas passando por filtros de formante, com vibrato
        const end = this.env(out, t0, gain * 1.1, Math.min(1, dur * 0.45), 0.6, 0.85, dur, 1.6);
        const sum = this.gain(1);
        for (const [fr, q, a] of [[800, 6, 1], [1150, 7, 0.7], [2900, 8, 0.25]] as const) {
          const bp = this.filter('bandpass', fr, q);
          const g = this.gain(a);
          sum.connect(bp);
          bp.connect(g);
          g.connect(out);
        }
        const lfo = this.osc('sine', 5, t0, end);
        const depth = this.gain(6);
        lfo.connect(depth);
        for (const det of [-10, 0, 10]) {
          const o = this.osc('sawtooth', f, t0, end, det);
          depth.connect(o.detune);
          o.connect(sum);
        }
        break;
      }
      case 'bell': {
        // sino (FM): portadora + moduladora em 3,5× cujo índice cai — o brilho do ataque some e fica o tom
        const end = this.hitEnv(out, t0, gain * 0.6, 0.004, 0.75);
        const car = this.osc('sine', f, t0, end);
        const mod = this.osc('sine', f * 3.5, t0, end);
        const idx = this.gain(0);
        idx.gain.setValueAtTime(f * 1.8, t0);
        idx.gain.setTargetAtTime(f * 0.1, t0, 0.35);
        mod.connect(idx);
        idx.connect(car.frequency);
        car.connect(out);
        break;
      }
      case 'pluck': {
        // corda dedilhada: triângulo + quadrada, filtro fechando rápido
        const end = this.hitEnv(out, t0, gain * 0.5, 0.004, 0.2);
        const lp = this.filter('lowpass', 3000, 1.2);
        lp.frequency.setValueAtTime(3200, t0);
        lp.frequency.setTargetAtTime(500, t0, 0.08);
        lp.connect(out);
        this.osc('triangle', f, t0, end).connect(lp);
        const sq = this.gain(0.18);
        this.osc('square', f, t0, end).connect(sq);
        sq.connect(lp);
        break;
      }
      case 'harp': {
        const end = this.hitEnv(out, t0, gain * 0.55, 0.005, 0.5);
        const lp = this.filter('lowpass', 3500);
        lp.connect(out);
        this.osc('triangle', f, t0, end).connect(lp);
        const h = this.gain(0.25);
        this.osc('sine', f * 2, t0, end).connect(h);
        h.connect(lp);
        break;
      }
      case 'kalimba': {
        // lamelofone: fundamental + parcial inarmônico que some depressa
        const end = this.hitEnv(out, t0, gain * 0.5, 0.003, 0.32);
        this.osc('sine', f, t0, end).connect(out);
        const p = this.gain(0);
        p.gain.setValueAtTime(0.25, t0);
        p.gain.setTargetAtTime(0.0001, t0, 0.04);
        this.osc('sine', f * 5.4, t0, Math.min(end, t0 + 0.4)).connect(p);
        p.connect(out);
        break;
      }
      case 'bass': {
        const end = this.env(out, t0, gain * 0.55, 0.01, 0.15, 0.6, dur, 0.12);
        const lp = this.filter('lowpass', 700);
        lp.connect(out);
        this.osc('triangle', f, t0, end).connect(lp);
        const s = this.gain(0.6);
        this.osc('sine', f, t0, end).connect(s);
        s.connect(lp);
        break;
      }
      case 'sub': {
        const end = this.env(out, t0, gain * 0.6, 0.25, 0.5, 0.9, dur, 0.8);
        this.osc('sine', f, t0, end).connect(out);
        break;
      }
      case 'lead': {
        // voz solista: quadrada filtrada com vibrato que entra depois do ataque
        const end = this.env(out, t0, gain * 0.3, 0.04, 0.3, 0.7, dur, 0.3);
        const lp = this.filter('lowpass', 1600, 2);
        lp.connect(out);
        const o = this.osc('square', f, t0, end);
        const lfo = this.osc('sine', 5.5, t0, end);
        const depth = this.gain(0);
        depth.gain.setValueAtTime(0, t0);
        depth.gain.linearRampToValueAtTime(14, t0 + 0.4);
        lfo.connect(depth);
        depth.connect(o.detune);
        o.connect(lp);
        break;
      }
    }
  }

  // ───────────── percussão ─────────────

  drum(id: DrumId, t0: number, gain: number, dest: AudioNode): void {
    const out = this.gain(1);
    out.connect(dest);
    const sweep = (type: OscillatorType, f0: number, f1: number, tc: number, peak: number, a = 0.002): void => {
      const g = this.gain(0);
      const end = this.hitEnv(g, t0, peak, a, tc);
      const o = this.osc(type, f0, t0, end);
      o.frequency.exponentialRampToValueAtTime(f1, t0 + tc * 2);
      o.connect(g);
      g.connect(out);
    };
    const burst = (buf: AudioBuffer, type: BiquadFilterType, freq: number, q: number, tc: number, peak: number, at = t0, a = 0.002): void => {
      const g = this.gain(0);
      const end = this.hitEnv(g, at, peak, a, tc);
      const f = this.filter(type, freq, q);
      this.noise(buf, at, end).connect(f);
      f.connect(g);
      g.connect(out);
    };
    const partials = (freqs: number[], amps: number[], tc: number, peak: number, at = t0): void => {
      freqs.forEach((fr, i) => {
        const g = this.gain(0);
        const end = this.hitEnv(g, at, peak * amps[i], 0.002, tc * (1 - i * 0.12));
        this.osc('sine', fr, at, end).connect(g);
        g.connect(out);
      });
    };
    const v = this.rnd();
    switch (id) {
      case 'kick':
        sweep('sine', 130, 45, 0.09, gain * 0.9);
        break;
      case 'tom':
        sweep('sine', 170, 95, 0.13, gain * 0.7);
        burst(this.white, 'bandpass', 400, 1, 0.03, gain * 0.25);
        break;
      case 'wardrum':
        sweep('sine', 78, 42, 0.32, gain * 1.1, 0.004);
        burst(this.brown, 'lowpass', 220, 0.7, 0.3, gain * 0.7);
        burst(this.white, 'bandpass', 1100, 1.4, 0.03, gain * 0.35); // couro do tambor
        break;
      case 'hat':
        burst(this.white, 'highpass', 7000, 0.7, 0.025, gain * 0.5);
        break;
      case 'shaker':
        burst(this.white, 'bandpass', 5500, 1, 0.04, gain * 0.5, t0, 0.015);
        break;
      case 'clink': {
        // picareta na pedra: parciais metálicos curtos + estalo
        const k = 0.94 + v * 0.12;
        partials([2240 * k, 3170 * k, 4480 * k], [1, 0.6, 0.3], 0.07, gain * 0.35);
        burst(this.white, 'highpass', 3000, 0.7, 0.01, gain * 0.4);
        break;
      }
      case 'anvil':
        partials([1180, 1810, 2740, 3600], [1, 0.7, 0.45, 0.25], 0.3, gain * 0.25);
        break;
      case 'drip': {
        // gota: senoide que sobe rápido (o "plic" da água)
        const f0 = 650 + v * 600;
        sweep('sine', f0, f0 * 2.3, 0.035, gain * 0.5, 0.001);
        break;
      }
      case 'bubble': {
        const f0 = 230 + v * 260;
        sweep('sine', f0, f0 * 2.6, 0.045, gain * 0.45, 0.01);
        break;
      }
      case 'chain':
        for (let k = 0; k < 3; k++) {
          const at = t0 + k * (0.04 + v * 0.02);
          burst(this.white, 'bandpass', 3200 + k * 300, 4, 0.02, gain * 0.5, at);
          partials([2600 + k * 170], [1], 0.03, gain * 0.15, at);
        }
        break;
      case 'gong':
        partials([98, 98 * 1.47, 98 * 2.09, 98 * 2.56, 98 * 3.42], [1, 0.6, 0.45, 0.3, 0.2], 1.4, gain * 0.35);
        break;
    }
  }

  // ───────────── fundo contínuo ─────────────

  ambience(id: AmbienceId, level: number, t0: number, dest: AudioNode): Ambience {
    const out = this.gain(0);
    out.gain.setValueAtTime(0, t0);
    out.gain.linearRampToValueAtTime(level, t0 + 3);
    out.connect(dest);
    const stops: AudioScheduledSourceNode[] = [];
    const far = t0 + 36000;
    const lfoTo = (param: AudioParam, rate: number, depth: number): void => {
      const lfo = this.osc('sine', rate, t0, far);
      const d = this.gain(depth);
      lfo.connect(d);
      d.connect(param);
      stops.push(lfo);
    };
    const src = (buf: AudioBuffer): AudioBufferSourceNode => {
      const s = this.noise(buf, t0, far, true);
      stops.push(s);
      return s;
    };
    switch (id) {
      case 'wind': {
        // vento: ruído num filtro passa-banda que passeia devagar, com rajadas
        const bp = this.filter('bandpass', 520, 1.1);
        lfoTo(bp.frequency, 0.06, 260);
        const g = this.gain(0.5);
        lfoTo(g.gain, 0.13, 0.35);
        src(this.white).connect(bp);
        bp.connect(g);
        g.connect(out);
        break;
      }
      case 'cave': {
        const lp = this.filter('lowpass', 280);
        src(this.brown).connect(lp);
        lp.connect(out);
        break;
      }
      case 'water': {
        // água: ruído grave em ondas lentas
        const lp = this.filter('lowpass', 650, 0.5);
        const g = this.gain(0.6);
        lfoTo(g.gain, 0.09, 0.4);
        src(this.brown).connect(lp);
        lp.connect(g);
        g.connect(out);
        break;
      }
      case 'rumble': {
        const lp = this.filter('lowpass', 95, 0.8);
        const g = this.gain(1.2);
        lfoTo(g.gain, 0.05, 0.6);
        src(this.brown).connect(lp);
        lp.connect(g);
        g.connect(out);
        break;
      }
    }
    return {
      stop: (t: number) => {
        out.gain.cancelScheduledValues(t);
        out.gain.setTargetAtTime(0, t, 0.6);
        for (const s of stops) {
          try {
            s.stop(t + 4);
          } catch {
            /* já parado */
          }
        }
      },
    };
  }
}
