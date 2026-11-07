# Graph Report - res  (2026-11-06)

## Corpus Check
- 348 files · ~319,790 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 3010 nodes · 7818 edges · 145 communities (124 shown, 21 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 53 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d40f49ad`
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
- m/actions.ts
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
- salvando
- acompanhar-pedido.tsx
- next
- Workflow do agente de impressão
- Montagem do cupom impresso
- mercadopago.ts
- ifood.tsx
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
- lojas/page.tsx
- next
- beefood_para_res.py
- resumo/page.tsx
- montagem.tsx
- graphify
- public.clientes
- novo-pedido.tsx
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
- painel/scripts/ajustar-android.mjs
- Grupo 84: 99zzzzzzzz_entregas_cliente.sql
- Grupo 85: 99zzzzzzzzzzzzz_aplicativos.sql
- Grupo 86: README.md
- Grupo 87: decisoes.md
- 99zzzzzzzzzzzzzzzz_vitrine.sql
- Grupo 89: 30_cardapio_digital.sql
- Grupo 90: 60_agendamento.sql
- impressoras.ts
- Grupo 93: 99zzzzzzzzzzzzzzz_mercadopago.sql
- lancamentos.tsx
- 99zzzzzzzzzzzzzzzzzzz_gestao.sql
- Grupo 96: 70_caixa.sql
- 99zzzzzzzzzzzzzzzzz_taxa_km.sql
- contagem.tsx
- public.usuarios_login
- Grupo 100: tempos_ajuste.sql
- pedido.ts
- entregas/page.tsx
- gestao.ts
- meta-mes.tsx
- Grupo 105: next.config.mjs
- Grupo 106: vercel.json
- funcionarios.tsx
- Grupo 108: test-db.sh
- estoque/actions.ts
- ao-vivo.tsx
- criarClienteServidor
- 50_multilojas.sql
- pg_temp.como
- 99zzzzzzzzzzzzzzzzzzzzz_evento.sql
- ifood.tsx
- grafico-dias.tsx
- 99zzzzzzzzzzzzzzzzzzzz_equipe.sql
- middleware.ts
- grafico-lojas.tsx
- 99zzzzzzzzzzzzzzzzzzzzzzz_financeiro.sql
- 20261021000008_multilojas.sql
- 99zzzzzzzzzzzzzzzzzzzzzz_quadro.sql
- 20261021000007_cardapio_biblioteca.sql
- 99_motoboy.sql
- agendamento.ts
- 99zzzzzzz_rota.sql
- pg_temp.como
- sabores-pizza.tsx
- movimentos.tsx
- 20261101000067_cupom_area_frete.sql
- pg_temp.como
- insumos.tsx
- 99zzzzzzzzzzzzzzzzzzzzzzzzz_marketplace.sql
- 20261021000004_cardapio_edicao.sql
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
- `D-014 Impressão: fila no banco, regras como no BeeFood, navegador até o agente chegar` --references--> `montarCupom()`  [INFERRED]
  docs/decisoes.md → packages/core/src/cupom.ts
- `D-015 Agente de impressão do Windows (RES Impressão)` --references--> `montarCupom()`  [INFERRED]
  docs/decisoes.md → packages/core/src/cupom.ts
- `D-023 % por categoria, cupons e desconto no balcão com limite` --references--> `precoBase()`  [INFERRED]
  docs/decisoes.md → packages/core/src/preco.ts
- `D-027 · Rota sugerida quando o motoboy sai com várias entregas` --references--> `otimizarRota()`  [INFERRED]
  docs/decisoes.md → packages/core/src/rota.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Rules duplicated in core and DB with shared test cases** — docs_decisoes_d_021_cardapio_cards_promo, docs_decisoes_d_022_combos_upsell, docs_decisoes_d_029_segmentos_clientes, docs_decisoes_d_030_telefone_nono_digito, docs_decisoes_d_031_fidelidade_grupo, docs_decisoes_core_db_parity [EXTRACTED 1.00]
- **Motoboy delivery flow (QR dispatch, app, tracking, routing)** — docs_decisoes_d_017_app_motoboy_qr, docs_decisoes_d_018_comanda_motoboy_pago, docs_decisoes_d_019_app_android_leitor_qr, docs_decisoes_d_026_rastreio_motoboys, docs_decisoes_d_027_rota_sugerida, apps_mobile_motoboy_readme_res_motoboy_android [INFERRED 0.85]
- **Stock management module (NF-e, recipes, counts, CMV)** — docs_decisoes_d_036_estoque_nfe_ficha, docs_decisoes_d_037_movimentacoes_estoque, docs_decisoes_d_038_meu_estoque_contagem, docs_decisoes_d_039_fechamento_cmv, docs_decisoes_d_040_ficha_sabor_pizza [INFERRED 0.85]

## Communities (145 total, 21 thin omitted)

### Community 0 - "estoque/page.tsx"
Cohesion: 0.13
Nodes (27): copiarFicha(), dynamic, Estoque(), dataCurta(), Fechamento(), pctTexto(), somaMes(), Alvo (+19 more)

### Community 1 - "20261020000001_base.sql"
Cohesion: 0.11
Nodes (25): grupos_acesso_atualizado, grupos_acesso_auditar, grupos_acesso_validar, lojas_atualizado, lojas_auditar, marcas_atualizado, marcas_auditar, marcas_loja_idx (+17 more)

### Community 2 - "gestao/page.tsx"
Cohesion: 0.14
Nodes (21): EscopoCustos, Aba, ABAS, dynamic, Gestao(), brl(), ler(), Linha (+13 more)

### Community 3 - "main.ts"
Cohesion: 0.13
Nodes (29): acharWindows(), alcance(), argumento(), ARQ_CONFIG, ARQ_LOG, atualizarSePrecisar(), atualizarWindows(), Config (+21 more)

### Community 4 - "nav-painel.tsx"
Cohesion: 0.14
Nodes (20): PainelLayout(), trocarLoja(), dadosNovoPedido(), BARRA, COR_SECAO, Icone(), Link_, LINKS (+12 more)

### Community 5 - "20261021000014_caixa.sql"
Cohesion: 0.13
Nodes (24): caixa_movimentos_sessao_idx, caixa_sessoes_auditar, caixa_sessoes_loja_idx, caixa_sessoes_uma_aberta_idx, caixas_auditar, caixas_nome_idx, lojas_caixa_inicial, pedidos_caixa_idx (+16 more)

### Community 6 - "Banco: impressão"
Cohesion: 0.06
Nodes (47): impressao_config_auditar, impressao_destinos_loja_idx, impressoes_loja_idx, impressoes_pedido_idx, impressoes_pendentes_idx, impressoras_auditar, impressoras_nome_idx, pedidos_imprimir_ao_aceitar (+39 more)

### Community 7 - "20261027000032_fidelidade.sql"
Cohesion: 0.06
Nodes (42): fidelidade_mov_cliente_idx, fidelidade_mov_grupo_idx, fidelidade_mov_pedido_idx, fidelidade_recompensas_grupo_idx, pedidos_fidelidade, private.aplicar_fidelidade(), private.fidelidade_status(), private.recompensas_json() (+34 more)

### Community 8 - "Banco: estoque"
Cohesion: 0.07
Nodes (38): public.resumo_vendas(), private.cupom_da_loja(), public.relatorio_entregas(), public.relatorio_fidelidade(), estoque_mov_estoque_idx, estoque_mov_insumo_idx, estoque_mov_pedido_idx, fichas_opcao_idx (+30 more)

### Community 9 - "API aberta e MCP (rotas)"
Cohesion: 0.08
Nodes (33): DELETE, POST(), DELETE, POST(), GET(), OPTIONS, GET(), OPTIONS (+25 more)

### Community 10 - "salvando"
Cohesion: 0.10
Nodes (40): ConfigImpressao, DadosImpressora, excluirImpressora(), gerarCodigoAgente(), imprimirPedido(), imprimirTeste(), msg(), R (+32 more)

### Community 11 - "relatorios/page.tsx"
Cohesion: 0.09
Nodes (29): Aba, ABAS, Cancelado, Cor, CORES_BARRA, corTempo(), dataBR(), dynamic (+21 more)

### Community 12 - "m/actions.ts"
Cohesion: 0.18
Nodes (20): chegadas(), espera(), medirEntrega(), montar(), painelMotoboy(), planejarRota(), dynamic, maxDuration (+12 more)

### Community 13 - "fidelidade/actions.ts"
Cohesion: 0.05
Nodes (79): exportarClientes(), listarClientes(), salvarCliente(), Clientes(), dynamic, ajustarSaldo(), buscarSaldos(), copiarPrograma() (+71 more)

### Community 14 - "web/package.json"
Cohesion: 0.06
Nodes (34): config, PUBLICAS, dependencies, jsqr@1.4.0, next@^15.5.9, react@^19.2.1, react-dom@^19.2.1, @res/core@* (+26 more)

### Community 15 - "CI (testes automáticos)"
Cohesion: 0.07
Nodes (34): name, runs-on, services, steps, DATABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, POSTGRES_PASSWORD (+26 more)

### Community 16 - "app-motoboy.tsx"
Cohesion: 0.14
Nodes (28): despachar(), entregar(), PlanoRota, dynamic, metadata, PaginaDespacho(), Acerto(), AppMotoboy() (+20 more)

### Community 17 - "gestao/actions.ts"
Cohesion: 0.31
Nodes (16): excluirRegistro(), ligarFicha(), lojaGestor(), R, salvarCustos(), salvarEmpresa(), salvarFuncionario(), salvarModoGrupo() (+8 more)

### Community 18 - "public.pedidos"
Cohesion: 0.04
Nodes (62): pedido_eventos_pedido_idx, pedido_item_opcoes_item_idx, pedido_itens_pedido_idx, pedidos_atualizado, pedidos_loja_status_idx, private.contador_pedidos, public.mudar_status_pedido(), public.pedido_eventos (+54 more)

### Community 19 - "Decisões de arquitetura — RES"
Cohesion: 0.05
Nodes (36): D-002 Modelo multiloja: Loja → Marcas, D-003 Regras de cadastro valem no banco e no formulário, D-004 Auditoria calculada no servidor, D-005 Operações compostas são atômicas, D-006 Gravar só em ação explícita, D-007 Texto em UTF-8 completo, D-008 Nenhum segredo de integração no navegador, D-009 Preço de itens com grupos (decisão provisória, Q-009) (+28 more)

### Community 20 - "criarClienteServidor"
Cohesion: 0.20
Nodes (18): convidar(), criarCardapio(), criarLoja(), criarUsuarioCaixa(), definirCidade(), msg(), R, CartaoLoja() (+10 more)

### Community 21 - "gestao.ts"
Cohesion: 0.23
Nodes (13): RegistroForm, dias(), Documento(), dynamic, BotaoImprimir(), dataBr(), dataExtenso(), Empresa (+5 more)

### Community 22 - "aplicativos.tsx"
Cohesion: 0.08
Nodes (54): conectarMercadoPago(), criarChaveApi(), desconectarMercadoPago(), excluirWebhook(), mpAceitarAoPagar(), R, removerIntegracao(), revogarChaveApi() (+46 more)

### Community 23 - "salvando"
Cohesion: 0.23
Nodes (14): ajustarEntrega(), CartaoMotoboy(), FechamentoMotoboys(), FONTE, hora(), LinhaEntrega(), Numero(), Total (+6 more)

### Community 24 - "importar-nfe.tsx"
Cohesion: 0.16
Nodes (24): importarNFe(), vinculosFornecedor(), cnpjTexto(), dataTexto(), ImportarNFe(), lerFator(), Linha, D-036 · Estoque: entrada por NF-e e baixa pela ficha técnica (+16 more)

### Community 25 - "Promoções e cupons (tela)"
Cohesion: 0.10
Nodes (44): agenda(), alternarCupom(), alternarFreteGratis(), CupomForm, excluirCupom(), excluirFreteGratis(), excluirPromoCategoria(), fim() (+36 more)

### Community 26 - "quadro-pedidos.tsx"
Cohesion: 0.09
Nodes (40): cuponsPendentes(), criarPedido(), definirAceiteAutomatico(), definirMovimento(), definirProntoAuto(), marcarAviso(), marcarPago(), mensagem() (+32 more)

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
Cohesion: 0.10
Nodes (34): CategoriaOrigem, PassoForm, salvarDetalheOpcao(), ConfigDelivery, definirStatus(), replicarHorarios(), salvarConfig(), salvarVitrine() (+26 more)

### Community 32 - "acompanhar-pedido.tsx"
Cohesion: 0.10
Nodes (28): carregar(), dynamic, generateMetadata(), PaginaCardapio(), dynamic, metadata, PaginaAcompanhar(), AcompanharPedido() (+20 more)

### Community 33 - "next"
Cohesion: 0.16
Nodes (24): AoVivo, AreaForm, calcularKmBairro(), FaixaForm, localizarLoja(), MotoboyAoVivo, R, salvarAreas() (+16 more)

### Community 34 - "Workflow do agente de impressão"
Cohesion: 0.09
Nodes (21): GH_TOKEN, runs-on, steps, jobs, exe, name, on, push (+13 more)

### Community 35 - "Montagem do cupom impresso"
Cohesion: 0.18
Nodes (19): PedidoCliente, NovoPedido, blocosCombo(), colunasLR(), CupomDados, cupomTexto(), dataHora(), FRACAO (+11 more)

### Community 36 - "mercadopago.ts"
Cohesion: 0.20
Nodes (14): POST(), conferirPixMercadoPago(), pixMercadoPago(), PagarPixMp(), atualizarPagamento(), conferirPix(), marcarPago(), Ped (+6 more)

### Community 37 - "ifood.tsx"
Cohesion: 0.29
Nodes (12): desligarLojaIfood(), fim(), ligarItemIfood(), R, salvarLojaIfood(), simularEventoIfood(), simularPedidoIfood(), ACAO (+4 more)

### Community 38 - "preco.ts"
Cohesion: 0.14
Nodes (25): calcularCombo(), EscolhaPasso, PassoCombo, precoSeparado(), LinhaTotal, Totais, calcularItem(), ErroEscolha (+17 more)

### Community 39 - "painel-caixa.tsx"
Cohesion: 0.09
Nodes (47): abrirCaixa(), fecharCaixa(), movimentar(), msg(), R, salvarCaixa(), vincularSemCaixa(), dynamic (+39 more)

### Community 40 - "Configuração TypeScript"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 41 - "Banco: cupons e descontos"
Cohesion: 0.15
Nodes (14): cupons_auditar, cupons_codigo_idx, pedidos_cupom_idx, private.agenda_vale(), private.aplicar_cupom(), private.desconto_categoria_pct(), private.desconto_cupom(), promocoes_categoria_auditar (+6 more)

### Community 42 - "Banco: Mercado Pago"
Cohesion: 0.16
Nodes (13): mp_pagamentos_pedido_idx, public.desconectar_mp(), public.mp_contas, public.mp_pagamentos, public.mp_status(), public.salvar_mp(), public.mp_aceitar_ao_pagar(), public.mp_status() (+5 more)

### Community 43 - "motoboy/package.json"
Cohesion: 0.14
Nodes (17): dependencies, @capacitor/android@6.2.0, @capacitor/app@6.0.2, @capacitor/cli@6.2.0, @capacitor-community/background-geolocation@1.2.26, @capacitor/core@6.2.0, description, @capacitor/android (+9 more)

### Community 44 - "public.fin_lancamentos"
Cohesion: 0.06
Nodes (55): custos_auditar, custos_loja_idx, funcionario_registros_idx, funcionario_registros_numero, funcionarios_loja_idx, gestao_empresa_auditar, private.contadores_registro, private.numerar_registro() (+47 more)

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
Cohesion: 0.21
Nodes (9): areas_entrega_auditar, marca_horarios_auditar, private.marca_aberta(), public.areas_entrega, public.marca_horarios, public.salvar_config_delivery(), private.taxa_bairro(), private.area_do_pedido() (+1 more)

### Community 49 - "escpos.ts"
Cohesion: 0.26
Nodes (10): codificar(), CP850, CP860, ESC_T, Pagina, semAcento(), ConfigImpressora, gerarEscPos() (+2 more)

### Community 50 - "impressao.ts"
Cohesion: 0.20
Nodes (14): marcarImpressao(), RC, useImprimir(), agenteOnline(), colunasNavegador(), CSS_CUPOM, CupomFila, cupomHtml() (+6 more)

### Community 51 - "public.produtos"
Cohesion: 0.05
Nodes (82): complementos_loja_idx, grupos_opcoes_loja_idx, opcoes_grupo_idx, private.setor_exige_marca(), produto_grupos_grupo_idx, produtos_loja_setor_idx, public.complementos, public.criar_grupo_vinculado() (+74 more)

### Community 52 - "lojas/page.tsx"
Cohesion: 0.26
Nodes (10): salvarPermissoesEquipe(), ABAS, dynamic, Lojas(), LojaEquipe, AjusteCaixa(), Funcoes(), QuadroFuncoes() (+2 more)

### Community 53 - "next"
Cohesion: 0.08
Nodes (19): GET(), POST(), carregar(), dynamic, generateMetadata(), Grupo, PaginaGrupo(), fonte (+11 more)

### Community 54 - "beefood_para_res.py"
Cohesion: 0.33
Nodes (3): converter(), limpa(), L()

### Community 55 - "resumo/page.tsx"
Cohesion: 0.20
Nodes (20): Composicao, ComposicaoVendas(), dataBR(), dynamic, Kpi(), Metricas, PRESETS, Resumo (+12 more)

### Community 56 - "montagem.tsx"
Cohesion: 0.21
Nodes (16): MontadorCombo(), acrescimo(), cheio(), completo(), Extras, GruposMontagem(), minimo(), Montador() (+8 more)

### Community 58 - "public.clientes"
Cohesion: 0.05
Nodes (47): private.total_contagem(), clientes_auditar, clientes_grupo_nome_idx, pedidos_cliente_idx, pedidos_registra_cliente, private.grupo_da_loja(), private.pedido_registra_cliente(), public.buscar_clientes() (+39 more)

### Community 59 - "novo-pedido.tsx"
Cohesion: 0.14
Nodes (29): Cardapio(), dynamic, buscarClientes(), autorizarDesconto(), dynamic, PaginaNovoPedido(), GruposBalcao(), ItemCarrinho (+21 more)

### Community 60 - "saida.ts"
Cohesion: 0.24
Nodes (8): caminhoScript(), hostPorta(), imprimirRede(), imprimirWindows(), listarImpressorasWindows(), powershell(), PS_RAW, testarRede()

### Community 61 - "cardapio-cliente.tsx"
Cohesion: 0.10
Nodes (43): calcularEntregaKm(), conferirCupom(), EntregaKm, enviarPedido(), FaixaKm, programaFidelidade(), saldoFidelidade(), situacaoPedidos() (+35 more)

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
Cohesion: 0.16
Nodes (25): FuncionarioForm, alterarFuncao(), cancelarConvite(), definirAtivo(), trocarSenhaUsuario(), Assistente(), Cartao, CartaoAcesso() (+17 more)

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
Cohesion: 0.05
Nodes (71): public.lojas, public.marcas, public.criar_pedido(), public.pedido_item_opcoes, public.pedido_itens, public.acompanhar_pedido(), private.limite_cardapios(), private.limite_lojas() (+63 more)

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

### Community 83 - "painel/scripts/ajustar-android.mjs"
Cohesion: 0.18
Nodes (8): adapt, app, g, gradle, m, man, res, run

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

### Community 91 - "impressoras.ts"
Cohesion: 0.29
Nodes (5): ModeloImpressora, MODELOS_IMPRESSORA, PaginaCodigo, PAGINAS_CODIGO, Protocolo

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

### Community 99 - "public.usuarios_login"
Cohesion: 0.29
Nodes (4): public.pode_gerir_usuario(), public.registrar_usuario_caixa(), public.usuarios_login, auth.users

### Community 101 - "pedido.ts"
Cohesion: 0.33
Nodes (9): acaoAvancar(), ErroPedido, proximosStatus(), STATUS_ROTULO, tempoDecorrido(), TIPO_ROTULO, totalizar(), transicaoValida() (+1 more)

### Community 102 - "entregas/page.tsx"
Cohesion: 0.23
Nodes (11): rastreioAoVivo(), diaDoTurno(), dynamic, Entregas(), LojaBairros, diaCurto(), pct(), PERIODOS (+3 more)

### Community 103 - "gestao.ts"
Cohesion: 0.12
Nodes (25): DadosGrupo, salvarGrupo(), FORMACOES, FormGrupo(), GrupoInicial, lerPreco(), mostrarPreco(), OpcaoForm (+17 more)

### Community 104 - "meta-mes.tsx"
Cohesion: 0.27
Nodes (10): salvarMeta(), ler(), MESES, MetaMes(), pct(), calcularMeta(), DadosMeta, diaUTC() (+2 more)

### Community 107 - "funcionarios.tsx"
Cohesion: 0.11
Nodes (22): espera(), LoteSugerido, sugerirLotes(), SugestaoLoja, SugestaoLotes(), D-028 · Cliente acompanha a entrega, prazo por loja, alerta e lotes na expedição, tempos e atrasos, Ponto, agruparEntregas() (+14 more)

### Community 116 - "estoque/actions.ts"
Cohesion: 0.33
Nodes (9): ajustarEstoque(), definirModoEstoque(), excluirInsumo(), feito(), ItemImportar, R, salvarFatoresSabor(), salvarFicha() (+1 more)

### Community 117 - "ao-vivo.tsx"
Cohesion: 0.17
Nodes (15): CORES, haQuanto(), iniciais(), MapaAoVivo(), segundos(), cap(), Capacitor, EstadoRastreio (+7 more)

### Community 118 - "criarClienteServidor"
Cohesion: 0.11
Nodes (50): alterarDisponibilidade(), criarProduto(), definirFoto(), definirFotoOpcao(), definirGruposDoProduto(), definirProdutosDoGrupo(), desvincularGrupo(), duplicarGrupo() (+42 more)

### Community 119 - "50_multilojas.sql"
Cohesion: 0.47
Nodes (4): ids, pg_temp.como(), pg_temp.id(), saida

### Community 121 - "99zzzzzzzzzzzzzzzzzzzzz_evento.sql"
Cohesion: 0.32
Nodes (5): ids, pg_temp.id(), pg_temp.v(), quando, saida

### Community 122 - "ifood.tsx"
Cohesion: 0.06
Nodes (45): dynamic, GET(), dynamic, POST(), assinaturaValida(), CAMINHO_ACAO, chamar(), enviarSaida() (+37 more)

### Community 125 - "grafico-dias.tsx"
Cohesion: 0.33
Nodes (8): DiaLojas, DIAS, GraficoDias(), LojaCor, pedidosDia(), rotulo(), semana(), totalDia()

### Community 126 - "99zzzzzzzzzzzzzzzzzzzz_equipe.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 127 - "middleware.ts"
Cohesion: 0.60
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 130 - "grafico-lojas.tsx"
Cohesion: 0.39
Nodes (8): curto(), formatar(), GraficoLojas(), LojaDesempenho, Metrica, METRICAS, valor(), formatarReais()

### Community 132 - "99zzzzzzzzzzzzzzzzzzzzzzz_financeiro.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 134 - "20261021000008_multilojas.sql"
Cohesion: 0.09
Nodes (29): contas_atualizado, contas_proteger_plano, contas_titulares_user_idx, lojas_conta_idx, lojas_limite, marcas_limite, pedidos_loja_criado_idx, private.e_titular() (+21 more)

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
Cohesion: 0.30
Nodes (10): D-011 Pedido agendado e taxa por bairro no painel, chaveBairro(), dataNoFuso(), DIAS_CURTOS, faseAgendamento, FOLGA_AGENDADO_MIN, horaNoFuso(), partes() (+2 more)

### Community 139 - "99zzzzzzz_rota.sql"
Cohesion: 0.43
Nodes (6): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida, tok

### Community 141 - "pg_temp.como"
Cohesion: 0.60
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 142 - "sabores-pizza.tsx"
Cohesion: 0.26
Nodes (14): salvarInsumo(), amigavel(), Como(), diametro(), EditorSabor(), fmt(), Linha, num() (+6 more)

### Community 144 - "movimentos.tsx"
Cohesion: 0.33
Nodes (8): buscarMovimentos(), FiltroMovimentos, hoje(), menos(), Movimentacoes(), quando(), ROTULO, TIPOS

### Community 145 - "20261101000067_cupom_area_frete.sql"
Cohesion: 0.20
Nodes (10): private.aplicar_cupom(), frete_gratis_auditar, frete_gratis_loja_idx, private.aplicar_cupom(), private.aplicar_frete_gratis(), private.base_cupom(), private.regra_frete_gratis(), public.frete_gratis (+2 more)

### Community 146 - "pg_temp.como"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 148 - "insumos.tsx"
Cohesion: 0.49
Nodes (9): Ajuste(), confirmarExclusao(), FormInsumo(), LinhaInsumo(), ListaInsumos(), num(), SIT, n() (+1 more)

### Community 151 - "99zzzzzzzzzzzzzzzzzzzzzzzzz_marketplace.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

## Knowledge Gaps
- **9 isolated node(s):** `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `pedidos.qr_token (/m/d/<código>)`, `GitHub Actions CI (rules, db, build)`, `Roadmap stages 3c-7 and integrations`, `supabase/migrations (Postgres RLS, audit, atomic ops)` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 724 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `estoque/page.tsx`, `gestao/page.tsx`, `nav-painel.tsx`, `API aberta e MCP (rotas)`, `salvando`, `relatorios/page.tsx`, `fidelidade/actions.ts`, `web/package.json`, `sabores-pizza.tsx`, `app-motoboy.tsx`, `gestao/actions.ts`, `criarClienteServidor`, `gestao.ts`, `aplicativos.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `financeiro/page.tsx`, `evento.tsx`, `salvando`, `acompanhar-pedido.tsx`, `next`, `mercadopago.ts`, `ifood.tsx`, `painel-caixa.tsx`, `lojas/page.tsx`, `resumo/page.tsx`, `novo-pedido.tsx`, `cardapio-cliente.tsx`, `equipe.tsx`, `entregas/page.tsx`, `meta-mes.tsx`, `estoque/actions.ts`, `criarClienteServidor`, `ifood.tsx`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **What connects `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `pedidos.qr_token (/m/d/<código>)`, `GitHub Actions CI (rules, db, build)` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `estoque/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12903225806451613 - nodes in this community are weakly interconnected._
- **Why does `criarClienteServidor()` connect `criarClienteServidor` to `estoque/page.tsx`, `gestao/page.tsx`, `salvando`, `relatorios/page.tsx`, `m/actions.ts`, `fidelidade/actions.ts`, `sabores-pizza.tsx`, `app-motoboy.tsx`, `movimentos.tsx`, `gestao/actions.ts`, `criarClienteServidor`, `gestao.ts`, `aplicativos.tsx`, `salvando`, `importar-nfe.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `financeiro/page.tsx`, `evento.tsx`, `salvando`, `acompanhar-pedido.tsx`, `next`, `ifood.tsx`, `painel-caixa.tsx`, `impressao.ts`, `lojas/page.tsx`, `next`, `resumo/page.tsx`, `novo-pedido.tsx`, `cardapio-cliente.tsx`, `equipe.tsx`, `contagem.tsx`, `entregas/page.tsx`, `gestao.ts`, `meta-mes.tsx`, `funcionarios.tsx`, `estoque/actions.ts`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `20261020000001_base.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.10752688172043011 - nodes in this community are weakly interconnected._
- **Why does `react` connect `salvando` to `estoque/page.tsx`, `gestao/page.tsx`, `grafico-lojas.tsx`, `nav-painel.tsx`, `salvando`, `relatorios/page.tsx`, `fidelidade/actions.ts`, `sabores-pizza.tsx`, `web/package.json`, `movimentos.tsx`, `gestao/actions.ts`, `app-motoboy.tsx`, `insumos.tsx`, `criarClienteServidor`, `aplicativos.tsx`, `salvando`, `importar-nfe.tsx`, `gestao.ts`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `financeiro/page.tsx`, `evento.tsx`, `acompanhar-pedido.tsx`, `next`, `mercadopago.ts`, `ifood.tsx`, `painel-caixa.tsx`, `impressao.ts`, `lojas/page.tsx`, `resumo/page.tsx`, `montagem.tsx`, `novo-pedido.tsx`, `cardapio-cliente.tsx`, `equipe.tsx`, `contagem.tsx`, `entregas/page.tsx`, `gestao.ts`, `meta-mes.tsx`, `funcionarios.tsx`, `ao-vivo.tsx`, `criarClienteServidor`, `grafico-dias.tsx`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Should `gestao/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14130434782608695 - nodes in this community are weakly interconnected._