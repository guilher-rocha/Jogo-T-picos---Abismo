import type { Game } from './game';
import { level, message, seesActor } from './game';
import { itemsAt } from './item';
import { Tile } from '../data/tiles';

/** Dicas contextuais para iniciantes (cada uma aparece uma vez por partida). */
const HINTS: { id: string; when: (g: Game) => boolean; text: string }[] = [
  { id: 'move', when: (g) => g.turn <= 1, text: 'Dica: ande com as setas, numpad ou hjklyubn. Pressione ? para ver todas as teclas.' },
  { id: 'monster', when: (g) => level(g).actors.some((a) => seesActor(g, a)), text: 'Dica: para atacar, ande na direção do monstro. Use x para examiná-lo.' },
  { id: 'item', when: (g) => itemsAt(level(g), g.player.x, g.player.y).length > 0, text: 'Dica: g pega o item do chão; i abre o inventário.' },
  { id: 'hurt', when: (g) => g.player.hp < g.player.maxHp * 0.4, text: 'Dica: com pouca vida, beba uma poção (q), fuja ou descanse (R) longe dos inimigos.' },
  { id: 'stairs', when: (g) => level(g).map.tiles[g.player.y * level(g).map.width + g.player.x] === Tile.StairsDown, text: 'Dica: > desce a escada. Andares mais fundos são mais perigosos (e valem mais pontos).' },
  { id: 'hungry', when: (g) => g.hero.nutrition < 600, text: 'Dica: você está com fome. Coma algo (E) antes de ficar fraco.' },
  { id: 'levelpts', when: (g) => g.hero.statPoints > 0, text: 'Dica: você ganhou um ponto de atributo. Abra a ficha (C) para gastá-lo.' },
  { id: 'explore', when: (g) => g.turn > 30 && g.depth === 1, text: 'Dica: X explora automaticamente e G leva até a escada conhecida.' },
];

export function showHints(game: Game): void {
  const shown = (game.hintsShown ??= []);
  for (const h of HINTS) {
    if (shown.includes(h.id) || !h.when(game)) continue;
    shown.push(h.id);
    message(game, h.text, 'lightCyan');
    return; // uma dica por vez
  }
}
