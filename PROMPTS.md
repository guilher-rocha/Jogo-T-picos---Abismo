# Registro de prompts e do desenvolvimento

**Ferramenta:** Claude Code (extensão do VS Code), **modelo:** Claude Opus 5.5 (`claude-opus-5-5`), **estrutura:** agente único.
O agente usou ferramentas de terminal, edição de arquivos, testes automatizados (Vitest) e um script próprio
(`scripts/shot.mjs`) que abre o jogo no Chrome headless, envia teclas e tira screenshots para revisar cada etapa.

## Prompts principais

| # | Etapa | Prompt (resumo) | Resultado |
|---|---|---|---|
| 1 | Plano | "Crie um plano de desenvolvimento para a criação de um roguelike retrô, seguindo a linha do Rogue, Nethack, Angband... Quero apenas o plano, sem a necessidade de código ainda, seja o mais detalhado e inclusivo possível. Pode também dar uma lida no PDF da atividade." | `PLANO.md` com 4 etapas (alinhadas ao PDF) e subetapas com critérios de aceite. |
| 2 | 0.1 → 4.13 | "Comece a implementação do primeiro passo, se precisar pode reduzir um pouco o escopo, faça o passo, revise se está OK com o pedido e aí prossiga, quero ver o quanto desse jogo você consegue fazer." | O agente implementou todas as subetapas em sequência, um commit por subetapa (`git log`). |

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
- **Problemas do ambiente:** heredocs longos no bash do Windows quebravam e engoliam barras invertidas; o agente passou a usar
  scripts Python em arquivo e a ferramenta de escrita.

## Escopo reduzido ou deixado de fora

- Remapear teclas, clique do mouse para andar e tooltips: não feitos.
- "Bones" (fantasmas de partidas anteriores), lojas, religião, companheiro animal, classes/raças desbloqueáveis e conquistas
  (itens "se sobrar tempo" da 4.14): não feitos.
- Point-buy de atributos: substituído por atributos da classe + raça com opção de rerrolar (como o plano sugeria para começar).
- O sistema de status foi adiantado da 4.6 para a 4.3, porque as poções dependiam dele.
- Uma versão mínima das magias (Míssil Mágico, Cura Leve) foi adiantada para a 2.3, para Mago e Clérigo serem jogáveis.
