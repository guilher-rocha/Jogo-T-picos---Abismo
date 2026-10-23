import type { RGBA } from './color';
import { hex } from './color';
import { PAL } from './palette';
import type { PixelPalette } from './pixmap';
import { Pixmap, fromRows, rowsOf } from './pixmap';

/**
 * Heróis: 6 raças × 5 classes.
 *
 * Cada classe é uma figura completa de 16×16 (roupa, chapéu/elmo e arma já posicionados) com o rosto
 * em cores "neutras" (s S z = pele, h H = cabelo). A raça entra em três passos:
 *   1. troca as cores de pele e cabelo;
 *   2. desenha os traços da raça POR CIMA da figura (orelhas saindo do elmo, barba sobre o peito,
 *      presas, nariz, pés descalços) — assim eles nunca ficam escondidos pelo equipamento;
 *   3. raças baixas perdem linhas do tronco/pernas (a cabeça continua do mesmo tamanho).
 * O contorno escuro é automático. Nos blocos, '.' é transparente e os espaços só separam colunas.
 */

const HERO_PAL: PixelPalette = {
  ...PAL,
  h: '#6a4027', // cabelo (claro) — valor único para a troca de cor não colidir com a paleta
  H: '#46281b', // cabelo (escuro)
  x: '#e0b040', // detalhe dourado
};

const L = (name: string, block: string): Pixmap => fromRows(rowsOf(block).map((r) => r.replace(/ /g, '')), HERO_PAL, name, 16);

// ─────────────── figuras por classe (raça "neutra", altura normal) ───────────────
// Linhas: 0–3 chapéu/elmo · 4 olhos · 5 bochechas · 6 queixo · 7–10 tronco · 11 cinto · 12–13 pernas · 14 pés.
// Rosto sempre nas colunas 5–10, olhos (K) nas colunas 6 e 9.

const CLASS_ART: Record<string, Pixmap> = {
  // Elmo de aço com penacho vermelho, tabardo vermelho com leão dourado,
  // escudo vermelho com cruz dourada e aro de aço, espada erguida.
  warrior: L('hero.warrior', `
.... ...q Q... ....
.... ..5R q4.. .6..
.... .566 554. .5..
.... 4555 5543 .5..
.... 4sKs sKs3 .5..
.... 3sss sss3 .5..
.... .Ssz zsS. .5..
...4 554S S455 45..
.454 .4qR Rq45 .5..
5qyq 54Ry yR43 yyy.
5yyy 44RR RR34 sc..
4qyq 43cy yc3. .y..
.4q4 .3qR Rq3. ....
..4. .32. .23. ....
.... cbb. .bbc ....
.... .... .... ....
`),
  // Chapéu pontudo de aba larga com estrela, manto azul com faixa dourada, cajado com orbe arcano.
  mage: L('hero.mage', `
.... .... U... .M..
.... ...u U... mMm.
.... ..uU iU.. .m..
...u uUUU yUUu uc..
.... hsKs sKsh .c..
.... hsss sssh .c..
.... .Ssz zsS. .c..
.... uUUS SUUu .c..
...u UiUy yUUu sc..
...u UUUy yUUu .c..
...s UUUy yUUu .c..
.... uUUy yUUu .c..
.... uUUy yUUu .c..
...u uUUy yUUu uc..
.... cb.. ..bc .c..
.... .... .... ....
`),
  // Capuz escuro e pontudo, lenço roxo cobrindo nariz e boca (só os olhos aparecem),
  // colete de couro, cinto com fivela e duas adagas erguidas.
  rogue: L('hero.rogue', `
.... .... .... ....
.... ...3 2... ....
.... ..33 22.. ....
.... 2333 3221 ....
.... 2SKs sKS1 ....
.... 2PmM MmP1 ....
..6. 12PP PP21 .6..
..51 23cd dc32 15..
..51 23cd dc32 15..
.yyy 23cd dc32 yyy.
..s. 2bbY Ybb1 .s..
.... 1322 2231 ....
.... 1.3. .3.1 ....
.... ..2. .2.. ....
.... .bb. .bb. ....
.... .... .... ....
`),
  // Mitra branca com cruz dourada, túnica com sombra, estola azul, cruz no peito e maça com flanges.
  cleric: L('hero.cleric', `
.... ...W W... ....
.... ..Wv yW.. ....
.... .Wvy yyW. ....
.... .xxx xxx. ....
.... hsKs sKsh ....
.... hsss sssh .4..
.... .Ssz zsS. 454.
...w Wvv5 5vvW w4..
...w vUvy yvUv wc..
...W vUyy yyUv sc..
...s WUvy yvUW wc..
...w WUvv vvUW wc..
...w WUWv vWUW w...
..ww WWWW WWWW ww..
.... cb.. ..bc ....
.... .... .... ....
`),
  // Capuz verde, aljava com flechas nas costas, alça de couro cruzando o peito e arco longo.
  ranger: L('hero.ranger', `
.... .... .... ....
.... ...G Gg.. ....
...c ..Gl lGg. ....
..c. .Gll lGGg ....
.d.. GsKs sKsg .Qv.
.c.. gsss sssg qQ..
.c.. gSsz zsSg bb..
.d.. gGlG GGcg ....
.sGG gGlG GcGg G...
.c.. gGlG cGGg Gs..
.d.. gGGc GGGg ....
.c.. bbbx xbbb ....
..c. gGGg gGGg ....
...c .dc. .cd. ....
.... .bb. .bb. ....
.... .... .... ....
`),
};

export const RACE_IDS = ['human', 'elf', 'dwarf', 'halfling', 'half_orc', 'gnome'] as const;
export const CLASS_IDS = ['warrior', 'mage', 'rogue', 'cleric', 'ranger'] as const;

interface RaceLook {
  skin: [string, string, string];
  hair: [string, string];
  /** Linhas removidas para raças baixas (tronco e pernas; a cabeça fica igual). */
  drop: number[];
}

const LOOKS: Record<string, RaceLook> = {
  human: { skin: ['#f2cfa6', '#d19a72', '#9e6648'], hair: ['#7a4a28', '#4e2c18'], drop: [] },
  elf: { skin: ['#f8e6d2', '#e0bea0', '#ac846c'], hair: ['#f4e08a', '#c8a44c'], drop: [] },
  dwarf: { skin: ['#eab08a', '#c8865e', '#8c5238'], hair: ['#d8642a', '#963e16'], drop: [9, 12] },
  halfling: { skin: ['#f6d4ac', '#dea47c', '#a46c50'], hair: ['#6a3e22', '#3e2414'], drop: [9, 12] },
  half_orc: { skin: ['#9cbc78', '#6c9456', '#466a3a'], hair: ['#2c2434', '#16121c'], drop: [] },
  gnome: { skin: ['#f0b892', '#d48e6a', '#96604a'], hair: ['#f2f0f8', '#b4b0c8'], drop: [9, 12, 13] },
};

function recolor(p: Pixmap, look: RaceLook): Pixmap {
  return p.swap({
    [HERO_PAL.s]: look.skin[0], [HERO_PAL.S]: look.skin[1], [HERO_PAL.z]: look.skin[2],
    [HERO_PAL.h]: look.hair[0], [HERO_PAL.H]: look.hair[1],
  });
}

const BLUSH = hex('#e88078');
const TUSK = hex('#fbf6e8');

/**
 * Traços da raça, desenhados por cima da figura pronta.
 * `soft` só pinta onde ainda está vazio (orelhas e cachos não cobrem armas).
 */
function raceFeatures(img: Pixmap, race: string, cls: string, look: RaceLook): void {
  const [s, S, z] = look.skin.map(hex) as [RGBA, RGBA, RGBA];
  const [h, H] = look.hair.map(hex) as [RGBA, RGBA];
  const put = (x: number, y: number, c: RGBA) => img.set(x, y, c);
  const soft = (x: number, y: number, c: RGBA) => {
    if (img.alpha(x, y) === 0) img.set(x, y, c);
  };
  switch (race) {
    case 'elf':
      // Orelhas longas e pontudas saindo dos lados da cabeça (por fora do elmo/capuz).
      soft(3, 4, S); soft(2, 3, s); soft(3, 3, s);
      soft(12, 4, S); soft(13, 3, s); soft(12, 3, s);
      // Cabelo claro e comprido caindo sobre os ombros.
      put(4, 6, h); put(11, 6, h); put(4, 7, H); put(11, 7, H);
      if (cls !== 'warrior') {
        put(4, 5, h);
        put(11, 5, h);
      }
      break;
    case 'dwarf':
      // Barba ruiva farta, trançada, cobrindo o queixo e o peito; bigode.
      put(6, 5, H); put(9, 5, H);
      for (let x = 5; x <= 10; x++) put(x, 6, h);
      for (let x = 5; x <= 10; x++) put(x, 7, x % 2 ? h : H);
      for (let x = 6; x <= 9; x++) put(x, 8, x % 2 ? H : h);
      put(7, 9, h); put(8, 9, H);
      put(7, 10, H);
      // Bochechas avermelhadas acima da barba.
      put(5, 5, S); put(10, 5, S);
      break;
    case 'halfling':
      // Cachos escuros escapando do chapéu, bochechas coradas e pés descalços peludos.
      soft(3, 4, h); soft(12, 4, h); soft(3, 5, H); soft(12, 5, H);
      put(4, 5, h); put(11, 5, h);
      put(5, 5, BLUSH); put(10, 5, BLUSH);
      for (const x of [4, 5, 6, 9, 10, 11]) if (img.alpha(x, 14) > 0) put(x, 14, s);
      put(5, 14, S); put(10, 14, S); put(4, 14, z); put(11, 14, z);
      soft(5, 13, H); soft(10, 13, H);
      break;
    case 'half_orc':
      // Presas saindo da boca e sobrancelha pesada; orelhas curtas e pontudas.
      put(6, 6, TUSK); put(9, 6, TUSK);
      put(7, 6, z); put(8, 6, z);
      put(6, 5, z); put(9, 5, z);
      soft(3, 4, S); soft(12, 4, S);
      break;
    case 'gnome':
      // Nariz grande e vermelho, barba branca pontuda.
      put(7, 5, hex('#e8907a')); put(8, 5, hex('#d0706a'));
      put(7, 6, hex('#e8907a'));
      put(5, 6, h); put(6, 6, h); put(8, 6, h); put(9, 6, h); put(10, 6, h);
      for (let x = 6; x <= 9; x++) put(x, 7, x === 6 || x === 9 ? H : h);
      put(7, 8, h); put(8, 8, H);
      put(7, 9, H);
      break;
    default:
      break;
  }
}

/** Monta o sprite 16×16 de um herói (já com contorno). */
export function makeHero(race: string, cls: string): Pixmap {
  const look = LOOKS[race] ?? LOOKS.human;
  const img = recolor(CLASS_ART[cls] ?? CLASS_ART.warrior, look);
  raceFeatures(img, race, cls, look);
  return img.dropRows(look.drop).outline();
}

/** Dois quadros de idle: o corpo "respira" (a cabeça desce 1 px). */
export function heroFrames(race: string, cls: string): Pixmap[] {
  const a = makeHero(race, cls);
  return [a, a.squashRow(10)];
}
