import type { Actor, Element } from './actor';
import { ACTION_COST, hasFlag } from './actor';
import type { Game } from './game';
import { emit, message } from './game';
import { spellById } from '../data/spells';
import type { SpellDef } from '../data/spells';
import { invokeEffect } from './spells';
import { traceProjectile, projectileGlyph } from './ranged';
import { damage, rangedAttack, resistMult } from './combat';
import { capitalize, theName } from './text';
import { bresenham } from './fov';
import { isTransparent } from './map';
import { level } from './game';

export type MonsterSpecial = 'breath' | 'cast' | 'shoot';

/** Escolhe a magia que um monstro conjurador usa agora. */
function chooseSpell(game: Game, m: Actor): SpellDef | undefined {
  const rng = game.rng.ai;
  // Ferido: tenta se curar (xamãs e clérigos do mal).
  if (m.hp < m.maxHp / 2 && rng.chance(50)) return spellById('cure_light');
  if (rng.chance(20)) return spellById(m.level >= 8 ? 'word_of_fear' : 'sleep') ?? spellById('sleep');
  if (m.level >= 16) return spellById(rng.chance(50) ? 'fireball' : 'lightning');
  if (m.level >= 9) return spellById('frost_bolt');
  return spellById('magic_missile');
}

/** Executa a ação especial de um monstro. Retorna a energia gasta. */
export function monsterSpecial(game: Game, m: Actor, kind: MonsterSpecial): number {
  const p = game.player;
  const who = capitalize(theName(m));
  switch (kind) {
    case 'breath': {
      const el: Element = hasFlag(m, 'breathLightning') ? 'lightning' : 'fire';
      const map = level(game).map;
      const path = [];
      for (const pt of bresenham(m.x, m.y, p.x, p.y).slice(1)) {
        path.push(pt);
        if (!isTransparent(map, pt.x, pt.y) || (pt.x === p.x && pt.y === p.y)) break;
      }
      emit(game, { type: 'breath', path, from: { x: m.x, y: m.y }, element: el });
      message(game, `${who} ${el === 'fire' ? 'cospe uma torrente de fogo' : 'solta um relâmpago pela boca'}!`, 'lightRed');
      const dmg = Math.round(Math.max(6, m.hp / 4) * resistMult(p, el));
      message(game, `Você é atingido pelo sopro (${dmg}).`, 'lightRed');
      damage(game, p, dmg, m);
      m.specialReady = game.turn + 6;
      return ACTION_COST;
    }
    case 'cast': {
      const spell = chooseSpell(game, m);
      if (!spell) return 0;
      message(game, `${who} conjura ${spell.name}!`, spell.color);
      invokeEffect(game, m, spell, spell.shape === 'self' ? undefined : { x: p.x, y: p.y });
      m.specialReady = game.turn + 3;
      return ACTION_COST;
    }
    case 'shoot': {
      const { path, hit } = traceProjectile(game, m, p, 10);
      emit(game, { type: 'projectile', path, glyph: projectileGlyph(p.x - m.x, p.y - m.y), color: 'lightGray', item: 'bolt', from: { x: m.x, y: m.y } });
      if (hit) rangedAttack(game, m, hit, { verb: 'acerta', damage: `1d6+${Math.floor(m.level / 2)}` }, 'o virote');
      else message(game, `${who} dispara, mas erra feio.`, 'darkGray');
      return ACTION_COST;
    }
  }
}
