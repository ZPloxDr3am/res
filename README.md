# RES

> **Documentação e método de trabalho:** [`docs/README.md`](docs/README.md) — áreas **Comercial**, **Desenvolvimento** (comece por [`METODO.md`](docs/desenvolvimento/METODO.md) e [`COMECE-AQUI.md`](docs/desenvolvimento/COMECE-AQUI.md)) e **Qualidade/testes**.

Sistema de pedidos para restaurantes, com delivery, salão e gestão. Começou como a **etapa 1 do piloto**:

- uma loja com várias marcas
- usuários e permissões
- cardápio completo: setores, produtos, grupos de opções e frações de pizza
- testes que conferem as regras aprendidas no estudo do BeeFood

Hoje o piloto já cobre delivery, cardápio digital, entregas, fidelidade, estoque, financeiro, relatórios, iFood (modo teste), cadastro por convite, planos e cobrança (ver "O que já funciona"). **Atualizado em 10/11/2026**, até D-095.

## Estrutura

| Pasta | O que tem |
|---|---|
| `packages/core` | Regras de negócio em TypeScript puro: preço, grupos, setores, permissões, agendamento, caixa, catálogo de impressoras, montagem do cupom e ordem da rota de entregas. Tem testes. |
| `packages/agente` | **RES Impressão**: programa do Windows (`.exe` único) que imprime os cupons da fila direto na térmica (ESC/POS, com QR nativo) e se atualiza sozinho. |
| `supabase/migrations` | Banco Postgres com isolamento por loja (RLS), auditoria e operações atômicas (0001 a 0068 e, desde 06/11, com data e hora no nome: `AAAAMMDDHHMMSS_assunto.sql`) |
| `supabase/tests` | Testes do banco: regras de paridade (T-xxx), edição do cardápio e pedidos, incluindo a paridade de preço com o core |
| `apps/web` | Painel em Next.js com login, cadastro da loja e todas as telas; cardápio público em `/c/<endereço>`; app do motoboy em `/m` |
| `apps-mobile/motoboy` | App Android **RES Motoboy** (Capacitor) que abre o `/m`; o workflow `motoboy-app.yml` gera o `RES-Motoboy.apk` na release `motoboy-latest` |
| `apps-mobile/painel` | App Android **RES** (gestão, Capacitor) que abre o painel; o workflow `painel-app.yml` gera o `RES.apk` na release `gestao-latest` (D-069) |
| `scripts` | `beefood_para_res.py` (converte o cardápio público do BeeFood) e `conferir_importacao.py` (confere item a item) |
| `e2e` | **Robô** (Playwright): pedido de ponta a ponta na Loja Robô a cada publicação (D-095) |
| `docs/decisoes.md` | Decisões de projeto D-001 a D-095 |

## Rodar os testes

```bash
npm install
npm test               # regras (core) e agente de impressão
npm run test:db        # banco: sobe um Postgres temporário (precisa do PostgreSQL 16 instalado)
```

O GitHub Actions roda os três conjuntos a cada push: regras, banco e build do app. O workflow `agente.yml` gera o `RES-Impressao.exe` e publica na release `agente-latest` (com `versao.txt`) sempre que o agente ou o core mudam na `main`.

## Colocar no ar

1. Crie um projeto em [supabase.com](https://supabase.com), na região São Paulo.
2. Aplique as migrações:
   ```bash
   npx supabase link --project-ref SEU_REF
   npx supabase db push
   ```
3. No Supabase, em Authentication → URL Configuration, informe a URL do site.
4. Copie `apps/web/.env.example` para `apps/web/.env.local` e preencha a URL e a chave *anon* do projeto.
5. Para rodar localmente, use `npm run dev`. Para publicar, importe o repositório na Vercel com *Root Directory* `apps/web` e as mesmas duas variáveis.

A chave *service_role* nunca vai para o navegador (D-008). Ela só existe no servidor, na variável `SUPABASE_SERVICE_ROLE_KEY` da Vercel (tipo Secret, já configurada no piloto), para criar usuários com senha (caixa, motoboy, funcionários) e trocar a senha deles (D-012). Fora isso, toda escrita passa pela RLS com o usuário logado. O agente de impressão usa só a chave pública + um token próprio, guardado em hash no banco (D-015).

No piloto, as migrações são aplicadas à mão no **SQL Editor** do Supabase (colar o arquivo e clicar Run), na ordem. O repositório vai **até a 0068** (`relatorio_operacao`). Registro de aplicação: 0017–0019 em 23/10/2026; 0020–0025 em 24/10; 0026–0033 em 27/10; 0034–0042 em 28/10. **0043 a 0068 (28/10 a 01/11) ainda não têm registro aqui: confirmar no Supabase** — as telas dessas decisões só funcionam com elas rodadas. A partir da 0031 as migrações podem rodar de novo sem erro, e as próximas devem seguir esse cuidado (o Run às vezes é clicado duas vezes). Se o Supabase mostrar "JWT failed verification", a sessão expirou: entrar de novo e repetir o Run.

| Migrações | O que trazem |
|---|---|
| 0043–0044 | Pix mais seguro e Pix no balcão |
| 0045–0047 | Vitrine do cardápio digital, sabores da LA PIZZA, taxa por km |
| 0048–0051 | Importar cardápio do BeeFood; LA PIZZA, HAMBURGUERIA POMERODE e PIZZARIA POMERODE importadas |
| 0052–0055 | Gestão Empresarial, funções da equipe, ficha ligada ao acesso, custos do grupo |
| 0056–0057 | Cardápio de evento e pré-venda |
| 0058–0060 | Histórico do cliente, avisos ao cliente, pausa da loja |
| 0061–0062 | Financeiro (por loja ou do grupo) |
| 0063–0064 | Modo movimento, "pronto" automático na retirada |
| 0065–0068 | Meta de vendas, relatórios, cupom por área/produto + frete grátis, aba Operação |

## O que já funciona

| Área | Telas |
|---|---|
| Base | Login, cadastro da loja e marcas, permissões por grupo, histórico de alterações no banco. **Visual (PR #35–#36, D-034)**: fonte Onest, verde-manjericão sobre fundo frio, menu agrupado (Operação, Vendas, Clientes, Gestão, Ajustes), campos/botões/abas/tabelas num padrão só, foco visível, quadro com faixa de cor por etapa |
| Celular (D-069–D-070) | **Painel adaptado ao celular**: barra de baixo com Pedidos, Novo pedido, Estoque, Resumo e **Mais** (todas as telas em blocos coloridos por seção, troca de loja, Sair); botões e filtros do quadro numa linha que rola de lado; tabelas rolam dentro do cartão; campos de 16px. **App Android RES** (gestão) que abre o painel com login guardado e câmera; atualiza sozinho com o site |
| Equipe (D-051–D-054) | **Lojas e equipe** em três abas: Lojas e cardápios, **Equipe** (pessoas por função: Dono, Gerente, Caixa / Atendente, Motoboy; trocar senha, mudar função, tirar/devolver acesso, convites) e **Funções e permissões** (quadro por função e ajuste do que o Caixa / Atendente pode). **Adicionar pessoa** em passos: função → como entra (usuário e senha ou convite) → ficha do funcionário → **cartão de acesso** para imprimir/WhatsApp. Regras no banco: só o dono cria ou tira gerente; ninguém muda a própria função. Garçom "em breve" |
| Cardápio | **Cards com foto grande** (arrastar a foto em cima do card; foto do celular é reduzida sozinha), "À venda / Pausado", categorias em botões no topo, menu ⋯ (canais, ordem, duplicar, excluir). Editor do produto: foto, básico, **Promoção De/Por** com dias/horário/data de fim, escolhas e preço por canal (opcional). **Combos com escolhas** (passos por produtos ou categoria, preço, economia; comanda em blocos). **Categoria de up-sell** ("Peça também" / "Ofereça também"). Aba **Grupos de opções** como biblioteca. Duplicar produto, categoria e grupo. Simulador de preço. **Foto, ingredientes e selo** (⭐ Recomendado, ✨ Novo) em cada opção. **LA PIZZA**: cada tamanho exige **exatamente** seus sabores (Broto 1, Média 2, Grande 3, Gigante 4); meio a meio = repetir sabor (D-046) |
| Importar do BeeFood (D-049) | Lê só o cardápio público do BeeFood e grava numa marca: o que existia fica pausado, rodar de novo atualiza sem duplicar, fichas técnicas de mesmo nome são copiadas, cada escolha soma o valor cheio. **As 3 marcas do piloto importadas** (LA PIZZA 37 produtos/584 opções; HAMBURGUERIA POMERODE 34/3; PIZZARIA POMERODE 38/729), conferidas com 0 diferenças |
| Pedidos | Quadro em tempo real (Novo → Em preparo → Pronto → Saiu → Concluído) com alerta sonoro e aceite automático. **Novo pedido em janela flutuante** com fotos, montagem de pizza, taxa do bairro sozinha e agendamento. Faixa **Agendados**. Botões 🖨 Cozinha / Via do pedido, "Cobrar na entrega" / **Marcar como pago**, "🛵 Saiu com <motoboy>". Preço recalculado no banco. **Filtros rápidos com contador** (loja/marca, tipo, canal, ⚠️ atrasados, 🛵 prontos sem motoboy, 💰 a cobrar, ⏳ aguardando Pix, 🌱 1º pedido), lembrados no aparelho. **Selo do cliente** no cartão ("🌱 1º pedido", "5º pedido · 💎 Fiéis", "voltou após 45 dias"). **💬 Avisar cliente** (WhatsApp com mensagem pronta da etapa + link de acompanhamento, também para balcão/telefone) e **📣 Avisar clientes (N)** em fila, com "✓ Avisado" gravado no pedido. **⏸ Pausar loja** 15–90 min com recado, reabre sozinha. **🔥 Modo movimento** (+10/+20/+30/+45 min por 1 h, 2 h ou até desligar; cardápio mostra "Alta demanda"; pedidos guardam o próprio prazo). **Retirada pronta sozinha** ao fim do preparo (pg_cron) (D-057–D-063) |
| Cardápio digital (D-045–D-048) | Link e QR por marca (`/c/<endereço>`), sem login, acompanhamento por código secreto. **Vitrine**: capa, logo, "Aberto até 01:30 / Fechado · abre às 18:00", **Mais informações** em abas (Sobre, Horário, Pagamento, Entrega), seletor de categoria e busca fixos, grade de 2 colunas, "Serve N pessoas" e selos, rodapé com CNPJ, **cor da marca**, link por produto (`?produto=<id>`). **Montagem**: contador X/Y, OBRIGATÓRIO, 🔍 busca, +/− por sabor, ingredientes, "🔥 Mais pedido" automático, passa sozinho para o próximo grupo, aviso em vermelho se incompleto. **Sacola** com ✏️ editar. **Checkout começa pelo WhatsApp**; barra **Cardápio · Pedidos · Perfil** (pedidos e dados deste aparelho). Horários (inclusive depois da meia-noite), bairros com taxa e **faixas de km** para "Outro bairro" (com tempo adicional), pedido mínimo, formas de pagamento, limite contra pedidos repetidos, **pedido agendado**. Configurado na tela **Delivery** |
| Evento / Aniversário (D-055–D-056) | **Cardápio bônus** por loja (fora do limite do pacote) com link/QR e período próprios; produtos viram **cópias** editáveis (nome, preço, sabores, opções) sem mexer no cardápio principal. **Pré-venda**: dia/hora da entrega ou retirada, só Pix, cada pedido entra agendado para a data |
| Multilojas | Conta do cliente → lojas → marcas/cardápios, com limites do pacote garantidos no banco. Seletor de loja no menu; nova loja, novo cardápio, convites por e-mail com acesso só àquela loja; quadro com "ver todas as lojas"; nova loja com cópia do cardápio de outra, **Importar de outra loja**; horários replicáveis para o grupo |
| Caixa | Caixas da loja e quem opera cada um. Usuário de caixa com **usuário e senha** (sem e-mail); login aceita usuário ou e-mail. Abrir com troco contado por cédula, sangria e suprimento, pedidos concluídos entram sozinhos, **fechamento cego** com sobra/falta por forma e relatório para imprimir. Testado no ar em 21/10/2026 |
| Impressoras | Catálogo de 23 modelos homologados (ACBr) + genéricas. Regras da cozinha por canal, por categoria ou por produto; marketplace "só sem vínculo"; via do pedido com troco. Layout do cupom por marca com prévia. Fila com histórico e reimpressão. **Impressora do grupo**. **RES Impressão** (agente do Windows): pareia por código, USB RAW ou rede 9100, abre com o Windows, se atualiza sozinho a partir da 1.1.0. Testado no ar em 21/10/2026 na Epson TM-T20X-II. Sem agente, imprime pelo navegador |
| Motoboy | App `/m` (função **Entregador**, atende as lojas do grupo). Comanda com **QR** + COBRAR R$ X / PAGO; ler o QR despacha. Endereço grande, Google Maps/Waze, ligar/WhatsApp, Entregue (entra no caixa), resumo do dia. **App Android RES Motoboy**. **Rota sugerida** (D-027) com chegada prevista, refeita a cada 4 min |
| Entregas | **Ao vivo**: mapa com motoboys em rota em tempo real (D-026). **Bairros e preços** por loja (taxa, valor do motoboy, km, copiar entre lojas) e **faixas de km** (D-048). **Fechamento dos motoboys** (05:00→05:00) (D-020). **Prazo por loja** (padrão 35 min), selos laranja/vermelho, **Sugestão de saída**, aba **Tempos e atrasos** (D-028) |
| Cliente acompanha (D-028) | Página do pedido: previsão, "<motoboy> saiu… chega por volta das HH:MM", mapa com o motoboy só quando o pedido é a próxima parada. O link agora vai também para pedidos do balcão/telefone pelo **Avisar cliente** |
| Promoções | Produtos em promoção, **% numa categoria**, **cupons** (% / R$ / entrega grátis; mínimo, primeira compra, limites, dias, validade; criar nas outras lojas) com quem usou e desconto dado; **desconto no balcão** com limite e senha do gerente (D-021–D-023). **Cupom por bairro, até X km e por produto** (desconto só sobre o produto, ex.: REFRI50). **Frete grátis automático** (a partir de R$ X, bairros, km, produtos, dias, validade) com "Faltam R$ X para a entrega grátis" no cardápio; o motoboy recebe normalmente (D-066) |
| Clientes | Cadastro do grupo, um por telefone (sempre com o 9), salvo a cada pedido; sugestões no novo pedido com histórico e observações (D-025, D-030). **Segmentos** RFV em abas com ação sugerida e **Exportar CSV** para SMS e públicos de anúncios (D-029). Histórico por telefone em todas as lojas para o selo do quadro (D-057) |
| Fidelidade (D-031–D-033) | Menu **Fidelidade · <loja>**, tudo separado por loja. Cashback (%, saldo mínimo, teto, prazo) e pontos (por R$, por taxa, bônus no 1º pedido), recompensas, "Copiar estas regras para". Ganho na hora em que o pedido é concluído; estorno ao cancelar. Uso no balcão e no cardápio digital. Saldos com extrato e ajuste. **Resultados** com ROI |
| Estoque (D-036–D-040, D-071–D-072) | **Meu estoque** com ficha técnica e custo/preço, **Levar para as outras lojas**; ficha **por sabor** (meio a meio baixa metade). **Insumos** com custo médio e histórico — tocar na linha abre **Ajustar**; **Perda** mostra o valor perdido antes de salvar. **Contagem** com diferença em qtd e R$. **Entrada por NF-e** (XML, fator, vínculo lembrado por fornecedor, sem duplicar). **Movimentações** com filtros e Excel. **Fechamento / CMV** real × fichas. Baixa ao concluir e estorno ao cancelar. Estoque separado ou do grupo |
| Gestão Empresarial (D-050, D-052–D-054) | Só dono e gerente (LGPD). **Custos fixos e variáveis** com modelo de 25 linhas, margem e **ponto de equilíbrio**; **cada loja separada** ou **o grupo todo** (com aba Soma do grupo). **Funcionários** (CPF, RG, CTPS, PIS…) com **Acesso ao RES** criado na própria ficha; desligar oferece tirar o acesso. **Faltas** e **advertências** numeradas com documento A4 em duas vias. **Dados da empresa** |
| Financeiro (D-060–D-061) | **Gestão → Financeiro**: Visão do mês, Contas a pagar e receber, Fluxo de caixa (30 dias, avisa o dia em que fica negativo), **DRE** mês a mês (Excel) e Cadastros. Não digita duas vezes: **custos fixos** viram contas a pagar (inclusive automático todo mês), **NF-e** do estoque vira conta em um clique, **vendas e taxas** entram sozinhas, **custo das vendas = CMV real** do estoque. Lançamento único, parcelado ou recorrente; "✓ Paguei". 37 categorias ligadas ao DRE. Por loja ou do grupo, como a Gestão Empresarial |
| Aplicativos (D-042–D-044) | **Ajustes → Aplicativos**: **Pix no cardápio** (QR estático), **Mercado Pago** (Pix dinâmico, confirmação automática, aceite automático ao pagar, não pago cancela em 40 min), **Pixels** (Meta, GA4, Google Ads, GTM com aceite de cookies), **Avaliação no Google**, **Link único do grupo** (`/g/<link>`), **API aberta** (`/api/v1/…`), **webhooks** assinados e **MCP** (`/api/mcp/<chave>`) |
| Resumo | Hoje, ontem, 7 ou 30 dias, mês ou datas; todas as lojas ou uma. Indicadores com frase explicativa, composição das vendas, desempenho por loja, faturamento por dia, tabela por loja. **🎯 Meta do mês** por loja com projeção pelo peso de cada dia da semana (8 semanas), "onde deveria estar hoje", quanto vender por dia e comparação com o mês anterior (D-064) |
| iFood (D-074–D-075) | Pedido do iFood entra no quadro (webhook + busca de reserva), ida e volta de status, cupom dividido loja × iFood, cupom impresso com dados do app, **Plataforma de Negociação** com faixa no quadro. **Modo teste com simulador** enquanto não há conta/homologação |
| Cadastro e conta (D-076–D-077, D-082) | **Cadastro por convite** (`/cadastro?convite=…`) em 3 passos: responsável, empresa (CNPJ preenche pela Receita, CEP preenche o endereço) e restaurante (com cardápio de exemplo). **Primeiros passos** até abrir o cardápio. **Teste grátis** com prazo; vencido, novos pedidos pausam. CPF do dono só para o dono (D-088) |
| Planos e cobrança (D-085, D-090) | Planos por operação e por conta: **Delivery 149,90 · Salão 149,90 · Completo 239,90** (1 loja + 1 cardápio), loja/cardápio extra 49,90, adicionais por conta, App Entregador/Garçom grátis no plano (5) e extra por unidade, **anual −20%**. Telas fora do plano com cadeado. **Ajustes → Assinatura**: plano, ciclo, adicionais, aparelhos, fatura com Pix (Mercado Pago do RES, ou manual) |
| Painel da empresa (D-083–D-084) | Endereço próprio (`res-empresa.vercel.app`), só a equipe RES: Visão geral, Restaurantes (situação, plano e módulos por cliente), **Cobrança**, **Planos e preços**, Convites, **Erros** (registro de erros do app) e Configurações |
| Quadro (D-078–D-081, D-086–D-093) | Kanban compacto, **todas as lojas** salvo por usuário, resumo no topo (ativos, preparo e entrega médios, passando do prazo), **arrastar o cartão** entre colunas, encerrados das últimas 12 h, aviso de **sem conexão**. Cardápio fechado aceita **agendar para quando abrir**. Organizar cardápio com arrastar (D-094) |
| LGPD (D-088, D-092) | Exportar e apagar os dados de um cliente (dono/gerente), apagado sozinho após 24 meses sem pedido |
| Relatórios (D-065, D-067–D-068) | **Vendas → Relatórios**, período e loja: **Operação** (valores, frete grátis e cupons concedidos, **tempos médios** com selo bom/atenção/demorado, % no prazo, **horário de pico** dia × hora, canais, formas de pagamento, novos × recorrentes, bairros, **por pessoa** e **motoboys**); **Curva ABC** de produtos, sabores (meia = 0,5) e bordas/adicionais (Excel); **Cancelamentos** por motivo, etapa, canal e quem cancelou; **Calendário do mês**. Cores por significado (verde bom, laranja concedido, vermelho perda) |

## Mapa do código (graphify)

A pedido do dono (28/10), todo trabalho no projeto parte do mapa do **graphify**, versionado em `graphify-out/` (graph.json, GRAPH_REPORT.md).
- Regras e instalação numa sessão nova estão no `CLAUDE.md` do repositório.
- Instalação: `uv tool install "graphifyy[sql]"`. O acesso ao PyPI foi liberado em Configurações → Recursos → "Permitir acesso de rede externo".
- Consultas: `graphify query/path/explain`.
- Depois de mudar código: `graphify update .`. O hook de commit atualiza só o código.
- Ponto cego: chamadas `supabase.rpc('x')` não ligam às funções SQL. Procure em `supabase/migrations`, na versão mais recente da função.

## Próximas etapas

| Etapa | Situação | O que falta |
|---|---|---|
| 3c Pagamento online | Pix automático (Mercado Pago, D-044) e Pix no balcão entraram | Cartão online (pedido só entra no quadro depois de pago); segurar pedidos Pix até pagar quando o aceite automático geral está ligado |
| 4 Operar | Caixa, impressão, agente, impressora do grupo, modo movimento, pausa, retirada pronta sozinha entraram | **KDS** (adiado pelo dono em 27/10); acréscimos e taxa de serviço no pedido |
| 5 Entregar e avisar | App do motoboy, km/fechamento, rastreio ao vivo, rota sugerida, prazos, faixas de km e "Avisar cliente" manual (com link de acompanhamento para balcão/telefone) entraram | **WhatsApp oficial** (envio automático; cadastro na Meta); comissão do motoboy em **% da taxa ou do pedido**; somar o tempo adicional da faixa de km ao prazo do quadro |
| 6 Reter | Clientes, cupons (agora por área/produto), frete grátis automático, segmentos, cashback e pontos entraram | Consentimento de marketing (LGPD) e descadastro; campanhas de SMS (provedor a contratar); públicos ao Meta/Google Ads por OAuth (tokens só no servidor); login do cliente por código no WhatsApp |
| 7 Salão e gestão | Estoque, CMV, Gestão Empresarial, Financeiro/DRE entraram | **Salão** (mesas, comandas, PDV, garçom — e os relatórios de garçom/mesas/couvert), **Fiado** com limite de crédito, receitas/produção do estoque, **fiscal** (NFC-e; SEFAZ com certificado A1) |
| Quadro (lista do estudo) | Itens 1–5 de `delivery-o-que-falta.md` entraram | Linha do tempo do pedido; atalhos F1 / Ctrl+K; Kanban ou Lista; tema escuro; arrastar pedido até o motoboy |
| Antes de vender (análise de 08/11) | Cadastro por convite, teste grátis, cobrança, registro de erros e LGPD entraram | **Vercel Pro e Supabase Pro**, **NFC-e**, Termos e Privacidade com CNPJ, repositório privado, WhatsApp do suporte (`NEXT_PUBLIC_SUPORTE_WHATSAPP`), token `MP_RES_ACCESS_TOKEN` para o Pix da mensalidade |
| Integrações | iFood em modo teste (D-074–D-075) | **iFood**: conta de parceiro e homologação. Outros marketplaces (99Food, Keeta, Rappi, Aiqfome), entregador sob demanda (Uber Direct, 99 Entrega), TEF. Combos com passos no cardápio de evento |

## RES Impressão (agente) — instalar num computador da loja

1. Painel → Impressoras → **Conectar computador** (gera código de 10 min, uso único).
2. No computador da impressora: baixar `RES-Impressao.exe` (release `agente-latest` no GitHub), abrir (SmartScreen: "Mais informações → Executar assim mesmo") e digitar o código.
3. No painel, editar a impressora → Ligação USB → escolher a impressora do Windows na lista. Ela fica **● Online**.
4. Fechar o BeeImpressão/BeeFood 3.0 nesse computador para não disputarem a impressora.

Registro do agente: `%APPDATA%\RES Impressao\agente.log`. Para trocar de loja: `RES-Impressao.exe --desconectar`. Versão atual publicada: **1.3.0** (combo em blocos, endereço por extenso na via da cozinha). O computador do escritório ainda estava na 1.0.0 em 23/10 — precisa baixar de novo uma vez (a 1.0.0 não se atualiza sozinha).

## Apps Android

**RES (gestão)** — painel no celular: https://github.com/ZPloxDr3am/res/releases/download/gestao-latest/RES.apk (D-069). Assina com a mesma chave do app do motoboy; como só abre o site, quase nunca precisa de APK novo.

**RES Motoboy** — colocar para rodar:

1. Lojas e equipe → **Equipe → Adicionar pessoa** → função **Motoboy** (usuário e senha; sai o cartão de acesso com o link do app).
2. Delivery (cada loja) → preencher a **cidade**.
3. Android: abrir https://github.com/ZPloxDr3am/res/releases/download/motoboy-latest/RES-Motoboy.apk no celular, permitir "instalar apps desconhecidos", instalar o **RES Motoboy**, entrar com o usuário e aceitar a localização ("o tempo todo") — o GPS segue com a tela desligada enquanto há entrega. APK de 27/10 tem o rastreio: quem tinha o antigo precisa desinstalar antes. iPhone: `res-iqzs.vercel.app/login` no Safari → Compartilhar → "Adicionar à Tela de Início"; a rota só vai com a tela aberta (app iOS nativo exige conta Apple Developer, US$ 99/ano).
   Sem os segredos `MOTOBOY_KEYSTORE_B64`/`MOTOBOY_KEYSTORE_PASS` no GitHub, cada APK novo tem outra assinatura: para atualizar, desinstalar antes.
4. Aceitar um pedido de entrega → a comanda sai com QR → motoboy lê com a câmera → quadro mostra "Saiu com …". Com várias comandas lidas, aparece a **Rota sugerida**.

## Planos e pacotes (equipe RES)

Planos, preços, módulos e aparelhos grátis ficam no **painel da empresa → Planos e preços**; o plano e os módulos de cada cliente, em **Restaurantes → Plano** (D-085, D-090). Limites de lojas e cardápios continuam em `contas.limite_lojas` / `limite_cardapios` (`null` = sem limite), alterados só pela equipe RES. O cardápio de **Evento / Aniversário** não conta no limite (D-055).

## Ambiente no ar (piloto)

| Peça | Onde |
|---|---|
| Painel da empresa | https://res-empresa.vercel.app (mesmo projeto; `EMPRESA_HOST`), só a equipe RES (D-083) |
| Painel | https://res-iqzs.vercel.app (Vercel, projeto `res-iqzs`, pasta `apps/web`). Funções em **São Paulo (gru1)** via `apps/web/vercel.json`, junto do banco (~0,2–0,4 s por tela, PR #38) |
| App do motoboy | https://res-iqzs.vercel.app/m |
| Banco | Supabase, organização **REA BBEEFF**, projeto **RES - PRÓPRIO** (São Paulo), ref `avodakkmqyvnbabfwydr`; SQL Editor em supabase.com/dashboard/project/avodakkmqyvnbabfwydr/sql/new |
| Código | github.com/ZPloxDr3am/res, com deploy automático a cada push na `main` |
| Auth | Site URL é o painel; o redirect de confirmação é `/auth/confirmar` |
| Impressão | Computador "DESKTOP-OR7KCJP" (escritório) pareado à Pizzaria Pomerode com a Epson TM-T20X-II |
