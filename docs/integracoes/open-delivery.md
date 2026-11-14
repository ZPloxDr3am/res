# Open Delivery 1.7.1 no RES (99Food, Keeta, aiqfome) — D-116

## Como funciona
O RES faz o papel de **servidor** (o padrão chama de *Ordering Application* para o app e *Merchant/Software* para nós).

| Quem chama | O quê | Onde no RES |
|---|---|---|
| App → RES | `GET /merchant` (X-API-KEY) | `app/api/od/[conexao]/v1/[...rota]` → `od_merchant_base` + `montarMerchantOD` |
| App → RES | `POST /newEvent`, `/orderUpdate` | registra (`marketplace_registrar_evento_conexao`) e processa em `after()` |
| RES → App | `GET /v1/orders/{id}` | `lib/marketplace/opendelivery.ts` (`pedidoOD`) |
| RES → App | confirm, preparing, readyForPickup, dispatch, delivered, requestCancellation, accept/denyCancellation, merchantUpdate | fila `marketplace_saida` → `enviarSaidaOD` (chamado pelo agendador em `/api/marketplace/ifood/sincronizar`) |

## O que o app precisa receber da loja
- URL base: `https://res-iqzs.vercel.app/api/od/<id da conexão>/v1`, que aparece em Aplicativos.
- X-API-KEY: gerada na criação da conexão e mostrada **uma vez**.

## O que a loja recebe do app (portal de parceiros)
- URL base da API do app (https). URL do token, quando não for `<base>/oauth/token`.
- client id e client secret. O secret é digitado pela loja e vai direto para o cofre.
- Id da loja no app (merchantId). Quando salvo, eventos de outra loja são recusados.
- Segredo de assinatura do webhook, se o app fornecer. Hoje ele é gravado só pelo servidor; pedir ao time, já que a tela não tem campo para ele.

## Teste no sandbox da Abrasel
Siga `docs/qualidade/roteiros/open-delivery.md`. O validador oficial é o próprio `openapi.yaml` 1.7.1; o Merchant do teste de unidade passa no schema sem erros.

## Pendências
- aiqfome: autorização ID Magalu (authorization_code + callback).
- Keeta: `app_level_token`.
- Campo na tela para o segredo de assinatura.
