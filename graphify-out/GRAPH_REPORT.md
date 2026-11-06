# Graph Report - res  (2026-11-06)

## Corpus Check
- 357 files · ~330,636 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 3036 nodes · 7849 edges · 153 communities (134 shown, 19 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 53 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b5a83cbc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- estoque/page.tsx
- 20261020000001_base.sql
- gestao/page.tsx
- main.ts
- nav-painel.tsx
- 20261021000014_caixa.sql
- Banco: impressão
- 20261027000032_fidelidade.sql
- Banco: estoque
- API aberta e MCP (rotas)
- salvando
- relatorios/page.tsx
- geo.ts
- fidelidade/actions.ts
- web/package.json
- CI (testes automáticos)
- app-motoboy.tsx
- gestao/actions.ts
- public.pedidos
- Decisões de arquitetura — RES
- criarClienteServidor
- gestao.ts
- aplicativos.tsx
- salvando
- importar-nfe.tsx
- Promoções e cupons (tela)
- quadro-pedidos.tsx
- steps
- financeiro/page.tsx
- Workflow do APK do motoboy
- evento.tsx
- server.ts
- acompanhar-pedido.tsx
- next
- Workflow do agente de impressão
- Montagem do cupom impresso
- editor-cardapio.tsx
- 20261028000052_gestao_empresarial.sql
- preco.ts
- painel-caixa.tsx
- Configuração TypeScript
- Banco: cupons e descontos
- Banco: Mercado Pago
- motoboy/package.json
- public.fin_lancamentos
- Grupo 45: package.json
- Grupo 46: package.json
- motoboy/scripts/ajustar-android.mjs
- 20261021000006_cardapio_digital.sql
- escpos.ts
- impressao.ts
- public.produtos
- index.ts
- src/caixa.ts
- beefood_para_res.py
- resumo/page.tsx
- cardapio-cliente.tsx
- graphify
- public.clientes
- cardapio-dados.ts
- saida.ts
- cardapio-cliente.tsx
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
- equipe.tsx
- painel/package.json
- Grupo 75: 99z_entregas_km.sql
- Grupo 76: 99zzzzzzzzzzzz_estoque.sql
- Grupo 77: 99zzzzzzzzzzzzzz_api.sql
- public.lojas
- Grupo 79: 99zzzzzzzzz_segmentos.sql
- Grupo 80: 90_agente.sql
- Grupo 81: 95_impressora_grupo.sql
- Grupo 82: 99zzzzzz_rastreio.sql
- salvando
- Grupo 84: 99zzzzzzzz_entregas_cliente.sql
- Grupo 85: 99zzzzzzzzzzzzz_aplicativos.sql
- Grupo 86: README.md
- Grupo 87: decisoes.md
- 99zzzzzzzzzzzzzzzz_vitrine.sql
- Grupo 89: 30_cardapio_digital.sql
- Grupo 90: 60_agendamento.sql
- public.produto_marcas
- Grupo 93: 99zzzzzzzzzzzzzzz_mercadopago.sql
- lancamentos.tsx
- 99zzzzzzzzzzzzzzzzzzz_gestao.sql
- Grupo 96: 70_caixa.sql
- 99zzzzzzzzzzzzzzzzz_taxa_km.sql
- contagem.tsx
- promocao.test.ts
- Grupo 100: tempos_ajuste.sql
- pedido.ts
- mapa-cliente.tsx
- gestao.ts
- meta-mes.tsx
- Grupo 105: next.config.mjs
- Grupo 106: vercel.json
- funcionarios.tsx
- Grupo 108: test-db.sh
- estoque/actions.ts
- rastreador.tsx
- salvando
- api.tsx
- funcionarios.tsx
- 99zzzzzzzzzzzzzzzzzzzzz_evento.sql
- ifood.tsx
- 20261106153000_marketplace_base.sql
- grafico-dias.tsx
- 99zzzzzzzzzzzzzzzzzzzz_equipe.sql
- middleware.ts
- public
- grafico-lojas.tsx
- contextoLoja
- 99zzzzzzzzzzzzzzzzzzzzzzz_financeiro.sql
- 20261028000056_evento.sql
- 20261021000008_multilojas.sql
- 99zzzzzzzzzzzzzzzzzzzzzz_quadro.sql
- 20261021000007_cardapio_biblioteca.sql
- 99_motoboy.sql
- agendamento.ts
- 99zzzzzzz_rota.sql
- [link]/page.tsx
- pg_temp.como
- sabores-pizza.tsx
- public.importar_cardapio
- movimentos.tsx
- anon
- pg_temp.como
- insumos.tsx
- ref_node_assert
- 99zzzzzzzzzzzzzzzzzzzzzzzzz_marketplace.sql
- 20261021000004_cardapio_edicao.sql
- private.importar_cardapio
- Multilojas (conta → lojas → marcas)

## God Nodes (most connected - your core abstractions)
1. `criarClienteServidor()` - 234 edges
2. `public.lojas` - 163 edges
3. `public.pedidos` - 137 edges
4. `public.marcas` - 127 edges
5. `contextoLoja` - 124 edges
6. `salvando()` - 121 edges
7. `formatarReais()` - 119 edges
8. `next` - 86 edges
9. `react` - 81 edges
10. `public.produtos` - 79 edges

## Surprising Connections (you probably didn't know these)
- `D-022 Combos com escolhas e categoria de up-sell` --references--> `calcularCombo()`  [INFERRED]
  docs/decisoes.md → packages/core/src/combo.ts
- `D-023 % por categoria, cupons e desconto no balcão com limite` --references--> `precoBase()`  [INFERRED]
  docs/decisoes.md → packages/core/src/preco.ts
- `D-011 Pedido agendado e taxa por bairro no painel` --references--> `taxaDoBairro()`  [INFERRED]
  docs/decisoes.md → packages/core/src/agendamento.ts
- `D-014 Impressão: fila no banco, regras como no BeeFood, navegador até o agente chegar` --references--> `montarCupom()`  [INFERRED]
  docs/decisoes.md → packages/core/src/cupom.ts
- `D-015 Agente de impressão do Windows (RES Impressão)` --references--> `montarCupom()`  [INFERRED]
  docs/decisoes.md → packages/core/src/cupom.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Rules duplicated in core and DB with shared test cases** — docs_decisoes_d_021_cardapio_cards_promo, docs_decisoes_d_022_combos_upsell, docs_decisoes_d_029_segmentos_clientes, docs_decisoes_d_030_telefone_nono_digito, docs_decisoes_d_031_fidelidade_grupo, docs_decisoes_core_db_parity [EXTRACTED 1.00]
- **Motoboy delivery flow (QR dispatch, app, tracking, routing)** — docs_decisoes_d_017_app_motoboy_qr, docs_decisoes_d_018_comanda_motoboy_pago, docs_decisoes_d_019_app_android_leitor_qr, docs_decisoes_d_026_rastreio_motoboys, docs_decisoes_d_027_rota_sugerida, apps_mobile_motoboy_readme_res_motoboy_android [INFERRED 0.85]
- **Stock management module (NF-e, recipes, counts, CMV)** — docs_decisoes_d_036_estoque_nfe_ficha, docs_decisoes_d_037_movimentacoes_estoque, docs_decisoes_d_038_meu_estoque_contagem, docs_decisoes_d_039_fechamento_cmv, docs_decisoes_d_040_ficha_sabor_pizza [INFERRED 0.85]

## Communities (153 total, 19 thin omitted)

### Community 0 - "estoque/page.tsx"
Cohesion: 0.13
Nodes (27): copiarFicha(), dynamic, Estoque(), dataCurta(), Fechamento(), pctTexto(), somaMes(), Alvo (+19 more)

### Community 1 - "20261020000001_base.sql"
Cohesion: 0.09
Nodes (28): grupos_acesso_atualizado, grupos_acesso_auditar, grupos_acesso_validar, lojas_atualizado, lojas_auditar, marcas_atualizado, marcas_auditar, marcas_loja_idx (+20 more)

### Community 2 - "gestao/page.tsx"
Cohesion: 0.15
Nodes (20): EscopoCustos, Aba, ABAS, dynamic, Gestao(), brl(), ler(), Linha (+12 more)

### Community 3 - "main.ts"
Cohesion: 0.12
Nodes (30): acharWindows(), alcance(), argumento(), ARQ_CONFIG, ARQ_LOG, atualizarSePrecisar(), atualizarWindows(), Config (+22 more)

### Community 4 - "nav-painel.tsx"
Cohesion: 0.10
Nodes (23): fonte, metadata, PainelLayout(), trocarLoja(), dadosNovoPedido(), BARRA, COR_SECAO, Icone() (+15 more)

### Community 5 - "20261021000014_caixa.sql"
Cohesion: 0.06
Nodes (49): caixa_movimentos_sessao_idx, caixa_sessoes_auditar, caixa_sessoes_loja_idx, caixa_sessoes_uma_aberta_idx, caixas_auditar, caixas_nome_idx, lojas_caixa_inicial, pedidos_caixa_idx (+41 more)

### Community 6 - "Banco: impressão"
Cohesion: 0.06
Nodes (48): impressao_config_auditar, impressao_destinos_loja_idx, impressoes_loja_idx, impressoes_pedido_idx, impressoes_pendentes_idx, impressoras_auditar, impressoras_nome_idx, pedidos_imprimir_ao_aceitar (+40 more)

### Community 7 - "20261027000032_fidelidade.sql"
Cohesion: 0.07
Nodes (40): fidelidade_mov_cliente_idx, fidelidade_mov_grupo_idx, fidelidade_mov_pedido_idx, fidelidade_recompensas_grupo_idx, pedidos_fidelidade, private.aplicar_cupom(), private.aplicar_fidelidade(), private.fidelidade_status() (+32 more)

### Community 8 - "Banco: estoque"
Cohesion: 0.09
Nodes (33): private.cupom_da_loja(), estoque_mov_estoque_idx, estoque_mov_insumo_idx, estoque_mov_pedido_idx, fichas_opcao_idx, fichas_produto_idx, insumos_estoque_idx, pedidos_estoque (+25 more)

### Community 9 - "API aberta e MCP (rotas)"
Cohesion: 0.08
Nodes (33): DELETE, POST(), DELETE, POST(), GET(), OPTIONS, GET(), OPTIONS (+25 more)

### Community 10 - "salvando"
Cohesion: 0.09
Nodes (43): ConfigImpressao, DadosImpressora, excluirImpressora(), gerarCodigoAgente(), imprimirPedido(), imprimirTeste(), marcarImpressao(), msg() (+35 more)

### Community 11 - "relatorios/page.tsx"
Cohesion: 0.09
Nodes (29): Aba, ABAS, Cancelado, Cor, CORES_BARRA, corTempo(), dataBR(), dynamic (+21 more)

### Community 12 - "geo.ts"
Cohesion: 0.13
Nodes (19): chegadas(), espera(), montar(), painelMotoboy(), planejarRota(), dynamic, maxDuration, Motoboy() (+11 more)

### Community 13 - "fidelidade/actions.ts"
Cohesion: 0.07
Nodes (58): ajustarSaldo(), buscarSaldos(), copiarPrograma(), excluirRecompensa(), extratoCliente(), R, saldoDoCliente(), salvarConfigFidelidade() (+50 more)

### Community 14 - "web/package.json"
Cohesion: 0.06
Nodes (36): config, PUBLICAS, dependencies, jsqr@1.4.0, next@^15.5.9, qrcode@^1.5.4, react@^19.2.1, react-dom@^19.2.1 (+28 more)

### Community 15 - "CI (testes automáticos)"
Cohesion: 0.07
Nodes (34): name, runs-on, services, steps, DATABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, POSTGRES_PASSWORD (+26 more)

### Community 16 - "app-motoboy.tsx"
Cohesion: 0.14
Nodes (28): despachar(), entregar(), medirEntrega(), PlanoRota, dynamic, metadata, PaginaDespacho(), Acerto() (+20 more)

### Community 17 - "gestao/actions.ts"
Cohesion: 0.27
Nodes (16): excluirRegistro(), FuncionarioForm, lojaGestor(), R, RegistroForm, salvarCustos(), salvarEmpresa(), salvarFuncionario() (+8 more)

### Community 18 - "public.pedidos"
Cohesion: 0.04
Nodes (52): pedido_eventos_pedido_idx, pedido_item_opcoes_item_idx, pedido_itens_pedido_idx, pedidos_atualizado, pedidos_loja_status_idx, private.contador_pedidos, public.mudar_status_pedido(), public.pedido_eventos (+44 more)

### Community 19 - "Decisões de arquitetura — RES"
Cohesion: 0.06
Nodes (34): D-002 Modelo multiloja: Loja → Marcas, D-003 Regras de cadastro valem no banco e no formulário, D-004 Auditoria calculada no servidor, D-005 Operações compostas são atômicas, D-006 Gravar só em ação explícita, D-007 Texto em UTF-8 completo, D-008 Nenhum segredo de integração no navegador, D-009 Preço de itens com grupos (decisão provisória, Q-009) (+26 more)

### Community 20 - "criarClienteServidor"
Cohesion: 0.26
Nodes (14): convidar(), criarCardapio(), criarLoja(), definirCidade(), msg(), R, CartaoLoja(), Conta (+6 more)

### Community 21 - "gestao.ts"
Cohesion: 0.24
Nodes (13): dias(), Documento(), dynamic, BotaoImprimir(), hoje(), Registros(), dataBr(), dataExtenso() (+5 more)

### Community 22 - "aplicativos.tsx"
Cohesion: 0.11
Nodes (29): conectarMercadoPago(), desconectarMercadoPago(), mpAceitarAoPagar(), R, removerIntegracao(), salvarIntegracao(), salvarLinkGrupo(), dynamic (+21 more)

### Community 23 - "salvando"
Cohesion: 0.23
Nodes (14): ajustarEntrega(), CartaoMotoboy(), FechamentoMotoboys(), FONTE, hora(), LinhaEntrega(), Numero(), Total (+6 more)

### Community 24 - "importar-nfe.tsx"
Cohesion: 0.16
Nodes (24): importarNFe(), vinculosFornecedor(), cnpjTexto(), dataTexto(), ImportarNFe(), lerFator(), Linha, D-036 · Estoque: entrada por NF-e e baixa pela ficha técnica (+16 more)

### Community 25 - "Promoções e cupons (tela)"
Cohesion: 0.12
Nodes (38): agenda(), alternarCupom(), alternarFreteGratis(), CupomForm, excluirCupom(), excluirFreteGratis(), excluirPromoCategoria(), fim() (+30 more)

### Community 26 - "quadro-pedidos.tsx"
Cohesion: 0.06
Nodes (29): cuponsPendentes(), marcarAviso(), dynamic, Pedidos(), abrirWhatsApp(), AvisarTodos(), bipar(), CartaoPedido() (+21 more)

### Community 27 - "steps"
Cohesion: 0.08
Nodes (24): runs-on, steps, GH_TOKEN, KS_B64, KS_PASS, jobs, apk, name (+16 more)

### Community 28 - "financeiro/page.tsx"
Cohesion: 0.07
Nodes (76): configCustos(), criarLancamento(), donoFin(), editarLancamento(), excluirLancamento(), gerarContasCustos(), lancarNfe(), marcarPago() (+68 more)

### Community 29 - "Workflow do APK do motoboy"
Cohesion: 0.08
Nodes (24): runs-on, steps, GH_TOKEN, KS_B64, KS_PASS, jobs, apk, name (+16 more)

### Community 30 - "evento.tsx"
Cohesion: 0.12
Nodes (35): AjusteProduto, copiarParaEvento(), criarEvento(), msg(), R, refrescar(), removerProdutoEvento(), salvarEvento() (+27 more)

### Community 31 - "server.ts"
Cohesion: 0.14
Nodes (19): LayoutMotoboy(), metadata, viewport, ConfigDelivery, definirStatus(), replicarHorarios(), salvarConfig(), salvarVitrine() (+11 more)

### Community 32 - "acompanhar-pedido.tsx"
Cohesion: 0.10
Nodes (30): POST(), conferirPixMercadoPago(), pixMercadoPago(), dynamic, metadata, PaginaAcompanhar(), AcompanharPedido(), ExtrasPedido (+22 more)

### Community 33 - "next"
Cohesion: 0.13
Nodes (31): AreaForm, calcularKmBairro(), FaixaForm, localizarLoja(), R, salvarAreas(), salvarFaixasKm(), salvarLocalLoja() (+23 more)

### Community 34 - "Workflow do agente de impressão"
Cohesion: 0.09
Nodes (21): GH_TOKEN, runs-on, steps, jobs, exe, name, on, push (+13 more)

### Community 35 - "Montagem do cupom impresso"
Cohesion: 0.12
Nodes (23): D-014 Impressão: fila no banco, regras como no BeeFood, navegador até o agente chegar, D-015 Agente de impressão do Windows (RES Impressão), blocosCombo(), colunasLR(), cupomTexto(), dataHora(), FRACAO, fracaoTexto() (+15 more)

### Community 36 - "editor-cardapio.tsx"
Cohesion: 0.14
Nodes (30): mover(), PassoForm, Resultado, AplicarGrupo(), EditorCardapio(), Marca, Painel, EditorCombo() (+22 more)

### Community 37 - "20261028000052_gestao_empresarial.sql"
Cohesion: 0.20
Nodes (15): custos_auditar, custos_loja_idx, funcionario_registros_idx, funcionario_registros_numero, funcionarios_loja_idx, gestao_empresa_auditar, private.contadores_registro, private.numerar_registro() (+7 more)

### Community 38 - "preco.ts"
Cohesion: 0.13
Nodes (30): buscarClientes(), GruposBalcao(), ItemCarrinho, lerCentavos(), Montador(), MontadorCombo(), NovoPedido(), paraCampoData() (+22 more)

### Community 39 - "painel-caixa.tsx"
Cohesion: 0.09
Nodes (46): abrirCaixa(), fecharCaixa(), movimentar(), msg(), R, salvarCaixa(), vincularSemCaixa(), dynamic (+38 more)

### Community 40 - "Configuração TypeScript"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 41 - "Banco: cupons e descontos"
Cohesion: 0.14
Nodes (15): cupons_auditar, cupons_codigo_idx, pedidos_cupom_idx, private.agenda_vale(), private.aplicar_cupom(), private.desconto_categoria_pct(), private.desconto_cupom(), promocoes_categoria_auditar (+7 more)

### Community 42 - "Banco: Mercado Pago"
Cohesion: 0.16
Nodes (13): mp_pagamentos_pedido_idx, public.desconectar_mp(), public.mp_contas, public.mp_pagamentos, public.mp_status(), public.salvar_mp(), public.mp_aceitar_ao_pagar(), public.mp_status() (+5 more)

### Community 43 - "motoboy/package.json"
Cohesion: 0.14
Nodes (17): dependencies, @capacitor/android@6.2.0, @capacitor/app@6.0.2, @capacitor/cli@6.2.0, @capacitor-community/background-geolocation@1.2.26, @capacitor/core@6.2.0, description, @capacitor/android (+9 more)

### Community 44 - "public.fin_lancamentos"
Cohesion: 0.08
Nodes (39): public.custos, custos_auditar, custos_auditar_apagar, public.gestao_conta, public.preparar_gestao_grupo(), fin_fornecedores_doc, fin_lanc_comp, fin_lanc_origem (+31 more)

### Community 45 - "Grupo 45: package.json"
Cohesion: 0.14
Nodes (17): description, devDependencies, esbuild@0.24.0, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, tsx, @types/node (+9 more)

### Community 46 - "Grupo 46: package.json"
Cohesion: 0.13
Nodes (17): description, devDependencies, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, exports, tsx, @types/node (+9 more)

### Community 47 - "motoboy/scripts/ajustar-android.mjs"
Cohesion: 0.17
Nodes (11): adapt, app, g, gradle, m, man, permissoes, res (+3 more)

### Community 48 - "20261021000006_cardapio_digital.sql"
Cohesion: 0.27
Nodes (9): areas_entrega_auditar, marca_horarios_auditar, private.marca_aberta(), public.areas_entrega, public.cardapio_publico(), public.criar_pedido_publico(), public.marca_horarios, public.salvar_config_delivery() (+1 more)

### Community 49 - "escpos.ts"
Cohesion: 0.24
Nodes (10): codificar(), CP850, CP860, ESC_T, Pagina, semAcento(), ConfigImpressora, gerarEscPos() (+2 more)

### Community 50 - "impressao.ts"
Cohesion: 0.31
Nodes (9): colunasNavegador(), CSS_CUPOM, cupomHtml(), esc(), imprimirNoNavegador(), linhasDoCupom(), qrsDosCupons(), CupomTeste (+1 more)

### Community 51 - "public.produtos"
Cohesion: 0.16
Nodes (31): public.complementos, public.criar_grupo_vinculado(), public.grupos_opcoes, public.opcoes, public.produto_grupos, public.produtos, public.vincular_grupo(), private.preco_item() (+23 more)

### Community 52 - "index.ts"
Cohesion: 0.15
Nodes (26): exportarClientes(), listarClientes(), salvarCliente(), Clientes(), dynamic, baixarCsv(), FichaCliente(), ListaClientes() (+18 more)

### Community 53 - "src/caixa.ts"
Cohesion: 0.52
Nodes (4): cadastrar(), credenciais(), entrar(), emailDeLogin()

### Community 54 - "beefood_para_res.py"
Cohesion: 0.33
Nodes (3): converter(), limpa(), L()

### Community 55 - "resumo/page.tsx"
Cohesion: 0.20
Nodes (19): Composicao, ComposicaoVendas(), dataBR(), dynamic, Kpi(), Metricas, PRESETS, Resumo (+11 more)

### Community 56 - "cardapio-cliente.tsx"
Cohesion: 0.11
Nodes (24): carregar(), dynamic, generateMetadata(), PaginaCardapio(), FreteGratisPublico, acrescimo(), cheio(), completo() (+16 more)

### Community 58 - "public.clientes"
Cohesion: 0.08
Nodes (30): clientes_auditar, clientes_grupo_nome_idx, pedidos_cliente_idx, pedidos_registra_cliente, private.grupo_da_loja(), private.pedido_registra_cliente(), public.buscar_clientes(), public.cliente_enderecos (+22 more)

### Community 59 - "cardapio-dados.ts"
Cohesion: 0.16
Nodes (19): c(), dynamic, Promocoes(), CupomLinha, FreteGratisLinha, PromoCategoriaLinha, PromoProdutoLinha, UsoCupom (+11 more)

### Community 60 - "saida.ts"
Cohesion: 0.11
Nodes (15): adapt, app, g, gradle, m, man, res, run (+7 more)

### Community 61 - "cardapio-cliente.tsx"
Cohesion: 0.09
Nodes (46): calcularEntregaKm(), conferirCupom(), EntregaKm, enviarPedido(), FaixaKm, programaFidelidade(), saldoFidelidade(), situacaoPedidos() (+38 more)

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
Cohesion: 0.13
Nodes (14): pedidos.qr_token (/m/d/<código>), Colocar no ar, Estrutura, GitHub Actions CI (rules, db, build), O que já funciona, packages/core (business rules TS), Pacotes (equipe RES), Roadmap stages 3c-7 and integrations (+6 more)

### Community 66 - "Grupo 66: decisoes.md"
Cohesion: 0.22
Nodes (3): D-042 · Aplicativos, montarCupom (core coupon builder), Digital menu (/c/<endereço>)

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

### Community 73 - "equipe.tsx"
Cohesion: 0.13
Nodes (24): alterarFuncao(), cancelarConvite(), definirAtivo(), salvarPermissoesEquipe(), trocarSenhaUsuario(), ABAS, dynamic, Lojas() (+16 more)

### Community 74 - "painel/package.json"
Cohesion: 0.16
Nodes (15): dependencies, @capacitor/android@6.2.0, @capacitor/app@6.0.2, @capacitor/cli@6.2.0, @capacitor/core@6.2.0, description, @capacitor/android, @capacitor/app (+7 more)

### Community 75 - "Grupo 75: 99z_entregas_km.sql"
Cohesion: 0.39
Nodes (7): ids, pg_temp.como(), pg_temp.id(), pg_temp.token(), pg_temp.v(), saida, tokens

### Community 76 - "Grupo 76: 99zzzzzzzzzzzz_estoque.sql"
Cohesion: 0.33
Nodes (7): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), s1, s2, saida

### Community 77 - "Grupo 77: 99zzzzzzzzzzzzzz_api.sql"
Cohesion: 0.39
Nodes (7): chaves, ids, pg_temp.como(), pg_temp.id(), pg_temp.k(), pg_temp.v(), saida

### Community 78 - "public.lojas"
Cohesion: 0.07
Nodes (61): public.lojas, public.marcas, public.criar_pedido(), public.pedido_item_opcoes, public.pedido_itens, public.acompanhar_pedido(), private.limite_lojas(), public.replicar_horarios() (+53 more)

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

### Community 83 - "salvando"
Cohesion: 0.38
Nodes (6): BotaoExcluir(), ModoEstoque(), RC, CARDAPIO, salvando(), react

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

### Community 91 - "public.produto_marcas"
Cohesion: 0.13
Nodes (14): public.produto_marcas, public.compartilhar_catalogo(), private.preco_item(), public.compartilhar_catalogo(), public.duplicar_produto(), combo_passos_auditar, combo_passos_combo_idx, private.preco_combo() (+6 more)

### Community 93 - "Grupo 93: 99zzzzzzzzzzzzzzz_mercadopago.sql"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 94 - "lancamentos.tsx"
Cohesion: 0.60
Nodes (4): ids, pg_temp.como(), pg_temp.id(), pg_temp.vale()

### Community 95 - "99zzzzzzzzzzzzzzzzzzz_gestao.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 96 - "Grupo 96: 70_caixa.sql"
Cohesion: 0.47
Nodes (4): ids, pg_temp.como(), pg_temp.id(), saida

### Community 97 - "99zzzzzzzzzzzzzzzzz_taxa_km.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 98 - "contagem.tsx"
Cohesion: 0.33
Nodes (8): salvarContagem(), Contagem(), NovoItem(), num(), Origem, ContagemPainel, UnidadeEstoque, UNIDADES_ESTOQUE

### Community 99 - "promocao.test.ts"
Cohesion: 0.24
Nodes (11): D-021 Cardápio novo: cards com foto e promoção De/Por com agenda, AgendaPromo, diaAnterior(), diaDaSemana(), DIAS_CURTOS, partesLocais(), promoEncerrada(), promoVale() (+3 more)

### Community 101 - "pedido.ts"
Cohesion: 0.18
Nodes (17): PedidoCliente, NovoPedido, CupomDados, acaoAvancar(), ErroPedido, FormaPagamento, LinhaTotal, proximosStatus() (+9 more)

### Community 102 - "mapa-cliente.tsx"
Cohesion: 0.13
Nodes (22): AoVivo, MotoboyAoVivo, rastreioAoVivo(), diaDoTurno(), dynamic, Entregas(), CORES, haQuanto() (+14 more)

### Community 103 - "gestao.ts"
Cohesion: 0.08
Nodes (31): DadosGrupo, salvarDetalheOpcao(), salvarSetor(), DetalheOpcao(), FORMACOES, GrupoInicial, lerPreco(), mostrarPreco() (+23 more)

### Community 104 - "meta-mes.tsx"
Cohesion: 0.27
Nodes (10): salvarMeta(), ler(), MESES, MetaMes(), pct(), calcularMeta(), DadosMeta, diaUTC() (+2 more)

### Community 107 - "funcionarios.tsx"
Cohesion: 0.17
Nodes (14): espera(), LoteSugerido, sugerirLotes(), SugestaoLoja, SugestaoLotes(), D-028 · Cliente acompanha a entrega, prazo por loja, alerta e lotes na expedição, tempos e atrasos, agruparEntregas(), Lote (+6 more)

### Community 116 - "estoque/actions.ts"
Cohesion: 0.33
Nodes (9): ajustarEstoque(), definirModoEstoque(), excluirInsumo(), feito(), ItemImportar, R, salvarFatoresSabor(), salvarFicha() (+1 more)

### Community 117 - "rastreador.tsx"
Cohesion: 0.33
Nodes (7): cap(), Capacitor, EstadoRastreio, FaixaRastreio(), useRastreio(), Watcher, clienteNavegador()

### Community 118 - "salvando"
Cohesion: 0.15
Nodes (30): GET(), POST(), criarLoja(), alterarDisponibilidade(), CategoriaOrigem, criarProduto(), definirFoto(), definirFotoOpcao() (+22 more)

### Community 119 - "api.tsx"
Cohesion: 0.23
Nodes (17): criarChaveApi(), excluirWebhook(), revogarChaveApi(), salvarWebhook(), testarWebhook(), copiar(), ENDPOINTS, FormWebhook() (+9 more)

### Community 120 - "funcionarios.tsx"
Cohesion: 0.28
Nodes (16): ligarFicha(), criarUsuarioCaixa(), Assistente(), CartaoAcesso(), Equipe(), doFuncionario(), Funcionarios(), ModoAcesso (+8 more)

### Community 121 - "99zzzzzzzzzzzzzzzzzzzzz_evento.sql"
Cohesion: 0.32
Nodes (5): ids, pg_temp.id(), pg_temp.v(), quando, saida

### Community 122 - "ifood.tsx"
Cohesion: 0.07
Nodes (46): dynamic, GET(), dynamic, POST(), desligarLojaIfood(), fim(), ligarItemIfood(), R (+38 more)

### Community 123 - "20261106153000_marketplace_base.sql"
Cohesion: 0.19
Nodes (13): pedidos_externo_idx, pedidos_marketplace, private.enfileirar_marketplace(), private.marketplace_eventos, private.pedido_para_marketplace(), private.produto_do_marketplace(), public.marketplace_itens, public.marketplace_lojas (+5 more)

### Community 125 - "grafico-dias.tsx"
Cohesion: 0.33
Nodes (8): DiaLojas, DIAS, GraficoDias(), LojaCor, pedidosDia(), rotulo(), semana(), totalDia()

### Community 126 - "99zzzzzzzzzzzzzzzzzzzz_equipe.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 127 - "middleware.ts"
Cohesion: 0.60
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 129 - "public"
Cohesion: 0.16
Nodes (21): complementos_loja_idx, grupos_opcoes_loja_idx, opcoes_grupo_idx, private.setor_exige_marca(), produto_grupos_grupo_idx, produtos_loja_setor_idx, public.criar_produto(), public.salvar_setor() (+13 more)

### Community 130 - "grafico-lojas.tsx"
Cohesion: 0.33
Nodes (8): curto(), formatar(), GraficoLojas(), LojaDesempenho, Metrica, METRICAS, valor(), formatarVariacao()

### Community 131 - "contextoLoja"
Cohesion: 0.19
Nodes (17): Cardapio(), dynamic, autorizarDesconto(), criarPedido(), definirAceiteAutomatico(), definirMovimento(), definirProntoAuto(), marcarPago() (+9 more)

### Community 132 - "99zzzzzzzzzzzzzzzzzzzzzzz_financeiro.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 133 - "20261028000056_evento.sql"
Cohesion: 0.25
Nodes (7): pedidos_a_evento_periodo, private.limite_cardapios(), private.pedido_no_periodo_do_evento(), private.produto_de_evento(), public.criar_evento(), public.evento_publico(), public.salvar_evento()

### Community 134 - "20261021000008_multilojas.sql"
Cohesion: 0.07
Nodes (34): contas_atualizado, contas_proteger_plano, contas_titulares_user_idx, lojas_conta_idx, lojas_limite, marcas_limite, pedidos_loja_criado_idx, private.e_titular() (+26 more)

### Community 135 - "99zzzzzzzzzzzzzzzzzzzzzz_quadro.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 136 - "20261021000007_cardapio_biblioteca.sql"
Cohesion: 0.47
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 137 - "99_motoboy.sql"
Cohesion: 0.39
Nodes (7): ids, pg_temp.como(), pg_temp.id(), pg_temp.token(), pg_temp.v(), saida, tokens

### Community 138 - "agendamento.ts"
Cohesion: 0.47
Nodes (7): chaveBairro(), dataNoFuso(), faseAgendamento, horaNoFuso(), partes(), rotuloHorario(), taxaDoBairro()

### Community 139 - "99zzzzzzz_rota.sql"
Cohesion: 0.43
Nodes (6): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida, tok

### Community 140 - "[link]/page.tsx"
Cohesion: 0.47
Nodes (5): carregar(), dynamic, generateMetadata(), Grupo, PaginaGrupo()

### Community 141 - "pg_temp.como"
Cohesion: 0.60
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 142 - "sabores-pizza.tsx"
Cohesion: 0.26
Nodes (14): salvarInsumo(), amigavel(), Como(), diametro(), EditorSabor(), fmt(), Linha, num() (+6 more)

### Community 143 - "public.importar_cardapio"
Cohesion: 0.15
Nodes (3): public.duplicar_produto(), public.duplicar_setor(), public.importar_cardapio()

### Community 144 - "movimentos.tsx"
Cohesion: 0.33
Nodes (8): buscarMovimentos(), FiltroMovimentos, hoje(), menos(), Movimentacoes(), quando(), ROTULO, TIPOS

### Community 145 - "anon"
Cohesion: 0.11
Nodes (19): public.resumo_vendas(), public.relatorio_entregas(), public.relatorio_fidelidade(), private.periodo_api(), private.webhooks_pedido(), private.retiradas_prontas(), public.definir_pronto_auto(), public.meta_vendas() (+11 more)

### Community 146 - "pg_temp.como"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 148 - "insumos.tsx"
Cohesion: 0.49
Nodes (9): Ajuste(), confirmarExclusao(), FormInsumo(), LinhaInsumo(), ListaInsumos(), num(), SIT, n() (+1 more)

### Community 149 - "ref_node_assert"
Cohesion: 0.39
Nodes (7): campo(), crc16Pix(), FORMATOS_RASTREAMENTO, normalizarChavePix(), pixCopiaECola(), semAcento(), TipoChavePix

### Community 151 - "99zzzzzzzzzzzzzzzzzzzzzzzzz_marketplace.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 152 - "20261021000004_cardapio_edicao.sql"
Cohesion: 0.33
Nodes (3): public.criar_grupo_vinculado(), public.desvincular_grupo(), public.reordenar()

### Community 153 - "private.importar_cardapio"
Cohesion: 0.67
Nodes (3): private.importacoes, private.importar_cardapio(), pg_temp.k()

## Knowledge Gaps
- **9 isolated node(s):** `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `pedidos.qr_token (/m/d/<código>)`, `GitHub Actions CI (rules, db, build)`, `Roadmap stages 3c-7 and integrations`, `supabase/migrations (Postgres RLS, audit, atomic ops)` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 748 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `nav-painel.tsx` to `estoque/page.tsx`, `gestao/page.tsx`, `contextoLoja`, `API aberta e MCP (rotas)`, `salvando`, `relatorios/page.tsx`, `[link]/page.tsx`, `fidelidade/actions.ts`, `web/package.json`, `sabores-pizza.tsx`, `app-motoboy.tsx`, `gestao/actions.ts`, `criarClienteServidor`, `gestao.ts`, `aplicativos.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `financeiro/page.tsx`, `evento.tsx`, `server.ts`, `acompanhar-pedido.tsx`, `next`, `preco.ts`, `painel-caixa.tsx`, `index.ts`, `src/caixa.ts`, `resumo/page.tsx`, `cardapio-cliente.tsx`, `cardapio-cliente.tsx`, `equipe.tsx`, `salvando`, `mapa-cliente.tsx`, `meta-mes.tsx`, `estoque/actions.ts`, `salvando`, `api.tsx`, `ifood.tsx`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **What connects `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `pedidos.qr_token (/m/d/<código>)`, `GitHub Actions CI (rules, db, build)` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `estoque/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12903225806451613 - nodes in this community are weakly interconnected._
- **Why does `criarClienteServidor()` connect `salvando` to `estoque/page.tsx`, `gestao/page.tsx`, `contextoLoja`, `nav-painel.tsx`, `salvando`, `relatorios/page.tsx`, `[link]/page.tsx`, `geo.ts`, `sabores-pizza.tsx`, `fidelidade/actions.ts`, `app-motoboy.tsx`, `movimentos.tsx`, `gestao/actions.ts`, `criarClienteServidor`, `gestao.ts`, `aplicativos.tsx`, `salvando`, `importar-nfe.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `financeiro/page.tsx`, `evento.tsx`, `server.ts`, `acompanhar-pedido.tsx`, `next`, `editor-cardapio.tsx`, `preco.ts`, `painel-caixa.tsx`, `index.ts`, `src/caixa.ts`, `resumo/page.tsx`, `cardapio-cliente.tsx`, `cardapio-dados.ts`, `cardapio-cliente.tsx`, `equipe.tsx`, `contagem.tsx`, `mapa-cliente.tsx`, `gestao.ts`, `meta-mes.tsx`, `funcionarios.tsx`, `estoque/actions.ts`, `api.tsx`, `funcionarios.tsx`, `ifood.tsx`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Should `20261020000001_base.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.08558558558558559 - nodes in this community are weakly interconnected._
- **Why does `formatarReais()` connect `acompanhar-pedido.tsx` to `estoque/page.tsx`, `grafico-lojas.tsx`, `nav-painel.tsx`, `relatorios/page.tsx`, `fidelidade/actions.ts`, `sabores-pizza.tsx`, `movimentos.tsx`, `app-motoboy.tsx`, `insumos.tsx`, `aplicativos.tsx`, `salvando`, `importar-nfe.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `server.ts`, `next`, `Montagem do cupom impresso`, `editor-cardapio.tsx`, `preco.ts`, `painel-caixa.tsx`, `index.ts`, `resumo/page.tsx`, `cardapio-cliente.tsx`, `cardapio-cliente.tsx`, `contagem.tsx`, `gestao.ts`, `meta-mes.tsx`, `ifood.tsx`, `grafico-dias.tsx`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Should `gestao/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14624505928853754 - nodes in this community are weakly interconnected._