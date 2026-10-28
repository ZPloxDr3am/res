# Graph Report - res  (2026-10-28)

## Corpus Check
- 284 files · ~236,539 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 2408 nodes · 6107 edges · 120 communities (103 shown, 17 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b8fea37f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- formatarReais
- painel-caixa.tsx
- 20261028000045_vitrine.sql
- main.ts
- cardapio-cliente.tsx
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
- aplicativos.tsx
- expedicao.ts
- Decisões de arquitetura — RES
- Ações do cardápio
- ref_node_assert
- [slug]/actions.ts
- mercadopago.ts
- entregas/actions.ts
- Promoções e cupons (tela)
- Quadro de pedidos
- Banco: cardápio
- public.clientes
- Workflow do APK do motoboy
- conta-cliente.tsx
- form-delivery.tsx
- programa.tsx
- Bairros e entregas ao vivo
- Workflow do agente de impressão
- Montagem do cupom impresso
- 20261028000040_api_webhooks.sql
- Rota e geolocalização
- preco.ts
- cardapio-dados.ts
- Configuração TypeScript
- Banco: cupons e descontos
- Banco: Mercado Pago
- Dependências do app do motoboy
- preco.ts
- Grupo 45: package.json
- Grupo 46: package.json
- entregas/fechamento.tsx
- public.produto_grupos
- 20261021000005_pedidos.sql
- montagem.tsx
- impressao.ts
- lista-clientes.tsx
- react
- escpos.ts
- Grupo 55: rastreio_motoboys.sql
- pedido.ts
- graphify
- publico.ts
- entregas/page.tsx
- public.marcas
- next
- Grupo 62: package.json
- Grupo 63: 99zzzzzzzzzzz_fidelidade.sql
- Grupo 64: decisoes.md
- Grupo 65: README.md
- Grupo 66: decisoes.md
- Grupo 67: tsconfig.json
- Grupo 68: tsconfig.json
- public.importar_cardapio
- public.produto_marcas
- Grupo 72: decisoes.md
- (painel)/layout.tsx
- Grupo 74: 99_motoboy.sql
- Grupo 75: 99z_entregas_km.sql
- Grupo 76: 99zzzzzzzzzzzz_estoque.sql
- Grupo 77: 99zzzzzzzzzzzzzz_api.sql
- 99zzzzz_clientes.sql
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
- ajustar-android.mjs
- Grupo 93: 99zzzzzzzzzzzzzzz_mercadopago.sql
- impressoras.ts
- 20261028000047_taxa_km.sql
- Grupo 96: 70_caixa.sql
- 99zzzzzzzzzzzzzzzzz_taxa_km.sql
- cardapio.test.ts
- app/layout.tsx
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
2. `public.lojas` - 122 edges
3. `public.pedidos` - 109 edges
4. `formatarReais()` - 103 edges
5. `public.marcas` - 99 edges
6. `contextoLoja` - 94 edges
7. `salvando()` - 84 edges
8. `public.produtos` - 69 edges
9. `next` - 66 edges
10. `react` - 63 edges

## Surprising Connections (you probably didn't know these)
- `D-036 · Estoque: entrada por NF-e e baixa pela ficha técnica` --references--> `lerNFe()`  [INFERRED]
  docs/decisoes.md → packages/core/src/estoque.ts
- `D-014 Impressão: fila no banco, regras como no BeeFood, navegador até o agente chegar` --references--> `montarCupom()`  [INFERRED]
  docs/decisoes.md → packages/core/src/cupom.ts
- `D-015 Agente de impressão do Windows (RES Impressão)` --references--> `montarCupom()`  [INFERRED]
  docs/decisoes.md → packages/core/src/cupom.ts
- `D-022 Combos com escolhas e categoria de up-sell` --references--> `calcularCombo()`  [INFERRED]
  docs/decisoes.md → packages/core/src/combo.ts
- `D-023 % por categoria, cupons e desconto no balcão com limite` --references--> `precoBase()`  [INFERRED]
  docs/decisoes.md → packages/core/src/preco.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Rules duplicated in core and DB with shared test cases** — docs_decisoes_d_021_cardapio_cards_promo, docs_decisoes_d_022_combos_upsell, docs_decisoes_d_029_segmentos_clientes, docs_decisoes_d_030_telefone_nono_digito, docs_decisoes_d_031_fidelidade_grupo, docs_decisoes_core_db_parity [EXTRACTED 1.00]
- **Motoboy delivery flow (QR dispatch, app, tracking, routing)** — docs_decisoes_d_017_app_motoboy_qr, docs_decisoes_d_018_comanda_motoboy_pago, docs_decisoes_d_019_app_android_leitor_qr, docs_decisoes_d_026_rastreio_motoboys, docs_decisoes_d_027_rota_sugerida, apps_mobile_motoboy_readme_res_motoboy_android [INFERRED 0.85]
- **Stock management module (NF-e, recipes, counts, CMV)** — docs_decisoes_d_036_estoque_nfe_ficha, docs_decisoes_d_037_movimentacoes_estoque, docs_decisoes_d_038_meu_estoque_contagem, docs_decisoes_d_039_fechamento_cmv, docs_decisoes_d_040_ficha_sabor_pizza [INFERRED 0.85]

## Communities (120 total, 17 thin omitted)

### Community 0 - "formatarReais"
Cohesion: 0.05
Nodes (99): ajustarEstoque(), buscarMovimentos(), copiarFicha(), definirModoEstoque(), excluirInsumo(), feito(), FiltroMovimentos, importarNFe() (+91 more)

### Community 1 - "painel-caixa.tsx"
Cohesion: 0.06
Nodes (71): cadastrar(), credenciais(), entrar(), abrirCaixa(), fecharCaixa(), movimentar(), msg(), R (+63 more)

### Community 3 - "main.ts"
Cohesion: 0.09
Nodes (37): acharWindows(), alcance(), argumento(), ARQ_CONFIG, ARQ_LOG, atualizarSePrecisar(), atualizarWindows(), Config (+29 more)

### Community 4 - "cardapio-cliente.tsx"
Cohesion: 0.09
Nodes (19): CardapioCliente(), Checkout(), ETIQUETA, Extras(), gravar(), Item, ItemCalculado, ler() (+11 more)

### Community 5 - "20261021000014_caixa.sql"
Cohesion: 0.05
Nodes (53): grupos_acesso_atualizado, grupos_acesso_auditar, grupos_acesso_validar, lojas_atualizado, lojas_auditar, marcas_atualizado, marcas_auditar, marcas_loja_idx (+45 more)

### Community 6 - "Banco: impressão"
Cohesion: 0.06
Nodes (48): impressao_config_auditar, impressao_destinos_loja_idx, impressoes_loja_idx, impressoes_pedido_idx, impressoes_pendentes_idx, impressoras_auditar, impressoras_nome_idx, pedidos_imprimir_ao_aceitar (+40 more)

### Community 7 - "Banco: fidelidade"
Cohesion: 0.07
Nodes (37): fidelidade_mov_cliente_idx, fidelidade_mov_grupo_idx, fidelidade_mov_pedido_idx, fidelidade_recompensas_grupo_idx, pedidos_fidelidade, private.aplicar_cupom(), private.fidelidade_status(), private.recompensas_json() (+29 more)

### Community 8 - "Banco: estoque"
Cohesion: 0.08
Nodes (36): public.reordenar(), private.cupom_da_loja(), estoque_mov_estoque_idx, estoque_mov_insumo_idx, estoque_mov_pedido_idx, fichas_opcao_idx, fichas_produto_idx, insumos_estoque_idx (+28 more)

### Community 9 - "API aberta e MCP (rotas)"
Cohesion: 0.08
Nodes (33): DELETE, POST(), DELETE, POST(), GET(), OPTIONS, GET(), OPTIONS (+25 more)

### Community 10 - "Tela de impressoras"
Cohesion: 0.10
Nodes (40): ConfigImpressao, DadosImpressora, excluirImpressora(), gerarCodigoAgente(), imprimirPedido(), imprimirTeste(), marcarImpressao(), msg() (+32 more)

### Community 11 - "Resumo de vendas"
Cohesion: 0.11
Nodes (35): Composicao, ComposicaoVendas(), dataBR(), dynamic, Kpi(), Metricas, PRESETS, Resumo (+27 more)

### Community 12 - "20261021000008_multilojas.sql"
Cohesion: 0.08
Nodes (32): contas_atualizado, contas_proteger_plano, contas_titulares_user_idx, lojas_conta_idx, lojas_limite, marcas_limite, pedidos_loja_criado_idx, private.e_titular() (+24 more)

### Community 13 - "acompanhar-pedido.tsx"
Cohesion: 0.16
Nodes (17): dynamic, metadata, PaginaAcompanhar(), AcompanharPedido(), ExtrasPedido, hora(), PagarPix(), carregar() (+9 more)

### Community 14 - "Dependências do painel"
Cohesion: 0.06
Nodes (34): config, PUBLICAS, dependencies, jsqr@1.4.0, next@^15.5.9, react@^19.2.1, react-dom@^19.2.1, @res/core@* (+26 more)

### Community 15 - "CI (testes automáticos)"
Cohesion: 0.07
Nodes (34): name, runs-on, services, steps, DATABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, POSTGRES_PASSWORD (+26 more)

### Community 16 - "App do motoboy"
Cohesion: 0.13
Nodes (29): despachar(), entregar(), PlanoRota, dynamic, metadata, PaginaDespacho(), Acerto(), AppMotoboy() (+21 more)

### Community 17 - "aplicativos.tsx"
Cohesion: 0.09
Nodes (48): conectarMercadoPago(), criarChaveApi(), desconectarMercadoPago(), excluirWebhook(), mpAceitarAoPagar(), R, removerIntegracao(), revogarChaveApi() (+40 more)

### Community 18 - "expedicao.ts"
Cohesion: 0.10
Nodes (23): espera(), LoteSugerido, sugerirLotes(), SugestaoLoja, SugestaoLotes(), D-027 · Rota sugerida quando o motoboy sai com várias entregas, D-028 · Cliente acompanha a entrega, prazo por loja, alerta e lotes na expedição, tempos e atrasos, Ponto (+15 more)

### Community 19 - "Decisões de arquitetura — RES"
Cohesion: 0.05
Nodes (36): D-002 Modelo multiloja: Loja → Marcas, D-003 Regras de cadastro valem no banco e no formulário, D-004 Auditoria calculada no servidor, D-005 Operações compostas são atômicas, D-006 Gravar só em ação explícita, D-007 Texto em UTF-8 completo, D-008 Nenhum segredo de integração no navegador, D-009 Preço de itens com grupos (decisão provisória, Q-009) (+28 more)

### Community 20 - "Ações do cardápio"
Cohesion: 0.23
Nodes (28): alterarDisponibilidade(), criarProduto(), definirFoto(), definirFotoOpcao(), definirGruposDoProduto(), definirProdutosDoGrupo(), desvincularGrupo(), duplicarGrupo() (+20 more)

### Community 21 - "ref_node_assert"
Cohesion: 0.14
Nodes (17): D-021 Cardápio novo: cards com foto e promoção De/Por com agenda, campo(), crc16Pix(), FORMATOS_RASTREAMENTO, pixCopiaECola(), semAcento(), TipoChavePix, AgendaPromo (+9 more)

### Community 22 - "[slug]/actions.ts"
Cohesion: 0.17
Nodes (15): calcularEntregaKm(), conferirCupom(), EntregaKm, enviarPedido(), FaixaKm, PedidoCliente, programaFidelidade(), saldoFidelidade() (+7 more)

### Community 23 - "mercadopago.ts"
Cohesion: 0.18
Nodes (15): POST(), conferirPixMercadoPago(), pixMercadoPago(), PagarPixMp(), atualizarPagamento(), conferirPix(), marcarPago(), Ped (+7 more)

### Community 24 - "entregas/actions.ts"
Cohesion: 0.17
Nodes (15): CORES, haQuanto(), iniciais(), MapaAoVivo(), segundos(), cap(), Capacitor, EstadoRastreio (+7 more)

### Community 25 - "Promoções e cupons (tela)"
Cohesion: 0.11
Nodes (37): agenda(), alternarCupom(), CupomForm, excluirCupom(), excluirPromoCategoria(), fim(), PromoCategoriaForm, R (+29 more)

### Community 26 - "Quadro de pedidos"
Cohesion: 0.14
Nodes (24): criarPedido(), definirAceiteAutomatico(), marcarPago(), mensagem(), mudarStatus(), NovoPedido, Resultado, dynamic (+16 more)

### Community 27 - "Banco: cardápio"
Cohesion: 0.14
Nodes (16): public.criar_loja(), complementos_loja_idx, grupos_opcoes_loja_idx, opcoes_grupo_idx, private.setor_exige_marca(), produto_grupos_grupo_idx, produtos_loja_setor_idx, public.criar_produto() (+8 more)

### Community 28 - "public.clientes"
Cohesion: 0.09
Nodes (24): clientes_auditar, clientes_grupo_nome_idx, pedidos_cliente_idx, pedidos_registra_cliente, private.grupo_da_loja(), private.pedido_registra_cliente(), public.buscar_clientes(), public.cliente_enderecos (+16 more)

### Community 29 - "Workflow do APK do motoboy"
Cohesion: 0.08
Nodes (24): runs-on, steps, GH_TOKEN, KS_B64, KS_PASS, jobs, apk, name (+16 more)

### Community 30 - "conta-cliente.tsx"
Cohesion: 0.27
Nodes (9): situacaoPedidos(), Dados, guardarPedido(), lerPedidos(), MeusPedidos(), NavCliente(), PedidoGuardado, PerfilCliente() (+1 more)

### Community 31 - "form-delivery.tsx"
Cohesion: 0.23
Nodes (14): ConfigDelivery, definirStatus(), replicarHorarios(), salvarConfig(), salvarVitrine(), Delivery(), dynamic, FormVitrine() (+6 more)

### Community 32 - "programa.tsx"
Cohesion: 0.07
Nodes (59): ajustarSaldo(), buscarSaldos(), copiarPrograma(), excluirRecompensa(), extratoCliente(), R, saldoDoCliente(), salvarConfigFidelidade() (+51 more)

### Community 33 - "Bairros e entregas ao vivo"
Cohesion: 0.13
Nodes (24): AoVivo, AreaForm, calcularKmBairro(), FaixaForm, localizarLoja(), MotoboyAoVivo, R, salvarAreas() (+16 more)

### Community 34 - "Workflow do agente de impressão"
Cohesion: 0.09
Nodes (21): GH_TOKEN, runs-on, steps, jobs, exe, name, on, push (+13 more)

### Community 35 - "Montagem do cupom impresso"
Cohesion: 0.21
Nodes (16): blocosCombo(), colunasLR(), CupomDados, cupomTexto(), dataHora(), FRACAO, fracaoTexto(), LAYOUT_PADRAO (+8 more)

### Community 36 - "20261028000040_api_webhooks.sql"
Cohesion: 0.12
Nodes (21): pedidos_webhooks, private.disparar_webhook(), private.loja_da_chave(), private.processar_webhooks(), private.webhooks_pedido(), public.api_chaves, public.api_estoque(), public.api_painel() (+13 more)

### Community 37 - "Rota e geolocalização"
Cohesion: 0.25
Nodes (16): chegadas(), espera(), medirEntrega(), montar(), planejarRota(), Achado, distanciaRota(), EnderecoEntrega (+8 more)

### Community 38 - "preco.ts"
Cohesion: 0.14
Nodes (21): EscolhaPasso, PassoCombo, precoSeparado(), LinhaTotal, Totais, grupoVisivel(), opcaoVisivel(), precoGrupo() (+13 more)

### Community 39 - "cardapio-dados.ts"
Cohesion: 0.27
Nodes (10): dynamic, PaginaNovoPedido(), Cardapio, GrupoRow, OpcaoRow, PassoRow, ProdutoMarcaRow, ProdutoRow (+2 more)

### Community 40 - "Configuração TypeScript"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 41 - "Banco: cupons e descontos"
Cohesion: 0.17
Nodes (13): cupons_auditar, cupons_codigo_idx, pedidos_cupom_idx, private.agenda_vale(), private.aplicar_cupom(), private.desconto_categoria_pct(), private.desconto_cupom(), private.preco_combo() (+5 more)

### Community 42 - "Banco: Mercado Pago"
Cohesion: 0.16
Nodes (13): mp_pagamentos_pedido_idx, public.desconectar_mp(), public.mp_contas, public.mp_pagamentos, public.mp_status(), public.salvar_mp(), public.mp_aceitar_ao_pagar(), public.mp_status() (+5 more)

### Community 43 - "Dependências do app do motoboy"
Cohesion: 0.14
Nodes (17): dependencies, @capacitor/android@6.2.0, @capacitor/app@6.0.2, @capacitor/cli@6.2.0, @capacitor-community/background-geolocation@1.2.26, @capacitor/core@6.2.0, description, name (+9 more)

### Community 44 - "preco.ts"
Cohesion: 0.24
Nodes (20): buscarClientes(), autorizarDesconto(), GruposBalcao(), ItemCarrinho, lerCentavos(), Montador(), MontadorCombo(), NovoPedido() (+12 more)

### Community 45 - "Grupo 45: package.json"
Cohesion: 0.14
Nodes (17): description, devDependencies, esbuild@0.24.0, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, tsx, @types/node (+9 more)

### Community 46 - "Grupo 46: package.json"
Cohesion: 0.13
Nodes (17): description, devDependencies, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, exports, tsx, @types/node (+9 more)

### Community 47 - "entregas/fechamento.tsx"
Cohesion: 0.22
Nodes (15): ajustarEntrega(), CartaoMotoboy(), FechamentoMotoboys(), FONTE, hora(), LinhaEntrega(), Numero(), Total (+7 more)

### Community 48 - "public.produto_grupos"
Cohesion: 0.18
Nodes (30): public.complementos, public.criar_grupo_vinculado(), public.grupos_opcoes, public.opcoes, public.produto_grupos, public.produto_marcas, public.produtos, public.criar_grupo_vinculado() (+22 more)

### Community 49 - "20261021000005_pedidos.sql"
Cohesion: 0.16
Nodes (9): pedido_eventos_pedido_idx, pedido_item_opcoes_item_idx, pedido_itens_pedido_idx, pedidos_atualizado, pedidos_loja_status_idx, private.contador_pedidos, public.mudar_status_pedido(), public.pedido_eventos (+1 more)

### Community 50 - "montagem.tsx"
Cohesion: 0.26
Nodes (12): acrescimo(), cheio(), completo(), Extras, GruposMontagem(), minimo(), Montador(), SELO (+4 more)

### Community 51 - "impressao.ts"
Cohesion: 0.27
Nodes (10): colunasNavegador(), CSS_CUPOM, cupomHtml(), esc(), imprimirNoNavegador(), linhasDoCupom(), qrsDosCupons(), CupomTeste (+2 more)

### Community 52 - "lista-clientes.tsx"
Cohesion: 0.16
Nodes (23): exportarClientes(), listarClientes(), salvarCliente(), Clientes(), dynamic, baixarCsv(), FichaCliente(), ListaClientes() (+15 more)

### Community 53 - "react"
Cohesion: 0.11
Nodes (31): CategoriaOrigem, PassoForm, Resultado, salvarCombo(), Vitrine, BotaoExcluir(), AplicarGrupo(), Marca (+23 more)

### Community 54 - "escpos.ts"
Cohesion: 0.29
Nodes (9): codificar(), CP850, CP860, ESC_T, Pagina, semAcento(), ConfigImpressora, gerarEscPos() (+1 more)

### Community 55 - "Grupo 55: rastreio_motoboys.sql"
Cohesion: 0.22
Nodes (10): motoboy_local_grupo_idx, motoboy_posicoes_em_idx, motoboy_posicoes_entregador_idx, pedidos_motoboy_sai_do_mapa, private.e_membro_do_grupo(), private.motoboy_sai_do_mapa(), public.motoboy_local, public.motoboy_posicoes (+2 more)

### Community 56 - "pedido.ts"
Cohesion: 0.44
Nodes (7): acaoAvancar(), ErroPedido, proximosStatus(), tempoDecorrido(), totalizar(), transicaoValida(), troco()

### Community 58 - "publico.ts"
Cohesion: 0.20
Nodes (12): carregar(), dynamic, generateMetadata(), PaginaCardapio(), AgendamentoPublico, CardapioPublico, DIAS, MarcaPublica (+4 more)

### Community 59 - "entregas/page.tsx"
Cohesion: 0.13
Nodes (16): Caixa(), Cardapio(), dynamic, rastreioAoVivo(), diaDoTurno(), dynamic, Entregas(), Impressoras() (+8 more)

### Community 60 - "public.marcas"
Cohesion: 0.11
Nodes (31): public.marcas, public.setor_marcas, public.setores, areas_entrega_auditar, marca_horarios_auditar, private.marca_aberta(), public.areas_entrega, public.cardapio_publico() (+23 more)

### Community 61 - "next"
Cohesion: 0.11
Nodes (14): GET(), POST(), carregar(), dynamic, generateMetadata(), Grupo, PaginaGrupo(), LayoutMotoboy() (+6 more)

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
Cohesion: 0.11
Nodes (16): pedidos.qr_token (/m/d/<código>), Colocar no ar, contas table plans and limits (plano, limite_lojas, limite_cardapios), Estrutura, GitHub Actions CI (rules, db, build), Multilojas (conta → lojas → marcas), O que já funciona, packages/core (business rules TS) (+8 more)

### Community 66 - "Grupo 66: decisoes.md"
Cohesion: 0.22
Nodes (3): D-042 · Aplicativos, montarCupom (core coupon builder), Digital menu (/c/<endereço>)

### Community 67 - "Grupo 67: tsconfig.json"
Cohesion: 0.18
Nodes (10): compilerOptions, allowImportingTsExtensions, module, moduleResolution, noEmit, skipLibCheck, strict, target (+2 more)

### Community 68 - "Grupo 68: tsconfig.json"
Cohesion: 0.18
Nodes (10): compilerOptions, module, moduleResolution, noEmit, noUncheckedIndexedAccess, skipLibCheck, strict, target (+2 more)

### Community 69 - "public.importar_cardapio"
Cohesion: 0.15
Nodes (3): public.duplicar_grupo(), public.duplicar_produto(), public.importar_cardapio()

### Community 71 - "public.produto_marcas"
Cohesion: 0.17
Nodes (7): private.preco_item(), combo_passos_auditar, combo_passos_combo_idx, private.preco_combo(), public.combo_passos, public.duplicar_produto(), public.salvar_combo()

### Community 72 - "Grupo 72: decisoes.md"
Cohesion: 0.32
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

### Community 78 - "99zzzzz_clientes.sql"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

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
Cohesion: 0.28
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

### Community 92 - "ajustar-android.mjs"
Cohesion: 0.17
Nodes (11): adapt, app, g, gradle, m, man, permissoes, res (+3 more)

### Community 93 - "Grupo 93: 99zzzzzzzzzzzzzzz_mercadopago.sql"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 94 - "impressoras.ts"
Cohesion: 0.22
Nodes (8): novoForm(), ModeloImpressora, modeloPorId(), MODELOS_IMPRESSORA, nomeModelo(), PaginaCodigo, PAGINAS_CODIGO, Protocolo

### Community 95 - "20261028000047_taxa_km.sql"
Cohesion: 0.36
Nodes (5): faixas_km_idx, private.taxa_km(), public.faixas_km, public.faixas_km_publica(), public.salvar_faixas_km()

### Community 96 - "Grupo 96: 70_caixa.sql"
Cohesion: 0.47
Nodes (4): ids, pg_temp.como(), pg_temp.id(), saida

### Community 97 - "99zzzzzzzzzzzzzzzzz_taxa_km.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 98 - "cardapio.test.ts"
Cohesion: 0.12
Nodes (26): DadosGrupo, salvarGrupo(), DetalheOpcao(), FORMACOES, FormGrupo(), GrupoInicial, lerPreco(), mostrarPreco() (+18 more)

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
Cohesion: 0.07
Nodes (58): public.lojas, public.criar_pedido(), public.pedido_item_opcoes, public.pedido_itens, public.pedidos, public.acompanhar_pedido(), private.metricas_vendas(), public.criar_marca() (+50 more)

## Knowledge Gaps
- **9 isolated node(s):** `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `GitHub Actions CI (rules, db, build)`, `Roadmap stages 3c-7 and integrations`, `supabase/migrations (Postgres RLS, audit, atomic ops)`, `Supabase project RES - PRÓPRIO (São Paulo)` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 606 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `formatarReais`, `painel-caixa.tsx`, `cardapio-cliente.tsx`, `API aberta e MCP (rotas)`, `Tela de impressoras`, `Resumo de vendas`, `acompanhar-pedido.tsx`, `Dependências do painel`, `App do motoboy`, `aplicativos.tsx`, `Ações do cardápio`, `mercadopago.ts`, `Promoções e cupons (tela)`, `Quadro de pedidos`, `conta-cliente.tsx`, `form-delivery.tsx`, `programa.tsx`, `Bairros e entregas ao vivo`, `preco.ts`, `lista-clientes.tsx`, `react`, `publico.ts`, `entregas/page.tsx`, `(painel)/layout.tsx`, `app/layout.tsx`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **What connects `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `GitHub Actions CI (rules, db, build)`, `Roadmap stages 3c-7 and integrations` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `formatarReais` be split into smaller, more focused modules?**
  _Cohesion score 0.05325260052786834 - nodes in this community are weakly interconnected._
- **Why does `formatarReais()` connect `formatarReais` to `painel-caixa.tsx`, `Resumo de vendas`, `acompanhar-pedido.tsx`, `App do motoboy`, `aplicativos.tsx`, `Ações do cardápio`, `[slug]/actions.ts`, `mercadopago.ts`, `Promoções e cupons (tela)`, `Quadro de pedidos`, `conta-cliente.tsx`, `form-delivery.tsx`, `programa.tsx`, `Montagem do cupom impresso`, `preco.ts`, `preco.ts`, `entregas/fechamento.tsx`, `montagem.tsx`, `lista-clientes.tsx`, `react`, `(painel)/layout.tsx`, `cardapio.test.ts`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `painel-caixa.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05658263305322129 - nodes in this community are weakly interconnected._
- **Why does `criarClienteServidor()` connect `Ações do cardápio` to `formatarReais`, `painel-caixa.tsx`, `Tela de impressoras`, `Resumo de vendas`, `acompanhar-pedido.tsx`, `App do motoboy`, `aplicativos.tsx`, `expedicao.ts`, `[slug]/actions.ts`, `Promoções e cupons (tela)`, `Quadro de pedidos`, `conta-cliente.tsx`, `form-delivery.tsx`, `programa.tsx`, `Bairros e entregas ao vivo`, `Rota e geolocalização`, `cardapio-dados.ts`, `preco.ts`, `entregas/fechamento.tsx`, `lista-clientes.tsx`, `react`, `publico.ts`, `entregas/page.tsx`, `next`, `cardapio.test.ts`, `form-setor.tsx`, `m/page.tsx`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `main.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09191919191919191 - nodes in this community are weakly interconnected._