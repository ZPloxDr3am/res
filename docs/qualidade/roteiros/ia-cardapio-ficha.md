# Roteiro — IA no cardápio e na ficha técnica (D-107)

Pré-requisito: `ANTHROPIC_API_KEY` na Vercel (com crédito ou no plano de avaliação).

## Cardápio
1. **Cardápio → ✨ Importar com IA → Fotos ou PDF**: mande 1–2 fotos de um cardápio impresso → "A IA está lendo…" → lista por categoria com nome, descrição e preço.
2. Produto com nome igual a um já cadastrado vem desmarcado com "Já existe".
3. Corrija um preço para "abc" → fica vermelho e o botão Criar trava. Corrija.
4. **Criar no cardápio** → mensagem com quantos produtos; os produtos aparecem na categoria de mesmo nome (ou numa nova), em todas as marcas.
5. **Link**: cole o site de um restaurante com cardápio em HTML → lê. Link do iFood → aviso para mandar prints. `http://localhost` ou IP interno → "Link não permitido".
6. Foto grande do celular (8 MB) → é reduzida e lida normalmente.
7. Sem a chave na Vercel → "A inteligência artificial ainda não foi ligada…". Sem crédito → aviso de crédito.
8. 21ª leitura no mesmo dia → "Limite de uso da IA de hoje".

## Ficha técnica
1. **Estoque → ficha de um produto (ex.: X-Burger) → ✨ Sugerir com IA** → linhas preenchidas com insumos da loja e quantidades na unidade do insumo; mensagem "confira as quantidades e salve" e, se houver, "Sem cadastro na loja: …".
2. Sabor de pizza → quantidades para a pizza inteira.
3. Nada é salvo até clicar em **Salvar ficha**.
