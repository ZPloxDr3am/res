# Roteiro: Estoque e CMV

Pré-condição: loja de teste (ou a sua, em horário sem movimento), usuário dono/gerente, um XML de NF-e de fornecedor. Testar no **celular (app RES)** e no computador.

| # | Passo | Resultado esperado | Resultado |
|---|---|---|---|
| 1 | Estoque → Entrada por NF-e → arrastar o XML | Itens da nota aparecem para vincular/criar/ignorar | |
| 2 | Criar insumos a partir da nota (com fator, ex.: caixa de 12) | Insumos criados com saldo e custo da nota | |
| 3 | Importar a mesma nota de novo | Sistema avisa que a nota já entrou | |
| 4 | Insumos → tocar na linha de um insumo | Abre o Ajustar (Contagem, Entrada, Perda) | |
| 5 | Perda: digitar quantidade e motivo | Mostra "Valor perdido: R$ X" antes de salvar; após salvar, saldo cai | |
| 6 | Contagem: digitar quantidade diferente do saldo | Mostra faltando/sobrando em qtd e R$; após salvar, saldo = contado | |
| 7 | Meu estoque → tocar num produto → Montar ficha | Abre o editor da ficha; custo da ficha e custo/preço calculados | |
| 8 | Sabores, bordas e adicionais → ficha de um sabor | Ficha salva; meio a meio baixa metade | |
| 9 | Fazer um pedido com esse produto e concluir | Insumos baixam conforme a ficha (Movimentações → tipo venda) | |
| 10 | Cancelar esse pedido | Baixa é estornada | |
| 11 | Movimentações → filtrar por insumo e período | Lista e resumo (entradas, vendas, perdas) batem | |
| 12 | Fechamento / CMV do mês | Estoque inicial + compras − final = CMV real; CMV pelas fichas; diferença explicada (perdas, contagens) | |

Observações:
