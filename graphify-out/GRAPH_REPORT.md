# Graph Report - res  (2026-10-28)

## Corpus Check
- 288 files · ~244,474 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 2404 nodes · 6146 edges · 116 communities (96 shown, 20 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `641a1d74`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- formatarReais
- painel-caixa.tsx
- 20261020000001_base.sql
- main.ts
- [slug]/actions.ts
- 20261021000014_caixa.sql
- Banco: impressão
- Banco: fidelidade
- Banco: estoque
- API aberta e MCP (rotas)
- Tela de impressoras
- Resumo de vendas
- 20261021000008_multilojas.sql
- acompanhar-pedido.tsx
- Dependências do painel
- CI (testes automáticos)
- App do motoboy
- salvando
- expedicao.ts
- Decisões de arquitetura — RES
- Ações do cardápio
- ref_node_assert
- aplicativos.tsx
- mercadopago.ts
- entregas/actions.ts
- Promoções e cupons (tela)
- Quadro de pedidos
- entregas/page.tsx
- 99zzzzz_clientes.sql
- Workflow do APK do motoboy
- cardapio-cliente.tsx
- form-delivery.tsx
- programa.tsx
- Bairros e entregas ao vivo
- Workflow do agente de impressão
- Montagem do cupom impresso
- formatarReais
- Rota e geolocalização
- preco.ts
- 20261021000004_cardapio_edicao.sql
- Configuração TypeScript
- Banco: cupons e descontos
- Banco: Mercado Pago
- Dependências do app do motoboy
- preco.ts
- Grupo 45: package.json
- Grupo 46: package.json
- entregas/fechamento.tsx
- public.produtos
- D-017 Motoboy app with dispatch by order QR
- publico.ts
- impressao.ts
- index.ts
- editor-produto.tsx
- beefood_para_res.py
- Grupo 55: rastreio_motoboys.sql
- pedido.ts
- graphify
- pg_temp.como
- contextoLoja
- 20261021000006_cardapio_digital.sql
- next
- Grupo 62: package.json
- Grupo 63: 99zzzzzzzzzzz_fidelidade.sql
- Grupo 64: decisoes.md
- Grupo 65: README.md
- Grupo 66: decisoes.md
- Grupo 67: tsconfig.json
- Grupo 68: tsconfig.json
- 99zzzzzzzzzzzzzzzzzz_importar.sql
- 20261028000049_la_pizza_cardapio.sql
- Grupo 72: decisoes.md
- (painel)/layout.tsx
- Grupo 74: 99_motoboy.sql
- Grupo 75: 99z_entregas_km.sql
- Grupo 76: 99zzzzzzzzzzzz_estoque.sql
- Grupo 77: 99zzzzzzzzzzzzzz_api.sql
- Grupo 79: 99zzzzzzzzz_segmentos.sql
- Grupo 80: 90_agente.sql
- Grupo 81: 95_impressora_grupo.sql
- Grupo 82: 99zzzzzz_rastreio.sql
- Grupo 83: 99zzzzzzz_rota.sql
- Grupo 84: 99zzzzzzzz_entregas_cliente.sql
- Grupo 85: 99zzzzzzzzzzzzz_aplicativos.sql
- Grupo 86: README.md
- Grupo 87: decisoes.md
- 99zzzzzzzzzzzzzzzz_vitrine.sql
- Grupo 89: 30_cardapio_digital.sql
- Grupo 90: 60_agendamento.sql
- Grupo 91: 99zzz_combos.sql
- Grupo 93: 99zzzzzzzzzzzzzzz_mercadopago.sql
- impressoras.ts
- Grupo 96: 70_caixa.sql
- 99zzzzzzzzzzzzzzzzz_taxa_km.sql
- cardapio.test.ts
- Grupo 100: tempos_ajuste.sql
- form-setor.tsx
- Grupo 102: 20_cardapio_pedidos.sql
- Grupo 103: 40_cardapio_biblioteca.sql
- 99zz_promocao.sql
- Grupo 105: next.config.mjs
- Grupo 106: vercel.json
- Checkout
- Grupo 108: test-db.sh
- m/page.tsx
- 99zzzz_descontos.sql
- public.lojas

## God Nodes (most connected - your core abstractions)
1. `criarClienteServidor()` - 179 edges
2. `public.lojas` - 123 edges
3. `formatarReais()` - 110 edges
4. `public.pedidos` - 109 edges
5. `public.marcas` - 100 edges
6. `contextoLoja` - 94 edges
7. `salvando()` - 83 edges
8. `public.produtos` - 70 edges
9. `next` - 66 edges
10. `react` - 63 edges

## Surprising Connections (you probably didn't know these)
- `Ambiente no ar (piloto)` --references--> `main()`  [INFERRED]
  README.md → packages/agente/src/main.ts
- `D-022 Combos com escolhas e categoria de up-sell` --references--> `calcularCombo()`  [INFERRED]
  docs/decisoes.md → packages/core/src/combo.ts
- `D-023 % por categoria, cupons e desconto no balcão com limite` --references--> `precoBase()`  [INFERRED]
  docs/decisoes.md → packages/core/src/preco.ts
- `D-030 · Telefone sempre com o 9 do celular` --references--> `normalizarTelefone()`  [INFERRED]
  docs/decisoes.md → packages/core/src/segmentos.ts
- `D-036 · Estoque: entrada por NF-e e baixa pela ficha técnica` --references--> `lerNFe()`  [INFERRED]
  docs/decisoes.md → packages/core/src/estoque.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Rules duplicated in core and DB with shared test cases** — docs_decisoes_d_021_cardapio_cards_promo, docs_decisoes_d_022_combos_upsell, docs_decisoes_d_029_segmentos_clientes, docs_decisoes_d_030_telefone_nono_digito, docs_decisoes_d_031_fidelidade_grupo, docs_decisoes_core_db_parity [EXTRACTED 1.00]
- **Motoboy delivery flow (QR dispatch, app, tracking, routing)** — docs_decisoes_d_017_app_motoboy_qr, docs_decisoes_d_018_comanda_motoboy_pago, docs_decisoes_d_019_app_android_leitor_qr, docs_decisoes_d_026_rastreio_motoboys, docs_decisoes_d_027_rota_sugerida, apps_mobile_motoboy_readme_res_motoboy_android [INFERRED 0.85]
- **Stock management module (NF-e, recipes, counts, CMV)** — docs_decisoes_d_036_estoque_nfe_ficha, docs_decisoes_d_037_movimentacoes_estoque, docs_decisoes_d_038_meu_estoque_contagem, docs_decisoes_d_039_fechamento_cmv, docs_decisoes_d_040_ficha_sabor_pizza [INFERRED 0.85]

## Communities (116 total, 20 thin omitted)

### Community 0 - "formatarReais"
Cohesion: 0.05
Nodes (97): ajustarEstoque(), buscarMovimentos(), copiarFicha(), excluirInsumo(), feito(), FiltroMovimentos, importarNFe(), ItemImportar (+89 more)

### Community 1 - "painel-caixa.tsx"
Cohesion: 0.06
Nodes (74): abrirCaixa(), fecharCaixa(), movimentar(), msg(), R, salvarCaixa(), vincularSemCaixa(), dynamic (+66 more)

### Community 2 - "20261020000001_base.sql"
Cohesion: 0.10
Nodes (25): grupos_acesso_atualizado, grupos_acesso_auditar, grupos_acesso_validar, lojas_atualizado, lojas_auditar, marcas_atualizado, marcas_auditar, marcas_loja_idx (+17 more)

### Community 3 - "main.ts"
Cohesion: 0.06
Nodes (56): adapt, app, g, gradle, m, man, permissoes, res (+48 more)

### Community 4 - "[slug]/actions.ts"
Cohesion: 0.24
Nodes (15): calcularEntregaKm, conferirCupom(), enviarPedido(), programaFidelidade(), saldoFidelidade(), UsoFidelidade, FidelidadeCliente(), lembrarPedidoFidelidade() (+7 more)

### Community 5 - "20261021000014_caixa.sql"
Cohesion: 0.05
Nodes (50): caixa_movimentos_sessao_idx, caixa_sessoes_auditar, caixa_sessoes_loja_idx, caixa_sessoes_uma_aberta_idx, caixas_auditar, caixas_nome_idx, lojas_caixa_inicial, pedidos_caixa_idx (+42 more)

### Community 6 - "Banco: impressão"
Cohesion: 0.06
Nodes (46): impressao_config_auditar, impressao_destinos_loja_idx, impressoes_loja_idx, impressoes_pedido_idx, impressoes_pendentes_idx, impressoras_auditar, impressoras_nome_idx, pedidos_imprimir_ao_aceitar (+38 more)

### Community 7 - "Banco: fidelidade"
Cohesion: 0.05
Nodes (52): clientes_auditar, clientes_grupo_nome_idx, pedidos_cliente_idx, pedidos_registra_cliente, private.grupo_da_loja(), private.pedido_registra_cliente(), public.buscar_clientes(), public.cliente_enderecos (+44 more)

### Community 8 - "Banco: estoque"
Cohesion: 0.07
Nodes (36): private.cupom_da_loja(), public.relatorio_fidelidade(), estoque_mov_estoque_idx, estoque_mov_insumo_idx, estoque_mov_pedido_idx, fichas_opcao_idx, fichas_produto_idx, insumos_estoque_idx (+28 more)

### Community 9 - "API aberta e MCP (rotas)"
Cohesion: 0.08
Nodes (33): DELETE, POST(), DELETE, POST(), GET(), OPTIONS, GET(), OPTIONS (+25 more)

### Community 10 - "Tela de impressoras"
Cohesion: 0.10
Nodes (38): ConfigImpressao, DadosImpressora, excluirImpressora(), gerarCodigoAgente(), imprimirPedido(), imprimirTeste(), msg(), R (+30 more)

### Community 11 - "Resumo de vendas"
Cohesion: 0.11
Nodes (35): Composicao, ComposicaoVendas(), dataBR(), dynamic, Kpi(), Metricas, PRESETS, Resumo (+27 more)

### Community 12 - "20261021000008_multilojas.sql"
Cohesion: 0.08
Nodes (32): contas_atualizado, contas_proteger_plano, contas_titulares_user_idx, lojas_conta_idx, lojas_limite, marcas_limite, pedidos_loja_criado_idx, private.e_titular() (+24 more)

### Community 13 - "acompanhar-pedido.tsx"
Cohesion: 0.15
Nodes (19): FaixaKm, carregar(), dynamic, generateMetadata(), PaginaCardapio(), dynamic, metadata, PaginaAcompanhar() (+11 more)

### Community 14 - "Dependências do painel"
Cohesion: 0.06
Nodes (34): config, PUBLICAS, dependencies, jsqr@1.4.0, next@^15.5.9, react@^19.2.1, react-dom@^19.2.1, @res/core@* (+26 more)

### Community 15 - "CI (testes automáticos)"
Cohesion: 0.07
Nodes (34): name, runs-on, services, steps, DATABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, POSTGRES_PASSWORD (+26 more)

### Community 16 - "App do motoboy"
Cohesion: 0.14
Nodes (27): despachar(), entregar(), PlanoRota, dynamic, metadata, PaginaDespacho(), Acerto(), AppMotoboy() (+19 more)

### Community 17 - "salvando"
Cohesion: 0.30
Nodes (9): salvarDetalheOpcao(), definirModoEstoque(), BotaoExcluir(), AplicarGrupo(), DetalheOpcao(), ModoEstoque(), CARDAPIO, salvando() (+1 more)

### Community 18 - "expedicao.ts"
Cohesion: 0.10
Nodes (22): espera(), LoteSugerido, sugerirLotes(), SugestaoLoja, SugestaoLotes(), D-027 · Rota sugerida quando o motoboy sai com várias entregas, D-028 · Cliente acompanha a entrega, prazo por loja, alerta e lotes na expedição, tempos e atrasos, Ponto (+14 more)

### Community 19 - "Decisões de arquitetura — RES"
Cohesion: 0.06
Nodes (34): D-002 Modelo multiloja: Loja → Marcas, D-003 Regras de cadastro valem no banco e no formulário, D-004 Auditoria calculada no servidor, D-005 Operações compostas são atômicas, D-006 Gravar só em ação explícita, D-007 Texto em UTF-8 completo, D-008 Nenhum segredo de integração no navegador, D-009 Preço de itens com grupos (decisão provisória, Q-009) (+26 more)

### Community 20 - "Ações do cardápio"
Cohesion: 0.18
Nodes (33): alterarDisponibilidade(), CategoriaOrigem, criarProduto(), definirFoto(), definirFotoOpcao(), definirGruposDoProduto(), definirProdutosDoGrupo(), desvincularGrupo() (+25 more)

### Community 21 - "ref_node_assert"
Cohesion: 0.24
Nodes (11): D-021 Cardápio novo: cards com foto e promoção De/Por com agenda, AgendaPromo, diaAnterior(), diaDaSemana(), DIAS_CURTOS, partesLocais(), promoEncerrada(), promoVale() (+3 more)

### Community 22 - "aplicativos.tsx"
Cohesion: 0.08
Nodes (52): conectarMercadoPago(), criarChaveApi(), desconectarMercadoPago(), excluirWebhook(), mpAceitarAoPagar(), R, removerIntegracao(), revogarChaveApi() (+44 more)

### Community 23 - "mercadopago.ts"
Cohesion: 0.33
Nodes (8): POST(), atualizarPagamento(), conferirPix(), marcarPago(), Ped, pedidoECConta(), pixDoPedido(), usaPixMp()

### Community 24 - "entregas/actions.ts"
Cohesion: 0.17
Nodes (15): CORES, haQuanto(), iniciais(), MapaAoVivo(), segundos(), cap(), Capacitor, EstadoRastreio (+7 more)

### Community 25 - "Promoções e cupons (tela)"
Cohesion: 0.11
Nodes (37): agenda(), alternarCupom(), CupomForm, excluirCupom(), excluirPromoCategoria(), fim(), PromoCategoriaForm, R (+29 more)

### Community 26 - "Quadro de pedidos"
Cohesion: 0.15
Nodes (24): cuponsPendentes(), criarPedido(), definirAceiteAutomatico(), marcarPago(), mensagem(), mudarStatus(), NovoPedido, Resultado (+16 more)

### Community 27 - "entregas/page.tsx"
Cohesion: 0.23
Nodes (11): rastreioAoVivo(), diaDoTurno(), dynamic, Entregas(), BairrosEntregas(), LojaBairros, diaCurto(), pct() (+3 more)

### Community 28 - "99zzzzz_clientes.sql"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 29 - "Workflow do APK do motoboy"
Cohesion: 0.08
Nodes (24): runs-on, steps, GH_TOKEN, KS_B64, KS_PASS, jobs, apk, name (+16 more)

### Community 30 - "cardapio-cliente.tsx"
Cohesion: 0.27
Nodes (9): situacaoPedidos(), Dados, guardarPedido(), lerPedidos(), MeusPedidos(), NavCliente(), PedidoGuardado, PerfilCliente() (+1 more)

### Community 31 - "form-delivery.tsx"
Cohesion: 0.14
Nodes (22): PedidoCliente, ConfigDelivery, definirStatus(), replicarHorarios(), salvarConfig(), salvarVitrine(), Vitrine, Delivery() (+14 more)

### Community 32 - "programa.tsx"
Cohesion: 0.07
Nodes (55): ajustarSaldo(), buscarSaldos(), copiarPrograma(), excluirRecompensa(), extratoCliente(), R, salvarConfigFidelidade(), salvarRecompensa() (+47 more)

### Community 33 - "Bairros e entregas ao vivo"
Cohesion: 0.15
Nodes (21): AoVivo, AreaForm, calcularKmBairro(), FaixaForm, localizarLoja(), MotoboyAoVivo, R, salvarAreas() (+13 more)

### Community 34 - "Workflow do agente de impressão"
Cohesion: 0.09
Nodes (21): GH_TOKEN, runs-on, steps, jobs, exe, name, on, push (+13 more)

### Community 35 - "Montagem do cupom impresso"
Cohesion: 0.16
Nodes (18): D-014 Impressão: fila no banco, regras como no BeeFood, navegador até o agente chegar, D-015 Agente de impressão do Windows (RES Impressão), blocosCombo(), colunasLR(), cupomTexto(), dataHora(), FRACAO, fracaoTexto() (+10 more)

### Community 36 - "formatarReais"
Cohesion: 0.32
Nodes (10): conferirPixMercadoPago(), pixMercadoPago(), AcompanharPedido(), hora(), PagarPixMp(), PagarPix(), PixMp, qrcode@^1.5.4 (+2 more)

### Community 37 - "Rota e geolocalização"
Cohesion: 0.23
Nodes (17): chegadas(), espera(), medirEntrega(), montar(), planejarRota(), Achado, distanciaRota(), EnderecoEntrega (+9 more)

### Community 38 - "preco.ts"
Cohesion: 0.14
Nodes (20): EscolhaPasso, PassoCombo, LinhaTotal, Totais, grupoVisivel(), opcaoVisivel(), precoGrupo(), precoOpcao() (+12 more)

### Community 40 - "Configuração TypeScript"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 41 - "Banco: cupons e descontos"
Cohesion: 0.15
Nodes (14): cupons_auditar, cupons_codigo_idx, pedidos_cupom_idx, private.agenda_vale(), private.aplicar_cupom(), private.desconto_categoria_pct(), private.desconto_cupom(), promocoes_categoria_auditar (+6 more)

### Community 42 - "Banco: Mercado Pago"
Cohesion: 0.16
Nodes (13): mp_pagamentos_pedido_idx, public.desconectar_mp(), public.mp_contas, public.mp_pagamentos, public.mp_status(), public.salvar_mp(), public.mp_aceitar_ao_pagar(), public.mp_status() (+5 more)

### Community 43 - "Dependências do app do motoboy"
Cohesion: 0.14
Nodes (17): dependencies, @capacitor/android@6.2.0, @capacitor/app@6.0.2, @capacitor/cli@6.2.0, @capacitor-community/background-geolocation@1.2.26, @capacitor/core@6.2.0, description, name (+9 more)

### Community 44 - "preco.ts"
Cohesion: 0.17
Nodes (27): buscarClientes(), autorizarDesconto(), FidelidadeBalcao(), GruposBalcao(), ItemCarrinho, lerCentavos(), Montador(), MontadorCombo() (+19 more)

### Community 45 - "Grupo 45: package.json"
Cohesion: 0.14
Nodes (17): description, devDependencies, esbuild@0.24.0, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, tsx, @types/node (+9 more)

### Community 46 - "Grupo 46: package.json"
Cohesion: 0.13
Nodes (17): description, devDependencies, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, exports, tsx, @types/node (+9 more)

### Community 47 - "entregas/fechamento.tsx"
Cohesion: 0.21
Nodes (15): ajustarEntrega(), CartaoMotoboy(), FechamentoMotoboys(), FONTE, hora(), LinhaEntrega(), Numero(), Total (+7 more)

### Community 48 - "public.produtos"
Cohesion: 0.06
Nodes (71): complementos_loja_idx, grupos_opcoes_loja_idx, opcoes_grupo_idx, private.setor_exige_marca(), produto_grupos_grupo_idx, produtos_loja_setor_idx, public.complementos, public.criar_grupo_vinculado() (+63 more)

### Community 50 - "publico.ts"
Cohesion: 0.11
Nodes (39): EntregaKm, CardapioCliente(), ETIQUETA, Extras(), gravar(), Item, ItemCalculado, ler() (+31 more)

### Community 51 - "impressao.ts"
Cohesion: 0.18
Nodes (16): marcarImpressao(), AbaLayout(), EditorLayout(), RC, useImprimir(), colunasNavegador(), CSS_CUPOM, CupomFila (+8 more)

### Community 52 - "index.ts"
Cohesion: 0.16
Nodes (23): exportarClientes(), listarClientes(), salvarCliente(), Clientes(), dynamic, baixarCsv(), FichaCliente(), ListaClientes() (+15 more)

### Community 53 - "editor-produto.tsx"
Cohesion: 0.20
Nodes (13): PassoForm, salvarCombo(), EditorCombo(), lerCentavos(), Passo, reais(), ETIQUETAS, FORMACAO (+5 more)

### Community 55 - "Grupo 55: rastreio_motoboys.sql"
Cohesion: 0.22
Nodes (10): motoboy_local_grupo_idx, motoboy_posicoes_em_idx, motoboy_posicoes_entregador_idx, pedidos_motoboy_sai_do_mapa, private.e_membro_do_grupo(), private.motoboy_sai_do_mapa(), public.motoboy_local, public.motoboy_posicoes (+2 more)

### Community 56 - "pedido.ts"
Cohesion: 0.50
Nodes (6): acaoAvancar(), ErroPedido, proximosStatus(), totalizar(), transicaoValida(), troco()

### Community 58 - "pg_temp.como"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 59 - "contextoLoja"
Cohesion: 0.23
Nodes (12): Cardapio(), dynamic, saldoDoCliente(), dynamic, PaginaNovoPedido(), dynamic, Pedidos(), TempoReal() (+4 more)

### Community 60 - "20261021000006_cardapio_digital.sql"
Cohesion: 0.22
Nodes (10): areas_entrega_auditar, marca_horarios_auditar, private.marca_aberta(), public.areas_entrega, public.cardapio_publico(), public.marca_horarios, public.salvar_config_delivery(), private.taxa_bairro() (+2 more)

### Community 61 - "next"
Cohesion: 0.09
Nodes (17): GET(), POST(), carregar(), dynamic, generateMetadata(), Grupo, PaginaGrupo(), fonte (+9 more)

### Community 62 - "Grupo 62: package.json"
Cohesion: 0.17
Nodes (11): description, engines, node, name, private, scripts, build, dev (+3 more)

### Community 63 - "Grupo 63: 99zzzzzzzzzzz_fidelidade.sql"
Cohesion: 0.23
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 64 - "Grupo 64: decisoes.md"
Cohesion: 0.18
Nodes (4): BeeFood study (R-, B-, T- references), D-001 Stack: Next.js + Supabase, Architecture decisions log (D-001..D-044), Realtime order board (Novo → Concluído)

### Community 65 - "Grupo 65: README.md"
Cohesion: 0.12
Nodes (16): Ambiente no ar (piloto), Colocar no ar, contas table plans and limits (plano, limite_lojas, limite_cardapios), Estrutura, GitHub Actions CI (rules, db, build), Multilojas (conta → lojas → marcas), O que já funciona, packages/core (business rules TS) (+8 more)

### Community 67 - "Grupo 67: tsconfig.json"
Cohesion: 0.18
Nodes (10): compilerOptions, allowImportingTsExtensions, module, moduleResolution, noEmit, skipLibCheck, strict, target (+2 more)

### Community 68 - "Grupo 68: tsconfig.json"
Cohesion: 0.18
Nodes (10): compilerOptions, module, moduleResolution, noEmit, noUncheckedIndexedAccess, skipLibCheck, strict, target (+2 more)

### Community 69 - "99zzzzzzzzzzzzzzzzzz_importar.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 72 - "Grupo 72: decisoes.md"
Cohesion: 0.28
Nodes (4): agruparEntregas (core), OSRM / Nominatim (OpenStreetMap services), otimizarRota (core), Shift window 05:00→05:00

### Community 73 - "(painel)/layout.tsx"
Cohesion: 0.16
Nodes (17): PainelLayout(), trocarLoja(), dadosNovoPedido(), Icone(), Link_, LINKS, NavPainel(), SECOES (+9 more)

### Community 74 - "Grupo 74: 99_motoboy.sql"
Cohesion: 0.39
Nodes (7): ids, pg_temp.como(), pg_temp.id(), pg_temp.token(), pg_temp.v(), saida, tokens

### Community 75 - "Grupo 75: 99z_entregas_km.sql"
Cohesion: 0.39
Nodes (7): ids, pg_temp.como(), pg_temp.id(), pg_temp.token(), pg_temp.v(), saida, tokens

### Community 76 - "Grupo 76: 99zzzzzzzzzzzz_estoque.sql"
Cohesion: 0.33
Nodes (7): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), s1, s2, saida

### Community 77 - "Grupo 77: 99zzzzzzzzzzzzzz_api.sql"
Cohesion: 0.39
Nodes (7): chaves, ids, pg_temp.como(), pg_temp.id(), pg_temp.k(), pg_temp.v(), saida

### Community 79 - "Grupo 79: 99zzzzzzzzz_segmentos.sql"
Cohesion: 0.39
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 80 - "Grupo 80: 90_agente.sql"
Cohesion: 0.32
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 81 - "Grupo 81: 95_impressora_grupo.sql"
Cohesion: 0.32
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 82 - "Grupo 82: 99zzzzzz_rastreio.sql"
Cohesion: 0.39
Nodes (6): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida, tok

### Community 83 - "Grupo 83: 99zzzzzzz_rota.sql"
Cohesion: 0.43
Nodes (6): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida, tok

### Community 84 - "Grupo 84: 99zzzzzzzz_entregas_cliente.sql"
Cohesion: 0.43
Nodes (6): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida, tok

### Community 85 - "Grupo 85: 99zzzzzzzzzzzzz_aplicativos.sql"
Cohesion: 0.32
Nodes (5): cod, ids, pg_temp.id(), pg_temp.v(), saida

### Community 86 - "Grupo 86: README.md"
Cohesion: 0.32
Nodes (6): APK signing secrets MOTOBOY_KEYSTORE_B64 / MOTOBOY_KEYSTORE_PASS, motoboy-app.yml workflow (APK release motoboy-latest), RES Motoboy (Android), RES Motoboy offline fallback page, apps/web (Next.js panel), Vercel deploy (res-iqzs)

### Community 88 - "99zzzzzzzzzzzzzzzz_vitrine.sql"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 89 - "Grupo 89: 30_cardapio_digital.sql"
Cohesion: 0.33
Nodes (3): ids, pg_temp.id(), saida

### Community 90 - "Grupo 90: 60_agendamento.sql"
Cohesion: 0.33
Nodes (3): ids, pg_temp.id(), saida

### Community 91 - "Grupo 91: 99zzz_combos.sql"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 93 - "Grupo 93: 99zzzzzzzzzzzzzzz_mercadopago.sql"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 94 - "impressoras.ts"
Cohesion: 0.29
Nodes (5): ModeloImpressora, MODELOS_IMPRESSORA, PaginaCodigo, PAGINAS_CODIGO, Protocolo

### Community 96 - "Grupo 96: 70_caixa.sql"
Cohesion: 0.47
Nodes (4): ids, pg_temp.como(), pg_temp.id(), saida

### Community 97 - "99zzzzzzzzzzzzzzzzz_taxa_km.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 98 - "cardapio.test.ts"
Cohesion: 0.12
Nodes (25): DadosGrupo, salvarGrupo(), FORMACOES, FormGrupo(), GrupoInicial, lerPreco(), mostrarPreco(), OpcaoForm (+17 more)

### Community 101 - "form-setor.tsx"
Cohesion: 0.39
Nodes (7): salvarSetor(), FormSetor(), Marca, novoSetor(), SetorForm, setorVisivel(), validarSetor()

### Community 102 - "Grupo 102: 20_cardapio_pedidos.sql"
Cohesion: 0.60
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 103 - "Grupo 103: 40_cardapio_biblioteca.sql"
Cohesion: 0.60
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 104 - "99zz_promocao.sql"
Cohesion: 0.60
Nodes (4): ids, pg_temp.como(), pg_temp.id(), pg_temp.vale()

### Community 107 - "Checkout"
Cohesion: 0.30
Nodes (10): D-011 Pedido agendado e taxa por bairro no painel, chaveBairro(), dataNoFuso(), DIAS_CURTOS, faseAgendamento, FOLGA_AGENDADO_MIN, horaNoFuso(), partes() (+2 more)

### Community 116 - "m/page.tsx"
Cohesion: 0.50
Nodes (4): painelMotoboy(), dynamic, maxDuration, Motoboy()

### Community 120 - "99zzzz_descontos.sql"
Cohesion: 0.47
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 123 - "public.lojas"
Cohesion: 0.05
Nodes (85): public.lojas, public.marcas, pedido_eventos_pedido_idx, pedido_item_opcoes_item_idx, pedido_itens_pedido_idx, pedidos_atualizado, pedidos_loja_status_idx, private.contador_pedidos (+77 more)

## Knowledge Gaps
- **11 isolated node(s):** `FaixaForm`, `EntregaKm`, `pedidos.qr_token (/m/d/<código>)`, `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `GitHub Actions CI (rules, db, build)` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 593 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `formatarReais`, `painel-caixa.tsx`, `API aberta e MCP (rotas)`, `Tela de impressoras`, `Resumo de vendas`, `acompanhar-pedido.tsx`, `Dependências do painel`, `App do motoboy`, `salvando`, `Ações do cardápio`, `aplicativos.tsx`, `mercadopago.ts`, `Promoções e cupons (tela)`, `Quadro de pedidos`, `entregas/page.tsx`, `cardapio-cliente.tsx`, `form-delivery.tsx`, `programa.tsx`, `Bairros e entregas ao vivo`, `formatarReais`, `preco.ts`, `publico.ts`, `index.ts`, `contextoLoja`, `(painel)/layout.tsx`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **What connects `FaixaForm`, `EntregaKm`, `pedidos.qr_token (/m/d/<código>)` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `formatarReais` be split into smaller, more focused modules?**
  _Cohesion score 0.051597051597051594 - nodes in this community are weakly interconnected._
- **Why does `formatarReais()` connect `formatarReais` to `formatarReais`, `painel-caixa.tsx`, `[slug]/actions.ts`, `Resumo de vendas`, `App do motoboy`, `Ações do cardápio`, `aplicativos.tsx`, `Promoções e cupons (tela)`, `Quadro de pedidos`, `cardapio-cliente.tsx`, `form-delivery.tsx`, `programa.tsx`, `Bairros e entregas ao vivo`, `Montagem do cupom impresso`, `preco.ts`, `preco.ts`, `entregas/fechamento.tsx`, `publico.ts`, `index.ts`, `editor-produto.tsx`, `(painel)/layout.tsx`, `cardapio.test.ts`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Should `painel-caixa.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.055600106923282544 - nodes in this community are weakly interconnected._
- **Why does `public.marcas` connect `public.lojas` to `20261020000001_base.sql`, `Banco: impressão`, `Banco: fidelidade`, `20261021000008_multilojas.sql`, `99zzzzz_clientes.sql`, `Banco: cupons e descontos`, `Banco: Mercado Pago`, `public.produtos`, `pg_temp.como`, `20261021000006_cardapio_digital.sql`, `Grupo 63: 99zzzzzzzzzzz_fidelidade.sql`, `Grupo 74: 99_motoboy.sql`, `Grupo 76: 99zzzzzzzzzzzz_estoque.sql`, `Grupo 79: 99zzzzzzzzz_segmentos.sql`, `Grupo 82: 99zzzzzz_rastreio.sql`, `Grupo 83: 99zzzzzzz_rota.sql`, `Grupo 84: 99zzzzzzzz_entregas_cliente.sql`, `99zzzzzzzzzzzzzzzz_vitrine.sql`, `Grupo 91: 99zzz_combos.sql`, `Grupo 102: 20_cardapio_pedidos.sql`, `Grupo 103: 40_cardapio_biblioteca.sql`, `99zz_promocao.sql`, `99zzzz_descontos.sql`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Should `20261020000001_base.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.1032258064516129 - nodes in this community are weakly interconnected._