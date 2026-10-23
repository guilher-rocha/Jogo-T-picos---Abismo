# Plano de Desenvolvimento — Roguelike ASCII (nome provisório: **"Abismo"**)

> Roguelike clássico por turnos, na linha de Rogue / NetHack / Angband, com gráficos em ASCII, raças e classes, níveis e XP, andares proceduralmente gerados, controle total por hotkeys e geração procedural de inimigos, itens, magias e equipamentos.
>
> Este plano segue as etapas da **Atividade 02 – Criando um Jogo** (Prof. Andrei Formiga): (1) base do jogo, (2) níveis e pontuação, (3) tela de abertura / game over, (4) adições extras — e acrescenta subetapas menores para que o agente de codificação implemente **um passo de cada vez**, sem gerar o jogo inteiro de uma vez.

---

## Sumário

1. [Visão geral e pilares de design](#1-visão-geral-e-pilares-de-design)
2. [Escolhas técnicas](#2-escolhas-técnicas)
3. [Arquitetura do código](#3-arquitetura-do-código)
4. [Especificação dos sistemas de jogo](#4-especificação-dos-sistemas-de-jogo)
5. [Interface e controles (hotkeys)](#5-interface-e-controles-hotkeys)
6. [Roteiro de implementação por etapas](#6-roteiro-de-implementação-por-etapas)
7. [Estratégia de testes e balanceamento](#7-estratégia-de-testes-e-balanceamento)
8. [Fluxo de trabalho com o agente (e material para o relatório)](#8-fluxo-de-trabalho-com-o-agente-e-material-para-o-relatório)
9. [Riscos e mitigação](#9-riscos-e-mitigação)
10. [Apêndices: tabelas de conteúdo](#10-apêndices-tabelas-de-conteúdo)

---

## 1. Visão geral e pilares de design

### 1.1 Premissa
O jogador cria um aventureiro (raça + classe) e desce por **20 andares** de uma masmorra gerada proceduralmente. No andar 20 vive o guardião do **Amuleto de Yendor-like** (nome próprio a definir, ex.: "Coração do Abismo"). Pegar o amuleto vence o jogo (modo "fuga" opcional: voltar à superfície com ele para bônus de pontuação).

### 1.2 Pilares
| Pilar | O que significa na prática |
|---|---|
| **Morte permanente** | Morreu, acabou. Um único save, apagado ao morrer. |
| **Por turnos** | Nada acontece enquanto o jogador não age. O "tempo" do jogo é o turno. |
| **Procedural** | Mapas, monstros, itens, magias e afixos diferentes a cada partida, controlados por uma **seed**. |
| **Tudo pelo teclado** | Cada ação tem uma tecla. Mouse é opcional (só para inspecionar). |
| **ASCII legível** | Cada caractere e cor tem significado consistente (`@` jogador, `D` dragão, `!` poção...). |
| **Decisões > reflexos** | A dificuldade vem de escolhas táticas e gestão de recursos, não de velocidade. |
| **Reprodutível** | Mesma seed + mesmas ações = mesma partida (essencial para testes, attract mode e desafios). |

### 1.3 Escopo — o que **não** entra (pelo menos na versão base)
- Gráficos em tiles/sprites (podem entrar na Etapa 4 como tema visual alternativo).
- Multiplayer em tempo real pela rede.
- Mundo aberto / cidade com NPCs complexos (no máximo uma loja simples).

---

## 2. Escolhas técnicas

### 2.1 Plataforma recomendada
- **TypeScript + HTML5 Canvas**, empacotado com **Vite**. Roda no browser sem instalar nada (como sugerido na atividade), tipagem ajuda o agente a não quebrar o código entre etapas e facilita a leitura pelo grupo.
- **Sem engine.** O renderizador ASCII é simples o bastante para escrevermos (e entendermos) nós mesmos.
- **Biblioteca opcional:** `rot.js` (ROguelike Toolkit) tem FOV, pathfinding e geradores prontos. **Recomendação: implementar os algoritmos nós mesmos** (são curtos e bem documentados) — reduz o "déficit de compreensão" que o relatório pede para analisar. Usar `rot.js` só como plano B se algum algoritmo travar o progresso.
- **Testes:** Vitest (lógica pura, sem browser).
- **Versionamento:** Git, com **um commit por subetapa** (vira a linha do tempo do relatório).

### 2.2 Alternativa
Python + `tcod` (python-tcod) é o padrão "clássico" de tutoriais de roguelike e também funciona muito bem. Só vale a pena se o grupo for bem mais fluente em Python do que em JS/TS.

### 2.3 Renderização ASCII
- Grade de células de tamanho fixo (ex.: **100 × 32** células; mapa de 80 × 24 + painéis).
- Fonte monoespaçada com bom suporte a símbolos (ex.: *IBM Plex Mono*, *DejaVu Sans Mono*, ou uma fonte bitmap estilo CP437 na Etapa 4).
- Cada célula tem: `glyph`, `fg` (cor da frente), `bg` (cor de fundo).
- Renderiza num **buffer de células** e só redesenha as células que mudaram (*dirty flags*) — rápido mesmo em computadores fracos.
- Paleta de 16 cores estilo terminal (CGA/ANSI) para manter o visual retrô.

### 2.4 Números aleatórios
- **RNG com seed** próprio (ex.: *mulberry32* ou *xoshiro128\*\**). **Nunca** usar `Math.random()` na lógica do jogo.
- RNGs separados por "fluxo": `rngMapa`, `rngCombate`, `rngLoot`, `rngIA`. Assim, mudar o código de combate não altera os mapas gerados para a mesma seed.
- Utilitários: `rolar("2d6+1")`, `escolherPonderado(tabela)`, `chance(pct)`, `embaralhar(lista)`.

---

## 3. Arquitetura do código

### 3.1 Princípios
1. **Lógica separada da apresentação.** O núcleo do jogo (`core/`) não sabe que existe Canvas; recebe ações e devolve eventos. Isso permite testes, o bot do attract mode e trocar o tema visual.
2. **Dados separados do código.** Raças, classes, monstros, itens, afixos e magias ficam em arquivos de dados (`data/*.ts` ou JSON). Adicionar um monstro = adicionar uma entrada, não escrever código.
3. **Ações como objetos.** Toda tecla vira uma `Acao` (`Mover`, `Atacar`, `Pegar`, `Beber`, `Conjurar`...). O jogador e os monstros usam as mesmas ações.
4. **Eventos para a interface.** O núcleo emite eventos (`Dano`, `Morte`, `MensagemLog`, `Projétil`, `SubiuDeNível`); a UI decide como animar/mostrar.
5. **Máquina de estados de telas.** `Título → CriaçãoPersonagem → Jogo → (Inventário, Mapa, Ajuda...) → GameOver → Pontuações → Título`.

### 3.2 Estrutura de pastas proposta
```
/src
  main.ts                 # ponto de entrada, cria o jogo e o loop
  /engine
    renderer.ts           # grade de células → Canvas
    input.ts              # teclado → comandos (mapa de teclas configurável)
    rng.ts                # RNG com seed + utilitários de dados
    screens.ts            # pilha/máquina de estados de telas
    animations.ts         # fila de animações (projéteis, flashes)
  /core
    game.ts               # estado global da partida, loop de turnos
    world.ts              # andares, cache de andares visitados
    map.ts                # grade de tiles, consultas (passável, opaco)
    fov.ts                # campo de visão (shadowcasting)
    pathfinding.ts        # A* e mapas de Dijkstra
    entity.ts             # entidades (atores e itens no chão)
    actor.ts              # atributos, HP/MP, velocidade, energia
    actions/              # uma ação por arquivo
    combat.ts             # fórmulas de acerto/dano
    status.ts             # efeitos (veneno, lentidão, confusão...)
    progression.ts        # XP, níveis, curva
    inventory.ts          # inventário, equipamento, peso
    identify.ts           # aparências aleatórias, identificação
    score.ts              # cálculo de pontuação
    events.ts             # tipos de evento emitidos
  /gen
    dungeon/              # geradores de andar (salas, BSP, cavernas...)
    monsters.ts           # geração de monstros + modificadores
    items.ts              # geração de itens + afixos
    spells.ts             # geração de magias por componentes
    names.ts              # gerador de nomes (cadeias de Markov/sílabas)
  /ai
    behaviors.ts          # comportamentos de monstros
    bot.ts                # "jogador automático" (attract mode e testes)
  /data
    races.ts  classes.ts  monsters.ts  items.ts  affixes.ts  spells.ts  tiles.ts
  /ui
    hud.ts  log.ts  inventoryScreen.ts  characterScreen.ts  helpScreen.ts
    titleScreen.ts  creationScreen.ts  gameOverScreen.ts  highScores.ts
  /persist
    save.ts  highscores.ts  settings.ts
/tests
  rng.test.ts  mapgen.test.ts  combat.test.ts  progression.test.ts ...
index.html
CLAUDE.md                 # instruções permanentes para o agente
PROMPTS.md                # registro dos prompts usados (para o relatório)
```

### 3.3 Modelo de dados (resumo)
- **Tile**: `tipo` (parede, chão, porta aberta/fechada, escada ↑/↓, água, lava, armadilha oculta...), `passavel`, `opaco`, `glyph`, `cores`, `explorado` (memória do jogador), `visivel`.
- **Ator** (jogador e monstros): `id`, `nome`, `glyph`, `cor`, `pos`, `atributos`, `hp/hpMax`, `mp/mpMax`, `velocidade`, `energia`, `defesa`, `precisão`, `resistências`, `efeitos[]`, `inventário`, `equipamento`, `comportamento` (IA), `xpValor`.
- **Item**: `baseId`, `categoria` (arma, armadura, poção, pergaminho, varinha, anel, amuleto, comida, munição, ouro, tomo), `afixos[]`, `raridade`, `nivelItem`, `encantamento (+N)`, `cargas`, `identificado`, `amaldiçoado`, `peso`, `quantidade` (empilhável).
- **Magia**: `nome`, `escola`, `custoMP`, `nível`, `alvo` (si mesmo / projétil / raio / área / cone), `efeitos[]`, `alcance`, `falha%`.
- **Andar**: `profundidade`, `largura × altura`, `tiles[]`, `atores[]`, `itensNoChão[]`, `escadas`, `seed`, `tema`.

### 3.4 Sistema de turnos (energia)
- Cada ator tem `velocidade` (normal = 100) e acumula `energia` a cada "tick".
- Quando `energia ≥ 100`, o ator age e a ação consome energia (normalmente 100; algumas ações custam mais ou menos).
- Velocidade 150 = age 1,5× mais que o normal; velocidade 50 = metade.
- O loop processa atores em ordem até chegar a vez do jogador e então **para e espera input** — é assim que o tempo "passa" num roguelike.
- Contador global de turnos (usado para fome, regeneração, duração de efeitos, pontuação).

---

## 4. Especificação dos sistemas de jogo

### 4.1 Atributos do personagem
| Atributo | Abrev. | Afeta |
|---|---|---|
| Força | FOR | dano corpo a corpo, capacidade de carga, armas pesadas |
| Destreza | DES | acerto, esquiva (defesa), dano de armas leves/à distância, desarmar armadilhas |
| Constituição | CON | HP por nível, resistência a veneno, regeneração |
| Inteligência | INT | MP e poder de magias arcanas, chance de identificar itens |
| Sabedoria | SAB | MP e poder de magias divinas, resistência mental (confusão, medo) |

- Valores base 8–18, modificador = `(valor − 10) / 2` (arredondado para baixo), à la D&D — fácil de entender e balancear.
- Atributos sobem: +1 em um atributo à escolha a cada 4 níveis; poções raras de atributo.

**Atributos derivados**
- `HP máx = base da classe + modCON × nível + dado de vida por nível`
- `MP máx = base da classe + mod(INT ou SAB) × nível`
- `Precisão = nível + modDES (ou modFOR em corpo a corpo) + bônus da arma`
- `Defesa (CA) = 10 + modDES (limitado pela armadura) + armadura + escudo + anéis`
- `Carga máx = 25 + 5 × FOR` (acima disso: lento; acima do dobro: não se move)
- `Furtividade`, `Percepção` (procurar portas secretas/armadilhas), `Regeneração`.

### 4.2 Raças (bônus e penalidades)
| Raça | FOR | DES | CON | INT | SAB | Especiais |
|---|---|---|---|---|---|---|
| **Humano** | 0 | 0 | 0 | 0 | 0 | +10% XP ganho; +1 atributo livre na criação |
| **Elfo** | −1 | +2 | −1 | +1 | 0 | Visão no escuro (raio de luz +1), resiste a sono/paralisia, −10% HP |
| **Anão** | +1 | −1 | +2 | 0 | −1 | Resiste a veneno, detecta portas secretas mais fácil, velocidade 90 (um pouco lento) |
| **Halfling** | −2 | +2 | 0 | 0 | +1 | Furtividade alta, +sorte (crítico e loot), carga reduzida |
| **Meio-Orc** | +2 | 0 | +1 | −2 | −1 | Regeneração rápida, fúria quando HP < 25% (+dano), lojistas cobram mais |
| **Gnomo** | −1 | +1 | 0 | +2 | 0 | Identifica varinhas ao usar, −falha de magia, resiste a ilusões/confusão |
| **Morto-vivo (desbloqueável)** | 0 | 0 | +1 | 0 | 0 | Não precisa comer, imune a veneno, cura com magia necromântica, dano por magia sagrada |

### 4.3 Classes
| Classe | Dado de vida | Recurso | Equip. inicial | Habilidades |
|---|---|---|---|---|
| **Guerreiro** | d10 | — (Fôlego) | espada longa, cota de malha, escudo, 2 poções de cura | Golpe Poderoso (dano ×2, custa turno extra), +acerto com todas as armas, melhor com armaduras pesadas |
| **Mago** | d4 | MP (INT) | cajado, manto, tomo com *Míssil Mágico* + 1 magia aleatória, 2 pergaminhos | Aprende magias de tomos, identifica pergaminhos ao ler, penalidade de falha de magia com armadura pesada |
| **Ladino** | d6 | — | adagas (arremessáveis), armadura de couro, kit de ladrão | Ataque furtivo (×3 em monstros dormindo/desatentos), desarmar armadilhas, abrir fechaduras, vê armadilhas mais fácil |
| **Clérigo** | d8 | MP (SAB) | maça, cota de escamas, símbolo sagrado | Magias divinas (cura, bênção, expulsar mortos-vivos), não usa armas cortantes sem penalidade |
| **Patrulheiro** | d8 | MP baixo (SAB) | arco curto + 40 flechas, espada curta, couro | Bônus com armas à distância, rastreia monstros (vê no mapa por alguns turnos), companheiro animal (opcional, Etapa 4) |
| **Necromante (desbloqueável)** | d4 | MP (INT) | adaga, manto, tomo de *Drenar Vida* | Levanta cadáveres como servos, magias de veneno/medo |

**Combinações:** todas permitidas, mas a tela de criação mostra quais combinam bem (ex.: Anão Guerreiro ✔, Meio-Orc Mago ✘ "difícil").
**Desbloqueáveis:** liberados ao alcançar marcos (ex.: chegar ao andar 10) — guardado em `localStorage`.

### 4.4 Criação de personagem (fluxo)
1. Nome (ou "aleatório" com gerador de nomes por raça).
2. Escolha de raça (lista com descrição e tabela de modificadores).
3. Escolha de classe (idem).
4. Atributos: **point-buy** (27 pontos) ou **rolagem** 4d6 descartando o menor (com opção de rerrolar). Começar só com rolagem fixa por classe e adicionar point-buy depois.
5. Resumo final → "Começar" (ou voltar).
6. Opcional: digitar uma seed específica.

### 4.5 Experiência e níveis
- XP ganho ao **matar monstros** (`xpValor do monstro × (nível do monstro / nível do jogador)`, com mínimo de 1), **descer a um andar novo pela primeira vez** (`10 × profundidade`), **identificar itens pelo uso** (pequeno), **desarmar armadilhas**.
- Curva: `XP para o nível N = 10 × N^2.2` arredondado (≈ 10, 46, 112, 210, 345... ). Nível máximo **30**.
- Ao subir de nível: rolar dado de vida + modCON, aumentar MP, +precisão, melhorar regeneração; a cada 4 níveis +1 atributo; em níveis específicos a classe ganha uma habilidade nova (tabela por classe).
- **Perda de nível** por monstros drenadores (fantasmas, vampiros) — mecânica clássica de NetHack/Angband, restaurável com poção rara.
- Feedback: mensagem destacada, flash dourado no `@`, som (Etapa 4).

### 4.6 Masmorra e geração procedural de andares
**Tamanho:** 80 × 24 tiles por andar (clássico) — cabe inteiro na tela, sem câmera rolando (simplifica muito). Câmera com rolagem pode vir depois para andares maiores.

**Geradores (cada andar sorteia um, ponderado pela profundidade):**
| Gerador | Descrição | Quando |
|---|---|---|
| **Salas e corredores (estilo Rogue)** | grade 3×3 de salas retangulares ligadas por corredores em L | andares 1–5 (e qualquer andar com peso menor) |
| **BSP (particionamento binário)** | divide o mapa recursivamente, uma sala por folha, conecta irmãos | andares 3–20 |
| **Cavernas (autômato celular)** | ruído aleatório + 4–5 iterações de suavização, mantém maior região conectada | andares 6–20 |
| **Drunkard's walk** | "andarilho bêbado" escava túneis orgânicos | minas / andares temáticos |
| **Labirinto** | backtracking recursivo | andar especial raro |
| **Andar do chefe** | layout semi-fixo (arena) com variações | andares 5, 10, 15, 20 |

**Pós-processamento comum a todos:**
1. **Garantir conectividade** (flood fill; se houver regiões isoladas, conecta ou descarta).
2. Posicionar escada `<` (subir) e `>` (descer) longe uma da outra (mapa de Dijkstra; distância mínima).
3. Portas (`+` fechada, `'` aberta), algumas trancadas, algumas **secretas** (aparecem como parede até serem descobertas com `s`).
4. **Salas especiais / vaults** a partir de "pré-fabricados" em texto ASCII com variações (tesouraria, ninho de monstros, biblioteca com tomos, santuário com altar, armadilha-sala). Formato:
   ```
   #########
   #..$.$..#
   #.#####.#
   +.#.!.#.+
   #.#####.#
   #..M.M..#
   #########
   ```
5. **Features:** água `~` (lenta, apaga fogo), lava (dano), fontes `{` (beber: efeito aleatório), altares `_`, armadilhas `^` (ocultas até detectadas: dardo, fosso que derruba de andar, teleporte, alarme, gás sonífero).
6. **Popular:** gastar um **orçamento de dificuldade** por andar (ver 4.8) em monstros e outro de **valor** em itens/ouro.
7. **Temas por faixa de profundidade:** Cripta superior (1–4), Minas (5–8), Cavernas fúngicas (9–12), Fortaleza afundada (13–16), Abismo (17–20). Tema muda paleta de cores das paredes, monstros mais prováveis e geradores.

**Persistência dos andares:** andares visitados ficam em cache (é possível voltar com `<`). Monstros não regeneram infinitamente, mas novos podem surgir aleatoriamente com o tempo (taxa baixa) para evitar "farm".

**Iluminação e memória:** salas podem ser iluminadas (vistas inteiras ao entrar) ou escuras (só o raio de luz do jogador). Tiles já vistos ficam desenhados em cor esmaecida ("memória").

### 4.7 Campo de visão (FOV)
- **Shadowcasting recursivo** (8 octantes) — padrão do gênero, simétrico e rápido.
- Raio = luz do jogador (tocha 4, lanterna 6, elfos +1); salas iluminadas são vistas inteiras.
- Monstros usam a mesma função (ou linha de visão simplificada) para perceber o jogador.
- Efeitos: cegueira (FOV = 0), "telepatia" (vê monstros com mente através de paredes), detecção mágica.

### 4.8 Monstros — geração procedural
**Camada 1 – Arquétipos base (dados):** ~40 arquétipos com glifo e cor, ex.: `r` rato, `k` kobold, `g` goblin, `o` orc, `j` geleia, `z` zumbi, `s` aranha, `S` serpente, `T` troll, `O` ogro, `W` espectro, `V` vampiro, `L` lich, `D` dragão. Cada um tem: nível base, HP (dados), ataques (`mordida 1d4`, `garra 2d6`...), velocidade, defesa, comportamento, resistências, XP, faixa de profundidade, se anda em grupo.

**Camada 2 – Modificadores procedurais (prefixos):** sorteados com chance crescente pela profundidade; cada um altera stats, cor e nome:
| Modificador | Efeito |
|---|---|
| Veloz | velocidade +50% |
| Gigante | HP ×2, dano +50%, mais lento |
| Venenoso | ataques envenenam |
| Flamejante / Gélido / Elétrico | dano elemental + resistência ao mesmo elemento |
| Vampírico | cura com o dano causado |
| Invisível | só aparece quando adjacente ou com detecção |
| Xamã | conjura uma magia simples (cura aliados, raio) |
| Ancestral | +3 níveis, nome próprio gerado |

**Camada 3 – Campeões e únicos:** a cada andar, pequena chance de um **campeão** (2–3 modificadores, nome gerado como "Grukk, o Devorador de Tochas", loot garantido). Chefes fixos nos andares 5/10/15/20.

**Orçamento de spawn:** `orçamento = 5 + profundidade × 3`. Cada monstro custa seu nível efetivo. Sorteia arquétipos válidos para a profundidade (com pequena chance de "fora de profundidade" — um monstro 2–4 andares mais difícil, clássico do Angband) até gastar o orçamento. Grupos (matilha de chacais, bando de goblins com um xamã).

**IA (comportamentos componíveis):**
- Estados: `Dormindo` → `Vagando` → `Caçando` → `Fugindo`.
- Acorda por barulho (combate próximo) ou ao ver o jogador (teste de furtividade).
- Caça com **mapa de Dijkstra** (um mapa "rumo ao jogador" compartilhado por todos os monstros por turno — barato).
- Foge com HP baixo (mapa de fuga = Dijkstra invertido ×−1,2).
- Variantes: `Covarde`, `Atirador` (mantém distância), `Conjurador`, `Ladrão` (rouba ouro e teleporta), `Errático` (morcegos), `Parado` (fungos, torretas), `Invocador`.
- Monstros abrem portas (os inteligentes), pegam itens do chão (os gananciosos), usam poções (os espertos).

### 4.9 Combate
**Corpo a corpo:** mover-se contra um monstro = atacar ("bump to attack").
- `Chance de acerto = clamp(5%, 95%, 50% + (Precisão − Defesa do alvo) × 5%)`
- `Dano = dado da arma + modFOR + encantamento + bônus de afixos`, reduzido por `absorção` da armadura (fixo, 0–N) e por resistências (elementais: −50% / imune).
- **Crítico:** 5% base (+ sorte, + arma), dano ×2 (×3 em ataque furtivo).
- Armas com propriedades: alcance 2 (lança), duas mãos (mais dano, sem escudo), rápidas (custam 75 de energia), pesadas (custam 125).

**À distância:** `f` (disparar com arma de disparo e munição aljavada) e `t` (arremessar qualquer item). Linha de **Bresenham**, projétil para no primeiro ator/parede. Munição pode quebrar ou cair no chão.

**Mensagens de combate** coloridas no log: "Você acerta o goblin." / "O goblin erra você." / "Você mata o goblin!" — com agrupamento de repetições ("O rato morde você. (x3)").

### 4.10 Efeitos de status
| Efeito | Comportamento | Cura |
|---|---|---|
| Envenenado | perde HP por turno | tempo, poção de curar veneno |
| Queimando | dano por turno, pode queimar pergaminhos | entrar na água, tempo |
| Congelado/Lento | velocidade −50% | tempo |
| Confuso | movimento em direção aleatória (às vezes) | tempo, poção |
| Cego | FOV 0 | tempo |
| Paralisado/Sono | perde turnos | tempo, levar dano (sono) |
| Medo | não consegue atacar corpo a corpo | tempo |
| Acelerado / Abençoado / Regenerando | efeitos positivos | — |
| Faminto → Fraco → Desmaiando | ver 4.13 | comer |

Implementar como lista de `{tipo, duração, intensidade}` com ganchos `aoIniciar`, `porTurno`, `aoTerminar`.

### 4.11 Itens e equipamentos — geração procedural
**Slots de equipamento:** mão principal, mão secundária (escudo / arma leve), cabeça, corpo, mãos, pés, capa, 2 anéis, amuleto, luz, aljava.

**Categorias e glifos (padrão do gênero):**
| Glifo | Categoria | Glifo | Categoria |
|---|---|---|---|
| `)` | armas | `[` | armaduras |
| `!` | poções | `?` | pergaminhos |
| `/` | varinhas | `=` | anéis |
| `"` | amuletos | `%` | comida / cadáveres |
| `$` | ouro | `+` | tomos de magia |
| `(` | ferramentas (tocha, kit) | `*` | gemas |

**Geração de equipamento:**
1. Escolher **base** pela profundidade (adaga → espada longa → montante; couro → malha → placas). Cada base tem dano/absorção, peso, nível mínimo.
2. Definir **nível do item** = profundidade ± variação (pode ser maior em vaults e chefes).
3. Sortear **raridade**:
   - Comum (branco) — 70%: base, talvez +1/+2.
   - Mágico (azul) — 22%: 1–2 afixos.
   - Raro (amarelo) — 7%: 3–4 afixos + **nome gerado** ("Lâmina Sussurrante de Korvath").
   - Lendário (laranja) — ≤1%: lista curada de artefatos únicos com efeitos especiais, só um de cada por partida.
4. Sortear **afixos** compatíveis com a categoria, com tiers por nível de item. Exemplos:
   - Prefixos: *Afiada* (+dano), *Precisa* (+acerto), *Flamejante* (+fogo), *Vampírica* (roubo de vida), *Reforçada* (+absorção), *Leve* (−peso), *Veloz* (+velocidade).
   - Sufixos: *do Urso* (+FOR), *da Raposa* (+DES), *da Vitalidade* (+HP), *do Arcano* (+MP), *da Visão* (+luz), *da Resistência ao Fogo*, *da Regeneração*, *da Furtividade*.
5. **Maldições** (chance pequena, maior em itens sem identificação): encantamento negativo, não pode ser removido até usar *Remover Maldição*, afixos ruins (*da Fraqueza*, *do Fardo*).

**Consumíveis com aparência aleatória (identificação estilo NetHack):**
- No início de cada partida, embaralha aparências: poções viram "poção borbulhante violeta", pergaminhos viram "pergaminho rotulado 'XUQ ZAB'", varinhas "varinha de ébano", anéis "anel de jade".
- Usar um consumível o **identifica para o resto da partida** (se o efeito for perceptível). Pergaminho de *Identificar* revela o item. Jogador pode "nomear" tipos desconhecidos (anotação pessoal).
- Equipamentos mostram "espada longa" até serem equipados/identificados → então "espada longa +2 Flamejante".
- Lista base de efeitos — Poções: cura, cura maior, mana, força, velocidade, invisibilidade, veneno, confusão, cegueira, experiência, restaurar nível, levitação. Pergaminhos: identificar, teleporte, mapeamento mágico, remover maldição, encantar arma, encantar armadura, medo, invocar monstro, aggravar monstros, luz, fogo. Varinhas (cargas): míssil mágico, raio de fogo/gelo/eletricidade, lentidão, teleportar outro, escavar, sono, polimorfia.

**Ouro e lojas (opcional/Etapa 4):** ouro conta para a pontuação; um lojista pode aparecer em alguns andares (`@` amarelo) para compra/venda.

### 4.12 Magias — geração procedural
**Base fixa:** ~15 magias "clássicas" por escola garantem que cada classe conjuradora tenha um kit funcional (Míssil Mágico, Cura Leve, Bola de Fogo, Teleporte Curto, Detectar Monstros, Escudo Arcano, Drenar Vida...).

**Magias procedurais por componentes** (aparecem em tomos raros, nome gerado):
- **Elemento:** fogo, gelo, eletricidade, ácido, veneno, arcano, sagrado, sombra.
- **Forma:** em si mesmo, toque, projétil, raio (atravessa), área (raio 1–3), cone, aura.
- **Efeito:** dano, cura, lentidão, medo, sono, empurrar, teleportar, invocar, buff (+defesa/+velocidade), dreno.
- **Modificadores:** ricochete, persistente (deixa chão em chamas), divide em 3, demora 1 turno para explodir.
- `Custo de MP = base(efeito) × multiplicador(forma) × (1 + 0,2 × nº modificadores)`, nível da magia derivado do custo.
- Nome gerado a partir dos componentes + raiz aleatória: "Lança Gélida de Ystar", "Nuvem Ácida Persistente".
- **Validação:** combinações proibidas (ex.: "cura em cone" ok, "teleportar em área" vira "dispersão" — tabela de exceções) e teto de poder por nível.

**Conjuração:**
- `Chance de falha = clamp(5%, 95%, base da magia − 3 × modINT/SAB − 2 × nível + penalidade de armadura)`.
- Falha gasta metade do MP e pode causar efeito colateral leve (confusão) em magias altas.
- Mira: tecla de conjurar → escolher magia (letra) → escolher alvo com cursor (`Tab` cicla entre inimigos visíveis, `Enter` confirma, `Esc` cancela).
- Aprendizado: ler tomo → aprende magias do tomo (limite de magias por nível de INT/SAB). Clérigos ganham magias divinas por nível.

### 4.13 Fome e recursos (pressão de tempo)
- Contador de nutrição; diminui por turno (mais rápido regenerando/conjurando).
- Estados: Saciado → Normal → Faminto (aviso) → Fraco (−FOR) → Desmaiando (perde turnos) → morte.
- Comida: rações, frutas, **cadáveres** de monstros (alguns venenosos, alguns concedem resistência — estilo NetHack, simplificado).
- Objetivo: impedir que o jogador fique farmando o mesmo andar para sempre.
- Tocha com duração (Etapa 2+ opcional).

### 4.14 Pontuação (Etapa 2)
```
Pontuação = ouro coletado
          + 50 × andar mais profundo alcançado
          + XP total ganho
          + Σ (bônus por monstro único/chefe morto)
          + 5000 se pegar o amuleto (+10000 se escapar com ele)
          × multiplicador de dificuldade (Fácil 0,5 / Normal 1 / Difícil 1,5)
```
- Pontuação parcial sempre visível no HUD.
- **High scores** (top 10): nome, raça/classe, nível, pontuação, andar, causa da morte ("morto por um goblin xamã no andar 4"), turnos, data, seed.

### 4.15 Morte, vitória e "morgue"
- Ao morrer: tela "VOCÊ MORREU" / "GAME OVER" → resumo (causa, inventário final identificado, atributos, monstros mortos, últimas mensagens do log) → registra high score → volta ao título.
- Arquivo "morgue" exportável em texto (`.txt` com o resumo) — tradição do gênero e ótimo para o relatório.

---

## 5. Interface e controles (hotkeys)

### 5.1 Layout da tela (100 × 32 células)
```
┌──────────────────────────────────────────────────────────────────────────────┬───────────────────┐
│ O goblin erra você. Você acerta o goblin. Você mata o goblin!                │ Thorin            │
│ Você vê aqui: uma poção borbulhante violeta.                                 │ Anão Guerreiro    │
├──────────────────────────────────────────────────────────────────────────────┤ Nível 4  XP 87/112│
│        #########                                                             │ HP ████████░░ 31/40│
│        #.......#           ######                                            │ MP ░░░░░░░░░░  0/0 │
│        #...!...+###########+....#                                            │ FOR 16 DES 11     │
│        #.......#           #..@.#                                            │ CON 17 INT  9     │
│        ####+####           #....>                                            │ SAB 10            │
│            #               ######                                            │ CA 16  Vel 90     │
│            #                                                                 │ Andar 3  T 1532   │
│         (mapa 80 × 24)                                                       │ Ouro 214          │
│                                                                              │ Faminto           │
│                                                                              │ Envenenado (4)    │
│                                                                              │ ─ Visíveis ─      │
│                                                                              │ g goblin (ferido) │
│                                                                              │ r rato            │
└──────────────────────────────────────────────────────────────────────────────┴───────────────────┘
  Pontos: 1.840                                           [?] Ajuda   [i] Inventário   [C] Ficha
```
- **Topo (2–3 linhas):** mensagens recentes; `Ctrl+P` / `M` abre o histórico completo.
- **Centro:** mapa 80 × 24.
- **Lateral direita:** ficha resumida, barras de HP/MP, efeitos ativos, monstros visíveis.
- **Rodapé:** pontuação e dicas de teclas.
- Telas modais sobrepostas (inventário, ficha, ajuda, mapa de magias) desenhadas também em ASCII com bordas.

### 5.2 Mapa de teclas (padrão inspirado em NetHack/Angband)
**Movimento** (três esquemas ao mesmo tempo — não conflitam):
| Direção | Vi-keys | Numpad | Setas |
|---|---|---|---|
| ← ↓ ↑ → | `h` `j` `k` `l` | `4` `2` `8` `6` | setas |
| ↖ ↗ ↙ ↘ | `y` `u` `b` `n` | `7` `9` `1` `3` | — (Home/PgUp/End/PgDn) |
| Correr (até algo interessante) | `Shift` + direção | `Shift` + numpad | `Shift` + seta |

**Ações:**
| Tecla | Ação | Tecla | Ação |
|---|---|---|---|
| `.` / `5` | esperar 1 turno | `R` | descansar (até curar ou algo aparecer) |
| `s` | procurar (portas secretas/armadilhas) | `o` / `c` | abrir / fechar porta (pede direção) |
| `g` / `,` | pegar item | `d` | largar item |
| `i` | inventário | `e` | equipamento atual |
| `w` | empunhar arma | `W` | vestir armadura |
| `T` | tirar armadura/acessório | `P` | colocar anel/amuleto |
| `q` | beber (quaff) | `r` | ler pergaminho/tomo |
| `E` | comer | `z` | usar varinha (zap) |
| `m` / `Z` | conjurar magia | `a` | aplicar/usar ferramenta |
| `f` | disparar munição aljavada | `t` | arremessar item |
| `Q` | escolher munição para a aljava | `F` | atacar direção à força |
| `<` / `>` | subir / descer escada | `D` | desarmar armadilha |
| `x` / `;` | olhar (cursor para inspecionar) | `Tab` | próximo alvo |
| `X` | autoexplorar (Etapa 4) | `C` | ficha do personagem |
| `M` | histórico de mensagens | `I` | itens descobertos (lista de identificações) |
| `?` | ajuda / lista de teclas | `Esc` | cancelar / fechar menu |
| `S` | salvar e sair | `p` | rezar (Clérigo/altares, opcional) |

*Observações:*
- A tabela final deve ser conferida para **não haver duplicidades**. Uma única fonte da verdade: `data/keymap.ts`.
- **Evitar atalhos que o navegador captura** (`Ctrl+W`, `Ctrl+T`, `Ctrl+N`, `F5`). Usar `preventDefault()` nas teclas do jogo.
- **Menus por letra:** inventário lista itens com letras `a)`…`z)`; ação + letra (ex.: `q` então `c` = beber o item `c`). Letras fixas por item enquanto ele está no inventário (padrão NetHack).
- **Confirmação** para ações perigosas (beber de fonte desconhecida, atacar aliado, descer com HP muito baixo opcional).
- **Remapeamento de teclas** em Opções (Etapa 4).
- **Repetir comando** com número antes (`20s` = procurar 20 vezes) — opcional.

### 5.3 Inspeção e acessibilidade
- Modo "olhar" (`x`): move cursor; mostra descrição do tile, monstro (nome, estado de saúde: "ileso / ferido / quase morto", se está dormindo) e itens.
- Mouse opcional: passar sobre um glifo mostra tooltip; clicar move (pathfinding).
- Opções: tamanho da fonte, alto contraste, modo daltônico (paleta alternativa), desligar animações, velocidade das animações.

### 5.4 Animações (o que a atividade chama de "animações" num jogo por turnos)
- **Projéteis** e **raios** percorrendo o caminho célula a célula (`*`, `-`, `|`, `/`, `\` de acordo com a direção).
- **Explosões** em área (anel de `*` expandindo, cor do elemento).
- **Flash** do glifo atingido (fundo vermelho por ~80 ms); `@` pisca ao subir de nível.
- Números de dano flutuantes (opcional).
- Água/lava com glifo cintilando (troca de cor lenta).
- A fila de animações **bloqueia o input** enquanto toca, mas qualquer tecla pode acelerá-las/pulá-las.

---

## 6. Roteiro de implementação por etapas

> Cada subetapa abaixo deve ser **um prompt separado** ao agente, terminar com o jogo rodando, testado manualmente e com **commit**. Critérios de aceite em ☐ servem de checklist para o grupo validar antes de passar adiante.

### ETAPA 0 — Preparação (antes de qualquer código de jogo)
**0.1 Projeto e convenções**
- Criar projeto Vite + TypeScript, Vitest, ESLint/Prettier, Git.
- Criar `CLAUDE.md` com: objetivo, stack, estrutura de pastas, regra "**implemente apenas a subetapa pedida**", "não use `Math.random()`", "lógica em `core/` sem dependência de Canvas", idioma dos textos do jogo (PT-BR) e do código.
- Criar `PROMPTS.md` para registrar os prompts.
- ☐ `npm run dev` abre uma página em branco; `npm test` roda (0 testes).

**0.2 Renderizador ASCII + RNG**
- Grade de células, fonte monoespaçada, paleta de 16 cores, função `desenhar(x, y, glifo, fg, bg)` e `escreverTexto(x, y, texto, cor)`.
- RNG com seed + `rolar("XdY+Z")` + testes unitários de determinismo.
- ☐ Página mostra uma grade de teste colorida; mesma seed gera mesma sequência em teste.

---

### ETAPA 1 — Base do jogo *(campo de jogo, elementos essenciais, controle do jogador, passagem do tempo, animações)*

**1.1 Mapa fixo e movimento**
- Mapa de teste desenhado à mão (uma sala), `@` movendo com vi-keys/numpad/setas, colisão com paredes.
- ☐ `@` anda nas 8 direções e não atravessa `#`.

**1.2 Loop de turnos e entidades**
- Sistema de energia/velocidade (3.4), contador de turnos, entidades genéricas.
- 2–3 monstros "burros" (rato, goblin) que andam aleatoriamente.
- ☐ Monstros só se movem quando o jogador age; `.` espera um turno; turno aparece no HUD.

**1.3 Geração procedural do andar (versão 1)**
- Gerador "salas e corredores" estilo Rogue + conectividade garantida + escadas `<` `>` + portas.
- Tecla de debug para regenerar o mapa com nova seed (remover depois ou deixar atrás de flag).
- ☐ 100 mapas gerados em teste automatizado: todos conectados e com as duas escadas alcançáveis.

**1.4 Campo de visão e memória**
- Shadowcasting, tiles vistos vs. lembrados, salas iluminadas vs. escuras.
- ☐ Corredores revelam aos poucos; o que já foi visto fica em cor apagada; monstros fora da visão não são desenhados.

**1.5 Combate corpo a corpo básico e IA de perseguição**
- HP, ataque por colisão, fórmula de acerto/dano simplificada, morte de monstro (vira cadáver `%`), morte do jogador.
- IA: dormindo → acorda ao ver → persegue (Dijkstra/A*).
- ☐ Dá para matar e morrer; monstros perseguem contornando paredes.

**1.6 HUD e log de mensagens**
- Painel lateral (HP, turno, andar), log de mensagens com cores e agrupamento de repetições, histórico (`M`).
- ☐ Toda ação relevante gera mensagem legível.

**1.7 Animações básicas**
- Fila de animações: flash ao receber/causar dano; um "dardo" arremessável (`t`) com projétil animado para validar o sistema.
- ☐ Animações tocam sem travar; tecla pressionada pula a animação.

> **Entrega da Etapa 1:** um "mini-Rogue" de um andar: explorar, ver, lutar, morrer.

---

### ETAPA 2 — Níveis e pontuação *(terminar níveis, níveis mais difíceis, pontuação, high scores)*
Num roguelike, "nível" tem dois sentidos — **andares** da masmorra e **nível do personagem** — e esta etapa cobre os dois.

**2.1 Múltiplos andares**
- `>` desce, `<` sobe, cache de andares visitados, jogador chega no `<` do novo andar.
- Escalonamento de dificuldade: orçamento de monstros cresce com a profundidade; tabela de monstros por faixa.
- Mais geradores: BSP e cavernas; temas por faixa de profundidade (cores das paredes).
- ☐ Descer 5 andares mostra monstros cada vez mais perigosos e mapas variados; voltar a um andar mostra o mesmo mapa.

**2.2 Atributos, XP e subida de nível**
- Atributos (4.1), derivados, curva de XP (4.5), ganho de HP/precisão ao subir, mensagem e flash.
- Ficha do personagem (`C`).
- ☐ Matar monstros enche a barra de XP; ao subir, HP máx aumenta; ficha mostra tudo.

**2.3 Raças, classes e tela de criação de personagem**
- Dados de raças e classes (4.2, 4.3), aplicação dos modificadores, equipamento inicial, habilidades iniciais (uma por classe).
- Tela de criação (4.4).
- ☐ Um Elfo Mago e um Meio-Orc Guerreiro começam com atributos/HP/itens visivelmente diferentes.

**2.4 Itens: inventário e equipamento (base)**
- Pegar/largar, inventário com letras, equipar armas e armaduras (slots), peso/carga, ouro `$`.
- Itens base sem afixos ainda; poções de cura simples.
- ☐ Equipar uma espada melhor aumenta o dano mostrado na ficha.

**2.5 Pontuação**
- Fórmula 4.14, exibida no HUD, causa da morte registrada.
- ☐ Pontuação aumenta com ouro, profundidade e XP; tela final mostra a pontuação.

**2.6 High scores (opcional da atividade)**
- Top 10 em memória (persistência vem na 4.1), recorde atual mostrado no HUD.
- ☐ Após várias partidas, a melhor pontuação aparece no HUD.

**2.7 Condição de vitória**
- Andar 20 com chefe e amuleto; pegar o amuleto = vitória (tela de vitória).
- Chefes nos andares 5/10/15.
- ☐ Com um comando de debug ("descer para o andar 20") dá para testar a vitória.

> **Entrega da Etapa 2:** partida completa do andar 1 ao 20, com personagem que evolui e pontuação.

---

### ETAPA 3 — Tela de abertura, Game Over e fluxo de telas

**3.1 Máquina de estados de telas**
- `Título → Criação → Jogo → GameOver → Título`, com telas modais empilháveis.

**3.2 Tela de abertura**
- Logo em arte ASCII grande (com leve animação: "tochas" piscando, letras surgindo), menu: **Novo jogo / Continuar / Pontuações / Opções / Ajuda / Créditos**; "Pressione qualquer tecla" se só houver uma opção.
- ☐ O jogo inicia na tela de abertura e só começa após interação do usuário.

**3.3 Tela de GAME OVER**
- "GAME OVER" em ASCII grande + lápide clássica (estilo Rogue) com nome, causa da morte, andar e pontuação:
  ```
            __________
           /          \
          /    REST    \
         /      IN      \
        /     PEACE      \
        |                |
        |     Thorin     |
        |  morto por um  |
        |  goblin xamã   |
        |   no andar 4   |
        |   1.840 pts    |
       *|     *  *  *    |*
   _____)/\\_//(\/(/\)/\//\/|_)____
  ```
- Resumo da partida (morgue) → registrar high score → voltar ao título.
- ☐ Ao morrer aparece "GAME OVER", depois o resumo, depois volta para a tela de abertura.

**3.4 Tela de pontuações (opcional da atividade)**
- Tabela top 10 acessível pelo menu.

**3.5 Attract mode (opcional da atividade)**
- Após ~20 s parado no título, inicia uma **demonstração**: o **bot** (`ai/bot.ts`) joga sozinho uma partida com seed de demo — autoexplora, luta, pega itens, desce escadas. Faixa "DEMO — pressione uma tecla".
- Ciclo de arcade: Título (20 s) → Attract mode (40 s ou até morrer) → High scores (10 s) → Título…
- Qualquer tecla interrompe e volta ao título.
- ☐ Deixando o jogo parado, o ciclo roda indefinidamente; uma tecla volta ao menu.

> **Entrega da Etapa 3:** jogo com "cara de produto": abertura, demo, game over, recordes.

---

### ETAPA 4 — Adições (as que tornam o jogo um roguelike "de verdade")

Ordem sugerida por **valor / esforço**. O grupo escolhe quantas implementar.

**4.1 Persistência** *(sugestão 6.1 da atividade)*
- High scores e desbloqueios em `localStorage`.
- **Save/Load** da partida (serializar estado + seed + estado do RNG), apagado ao morrer (permadeath). Salva automaticamente ao trocar de andar e ao sair.
- Exportar morgue `.txt`.

**4.2 Geração procedural de itens com afixos e raridade** (4.11)
- Afixos, raridades com cores, nomes gerados, maldições, encantamento +N.

**4.3 Consumíveis e identificação** (4.11)
- Poções, pergaminhos, varinhas com aparências embaralhadas por partida; identificação por uso/pergaminho; tela de "itens descobertos".

**4.4 Sistema de magias** (4.12)
- Magias base por classe, MP, falha, mira com cursor; depois magias procedurais em tomos.

**4.5 Monstros procedurais** (4.8)
- Modificadores, campeões com nomes gerados, grupos, monstros fora de profundidade, IA variada (atiradores, conjuradores, ladrões, covardes).

**4.6 Efeitos de status, fome, armadilhas e features** (4.10, 4.13, 4.6)

**4.7 Ataques à distância completos e munição** (`f`, `Q`, `t`)

**4.8 Vaults e salas especiais** (pré-fabricados ASCII)

**4.9 Efeitos visuais** *(sugestão 6.5)*
- Explosões, raios elementais coloridos, tremor de tela leve em crítico, "glow" da lava, transição de andar (tela se "desenhando" linha a linha), partículas de glifos ao morrer um chefe.

**4.10 Sons e música** *(sugestão 6.4)*
- Web Audio API com **sons sintetizados** estilo chiptune (passo, golpe, erro, morte, subir de nível, beber, porta) — sem arquivos, sem problemas de licença. Opcional: biblioteca `jsfxr` para gerar efeitos.
- Música ambiente por tema de profundidade (loop simples gerado ou faixa livre de direitos). Controle de volume/mudo.

**4.11 Estilos visuais / temas** *(sugestão 6.2)*
- Temas trocáveis em tempo real: **Terminal clássico** (fonte moderna), **CP437/DOS** (fonte bitmap), **Fósforo verde/âmbar** (monocromático com efeito CRT: scanlines e leve brilho), **Tiles** (spritesheet 16×16 de domínio público, ex.: tilesets de roguelike livres) — possível porque o renderizador só recebe "glifo + cor" e o tema decide como desenhar.

**4.12 Multiplayer assíncrono** *(sugestão 6.3)*
- **Desafio diário:** seed derivada da data — todos jogam o mesmo mundo; ranking separado.
- **Código de desafio:** o jogador compartilha "seed + raça/classe + pontuação-alvo" como texto curto (ex.: `ABISMO-7F3K-ELF-MAG-5200`); o outro cola o código e tenta superar.
- **Bones (estilo NetHack):** ao morrer, há chance de salvar o andar com o "fantasma" do personagem e seu equipamento (localmente, ou em arquivo exportável para um amigo importar).
- *(Multiplayer local em tempo real não combina com roguelike por turnos; se desejado: "modo hot-seat" com dois personagens alternando turnos.)*

**4.13 Qualidade de vida**
- Autoexplorar, viagem para escada (`_` / clique), correr inteligente, remapear teclas, tutorial no andar 1 (dicas contextuais), opções de acessibilidade.

**4.14 Extras de conteúdo (se sobrar tempo)**
- Lojas, altares/religião simples, companheiro animal do Patrulheiro, servos do Necromante, desbloqueáveis, modos de dificuldade, conquistas.

### ETAPA 5 — Multijogador cooperativo em rede local *(pedido extra, depois da versão com sprites — implementada)*

**Objetivo:** 2 a 4 pessoas na mesma rede (Wi-Fi/cabo) descem juntas a mesma masmorra, cada uma com o seu herói.

**Decisões de projeto**
- **Cooperativo, não competitivo:** todos contra a masmorra. Combina com um roguelike por turnos se cada rodada esperar todos
  os jogadores ("turnos simultâneos"): quem já agiu vê "Esperando Ana...".
- **Servidor autoritativo em Node, navegadores como clientes:** a lógica (`src/core`, `src/ai`, `src/gen`, `src/data`) não depende
  de DOM, então o servidor roda exatamente as mesmas regras. Os navegadores só mandam ações e desenham o estado que recebem.
  *Por que não um navegador como anfitrião?* Aba em segundo plano congela timers e travaria a partida de todos; P2P (WebRTC)
  exigiria trocar códigos de conexão à mão. Um servidor na rede local é um comando só.
- **Transporte:** WebSocket (`ws`) no mesmo endereço que serve o jogo: `npm run lan` compila tudo, sobe `http://<IP>:8080` e mostra
  os IPs da máquina para os amigos abrirem no navegador. Só rede local (sem internet, sem contas).
- **Perspectiva (o truque que evita reescrever o núcleo):** o núcleo inteiro fala de "o jogador" (`game.player`/`game.hero`,
  ~260 usos). Em vez de reescrevê-lo, `game.party` guarda todos os heróis e o servidor troca a perspectiva antes de cada passo:
  o herói que age; para um monstro, o herói mais próximo (a IA persegue e ataca quem está perto). A visão (`map.visible`) é por
  herói; a memória do mapa (`explored`) é do grupo.
- **Turnos:** o sistema de energia continua; quando um herói pode agir, o mundo espera a ação dele (cada jogador pode deixar uma
  ação na fila). Monstros só agem quando nenhum herói está pronto — igual ao jogo solo.
- **Regras de grupo:** a escada leva o grupo todo; herói caído vira espectador (câmera num aliado) e volta com metade da vida no
  próximo andar; a partida acaba quando todos caem (ou alguém vence); aliados não se atacam — trocam de lugar.
  Mensagens levam o nome de quem viveu ("[Ana] Você acerta o rato.").
- **Fora do escopo desta etapa:** entrar no meio da partida, salvar partida multijogador, jogar pela internet; correr,
  autoexplorar e descansar automáticos (viram um passo só — dependem de resposta imediata do jogo).

**5.1 Núcleo de grupo** (`src/core/party.ts`)
- Membros do grupo, troca de perspectiva, laço de turnos com vários heróis, IA mirando o herói mais próximo, regras de escada,
  queda, morte, reviver e troca de lugar. Mensagens marcadas com o herói.
- *Aceite:* testes no Node com 2–3 heróis: a rodada espera todos; monstro ataca o herói mais perto; um herói cair não encerra a
  partida; o grupo desce junto e o caído volta; o jogo solo continua idêntico (testes e simulação com bot passam).

**5.2 Sala e protocolo** (`src/net/`)
- Mensagens JSON: entrar (nome/raça/classe), pronto, iniciar (líder = primeiro a entrar), ação, chat; do servidor: sala, estado
  (só o andar atual + o grupo, na perspectiva de cada jogador), chat, erro. Reconexão pelo mesmo navegador; jogador desconectado
  tem o herói esperando (não trava os outros).
- *Aceite:* testes da sala com clientes falsos (sem rede): entrar, iniciar, agir em ordem, desconectar, reconectar.

**5.3 Servidor** (`server/lan.ts`)
- HTTP servindo o jogo compilado + WebSocket em `/ws`; mostra os IPs; `npm run lan`.
- *Aceite:* sobe com um comando, aceita conexões de outros computadores da rede.

**5.4 Cliente**
- "Multijogador (rede local)" no título → criação do herói → sala de espera (jogadores, pronto, iniciar) → jogo.
- Tela do jogo em modo rede: ação vai para o servidor; estado chega e anima (sons e efeitos iguais ao solo); aliados desenhados
  com nome e cor; painel do grupo (vida de cada um, de quem é a vez); chat; fim de partida volta para a sala.
- *Aceite:* dois navegadores jogando juntos.

**5.5 Teste ponta a ponta**
- Servidor real + dois navegadores headless (puppeteer): sala, início, os dois andando, luta, descida de escada; screenshots
  dos dois lados para revisar.

---

## 7. Estratégia de testes e balanceamento

### 7.1 Testes automatizados (Vitest, lógica pura)
| Área | O que testar |
|---|---|
| RNG | mesma seed → mesma sequência; `rolar("2d6")` dentro de [2, 12] |
| Geração de mapas | 1000 seeds: conectividade, escadas alcançáveis, sem itens/monstros dentro de paredes, vaults não sobrepostos |
| FOV | casos clássicos (pilar, corredor, simetria) |
| Combate | limites de chance (5–95%), resistências, críticos |
| Progressão | curva de XP monotônica, nível máximo, bônus de raça/classe aplicados |
| Itens | afixos compatíveis com a categoria, nomes não vazios, maldições removíveis |
| Magias | toda combinação gerada é válida e tem custo dentro do teto |
| Save/Load | salvar → carregar → estado idêntico (comparação profunda) |
| Determinismo | replay de uma lista de ações produz exatamente o mesmo estado final |

### 7.2 Simulação com o bot
- O mesmo bot do attract mode roda **centenas de partidas sem interface** (`npm run sim`), registrando: andar médio alcançado, causa de morte mais comum, nível médio por andar, ouro/itens por andar.
- Usado para ajustar números (ex.: "80% das mortes acontecem no andar 3 por chacais → reduzir tamanho das matilhas").

### 7.3 Testes manuais (checklist por etapa)
- Os critérios ☐ da Seção 6.
- Comandos de debug atrás de uma flag (`?debug=1` na URL): revelar mapa, teleporte de andar, invocar monstro/item, invencibilidade, mostrar seed.

### 7.4 Metas de balanceamento (Normal)
- Jogador iniciante chega em média ao andar 4–6.
- Uma partida vitoriosa dura ~1,5–3 h e ~20–40 mil turnos.
- Nenhuma combinação raça/classe com taxa de sobrevivência no bot muito menor que as outras (exceto as marcadas como "difícil").

---

## 8. Fluxo de trabalho com o agente (e material para o relatório)

A atividade valoriza mais o **relatório** do que o código, então o processo deve gerar evidências desde o início.

### 8.1 Regras para os prompts
1. **Um prompt = uma subetapa** da Seção 6. Começar sempre com: *"Implemente apenas a subetapa X.Y do PLANO.md. Não implemente nada das próximas subetapas."*
2. Pedir, ao final de cada subetapa: resumo do que foi feito, arquivos alterados e como testar.
3. Antes de subetapas grandes (gerador de mapas, magias procedurais), pedir **primeiro o design detalhado** e só depois o código.
4. Se o agente se adiantar (implementar coisas de etapas futuras), registrar isso no relatório — é exatamente o comportamento que a atividade pede para observar.
5. Revisar o código ao final de cada **etapa** (não de cada subetapa) e pedir explicações ao agente sobre partes que o grupo não entendeu ("explique como funciona o shadowcasting em `fov.ts`").

### 8.2 Registro (para a seção 7.2 do relatório)
- `PROMPTS.md`: data, etapa, prompt principal, resultado (funcionou de primeira / precisou de N correções), observações.
- Commits com mensagens no formato `etapa-1.3: gerador de salas e corredores`.
- Prints/GIFs ao final de cada etapa (servem também para a **apresentação**, que pede mostrar resultados por etapa).
- Anotar: ferramenta de agente usada (ex.: Claude Code), modelo(s), estrutura de agentes (agente único / subagentes), quanto retrabalho cada etapa exigiu.

### 8.3 Perguntas do relatório que este plano ajuda a responder
- *Legibilidade e manutenção:* a separação `core/` × `ui/` e os dados em `data/` permitem avaliar se o código ficou modular.
- *Déficit de compreensão:* ao final, o grupo tenta fazer **uma pequena modificação sem o agente** (ex.: adicionar um monstro novo em `data/monsters.ts` ou mudar a fórmula de pontuação) e relata como foi.
- *Como julgar se uma modificação deu certo:* critérios ☐, testes automatizados e simulação com o bot.

---

## 9. Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| Agente gera o jogo inteiro de uma vez | perde a evolução por etapas | prompts restritos por subetapa; `CLAUDE.md` com a regra; commits pequenos |
| Escopo grande demais | não terminar | Etapas 1–3 são o núcleo obrigatório; Etapa 4 é um cardápio priorizado |
| Bugs de determinismo (RNG fora do lugar) | attract mode/replays/testes quebram | RNG com seed obrigatório; teste de replay desde a Etapa 1 |
| Balanceamento ruim | jogo frustrante ou trivial | simulação com o bot + tabelas de dados fáceis de ajustar |
| Mapas desconectados / jogador preso | partida injogável | teste automatizado de conectividade com milhares de seeds |
| Conflito de teclas com o navegador | ações não funcionam ou fecham a aba | `preventDefault`, evitar combinações com `Ctrl` |
| Save corrompido ao mudar o código | perda de partidas | campo `versão` no save; descartar com aviso se incompatível |
| Código ilegível no fim | relatório negativo / difícil manter | revisão ao final de cada etapa; pedir refatoração explícita antes da Etapa 4 |

---

## 10. Apêndices: tabelas de conteúdo

### 10.1 Glifos de terreno
| Glifo | Significado | Glifo | Significado |
|---|---|---|---|
| `#` | parede / rocha | `.` | chão |
| `+` | porta fechada | `'` | porta aberta |
| `<` | escada para cima | `>` | escada para baixo |
| `~` | água | `≈` (ou `~` vermelho) | lava |
| `^` | armadilha (descoberta) | `{` | fonte |
| `_` | altar | `:` | chão de corredor/escombros (tema) |
| `&` | árvore/fungo gigante (cavernas) | ` ` | não explorado |

### 10.2 Monstros iniciais (amostra por faixa)
| Andar | Monstros |
|---|---|
| 1–3 | `r` rato, `k` kobold, `b` morcego, `j` geleia verde, `g` goblin, `c` chacal (grupo) |
| 4–7 | `o` orc, `s` aranha gigante, `z` zumbi, `g` goblin xamã, `h` anão renegado, `F` fungo venenoso |
| 8–12 | `O` ogro, `T` troll (regenera), `W` espectro (drena nível), `S` serpente, `n` ninfa (rouba itens) |
| 13–16 | `V` vampiro, `G` golem, `N` naga, `E` elemental (fogo/gelo), `h` mente-devoradora |
| 17–20 | `L` lich, `D` dragão (cores por elemento), `&` demônio, `U` horror abissal |
| Chefes | 5: Rei Goblin · 10: Troll Ancião · 15: Lich Menor · 20: Guardião do Abismo |

### 10.3 Progressão de equipamento (amostra)
| Faixa | Armas | Armaduras |
|---|---|---|
| 1–4 | adaga 1d4, clava 1d6, espada curta 1d6, arco curto 1d6 | couro (abs 1), couro batido (2) |
| 5–9 | espada longa 1d8, maça 1d8, machado 1d10, arco longo 1d8 | escamas (3), cota de malha (4) |
| 10–14 | montante 2d6 (duas mãos), mangual 1d10, besta 1d10 | meia-placa (5) |
| 15–20 | lâmina de mithril 2d6 (leve), alabarda 2d8 | placas (6), mithril (5, sem penalidade de DES) |

### 10.4 Habilidades por nível (amostra — Guerreiro)
| Nível | Habilidade |
|---|---|
| 1 | Golpe Poderoso |
| 5 | Ataque Giratório (acerta todos os adjacentes) |
| 10 | Segundo Fôlego (cura 30% uma vez por andar) |
| 15 | Ataque extra (ações de ataque custam 75 de energia) |
| 20 | Inabalável (imune a medo e atordoamento) |

*(Tabelas equivalentes serão criadas para cada classe na subetapa 2.3.)*

### 10.5 Glossário rápido
- **Roguelike:** jogo de exploração de masmorras com geração procedural, turnos e morte permanente (nome vem de *Rogue*, 1980).
- **FOV (Field of View):** área que o personagem enxerga.
- **Mapa de Dijkstra:** grade onde cada célula guarda a distância até um objetivo; monstros "descem a ladeira" até o alvo.
- **BSP:** *Binary Space Partitioning*, divisão recursiva do espaço para posicionar salas.
- **Autômato celular:** regra local aplicada repetidamente que transforma ruído em cavernas.
- **Afixo:** modificador nomeado que se acopla a um item ("*Flamejante*", "*do Urso*").
- **Seed:** número que determina toda a geração aleatória de uma partida.
- **Bones:** andar salvo com o fantasma de um personagem morto, encontrado em outra partida.
- **Morgue:** arquivo-texto com o resumo da partida após a morte.
