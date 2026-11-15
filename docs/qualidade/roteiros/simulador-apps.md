# Roteiro: simulador dos apps de delivery (modo teste) — D-117

Pré-condição: dono ou gerente; produtos com preço; migração `20261114230000_canais_cliente.sql` rodada.

| # | Passo | Resultado esperado | Resultado |
|---|---|---|---|
| 1 | Aplicativos → Delivery Much, Rappi → criar conexão Delivery Much (modo teste) | Conexão aparece com "🧪 modo teste" e o simulador | |
| 2 | Simular → Entrega, Dinheiro, Cupom → Criar pedido fictício | Pedido novo no quadro com o selo Delivery Much, troco e cupom; aviso de 15 min para aceitar | |
| 3 | Aceitar, pronto e saiu no quadro | Fila mostra "simulado" (nada vai para o app) | |
| 4 | Simular outro pedido → "Cliente cancelou" | Pedido cancelado no quadro | |
| 5 | Criar conexão Rappi (teste) → simular "Pago no app", retirada | Pedido no quadro com o selo Rappi, "Pago no Rappi" | |
| 6 | Pedido simulado da Rappi → "Concluído no app" | Pedido concluído | |
| 7 | Aplicativos → 99Food, Keeta, aiqfome → conexão Keeta (teste) → simular | Pedido com o selo Keeta; telefone do app não oferece WhatsApp | |
| 8 | Cancelar um pedido Keeta simulado no quadro | A lista mostra os 11 motivos do padrão | |
| 9 | Trocar uma conexão para Produção sem credenciais no servidor | Opção Produção desabilitada (DM/Rappi) | |
| 10 | Simular com a conexão em produção | Erro: "O simulador só funciona com a conexão em modo teste" | |

Observações: o pedido fictício passa pela mesma tradução do pedido real do app.
