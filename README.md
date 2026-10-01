# Abismo — roguelike ASCII

Roguelike por turnos, na linha de Rogue, NetHack e Angband, feito em TypeScript + Canvas e rodando no navegador.
Desça os 20 andares do Abismo, derrote o Guardião e pegue o **Coração do Abismo**. Depois, invoque-o (`&`) para vencer,
ou volte a pé até a superfície para fazer muito mais pontos.

## Como rodar

```bash
npm install
npm run dev        # abre em http://localhost:5173
npm test           # 128 testes (lógica, geração, combate, save, simulação com bot)
npm run build      # versão de produção em dist/
```

Parâmetros de URL úteis: `?seed=123` (mundo fixo), `?quick=1` (pula título e criação), `?class=mage&race=elf`,
`?debug=1` (F2 novo mapa, F3 revela, F4 cria monstro, F6 desce, F7 sobe de nível, F9 morre, F10 vence).

## O que tem

- **6 raças × 5 classes**, com bônus/penalidades, habilidades ativas (`A`) e magias (`m`)
- **XP e níveis** até o 30, pontos de atributo, dreno de nível
- **20 andares procedurais**: 3 geradores (Rogue, BSP, cavernas), 5 temas, salas especiais, armadilhas, fontes, altares, água e lava
- **Monstros procedurais**: 33 tipos + 4 chefes, 11 modificadores, campeões com nome próprio; IA com estados, conjuradores, arqueiros, sopro de dragão
- **Itens procedurais**: 80 bases, 40 afixos, raridades até lendário, 8 artefatos, maldições, identificação estilo NetHack
- **Magias**: 21 base + magias geradas por componentes em tomos raros
- **Status**: veneno, fogo, confusão, cegueira, sono, medo, acelerado, lento, invisível, escudo; fome e tochas
- **Telas**: título animado, demonstração automática (attract mode), recordes, GAME OVER com lápide, resumo exportável
- **Extras**: save/load, recordes persistentes, 5 temas visuais (com CRT verde/âmbar), sons e música sintetizados, desafio diário e códigos de desafio para amigos, autoexplorar

Pressione `?` no jogo para ver todas as teclas.

## Estrutura

```
src/engine   renderizador, RNG com seed, telas, animações, sons, temas
src/core     regras do jogo (sem DOM): turnos, combate, itens, magias, status, save...
src/gen      geração procedural: andares, monstros, itens, magias, nomes, salas especiais
src/ai       IA dos monstros, pathfinding, bot (demonstração/autoexplorar)
src/data     conteúdo como dados: raças, classes, monstros, itens, afixos, magias
src/ui       telas e HUD
tests/       testes Vitest
```

Documentos: `PLANO.md` (plano de desenvolvimento), `PROMPTS.md` (registro de prompts e do processo), `CLAUDE.md` (regras para o agente).
