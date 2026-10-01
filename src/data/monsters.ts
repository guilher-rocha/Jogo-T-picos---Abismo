import type { Color } from '../engine/colors';
import type { Attack, Gender } from '../core/actor';
import { BOSSES } from './bosses';

/**
 * Modelo (arquétipo) de monstro. Monstros concretos são gerados a partir destes dados.
 *
 * Flags de comportamento:
 * - 'opensDoors'  abre portas
 * - 'erratic'     anda aleatoriamente boa parte do tempo
 * - 'stationary'  nunca sai do lugar (fungos, geleias)
 * - 'regenerates' recupera HP rápido
 * - 'undead'      morto-vivo
 * - 'animal'      animal (não abre portas, não usa itens)
 * - 'unique'      só existe um por partida (chefes)
 * - 'boss'        chefe de andar
 */
export interface MonsterTemplate {
  id: string;
  name: string;
  gender: Gender;
  glyph: string;
  color: Color;
  level: number;
  hp: string;
  speed: number;
  accuracy: number;
  defense: number;
  attacks: Attack[];
  xp: number;
  flags: string[];
  /** Faixa de andares em que aparece normalmente. */
  depth: [number, number];
  /** Peso relativo no sorteio (maior = mais comum). */
  rarity: number;
  /** Nasce em grupo de [mín, máx]. */
  group?: [number, number];
  desc: string;
}

const m = (t: MonsterTemplate): MonsterTemplate => t;

export const MONSTERS: MonsterTemplate[] = [
  // ── Andares 1–4 ──────────────────────────────────────────────
  m({ id: 'rat', name: 'rato', gender: 'm', glyph: 'r', color: 'brown', level: 1, hp: '1d4+1', speed: 100, accuracy: 1, defense: 1,
    attacks: [{ verb: 'morde', damage: '1d3' }], xp: 2, flags: ['animal'], depth: [1, 4], rarity: 10,
    desc: 'Um rato enorme e sarnento, de olhos vermelhos.' }),
  m({ id: 'bat', name: 'morcego', gender: 'm', glyph: 'b', color: 'darkGray', level: 1, hp: '1d4', speed: 150, accuracy: 2, defense: 3,
    attacks: [{ verb: 'morde', damage: '1d2' }], xp: 2, flags: ['animal', 'erratic'], depth: [1, 5], rarity: 6,
    desc: 'Um morcego que voa em ziguezague.' }),
  m({ id: 'kobold', name: 'kobold', gender: 'm', glyph: 'k', color: 'lightGreen', level: 1, hp: '1d6+1', speed: 100, accuracy: 2, defense: 2,
    attacks: [{ verb: 'golpeia', damage: '1d4' }], xp: 4, flags: ['opensDoors'], depth: [1, 5], rarity: 8,
    desc: 'Um pequeno humanoide reptiliano, covarde e traiçoeiro.' }),
  m({ id: 'jackal', name: 'chacal', gender: 'm', glyph: 'c', color: 'yellow', level: 1, hp: '1d5', speed: 110, accuracy: 2, defense: 2,
    attacks: [{ verb: 'morde', damage: '1d3' }], xp: 3, flags: ['animal'], depth: [1, 4], rarity: 6, group: [2, 4],
    desc: 'Um cão selvagem que caça em matilha.' }),
  m({ id: 'green_jelly', name: 'geleia verde', gender: 'f', glyph: 'j', color: 'lightGreen', level: 2, hp: '3d6', speed: 100, accuracy: 1, defense: 0,
    attacks: [{ verb: 'queima', damage: '1d4', element: 'acid' }], xp: 6, flags: ['stationary'], depth: [1, 6], rarity: 4,
    desc: 'Uma massa gelatinosa e ácida que nunca sai do lugar.' }),
  m({ id: 'goblin', name: 'goblin', gender: 'm', glyph: 'g', color: 'green', level: 2, hp: '2d5', speed: 100, accuracy: 3, defense: 3,
    attacks: [{ verb: 'golpeia', damage: '1d6' }], xp: 6, flags: ['opensDoors'], depth: [1, 6], rarity: 8,
    desc: 'Um goblin magricela armado com uma lâmina enferrujada.' }),
  m({ id: 'cave_spider', name: 'aranha das cavernas', gender: 'f', glyph: 's', color: 'darkGray', level: 2, hp: '1d6', speed: 120, accuracy: 3, defense: 3,
    attacks: [{ verb: 'pica', damage: '1d4' }], xp: 4, flags: ['animal'], depth: [2, 6], rarity: 5, group: [3, 6],
    desc: 'Pequenas aranhas negras que surgem aos montes das frestas.' }),
  m({ id: 'skeleton', name: 'esqueleto', gender: 'm', glyph: 'z', color: 'white', level: 3, hp: '2d8', speed: 100, accuracy: 4, defense: 4,
    attacks: [{ verb: 'golpeia', damage: '1d6' }], xp: 9, flags: ['undead', 'opensDoors'], depth: [2, 7], rarity: 6,
    desc: 'Ossos animados por magia antiga, ainda segurando uma espada.' }),

  // ── Andares 4–8 ──────────────────────────────────────────────
  m({ id: 'orc', name: 'orc', gender: 'm', glyph: 'o', color: 'lightRed', level: 4, hp: '3d8', speed: 100, accuracy: 5, defense: 5,
    attacks: [{ verb: 'golpeia', damage: '1d8' }], xp: 14, flags: ['opensDoors'], depth: [3, 9], rarity: 8, group: [2, 4],
    desc: 'Um orc brutal de pele acinzentada, sempre em bando.' }),
  m({ id: 'giant_spider', name: 'aranha gigante', gender: 'f', glyph: 'S', color: 'magenta', level: 5, hp: '4d6', speed: 110, accuracy: 6, defense: 5,
    attacks: [{ verb: 'pica', damage: '1d6', effect: { status: 'poisoned', chance: 40, duration: '2d4' } }], xp: 20, flags: ['animal'], depth: [4, 9], rarity: 5,
    desc: 'Uma aranha do tamanho de um cão, com presas que pingam veneno.' }),
  m({ id: 'zombie', name: 'zumbi', gender: 'm', glyph: 'z', color: 'lightGray', level: 4, hp: '4d8', speed: 70, accuracy: 4, defense: 3,
    attacks: [{ verb: 'arranha', damage: '1d8' }], xp: 14, flags: ['undead'], depth: [4, 10], rarity: 6,
    desc: 'Um cadáver lento e persistente.' }),
  m({ id: 'goblin_shaman', name: 'xamã goblin', gender: 'm', glyph: 'g', color: 'lightMagenta', level: 4, hp: '2d6', speed: 100, accuracy: 3, defense: 3,
    attacks: [{ verb: 'golpeia', damage: '1d4' }], xp: 16, flags: ['opensDoors', 'caster'], depth: [3, 8], rarity: 4,
    desc: 'Um goblin coberto de ossos e penas, que murmura feitiços.' }),
  m({ id: 'poison_fungus', name: 'fungo venenoso', gender: 'm', glyph: 'F', color: 'lightMagenta', level: 3, hp: '3d6', speed: 100, accuracy: 4, defense: 1,
    attacks: [{ verb: 'solta esporos em', damage: '1d4', effect: { status: 'poisoned', chance: 50, duration: '1d6' } }], xp: 8, flags: ['stationary'], depth: [3, 9], rarity: 4,
    desc: 'Um fungo arroxeado que libera nuvens de esporos tóxicos.' }),
  m({ id: 'wolf', name: 'lobo', gender: 'm', glyph: 'C', color: 'lightGray', level: 5, hp: '3d8', speed: 120, accuracy: 6, defense: 5,
    attacks: [{ verb: 'morde', damage: '1d6' }], xp: 18, flags: ['animal'], depth: [5, 10], rarity: 5, group: [3, 5],
    desc: 'Um lobo cinzento de olhos amarelos.' }),
  m({ id: 'dwarf', name: 'anão renegado', gender: 'm', glyph: 'h', color: 'red', level: 6, hp: '4d8', speed: 100, accuracy: 7, defense: 7,
    attacks: [{ verb: 'golpeia', damage: '1d10' }], xp: 25, flags: ['opensDoors'], depth: [5, 10], rarity: 4,
    desc: 'Um anão de barba trançada, enlouquecido pela cobiça.' }),
  m({ id: 'gnoll', name: 'gnoll', gender: 'm', glyph: 'C', color: 'brown', level: 6, hp: '4d8', speed: 100, accuracy: 7, defense: 6,
    attacks: [{ verb: 'morde', damage: '1d8' }, { verb: 'arranha', damage: '1d4' }], xp: 24, flags: ['opensDoors'], depth: [6, 11], rarity: 4, group: [2, 3],
    desc: 'Um humanoide com cabeça de hiena que gargalha ao lutar.' }),

  // ── Andares 8–12 ─────────────────────────────────────────────
  m({ id: 'ogre', name: 'ogro', gender: 'm', glyph: 'O', color: 'brown', level: 8, hp: '6d10', speed: 90, accuracy: 8, defense: 7,
    attacks: [{ verb: 'esmaga', damage: '2d8' }], xp: 45, flags: ['opensDoors'], depth: [8, 14], rarity: 5,
    desc: 'Um gigante estúpido com uma clava do tamanho de você.' }),
  m({ id: 'troll', name: 'troll', gender: 'm', glyph: 'T', color: 'green', level: 10, hp: '7d10', speed: 100, accuracy: 10, defense: 8,
    attacks: [{ verb: 'arranha', damage: '1d8' }, { verb: 'arranha', damage: '1d8' }, { verb: 'morde', damage: '1d10' }], xp: 70, flags: ['regenerates', 'opensDoors'], depth: [9, 16], rarity: 4,
    desc: 'Um troll de pele verrugosa que se regenera rapidamente.' }),
  m({ id: 'wraith', name: 'espectro', gender: 'm', glyph: 'W', color: 'white', level: 10, hp: '6d8', speed: 110, accuracy: 10, defense: 9,
    attacks: [{ verb: 'toca', damage: '1d8', effect: { status: 'drain', chance: 25 } }], xp: 75, flags: ['undead'], depth: [9, 15], rarity: 3,
    desc: 'Uma sombra fria que suga a força vital dos vivos.' }),
  m({ id: 'serpent', name: 'serpente', gender: 'f', glyph: 'S', color: 'lightGreen', level: 9, hp: '5d8', speed: 100, accuracy: 9, defense: 8,
    attacks: [{ verb: 'morde', damage: '2d6', effect: { status: 'poisoned', chance: 50, duration: '2d6' } }], xp: 55, flags: ['animal'], depth: [8, 14], rarity: 4,
    desc: 'Uma serpente enorme de escamas verdes.' }),
  m({ id: 'nymph', name: 'ninfa', gender: 'f', glyph: 'n', color: 'lightCyan', level: 8, hp: '3d8', speed: 120, accuracy: 9, defense: 9,
    attacks: [{ verb: 'seduz', damage: '1d2', effect: { status: 'steal', chance: 60 } }], xp: 40, flags: ['opensDoors', 'thief'], depth: [7, 13], rarity: 3,
    desc: 'Uma bela criatura que adora objetos alheios.' }),
  m({ id: 'dark_elf', name: 'elfo negro', gender: 'm', glyph: 'h', color: 'darkGray', level: 9, hp: '5d8', speed: 110, accuracy: 10, defense: 9,
    attacks: [{ verb: 'golpeia', damage: '1d10' }], xp: 55, flags: ['opensDoors', 'archer'], depth: [8, 14], rarity: 4,
    desc: 'Um elfo de pele escura que dispara virotes envenenados.' }),
  m({ id: 'hill_giant', name: 'gigante das colinas', gender: 'm', glyph: 'H', color: 'brown', level: 12, hp: '8d10', speed: 100, accuracy: 11, defense: 9,
    attacks: [{ verb: 'esmaga', damage: '2d10' }], xp: 110, flags: ['opensDoors'], depth: [11, 17], rarity: 4,
    desc: 'Um gigante de quatro metros que atira pedras.' }),

  // ── Andares 13–16 ────────────────────────────────────────────
  m({ id: 'vampire', name: 'vampiro', gender: 'm', glyph: 'V', color: 'red', level: 14, hp: '8d10', speed: 110, accuracy: 14, defense: 12,
    attacks: [{ verb: 'morde', damage: '2d6', effect: { status: 'drain', chance: 30 } }, { verb: 'arranha', damage: '1d8' }], xp: 200, flags: ['undead', 'regenerates', 'opensDoors'], depth: [13, 19], rarity: 3,
    desc: 'Um nobre pálido de olhos vermelhos e sorriso afiado.' }),
  m({ id: 'stone_golem', name: 'golem de pedra', gender: 'm', glyph: 'G', color: 'lightGray', level: 14, hp: '10d10', speed: 70, accuracy: 13, defense: 14,
    attacks: [{ verb: 'esmaga', damage: '3d8' }], xp: 180, flags: [], depth: [13, 19], rarity: 3,
    desc: 'Uma estátua animada, lenta mas quase indestrutível.' }),
  m({ id: 'naga', name: 'naga', gender: 'f', glyph: 'N', color: 'lightBlue', level: 13, hp: '8d8', speed: 100, accuracy: 13, defense: 11,
    attacks: [{ verb: 'morde', damage: '2d8' }, { verb: 'esmaga', damage: '1d10' }], xp: 160, flags: ['caster'], depth: [12, 18], rarity: 3,
    desc: 'Uma serpente gigante com rosto humano.' }),
  m({ id: 'fire_elemental', name: 'elemental do fogo', gender: 'm', glyph: 'E', color: 'orange', level: 14, hp: '7d8', speed: 120, accuracy: 14, defense: 12,
    attacks: [{ verb: 'queima', damage: '3d6', element: 'fire' }], xp: 190, flags: [], depth: [13, 19], rarity: 3,
    desc: 'Uma coluna viva de chamas.' }),
  m({ id: 'frost_elemental', name: 'elemental do gelo', gender: 'm', glyph: 'E', color: 'lightCyan', level: 14, hp: '7d8', speed: 100, accuracy: 14, defense: 13,
    attacks: [{ verb: 'congela', damage: '3d6', element: 'cold' }], xp: 190, flags: [], depth: [13, 19], rarity: 3,
    desc: 'Uma silhueta de gelo que estala a cada passo.' }),
  m({ id: 'mind_flayer', name: 'devorador de mentes', gender: 'm', glyph: 'h', color: 'magenta', level: 15, hp: '7d8', speed: 110, accuracy: 15, defense: 13,
    attacks: [{ verb: 'agarra', damage: '2d6', effect: { status: 'confused', chance: 40, duration: '1d4+1' } }], xp: 230, flags: ['opensDoors', 'caster'], depth: [14, 20], rarity: 2,
    desc: 'Uma criatura de cabeça de polvo que se alimenta de cérebros.' }),

  // ── Andares 17–20 ────────────────────────────────────────────
  m({ id: 'lich', name: 'lich', gender: 'm', glyph: 'L', color: 'lightMagenta', level: 18, hp: '10d8', speed: 100, accuracy: 17, defense: 15,
    attacks: [{ verb: 'toca', damage: '3d6', element: 'cold' }], xp: 400, flags: ['undead', 'caster', 'opensDoors'], depth: [17, 20], rarity: 2,
    desc: 'Um feiticeiro que trocou a vida pela imortalidade.' }),
  m({ id: 'red_dragon', name: 'dragão vermelho', gender: 'm', glyph: 'D', color: 'red', level: 19, hp: '14d10', speed: 100, accuracy: 18, defense: 17,
    attacks: [{ verb: 'morde', damage: '3d10' }, { verb: 'arranha', damage: '2d8' }], xp: 600, flags: ['breathFire'], depth: [17, 20], rarity: 2,
    desc: 'Um dragão de escamas rubras que cospe fogo.' }),
  m({ id: 'blue_dragon', name: 'dragão azul', gender: 'm', glyph: 'D', color: 'lightBlue', level: 18, hp: '13d10', speed: 100, accuracy: 17, defense: 16,
    attacks: [{ verb: 'morde', damage: '3d8' }, { verb: 'arranha', damage: '2d8' }], xp: 520, flags: ['breathLightning'], depth: [16, 20], rarity: 2,
    desc: 'Um dragão azul cercado de faíscas.' }),
  m({ id: 'demon', name: 'demônio', gender: 'm', glyph: '&', color: 'lightRed', level: 18, hp: '12d10', speed: 110, accuracy: 18, defense: 16,
    attacks: [{ verb: 'arranha', damage: '2d10' }, { verb: 'arranha', damage: '2d10' }], xp: 500, flags: ['opensDoors'], depth: [17, 20], rarity: 2,
    desc: 'Uma criatura do Abismo, chifruda e envolta em fumaça.' }),
  m({ id: 'abyssal_horror', name: 'horror abissal', gender: 'm', glyph: 'U', color: 'magenta', level: 20, hp: '15d10', speed: 100, accuracy: 19, defense: 17,
    attacks: [{ verb: 'esmaga', damage: '3d10' }, { verb: 'agarra', damage: '2d8', effect: { status: 'confused', chance: 30, duration: '1d4' } }], xp: 750, flags: [], depth: [18, 20], rarity: 2,
    desc: 'Uma massa de tentáculos e olhos que não deveria existir.' }),
];

export function monsterTemplate(id: string): MonsterTemplate {
  const t = MONSTERS.find((x) => x.id === id) ?? BOSSES.find((x) => x.id === id);
  if (!t) throw new Error(`Monstro desconhecido: ${id}`);
  return t;
}
