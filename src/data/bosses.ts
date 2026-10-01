import type { MonsterTemplate } from './monsters';

/** Chefes únicos: aparecem guardando a escada dos andares 5, 10, 15 e o Coração no 20. */
export const BOSSES: (MonsterTemplate & { bossDepth: number; escort: { id: string; count: [number, number] }[]; intro: string })[] = [
  {
    id: 'goblin_king', name: 'Rei Goblin Grutch', gender: 'm', glyph: 'g', color: 'yellow', level: 7, hp: '8d10', speed: 100,
    accuracy: 8, defense: 8, attacks: [{ verb: 'golpeia', damage: '2d5' }, { verb: 'golpeia', damage: '1d6' }], xp: 160,
    flags: ['unique', 'boss', 'opensDoors'], depth: [0, 0], rarity: 0,
    desc: 'Gordo, cruel e coroado com uma panela amassada. Seus súditos morrem por ele.',
    bossDepth: 5, escort: [{ id: 'goblin', count: [2, 3] }, { id: 'goblin_shaman', count: [1, 1] }],
    intro: 'Você ouve tambores e risadas guturais. O Rei Goblin governa este andar!',
  },
  {
    id: 'ancient_troll', name: 'Troll Ancião Murgash', gender: 'm', glyph: 'T', color: 'lightGreen', level: 13, hp: '18d10', speed: 100,
    accuracy: 14, defense: 12, attacks: [{ verb: 'arranha', damage: '2d8' }, { verb: 'arranha', damage: '2d8' }, { verb: 'morde', damage: '2d10' }], xp: 600,
    flags: ['unique', 'boss', 'regenerates', 'opensDoors'], depth: [0, 0], rarity: 0,
    desc: 'Um troll gigantesco, coberto de musgo e cicatrizes que se fecham diante dos seus olhos.',
    bossDepth: 10, escort: [{ id: 'troll', count: [1, 2] }, { id: 'ogre', count: [1, 2] }],
    intro: 'O chão treme com passos pesados. Algo muito antigo e faminto vive aqui.',
  },
  {
    id: 'lesser_lich', name: 'Lich Menor Vaeloth', gender: 'm', glyph: 'L', color: 'magenta', level: 17, hp: '15d10', speed: 110,
    accuracy: 17, defense: 15, attacks: [{ verb: 'toca', damage: '3d8', element: 'cold' }, { verb: 'toca', damage: '2d6', effect: { status: 'drain', chance: 25 } }], xp: 1200,
    flags: ['unique', 'boss', 'undead', 'caster', 'opensDoors'], depth: [0, 0], rarity: 0,
    desc: 'Um esqueleto em mantos podres; nas órbitas, duas brasas frias.',
    bossDepth: 15, escort: [{ id: 'wraith', count: [2, 3] }, { id: 'skeleton', count: [3, 4] }],
    intro: 'O ar fica gelado. Uma voz seca sussurra seu nome...',
  },
  {
    id: 'abyss_guardian', name: 'Guardião do Abismo', gender: 'm', glyph: '&', color: 'lightMagenta', level: 22, hp: '25d10', speed: 110,
    accuracy: 21, defense: 19, attacks: [{ verb: 'esmaga', damage: '3d10' }, { verb: 'queima', damage: '3d8', element: 'fire' }, { verb: 'arranha', damage: '2d10' }], xp: 3000,
    flags: ['unique', 'boss', 'opensDoors'], depth: [0, 0], rarity: 0,
    desc: 'Um colosso de obsidiana e fogo, preso a este lugar para guardar o Coração do Abismo.',
    bossDepth: 20, escort: [{ id: 'demon', count: [2, 2] }],
    intro: 'Você chegou ao fundo. O Coração do Abismo pulsa em algum lugar... e algo o guarda.',
  },
];

export function bossForDepth(depth: number) {
  return BOSSES.find((b) => b.bossDepth === depth);
}
