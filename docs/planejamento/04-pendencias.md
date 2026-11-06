# Pendências

A lista viva. Toda linha tem responsável; sem nome, não anda. Ao concluir, mude a situação (não apague — mova para "Concluídas" no fim do mês).

Legenda: ✅ pronto · 🔧 em andamento · ⏳ não começou · ⛔ bloqueado · ❄️ adiado

## Agora (próximas 2 semanas)

| # | Tarefa | Responsável | Situação | Observação |
|---|---|---|---|---|
| P-1 | Hugo aceitar o convite de colaborador e fazer o primeiro commit | Hugo | ✅ | Convite aceito; esta pasta é o primeiro commit (06/11) |
| P-2 | Hugo com ambiente local rodando: `npm install`, `npm test`, `npm run test:db` (PostgreSQL 16), `npm run dev`, graphify instalado | Hugo | ⏳ | Passos no README e no CLAUDE.md |
| P-3 | Combinar o fluxo de trabalho: branch por tarefa, PR com revisão do outro, `graphify update .` antes do commit | Sócio + Hugo | ⏳ | Registrar a decisão em `docs/decisoes.md` |
| P-4 | Dividir as áreas: quem cuida do quê daqui para frente | Sócio + Hugo | ⏳ | Ver Q-5 |
| P-5 | Decidir a ordem das frentes (Q-1) e se o iFood volta agora | Sócio + Hugo | ⏳ | |
| P-6 | Criar conta de desenvolvedor no iFood e pedir acesso à documentação/sandbox | | ⏳ | Começar cedo: homologação demora |
| P-7 | Pedir acesso às integrações do Aiqfome e do Delivery Much (contato comercial/parceiros) | | ⏳ | |
| P-8 | Atualizar o `README.md` (está em "etapa 1", "D-001 a D-010") | | ⏳ | |
| P-9 | Rodar `/graphify . --update` para os documentos entrarem no mapa (gasta tokens) | Sócio | ⏳ | Depois desta pasta entrar |

## Piloto com restaurante real

| # | Tarefa | Responsável | Situação | Observação |
|---|---|---|---|---|
| P-10 | Qual restaurante é o piloto e quando começa a operar de verdade | | ⏳ | Ver Q-6 |
| P-11 | Importar o cardápio do piloto (BeeFood → RES) e conferir preços | | ⏳ | D-049 |
| P-12 | Instalar o RES Impressão no computador da loja e testar as impressoras | | ⏳ | |
| P-13 | Conectar Mercado Pago da loja e testar Pix real | | ⏳ | D-044 já teve 2 testes no ar |
| P-14 | Treinar caixa e motoboy; deixar um "manual de 1 página" para cada | | ⏳ | |
| P-15 | Canal de suporte: como a loja avisa quando algo quebra (WhatsApp dos sócios?) | | ⏳ | |
| P-16 | Monitoramento de erros em produção (Sentry ou similar) | | ⏳ | Hoje não existe |
| P-17 | Testar restaurar o backup do Supabase | | ⏳ | |

## Integrações (detalhe em 03-integracoes-marketplaces.md)

| # | Tarefa | Responsável | Situação | Observação |
|---|---|---|---|---|
| P-18 | M-1 a M-3: modelo de pedido externo, vínculo de cardápio, `criar_pedido_externo` | | ⏳ | Base genérica para todos os apps |
| P-19 | M-4 a M-6: espelhar status, segredos por loja, cartão em Aplicativos | | ⏳ | |
| P-20 | M-7 e M-8: canal no quadro e nos relatórios/financeiro | | ⏳ | |
| P-21 | Ambiente de homologação do RES separado da produção | | ⏳ | Segundo projeto no Supabase + preview na Vercel |
| P-22 | iFood: polling de eventos, pedido, status, homologação | | ❄️ | Retomar após P-5 |
| P-23 | Aiqfome | | ⏳ | Após P-18 a P-20 |
| P-24 | Delivery Much | | ⏳ | Após P-18 a P-20 |
| P-25 | M-10: cardápio do RES publicado nos apps (alterar de um lugar só) | | ⏳ | Depois de receber pedidos estável |

## Frentes já previstas no README (fora dos marketplaces)

| # | Tarefa | Responsável | Situação | Observação |
|---|---|---|---|---|
| P-26 | KDS (tela da cozinha) | | ⏳ | Etapa 4 |
| P-27 | WhatsApp oficial (API da Meta) — cadastro na Meta e envio automático | | ⛔ | Bloqueado pelo cadastro na Meta (D-058) |
| P-28 | Cartão online no cardápio digital | | ⏳ | D-044 |
| P-29 | Salão: mesas, comandas, PDV, garçom por tablet | | ⏳ | Etapa 7 |
| P-30 | Fiscal: NFC-e (certificado A1 + provedor fiscal) | | ⏳ | Decidir provedor (Q-7) |
| P-31 | Entregador sob demanda | | ⏳ | Só com cliente pedindo |

## Concluídas

| # | Tarefa | Responsável | Concluída em |
|---|---|---|---|
| — | (mover para cá ao fechar) | | |
