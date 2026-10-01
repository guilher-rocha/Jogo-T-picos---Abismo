import type { Screen } from '../engine/screens';
import type { Terminal } from '../engine/terminal';
import { wrapText } from '../engine/terminal';
import { RNG, freshSeed } from '../engine/rng';
import type { KeyInput } from '../data/keymap';
import { RACES } from '../data/races';
import { CLASSES } from '../data/classes';
import { STAT_ABBR, STAT_IDS, createHero, statMod } from '../core/hero';
import type { HeroSpec } from '../core/world';
import { randomName } from '../gen/names';
import type { App } from './app';
import { SCREEN_COLS, SCREEN_ROWS } from './layout';

type Step = 'race' | 'class' | 'name' | 'confirm';

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? String(n) : ' 0');

/** Criação de personagem: raça → classe → nome → resumo (r rerrola atributos). */
export class CreationScreen implements Screen {
  private step: Step = 'race';
  private race = 0;
  private cls = 0;
  private name = '';
  private rollSeed: number | undefined;
  private nameRng = new RNG(freshSeed());

  constructor(private app: App, private onStart: (spec: HeroSpec) => void, private fixed?: { raceId: string; classId: string; title: string }) {
    if (fixed) {
      this.race = Math.max(0, RACES.findIndex((r) => r.id === fixed.raceId));
      this.cls = Math.max(0, CLASSES.findIndex((c) => c.id === fixed.classId));
      this.step = 'name';
      this.name = randomName(this.nameRng, fixed.raceId);
    }
  }

  onKey(k: KeyInput): void {
    switch (this.step) {
      case 'race':
        this.listKey(k, RACES.length, (i) => (this.race = i), () => (this.step = 'class'), () => this.app.showTitle());
        break;
      case 'class':
        this.listKey(k, CLASSES.length, (i) => (this.cls = i), () => {
          this.step = 'name';
          if (!this.name) this.name = randomName(this.nameRng, RACES[this.race].id);
        }, () => (this.step = 'race'));
        break;
      case 'name':
        if (k.key === 'Enter' && this.name.trim()) this.step = 'confirm';
        else if (k.key === 'Escape') {
          if (this.fixed) this.app.showTitle();
          else this.step = 'class';
        }
        else if (k.key === 'Tab') this.name = randomName(this.nameRng, RACES[this.race].id);
        else if (k.key === 'Backspace') this.name = this.name.slice(0, -1);
        else if (k.key.length === 1 && /[\p{L}\p{N} '-]/u.test(k.key) && this.name.length < 16) this.name += k.key;
        break;
      case 'confirm':
        if (k.key === 'Escape') this.step = 'name';
        else if (k.key === 'r' || k.key === 'R') this.rollSeed = freshSeed();
        else if (k.key === 'Enter') {
          this.onStart({ name: this.name.trim(), raceId: RACES[this.race].id, classId: CLASSES[this.cls].id, rollSeed: this.rollSeed });
        }
        break;
    }
  }

  private listKey(k: KeyInput, n: number, set: (i: number) => void, next: () => void, back?: () => void): void {
    const cur = this.step === 'race' ? this.race : this.cls;
    if (k.key === 'ArrowDown' || k.key === 'j') set((cur + 1) % n);
    else if (k.key === 'ArrowUp' || k.key === 'k') set((cur - 1 + n) % n);
    else if (k.key === 'Enter') next();
    else if (k.key === 'Escape' && back) back();
    else {
      const i = 'abcdefghij'.indexOf(k.key);
      if (i >= 0 && i < n) {
        set(i);
        next();
      }
    }
  }

  render(term: Terminal): void {
    term.box(0, 0, SCREEN_COLS, SCREEN_ROWS, 'darkGray', this.fixed?.title ?? 'Novo personagem');
    if (this.fixed) term.print(3, 3, `Personagem do desafio: {white}${RACES[this.race].name} ${CLASSES[this.cls].name}{/}`, 'lightGray');
    const steps: [Step, string][] = [['race', 'Raça'], ['class', 'Classe'], ['name', 'Nome'], ['confirm', 'Confirmar']];
    let sx = 3;
    for (const [id, label] of steps) {
      const active = id === this.step;
      sx += term.print(sx, 2, active ? `[ ${label} ]` : `  ${label}  `, active ? 'yellow' : 'darkGray') + 2;
    }
    if (this.step === 'race') this.renderRaces(term);
    else if (this.step === 'class') this.renderClasses(term);
    else if (this.step === 'name') this.renderName(term);
    else this.renderConfirm(term);
  }

  private renderRaces(term: Terminal): void {
    term.print(3, 4, 'Escolha sua raça:', 'white');
    RACES.forEach((r, i) => {
      const sel = i === this.race;
      term.print(3, 6 + i, `${'abcdefghij'[i]}) ${r.name}`, sel ? 'yellow' : 'lightGray', sel ? 'darkBlue' : 'black');
    });
    const r = RACES[this.race];
    let y = 5;
    const x = 30;
    term.print(x, y++, r.name, 'yellow');
    for (const l of wrapText(r.desc, 64)) term.print(x, y++, l, 'lightGray');
    y++;
    term.print(x, y++, 'Modificadores:', 'darkGray');
    term.print(x, y++, STAT_IDS.map((s) => `${STAT_ABBR[s]} ${signed(r.mods[s])}`).join('   '), 'white');
    y++;
    term.print(x, y++, 'Traços:', 'darkGray');
    for (const l of wrapText(r.traitText, 64)) term.print(x, y++, l, 'lightCyan');
    term.print(3, SCREEN_ROWS - 2, '[a-f / setas] escolhe · [Enter] continua · [Esc] volta ao título', 'darkGray');
  }

  private renderClasses(term: Terminal): void {
    const race = RACES[this.race];
    term.print(3, 4, `Escolha sua classe (${race.name}):`, 'white');
    CLASSES.forEach((c, i) => {
      const sel = i === this.cls;
      const good = c.goodRaces.includes(race.id);
      term.print(3, 6 + i, `${'abcdefghij'[i]}) ${c.name}`, sel ? 'yellow' : 'lightGray', sel ? 'darkBlue' : 'black');
      if (good) term.print(20, 6 + i, '★', 'gold');
    });
    term.print(3, 13, '★ = boa combinação', 'darkGray');
    const c = CLASSES[this.cls];
    let y = 5;
    const x = 30;
    term.print(x, y++, c.name, 'yellow');
    for (const l of wrapText(c.desc, 64)) term.print(x, y++, l, 'lightGray');
    y++;
    term.print(x, y++, `Dado de vida d${c.hitDie} · ${c.castStat ? `conjura com ${STAT_ABBR[c.castStat]}` : 'não conjura magias'}`, 'white');
    term.print(x, y++, 'Atributos base: ' + STAT_IDS.map((s) => `${STAT_ABBR[s]} ${c.stats[s]}`).join('  '), 'white');
    y++;
    term.print(x, y++, 'Habilidades:', 'darkGray');
    for (const ab of c.abilities.slice(0, 4)) {
      term.print(x, y++, `${ab.name} {darkGray}(nível ${ab.level}){/}`, 'lightCyan');
      for (const l of wrapText(ab.desc, 62)) term.print(x + 2, y++, l, 'lightGray');
    }
    term.print(3, SCREEN_ROWS - 2, '[a-e / setas] escolhe · [Enter] continua · [Esc] volta', 'darkGray');
  }

  private renderName(term: Terminal): void {
    term.print(3, 5, 'Qual é o seu nome, aventureiro?', 'white');
    term.print(3, 7, `> ${this.name}`, 'yellow');
    if (Math.floor(performance.now() / 400) % 2 === 0) term.print(5 + this.name.length, 7, '_', 'yellow');
    term.print(3, SCREEN_ROWS - 2, '[digite] nome · [Tab] nome aleatório · [Enter] continua · [Esc] volta', 'darkGray');
  }

  private renderConfirm(term: Terminal): void {
    const race = RACES[this.race];
    const cls = CLASSES[this.cls];
    const hero = createHero(this.name, race.id, cls.id, this.rollSeed !== undefined ? new RNG(this.rollSeed) : undefined);
    term.print(3, 5, `{yellow}${this.name}{/}, ${race.name} ${cls.name}`, 'white');
    let y = 7;
    for (const s of STAT_IDS) {
      const v = hero.stats[s];
      term.print(5, y++, `${STAT_ABBR[s]}  {white}${String(v).padStart(2)}{/}  (${signed(statMod(v))})`, 'lightGray');
    }
    y++;
    term.print(5, y++, `Traços: ${race.traitText}`, 'lightCyan', 'black', 90);
    term.print(5, y++, `Equipamento: ${cls.startingItems.length} itens iniciais da classe.`, 'lightGray');
    term.print(3, SCREEN_ROWS - 2, '[Enter] começar a aventura · [r] rerrolar atributos · [Esc] volta', 'darkGray');
  }
}
