# Planejamento do RES

Pasta para os dois sócios acompanharem **o que falta para o projeto andar e como está cada coisa**. É o lugar de olhar antes de começar qualquer trabalho e de atualizar ao terminar.

| Arquivo | Para que serve |
|---|---|
| [01-objetivo.md](01-objetivo.md) | Onde queremos chegar e o que já temos (visão em uma página) |
| [02-estado-atual.md](02-estado-atual.md) | Situação de cada área do sistema: pronto, em andamento, não começou |
| [03-integracoes-marketplaces.md](03-integracoes-marketplaces.md) | O plano para iFood, Delivery Much, Aiqfome e os outros — a frente principal que falta |
| [04-pendencias.md](04-pendencias.md) | Lista de tarefas com responsável e situação (a lista viva) |
| [05-decisoes-abertas.md](05-decisoes-abertas.md) | Perguntas que os dois precisam decidir juntos |

## Como usamos

- **Situação** usa sempre as mesmas palavras: `✅ pronto` · `🔧 em andamento` · `⏳ não começou` · `⛔ bloqueado` (diz por quê) · `❄️ adiado`.
- **Responsável**: `Sócio` (ZPloxDr3am) ou `Hugo` (CriadorHugo). Tarefa sem responsável não anda — toda linha de `04-pendencias.md` precisa de um nome.
- Ao terminar algo, mude a situação aqui no mesmo PR da mudança de código. Decisão de arquitetura continua indo para `docs/decisoes.md` (D-xxx); aqui fica só o acompanhamento.
- Revisão rápida dos dois: uma vez por semana, abrir `04-pendencias.md` e `05-decisoes-abertas.md` juntos (10 min).

Levantado em 06/11/2026 a partir do commit `2499bc8` (D-072, PR #85).
