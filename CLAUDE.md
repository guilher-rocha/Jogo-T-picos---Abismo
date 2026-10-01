# Abismo — roguelike ASCII

Roguelike por turnos (linha Rogue/NetHack/Angband) em TypeScript + Canvas, rodando no browser.
O plano completo está em `PLANO.md`; os prompts usados ficam registrados em `PROMPTS.md`.

## Comandos
- `npm run dev` — servidor de desenvolvimento (Vite)
- `npm test` — testes (Vitest, lógica pura)
- `npm run typecheck` — checagem de tipos
- `npm run build` — build de produção em `dist/`
- `node scripts/shot.mjs` — screenshot/roteiro de teclas no Chrome headless (verificação visual)

## Regras
- Implemente **apenas a subetapa pedida** do `PLANO.md`; não adiante etapas futuras.
- **Nunca** use `Math.random()` na lógica do jogo: use `src/engine/rng.ts` (RNG com seed).
- `src/core/`, `src/gen/`, `src/ai/` e `src/data/` não dependem de DOM/Canvas (testáveis no Node).
- Conteúdo (raças, classes, monstros, itens, magias) fica em `src/data/` como dados, não como código.
- Estado da partida é feito de objetos simples (serializáveis em JSON) — nada de classes com estado escondido.
- Textos do jogo em português (PT-BR); identificadores do código em inglês.
- Um commit por subetapa, mensagem `etapa-X.Y: descrição`.
