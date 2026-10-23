# Abismo — roguelike em pixel art

Roguelike por turnos (linha Rogue/NetHack/Angband) em TypeScript + Canvas, rodando no browser. Gráficos: sprites 2D em pixel art desenhados em código (`src/gfx`).
O plano completo está em `PLANO.md`; os prompts usados ficam registrados em `PROMPTS.md`.

## Comandos
- `npm run dev` — servidor de desenvolvimento (Vite)
- `npm test` — testes (Vitest, lógica pura)
- `npm run typecheck` — checagem de tipos
- `npm run build` — build de produção em `dist/`
- `node scripts/shot.mjs --out x.png --query "quick=1&debug=1" --keys "l,l,F3"` — screenshot/roteiro de teclas no Chrome headless
- `node scripts/whichgen.mjs <seed>` — lista gerador e sala especial de cada andar
- `npx tsx tools/terrain-sheet.ts saida.png` — folha de sprites em PNG (também `props-sheet`, `heroes-sheet`, `monsters-sheet`, `items-sheet`, `ui-sheet`)
- `npm run lan` — multijogador: compila o jogo e o servidor (`server/lan.ts`) e serve na porta 8080 (`-- --port N`)
- `node scripts/lan-e2e.mjs --out pasta` — teste ponta a ponta do multijogador (servidor + 2 navegadores headless)
- `node scripts/music-render.mjs --out pasta` — renderiza as músicas em WAV e mede os níveis

## Regras
- Implemente **apenas a subetapa pedida** do `PLANO.md`; não adiante etapas futuras.
- **Nunca** use `Math.random()` na lógica do jogo: use `src/engine/rng.ts` (RNG com seed).
- `src/core/`, `src/gen/`, `src/ai/`, `src/data/` e `src/gfx/` não dependem de DOM/Canvas (testáveis no Node). O atlas e o renderizador (`src/engine`) é que tocam o canvas.
- Arte: sem arquivos de imagem. Sprites 16×16 (chefes 24×24) saem de `src/gfx/*` (grades de texto + paleta em `palette.ts`); nomes de sprite só via `K` (`src/gfx/keys.ts`).
  Monstro, item, raça/classe ou tema novos precisam de arte — `tests/sprites.test.ts` acusa o que faltar. Sem `Math.random()` na arte (use `hash01`).
- O mapa é desenhado como uma lista de comandos (`src/engine/scene.ts`) montada em `src/ui/mapView.ts`; HUD, janelas e menus continuam na camada de texto.
- Efeitos: `trackEvents` (flash e fumaça de morte) precisa espelhar a fila de `playEvents` em `src/ui/effects.ts`. Ao mudar a duração ou a ordem de uma animação (ou criar uma nova), atualize os dois e `tests/effects.test.ts`.
- Conteúdo (raças, classes, monstros, itens, magias) fica em `src/data/` como dados, não como código.
- Estado da partida é feito de objetos simples (serializáveis em JSON) — nada de classes com estado escondido.
- Multijogador: o núcleo fala de "o jogador" (`game.player`/`game.hero`); com `game.party`, isso é o herói da vez
  (`setPerspective` em `src/core/party.ts`). Ação nova do jogador = um tipo em `Action` (nada de mudar o estado direto pela
  interface: no multijogador a partida está no servidor e a mudança se perderia).
- Textos do jogo em português (PT-BR); identificadores do código em inglês.
- Um commit por subetapa, mensagem `etapa-X.Y: descrição`.
