/**
 * Trilha sonora como dados: uma música por região (mais título, fim de jogo e vitória).
 * Cada música tem andamento, modo, progressão de acordes e camadas — acordes, baixo, melodia,
 * arpejo e percussão — descritas por padrões de passos ("x" toca, "." pausa). O compositor
 * (`src/engine/compose.ts`) transforma isso em notas, um compasso por vez, e o sintetizador toca.
 *
 * Padrões do baixo: 1 tônica do acorde, 2 segunda, 3 terça, 5 quinta, 7 sétima, 8 oitava.
 * Padrões de percussão: x normal, X acento, o fraco. Camadas `combat` só entram com perigo por perto.
 */

export type InstrumentId = 'organ' | 'pad' | 'glass' | 'choir' | 'bell' | 'pluck' | 'harp' | 'kalimba' | 'bass' | 'sub' | 'lead';
export type DrumId = 'kick' | 'tom' | 'wardrum' | 'hat' | 'shaker' | 'clink' | 'anvil' | 'drip' | 'bubble' | 'chain' | 'gong';
export type AmbienceId = 'wind' | 'cave' | 'water' | 'rumble';
export type Voicing = 'triad' | 'open' | 'power' | 'cluster';

interface LayerBase {
  gain: number;
  /** Só toca quando há monstros caçando o jogador (camada de tensão). */
  combat?: boolean;
  /** Toca só nos compassos em que `compasso % every === offset`. */
  every?: number;
  offset?: number;
}

export type SongLayer =
  | (LayerBase & { type: 'chord'; inst: InstrumentId; octave: number; voicing: Voicing; /** Duração em compassos. */ hold?: number })
  | (LayerBase & { type: 'bass'; inst: InstrumentId; octave: number; pattern: string })
  | (LayerBase & { type: 'melody'; inst: InstrumentId; octave: number; rhythms: string[]; /** Chance de pausa em cada nota. */ rest?: number })
  | (LayerBase & { type: 'arp'; inst: InstrumentId; octave: number; pattern: string; /** Notas do acorde: 0 tônica, 1 terça, 2 quinta, 3 oitava... */ order: number[] })
  | (LayerBase & { type: 'drum'; drum: DrumId; pattern: string; /** Chance de cada batida soar (sons esparsos: gotas, correntes). */ chance?: number });

export interface SongDef {
  id: string;
  /** Nome da faixa (aparece nas opções/ajuda). */
  name: string;
  bpm: number;
  /** Tempos por compasso e passos por compasso (16 = semicolcheias em 4/4; 12 em 3/4). */
  beats: number;
  steps: number;
  /** Tônica (nota MIDI: 60 = dó central). */
  root: number;
  /** Modo: intervalos em semitons a partir da tônica. */
  mode: number[];
  /** Grau (0 = tônica) do acorde de cada compasso; o ciclo se repete. */
  chords: number[];
  layers: SongLayer[];
  /** Quanto vai para o reverb (0–1): criptas e ruínas alagadas ecoam mais. */
  reverb: number;
  /** Eco rítmico (em tempos), com realimentação e mistura. */
  echo?: { beats: number; feedback: number; mix: number };
  /** Sons de fundo contínuos (vento, água, rumor). */
  ambience: { id: AmbienceId; gain: number }[];
  /** Corte do filtro geral em Hz: mais baixo = mais abafado (fortaleza submersa, abismo). */
  tone: number;
  /** Quanto os efeitos sonoros ecoam nesta região. */
  sfxReverb: number;
  /** Volume da faixa, medido para todas soarem igualmente altas (scripts/music-render.mjs). */
  level: number;
}

export const MODES = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
};

export const SONGS: Record<string, SongDef> = {
  // Tema de abertura: ré dórico, harpa e sinos sobre um colchão de cordas — mistério com um fio de heroísmo.
  title: {
    id: 'title', name: 'O chamado do Abismo', bpm: 72, beats: 4, steps: 16, root: 50, mode: MODES.dorian,
    chords: [0, 2, 6, 3],
    layers: [
      { type: 'chord', inst: 'pad', octave: 0, voicing: 'open', gain: 0.55 },
      { type: 'bass', inst: 'sub', octave: -1, pattern: '1.......5.......', gain: 0.6 },
      { type: 'arp', inst: 'harp', octave: 0, pattern: 'x..x..x.x..x..x.', order: [0, 1, 2, 3, 2, 1], gain: 0.32 },
      { type: 'melody', inst: 'bell', octave: 1, rhythms: ['x.......x...x...', 'x...x...x.......', '....x.x.x.......', 'x.......x.......'], rest: 0.1, gain: 0.36 },
    ],
    reverb: 0.5, echo: { beats: 0.75, feedback: 0.3, mix: 0.2 }, ambience: [{ id: 'wind', gain: 0.1 }], tone: 4200, sfxReverb: 0.15, level: 0.85,
  },

  // Cripta Superior: lá menor harmônico, órgão de igreja, sinos distantes e coro a cada quatro compassos.
  // A cadência com o acorde maior da dominante (Mi) dá o ar gótico.
  crypt: {
    id: 'crypt', name: 'Salmo das catacumbas', bpm: 58, beats: 4, steps: 16, root: 45, mode: MODES.harmonicMinor,
    chords: [0, 5, 3, 4],
    layers: [
      { type: 'chord', inst: 'organ', octave: 1, voicing: 'open', gain: 0.4 },
      { type: 'bass', inst: 'sub', octave: 0, pattern: '1.......5.......', gain: 0.55 },
      { type: 'melody', inst: 'bell', octave: 2, rhythms: ['x.......x.......', '....x.......x...', 'x...x...x.......', 'x.......x...x...'], rest: 0.3, gain: 0.3 },
      { type: 'chord', inst: 'choir', octave: 1, voicing: 'triad', gain: 0.24, every: 4, offset: 2, hold: 2 },
      { type: 'drum', drum: 'chain', pattern: '..........x.....', chance: 0.2, gain: 0.22 },
      { type: 'drum', drum: 'drip', pattern: '......x.........', chance: 0.35, gain: 0.26 },
      { type: 'drum', drum: 'tom', pattern: 'x.......x...x...', gain: 0.5, combat: true },
      { type: 'bass', inst: 'bass', octave: 0, pattern: '1.1.1.1.1.1.1.1.', gain: 0.3, combat: true },
    ],
    reverb: 0.6, ambience: [{ id: 'wind', gain: 0.16 }, { id: 'cave', gain: 0.07 }], tone: 3200, sfxReverb: 0.3, level: 0.71,
  },

  // Minas Abandonadas: mi dórico em ritmo de trabalho — baixo dedilhado insistente, kalimba,
  // picaretas batendo na pedra nos contratempos e gotas caindo.
  mines: {
    id: 'mines', name: 'Canção das picaretas', bpm: 92, beats: 4, steps: 16, root: 40, mode: MODES.dorian,
    chords: [0, 0, 6, 3],
    layers: [
      { type: 'bass', inst: 'pluck', octave: 0, pattern: '1..1..5.1..1..8.', gain: 0.5 },
      { type: 'arp', inst: 'kalimba', octave: 1, pattern: 'x.x...x.x.x...x.', order: [0, 2, 3, 2, 1], gain: 0.26 },
      { type: 'melody', inst: 'harp', octave: 2, rhythms: ['x.x.x...x.......', 'x...x.x.x.x.....', '........x.x.x...', 'x.x.....x.......'], rest: 0.25, gain: 0.28 },
      { type: 'chord', inst: 'pad', octave: 1, voicing: 'power', gain: 0.2, every: 2, hold: 2 },
      { type: 'drum', drum: 'clink', pattern: '....x.......x...', gain: 0.3 },
      { type: 'drum', drum: 'tom', pattern: 'x.......x.......', gain: 0.38 },
      { type: 'drum', drum: 'shaker', pattern: '..x...x...x...x.', gain: 0.16 },
      { type: 'drum', drum: 'drip', pattern: '.......x.......x', chance: 0.25, gain: 0.22 },
      { type: 'drum', drum: 'kick', pattern: 'x...x...x...x...', gain: 0.5, combat: true },
      { type: 'drum', drum: 'anvil', pattern: '..x...x...x...x.', gain: 0.2, combat: true },
    ],
    reverb: 0.3, ambience: [{ id: 'cave', gain: 0.12 }], tone: 3600, sfxReverb: 0.2, level: 1.64,
  },

  // Cavernas Fúngicas: fá lídio em 3/4, vidro e kalimba com eco, bolhas estourando — estranho e hipnótico.
  fungal: {
    id: 'fungal', name: 'Jardim dos esporos', bpm: 78, beats: 3, steps: 12, root: 41, mode: MODES.lydian,
    chords: [0, 1, 4, 1],
    layers: [
      { type: 'chord', inst: 'glass', octave: 1, voicing: 'cluster', gain: 0.3, every: 2, hold: 2 },
      { type: 'bass', inst: 'sub', octave: 0, pattern: '1.....5.....', gain: 0.45 },
      { type: 'arp', inst: 'kalimba', octave: 2, pattern: 'x.x.x.x.x.x.', order: [0, 2, 1, 3, 2, 4], gain: 0.2 },
      { type: 'melody', inst: 'bell', octave: 2, rhythms: ['x.....x.....', 'x...x...x...', '......x.x...', 'x.x.........'], rest: 0.35, gain: 0.24 },
      { type: 'drum', drum: 'bubble', pattern: 'x..x..x..x..', chance: 0.4, gain: 0.28 },
      { type: 'drum', drum: 'drip', pattern: '.....x......', chance: 0.3, gain: 0.18 },
      { type: 'drum', drum: 'shaker', pattern: 'x.xx.xx.xx.x', gain: 0.18, combat: true },
      { type: 'drum', drum: 'tom', pattern: 'x.....x..x..', gain: 0.42, combat: true },
    ],
    reverb: 0.45, echo: { beats: 0.75, feedback: 0.45, mix: 0.35 }, ambience: [{ id: 'cave', gain: 0.1 }], tone: 3000, sfxReverb: 0.25, level: 1.0,
  },

  // Fortaleza Afundada: ré menor lento e abafado (como ouvido debaixo d'água), coro, harpa,
  // sinos com eco longo e um gongo a cada quatro compassos.
  fortress: {
    id: 'fortress', name: 'Os salões submersos', bpm: 64, beats: 4, steps: 16, root: 38, mode: MODES.aeolian,
    chords: [0, 5, 2, 6],
    layers: [
      { type: 'chord', inst: 'choir', octave: 1, voicing: 'open', gain: 0.3, every: 2, hold: 2 },
      { type: 'chord', inst: 'glass', octave: 2, voicing: 'triad', gain: 0.14 },
      { type: 'bass', inst: 'sub', octave: 0, pattern: '1...............', gain: 0.55 },
      { type: 'arp', inst: 'harp', octave: 1, pattern: 'x...x...x...x...', order: [0, 1, 2, 1], gain: 0.26 },
      { type: 'melody', inst: 'bell', octave: 2, rhythms: ['x.......x.......', 'x...........x...', 'x.......x...x...', '....x.......x...'], rest: 0.2, gain: 0.28 },
      { type: 'drum', drum: 'gong', pattern: 'x...............', every: 4, gain: 0.28 },
      { type: 'drum', drum: 'drip', pattern: '...x.......x....', chance: 0.4, gain: 0.28 },
      { type: 'drum', drum: 'tom', pattern: 'x..x..x.x.......', gain: 0.42, combat: true },
      { type: 'drum', drum: 'hat', pattern: '..x...x...x...x.', gain: 0.12, combat: true },
    ],
    reverb: 0.6, echo: { beats: 1, feedback: 0.35, mix: 0.25 }, ambience: [{ id: 'water', gain: 0.2 }], tone: 2200, sfxReverb: 0.35, level: 0.89,
  },

  // O Abismo: dó frígio, lento e pesado — coro sombrio, cluster dissonante, tambor de guerra,
  // gongo e correntes; com perigo, o tambor dobra e o baixo pulsa no semitom (a segunda menor).
  abyss: {
    id: 'abyss', name: 'O coração escuro', bpm: 54, beats: 4, steps: 16, root: 36, mode: MODES.phrygian,
    chords: [0, 1, 0, 4],
    layers: [
      { type: 'chord', inst: 'choir', octave: 1, voicing: 'open', gain: 0.3, every: 2, hold: 2 },
      { type: 'chord', inst: 'pad', octave: 0, voicing: 'cluster', gain: 0.22 },
      { type: 'bass', inst: 'sub', octave: 0, pattern: '1...............', gain: 0.65 },
      { type: 'melody', inst: 'lead', octave: 1, rhythms: ['x...............', '........x.......', 'x.......x.x.....', 'x...x...........'], rest: 0.3, gain: 0.24 },
      { type: 'drum', drum: 'wardrum', pattern: 'x.......x.x.....', gain: 0.55 },
      { type: 'drum', drum: 'gong', pattern: 'x...............', every: 4, gain: 0.32 },
      { type: 'drum', drum: 'chain', pattern: '............x...', chance: 0.25, gain: 0.22 },
      { type: 'drum', drum: 'wardrum', pattern: '....x.......x.x.', gain: 0.42, combat: true },
      { type: 'drum', drum: 'tom', pattern: 'x.x.x.x.x.x.x.x.', gain: 0.22, combat: true },
      { type: 'bass', inst: 'bass', octave: 0, pattern: '1.1.1.1.2.2.1.1.', gain: 0.3, combat: true },
    ],
    reverb: 0.5, ambience: [{ id: 'rumble', gain: 0.24 }, { id: 'wind', gain: 0.07 }], tone: 1800, sfxReverb: 0.3, level: 1.14,
  },

  // Fim de jogo: lá menor, coro e sinos espaçados — um réquiem curto.
  gameover: {
    id: 'gameover', name: 'Réquiem', bpm: 50, beats: 4, steps: 16, root: 45, mode: MODES.aeolian,
    chords: [0, 5, 3, 4],
    layers: [
      { type: 'chord', inst: 'choir', octave: 1, voicing: 'open', gain: 0.32, every: 2, hold: 2 },
      { type: 'bass', inst: 'sub', octave: 0, pattern: '1...............', gain: 0.5 },
      { type: 'melody', inst: 'bell', octave: 2, rhythms: ['x.......x.......', 'x...............', '....x.......x...'], rest: 0.2, gain: 0.3 },
    ],
    reverb: 0.65, ambience: [{ id: 'wind', gain: 0.12 }], tone: 3000, sfxReverb: 0.2, level: 0.82,
  },

  // Vitória: dó maior, harpa e sinos, cordas abertas — a volta à luz.
  victory: {
    id: 'victory', name: 'A volta à superfície', bpm: 84, beats: 4, steps: 16, root: 48, mode: MODES.ionian,
    chords: [0, 3, 5, 4],
    layers: [
      { type: 'chord', inst: 'pad', octave: 0, voicing: 'open', gain: 0.45 },
      { type: 'bass', inst: 'bass', octave: -1, pattern: '1.......5...1...', gain: 0.45 },
      { type: 'arp', inst: 'harp', octave: 1, pattern: 'x.x.x.x.x.x.x.x.', order: [0, 1, 2, 3, 2, 1, 2, 3], gain: 0.24 },
      { type: 'melody', inst: 'bell', octave: 2, rhythms: ['x...x...x.......', 'x.x.x...x...x...', 'x.......x.x.x...'], rest: 0.05, gain: 0.32 },
      { type: 'drum', drum: 'tom', pattern: 'x.......x.......', gain: 0.25 },
    ],
    reverb: 0.4, ambience: [], tone: 5000, sfxReverb: 0.15, level: 1.0,
  },
};

/** Música de cada tema de andar (as regiões da masmorra). */
export function songForTheme(theme: string): string {
  return SONGS[theme] ? theme : 'crypt';
}
