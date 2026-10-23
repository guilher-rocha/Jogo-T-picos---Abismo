import { describe, expect, it } from 'vitest';
import { actorAt, isFree, level } from '../src/core/game';
import type { Game } from '../src/core/game';
import { advanceParty, aliveMembers, createPartyGame, memberById, members, queueAction, setPerspective } from '../src/core/party';
import { damage } from '../src/core/combat';
import { createMonster } from '../src/core/monster';
import { monsterTemplate } from '../src/data/monsters';
import { DIRS8, isWalkable } from '../src/core/map';
import { serializeGame } from '../src/persist/save';

const SPECS = [
  { name: 'Ana', raceId: 'human', classId: 'warrior' },
  { name: 'Bia', raceId: 'elf', classId: 'mage' },
];

function newParty(seed = 11): Game {
  const g = createPartyGame(seed, SPECS);
  // tira os monstros do andar para os testes controlarem tudo
  level(g).actors = [];
  return g;
}

/** Uma casa andável vizinha (e livre) de p. */
function freeNeighbor(g: Game, p: { x: number; y: number }): { x: number; y: number } {
  const d = DIRS8.find((d) => isFree(g, p.x + d.x, p.y + d.y))!;
  return { x: p.x + d.x, y: p.y + d.y };
}

describe('grupo (multijogador cooperativo)', () => {
  it('cria um herói por jogador, lado a lado, com equipamento e vida cheia', () => {
    const g = newParty();
    const [a, b] = members(g);
    expect(members(g)).toHaveLength(2);
    expect(a.id).not.toBe(b.id);
    expect(Math.max(Math.abs(a.actor.x - b.actor.x), Math.abs(a.actor.y - b.actor.y))).toBe(1);
    expect(b.hero.classId).toBe('mage');
    expect(b.hero.inventory.length).toBeGreaterThan(0);
    expect(b.actor.hp).toBe(b.actor.maxHp);
    expect(actorAt(g, b.actor.x, b.actor.y)).toBe(b.actor);
    expect(isFree(g, b.actor.x, b.actor.y)).toBe(false);
  });

  it('a rodada espera todos: quem já agiu espera o outro, e o tempo só anda depois', () => {
    const g = newParty();
    const [a, b] = members(g);
    expect(advanceParty(g).sort()).toEqual([a.id, b.id].sort());
    const turn = g.turn;
    queueAction(g, a.id, { type: 'search' });
    expect(advanceParty(g)).toEqual([b.id]);
    expect(g.turn).toBe(turn);
    queueAction(g, b.id, { type: 'search' });
    expect(advanceParty(g).sort()).toEqual([a.id, b.id].sort());
    expect(g.turn).toBeGreaterThan(turn);
  });

  it('esbarrar num aliado troca de lugar (não ataca)', () => {
    const g = newParty();
    const [a, b] = members(g);
    const pa = { x: a.actor.x, y: a.actor.y };
    const pb = { x: b.actor.x, y: b.actor.y };
    queueAction(g, a.id, { type: 'move', dx: pb.x - pa.x, dy: pb.y - pa.y });
    advanceParty(g);
    expect({ x: a.actor.x, y: a.actor.y }).toEqual(pb);
    expect({ x: b.actor.x, y: b.actor.y }).toEqual(pa);
    expect(b.actor.hp).toBe(b.actor.maxHp);
    const msg = g.log.find((m) => m.text.startsWith('Você troca de lugar com Bia'));
    expect(msg?.who).toBe(a.id);
  });

  it('o monstro persegue e ataca o herói mais próximo dele', () => {
    const g = newParty(23);
    const [a, b] = members(g);
    // afasta Ana para longe de Bia
    const map = level(g).map;
    let far = { x: a.actor.x, y: a.actor.y };
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
      if (isWalkable(map, x, y) && !actorAt(g, x, y) && Math.abs(x - b.actor.x) + Math.abs(y - b.actor.y) > Math.abs(far.x - b.actor.x) + Math.abs(far.y - b.actor.y)) far = { x, y };
    }
    a.actor.x = far.x;
    a.actor.y = far.y;
    const spot = freeNeighbor(g, b.actor);
    const rat = createMonster(g, monsterTemplate('rat'), spot.x, spot.y, g.rng.loot);
    rat.ai.state = 'hunting';
    level(g).actors.push(rat);
    const targets: string[] = [];
    for (let round = 0; round < 6; round++) {
      for (const m of aliveMembers(g)) queueAction(g, m.id, { type: 'search' });
      g.events = [];
      advanceParty(g);
      for (const e of g.events) if (e.type === 'melee' && e.x === rat.x && e.y === rat.y) targets.push(`${e.tx},${e.ty}`);
    }
    expect(targets.length).toBeGreaterThan(0);
    for (const t of targets) expect(t).toBe(`${b.actor.x},${b.actor.y}`);
    expect(a.actor.hp).toBe(a.actor.maxHp);
  });

  it('um herói cair não encerra a partida; todos caídos, sim', () => {
    const g = newParty();
    const [a, b] = members(g);
    damage(g, b.actor, 9999);
    expect(b.dead).toBe(true);
    expect(g.over).toBeUndefined();
    expect(actorAt(g, b.actor.x, b.actor.y)).toBeUndefined();
    queueAction(g, a.id, { type: 'search' });
    expect(advanceParty(g)).toEqual([a.id]); // o mundo andou só com Ana
    setPerspective(g, a);
    damage(g, a.actor, 9999);
    expect(g.over?.won).toBe(false);
  });

  it('a escada leva o grupo todo, e o caído volta com metade da vida', () => {
    const g = newParty();
    const [a, b] = members(g);
    damage(g, b.actor, 9999);
    const down = level(g).down;
    a.actor.x = down.x;
    a.actor.y = down.y;
    queueAction(g, a.id, { type: 'descend' });
    advanceParty(g);
    expect(g.depth).toBe(2);
    expect(b.dead).toBe(false);
    expect(b.actor.hp).toBe(Math.ceil(b.actor.maxHp / 2));
    expect(Math.max(Math.abs(a.actor.x - b.actor.x), Math.abs(a.actor.y - b.actor.y))).toBeLessThanOrEqual(2);
    expect(isWalkable(level(g).map, b.actor.x, b.actor.y)).toBe(true);
  });

  it('cada herói tem a própria visão; a memória do mapa é do grupo', () => {
    const g = newParty();
    const [a, b] = members(g);
    expect(a.visible).not.toBe(b.visible);
    setPerspective(g, b);
    expect(level(g).map.visible).toBe(b.visible);
    expect(b.visible.some((v) => v === 1)).toBe(true);
  });

  it('gastar ponto de atributo é ação livre: vale na hora, sem gastar o turno', () => {
    const g = newParty();
    const [, b] = members(g);
    b.hero.statPoints = 1;
    const before = b.hero.stats.int;
    const energy = b.actor.energy;
    queueAction(g, b.id, { type: 'raiseStat', stat: 'int' });
    expect(b.hero.stats.int).toBe(before + 1);
    expect(b.hero.statPoints).toBe(0);
    expect(b.actor.energy).toBe(energy);
    expect(g.party!.queue[b.id]).toBeUndefined();
  });

  it('é determinística: mesmas ações, mesma partida', () => {
    const run = () => {
      const g = createPartyGame(5, SPECS);
      const ids = members(g).map((m) => m.id);
      const moves = [{ type: 'move', dx: 1, dy: 0 }, { type: 'search' }, { type: 'move', dx: 0, dy: 1 }] as const;
      for (let i = 0; i < 12; i++) {
        for (const id of ids) if (memberById(g, id) && !memberById(g, id)!.dead) queueAction(g, id, { ...moves[(i + id) % moves.length] });
        advanceParty(g);
        if (g.over) break;
      }
      return serializeGame(g).replace(/"savedAt":"[^"]*"/, '');
    };
    expect(run()).toBe(run());
  });
});
