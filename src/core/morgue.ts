import type { Game } from './game';
import { computeScore } from './score';
import { classById } from '../data/classes';
import { raceById } from '../data/races';
import { STAT_ABBR, STAT_IDS } from './hero';
import { itemName } from './itemText';
import { isEquipped } from './inventory';
import { formatMessage } from './log';

/** Resumo da partida em linhas de texto (tela final e arquivo "morgue" exportável). */
export function morgueLines(game: Game): string[] {
  const h = game.hero;
  const s = computeScore(game);
  const lines: string[] = [];
  lines.push(`${h.name}, ${raceById(h.raceId).name} ${classById(h.classId).name} de nível ${h.level}`);
  lines.push(game.over ? (game.over.won ? `VITÓRIA — ${game.over.cause}.` : `Morreu: ${game.over.cause} no andar ${game.depth}.`) : `Ainda vivo no andar ${game.depth}.`);
  lines.push(`Andar mais fundo: ${game.maxDepth}   Turnos: ${game.turn}   Monstros mortos: ${h.kills}   Seed: ${game.seed}`);
  lines.push('');
  lines.push(`PONTUAÇÃO: ${s.total}`);
  lines.push(`  ouro ${s.gold} + profundidade ${s.depth} + experiência ${s.xp} + chefes ${s.uniques} + vitória ${s.victory}`);
  lines.push('');
  lines.push('Atributos: ' + STAT_IDS.map((st) => `${STAT_ABBR[st]} ${h.stats[st]}`).join('  '));
  lines.push(`HP ${game.player.hp}/${game.player.maxHp}   MP ${game.player.mp}/${game.player.maxMp}   Defesa ${game.player.defense}   Precisão ${game.player.accuracy}`);
  if (game.uniquesKilled.length) lines.push(`Chefes derrotados: ${game.uniquesKilled.length}`);
  lines.push('');
  lines.push('Inventário:');
  for (const it of h.inventory) {
    // Na tela final tudo é revelado.
    const name = itemName(undefined, { ...it, identified: true });
    lines.push(`  ${it.letter}) ${name}${isEquipped(game, it) ? ' (equipado)' : ''}`);
  }
  if (!h.inventory.length) lines.push('  (vazio)');
  lines.push('');
  lines.push('Últimas mensagens:');
  for (const m of game.log.slice(-10)) lines.push(`  ${formatMessage(m)}`);
  return lines;
}
