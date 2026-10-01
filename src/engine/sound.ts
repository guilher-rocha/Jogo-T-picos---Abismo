/**
 * Efeitos sonoros e música sintetizados com Web Audio (estilo chiptune, sem arquivos).
 * O AudioContext só pode começar depois de uma interação do usuário (regra dos navegadores).
 */
export type SoundName =
  | 'hit' | 'miss' | 'hurt' | 'kill' | 'levelUp' | 'pickup' | 'door' | 'stairs'
  | 'spell' | 'quaff' | 'read' | 'explosion' | 'death' | 'victory' | 'menu' | 'shoot';

interface Note {
  freq: number;
  dur: number;
  type?: OscillatorType;
  slide?: number;
  gain?: number;
  delay?: number;
}

const SFX: Record<SoundName, Note[]> = {
  hit: [{ freq: 180, dur: 0.07, type: 'square', slide: 90 }],
  miss: [{ freq: 600, dur: 0.05, type: 'triangle', slide: 400, gain: 0.4 }],
  hurt: [{ freq: 140, dur: 0.12, type: 'sawtooth', slide: 60 }],
  kill: [{ freq: 300, dur: 0.06, type: 'square' }, { freq: 150, dur: 0.12, type: 'square', delay: 0.06, slide: 60 }],
  levelUp: [523, 659, 784, 1047].map((f, i) => ({ freq: f, dur: 0.12, type: 'square' as OscillatorType, delay: i * 0.1, gain: 0.5 })),
  pickup: [{ freq: 880, dur: 0.05, type: 'square', gain: 0.4 }, { freq: 1320, dur: 0.06, type: 'square', delay: 0.05, gain: 0.4 }],
  door: [{ freq: 90, dur: 0.12, type: 'triangle', slide: 70 }],
  stairs: [392, 330, 262, 196].map((f, i) => ({ freq: f, dur: 0.1, type: 'triangle' as OscillatorType, delay: i * 0.08 })),
  spell: [{ freq: 400, dur: 0.25, type: 'sine', slide: 1200, gain: 0.5 }],
  quaff: [{ freq: 300, dur: 0.08, type: 'sine', slide: 500 }, { freq: 500, dur: 0.08, type: 'sine', delay: 0.09, slide: 700 }],
  read: [{ freq: 700, dur: 0.15, type: 'triangle', slide: 900, gain: 0.4 }],
  explosion: [{ freq: 120, dur: 0.4, type: 'sawtooth', slide: 30, gain: 0.8 }],
  death: [392, 349, 311, 262, 196].map((f, i) => ({ freq: f, dur: 0.3, type: 'triangle' as OscillatorType, delay: i * 0.25 })),
  victory: [523, 659, 784, 659, 784, 1047].map((f, i) => ({ freq: f, dur: 0.18, type: 'square' as OscillatorType, delay: i * 0.15, gain: 0.5 })),
  menu: [{ freq: 660, dur: 0.03, type: 'square', gain: 0.25 }],
  shoot: [{ freq: 900, dur: 0.08, type: 'triangle', slide: 300, gain: 0.4 }],
};

/** Escalas (pentatônicas menores) da música ambiente, uma por tema de profundidade. */
const THEME_SCALES: Record<string, number[]> = {
  title: [220, 262, 294, 330, 392],
  crypt: [196, 233, 262, 294, 349],
  mines: [165, 196, 220, 247, 294],
  fungal: [174, 208, 233, 262, 311],
  fortress: [147, 175, 196, 220, 262],
  abyss: [110, 131, 147, 165, 196],
};

export class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private musicTheme = 'title';
  private step = 0;
  sfxVolume = 0.5;
  musicVolume = 0.25;
  musicOn = true;

  /** Chamar numa interação do usuário (keydown/click). */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.ctx.destination);
      this.applyVolumes();
      this.startMusic();
    } catch {
      this.ctx = null;
    }
  }

  applyVolumes(): void {
    if (this.master) this.master.gain.value = this.sfxVolume * 0.3;
    if (this.musicGain) this.musicGain.gain.value = this.musicOn ? this.musicVolume * 0.15 : 0;
  }

  play(name: SoundName): void {
    if (!this.ctx || !this.master || this.sfxVolume <= 0) return;
    for (const n of SFX[name]) this.tone(n, this.master);
  }

  private tone(n: Note, dest: AudioNode): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + (n.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = n.type ?? 'square';
    osc.frequency.setValueAtTime(n.freq, t0);
    if (n.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, n.slide), t0 + n.dur);
    g.gain.setValueAtTime(n.gain ?? 0.7, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + n.dur);
    osc.connect(g);
    g.connect(dest);
    osc.start(t0);
    osc.stop(t0 + n.dur + 0.02);
  }

  /** Troca a escala da música ambiente (ao mudar de região). */
  setMusicTheme(theme: string): void {
    this.musicTheme = THEME_SCALES[theme] ? theme : 'title';
  }

  private startMusic(): void {
    if (this.musicTimer !== null) return;
    // Uma nota a cada 700 ms: arpejo lento e aleatório sobre um bordão grave.
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || !this.musicOn) return;
      const scale = THEME_SCALES[this.musicTheme];
      this.step++;
      if (this.step % 8 === 0) this.tone({ freq: scale[0] / 2, dur: 2.6, type: 'sine', gain: 0.6 }, this.musicGain);
      if (Math.random() < 0.7) {
        const f = scale[Math.floor(Math.random() * scale.length)] * (Math.random() < 0.3 ? 2 : 1);
        this.tone({ freq: f, dur: 0.9, type: 'triangle', gain: 0.35 }, this.musicGain);
      }
    }, 700);
  }
}

export const sound = new SoundManager();
