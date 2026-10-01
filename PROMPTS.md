# Registro de prompts

Ferramenta: Claude Code (extensão VS Code) — modelo Claude Opus 5.5 (`claude-opus-5-5`), agente único.

| # | Etapa | Prompt (resumo) | Resultado |
|---|---|---|---|
| 1 | Plano | "Crie um plano de desenvolvimento para a criação de um roguelike retrô, seguindo a linha do Rogue, Nethack, Angband... Quero apenas o plano, sem a necessidade de código ainda..." (+ leitura do PDF da atividade) | Gerado `PLANO.md` com 4 etapas e subetapas. |
| 2 | 0.1 em diante | "Comece a implementação do primeiro passo, se precisar pode reduzir um pouco o escopo, faça o passo, revise se está OK com o pedido e aí prossiga, quero ver o quanto desse jogo você consegue fazer" | O agente passou a implementar as subetapas em sequência, revisando cada uma (testes + screenshots no Chrome headless) e fazendo um commit por subetapa. Ver `git log`. |
