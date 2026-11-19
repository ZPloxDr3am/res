# Design System SINO no software (D-120)

Fase 1 a 4 do pedido de 18/11/2026: auditoria, fundação, página Resumo como referência e validação. **Aprovado pelo dono em 19/11/2026**, incluindo as cores de interface C1; a fase 5 (expandir para os outros módulos) está liberada.

Fontes: Brand Book SINO v1.2 (26 p.), pacote SINO-Marca-v1.2 (só pastas 01–09) e o documento de transição para o Design System.

## 1. Auditoria (estado em 18/11/2026)

| Item | Situação encontrada |
|---|---|
| Framework | Next.js 15.5 (App Router, componentes de servidor), React 19, TypeScript. Dados pelo Supabase (RPCs). |
| Estilos | Um CSS global (`apps/web/app/globals.css`, ~2.100 linhas) com variáveis (`--primaria`, `--superficie`, `--borda`…) e classes por tela. Sem Tailwind, sem CSS Modules. |
| Biblioteca de UI | Nenhuma. Ícones em SVG próprio (`nav-painel.tsx`). Gráficos feitos à mão (`grafico-dias.tsx`, `grafico-lojas.tsx`). |
| Fontes | Onest (texto) + Bricolage Grotesque (números/títulos), locais (D-089). |
| Tema | Claro/escuro só pelo sistema (`prefers-color-scheme`), sem escolha do usuário. 20 blocos `@media` de tema no CSS. |
| Navegação | `nav-painel.tsx`: 5 seções (Operação, Vendas, Clientes, Gestão, Ajustes), barra de baixo no celular (4 + "Mais"), menu de ícones no tablet. Seletor de loja e marca no topo do menu. |
| Pontos de reuso | Todas as telas usam as mesmas variáveis: dá para dar a aparência nova a um bloco **redefinindo as variáveis só dentro dele**, sem tocar na lógica. |
| Dependências que não podem quebrar | Rotas (`moduloDaRota`, planos D-085, garçom e entregador redirecionados), `rotaLiberada`, barra do celular (`BARRA`), pedido flutuante (`/pedidos/novo` abre por cima), impressão (`@media print` esconde o menu), painel da empresa (`.painel-empresa` usa o mesmo `.menu`). |

### Problemas da tela Resumo (captura de 18/11, tema escuro, 1366 px)

1. **Contexto contraditório**: o menu mostra a loja em uso (ex.: LA PIZZA) e o Resumo mostra "todas as 3 lojas". O cartão "Boa tarde" (pendências e "18 insumos abaixo do mínimo") é **só da loja em uso**, mas aparece no meio dos números consolidados sem dizer isso.
2. **Hierarquia**: os quatro indicadores têm o mesmo peso e aparecem **depois** do cartão de saudação e da meta. Quem abre a tela vê alertas antes dos números.
3. **Filtros**: o seletor de loja e as datas estavam no mesmo formulário com `p=personalizado`. Trocar só a loja virava "período escolhido" e o atalho (Hoje, 7 dias…) perdia o destaque. O título não dizia qual atalho estava ativo nem com o que se comparava.
4. **Densidade**: cartões de indicador altos, com texto de ajuda tracejado; muito espaço vazio no gráfico de colunas quando os valores são zero.
5. **Variação só por cor e seta de texto** (▲/=), sem texto para leitor de tela.
6. **Menu**: "Estoque / CMV" em Operação, "Resumo" em Operação, "Relatórios" em Vendas: não segue as famílias da marca. Item ativo marcado com verde (cor da marca antiga).
7. **Tipografia**: duas famílias e números em fonte de título (Bricolage); o Brand Book pede Inter em toda a interface, com números tabulares.

## 2. Proposta e o que foi feito

### Camadas de cor (`apps/web/app/sino.css`)
1. **Marca (aprovada)**: tomate `#F0532B`, tomate texto `#C43B17`, carvão `#1C1A1F`, creme `#FFF7EF`, branco.
2. **Interface (C1, EM AVALIAÇÃO)**: Carvão 900–100, Sucesso `#1E7A4C`, Atenção `#9A6200`, Erro `#B42318`, Informação `#2456C9`. Todos num bloco só: aprovar C1 não muda nada; trocar C1 é editar só esse bloco.
   - **C1-escuro** (proposta desta fase, C1 não define o tema escuro): `#55C98F`, `#E8A33A`, `#FF8C8C`, `#8DB0FF` e neutros `#141216`, `#242128`, `#2C2830`, `#A69DAB`. Todos ≥ 6,5 : 1 sobre o carvão.
   - **C1 aprovado pelo dono em 19/11/2026**, com as variantes escuras.
3. **Semânticos `--s-*`**: o que os componentes usam (fundo, superfície, borda, texto 1–3, link, ação, destaque, foco, estados, menu).

Regras aplicadas:
- **Tomate é identidade, não fundo de tela**: marcador do item ativo, sublinhado do atalho de período, foco, filete do indicador principal, ponto "hoje" da meta.
- **Botão principal**: carvão com texto creme no claro (16,3 : 1). Tomate com texto carvão no escuro (4,9 : 1). Nunca branco sobre tomate em texto pequeno (3,5 : 1).
- **Links no claro**: tomate texto (5,3 : 1). **Erro** é o vermelho de estado, nunca o tomate, e sempre com ícone e texto.
- **Variação**: seta desenhada + valor + texto oculto "alta de/queda de"; a cor só reforça.

### Tipografia
- **Inter** em toda a interface (14 px base, escala do Brand Book 12 · 14 · 16 · 20 · 24 · 32, pesos 400/500/600, números tabulares).
- **Outfit** fica carregável (`--fonte-outfit`) só para telas de marca. Nenhuma fonte é pré-carregada no cardápio do cliente.

### Espaço, raios e densidade
- Espaço em base 4 px: 4 · 8 · 12 · 16 · 24 · 32 · 48.
- Raios 6 (itens de menu, células) · 10 (controles) · 16 (cartões).
- Controles de 36–40 px na gestão; `--s-controle-toque: 48px` reservado para PDV, KDS e garçom (próximas fases).

### Tema claro e escuro
- `html[data-tema="claro" | "escuro"]`; sem atributo, segue o sistema.
- Escolha no rodapé do menu (Auto · Claro · Escuro), guardada no aparelho. Um script no layout raiz aplica a escolha antes de pintar, sem piscar.
- Nenhuma dependência nova.
- **O tema escolhido vale para todas as telas.** Os 20 blocos `@media (prefers-color-scheme: dark)` do `globals.css` passaram a obedecer à escolha (`:where(...)`, sem mudar a especificidade de nenhuma regra). O conteúdo de cada bloco é o mesmo de antes; quando o escuro é escolhido, ele se repete logo depois do bloco.

### Menu (todas as telas do painel do restaurante)
- Fundo carvão nos dois temas, logotipo principal **oficial** (`public/marca/`, arquivos da pasta 01, sem alteração). No tablet aparece o símbolo oficial de 32 px.
- **"Loja em uso"** escrito acima do seletor.
- **Famílias da marca**:

| Operação | Gestão | Inteligência | Configurações |
|---|---|---|---|
| Pedidos | Cardápio | Resumo | Aplicativos |
| Novo pedido | Estoque / CMV | Relatórios | Impressoras |
| Salão | Financeiro | Clientes | Lojas e equipe |
| Cozinha (KDS) | Gestão Empresarial | Fidelidade | Assinatura |
| Caixa | Promoções | Turbo-Vendas | |
| Entregas | Delivery | Avaliações | |
| | Evento / Aniversário | | |

- **Só a ordem e o agrupamento mudaram**: mesmas rotas, ícones (Relatórios ganhou ícone próprio), permissões, cadeado de plano e barra do celular.
- Ativo = peso 600 + marcador tomate + fundo (nunca só cor). O título da família ativa clareia.
- Abaixo de 24 px, módulos só pelo nome (regra do Brand Book): os símbolos de módulo não entram no menu.

### Favicon
Oficial (pasta 07), **só no painel**. O cardápio do cliente é da loja e não ganha o ícone SINO.

### Página Resumo (referência)
Mesmas RPCs, mesmos cálculos, mesmos componentes de gráfico e meta. Mudou só a apresentação:
1. **Cabeçalho**: família (Inteligência), título, período **com o atalho ativo**, datas e "comparado com…". Ao lado, a **etiqueta de contexto**: "Consolidado · 3 lojas" ou o nome da loja, e a hora da atualização.
2. **Filtros** num painel só: atalhos de período, datas com "Ver período" (mantém a loja filtrada) e **seletor de lojas que troca na hora** sem perder o período.
3. **Indicadores primeiro**: Faturamento maior e com filete tomate; Pedidos, Ticket médio e Cancelados ao lado.
4. **Atenção do dia ao lado da meta**, com a legenda "Para hoje na loja em uso · LA PIZZA (o resto da tela soma as lojas do filtro)".
5. Composição, desempenho por loja e faturamento por dia lado a lado; tabela compacta com cabeçalho de linha, números à direita e barra de participação neutra.
6. Estados: sem acesso (vazio explicado) e período inválido (alerta com ícone, mostrando hoje).

### Ajuste de 18/11 (pedido do dono)
- **Cores e fonte em todo o painel**: todas as telas do painel do restaurante, mais login, cadastro, boas-vindas e erro, usam a paleta e a fonte SINO, redefinindo as variáveis antigas (`--primaria`, `--superficie`…) em `body:has(.s-menu)` e `.s-tela`. A estrutura de cada tela não mudou: o redesenho por módulo continua sendo a fase 5. Onde a cor antiga significava "deu certo" (variação boa, selo ok, conexão restabelecida), entra a cor de sucesso.
- **Carregamento**: símbolo oficial de 48 px, na versão do tema, com a barra tomate.
- **Nome**: "RES" vira "SINO" nos textos do painel, login, cadastro e erro, e no título da aba do painel.
- **Ficam como estão**, por serem contratos ou exigirem nova versão:
  - documentos jurídicos (termos e privacidade);
  - nomes dos apps instalados (RES Motoboy, RES Impressão / .exe);
  - cabeçalhos `X-RES-*` da API e o prefixo do Pix;
  - cardápio do cliente e painel da empresa.

## 3. Riscos e como foram tratados

| Risco | Tratamento |
|---|---|
| Quebrar telas antigas | Estrutura nova só em `.s-menu` e `.s-pagina`. Nas outras telas, só as variáveis de cor e fonte mudam. No `globals.css`, só os seletores dos blocos de tema escuro, por script, sem mudar o conteúdo nem a especificidade. |
| Painel da empresa (equipe SINO) | Usa outro layout: o menu dele não ganha `s-menu`. |
| Impressão | O menu continua escondido no `@media print`. |
| Celular e tablet | Mesma estrutura (barra de baixo, menu de ícones); só cores e alvos de 48 px na barra. |
| Peso da página | +48 KB (Inter woff2), só no painel, sem pré-carregar. |
| C1 em produção antes de aprovar | Aprovado em 19/11/2026, antes do merge. |

**Reversão**: o trabalho está num branch e num PR só (`func/121-design-system-sino`). Reverter o PR volta tudo, e não há migração de banco.

## 4. Validação (fase 4)

Automatizado:
- [x] typecheck.
- [x] build (`/resumo` com 6,95 kB).
- [x] testes de regra (core) e do banco: nada de lógica mudou.
- [x] Contraste de cada par de cor calculado (WCAG 2.2, fórmula de luminância): texto ≥ 4,5 : 1 e bordas de campo ≥ 3 : 1 nos dois temas.

Na prévia, com dados reais:
- [ ] Antes × depois a 1366 px, nos temas escuro e claro.
- [ ] Tablet (768 px) e celular (375 px).
- [ ] Navegação só por teclado (foco visível em tomate).
- [ ] Leitor de tela (variação lida como "alta de 12%").

Não testado aqui: leitor de tela real (NVDA/VoiceOver), aparelhos reais, navegadores Safari/Firefox reais e o favicon em abas reais. Ficam na lista de verificação do Brand Book.

## 5. Fase 5 (depois da aprovação)
Ordem sugerida, pelo uso no pico:
1. Pedidos (quadro) e Novo pedido: densidade de toque, estados de pedido novo/atrasado/cancelado.
2. Caixa.
3. Cozinha (KDS): tema padrão a decidir no piloto.
4. Financeiro e Estoque: tabelas compactas.
5. Configurações.

Em cada tela: trocar a classe da raiz para `s-pagina`, os componentes para os `s-*` e tirar o CSS antigo que ficar sem uso. Também fica para a fase 5 trocar o nome "RES" que ainda aparece no título da aba, no login, no cupom, nas mensagens e nos e-mails, e decidir o domínio.
