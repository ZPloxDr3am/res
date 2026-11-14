# iFood — passo a passo até a homologação (D-074, D-075, D-114)

## 1. Critérios da homologação × onde está no RES

| Critério do iFood (portal, 12/11/2026) | Como o RES cumpre |
|---|---|
| Webhook https respondendo em ≤ 5 s | `/api/marketplace/ifood/webhook`: grava o evento e responde **202** na hora; o processamento roda depois da resposta (`after`). |
| Assinatura `X-IFood-Signature` (HMAC-SHA256 do corpo bruto com o clientSecret); inválida → 401 | Conferida antes de ler o JSON, comparação em tempo constante. |
| KEEPALIVE a cada 30 s (presença das lojas) | Responde 202 com `merchantIds` só das lojas **abertas agora** (pausa D-034 e horário da marca). |
| Eventos duplicados / fora de ordem | Evento gravado uma vez (`canal + id`); pedido único por `externo_id`; status não volta etapa. |
| Ack de tudo (polling) e só depois de gravar | Polling em lotes de 100 lojas; ack só dos eventos gravados no banco. |
| Confirmar em até 8 min | Aceite automático da loja (já existia) ou botão no quadro; aviso de pedido pendente vem na etapa do painel. |
| Motivos de cancelamento antes de cancelar | `GET …/cancellationReasons` ao abrir o cancelamento (D-075). |
| Comanda: bandeira, troco, cupom com quem paga, observações, código de coleta, CPF na nota | Cupom do marketplace (D-074). |
| Status alterado em outro sistema (Gestor de Pedidos) | Eventos CFM/RTP/DSP/CON/CAN vindos de fora atualizam o RES e não voltam para o iFood. |
| Token renovado só quando vence | Token do app guardado no banco (vale para todas as instâncias), renovado 5 min antes de vencer ou em 401. |
| Pedido alterado (ORDER_PATCHED) e endereço alterado | O RES relê o pedido e refaz itens, valores e endereço enquanto não saiu para entrega. |
| Entrega pelo iFood | Entregador (ADR/GTO/AAO/CLT/AAD) guardado no pedido; o pedido pula o motoboy (Q-15). |
| Cancelamento pedido pelo cliente/iFood (CAR/CARF) | Fica registrado no pedido (a faixa "cancelamento solicitado" vem na etapa do painel). |
| Pausa da loja | Pausar no RES envia interrupção ao iFood; reabrir remove. |

## 2. O que vocês fazem (conta e chaves — o Claude não digita segredos)

1. **Conta Profissional (CNPJ)** em developer.ifood.com.br (CPF não homologa).
2. Criar o aplicativo **Centralizado**, categoria **PDV**, com os módulos Merchant, Events, Order (Catalog depois).
3. Em **Meus Apps → Webhook**: `https://res-iqzs.vercel.app/api/marketplace/ifood/webhook`.
4. Na **Vercel** (Settings → Environment Variables, Production): `IFOOD_CLIENT_ID`, `IFOOD_CLIENT_SECRET`, `MARKETPLACE_CRON_SEGREDO` (uma senha longa qualquer). Fazer um novo deploy.
5. No **Supabase → SQL** (uma vez): `select vault.create_secret('<o mesmo MARKETPLACE_CRON_SEGREDO>', 'marketplace_cron_segredo');`
6. No RES, **Aplicativos → iFood**: colar o merchantId da loja de teste e mudar para **produção**.

## 3. Roteiro da homologação (o iFood confere, 1 tentativa a cada 4 h)

1. Receber e confirmar: fazer um pedido de teste no app → aparece no quadro → **Aceitar** (em menos de 8 min) → conferir a comanda.
2. Cancelar: abrir o cancelamento (lista de motivos do iFood) → cancelar.
3. Despachar: pedido de entrega própria → Pronto → Saiu para entrega.
4. Retirada: Pronto (`readyToPickup`) → Concluir.
5. Mandar uma assinatura errada no webhook (o portal faz isso) → o RES responde 401.
6. Até 5 capturas de tela por etapa: quadro, comanda impressa, tela de cancelamento.
