# Checklist 2 — Implementação e atualizações do software · Responsável: Emmanuel

Objetivo da área: manter o RES evoluindo e estável — o que já existe funcionando no piloto, as próximas etapas do README e a parte de código das integrações (em dupla com o Hugo, que é o dono da frente de marketplaces).

Legenda: ⏳ a fazer · 🔧 fazendo · ⛔ travado · ✅ feito

## A. Processo e base

| # | Tarefa | Situação | Prazo | Nota |
|---|---|---|---|---|
| E-1 | Fluxo de trabalho a dois: branch por tarefa, PR com revisão do outro, `graphify update .` antes do commit — registrar como D-xxx | ⏳ | | Com o Hugo |
| E-2 | Convidar o Hugo no Supabase e na Vercel | ⏳ | | |
| E-3 | Atualizar o `README.md` (está em "etapa 1", "D-001 a D-010") | ⏳ | | |
| E-4 | Rodar `/graphify . --update` depois que `docs/planejamento` entrar na `main` | ⏳ | | Gasta tokens |
| E-5 | Monitoramento de erros em produção (Sentry ou similar) no painel e no agente | ⏳ | | Hoje não existe |
| E-6 | Testar restaurar um backup do Supabase | ⏳ | | |
| E-7 | Ambiente de homologação separado: segundo projeto Supabase + preview na Vercel (destrava H-20) | ⏳ | | Hugo depende disso |

## B. Piloto com restaurante real

| # | Tarefa | Situação | Prazo | Nota |
|---|---|---|---|---|
| E-8 | Fechar qual restaurante é o piloto e a data de início (Q-6) | ⏳ | | Decisão conjunta |
| E-9 | Confirmar o que faltou da "entrega 3 de 3" do cardápio digital (D-045/046) e fechar | ⏳ | | |
| E-10 | Importar o cardápio do piloto (BeeFood → RES) e conferir preços | ⏳ | | D-049 |
| E-11 | Instalar o RES Impressão na loja e testar as impressoras | ⏳ | | |
| E-12 | Mercado Pago da loja conectado e Pix real testado | ⏳ | | |
| E-13 | Manual de 1 página para caixa e para motoboy | ⏳ | | |
| E-14 | Canal de suporte da loja (grupo no WhatsApp?) e quem atende | ⏳ | | |
| E-15 | Acompanhar a primeira semana de operação e abrir aqui uma linha por problema encontrado | ⏳ | | |

## C. Código das integrações (em dupla com o Hugo — ver checklist 1, seção C)

| # | Tarefa | Situação | Prazo | Nota |
|---|---|---|---|---|
| E-16 | Migração: tabelas de pedido externo, canal, vínculo de cardápio, segredos por loja (M-1, M-2, M-5) | ⏳ | | Depois de H-18 |
| E-17 | `criar_pedido_externo` reaproveitando gatilhos de impressão/caixa (M-3) | ⏳ | | |
| E-18 | Fila de saída para espelhar status (pg_net + pg_cron, como os webhooks) (M-4) | ⏳ | | |
| E-19 | Cartão do marketplace em Aplicativos (M-6) | ⏳ | | |
| E-20 | Quadro: selo de canal, filtro, alerta (M-7) | ⏳ | | |
| E-21 | Relatórios/Financeiro por canal e comissão (M-8) | ⏳ | | |

## D. Próximas etapas do README (fora dos marketplaces)

| # | Tarefa | Situação | Prazo | Nota |
|---|---|---|---|---|
| E-22 | KDS (tela da cozinha) | ⏳ | | Etapa 4 |
| E-23 | Cartão online no cardápio digital | ⏳ | | D-044 |
| E-24 | WhatsApp oficial: envio automático de "Avisar cliente" quando o cadastro na Meta sair (H-16) | ⛔ | | Travado em H-16 (Hugo) |
| E-25 | Salão: mesas, comandas, PDV, garçom por tablet | ⏳ | | Etapa 7 |
| E-26 | Fiscal: NFC-e, quando o provedor for escolhido (T-12) | ⛔ | | Travado em T-12 (Hugo) |
| E-27 | Entregador sob demanda | ⏳ | | Só com cliente pedindo |

## E. Manutenção contínua

| # | Tarefa | Situação | Prazo | Nota |
|---|---|---|---|---|
| E-28 | Bugs reportados pelo piloto (uma linha por bug) | ⏳ | | |
| E-29 | Atualizar dependências (Next.js, Supabase, Capacitor) a cada mês | ⏳ | | |
