import { describe, expect, it } from 'vitest';
import { SONGS, songForTheme } from '../src/data/music';
import { THEMES } from '../src/data/themes';
import { barSeconds, composeBar } from '../src/engine/compose';

describe('trilha sonora', () => {
  it('cada região da masmorra tem a sua música', () => {
    for (const t of THEMES) expect(SONGS[songForTheme(t.id)].id, t.id).toBe(t.id);
    for (const id of ['title', 'gameover', 'victory']) expect(SONGS[id]).toBeDefined();
  });

  it('as regiões soam diferentes (andamento, tônica ou modo)', () => {
    const sig = THEMES.map((t) => {
      const s = SONGS[t.id];
      return `${s.bpm}|${s.root}|${s.mode.join(',')}`;
    });
    expect(new Set(sig).size).toBe(THEMES.length);
  });

  it('todos os padrões têm o tamanho do compasso', () => {
    for (const s of Object.values(SONGS)) {
      for (const L of s.layers) {
        const pats = L.type === 'melody' ? L.rhythms : 'pattern' in L ? [L.pattern] : [];
        for (const p of pats) expect(p.length, `${s.id}:${L.type}`).toBe(s.steps);
      }
    }
  });

  it('notas dentro do compasso e numa faixa audível', () => {
    for (const s of Object.values(SONGS)) {
      for (let bar = 0; bar < 16; bar++) {
        const b = composeBar(s, bar, 1);
        expect(b.seconds).toBeCloseTo(barSeconds(s));
        for (const n of b.notes) {
          expect(n.t, s.id).toBeGreaterThanOrEqual(0);
          expect(n.t, s.id).toBeLessThan(b.seconds);
          expect(n.midi, s.id).toBeGreaterThanOrEqual(24);
          expect(n.midi, s.id).toBeLessThanOrEqual(96);
          expect(n.dur, s.id).toBeGreaterThan(0);
        }
      }
    }
  });

  it('é determinística', () => {
    const a = composeBar(SONGS.crypt, 5, 0);
    const b = composeBar(SONGS.crypt, 5, 0);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('a percussão de tensão só entra com perigo', () => {
    for (const id of ['crypt', 'mines', 'abyss']) {
      const calm = composeBar(SONGS[id], 0, 0);
      const danger = composeBar(SONGS[id], 0, 1);
      expect(danger.hits.length + danger.notes.length, id).toBeGreaterThan(calm.hits.length + calm.notes.length);
    }
  });

  it('a melodia repete o motivo (mesmo ritmo a cada duas frases)', () => {
    const s = SONGS.title;
    const li = s.layers.findIndex((l) => l.type === 'melody');
    const inst = s.layers[li].type === 'melody' ? s.layers[li].inst : '';
    const onsets = (bar: number) => composeBar(s, bar).notes.filter((n) => n.inst === inst).map((n) => n.t.toFixed(3));
    for (let pos = 0; pos < 3; pos++) expect(onsets(pos + 8)).toEqual(onsets(pos));
  });
});
