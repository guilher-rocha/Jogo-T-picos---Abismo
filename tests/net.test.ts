import { describe, expect, it } from 'vitest';
import { Room } from '../src/net/room';
import type { Conn } from '../src/net/room';
import type { ServerMsg } from '../src/net/protocol';
import { decodeSnapshot, serverUrl, snapshotFor } from '../src/net/protocol';
import { level } from '../src/core/game';
import { createPartyGame, members } from '../src/core/party';
import { damage } from '../src/core/combat';

/** Conexão falsa: guarda tudo o que o servidor mandou. */
class FakeConn implements Conn {
  got: ServerMsg[] = [];
  send(msg: ServerMsg): void {
    this.got.push(JSON.parse(JSON.stringify(msg)));
  }
  last<T extends ServerMsg['t']>(t: T): Extract<ServerMsg, { t: T }> | undefined {
    return [...this.got].reverse().find((m) => m.t === t) as Extract<ServerMsg, { t: T }> | undefined;
  }
}

let tokens = 0;
const room = () => new Room(() => 77, () => `tok${++tokens}`);
const join = (r: Room, name: string, classId = 'warrior') => {
  const c = new FakeConn();
  r.handle(c, { t: 'hello', name, raceId: 'human', classId });
  return c;
};

/** Sala com dois jogadores prontos e a partida iniciada. */
function started() {
  const r = room();
  const a = join(r, 'Ana');
  const b = join(r, 'Bia', 'mage');
  r.handle(b, { t: 'ready', ready: true });
  r.handle(a, { t: 'start' });
  return { r, a, b };
}

describe('sala do multijogador', () => {
  it('quem entra primeiro é o líder; todos veem a sala', () => {
    const r = room();
    const a = join(r, 'Ana');
    const b = join(r, 'Bia');
    expect(a.last('welcome')?.token).toBeTruthy();
    const lobby = b.last('lobby')!;
    expect(lobby.players.map((p) => p.name)).toEqual(['Ana', 'Bia']);
    expect(lobby.players[0].leader).toBe(true);
    expect(a.last('lobby')?.players).toHaveLength(2);
  });

  it('só o líder inicia, e só com todos prontos', () => {
    const r = room();
    const a = join(r, 'Ana');
    const b = join(r, 'Bia');
    r.handle(b, { t: 'start' });
    expect(b.last('error')?.text).toMatch(/líder/);
    r.handle(a, { t: 'start' });
    expect(a.last('error')?.text).toMatch(/pronto/);
    expect(r.game).toBeNull();
    r.handle(b, { t: 'ready', ready: true });
    r.handle(a, { t: 'start' });
    expect(r.game).not.toBeNull();
  });

  it('ao iniciar, cada um recebe o estado na própria perspectiva', () => {
    const { a, b } = started();
    const sa = a.last('state')!;
    const sb = b.last('state')!;
    expect(sa.you).not.toBe(sb.you);
    const ga = decodeSnapshot(sa.snapshot, sa.you);
    const gb = decodeSnapshot(sb.snapshot, sb.you);
    expect(ga.hero.name).toBe('Ana');
    expect(gb.hero.name).toBe('Bia');
    expect(gb.hero.classId).toBe('mage');
    expect(members(ga)).toHaveLength(2);
    expect(sa.waiting.sort()).toEqual([sa.you, sb.you].sort());
  });

  it('as ações vão para o servidor e o estado volta para todos', () => {
    const { r, a, b } = started();
    // tira os monstros para o teste não depender deles
    level(r.game!).actors = [];
    const you = a.last('state')!.you;
    const before = decodeSnapshot(a.last('state')!.snapshot, you).player;
    const n = b.got.length;
    r.handle(a, { t: 'action', action: { type: 'search' } });
    expect(b.got.length).toBeGreaterThan(n);
    const st = b.last('state')!;
    expect(st.waiting).toEqual([st.you]); // Ana já agiu: falta a Bia
    const after = decodeSnapshot(a.last('state')!.snapshot, you).player;
    expect(after.energy).toBeLessThan(before.energy);
  });

  it('desconectado não trava: o herói espera; reconectar com o token volta ao jogo', () => {
    const { r, a, b } = started();
    level(r.game!).actors = [];
    const tokenB = b.last('welcome')!.token;
    const turn = r.game!.turn;
    r.disconnect(b);
    r.handle(a, { t: 'action', action: { type: 'search' } });
    expect(r.game!.turn).toBeGreaterThan(turn); // o mundo andou sem a Bia
    const b2 = new FakeConn();
    r.handle(b2, { t: 'hello', name: 'Bia', raceId: 'human', classId: 'mage', token: tokenB });
    const st = b2.last('state')!;
    expect(decodeSnapshot(st.snapshot, st.you).hero.name).toBe('Bia');
    expect(members(r.game!).every((m) => m.connected)).toBe(true);
  });

  it('não dá para entrar no meio da partida; chat aparece no registro', () => {
    const { r, a } = started();
    const c = join(r, 'Caio');
    expect(c.last('error')?.text).toMatch(/andamento/);
    r.handle(a, { t: 'chat', text: 'vamos pela esquerda {red}' });
    const st = a.last('state')!;
    const log = decodeSnapshot(st.snapshot, st.you).log;
    expect(log[log.length - 1].text).toBe('Ana: vamos pela esquerda red');
  });

  it('fim da partida devolve todos para a sala de espera', () => {
    const { r, a, b } = started();
    for (const m of members(r.game!)) damage(r.game!, m.actor, 9999);
    r.handle(a, { t: 'action', action: { type: 'search' } });
    expect(r.game).toBeNull();
    expect(b.last('lobby')?.inGame).toBe(false);
    expect(b.last('lobby')?.players.every((p) => !p.ready)).toBe(true);
  });
});

describe('estado enviado pela rede', () => {
  it('leva só o andar atual, sem o RNG, e o caído vê pelos olhos de um aliado', () => {
    const g = createPartyGame(3, [{ name: 'Ana', raceId: 'human', classId: 'warrior' }, { name: 'Bia', raceId: 'elf', classId: 'mage' }]);
    const [, bia] = members(g);
    const raw = JSON.parse(snapshotFor(g, bia.id));
    expect(Object.keys(raw.levels)).toEqual([String(g.depth)]);
    expect(raw.rng).toBeUndefined();
    damage(g, bia.actor, 9999);
    const seen = decodeSnapshot(snapshotFor(g, bia.id), bia.id);
    expect(seen.hero.name).toBe('Bia');
    expect(level(seen).map.visible).toEqual(members(g)[0].visible);
  });

  it('endereço do servidor: mesma origem, porta padrão ou ?server=', () => {
    const loc = { protocol: 'http:', host: '192.168.0.5:8080', hostname: '192.168.0.5', search: '' };
    expect(serverUrl(loc, true)).toBe('ws://192.168.0.5:8080/ws');
    expect(serverUrl({ ...loc, host: '192.168.0.5:5173' }, false)).toBe('ws://192.168.0.5:8080/ws');
    expect(serverUrl({ ...loc, search: '?server=10.0.0.2:9000' }, false)).toBe('ws://10.0.0.2:9000/ws');
  });
});
