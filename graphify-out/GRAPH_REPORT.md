# Graph Report - res  (2026-11-06)

## Corpus Check
- 357 files · ~330,636 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 3009 nodes · 7827 edges · 155 communities (134 shown, 21 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 53 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2499bc86`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- estoque/page.tsx
- 20261028000040_api_webhooks.sql
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
- novo-pedido.tsx
- aplicativos.tsx
- salvando
- importar-nfe.tsx
- Promoções e cupons (tela)
- quadro-pedidos.tsx
- steps
- financeiro/page.tsx
- Workflow do APK do motoboy
- evento.tsx
- salvando
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
- public.setores
- escpos.ts
- 20261027000026_rastreio_motoboys.sql
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
- [slug]/actions.ts
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
- public.marcas
- Grupo 79: 99zzzzzzzzz_segmentos.sql
- Grupo 80: 90_agente.sql
- Grupo 81: 95_impressora_grupo.sql
- Grupo 82: 99zzzzzz_rastreio.sql
- 20261021000005_pedidos.sql
- Grupo 84: 99zzzzzzzz_entregas_cliente.sql
- Grupo 85: 99zzzzzzzzzzzzz_aplicativos.sql
- Grupo 86: README.md
- Grupo 87: decisoes.md
- 99zzzzzzzzzzzzzzzz_vitrine.sql
- Grupo 89: 30_cardapio_digital.sql
- Grupo 90: 60_agendamento.sql
- public.combo_passos
- Grupo 93: 99zzzzzzzzzzzzzzz_mercadopago.sql
- lancamentos.tsx
- 99zzzzzzzzzzzzzzzzzzz_gestao.sql
- Grupo 96: 70_caixa.sql
- 99zzzzzzzzzzzzzzzzz_taxa_km.sql
- editor-combo.tsx
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
- marketplace.ts
- salvando
- api.tsx
- lojas/page.tsx
- 99zzzzzzzzzzzzzzzzzzzzz_evento.sql
- ifood.ts
- 20261106153000_marketplace_base.sql
- grafico-dias.tsx
- 99zzzzzzzzzzzzzzzzzzzz_equipe.sql
- middleware.ts
- public
- grafico-lojas.tsx
- contextoLoja
- 99zzzzzzzzzzzzzzzzzzzzzzz_financeiro.sql
- ifood.tsx
- 20261021000008_multilojas.sql
- 99zzzzzzzzzzzzzzzzzzzzzz_quadro.sql
- 20261021000007_cardapio_biblioteca.sql
- 99_motoboy.sql
- O que o RES faz (novembro/2026)
- 99zzzzzzz_rota.sql
- [link]/page.tsx
- pg_temp.como
- sabores-pizza.tsx
- public.importar_cardapio
- movimentos.tsx
- 20261101000067_cupom_area_frete.sql
- v_fuso
- conta-cliente.tsx
- insumos.tsx
- ref_node_assert
- rota.ts
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
- `D-011 Pedido agendado e taxa por bairro no painel` --references--> `taxaDoBairro()`  [INFERRED]
  docs/decisoes.md → packages/core/src/agendamento.ts
- `D-022 Combos com escolhas e categoria de up-sell` --references--> `calcularCombo()`  [INFERRED]
  docs/decisoes.md → packages/core/src/combo.ts
- `D-023 % por categoria, cupons e desconto no balcão com limite` --references--> `precoBase()`  [INFERRED]
  docs/decisoes.md → packages/core/src/preco.ts
- `Ambiente no ar (piloto)` --references--> `main()`  [INFERRED]
  README.md → packages/agente/src/main.ts
- `D-014 Impressão: fila no banco, regras como no BeeFood, navegador até o agente chegar` --references--> `montarCupom()`  [INFERRED]
  docs/decisoes.md → packages/core/src/cupom.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Rules duplicated in core and DB with shared test cases** — docs_decisoes_d_021_cardapio_cards_promo, docs_decisoes_d_022_combos_upsell, docs_decisoes_d_029_segmentos_clientes, docs_decisoes_d_030_telefone_nono_digito, docs_decisoes_d_031_fidelidade_grupo, docs_decisoes_core_db_parity [EXTRACTED 1.00]
- **Motoboy delivery flow (QR dispatch, app, tracking, routing)** — docs_decisoes_d_017_app_motoboy_qr, docs_decisoes_d_018_comanda_motoboy_pago, docs_decisoes_d_019_app_android_leitor_qr, docs_decisoes_d_026_rastreio_motoboys, docs_decisoes_d_027_rota_sugerida, apps_mobile_motoboy_readme_res_motoboy_android [INFERRED 0.85]
- **Stock management module (NF-e, recipes, counts, CMV)** — docs_decisoes_d_036_estoque_nfe_ficha, docs_decisoes_d_037_movimentacoes_estoque, docs_decisoes_d_038_meu_estoque_contagem, docs_decisoes_d_039_fechamento_cmv, docs_decisoes_d_040_ficha_sabor_pizza [INFERRED 0.85]

## Communities (155 total, 21 thin omitted)

### Community 0 - "estoque/page.tsx"
Cohesion: 0.15
Nodes (26): copiarFicha(), dynamic, Estoque(), dataCurta(), Fechamento(), pctTexto(), somaMes(), Alvo (+18 more)

### Community 1 - "20261028000040_api_webhooks.sql"
Cohesion: 0.10
Nodes (23): private.total_contagem(), pedidos_webhooks, private.disparar_webhook(), private.loja_da_chave(), private.processar_webhooks(), private.webhooks_pedido(), public.api_chaves, public.api_estoque() (+15 more)

### Community 2 - "gestao/page.tsx"
Cohesion: 0.16
Nodes (19): EscopoCustos, Aba, ABAS, dynamic, Gestao(), brl(), ler(), Linha (+11 more)

### Community 3 - "main.ts"
Cohesion: 0.12
Nodes (30): acharWindows(), alcance(), argumento(), ARQ_CONFIG, ARQ_LOG, atualizarSePrecisar(), atualizarWindows(), Config (+22 more)

### Community 4 - "nav-painel.tsx"
Cohesion: 0.09
Nodes (25): fonte, metadata, PainelLayout(), trocarLoja(), dadosNovoPedido(), BARRA, COR_SECAO, Icone() (+17 more)

### Community 5 - "20261021000014_caixa.sql"
Cohesion: 0.05
Nodes (54): grupos_acesso_atualizado, grupos_acesso_auditar, grupos_acesso_validar, lojas_atualizado, lojas_auditar, marcas_atualizado, marcas_auditar, marcas_loja_idx (+46 more)

### Community 6 - "Banco: impressão"
Cohesion: 0.06
Nodes (48): impressao_config_auditar, impressao_destinos_loja_idx, impressoes_loja_idx, impressoes_pedido_idx, impressoes_pendentes_idx, impressoras_auditar, impressoras_nome_idx, pedidos_imprimir_ao_aceitar (+40 more)

### Community 7 - "20261027000032_fidelidade.sql"
Cohesion: 0.07
Nodes (37): fidelidade_mov_cliente_idx, fidelidade_mov_grupo_idx, fidelidade_mov_pedido_idx, fidelidade_recompensas_grupo_idx, pedidos_fidelidade, private.expirar_fidelidade(), private.fidelidade_status(), private.recompensas_json() (+29 more)

### Community 8 - "Banco: estoque"
Cohesion: 0.09
Nodes (33): estoque_mov_estoque_idx, estoque_mov_insumo_idx, estoque_mov_pedido_idx, fichas_opcao_idx, fichas_produto_idx, insumos_estoque_idx, pedidos_estoque, private.consumo_pedido() (+25 more)

### Community 9 - "API aberta e MCP (rotas)"
Cohesion: 0.08
Nodes (33): DELETE, POST(), DELETE, POST(), GET(), OPTIONS, GET(), OPTIONS (+25 more)

### Community 10 - "salvando"
Cohesion: 0.07
Nodes (56): ConfigImpressao, DadosImpressora, excluirImpressora(), gerarCodigoAgente(), imprimirPedido(), imprimirTeste(), marcarImpressao(), msg() (+48 more)

### Community 11 - "relatorios/page.tsx"
Cohesion: 0.09
Nodes (29): Aba, ABAS, Cancelado, Cor, CORES_BARRA, corTempo(), dataBR(), dynamic (+21 more)

### Community 12 - "geo.ts"
Cohesion: 0.15
Nodes (23): chegadas(), espera(), medirEntrega(), montar(), painelMotoboy(), planejarRota(), dynamic, maxDuration (+15 more)

### Community 13 - "fidelidade/actions.ts"
Cohesion: 0.07
Nodes (57): ajustarSaldo(), buscarSaldos(), copiarPrograma(), excluirRecompensa(), extratoCliente(), R, saldoDoCliente(), salvarConfigFidelidade() (+49 more)

### Community 14 - "web/package.json"
Cohesion: 0.07
Nodes (32): dependencies, jsqr@1.4.0, next@^15.5.9, qrcode@^1.5.4, react@^19.2.1, react-dom@^19.2.1, @res/core@*, @supabase/supabase-js@2.47.10 (+24 more)

### Community 15 - "CI (testes automáticos)"
Cohesion: 0.07
Nodes (34): name, runs-on, services, steps, DATABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, POSTGRES_PASSWORD (+26 more)

### Community 16 - "app-motoboy.tsx"
Cohesion: 0.14
Nodes (28): despachar(), entregar(), PlanoRota, dynamic, metadata, PaginaDespacho(), Acerto(), AppMotoboy() (+20 more)

### Community 17 - "gestao/actions.ts"
Cohesion: 0.15
Nodes (31): excluirRegistro(), ligarFicha(), lojaGestor(), R, RegistroForm, salvarCustos(), salvarEmpresa(), salvarFuncionario() (+23 more)

### Community 18 - "public.pedidos"
Cohesion: 0.05
Nodes (78): public.lojas, public.criar_pedido(), public.pedido_item_opcoes, public.pedido_itens, public.pedidos, public.acompanhar_pedido(), private.metricas_vendas(), public.criar_marca() (+70 more)

### Community 19 - "Decisões de arquitetura — RES"
Cohesion: 0.06
Nodes (34): D-002 Modelo multiloja: Loja → Marcas, D-003 Regras de cadastro valem no banco e no formulário, D-004 Auditoria calculada no servidor, D-005 Operações compostas são atômicas, D-006 Gravar só em ação explícita, D-007 Texto em UTF-8 completo, D-008 Nenhum segredo de integração no navegador, D-009 Preço de itens com grupos (decisão provisória, Q-009) (+26 more)

### Community 20 - "criarClienteServidor"
Cohesion: 0.24
Nodes (15): convidar(), criarCardapio(), criarLoja(), definirCidade(), msg(), R, CartaoLoja(), Conta (+7 more)

### Community 21 - "novo-pedido.tsx"
Cohesion: 0.24
Nodes (19): buscarClientes(), FidelidadeBalcao(), UsoFidelidade, GruposBalcao(), ItemCarrinho, lerCentavos(), Montador(), MontadorCombo() (+11 more)

### Community 22 - "aplicativos.tsx"
Cohesion: 0.12
Nodes (29): conectarMercadoPago(), desconectarMercadoPago(), mpAceitarAoPagar(), R, removerIntegracao(), salvarIntegracao(), salvarLinkGrupo(), dynamic (+21 more)

### Community 23 - "salvando"
Cohesion: 0.21
Nodes (13): ajustarEntrega(), CartaoMotoboy(), FechamentoMotoboys(), FONTE, hora(), LinhaEntrega(), Numero(), Total (+5 more)

### Community 24 - "importar-nfe.tsx"
Cohesion: 0.15
Nodes (25): importarNFe(), ItemImportar, vinculosFornecedor(), cnpjTexto(), dataTexto(), ImportarNFe(), lerFator(), Linha (+17 more)

### Community 25 - "Promoções e cupons (tela)"
Cohesion: 0.09
Nodes (46): agenda(), alternarCupom(), alternarFreteGratis(), CupomForm, excluirCupom(), excluirFreteGratis(), excluirPromoCategoria(), fim() (+38 more)

### Community 26 - "quadro-pedidos.tsx"
Cohesion: 0.10
Nodes (32): cuponsPendentes(), marcarAviso(), dynamic, Pedidos(), abrirWhatsApp(), AvisarTodos(), bipar(), CartaoPedido() (+24 more)

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
Nodes (34): AjusteProduto, copiarParaEvento(), criarEvento(), msg(), R, refrescar(), removerProdutoEvento(), salvarEvento() (+26 more)

### Community 31 - "salvando"
Cohesion: 0.09
Nodes (35): CategoriaOrigem, salvarDetalheOpcao(), ConfigDelivery, definirStatus(), replicarHorarios(), salvarConfig(), salvarVitrine(), Vitrine (+27 more)

### Community 32 - "acompanhar-pedido.tsx"
Cohesion: 0.13
Nodes (23): conferirPixMercadoPago(), pixMercadoPago(), dynamic, metadata, PaginaAcompanhar(), AcompanharPedido(), ExtrasPedido, hora() (+15 more)

### Community 33 - "next"
Cohesion: 0.16
Nodes (24): AoVivo, AreaForm, calcularKmBairro(), FaixaForm, localizarLoja(), MotoboyAoVivo, R, salvarAreas() (+16 more)

### Community 34 - "Workflow do agente de impressão"
Cohesion: 0.09
Nodes (21): GH_TOKEN, runs-on, steps, jobs, exe, name, on, push (+13 more)

### Community 35 - "Montagem do cupom impresso"
Cohesion: 0.15
Nodes (20): D-014 Impressão: fila no banco, regras como no BeeFood, navegador até o agente chegar, D-015 Agente de impressão do Windows (RES Impressão), blocosCombo(), colunasLR(), CupomTeste, cupomTexto(), dataHora(), FRACAO (+12 more)

### Community 36 - "editor-cardapio.tsx"
Cohesion: 0.17
Nodes (23): PassoForm, Resultado, AplicarGrupo(), EditorCardapio(), Marca, Painel, EditorCombo(), lerCentavos() (+15 more)

### Community 37 - "20261028000052_gestao_empresarial.sql"
Cohesion: 0.14
Nodes (22): custos_auditar, custos_loja_idx, funcionario_registros_idx, funcionario_registros_numero, funcionarios_loja_idx, gestao_empresa_auditar, private.contadores_registro, private.numerar_registro() (+14 more)

### Community 38 - "preco.ts"
Cohesion: 0.16
Nodes (19): EscolhaPasso, PassoCombo, precoSeparado(), calcularItem(), ErroEscolha, grupoVisivel(), opcaoVisivel(), precoGrupo() (+11 more)

### Community 39 - "painel-caixa.tsx"
Cohesion: 0.09
Nodes (46): abrirCaixa(), fecharCaixa(), movimentar(), msg(), R, salvarCaixa(), vincularSemCaixa(), dynamic (+38 more)

### Community 40 - "Configuração TypeScript"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 41 - "Banco: cupons e descontos"
Cohesion: 0.17
Nodes (13): cupons_auditar, cupons_codigo_idx, pedidos_cupom_idx, private.agenda_vale(), private.aplicar_cupom(), private.desconto_categoria_pct(), private.desconto_cupom(), private.preco_combo() (+5 more)

### Community 42 - "Banco: Mercado Pago"
Cohesion: 0.16
Nodes (13): mp_pagamentos_pedido_idx, public.desconectar_mp(), public.mp_contas, public.mp_pagamentos, public.mp_status(), public.salvar_mp(), public.mp_aceitar_ao_pagar(), public.mp_status() (+5 more)

### Community 43 - "motoboy/package.json"
Cohesion: 0.14
Nodes (17): dependencies, @capacitor/android@6.2.0, @capacitor/app@6.0.2, @capacitor/cli@6.2.0, @capacitor-community/background-geolocation@1.2.26, @capacitor/core@6.2.0, description, @capacitor/android (+9 more)

### Community 44 - "public.fin_lancamentos"
Cohesion: 0.08
Nodes (33): public.salvar_fatores_sabor(), fin_fornecedores_doc, fin_lanc_comp, fin_lanc_origem, fin_lanc_serie, fin_lanc_venc, fin_lancamentos_auditar, fin_lancamentos_loja (+25 more)

### Community 45 - "Grupo 45: package.json"
Cohesion: 0.14
Nodes (17): description, devDependencies, esbuild@0.24.0, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, tsx, @types/node (+9 more)

### Community 46 - "Grupo 46: package.json"
Cohesion: 0.13
Nodes (17): description, devDependencies, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, exports, tsx, @types/node (+9 more)

### Community 47 - "motoboy/scripts/ajustar-android.mjs"
Cohesion: 0.09
Nodes (19): adapt, app, g, gradle, m, man, permissoes, res (+11 more)

### Community 48 - "public.setores"
Cohesion: 0.14
Nodes (22): public.setor_marcas, public.setores, areas_entrega_auditar, marca_horarios_auditar, private.marca_aberta(), public.areas_entrega, public.cardapio_publico(), public.criar_pedido_publico() (+14 more)

### Community 49 - "escpos.ts"
Cohesion: 0.26
Nodes (10): codificar(), CP850, CP860, ESC_T, Pagina, semAcento(), ConfigImpressora, gerarEscPos() (+2 more)

### Community 50 - "20261027000026_rastreio_motoboys.sql"
Cohesion: 0.27
Nodes (8): motoboy_local_grupo_idx, motoboy_posicoes_em_idx, motoboy_posicoes_entregador_idx, pedidos_motoboy_sai_do_mapa, private.e_membro_do_grupo(), public.motoboy_posicoes, public.rastreio_ao_vivo(), public.registrar_destino()

### Community 51 - "public.produtos"
Cohesion: 0.15
Nodes (35): public.complementos, public.criar_grupo_vinculado(), public.grupos_opcoes, public.opcoes, public.produto_grupos, public.produto_marcas, public.produtos, public.criar_grupo_vinculado() (+27 more)

### Community 52 - "index.ts"
Cohesion: 0.17
Nodes (23): exportarClientes(), listarClientes(), salvarCliente(), Clientes(), dynamic, baixarCsv(), FichaCliente(), ListaClientes() (+15 more)

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
Cohesion: 0.09
Nodes (46): FaixaKm, carregar(), dynamic, generateMetadata(), PaginaCardapio(), CardapioCliente(), ETIQUETA, Extras() (+38 more)

### Community 58 - "public.clientes"
Cohesion: 0.11
Nodes (21): clientes_auditar, clientes_grupo_nome_idx, pedidos_cliente_idx, pedidos_registra_cliente, private.grupo_da_loja(), private.pedido_registra_cliente(), public.buscar_clientes(), public.cliente_enderecos (+13 more)

### Community 59 - "cardapio-dados.ts"
Cohesion: 0.21
Nodes (13): Cardapio(), dynamic, TempoReal(), carregarCardapio(), Cardapio, GrupoRow, OpcaoRow, PassoRow (+5 more)

### Community 60 - "saida.ts"
Cohesion: 0.23
Nodes (7): caminhoScript(), hostPorta(), imprimirRede(), imprimirWindows(), powershell(), PS_RAW, testarRede()

### Community 61 - "[slug]/actions.ts"
Cohesion: 0.18
Nodes (19): calcularEntregaKm(), conferirCupom(), EntregaKm, enviarPedido(), programaFidelidade(), saldoFidelidade(), FidelidadeCliente(), lembrarPedidoFidelidade() (+11 more)

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
Cohesion: 0.14
Nodes (29): FuncionarioForm, alterarFuncao(), cancelarConvite(), criarUsuarioCaixa(), definirAtivo(), trocarSenhaUsuario(), Assistente(), Cartao (+21 more)

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

### Community 78 - "public.marcas"
Cohesion: 0.08
Nodes (31): public.marcas, private.dentro_do_horario(), private.horarios_agendamento(), private.marca_aberta(), private.taxa_bairro(), private.validar_agendamento(), public.horarios_agendamento(), public.salvar_config_delivery() (+23 more)

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

### Community 83 - "20261021000005_pedidos.sql"
Cohesion: 0.11
Nodes (14): pedido_eventos_pedido_idx, pedido_item_opcoes_item_idx, pedido_itens_pedido_idx, pedidos_atualizado, pedidos_loja_status_idx, private.contador_pedidos, public.mudar_status_pedido(), public.pedido_eventos (+6 more)

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

### Community 91 - "public.combo_passos"
Cohesion: 0.17
Nodes (11): combo_passos_auditar, combo_passos_combo_idx, private.preco_combo(), public.combo_passos, public.duplicar_produto(), public.salvar_combo(), ids, pg_temp.como() (+3 more)

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

### Community 98 - "editor-combo.tsx"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 99 - "promocao.test.ts"
Cohesion: 0.24
Nodes (11): D-021 Cardápio novo: cards com foto e promoção De/Por com agenda, AgendaPromo, diaAnterior(), diaDaSemana(), DIAS_CURTOS, partesLocais(), promoEncerrada(), promoVale() (+3 more)

### Community 101 - "pedido.ts"
Cohesion: 0.18
Nodes (17): PedidoCliente, NovoPedido, CupomDados, acaoAvancar(), ErroPedido, FormaPagamento, LinhaTotal, proximosStatus() (+9 more)

### Community 102 - "mapa-cliente.tsx"
Cohesion: 0.14
Nodes (20): rastreioAoVivo(), diaDoTurno(), dynamic, Entregas(), CORES, haQuanto(), iniciais(), MapaAoVivo() (+12 more)

### Community 103 - "gestao.ts"
Cohesion: 0.12
Nodes (25): DadosGrupo, salvarGrupo(), FORMACOES, FormGrupo(), GrupoInicial, lerPreco(), mostrarPreco(), OpcaoForm (+17 more)

### Community 104 - "meta-mes.tsx"
Cohesion: 0.27
Nodes (10): salvarMeta(), ler(), MESES, MetaMes(), pct(), calcularMeta(), DadosMeta, diaUTC() (+2 more)

### Community 107 - "funcionarios.tsx"
Cohesion: 0.17
Nodes (14): espera(), LoteSugerido, sugerirLotes(), SugestaoLoja, SugestaoLotes(), D-028 · Cliente acompanha a entrega, prazo por loja, alerta e lotes na expedição, tempos e atrasos, agruparEntregas(), Lote (+6 more)

### Community 116 - "estoque/actions.ts"
Cohesion: 0.18
Nodes (17): ajustarEstoque(), definirModoEstoque(), excluirInsumo(), feito(), R, salvarContagem(), salvarFatoresSabor(), salvarFicha() (+9 more)

### Community 117 - "marketplace.ts"
Cohesion: 0.13
Nodes (17): acaoParaIfood(), CanalExterno, EVENTOS_IFOOD, formaDoIfood(), FormaRes, IfoodBeneficio, IfoodItem, IfoodOpcao (+9 more)

### Community 118 - "salvando"
Cohesion: 0.14
Nodes (31): GET(), POST(), LayoutMotoboy(), metadata, viewport, criarLoja(), alterarDisponibilidade(), criarProduto() (+23 more)

### Community 119 - "api.tsx"
Cohesion: 0.23
Nodes (17): criarChaveApi(), excluirWebhook(), revogarChaveApi(), salvarWebhook(), testarWebhook(), copiar(), ENDPOINTS, FormWebhook() (+9 more)

### Community 120 - "lojas/page.tsx"
Cohesion: 0.31
Nodes (9): salvarPermissoesEquipe(), ABAS, dynamic, Lojas(), Equipe(), LojaEquipe, AjusteCaixa(), Funcoes() (+1 more)

### Community 121 - "99zzzzzzzzzzzzzzzzzzzzz_evento.sql"
Cohesion: 0.32
Nodes (5): ids, pg_temp.id(), pg_temp.v(), quando, saida

### Community 122 - "ifood.ts"
Cohesion: 0.13
Nodes (24): dynamic, GET(), dynamic, POST(), POST(), assinaturaValida(), CAMINHO_ACAO, chamar() (+16 more)

### Community 123 - "20261106153000_marketplace_base.sql"
Cohesion: 0.18
Nodes (14): private.cupom_da_loja(), pedidos_externo_idx, pedidos_marketplace, private.enfileirar_marketplace(), private.marketplace_eventos, private.pedido_para_marketplace(), private.produto_do_marketplace(), public.marketplace_itens (+6 more)

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
Nodes (15): complementos_loja_idx, grupos_opcoes_loja_idx, opcoes_grupo_idx, private.setor_exige_marca(), produto_grupos_grupo_idx, produtos_loja_setor_idx, public.criar_produto(), public.salvar_setor() (+7 more)

### Community 130 - "grafico-lojas.tsx"
Cohesion: 0.33
Nodes (8): curto(), formatar(), GraficoLojas(), LojaDesempenho, Metrica, METRICAS, valor(), formatarVariacao()

### Community 131 - "contextoLoja"
Cohesion: 0.26
Nodes (14): autorizarDesconto(), criarPedido(), definirAceiteAutomatico(), definirMovimento(), definirProntoAuto(), marcarPago(), mensagem(), mudarStatus() (+6 more)

### Community 132 - "99zzzzzzzzzzzzzzzzzzzzzzz_financeiro.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 133 - "ifood.tsx"
Cohesion: 0.32
Nodes (12): desligarLojaIfood(), fim(), ligarItemIfood(), R, salvarLojaIfood(), simularEventoIfood(), simularPedidoIfood(), ACAO (+4 more)

### Community 134 - "20261021000008_multilojas.sql"
Cohesion: 0.08
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

### Community 138 - "O que o RES faz (novembro/2026)"
Cohesion: 0.39
Nodes (7): salvarSetor(), FormSetor(), Marca, novoSetor(), SetorForm, setorVisivel(), validarSetor()

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
Cohesion: 0.27
Nodes (13): amigavel(), Como(), diametro(), EditorSabor(), fmt(), Linha, num(), pctTexto() (+5 more)

### Community 144 - "movimentos.tsx"
Cohesion: 0.25
Nodes (10): buscarMovimentos(), FiltroMovimentos, hoje(), menos(), Movimentacoes(), quando(), ROTULO, TIPOS (+2 more)

### Community 145 - "20261101000067_cupom_area_frete.sql"
Cohesion: 0.29
Nodes (7): frete_gratis_auditar, frete_gratis_loja_idx, private.base_cupom(), private.regra_frete_gratis(), public.frete_gratis, public.frete_gratis_publico(), public.validar_cupom()

### Community 146 - "v_fuso"
Cohesion: 0.25
Nodes (7): public.relatorio_entregas(), public.salvar_prazo_entrega(), public.relatorio_fidelidade(), private.periodo_api(), public.meta_vendas(), public.metas_vendas, public.salvar_meta_vendas()

### Community 147 - "conta-cliente.tsx"
Cohesion: 0.27
Nodes (9): situacaoPedidos(), Dados, guardarPedido(), lerPedidos(), MeusPedidos(), NavCliente(), PedidoGuardado, PerfilCliente() (+1 more)

### Community 148 - "insumos.tsx"
Cohesion: 0.42
Nodes (9): salvarInsumo(), Ajuste(), confirmarExclusao(), FormInsumo(), LinhaInsumo(), ListaInsumos(), num(), SIT (+1 more)

### Community 149 - "ref_node_assert"
Cohesion: 0.33
Nodes (7): campo(), crc16Pix(), FORMATOS_RASTREAMENTO, normalizarChavePix(), pixCopiaECola(), semAcento(), TipoChavePix

### Community 150 - "rota.ts"
Cohesion: 0.22
Nodes (6): Ponto, OpcoesRota, Parada, ResultadoRota, agora, M

### Community 151 - "99zzzzzzzzzzzzzzzzzzzzzzzzz_marketplace.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 153 - "private.importar_cardapio"
Cohesion: 0.67
Nodes (3): private.importacoes, private.importar_cardapio(), pg_temp.k()

## Knowledge Gaps
- **9 isolated node(s):** `pedidos.qr_token (/m/d/<código>)`, `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `GitHub Actions CI (rules, db, build)`, `Roadmap stages 3c-7 and integrations`, `supabase/migrations (Postgres RLS, audit, atomic ops)` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 722 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `nav-painel.tsx` to `estoque/page.tsx`, `gestao/page.tsx`, `contextoLoja`, `ifood.tsx`, `API aberta e MCP (rotas)`, `salvando`, `relatorios/page.tsx`, `[link]/page.tsx`, `fidelidade/actions.ts`, `web/package.json`, `sabores-pizza.tsx`, `app-motoboy.tsx`, `gestao/actions.ts`, `conta-cliente.tsx`, `criarClienteServidor`, `novo-pedido.tsx`, `aplicativos.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `financeiro/page.tsx`, `evento.tsx`, `salvando`, `acompanhar-pedido.tsx`, `next`, `painel-caixa.tsx`, `index.ts`, `src/caixa.ts`, `resumo/page.tsx`, `cardapio-cliente.tsx`, `cardapio-dados.ts`, `equipe.tsx`, `mapa-cliente.tsx`, `meta-mes.tsx`, `estoque/actions.ts`, `salvando`, `api.tsx`, `lojas/page.tsx`, `ifood.ts`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **What connects `pedidos.qr_token (/m/d/<código>)`, `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `GitHub Actions CI (rules, db, build)` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `20261028000040_api_webhooks.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.10080645161290322 - nodes in this community are weakly interconnected._
- **Why does `criarClienteServidor()` connect `salvando` to `estoque/page.tsx`, `gestao/page.tsx`, `contextoLoja`, `nav-painel.tsx`, `ifood.tsx`, `O que o RES faz (novembro/2026)`, `salvando`, `[link]/page.tsx`, `geo.ts`, `fidelidade/actions.ts`, `relatorios/page.tsx`, `app-motoboy.tsx`, `movimentos.tsx`, `gestao/actions.ts`, `conta-cliente.tsx`, `insumos.tsx`, `novo-pedido.tsx`, `aplicativos.tsx`, `salvando`, `importar-nfe.tsx`, `criarClienteServidor`, `quadro-pedidos.tsx`, `Promoções e cupons (tela)`, `financeiro/page.tsx`, `evento.tsx`, `salvando`, `acompanhar-pedido.tsx`, `next`, `painel-caixa.tsx`, `index.ts`, `src/caixa.ts`, `resumo/page.tsx`, `cardapio-cliente.tsx`, `cardapio-dados.ts`, `[slug]/actions.ts`, `equipe.tsx`, `mapa-cliente.tsx`, `gestao.ts`, `meta-mes.tsx`, `funcionarios.tsx`, `estoque/actions.ts`, `api.tsx`, `lojas/page.tsx`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `main.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Why does `formatarReais()` connect `acompanhar-pedido.tsx` to `estoque/page.tsx`, `grafico-lojas.tsx`, `nav-painel.tsx`, `ifood.tsx`, `relatorios/page.tsx`, `fidelidade/actions.ts`, `sabores-pizza.tsx`, `movimentos.tsx`, `app-motoboy.tsx`, `conta-cliente.tsx`, `insumos.tsx`, `novo-pedido.tsx`, `aplicativos.tsx`, `salvando`, `importar-nfe.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `salvando`, `next`, `Montagem do cupom impresso`, `editor-cardapio.tsx`, `preco.ts`, `painel-caixa.tsx`, `index.ts`, `resumo/page.tsx`, `cardapio-cliente.tsx`, `[slug]/actions.ts`, `gestao.ts`, `meta-mes.tsx`, `estoque/actions.ts`, `grafico-dias.tsx`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Should `nav-painel.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08558558558558559 - nodes in this community are weakly interconnected._