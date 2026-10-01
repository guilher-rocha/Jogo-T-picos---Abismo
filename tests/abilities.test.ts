import { describe, it, expect } from 'vitest';
import { level } from '../src/core/game';
import { playerAction } from '../src/core/turn';
import { createMonster } from '../src/core/monster';
import { monsterTemplate } from '../src/data/monsters';
import { RNG } from '../src/engine/rng';
import { createHero, recalcPlayer } from '../src/core/hero';
import { createTestGame } from './helpers';

function heroGame(classId: string) {
  const g = createTestGame(11);
  g.hero = createHero('T', 'human', classId);
  recalcPlayer(g);
  g.player.hp = g.player.maxHp;
  g.player.mp = g.player.maxMp;
  g.player.x = 8;
  g.player.y = 4;
  return g;
}

function addMonster(g: ReturnType<typeof heroGame>, id: string, x: number, y: number, state: 'sleeping' | 'hunting' = 'hunting') {
  const m = createMonster(g, monsterTemplate(id), x, y, new RNG(2));
  m.ai.state = state;
  level(g).actors.push(m);
  return m;
}

describe('magias', () => {
  it('Mago conhece Míssil Mágico e o míssil causa dano e gasta MP', () => {
    const g = heroGame('mage');
    expect(g.hero.spells).toContain('magic_missile');
    const m = addMonster(g, 'skeleton', 12, 4);
    m.hp = m.maxHp = 100;
    let hit = false;
    for (let i = 0; i < 6 && !hit; i++) {
      const mp = g.player.mp;
      g.player.mp = 50;
      playerAction(g, { type: 'cast', spellId: 'magic_missile', tx: 12, ty: 4 });
      hit = m.hp < 100;
      expect(g.player.mp).toBeLessThan(50);
      void mp;
    }
    expect(hit).toBe(true);
  });

  it('sem mana suficiente a magia não é conjurada e não gasta turno', () => {
    const g = heroGame('mage');
    g.player.mp = 0;
    expect(playerAction(g, { type: 'cast', spellId: 'magic_missile', tx: 12, ty: 4 })).toBe(false);
  });

  it('Cura Leve do Clérigo recupera HP', () => {
    const g = heroGame('cleric');
    g.player.hp = 1;
    for (let i = 0; i < 6 && g.player.hp === 1; i++) {
      g.player.mp = 20;
      playerAction(g, { type: 'cast', spellId: 'cure_light' });
    }
    expect(g.player.hp).toBeGreaterThan(1);
  });
});

describe('habilidades de classe', () => {
  it('Golpe Poderoso gasta 2 turnos', () => {
    const g = heroGame('warrior');
    const m = addMonster(g, 'rat', 9, 4);
    m.hp = m.maxHp = 500;
    const t = g.turn;
    playerAction(g, { type: 'ability', abilityId: 'power_strike', dx: 1, dy: 0 });
    expect(g.turn - t).toBe(2);
  });

  it('Expulsar Mortos-vivos faz esqueletos fugirem e tem recarga', () => {
    const g = heroGame('cleric');
    const s = addMonster(g, 'skeleton', 11, 4);
    s.hp = s.maxHp = 500;
    expect(playerAction(g, { type: 'ability', abilityId: 'turn_undead' })).toBe(true);
    expect(s.ai.state).toBe('fleeing');
    expect(s.hp).toBeLessThan(500);
    g.player.mp = 20;
    expect(playerAction(g, { type: 'ability', abilityId: 'turn_undead' })).toBe(false); // em recarga
  });

  it('Ataque furtivo do Ladino causa dano triplo em monstro dormindo', () => {
    const avg = (classId: string) => {
      let total = 0;
      for (let i = 0; i < 40; i++) {
        const g = heroGame(classId);
        g.player.accuracy = 100;
        g.player.attacks = [{ verb: 'acerta', damage: '4' }];
        const m = addMonster(g, 'rat', 9, 4, 'sleeping');
        m.hp = m.maxHp = 999;
        playerAction(g, { type: 'move', dx: 1, dy: 0 });
        total += 999 - m.hp;
      }
      return total / 40;
    };
    expect(avg('rogue')).toBeCloseTo(12, 0);
    expect(avg('warrior')).toBeCloseTo(4, 0);
  });

  it('Desaparecer faz monstros perderem o rastro', () => {
    const g = heroGame('rogue');
    const m = addMonster(g, 'goblin', 14, 4);
    playerAction(g, { type: 'ability', abilityId: 'vanish' });
    expect(m.ai.state).not.toBe('hunting');
  });
});
