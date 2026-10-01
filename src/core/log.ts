import type { Color } from '../engine/colors';

export interface LogMessage {
  text: string;
  color: Color;
  turn: number;
  /** Quantas vezes a mesma mensagem se repetiu em sequência. */
  count: number;
}

export const MAX_LOG = 300;

/** Adiciona mensagem ao log, agrupando repetições consecutivas ("O rato morde você. (x3)"). */
export function pushMessage(log: LogMessage[], text: string, color: Color, turn: number): void {
  const last = log[log.length - 1];
  if (last && last.text === text && last.turn >= turn - 1) {
    last.count++;
    last.turn = turn;
    return;
  }
  log.push({ text, color, turn, count: 1 });
  if (log.length > MAX_LOG) log.splice(0, log.length - MAX_LOG);
}

export function formatMessage(m: LogMessage): string {
  return m.count > 1 ? `${m.text} (x${m.count})` : m.text;
}
