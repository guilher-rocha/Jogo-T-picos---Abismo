import { describe, expect, it } from 'vitest';
import { Scene } from '../src/engine/scene';
import { AURA_STATUSES, drawAuraBack, drawAuraFront } from '../src/ui/auras';
import { AIR, airMote, fountainDrops, lavaBubbles, risingMotes, torchEmbers, waterGlints } from '../src/ui/ambient';
import { STYLE_IDS } from '../src/gfx/terrain';
import { DECOR_FRAMES, makeDecor } from '../src/gfx/decor';
import { STYLES } from '../src/gfx/terrain';

const scene = (): Scene => new Scene(0, 0, 10, 10);

describe('auras de estado', () => {
  it('todo estado com aura desenha alguma coisa em algum momento', () => {
    for (const st of AURA_STATUSES) {
      const s = scene();
      for (let t = 0; t < 2000; t += 100) {
        drawAuraBack(s, new Set([st]), 3, 3, t, 1);
        drawAuraFront(s, new Set([st]), 3, 3, t, 1);
      }
      expect(s.cmds.length, st).toBeGreaterThan(0);
    }
  });

  it('é determinística (mesmo relógio, mesmo desenho)', () => {
    const a = scene();
    const b = scene();
    drawAuraFront(a, new Set(AURA_STATUSES), 2, 2, 1234, 9);
    drawAuraFront(b, new Set(AURA_STATUSES), 2, 2, 1234, 9);
    expect(JSON.stringify(a.cmds)).toBe(JSON.stringify(b.cmds));
  });
});

describe('ambiente', () => {
  it('toda região tem partículas no ar', () => {
    for (const id of STYLE_IDS) {
      expect(AIR[id], id).toBeDefined();
      const s = scene();
      for (let x = 0; x < 30; x++) for (let y = 0; y < 30; y++) airMote(s, AIR[id], x, y, 700);
      expect(s.cmds.length, id).toBeGreaterThan(0);
    }
  });

  it('tochas, lava, água, fonte e altar animam sem erro', () => {
    const s = scene();
    for (let t = 0; t < 3000; t += 50) {
      torchEmbers(s, 1, 1, t);
      lavaBubbles(s, 2, 2, t);
      waterGlints(s, 3, 3, t);
      fountainDrops(s, 4, 4, t);
      risingMotes(s, 5, 5, t, ['#fff']);
    }
    expect(s.cmds.length).toBeGreaterThan(100);
  });

  it('enfeites animados têm o número de quadros anunciado', () => {
    for (const id of STYLE_IDS) {
      const decor = makeDecor(STYLES[id]);
      for (const [name, a] of Object.entries(DECOR_FRAMES)) {
        if (name === 'torch') continue; // a tocha vem de props.ts
        expect(decor[name]?.length, `${id}:${name}`).toBe(a.frames);
      }
    }
  });
});
