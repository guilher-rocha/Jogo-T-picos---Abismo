import type { Screen } from '../engine/screens';
import type { Terminal } from '../engine/terminal';
import type { KeyInput } from '../data/keymap';
import type { Game } from '../core/game';
import { MAX_LEVEL, STAT_ABBR, STAT_IDS, STAT_NAME, raiseStat, statMod, xpForLevel } from '../core/hero';
import { classById } from '../data/classes';
import { raceById } from '../data/races';
import { wrapText } from '../engine/terminal';
import type { App } from './app';
import { SCREEN_COLS, SCREEN_ROWS } from './layout';
import { bar, hpColor } from './hud';

const signed = (n: number) => (n >= 0 ? `+${n}` : String(n));

/** Ficha do personagem. Com pontos de atributo, as letras a–e aumentam um atributo. */
export class CharacterScreen implements Screen {
  readonly modal = true;

  constructor(private app: App, private game: Game) {}

  onKey(k: KeyInput): void {
    const i = 'abcde'.indexOf(k.key);
    if (i >= 0 && this.game.hero.statPoints > 0) {
      raiseStat(this.game, STAT_IDS[i]);
      return;
    }
    if (k.key === 'Escape' || k.key === 'Enter' || k.key === 'C' || k.key === ' ') this.app.screens.pop();
  }

  render(term: Terminal): void {
    const { hero, player: p } = this.game;
    const cls = classById(hero.classId);
    const race = raceById(hero.raceId);
    term.box(0, 0, SCREEN_COLS, SCREEN_ROWS, 'darkGray', 'Ficha do personagem');
    let y = 2;
    term.print(3, y++, `{white}${hero.name}{/}, ${race.name} ${cls.name} de nível {white}${hero.level}{/}`, 'lightGray');
    y++;
    const next = hero.level < MAX_LEVEL ? xpForLevel(hero.level + 1) : hero.xp;
    term.print(3, y, `XP  ${hero.xp} / ${next}`, 'lightGray');
    bar(term, 26, y++, 20, hero.xp - xpForLevel(hero.level), next - xpForLevel(hero.level), 'gold');
    term.print(3, y, `HP  ${p.hp} / ${p.maxHp}`, hpColor(p.hp, p.maxHp));
    bar(term, 26, y++, 20, p.hp, p.maxHp, hpColor(p.hp, p.maxHp));
    if (p.maxMp > 0) {
      term.print(3, y, `MP  ${p.mp} / ${p.maxMp}`, 'lightBlue');
      bar(term, 26, y++, 20, p.mp, p.maxMp, 'lightBlue');
    }
    y++;
    term.print(3, y++, '── Atributos ──', 'darkGray');
    STAT_IDS.forEach((s, i) => {
      const v = hero.stats[s];
      const prefix = hero.statPoints > 0 ? `{yellow}${'abcde'[i]}){/} ` : '   ';
      term.print(3, y++, `${prefix}${STAT_ABBR[s]} {white}${String(v).padStart(2)}{/} (${signed(statMod(v))})  ${STAT_NAME[s]}`, 'lightGray');
    });
    if (hero.statPoints > 0) term.print(3, y++, `Você tem ${hero.statPoints} ponto(s) de atributo: pressione a letra para gastar.`, 'gold');
    y++;
    term.print(3, y++, '── Combate ──', 'darkGray');
    term.print(3, y++, `Precisão  {white}${signed(p.accuracy)}{/}    Defesa {white}${p.defense}{/}    Velocidade {white}${p.speed}{/}    Luz {white}${p.light}{/}`, 'lightGray');
    term.print(3, y++, `Ataque    {white}${p.attacks.map((a) => a.damage).join(' + ')}{/}`, 'lightGray');
    y++;
    term.print(3, y++, '── Progresso ──', 'darkGray');
    term.print(3, y++, `Andar atual {white}${this.game.depth}{/}   Mais fundo {white}${this.game.maxDepth}{/}`, 'lightGray');
    term.print(3, y++, `Monstros mortos {white}${hero.kills}{/}   Turnos {white}${this.game.turn}{/}`, 'lightGray');

    // Coluna da direita: raça e habilidades
    let ry = 4;
    const rx = 56;
    term.print(rx, ry++, `── ${race.name} ──`, 'darkGray');
    for (const l of wrapText(race.traitText, 40)) term.print(rx, ry++, l, 'lightGray');
    ry++;
    term.print(rx, ry++, `── Habilidades de ${cls.name} ──`, 'darkGray');
    for (const ab of cls.abilities) {
      const have = hero.level >= ab.level;
      term.print(rx, ry++, `${have ? '{lightCyan}' : '{darkGray}'}${ab.name}{/} {darkGray}(nível ${ab.level}${ab.active ? ', ativa' : ''}){/}`, 'lightGray');
      for (const l of wrapText(ab.desc, 40)) term.print(rx + 2, ry++, l, have ? 'lightGray' : 'darkGray');
      if (ry > SCREEN_ROWS - 3) break;
    }
    term.print(SCREEN_COLS - 14, SCREEN_ROWS - 1, ' Esc fecha ', 'darkGray');
  }
}
