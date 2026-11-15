# Delivery Much e Rappi no RES — D-117

O RES é o **cliente**. A cada 30 s, o agendador chama `/api/marketplace/ifood/sincronizar`, que roda `sincronizarCanaisCliente()` (`apps/web/lib/marketplace/canais-cliente.ts`).

| | Delivery Much | Rappi |
|---|---|---|
| Credencial do integrador | `DELIVERYMUCH_CLIENT_ID` / `_SECRET` | `RAPPI_CLIENT_ID` / `_SECRET` |
| Por loja | e-mail e senha da loja (cofre) + uuid da loja | storeId |
| Pedidos novos | `GET /orders?company.id&status=OPENED&stage=WAITING_COMPANY` → `receive` | `GET …/orders?storeId` |
| Aceitar | `PATCH /orders/{id}/accept` | `PUT …/orders/{id}/take/{min}` |
| Pronto / saiu | `PATCH /orders/{id}/ready` (uma vez) | `POST …/orders/{id}/ready-for-pickup` / — |
| Cancelar pela loja | `PATCH /orders/{id}/cancel` (só antes do aceite) | `PUT …/orders/{id}/reject` |
| Cancelado pelo app | `GET /orders?status=CANCELED` | `GET …/orders/{id}/events` |
| Pausar / reabrir | `PATCH /companies/{id}/offline` · `online` | (para depois) |

Tradução: `packages/core/src/canais-cliente.ts` (`normalizarPedidoDM`, `normalizarPedidoRappi`, `chamadaDM`, `chamadaRappi`).

## Homologação (quando houver conta)
- Delivery Much: ambiente dev `https://api.devmuch.io`. Criar pedidos de teste com `POST /orders/create/fake` (só em dev). Exibir o `code` do pedido (já aparece no card). Pendências: `PATCH /companies/{id}` com `delivery_time` e `pickup_time`.
- Rappi: Order Sandbox em dev (`microservices.dev.rappi.com`). Confirmar o domínio do Brasil e se os valores vêm em centavos.
