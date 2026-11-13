# Roteiro — Estoque automático (D-103)

1. **Entrada por NF-e**: importe uma nota de um fornecedor e ligue os itens. Importe depois uma nota de **outro** fornecedor com um produto de mesmo código de barras → o item já vem ligado ("lembrado").
2. **Contagem**: no campo "Bipe o código de barras", bipe (ou digite e Enter) o código de um produto que veio em nota → a lista filtra o insumo e o cursor vai para a quantidade. No celular Android, **📷 Usar a câmera** lê o código.
3. Bipe um código que o sistema não conhece → pede para escolher o insumo; escolhido, o mesmo código passa a abrir esse insumo.
4. **Insumos**: defina "Avisar abaixo de" num insumo com saldo menor que o mínimo.
5. **Compras**: o insumo aparece no grupo do último fornecedor, com "Pedir" sugerido (2× o mínimo menos o saldo). Mude a quantidade, desmarque um item, **Copiar pedido** e **Enviar no WhatsApp** (abre a conversa com o texto).
6. **Compras → Tirar do cardápio o produto que ficou sem insumo**: ligue. Zere (pela contagem) um insumo de um produto com ficha → o produto some do cardápio digital (esgotado). Dê entrada no insumo → o produto volta. Desligue a opção → tudo que estava pausado volta.
