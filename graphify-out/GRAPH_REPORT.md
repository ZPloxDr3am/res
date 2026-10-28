# Graph Report - res  (2026-10-28)

## Corpus Check
- 307 files · ~264,565 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 2527 nodes · 6497 edges · 133 communities (113 shown, 20 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `71e630f5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.ts
- gestao/actions.ts
- 20261020000001_base.sql
- main.ts
- ref_node_assert
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
- public.produtos
- lib/aplicativos.ts
- Decisões de arquitetura — RES
- cardapio/actions.ts
- novo-pedido.tsx
- contextoLoja
- agendamento.ts
- tempo-real.tsx
- Promoções e cupons (tela)
- Quadro de pedidos
- ao-vivo.tsx
- editor-cardapio.tsx
- Workflow do APK do motoboy
- importar-nfe.tsx
- form-delivery.tsx
- fidelidade/actions.ts
- Bairros e entregas ao vivo
- Workflow do agente de impressão
- Montagem do cupom impresso
- saida.ts
- Rota e geolocalização
- preco.ts
- painel-caixa.tsx
- Configuração TypeScript
- Banco: cupons e descontos
- Banco: Mercado Pago
- Dependências do app do motoboy
- 20261028000052_gestao_empresarial.sql
- Grupo 45: package.json
- Grupo 46: package.json
- entregas/fechamento.tsx
- public.opcoes
- 20261021000004_cardapio_edicao.sql
- cardapio-cliente.tsx
- src/caixa.ts
- index.ts
- cardapio-dados.ts
- beefood_para_res.py
- public.pedidos
- pedido.ts
- graphify
- public.clientes
- promocao.test.ts
- cliente.tsx
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
- Grupo 74: 99_motoboy.sql
- Grupo 75: 99z_entregas_km.sql
- Grupo 76: 99zzzzzzzzzzzz_estoque.sql
- Grupo 77: 99zzzzzzzzzzzzzz_api.sql
- [slug]/page.tsx
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
- publico.ts
- 99zzzzzzzzzzzzzzzzzzz_gestao.sql
- Grupo 96: 70_caixa.sql
- 99zzzzzzzzzzzzzzzzz_taxa_km.sql
- cardapio.test.ts
- public.combo_passos
- Grupo 100: tempos_ajuste.sql
- form-setor.tsx
- Grupo 102: 20_cardapio_pedidos.sql
- Grupo 103: 40_cardapio_biblioteca.sql
- 99zz_promocao.sql
- Grupo 105: next.config.mjs
- Grupo 106: vercel.json
- expedicao.ts
- Grupo 108: test-db.sh
- resultados.tsx
- 20261021000005_pedidos.sql
- entregas/page.tsx
- escpos.ts
- 99zzzz_descontos.sql
- public.importar_cardapio
- pixCopiaECola
- public.lojas
- 99zzzzz_clientes.sql
- 99zzzzzzzzzzzzzzzzzzzz_equipe.sql
- impressoras.ts
- m/page.tsx
- TempoReal
- 20261021000007_cardapio_biblioteca.sql
- private.importar_cardapio

## God Nodes (most connected - your core abstractions)
1. `criarClienteServidor()` - 191 edges
2. `public.lojas` - 129 edges
3. `formatarReais()` - 110 edges
4. `public.pedidos` - 109 edges
5. `contextoLoja` - 100 edges
6. `public.marcas` - 100 edges
7. `salvando()` - 97 edges
8. `next` - 72 edges
9. `public.produtos` - 70 edges
10. `react` - 69 edges

## Surprising Connections (you probably didn't know these)
- `Ambiente no ar (piloto)` --references--> `main()`  [INFERRED]
  README.md → packages/agente/src/main.ts
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

## Communities (133 total, 20 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.05
Nodes (99): ajustarEstoque(), buscarMovimentos(), copiarFicha(), excluirInsumo(), feito(), FiltroMovimentos, importarNFe(), ItemImportar (+91 more)

### Community 1 - "gestao/actions.ts"
Cohesion: 0.06
Nodes (61): GET(), POST(), carregar(), dynamic, generateMetadata(), Grupo, PaginaGrupo(), fonte (+53 more)

### Community 2 - "20261020000001_base.sql"
Cohesion: 0.09
Nodes (28): grupos_acesso_atualizado, grupos_acesso_auditar, grupos_acesso_validar, lojas_atualizado, lojas_auditar, marcas_atualizado, marcas_auditar, marcas_loja_idx (+20 more)

### Community 3 - "main.ts"
Cohesion: 0.13
Nodes (29): acharWindows(), alcance(), argumento(), ARQ_CONFIG, ARQ_LOG, atualizarSePrecisar(), atualizarWindows(), Config (+21 more)

### Community 4 - "ref_node_assert"
Cohesion: 0.14
Nodes (12): D-029 · Segmentos de clientes para marketing, D-030 · Telefone sempre com o 9 do celular, CASOS_SEGMENTO, CASOS_TELEFONE, eCelular(), normalizarTelefone(), segmentoCliente(), SEGMENTOS (+4 more)

### Community 5 - "20261021000014_caixa.sql"
Cohesion: 0.06
Nodes (48): caixa_movimentos_sessao_idx, caixa_sessoes_auditar, caixa_sessoes_loja_idx, caixa_sessoes_uma_aberta_idx, caixas_auditar, caixas_nome_idx, lojas_caixa_inicial, pedidos_caixa_idx (+40 more)

### Community 6 - "Banco: impressão"
Cohesion: 0.06
Nodes (48): impressao_config_auditar, impressao_destinos_loja_idx, impressoes_loja_idx, impressoes_pedido_idx, impressoes_pendentes_idx, impressoras_auditar, impressoras_nome_idx, pedidos_imprimir_ao_aceitar (+40 more)

### Community 7 - "Banco: fidelidade"
Cohesion: 0.06
Nodes (44): fidelidade_mov_cliente_idx, fidelidade_mov_grupo_idx, fidelidade_mov_pedido_idx, fidelidade_recompensas_grupo_idx, pedidos_fidelidade, private.aplicar_cupom(), private.aplicar_fidelidade(), private.expirar_fidelidade() (+36 more)

### Community 8 - "Banco: estoque"
Cohesion: 0.08
Nodes (38): public.resumo_vendas(), private.cupom_da_loja(), public.relatorio_fidelidade(), estoque_mov_estoque_idx, estoque_mov_insumo_idx, estoque_mov_pedido_idx, fichas_opcao_idx, fichas_produto_idx (+30 more)

### Community 9 - "API aberta e MCP (rotas)"
Cohesion: 0.08
Nodes (33): DELETE, POST(), DELETE, POST(), GET(), OPTIONS, GET(), OPTIONS (+25 more)

### Community 10 - "Tela de impressoras"
Cohesion: 0.10
Nodes (39): ConfigImpressao, DadosImpressora, excluirImpressora(), gerarCodigoAgente(), imprimirTeste(), msg(), R, RC (+31 more)

### Community 11 - "Resumo de vendas"
Cohesion: 0.11
Nodes (35): Composicao, ComposicaoVendas(), dataBR(), dynamic, Kpi(), Metricas, PRESETS, Resumo (+27 more)

### Community 12 - "20261021000008_multilojas.sql"
Cohesion: 0.08
Nodes (32): contas_atualizado, contas_proteger_plano, contas_titulares_user_idx, lojas_conta_idx, lojas_limite, marcas_limite, pedidos_loja_criado_idx, private.e_titular() (+24 more)

### Community 13 - "acompanhar-pedido.tsx"
Cohesion: 0.31
Nodes (8): dynamic, metadata, PaginaAcompanhar(), AcompanharPedido(), ExtrasPedido, hora(), PagarPix(), Acompanhamento

### Community 14 - "Dependências do painel"
Cohesion: 0.06
Nodes (36): config, PUBLICAS, dependencies, jsqr@1.4.0, next@^15.5.9, qrcode@^1.5.4, react@^19.2.1, react-dom@^19.2.1 (+28 more)

### Community 15 - "CI (testes automáticos)"
Cohesion: 0.07
Nodes (34): name, runs-on, services, steps, DATABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, POSTGRES_PASSWORD (+26 more)

### Community 16 - "App do motoboy"
Cohesion: 0.17
Nodes (22): despachar(), entregar(), dynamic, metadata, PaginaDespacho(), Acerto(), AppMotoboy(), Aviso (+14 more)

### Community 17 - "public.produtos"
Cohesion: 0.13
Nodes (30): complementos_loja_idx, grupos_opcoes_loja_idx, opcoes_grupo_idx, private.setor_exige_marca(), produto_grupos_grupo_idx, produtos_loja_setor_idx, public.criar_grupo_vinculado(), public.criar_produto() (+22 more)

### Community 18 - "lib/aplicativos.ts"
Cohesion: 0.16
Nodes (13): dynamic, PaginaAplicativos(), App, CATALOGO, ChaveApi, EnvioWebhook, EVENTOS_WEBHOOK, Integracao (+5 more)

### Community 19 - "Decisões de arquitetura — RES"
Cohesion: 0.06
Nodes (35): D-002 Modelo multiloja: Loja → Marcas, D-003 Regras de cadastro valem no banco e no formulário, D-004 Auditoria calculada no servidor, D-005 Operações compostas são atômicas, D-006 Gravar só em ação explícita, D-007 Texto em UTF-8 completo, D-008 Nenhum segredo de integração no navegador, D-009 Preço de itens com grupos (decisão provisória, Q-009) (+27 more)

### Community 20 - "cardapio/actions.ts"
Cohesion: 0.23
Nodes (26): alterarDisponibilidade(), criarProduto(), definirFoto(), definirFotoOpcao(), definirGruposDoProduto(), definirProdutosDoGrupo(), desvincularGrupo(), duplicarGrupo() (+18 more)

### Community 21 - "novo-pedido.tsx"
Cohesion: 0.23
Nodes (21): buscarClientes(), autorizarDesconto(), GruposBalcao(), ItemCarrinho, lerCentavos(), Montador(), MontadorCombo(), NovoPedido() (+13 more)

### Community 22 - "contextoLoja"
Cohesion: 0.14
Nodes (33): conectarMercadoPago(), criarChaveApi(), desconectarMercadoPago(), excluirWebhook(), mpAceitarAoPagar(), R, removerIntegracao(), revogarChaveApi() (+25 more)

### Community 23 - "agendamento.ts"
Cohesion: 0.30
Nodes (10): D-011 Pedido agendado e taxa por bairro no painel, chaveBairro(), dataNoFuso(), DIAS_CURTOS, faseAgendamento, FOLGA_AGENDADO_MIN, horaNoFuso(), partes() (+2 more)

### Community 24 - "tempo-real.tsx"
Cohesion: 0.14
Nodes (20): CategoriaOrigem, salvarDetalheOpcao(), definirModoEstoque(), BotaoExcluir(), DetalheOpcao(), FotoOpcao(), reduzir(), TIPOS (+12 more)

### Community 25 - "Promoções e cupons (tela)"
Cohesion: 0.12
Nodes (33): agenda(), alternarCupom(), CupomForm, excluirCupom(), excluirPromoCategoria(), fim(), PromoCategoriaForm, R (+25 more)

### Community 26 - "Quadro de pedidos"
Cohesion: 0.15
Nodes (25): cuponsPendentes(), imprimirPedido(), criarPedido(), definirAceiteAutomatico(), marcarPago(), mensagem(), mudarStatus(), Resultado (+17 more)

### Community 27 - "ao-vivo.tsx"
Cohesion: 0.28
Nodes (10): rastreioAoVivo(), CORES, haQuanto(), iniciais(), MapaAoVivo(), segundos(), MapaCliente(), Ponto (+2 more)

### Community 28 - "editor-cardapio.tsx"
Cohesion: 0.16
Nodes (25): PassoForm, Resultado, AplicarGrupo(), EditorCardapio(), Marca, Painel, EditorCombo(), lerCentavos() (+17 more)

### Community 29 - "Workflow do APK do motoboy"
Cohesion: 0.08
Nodes (24): runs-on, steps, GH_TOKEN, KS_B64, KS_PASS, jobs, apk, name (+16 more)

### Community 30 - "importar-nfe.tsx"
Cohesion: 0.21
Nodes (9): areas_entrega_auditar, marca_horarios_auditar, private.marca_aberta(), public.areas_entrega, public.marca_horarios, public.salvar_config_delivery(), private.taxa_bairro(), private.area_do_pedido() (+1 more)

### Community 31 - "form-delivery.tsx"
Cohesion: 0.18
Nodes (18): ConfigDelivery, definirStatus(), replicarHorarios(), salvarConfig(), salvarVitrine(), Vitrine, Delivery(), dynamic (+10 more)

### Community 32 - "fidelidade/actions.ts"
Cohesion: 0.11
Nodes (34): ajustarSaldo(), buscarSaldos(), copiarPrograma(), excluirRecompensa(), extratoCliente(), R, salvarConfigFidelidade(), salvarRecompensa() (+26 more)

### Community 33 - "Bairros e entregas ao vivo"
Cohesion: 0.15
Nodes (24): AoVivo, AreaForm, calcularKmBairro(), FaixaForm, localizarLoja(), MotoboyAoVivo, R, salvarAreas() (+16 more)

### Community 34 - "Workflow do agente de impressão"
Cohesion: 0.09
Nodes (21): GH_TOKEN, runs-on, steps, jobs, exe, name, on, push (+13 more)

### Community 35 - "Montagem do cupom impresso"
Cohesion: 0.18
Nodes (18): blocosCombo(), colunasLR(), CupomDados, cupomTexto(), dataHora(), FRACAO, fracaoTexto(), LAYOUT_PADRAO (+10 more)

### Community 36 - "saida.ts"
Cohesion: 0.10
Nodes (18): adapt, app, g, gradle, m, man, permissoes, res (+10 more)

### Community 37 - "Rota e geolocalização"
Cohesion: 0.16
Nodes (24): chegadas(), espera(), medirEntrega(), montar(), planejarRota(), PlanoRota, hora(), PlanoRotaMotoboy() (+16 more)

### Community 38 - "preco.ts"
Cohesion: 0.17
Nodes (16): EscolhaPasso, PassoCombo, grupoVisivel(), opcaoVisivel(), precoGrupo(), precoOpcao(), validarEscolhasGrupo(), Canal (+8 more)

### Community 39 - "painel-caixa.tsx"
Cohesion: 0.07
Nodes (53): cadastrar(), credenciais(), entrar(), abrirCaixa(), fecharCaixa(), movimentar(), msg(), R (+45 more)

### Community 40 - "Configuração TypeScript"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 41 - "Banco: cupons e descontos"
Cohesion: 0.14
Nodes (15): cupons_auditar, cupons_codigo_idx, pedidos_cupom_idx, private.agenda_vale(), private.aplicar_cupom(), private.desconto_categoria_pct(), private.desconto_cupom(), private.preco_combo() (+7 more)

### Community 42 - "Banco: Mercado Pago"
Cohesion: 0.16
Nodes (13): mp_pagamentos_pedido_idx, public.desconectar_mp(), public.mp_contas, public.mp_pagamentos, public.mp_status(), public.salvar_mp(), public.mp_aceitar_ao_pagar(), public.mp_status() (+5 more)

### Community 43 - "Dependências do app do motoboy"
Cohesion: 0.14
Nodes (17): dependencies, @capacitor/android@6.2.0, @capacitor/app@6.0.2, @capacitor/cli@6.2.0, @capacitor-community/background-geolocation@1.2.26, @capacitor/core@6.2.0, description, name (+9 more)

### Community 44 - "20261028000052_gestao_empresarial.sql"
Cohesion: 0.27
Nodes (13): custos_auditar, custos_loja_idx, funcionario_registros_idx, funcionario_registros_numero, funcionarios_loja_idx, gestao_empresa_auditar, private.contadores_registro, private.numerar_registro() (+5 more)

### Community 45 - "Grupo 45: package.json"
Cohesion: 0.14
Nodes (17): description, devDependencies, esbuild@0.24.0, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, tsx, @types/node (+9 more)

### Community 46 - "Grupo 46: package.json"
Cohesion: 0.13
Nodes (17): description, devDependencies, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, exports, tsx, @types/node (+9 more)

### Community 47 - "entregas/fechamento.tsx"
Cohesion: 0.21
Nodes (15): ajustarEntrega(), CartaoMotoboy(), FechamentoMotoboys(), FONTE, hora(), LinhaEntrega(), Numero(), Total (+7 more)

### Community 48 - "public.opcoes"
Cohesion: 0.23
Nodes (25): public.complementos, public.grupos_opcoes, public.opcoes, public.produto_grupos, public.produto_marcas, private.preco_item(), private.produto_publico(), public.definir_produtos_do_grupo() (+17 more)

### Community 49 - "20261021000004_cardapio_edicao.sql"
Cohesion: 0.29
Nodes (4): public.criar_grupo_vinculado(), public.desvincular_grupo(), public.reordenar(), public.vincular_grupo()

### Community 50 - "cardapio-cliente.tsx"
Cohesion: 0.13
Nodes (31): conferirCupom(), situacaoPedidos(), CardapioCliente(), Checkout(), ETIQUETA, Extras(), gravar(), Item (+23 more)

### Community 51 - "src/caixa.ts"
Cohesion: 0.20
Nodes (13): marcarImpressao(), RC, colunasNavegador(), CSS_CUPOM, CupomFila, cupomHtml(), esc(), imprimirNoNavegador() (+5 more)

### Community 52 - "index.ts"
Cohesion: 0.24
Nodes (16): exportarClientes(), listarClientes(), salvarCliente(), Clientes(), dynamic, baixarCsv(), FichaCliente(), ListaClientes() (+8 more)

### Community 53 - "cardapio-dados.ts"
Cohesion: 0.15
Nodes (18): dadosNovoPedido(), dynamic, PaginaNovoPedido(), RascunhoPedido, AbrirPorLink(), Contexto, Ctx, Estado (+10 more)

### Community 54 - "beefood_para_res.py"
Cohesion: 0.33
Nodes (3): converter(), limpa(), L()

### Community 55 - "public.pedidos"
Cohesion: 0.07
Nodes (32): public.pedidos, private.composicao_vendas(), public.resumo_vendas(), pedidos_entregador_idx, pedidos_qr_idx, public.motoboy_despachar(), public.motoboy_entregar(), public.motoboy_painel() (+24 more)

### Community 56 - "pedido.ts"
Cohesion: 0.31
Nodes (9): acaoAvancar(), LinhaTotal, proximosStatus(), STATUS_ROTULO, TIPO_ROTULO, Totais, transicaoValida(), ResultadoPreco (+1 more)

### Community 58 - "public.clientes"
Cohesion: 0.11
Nodes (21): clientes_auditar, clientes_grupo_nome_idx, pedidos_cliente_idx, pedidos_registra_cliente, private.grupo_da_loja(), private.pedido_registra_cliente(), public.buscar_clientes(), public.cliente_enderecos (+13 more)

### Community 59 - "promocao.test.ts"
Cohesion: 0.24
Nodes (11): D-021 Cardápio novo: cards com foto e promoção De/Por com agenda, AgendaPromo, diaAnterior(), diaDaSemana(), DIAS_CURTOS, partesLocais(), promoEncerrada(), promoVale() (+3 more)

### Community 60 - "cliente.tsx"
Cohesion: 0.18
Nodes (18): programaFidelidade(), saldoFidelidade(), saldoDoCliente(), FidelidadeBalcao(), UsoFidelidade, FidelidadeCliente(), lembrarPedidoFidelidade(), ler() (+10 more)

### Community 61 - "[slug]/actions.ts"
Cohesion: 0.17
Nodes (16): POST(), calcularEntregaKm(), conferirPixMercadoPago(), EntregaKm, enviarPedido(), PedidoCliente, pixMercadoPago(), PagarPixMp() (+8 more)

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
Cohesion: 0.10
Nodes (17): pedidos.qr_token (/m/d/<código>), Ambiente no ar (piloto), Colocar no ar, contas table plans and limits (plano, limite_lojas, limite_cardapios), Estrutura, GitHub Actions CI (rules, db, build), Multilojas (conta → lojas → marcas), O que já funciona (+9 more)

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
Cohesion: 0.32
Nodes (4): agruparEntregas (core), OSRM / Nominatim (OpenStreetMap services), otimizarRota (core), Shift window 05:00→05:00

### Community 73 - "equipe.tsx"
Cohesion: 0.06
Nodes (53): PainelLayout(), alterarFuncao(), cancelarConvite(), convidar(), criarCardapio(), criarLoja(), criarUsuarioCaixa(), definirAtivo() (+45 more)

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

### Community 78 - "[slug]/page.tsx"
Cohesion: 0.18
Nodes (15): FaixaKm, carregar(), dynamic, generateMetadata(), PaginaCardapio(), carregar(), enviar(), Janela (+7 more)

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

### Community 93 - "Grupo 93: 99zzzzzzzzzzzzzzz_mercadopago.sql"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 94 - "publico.ts"
Cohesion: 0.17
Nodes (16): acrescimo(), cheio(), completo(), Extras, GruposMontagem(), minimo(), SELO, DIAS (+8 more)

### Community 95 - "99zzzzzzzzzzzzzzzzzzz_gestao.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 96 - "Grupo 96: 70_caixa.sql"
Cohesion: 0.47
Nodes (4): ids, pg_temp.como(), pg_temp.id(), saida

### Community 97 - "99zzzzzzzzzzzzzzzzz_taxa_km.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 98 - "cardapio.test.ts"
Cohesion: 0.11
Nodes (25): DadosGrupo, FORMACOES, FormGrupo(), GrupoInicial, lerPreco(), mostrarPreco(), OpcaoForm, vazio (+17 more)

### Community 99 - "public.combo_passos"
Cohesion: 0.17
Nodes (7): private.preco_item(), combo_passos_auditar, combo_passos_combo_idx, private.preco_combo(), public.combo_passos, public.duplicar_produto(), public.salvar_combo()

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

### Community 107 - "expedicao.ts"
Cohesion: 0.16
Nodes (16): espera(), LoteSugerido, sugerirLotes(), SugestaoLoja, SugestaoLotes(), D-028 · Cliente acompanha a entrega, prazo por loja, alerta e lotes na expedição, tempos e atrasos, Ponto, agruparEntregas() (+8 more)

### Community 116 - "resultados.tsx"
Cohesion: 0.17
Nodes (14): DIAS, FAIXA, MEC, ORIGEM, pct(), PERFIL, PERIODOS, REC (+6 more)

### Community 117 - "20261021000005_pedidos.sql"
Cohesion: 0.16
Nodes (9): pedido_eventos_pedido_idx, pedido_item_opcoes_item_idx, pedido_itens_pedido_idx, pedidos_atualizado, pedidos_loja_status_idx, private.contador_pedidos, public.mudar_status_pedido(), public.pedido_eventos (+1 more)

### Community 118 - "entregas/page.tsx"
Cohesion: 0.26
Nodes (10): diaDoTurno(), dynamic, Entregas(), BairrosEntregas(), diaCurto(), pct(), PERIODOS, Relatorio (+2 more)

### Community 119 - "escpos.ts"
Cohesion: 0.29
Nodes (9): codificar(), CP850, CP860, ESC_T, Pagina, semAcento(), ConfigImpressora, gerarEscPos() (+1 more)

### Community 120 - "99zzzz_descontos.sql"
Cohesion: 0.47
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 122 - "pixCopiaECola"
Cohesion: 0.39
Nodes (7): campo(), crc16Pix(), FORMATOS_RASTREAMENTO, normalizarChavePix(), pixCopiaECola(), semAcento(), TipoChavePix

### Community 123 - "public.lojas"
Cohesion: 0.10
Nodes (43): public.lojas, public.marcas, public.criar_pedido(), public.pedido_item_opcoes, public.pedido_itens, public.acompanhar_pedido(), private.limite_lojas(), public.replicar_horarios() (+35 more)

### Community 125 - "99zzzzz_clientes.sql"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 126 - "99zzzzzzzzzzzzzzzzzzzz_equipe.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 127 - "impressoras.ts"
Cohesion: 0.33
Nodes (4): ModeloImpressora, PaginaCodigo, PAGINAS_CODIGO, Protocolo

### Community 129 - "m/page.tsx"
Cohesion: 0.50
Nodes (4): painelMotoboy(), dynamic, maxDuration, Motoboy()

### Community 130 - "TempoReal"
Cohesion: 0.60
Nodes (4): Cardapio(), dynamic, TempoReal(), carregarCardapio()

### Community 132 - "private.importar_cardapio"
Cohesion: 0.67
Nodes (3): private.importacoes, private.importar_cardapio(), pg_temp.k()

## Knowledge Gaps
- **9 isolated node(s):** `pedidos.qr_token (/m/d/<código>)`, `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `GitHub Actions CI (rules, db, build)`, `Roadmap stages 3c-7 and integrations`, `supabase/migrations (Postgres RLS, audit, atomic ops)` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 612 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `gestao/actions.ts` to `index.ts`, `API aberta e MCP (rotas)`, `Tela de impressoras`, `Resumo de vendas`, `acompanhar-pedido.tsx`, `Dependências do painel`, `App do motoboy`, `lib/aplicativos.ts`, `cardapio/actions.ts`, `novo-pedido.tsx`, `contextoLoja`, `tempo-real.tsx`, `Promoções e cupons (tela)`, `Quadro de pedidos`, `form-delivery.tsx`, `fidelidade/actions.ts`, `Bairros e entregas ao vivo`, `Rota e geolocalização`, `painel-caixa.tsx`, `cardapio-cliente.tsx`, `index.ts`, `cardapio-dados.ts`, `[slug]/actions.ts`, `equipe.tsx`, `[slug]/page.tsx`, `resultados.tsx`, `entregas/page.tsx`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **What connects `pedidos.qr_token (/m/d/<código>)`, `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `GitHub Actions CI (rules, db, build)` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05244530244530245 - nodes in this community are weakly interconnected._
- **Why does `formatarReais()` connect `index.ts` to `Resumo de vendas`, `acompanhar-pedido.tsx`, `App do motoboy`, `novo-pedido.tsx`, `contextoLoja`, `Promoções e cupons (tela)`, `Quadro de pedidos`, `editor-cardapio.tsx`, `form-delivery.tsx`, `fidelidade/actions.ts`, `Bairros e entregas ao vivo`, `Montagem do cupom impresso`, `preco.ts`, `painel-caixa.tsx`, `entregas/fechamento.tsx`, `cardapio-cliente.tsx`, `index.ts`, `cardapio-dados.ts`, `cliente.tsx`, `[slug]/actions.ts`, `publico.ts`, `cardapio.test.ts`, `resultados.tsx`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Should `gestao/actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.060240963855421686 - nodes in this community are weakly interconnected._
- **Why does `criarClienteServidor()` connect `cardapio/actions.ts` to `index.ts`, `gestao/actions.ts`, `m/page.tsx`, `TempoReal`, `Tela de impressoras`, `Resumo de vendas`, `acompanhar-pedido.tsx`, `App do motoboy`, `lib/aplicativos.ts`, `novo-pedido.tsx`, `contextoLoja`, `tempo-real.tsx`, `Promoções e cupons (tela)`, `Quadro de pedidos`, `ao-vivo.tsx`, `form-delivery.tsx`, `fidelidade/actions.ts`, `Bairros e entregas ao vivo`, `Rota e geolocalização`, `painel-caixa.tsx`, `entregas/fechamento.tsx`, `cardapio-cliente.tsx`, `src/caixa.ts`, `index.ts`, `cardapio-dados.ts`, `cliente.tsx`, `[slug]/actions.ts`, `equipe.tsx`, `[slug]/page.tsx`, `form-setor.tsx`, `expedicao.ts`, `entregas/page.tsx`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Should `20261020000001_base.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.08558558558558559 - nodes in this community are weakly interconnected._