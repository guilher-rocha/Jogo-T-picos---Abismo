import { describe, it, expect } from 'vitest';
import { dailyChallenge, decodeChallenge, encodeChallenge, todayString } from '../src/core/challenge';

describe('desafios assíncronos', () => {
  it('código de desafio vai e volta sem perder informação', () => {
    const c = { seed: 3141592653, raceId: 'gnome', classId: 'ranger', score: 12345 };
    const code = encodeChallenge(c);
    expect(code).toMatch(/^ABISMO-/);
    expect(decodeChallenge(code)).toEqual(c);
    expect(decodeChallenge(code.toLowerCase())).toEqual(c);
  });

  it('código adulterado é rejeitado pelo dígito verificador', () => {
    const code = encodeChallenge({ seed: 99, raceId: 'elf', classId: 'mage', score: 500 });
    const tampered = code.replace(/-([0-9A-Z]+)-([0-9A-Z]{2})$/, (_m, s, ck) => `-${s}1-${ck}`);
    expect(decodeChallenge(tampered)).toBeNull();
    expect(decodeChallenge('qualquer coisa')).toBeNull();
  });

  it('desafio diário é igual para todos no mesmo dia e muda no dia seguinte', () => {
    expect(dailyChallenge('2026-10-01')).toEqual(dailyChallenge('2026-10-01'));
    expect(dailyChallenge('2026-10-01').seed).not.toBe(dailyChallenge('2026-10-02').seed);
    expect(todayString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
