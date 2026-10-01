import { RNG, hashString } from '../engine/rng';
import { RACES } from '../data/races';
import { CLASSES } from '../data/classes';

/** Data local no formato AAAA-MM-DD. */
export function todayString(d = new Date()): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Desafio diário: a mesma seed (e o mesmo personagem) para todos no mesmo dia. */
export function dailyChallenge(date: string): { seed: number; raceId: string; classId: string } {
  const seed = hashString(`abismo-diario-${date}`);
  const rng = new RNG(seed).fork('daily-hero');
  return { seed, raceId: rng.pick(RACES).id, classId: rng.pick(CLASSES).id };
}

export interface ChallengeCode {
  seed: number;
  raceId: string;
  classId: string;
  /** Pontuação a superar. */
  score: number;
}

function checksum(text: string): string {
  return (hashString(text) % 1296).toString(36).toUpperCase().padStart(2, '0');
}

/**
 * Código curto para mandar a um amigo: seed + personagem + pontuação-alvo.
 * Ex.: "ABISMO-1KX9F2-23-4KZ-7Q" (o final é um dígito verificador).
 */
export function encodeChallenge(c: ChallengeCode): string {
  const r = RACES.findIndex((x) => x.id === c.raceId);
  const k = CLASSES.findIndex((x) => x.id === c.classId);
  const body = `${(c.seed >>> 0).toString(36).toUpperCase()}-${r}${k}-${c.score.toString(36).toUpperCase()}`;
  return `ABISMO-${body}-${checksum(body)}`;
}

export function decodeChallenge(code: string): ChallengeCode | null {
  const m = /^ABISMO-([0-9A-Z]+)-(\d)(\d)-([0-9A-Z]+)-([0-9A-Z]{2})$/.exec(code.trim().toUpperCase());
  if (!m) return null;
  const body = `${m[1]}-${m[2]}${m[3]}-${m[4]}`;
  if (checksum(body) !== m[5]) return null;
  const race = RACES[Number(m[2])];
  const cls = CLASSES[Number(m[3])];
  if (!race || !cls) return null;
  return { seed: parseInt(m[1], 36) >>> 0, raceId: race.id, classId: cls.id, score: parseInt(m[4], 36) };
}
