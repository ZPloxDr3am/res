# Roteiro: Open Delivery (99Food, Keeta, aiqfome) — D-116

Pré-condição: loja com CNPJ, logo da marca, horários e faixas de km cadastrados; usuário dono ou gerente; migração `20261114220000_open_delivery.sql` rodada.

| # | Passo | Resultado esperado | Resultado |
|---|---|---|---|
| 1 | Aplicativos → 99Food, Keeta, aiqfome → escolher app e cardápio → Criar conexão | Aparece a chave de acesso uma vez e a conexão "aguardando os dados do app" | |
| 2 | `curl -H "X-API-KEY: <chave>" <URL do RES>/merchant` | 200 com o cardápio (id `<cnpj>-<conexão>`, services, categories, itemOffers) | |
| 3 | Mesmo curl com chave errada | 403 | |
| 4 | `curl <URL do RES>/versions/merchant` | `{"version":"1.7.1"}` | |
| 5 | Validar o JSON do passo 2 no validador do sandbox Abrasel | Sem erros | |
| 6 | Preencher URL do app, client id, client secret e id da loja; Salvar | "conectado"; o secret mostra "salvo" e não volta para a tela | |
| 7 | No sandbox, criar um pedido (evento CREATED para a URL do RES /newEvent) | 200 imediato; o pedido aparece no quadro com o selo do app | |
| 8 | Em produção: aceitar, pronto, saiu e concluir no quadro | O sandbox recebe confirm, readyForPickup, dispatch e delivered | |
| 9 | Cancelar um pedido no quadro | A lista mostra os 11 motivos do padrão; o sandbox recebe requestCancellation com o código | |
| 10 | Pausar a loja; depois reabrir | O sandbox recebe merchantUpdate UNAVAILABLE e depois AVAILABLE | |
| 11 | Mudar o preço de um produto | Em cerca de 1 minuto, um único merchantUpdate | |
| 12 | Enviar um evento com X-App-MerchantId de outra loja | 403 | |

Observações: no modo teste nada volta para o app (a fila marca "simulado").
