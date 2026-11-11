# Checklists por área (nosso "Monday")

Um arquivo por área, um responsável por arquivo. Cada linha é uma tarefa com situação, prazo e nota. Vamos adicionando linhas conforme surgem — a lista cresce, nunca apaga: tarefa feita vira ✅ e fica para histórico.

| Área | Responsável | Arquivo |
|---|---|---|
| 1. CNPJ e integrações (iFood, Aiqfome, Delivery Much…) | **Hugo** | [hugo-cnpj-e-integracoes.md](hugo-cnpj-e-integracoes.md) |
| 2. Implementação e atualizações do software | **Emmanuel** | [emmanuel-software.md](emmanuel-software.md) |
| 3. Planejamento tributário e operação no CNPJ | **Hugo** | [hugo-tributario.md](hugo-tributario.md) |

## Regras do quadro

- **Situação**: `⏳ a fazer` · `🔧 fazendo` · `⛔ travado` (diz por quê e por quem) · `✅ feito` (com data).
- **Prazo**: data ou "sem prazo". Tarefa travada mostra em quem está travada — se for no outro sócio, ele resolve na revisão semanal.
- **Como adicionar**: nova linha no fim do grupo certo, com o próximo número (`H-`, `E-`, `T-`). Pode adicionar tarefa na área do outro; o responsável da área é quem decide prazo e ordem.
- **Como fechar**: muda para ✅, põe a data na coluna Nota. Se gerou decisão de arquitetura, registra em `docs/decisoes.md`.
- **Revisão semanal** (10 min, os dois): abrir os três arquivos, olhar os ⛔ e os prazos vencidos, decidir as `05-decisoes-abertas.md` que travam alguém.

Os checklists substituem a coluna "Responsável" solta de `04-pendencias.md`: aquela lista continua como visão geral; o detalhe e o dia a dia ficam aqui.
