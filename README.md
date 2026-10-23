# Abismo — roguelike em pixel art

Roguelike por turnos, na linha de Rogue, NetHack e Angband, feito em TypeScript + Canvas e rodando no navegador.
Os gráficos são **sprites 2D em pixel art** (cenário, personagens, monstros e itens), desenhados em código — sem arquivos de imagem.
Desça os 20 andares do Abismo, derrote o Guardião e pegue o **Coração do Abismo**. Depois, invoque-o (`&`) para vencer,
ou volte a pé até a superfície para fazer muito mais pontos.

## Como rodar

```bash
npm install
npm run dev        # abre em http://localhost:5173
npm test           # 180 testes (lógica, geração, combate, save, simulação com bot, sprites, efeitos, ambiente, música, multijogador)
npm run build      # versão de produção em dist/
npm run lan        # multijogador na rede local (veja abaixo)
```

## Multijogador (rede local)

Até 4 pessoas na mesma rede (Wi-Fi ou cabo) descem juntas a mesma masmorra, cada uma com o seu herói.

1. No computador de quem vai hospedar: `npm install` (uma vez) e depois **`npm run lan`**.
   O terminal mostra os endereços, por exemplo `http://192.168.1.148:8080`. Outra porta: `npm run lan -- --port 8090`.
2. Todo mundo (inclusive quem hospeda) abre esse endereço no navegador → **Multijogador (rede local)** → cria o herói.
3. Na sala de espera: `Espaço` marca "pronto", `c` conversa; o primeiro a entrar é o líder e começa com `Enter`.
4. No jogo, `Enter` abre a conversa com o grupo. O rodapé mostra de quem é a vez ("Sua vez!" / "Esperando Ana...").

Como funciona: o servidor (Node) roda a partida com as mesmas regras do jogo solo; os navegadores mandam as ações e recebem o
estado. Cada rodada espera todos agirem; os monstros perseguem o herói mais próximo; esbarrar num aliado troca de lugar;
a escada leva o grupo todo; quem cai assiste aos outros e volta com metade da vida no andar seguinte; a partida acaba quando
todos caem. Se a conexão de alguém cair, o herói dele fica esperando (não trava os outros) e volta ao recarregar a página.
No Windows, permita o Node.js na rede privada se o firewall perguntar. Fica de fora: entrar no meio da partida, salvar
a partida em grupo e os comandos automáticos (correr, autoexplorar, descansar viram um passo).
Teste ponta a ponta (servidor + dois navegadores headless): `node scripts/lan-e2e.mjs --out pasta` (depois de `npm run lan` compilar).

Parâmetros de URL úteis: `?seed=123` (mundo fixo), `?quick=1` (pula título e criação), `?class=mage&race=elf`,
`?debug=1` (F2 novo mapa, F3 revela, F4 cria monstro, F6 desce, F7 sobe de nível, F9 morre, F10 vence),
`?fxlab=1&page=0&t=0.35` (laboratório de efeitos: todas as animações lado a lado; sem `t` ficam em loop, ←/→ trocam de página).

## O que tem

- **6 raças × 5 classes**, com bônus/penalidades, habilidades ativas (`A`) e magias (`m`)
- **XP e níveis** até o 30, pontos de atributo, dreno de nível
- **20 andares procedurais**: 3 geradores (Rogue, BSP, cavernas), 5 temas, salas especiais, armadilhas, fontes, altares, água e lava
- **Monstros procedurais**: 33 tipos + 4 chefes, 11 modificadores, campeões com nome próprio; IA com estados, conjuradores, arqueiros, sopro de dragão
- **Itens procedurais**: 80 bases, 40 afixos, raridades até lendário, 8 artefatos, maldições, identificação estilo NetHack
- **Magias**: 21 base + magias geradas por componentes em tomos raros
- **Status**: veneno, fogo, confusão, cegueira, sono, medo, acelerado, lento, invisível, escudo; fome e tochas
- **Telas**: título animado, demonstração automática (attract mode), recordes, GAME OVER com lápide, resumo exportável
- **Som**: trilha composta para cada região (cripta gótica, minas com picaretas, cavernas com bolhas, fortaleza submersa, abismo com tambor de guerra),
  percussão de tensão quando há inimigos por perto, vento/água/rumor de fundo, efeitos por elemento de magia e por golpe — tudo sintetizado, sem arquivos
- **Extras**: save/load, recordes persistentes, 5 temas visuais (com CRT verde/âmbar), desafio diário e códigos de desafio para amigos, autoexplorar

Pressione `?` no jogo para ver todas as teclas. A tecla `v` alterna o tamanho dos sprites (automático / perto / longe);
a mesma escolha está em Opções › "Tamanho dos sprites".

## Gráficos (sprites)

- **Cenário:** 5 temas de andar (cripta, minas, fungos, fortaleza, abismo) com piso, corredor, paredes de tijolo e "telhado" com
  borda iluminada (autotile: o desenho muda conforme os vizinhos), portas, escadas, fontes, altares, armadilhas, tochas animadas,
  correntes, esqueletos, teias, poças, ossos, água e lava animadas. Estilo inspirado em tilesets de masmorra de 16 bits.
- **Personagens:** 30 heróis (6 raças × 5 classes: a classe define roupa e arma; a raça, rosto, altura, orelhas, barba e pés),
  34 monstros e 4 chefes (24×24), cada um com 2 quadros de animação.
- **Identificação:** poções, varinhas, anéis e amuletos são desenhados pela aparência sorteada na partida (a cor nunca entrega o tipo).
- **Itens e efeitos:** ~84 ícones de itens, cadáveres coloridos, projéteis, raios, explosões, fagulhas, "zzz".
- **Animações de combate:** cada elemento tem a sua magia (bola de fogo, estilhaço de gelo, relâmpago ramificado, luz sagrada...),
  círculo de runas ao conjurar, golpes corpo a corpo com avanço do atacante e traço conforme a arma ou o ataque (corte, estocada,
  pancada, garras, mordida), sopro de dragão em cone, teleporte, giro, fumaça. Tudo em partículas alinhadas à grade de pixels.
- **Auras de estado:** chamas, bolhas de veneno, estrelinhas da confusão, imagem residual da pressa, bolha do escudo, etc.
- **Ambiente vivo:** brasas de tochas e braseiros, bolhas de lava, reflexos na água, fonte jorrando, poeira/esporos/brasas no ar
  conforme a região, poeira dos passos, pés submersos na água; ~35 enfeites por região (urnas, lápides, caixotes, barris,
  lanternas, vinhas, cristais, runas...).
- **Iluminação:** luz suave do herói e das tochas (mapa de luz esmaecido), brilho aditivo, sombras, névoa sobre o que só foi lembrado.
- **Telas:** logotipo ABISMO em pixel art com cena de título, herói na criação de personagem, GAME OVER com lápide, VITÓRIA.
- Tudo é desenhado por funções em `src/gfx/` (grades de texto com paleta fixa + código), empacotado num atlas na inicialização.
  Para ver os sprites em PNG: `npx tsx tools/terrain-sheet.ts saida.png` (ou `props-sheet`, `heroes-sheet`, `monsters-sheet`,
  `items-sheet`, `looks-sheet`, `ui-sheet`; `monsters-sheet saida.png b` mostra o grupo b — os grupos vão de `a` a `d`).
- Se um monstro ou item novo ainda não tiver arte, o jogo continua jogável: o mapa desenha o caractere ASCII no lugar dele.

## Estrutura

```
src/engine   renderizador (cena de sprites + camada de texto), atlas, RNG com seed, telas, animações, sons, temas
src/gfx      arte em pixel art feita em código: paleta, terreno, heróis, monstros, itens, efeitos (sem DOM)
src/core     regras do jogo (sem DOM): turnos, combate, itens, magias, status, save...
src/gen      geração procedural: andares, monstros, itens, magias, nomes, salas especiais
src/ai       IA dos monstros, pathfinding, bot (demonstração/autoexplorar)
src/data     conteúdo como dados: raças, classes, monstros, itens, afixos, magias
src/ui       telas, HUD, desenho do mapa e cenas de título/criação/fim de jogo
tests/       testes Vitest (incluindo `sprites.test.ts`: todo monstro/item/tema precisa ter arte; `effects.test.ts`: o golpe só aparece quando o projétil chega)
tools/       pré-visualização dos sprites em PNG (`npx tsx tools/...`)
src/net      multijogador: protocolo, sala (lobby, turnos, reconexão) e cliente WebSocket do navegador
server/      servidor da rede local (HTTP + WebSocket), compilado com esbuild por `npm run lan`
scripts/     shot.mjs: screenshot no Chrome headless (`--frames 8 --every 60` tira uma rajada de quadros; `hold:j:12` segura uma tecla);
             music-render.mjs: renderiza as músicas em WAV e mede os níveis (`--out pasta [--intensity 1]`)
```

Documentos: `PLANO.md` (plano de desenvolvimento), `PROMPTS.md` (registro de prompts e do processo), `CLAUDE.md` (regras para o agente).
