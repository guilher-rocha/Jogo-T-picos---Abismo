import type { SongDef } from '../data/music';
import { SONGS } from '../data/music';
import { composeBar } from './compose';
import type { Ambience } from './synth';
import { Synth, impulse } from './synth';

/**
 * Toca a trilha: agenda os compassos com antecedência no relógio do áudio (sem atrasos do navegador),
 * faz a transição suave entre músicas (uma some enquanto a outra entra) e liga as camadas de tensão
 * quando há perigo. Funciona com AudioContext ou OfflineAudioContext.
 */

interface Player {
  song: SongDef;
  /** Volume desta música (para a transição). */
  bus: GainNode;
  /** Entrada das notas (filtro de "abafamento" da região). */
  input: AudioNode;
  nextBar: number;
  bar: number;
  ambience: Ambience[];
  stopping: boolean;
  stopAt: number;
  nodes: AudioNode[];
}

export class MusicEngine {
  readonly synth: Synth;
  private reverb: ConvolverNode;
  private comp: DynamicsCompressorNode;
  private players: Player[] = [];
  /** 0–1: liga as camadas de tensão (monstros caçando o jogador). Vale a partir do próximo compasso. */
  intensity = 0;

  constructor(private ctx: BaseAudioContext, out: AudioNode) {
    this.synth = new Synth(ctx);
    // Compressor no fim: segura picos quando várias camadas somam.
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -20;
    this.comp.ratio.value = 3;
    this.comp.attack.value = 0.01;
    this.comp.release.value = 0.3;
    this.comp.connect(out);
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = impulse(ctx, 3.2, 2.3);
    this.reverb.connect(this.comp);
  }

  /** Música tocando agora (a que não está saindo). */
  get current(): string | null {
    return this.players.find((p) => !p.stopping)?.song.id ?? null;
  }

  /** Troca de música com transição de `fade` segundos (não faz nada se já é a atual). */
  play(id: string, fade = 2.5): void {
    const song = SONGS[id] ?? SONGS.title;
    const now = this.ctx.currentTime;
    const cur = this.players.find((p) => !p.stopping);
    if (cur?.song.id === song.id) return;
    if (cur) this.fadeOut(cur, now, fade);
    this.players.push(this.makePlayer(song, now + 0.05, fade));
  }

  /** Para tudo (com transição). */
  stop(fade = 1.5): void {
    const now = this.ctx.currentTime;
    for (const p of this.players) if (!p.stopping) this.fadeOut(p, now, fade);
  }

  private makePlayer(song: SongDef, t0: number, fade: number): Player {
    const ctx = this.ctx;
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0.0001, t0);
    bus.gain.linearRampToValueAtTime(song.level, t0 + Math.max(0.05, fade));
    bus.connect(this.comp);
    const send = ctx.createGain();
    send.gain.value = song.reverb;
    bus.connect(send);
    send.connect(this.reverb);
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = song.tone;
    tone.Q.value = 0.5;
    tone.connect(bus);
    const nodes: AudioNode[] = [bus, send, tone];
    if (song.echo) {
      // eco rítmico: atraso com realimentação e um filtro no laço (cada repetição mais escura)
      const delay = ctx.createDelay(4);
      delay.delayTime.value = (song.echo.beats * 60) / song.bpm;
      const fb = ctx.createGain();
      fb.gain.value = song.echo.feedback;
      const dark = ctx.createBiquadFilter();
      dark.type = 'lowpass';
      dark.frequency.value = 2200;
      const mix = ctx.createGain();
      mix.gain.value = song.echo.mix;
      tone.connect(mix);
      mix.connect(delay);
      delay.connect(dark);
      dark.connect(fb);
      fb.connect(delay);
      dark.connect(bus);
      nodes.push(delay, fb, dark, mix);
    }
    const ambience = song.ambience.map((a) => this.synth.ambience(a.id, a.gain, t0, bus));
    return { song, bus, input: tone, nextBar: t0, bar: 0, ambience, stopping: false, stopAt: Infinity, nodes };
  }

  private fadeOut(p: Player, now: number, fade: number): void {
    p.stopping = true;
    p.stopAt = now + fade;
    p.bus.gain.cancelScheduledValues(now);
    p.bus.gain.setValueAtTime(Math.max(0.0001, p.bus.gain.value), now);
    p.bus.gain.linearRampToValueAtTime(0.0001, now + fade);
    for (const a of p.ambience) a.stop(now + fade);
  }

  /**
   * Agenda todos os compassos que começam antes de `t` (segundos do relógio do áudio).
   * O jogo chama isto a cada ~300 ms com `t` um pouco à frente; o render offline chama uma vez só.
   */
  scheduleUntil(t: number): void {
    const now = this.ctx.currentTime;
    for (const p of this.players) {
      // voltou de uma pausa (música desligada, aba em segundo plano): retoma do agora
      if (p.nextBar < now) p.nextBar = now + 0.05;
      while (p.nextBar < t && !(p.stopping && p.nextBar > p.stopAt)) {
        const bar = composeBar(p.song, p.bar, this.intensity);
        for (const n of bar.notes) this.synth.note(n.inst, n.midi, p.nextBar + n.t, n.dur, n.gain, p.input);
        for (const h of bar.hits) this.synth.drum(h.drum, p.nextBar + h.t, h.gain, p.input);
        p.nextBar += bar.seconds;
        p.bar++;
      }
    }
    // Músicas que já sumiram (com folga para o eco e o reverb) saem do grafo.
    this.players = this.players.filter((p) => {
      if (!p.stopping || now < p.stopAt + 8) return true;
      for (const n of p.nodes) n.disconnect();
      return false;
    });
  }
}

/** Volume base da música no jogo (fica por baixo dos efeitos sonoros). */
export const MUSIC_LEVEL = 0.55;

/**
 * Renderiza `seconds` de uma música fora de tempo real (para análise e testes no navegador).
 * `intensity` liga as camadas de tensão.
 */
export async function renderSong(id: string, seconds: number, intensity = 0, sampleRate = 44100): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.ceil(sampleRate * seconds), sampleRate);
  const master = ctx.createGain();
  master.gain.value = MUSIC_LEVEL;
  master.connect(ctx.destination);
  const eng = new MusicEngine(ctx, master);
  eng.intensity = intensity;
  eng.play(id, 0.3);
  eng.scheduleUntil(seconds);
  return ctx.startRendering();
}
