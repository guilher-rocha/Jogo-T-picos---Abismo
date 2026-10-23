# Registro de prompts e do desenvolvimento

**Ferramenta:** Claude Code (extensão do VS Code), **modelo:** Claude Opus 5.5 (`claude-opus-5-5`), **estrutura:** agente único.
O agente usou ferramentas de terminal, edição de arquivos, testes automatizados (Vitest) e um script próprio
(`scripts/shot.mjs`) que abre o jogo no Chrome headless, envia teclas e tira screenshots para revisar cada etapa.

## Prompts principais

| # | Etapa | Prompt (resumo) | Resultado |
|---|---|---|---|
| 1 | Plano | "Crie um plano de desenvolvimento para a criação de um roguelike retrô, seguindo a linha do Rogue, Nethack, Angband... Quero apenas o plano, sem a necessidade de código ainda, seja o mais detalhado e inclusivo possível. Pode também dar uma lida no PDF da atividade." | `PLANO.md` com 4 etapas (alinhadas ao PDF) e subetapas com critérios de aceite. |
| 2 | 0.1 → 4.13 | "Comece a implementação do primeiro passo, se precisar pode reduzir um pouco o escopo, faça o passo, revise se está OK com o pedido e aí prossiga, quero ver o quanto desse jogo você consegue fazer." | O agente implementou todas as subetapas em sequência, um commit por subetapa (`git log`). |

| 3 | Sprites | "Nesse jogo no arquivo .zip os cenários são gerados usando a tabela ascii, eu quero que você modifique isso, quero que você crie sprites em 2d, crie o cenário do jogo e também a aparência dos personagens, use as imagens que eu anexei com referência. Depois me retorne o arquivo do jogo para que eu teste usando npm run dev." (com 5 imagens de um tileset de masmorra 16 bits como referência) | Troca do desenho ASCII por sprites 2D em pixel art: cenário (5 temas), 30 heróis, 38 monstros, itens, efeitos, iluminação, telas de título/criação/fim (veja a seção "Sprites" abaixo). |
| 4 | Revisão das artes | "Revise as artes se tem algum problema e quero que melhore onde achar que dê pra melhorar, acho que principalmente as artes dos personagens pode dar uma melhoria." | Heróis redesenhados, retrato ampliado na criação, correção do vazamento de identificação pelos sprites/cores, "VITÓRIA" com acento, devorador de mentes redesenhado (veja "Revisão das artes" abaixo). |
| 5 | Animações | "Agora quero que faça melhorias nas animações dos ataques como magias e coisas do tipo, depois de terminar quero que continue melhorando o quanto conseguir as artes, animações sejam do ambiente ou qualquer coisa do tipo, sempre revisando e vendo se ficou melhor e anotando possíveis problemas e resolvendo eles." | Animações de magias por elemento, golpes corpo a corpo com avanço do atacante, sopro de dragão, teleporte etc.; auras de estado; animações do ambiente; escadas e lava redesenhadas (veja "Animações e ambiente" abaixo). |
| 6 | Ambiente | (no meio do prompt 5) "Maior variedade de detalhes nos ambientes poderia ser uma boa, seja objetos ou detalhes que poderiam complementar a imagem." | ~35 enfeites novos por região (objetos encostados nas paredes, detalhes de chão e de parede), alguns animados e com luz própria. |
| 7 | Som | "Veja melhorias sonoras, um exemplo seria como uma música ambiente um pouco diferente pra cada região, ficaria legal isso caso consiga." | Trilha composta por região (8 faixas), camada de tensão com inimigos por perto, sons de fundo, efeitos novos por elemento e por golpe, sincronizados com as animações (veja "Som e música" abaixo). |
| 8 | Correções | (no meio do prompt 7) "Apertei e segurei pra andar, dei de cara com um inimigo básico sendo mago e morri, essa mecânica de correr ao segurar... deve parar se tiver um inimigo na direção, e também vi que algumas portas mesmo no escuro estão com luz." | Tecla segurada para diante de perigo; nichos de vela redesenhados (pareciam portas acesas) e portas lembradas sem halo de luz. |
| 9 | Correção | "Se pegarmos um item e ele fica com a letra i responsável no inventário, o i fecha o inventário e aí não dá pra analisar o item." | A letra do item passou a valer antes do atalho de fechar (o mesmo bug existia na tela de equipamento com a letra "e", das luvas); teste novo. |
| 10 | Multijogador | "Sei que pode ser um desafio pra você, mas você conseguiria implementar um multiplayer local? Tipo todos na mesma rede, faça um plano de implementação e se for possível, implemente." | Plano na Etapa 5 do `PLANO.md` e implementação: cooperativo para até 4 jogadores na rede local, servidor em Node (`npm run lan`), sala de espera, chat, reconexão (veja "Multijogador em rede local" abaixo). |

Com o segundo prompt, o agente seguiu sozinho até o fim, sem novos pedidos. Em cada subetapa ele: implementou, rodou typecheck e testes,
tirou screenshots no navegador para conferir e fez commit.

## Linha do tempo (commits)

| Subetapa | O que entrou |
|---|---|
| 0.1 | Projeto Vite + TypeScript + Vitest, `CLAUDE.md`, script de screenshot |
| 0.2 | Renderizador ASCII em canvas (double buffer, paleta de 16 cores) e RNG com seed |
| 1.1 | Mapa fixo e movimento em 8 direções |
| 1.2 | Loop de turnos por energia/velocidade, monstros andando |
| 1.3 | Geração procedural estilo Rogue |
| 1.4 | Campo de visão (shadowcasting), memória do mapa |
| 1.5 | Combate e IA de perseguição (mapa de Dijkstra) |
| 1.6 | HUD, histórico de mensagens, ajuda, correr |
| 1.7 | Animações (fila), arremesso com mira, modo olhar |
| 2.1 | Múltiplos andares, geradores BSP e cavernas, temas, 33 monstros |
| 2.2 | Atributos, XP, níveis, ficha do personagem |
| 2.3 | Tela de criação, habilidades de classe, primeiras magias |
| 2.4 | Itens, inventário, equipamento, peso, disparo com munição |
| 2.5–2.7 | Pontuação, recordes, chefes, vitória |
| 3 | Título animado, attract mode (bot), GAME OVER com lápide, resumo |
| 4.1 | Save/load, recordes no `localStorage` |
| 4.2 | Afixos, raridades, artefatos, dano elemental |
| 4.3 | Identificação estilo NetHack, todos os consumíveis, sistema de status |
| 4.4 | 21 magias e magias procedurais em tomos |
| 4.5 | Modificadores de monstros, campeões, conjuradores, arqueiros, dragões |
| 4.6 | Fome, tochas, armadilhas, fontes, altares, água, lava |
| 4.7–4.8 | Disparo Duplo, 6 salas especiais (vaults) |
| 4.9–4.11 | Efeitos visuais, sons e música sintetizados, 5 temas, Opções |
| 4.12 | Desafio diário e códigos de desafio (multiplayer assíncrono) |
| 4.13 | Autoexplorar, ir até a escada, dicas para iniciantes |

## Sprites (prompt 3)

**Ferramenta:** Claude Code, **modelo:** Claude Sonnet 5.5, agente único. Sem acesso ao npm no ambiente (nem `vite`/`vitest`),
a verificação foi feita com `tsc`, um empacotador esbuild e capturas de tela no Chromium (Playwright) — o `npm run dev` e o `vitest`
em si **não** foram executados pelo agente (os testes rodaram por um adaptador mínimo da API do Vitest).

| Etapa | O que entrou |
|---|---|
| Estudo | Como o ASCII era desenhado (`Terminal` → `CanvasRenderer`) e o que precisava de sprite (terrenos, monstros, itens, armadilhas, efeitos) |
| Motor | `Pixmap` (RGBA em Node), paleta "dungeon" (azul-acinzentado, parede com borda ciano, vazio roxo), grades de texto → sprites, atlas único |
| Cenário | Pisos, corredores, paredes com autotile (face de tijolo × telhado com borda), portas, escadas, água/lava, enfeites por tema |
| Personagens | 6 raças × 5 classes (2 quadros), 34 monstros + 4 chefes 24×24 |
| Itens e efeitos | Ícones por categoria, cadáveres, flechas, raios, explosões, fagulhas |
| Renderizador | Cena de sprites com câmera em pixels inteiros, zoom (`v`), mapa de luz suave, brilhos, sombras, barras de vida, minimapa e retratos no painel |
| Telas | Título com logotipo e cena, criação com o herói escolhido, GAME OVER com lápide e VITÓRIA |
| Testes | `tests/sprites.test.ts`: cobertura de arte, formato dos quadros, determinismo e "o mapa só desenha sprites que existem" em todos os andares |
| Sincronia | `tests/effects.test.ts`: o flash de dano e a fumaça de morte esperam a flecha, o raio ou a explosão chegarem |

## Retrabalho e correções encontradas na revisão

Pontos em que a revisão do próprio agente (testes, screenshots, simulação com o bot) achou problemas e houve correção:

- **Teste errado, código certo (1.4):** dois testes de FOV falharam; ao imprimir o resultado, o agente viu que o FOV estava correto
  (um pilar fazia sombra no alvo) e corrigiu o teste.
- **Glifos vazando (1.5):** o `░` da barra de HP desenhava fora da célula; corrigido recortando cada célula no canvas.
- **Quebras de linha CRLF (1.5):** um script de edição gravou CRLF e algumas substituições falharam sem aviso; normalizado para LF.
- **Cavernas abertas demais (2.1):** o autômato celular não contava a própria célula; corrigido ao comparar screenshots.
- **Lobos no andar 1 (2.4):** monstros "fora de profundidade" vinham em bando; passaram a vir sozinhos e só a partir do andar 2.
- **Patrulheiro sem arco (2.4) e sobrecarga sem efeito (2.4):** pegos pelos testes.
- **Jogador preso por porta secreta (3):** a simulação com o bot mostrou partidas travadas no andar 1. Foram adicionados o comando
  "procurar" e a garantia de caminho sem porta secreta até a escada. O andar médio do bot subiu de 2,8 para 5,0.
- **Rei Goblin forte demais (3):** matava 60% dos bots; foi enfraquecido.
- **Bot morrendo de fome (4.13):** depois da fome (4.6), três bots morreram por não comer; o bot aprendeu a comer.
- **Autoexplorar em loop (4.13):** voltava para o mesmo item e "não achava caminho" com um monstro no corredor; corrigido e testado.
- **Luz em degraus (sprites):** a primeira iluminação escurecia tile a tile, com quadrados visíveis; trocada por um mapa de luz de 1 pixel
  por tile, ampliado com suavização.
- **Brilho vazando no escuro (sprites):** halos quentes apareciam sobre o que o jogador nunca viu; passou a haver uma máscara preta sobre o desconhecido.
- **Ícones por cima das janelas (sprites):** retratos e minimapa eram desenhados sobre inventário e fichas; agora só aparecem onde a célula ainda é "buraco".
- **Atlas estourado (sprites):** a animação do GAME OVER (73 px × 16 quadros) não cabia na linha de 1024 px do atlas e deixava uma barra no logotipo;
  o atlas passou a ter 2048 px e a lançar erro se algo não couber (e há teste para isso).
- **Ração parecendo baú (sprites):** o ícone foi redesenhado como trouxinha de pano com carne seca.
- **Clarão de golpe quadrado (sprites):** o "véu vermelho" herdado da versão ASCII virou um quadrado do tamanho do tile por cima do sprite;
  foi trocado por um brilho redondo e suave.
- **Golpe antes do tiro (sprites):** com flecha ou magia, o monstro piscava de branco e sumia na fumaça antes de o projétil chegar. O estado visual
  (flash e fantasma de morte) agora espera o voo, calculado a partir da mesma fila de animações; há testes para isso.
- **Cores fora do monitor CRT (sprites):** fagulhas, brilhos de tocha, clarões e tons de status saíam coloridos nos temas verde/âmbar. As cores
  da cena agora seguem a cor do monitor (e o preto continua preto, para não pintar o "desconhecido" de verde).
- **Alçapão ainda lembra um baú (sprites):** foram testados três redesenhos (com cintas de ferro, aberto com tampa, quebrado em moldura); nenhum
  ficou mais claro que o original, que foi mantido.
- **Problemas do ambiente:** heredocs longos no bash do Windows quebravam e engoliam barras invertidas; o agente passou a usar
  scripts Python em arquivo e a ferramenta de escrita.

## Revisão das artes (prompt 4)

O agente exportou todas as folhas de sprites em PNG (`tools/*-sheet.ts`), comparou com o jogo rodando e encontrou:

- **Raças iguais:** os traços de raça eram desenhados *antes* do elmo/capuz/armas e ficavam cobertos; Humano, Elfo e Halfling saíam
  praticamente idênticos. Os heróis foram refeitos: cada classe é uma figura completa e os traços da raça entram por cima
  (orelhas do elfo saindo do elmo, barba ruiva do anão, cachos e pés descalços do halfling, presas do meio-orc, nariz e barba do gnomo).
- **Classes pouco legíveis:** o lenço vermelho do Ladino parecia sangue e o capuz claro parecia um elmo; virou capuz escuro pontudo com lenço roxo.
  O Clérigo era um bloco branco; ganhou mitra com cruz, sombreamento, estola azul e maça. O escudo do Guerreiro virou escudo vermelho com cruz.
- **Herói minúsculo na criação de personagem:** passou a ser desenhado em dobro (retrato).
- **Bug de jogo — identificação vazando pelos sprites:** poções, varinhas, anéis e amuletos eram desenhados com a cor do tipo verdadeiro
  (cura sempre vermelha), e a cor do nome no inventário e o projétil arremessado também. Agora sprite, cor do texto e projétil usam a
  aparência sorteada na partida (`src/data/appearances.ts`), como no NetHack; há testes. Prévia: `npx tsx tools/looks-sheet.ts saida.png`.
- **"VITORIA" sem acento:** a fonte do logotipo ganhou suporte a acento ("VITÓRIA").
- **Devorador de mentes sem tentáculos visíveis:** os tentáculos roxos sumiam no manto roxo; manto escurecido e cabeça redesenhada.

## Animações e ambiente (prompts 5 e 6)

**Como o agente revisou:** criou um "laboratório de efeitos" (`?fxlab=1&page=N&t=0.35`) que mostra todos os efeitos lado a lado,
congelados no mesmo instante, e uma opção de rajada no script de screenshot (`--frames 8 --every 60`) para capturar uma animação
quadro a quadro dentro do jogo. A cada mudança: screenshot, comparação, anotação do problema, correção e novo screenshot.

**O que foi feito**

- **Eventos novos no núcleo** (sem DOM): `melee` (estilo do golpe pelo verbo do monstro ou pela arma: corte, estocada, pancada,
  garras, mordida, soco, toque), `spellHit`, `breath`, `teleport`, `shatter`, `whirl`, `smoke`, e o elemento em magias/explosões.
- **Magias por elemento** (`src/ui/vfx.ts`): círculo de runas ao conjurar; míssil arcano, bola de fogo em gota, estilhaço de gelo,
  orbe ácido/sagrado com rastro de partículas; relâmpago com ramificações, jato de fogo, poeira de escavação; explosões com clarão,
  onda de choque em pixels e partículas (o fogo vira fumaça); impactos próprios (labaredas, cristais de gelo, choques, coluna de luz,
  bolhas de veneno, fiapos de sombra, "z" do sono, anéis da lentidão, bolha do escudo, brilhos da cura).
- **Corpo a corpo:** o atacante avança na direção do alvo e volta; corte em crescente de pixels, estocada, pancada com poeira, três
  garras, mandíbulas; golpe pesado/crítico maior. Também sopro de dragão em cone, teleporte, frasco que se espatifa, giro e fumaça.
- **Ritmo:** números de dano e faíscas viraram animações "de fundo" (não seguram o próximo golpe); um único agendador calcula quando
  cada coisa acontece, e o piscar branco, o fantasma de morte e o avanço usam os mesmos tempos.
- **Auras de estado** (`src/ui/auras.ts`): em chamas, envenenado, lento, acelerado (imagem residual), paralisado, confuso (estrelinhas),
  com medo (treme e sua), cego, escudo (bolha com brilho girando).
- **Ambiente** (`src/ui/ambient.ts`): brasas das tochas e braseiros, bolhas e respingos de lava, reflexos na água, jato e gotas da fonte,
  partículas do altar e dos fungos, e partículas no ar por região (poeira na cripta e nas minas, esporos nas cavernas, gotas na fortaleza,
  brasas no abismo); poeirinha dos passos; atores dentro d'água/lava ficam com os pés submersos e ondinhas.
- **Enfeites novos** (`src/gfx/decor.ts`): nichos com vela, placas, rachaduras, limo, vinhas, fungos de prateleira, veios de ouro,
  escoras de madeira, lanternas, picareta, troféu de escudo, manchas de umidade, runas e lava escorrendo (paredes); velas, rachaduras,
  minério, tábuas, capim, raízes, cogumelos, cristais, conchas, elmo enferrujado, obsidiana, cinzas e rachaduras de lava (chão);
  urnas, lápides, colunas quebradas, caixotes, barris e braseiros encostados nas paredes. Velas, lanternas, braseiros e runas animam e iluminam.

**Problemas encontrados na revisão e como foram resolvidos**

| Problema (visto no screenshot/teste) | Correção |
|---|---|
| Números de dano seguravam a fila ~650 ms por golpe: lutas ficavam lentas | Animações de fundo com "segurar" curto |
| O piscar branco/fantasma de morte aconteciam fora de hora em relação ao golpe | Um só agendador para animações e estado visual |
| Morte e crítico num grupo vazio recebiam tempo 0; tremor do crítico sumia | Tempo do grupo sempre registrado; tremor virou passo de fundo |
| Linhas, anéis e elipses do canvas saíam suaves/borrados, fora do estilo pixel art | Primitivas de pixels (`pxLine`, `pxRing`, `pxDisc`) e uma cena "pixelada" que converte tudo |
| Cabeça dos projéteis pequena demais | Discos de pixels com degradê; bola de fogo em gota |
| Corte e giro viravam um borrão branco (brilho aditivo somado em cada segmento) | Brilho espaçado ao longo da linha inteira; corte desenhado como crescente de pixels |
| O arco do corte passava por cima do alvo, não através dele | Geometria refeita: o arco cruza o alvo, de cima para baixo |
| Garras pareciam listras de bengala de Natal | Riscos finos com sombra suave |
| Cegueira invisível (escuro sobre escuro), faíscas da paralisia minúsculas, anel da lentidão apagado | Cores mais claras, faíscas maiores, anel mais forte |
| Partículas do ambiente quase invisíveis | Mais densidade e contraste, rastro de 1 pixel |
| Escoras de madeira das minas pareciam portas (atrapalha o jogo) | Viraram escora em "T" |
| Rachadura brilhante em 1/3 do chão do abismo: parecia carimbo | Só em 1/6 das variantes e mais fraca; rachaduras de lava animadas viraram enfeite à parte |
| Escadas pareciam grades de metal | Redesenhadas: poço com degraus sumindo no escuro (descer) e lance subindo até um arco (subir) |
| Lava era um padrão ruidoso | Placas de crosta escura com veios incandescentes, emendando entre tiles |
| Poeira dos passos não aparecia no teste | Investigado com logs no navegador: aparecia, mas o teste começava em cima da escada (poeira clara sobre degrau claro); no chão normal funciona |
| Ao apanhar, o herói virava um "bloco branco" em cima da escada | Investigado no laboratório: era o flash de dano (silhueta branca) do mago, que ocupa quase o tile todo, somado ao brilho do impacto sobre a escada clara; flash mais leve, brilho do impacto menor e degraus da escada um pouco mais escuros |

## Som e música (prompt 7)

- **Trilha por região** (`src/data/music.ts`, como dados): cada região tem tom, modo, andamento, instrumentos e percussão próprios —
  Cripta: lá menor harmônico, órgão, sinos e coro (gótico); Minas: mi dórico em ritmo de trabalho, baixo dedilhado, kalimba e picaretas;
  Cavernas Fúngicas: fá lídio em 3/4, vidro e kalimba com eco, bolhas; Fortaleza Afundada: ré menor abafado (como debaixo d'água),
  coro, harpa, sinos com eco longo e gongo; Abismo: dó frígio lento, coro sombrio, cluster dissonante, tambor de guerra e correntes.
  Mais o tema de abertura, um réquiem no fim de jogo e uma faixa de vitória.
- **Compositor** (`src/engine/compose.ts`): gera as notas compasso a compasso, de forma determinística; a melodia tem dois motivos
  que se alternam (A B A B) e cadência na tônica — repete como uma música de verdade, em vez de notas soltas ao acaso.
- **Sintetizador** (`src/engine/synth.ts`, Web Audio, sem arquivos): órgão, cordas, vidro, coro (formantes), sino (FM), harpa,
  kalimba, baixo, solo; percussão (bumbo, tambor de guerra, picareta, bigorna, gota, bolha, corrente, gongo); fundos contínuos
  (vento, caverna, água, rumor). Reverb e eco por região.
- **Transição e tensão** (`src/engine/music.ts`): ao trocar de região uma música some enquanto a outra entra; com um inimigo
  acordado à vista (ou um chefe), entra a percussão de tensão da região no compasso seguinte.
- **Efeitos novos** (`src/engine/sound.ts`): ruído filtrado + osciladores — um som por elemento de magia (fogo, gelo, raio, sagrado,
  ácido, sombra, sono, cura...), por tipo de golpe (corte, estocada, pancada, garras, mordida, giro), sopro de dragão, explosão,
  vidro quebrando, porta rangendo, passos na escada, arco. Cada som toca no instante da sua animação (o golpe soa quando a arma chega).
- **Opções:** "Volume da música" (0 = desligada).

**Como o agente revisou o som sem ouvir:** `node scripts/music-render.mjs --out pasta` renderiza cada faixa fora de tempo real
(OfflineAudioContext no Chrome headless), salva WAVs para ouvir e mede pico, volume por segundo e silêncios; um script Python fez
espectrogramas e mediu brilho, graves e volume percebido.

| Problema encontrado | Correção |
|---|---|
| Nas faixas lentas (título, fortaleza, abismo), coro e cordas cobriam a melodia (sinos quase invisíveis no espectrograma) | Coro e cordas mais baixos, sinos e harpa mais altos |
| O tambor de guerra do abismo era só um "bum" grave, sem ataque | Ganhou o estalo do couro |
| As Minas soavam ~6 dB mais baixas que as outras regiões | Volume por faixa (`level`), medido pelo volume percebido (com ponderação do ouvido, que escuta menos os graves) |

## Correções relatadas pelo jogador (prompt 8)

- **Morrer segurando a tecla de andar:** o navegador repete a tecla ~30 vezes por segundo e cada repetição era um turno inteiro — e ainda
  pulava a animação, então o herói apanhava sem o jogador ver. Agora as repetições não pulam animações e param quando há inimigo acordado
  à vista ou quando o passo seria um ataque ("Inimigo à vista! Você para"); um novo toque age normalmente. Correr (Shift) com inimigos
  à vista vira um passo só. Testado no navegador segurando a tecla (`scripts/shot.mjs --keys "hold:j:12"`).
- **Portas "acesas" no escuro:** eram os nichos de vela adicionados no prompt 6 — um vão escuro em arco do tamanho de uma porta, com luz
  dentro. Viraram um nicho pequeno no alto da parede, com parapeito. Além disso, portas lembradas eram desenhadas menos escuras que o
  resto da memória, o que criava um halo de luz em volta delas; agora só as escadas ficam (levemente) destacadas.

- **Item na letra "i" impossível de escolher (prompt 9):** no inventário, o atalho "i fecha" era testado antes das letras dos itens.
  Agora a letra do item vale primeiro, e "i" só fecha se nenhum item usa essa letra. O agente procurou o mesmo padrão nas outras telas e
  achou o equivalente no equipamento: "e" fechava a tela, mas é a letra do slot das luvas. Os dois têm teste (`tests/menus.test.ts`).

## Multijogador em rede local (prompt 10)

**Plano primeiro:** o agente mediu o tamanho do problema antes de escolher a arquitetura — o núcleo tinha ~260 referências a "o jogador"
(`game.player`/`game.hero`) em 20 arquivos. Reescrever tudo seria caro e arriscado; o plano (Etapa 5 do `PLANO.md`) escolheu:
- **cooperativo** com rodadas que esperam todos os jogadores (combina com turnos);
- **servidor autoritativo em Node** rodando o mesmo núcleo (que não depende de DOM), com os navegadores só mandando ações e
  desenhando o estado — e não um navegador como anfitrião, porque abas em segundo plano congelam e travariam todos;
- **troca de perspectiva**: `game.party` guarda os heróis e, antes de cada passo, "o jogador" vira o herói que age — ou, para um
  monstro, o herói mais próximo. Assim quase todo o núcleo funcionou sem mudanças.

**Implementação (subetapas 5.1–5.5):** `src/core/party.ts` (grupo, laço de turnos, regras), `src/net/` (protocolo, sala, cliente),
`server/lan.ts` (HTTP + WebSocket), sala de espera, tela do jogo em modo rede, aliados no mapa e no painel, mensagens com o nome
de quem as viveu, chat. 27 testes novos (grupo, sala com conexões falsas, protocolo) e um teste ponta a ponta com o servidor real e
dois navegadores headless (`scripts/lan-e2e.mjs`), com screenshots dos dois lados — incluindo recarregar a página no meio da partida.

| Problema encontrado | Correção |
|---|---|
| Um herói esbarrando no outro atacaria (a regra era "jogador esbarra em alguém → ataca") | Aliados trocam de lugar; o ataque direto em aliado é recusado |
| Morte do jogador sempre encerrava a partida | No grupo, quem cai vira espectador (câmera num aliado) e volta no andar seguinte; fim só quando todos caem |
| Nomes dos jogadores invisíveis na sala, no painel e no rodapé (screenshot do teste ponta a ponta) | Cores em hexadecimal não valem na marcação de texto do terminal; cada jogador ganhou também uma cor da paleta |
| "undefined) Créditos" no menu de título (a opção nova passou de 8 itens) | Letras do menu até "j" |
| Gastar ponto de atributo mudava o herói direto pela interface — no multijogador, sumiria no estado seguinte | Virou a ação `raiseStat` (livre, não gasta o turno), igual no solo e no servidor; teste novo; regra registrada no `CLAUDE.md` |
| O estado visual (posições suavizadas) era reiniciado a cada estado recebido (comparava o objeto do andar) | Passou a comparar seed + profundidade |
| Suspeita: "a Ana apertou → e a Bia andou" | Investigado com seed fixa (servidor aceita `ABISMO_SEED`) comparando o teste no Node com os screenshots: era leitura errada de um mapa diferente; posições batiam |

## Escopo reduzido ou deixado de fora

- Remapear teclas, clique do mouse para andar e tooltips: não feitos.
- "Bones" (fantasmas de partidas anteriores), lojas, religião, companheiro animal, classes/raças desbloqueáveis e conquistas
  (itens "se sobrar tempo" da 4.14): não feitos.
- Point-buy de atributos: substituído por atributos da classe + raça com opção de rerrolar (como o plano sugeria para começar).
- O sistema de status foi adiantado da 4.6 para a 4.3, porque as poções dependiam dele.
- Uma versão mínima das magias (Míssil Mágico, Cura Leve) foi adiantada para a 2.3, para Mago e Clérigo serem jogáveis.
