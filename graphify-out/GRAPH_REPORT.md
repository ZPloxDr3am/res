# Graph Report - res  (2026-10-28)

## Corpus Check
- 307 files · ~264,666 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 2521 nodes · 6501 edges · 133 communities (114 shown, 19 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f07a1781`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- lib/estoque.ts
- gestao/actions.ts
- 20261020000001_base.sql
- main.ts
- normalizarTelefone
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
- criarClienteServidor
- Decisões de arquitetura — RES
- next
- novo-pedido.tsx
- contextoLoja
- agendamento.ts
- react
- Promoções e cupons (tela)
- Quadro de pedidos
- entregas/page.tsx
- cardapio/actions.ts
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
- pg_temp.como
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
- importar-nfe.tsx
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
- cardapio.test.ts
- Grupo 102: 20_cardapio_pedidos.sql
- Grupo 103: 40_cardapio_biblioteca.sql
- 99zz_promocao.sql
- Grupo 105: next.config.mjs
- Grupo 106: vercel.json
- expedicao.ts
- Grupo 108: test-db.sh
- sabores-pizza.tsx
- anon
- pedido-flutuante.tsx
- escpos.ts
- 99zzzz_descontos.sql
- public.importar_cardapio
- pixCopiaECola
- public.lojas
- 99zzzzz_clientes.sql
- 99zzzzzzzzzzzzzzzzzzzz_equipe.sql
- impressoras.ts
- insumos.tsx
- grafico-dias.tsx
- 50_multilojas.sql
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
- `D-022 Combos com escolhas e categoria de up-sell` --references--> `calcularCombo()`  [INFERRED]
  docs/decisoes.md → packages/core/src/combo.ts
- `D-014 Impressão: fila no banco, regras como no BeeFood, navegador até o agente chegar` --references--> `montarCupom()`  [INFERRED]
  docs/decisoes.md → packages/core/src/cupom.ts
- `D-015 Agente de impressão do Windows (RES Impressão)` --references--> `montarCupom()`  [INFERRED]
  docs/decisoes.md → packages/core/src/cupom.ts
- `D-023 % por categoria, cupons e desconto no balcão com limite` --references--> `precoBase()`  [INFERRED]
  docs/decisoes.md → packages/core/src/preco.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Rules duplicated in core and DB with shared test cases** — docs_decisoes_d_021_cardapio_cards_promo, docs_decisoes_d_022_combos_upsell, docs_decisoes_d_029_segmentos_clientes, docs_decisoes_d_030_telefone_nono_digito, docs_decisoes_d_031_fidelidade_grupo, docs_decisoes_core_db_parity [EXTRACTED 1.00]
- **Motoboy delivery flow (QR dispatch, app, tracking, routing)** — docs_decisoes_d_017_app_motoboy_qr, docs_decisoes_d_018_comanda_motoboy_pago, docs_decisoes_d_019_app_android_leitor_qr, docs_decisoes_d_026_rastreio_motoboys, docs_decisoes_d_027_rota_sugerida, apps_mobile_motoboy_readme_res_motoboy_android [INFERRED 0.85]
- **Stock management module (NF-e, recipes, counts, CMV)** — docs_decisoes_d_036_estoque_nfe_ficha, docs_decisoes_d_037_movimentacoes_estoque, docs_decisoes_d_038_meu_estoque_contagem, docs_decisoes_d_039_fechamento_cmv, docs_decisoes_d_040_ficha_sabor_pizza [INFERRED 0.85]

## Communities (133 total, 19 thin omitted)

### Community 0 - "lib/estoque.ts"
Cohesion: 0.12
Nodes (25): buscarMovimentos(), FiltroMovimentos, dataCurta(), Fechamento(), pctTexto(), somaMes(), hoje(), menos() (+17 more)

### Community 1 - "gestao/actions.ts"
Cohesion: 0.10
Nodes (47): excluirRegistro(), FuncionarioForm, lojaGestor(), R, RegistroForm, salvarCustos(), salvarEmpresa(), salvarFuncionario() (+39 more)

### Community 2 - "20261020000001_base.sql"
Cohesion: 0.09
Nodes (26): grupos_acesso_atualizado, grupos_acesso_auditar, grupos_acesso_validar, lojas_atualizado, lojas_auditar, marcas_atualizado, marcas_auditar, marcas_loja_idx (+18 more)

### Community 3 - "main.ts"
Cohesion: 0.14
Nodes (27): acharWindows(), alcance(), argumento(), ARQ_CONFIG, ARQ_LOG, atualizarSePrecisar(), atualizarWindows(), Config (+19 more)

### Community 4 - "normalizarTelefone"
Cohesion: 0.35
Nodes (9): D-029 · Segmentos de clientes para marketing, D-030 · Telefone sempre com o 9 do celular, CASOS_SEGMENTO, CASOS_TELEFONE, eCelular(), normalizarTelefone(), segmentoCliente(), SEGMENTOS (+1 more)

### Community 5 - "20261021000014_caixa.sql"
Cohesion: 0.05
Nodes (49): caixa_movimentos_sessao_idx, caixa_sessoes_auditar, caixa_sessoes_loja_idx, caixa_sessoes_uma_aberta_idx, caixas_auditar, caixas_nome_idx, lojas_caixa_inicial, pedidos_caixa_idx (+41 more)

### Community 6 - "Banco: impressão"
Cohesion: 0.06
Nodes (48): impressao_config_auditar, impressao_destinos_loja_idx, impressoes_loja_idx, impressoes_pedido_idx, impressoes_pendentes_idx, impressoras_auditar, impressoras_nome_idx, pedidos_imprimir_ao_aceitar (+40 more)

### Community 7 - "Banco: fidelidade"
Cohesion: 0.05
Nodes (57): clientes_auditar, clientes_grupo_nome_idx, pedidos_cliente_idx, pedidos_registra_cliente, private.grupo_da_loja(), private.pedido_registra_cliente(), public.buscar_clientes(), public.cliente_enderecos (+49 more)

### Community 8 - "Banco: estoque"
Cohesion: 0.09
Nodes (32): private.cupom_da_loja(), estoque_mov_estoque_idx, estoque_mov_insumo_idx, estoque_mov_pedido_idx, fichas_opcao_idx, fichas_produto_idx, insumos_estoque_idx, pedidos_estoque (+24 more)

### Community 9 - "API aberta e MCP (rotas)"
Cohesion: 0.08
Nodes (33): DELETE, POST(), DELETE, POST(), GET(), OPTIONS, GET(), OPTIONS (+25 more)

### Community 10 - "Tela de impressoras"
Cohesion: 0.10
Nodes (39): ConfigImpressao, DadosImpressora, excluirImpressora(), gerarCodigoAgente(), imprimirPedido(), imprimirTeste(), msg(), R (+31 more)

### Community 11 - "Resumo de vendas"
Cohesion: 0.15
Nodes (28): Composicao, ComposicaoVendas(), dataBR(), dynamic, Kpi(), Metricas, PRESETS, Resumo (+20 more)

### Community 12 - "20261021000008_multilojas.sql"
Cohesion: 0.09
Nodes (31): contas_atualizado, contas_proteger_plano, contas_titulares_user_idx, lojas_conta_idx, lojas_limite, marcas_limite, pedidos_loja_criado_idx, private.e_titular() (+23 more)

### Community 13 - "acompanhar-pedido.tsx"
Cohesion: 0.17
Nodes (16): dynamic, metadata, PaginaAcompanhar(), AcompanharPedido(), ExtrasPedido, hora(), PagarPix(), carregar() (+8 more)

### Community 14 - "Dependências do painel"
Cohesion: 0.06
Nodes (36): config, PUBLICAS, dependencies, jsqr@1.4.0, next@^15.5.9, qrcode@^1.5.4, react@^19.2.1, react-dom@^19.2.1 (+28 more)

### Community 15 - "CI (testes automáticos)"
Cohesion: 0.07
Nodes (34): name, runs-on, services, steps, DATABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, POSTGRES_PASSWORD (+26 more)

### Community 16 - "App do motoboy"
Cohesion: 0.11
Nodes (34): despachar(), entregar(), PlanoRota, dynamic, metadata, PaginaDespacho(), Acerto(), AppMotoboy() (+26 more)

### Community 17 - "public.produtos"
Cohesion: 0.13
Nodes (31): complementos_loja_idx, grupos_opcoes_loja_idx, opcoes_grupo_idx, private.setor_exige_marca(), produto_grupos_grupo_idx, produtos_loja_setor_idx, public.criar_grupo_vinculado(), public.criar_produto() (+23 more)

### Community 18 - "criarClienteServidor"
Cohesion: 0.16
Nodes (27): conectarMercadoPago(), criarChaveApi(), desconectarMercadoPago(), excluirWebhook(), mpAceitarAoPagar(), R, removerIntegracao(), revogarChaveApi() (+19 more)

### Community 19 - "Decisões de arquitetura — RES"
Cohesion: 0.06
Nodes (35): D-002 Modelo multiloja: Loja → Marcas, D-003 Regras de cadastro valem no banco e no formulário, D-004 Auditoria calculada no servidor, D-005 Operações compostas são atômicas, D-006 Gravar só em ação explícita, D-007 Texto em UTF-8 completo, D-008 Nenhum segredo de integração no navegador, D-009 Preço de itens com grupos (decisão provisória, Q-009) (+27 more)

### Community 20 - "next"
Cohesion: 0.10
Nodes (14): GET(), POST(), carregar(), dynamic, generateMetadata(), Grupo, PaginaGrupo(), fonte (+6 more)

### Community 21 - "novo-pedido.tsx"
Cohesion: 0.20
Nodes (20): buscarClientes(), autorizarDesconto(), dadosNovoPedido(), dynamic, PaginaNovoPedido(), GruposBalcao(), ItemCarrinho, lerCentavos() (+12 more)

### Community 22 - "contextoLoja"
Cohesion: 0.11
Nodes (34): dynamic, copiar(), ENDPOINTS, FormWebhook(), LinhaWebhook(), ListaChaves(), NovaChave(), PainelApiAberta() (+26 more)

### Community 23 - "agendamento.ts"
Cohesion: 0.30
Nodes (10): D-011 Pedido agendado e taxa por bairro no painel, chaveBairro(), dataNoFuso(), DIAS_CURTOS, faseAgendamento, FOLGA_AGENDADO_MIN, horaNoFuso(), partes() (+2 more)

### Community 24 - "react"
Cohesion: 0.20
Nodes (16): copiarFicha(), salvarFicha(), dynamic, Estoque(), Alvo, chave(), Editor(), Fichas() (+8 more)

### Community 25 - "Promoções e cupons (tela)"
Cohesion: 0.12
Nodes (32): agenda(), alternarCupom(), CupomForm, excluirCupom(), excluirPromoCategoria(), fim(), PromoCategoriaForm, R (+24 more)

### Community 26 - "Quadro de pedidos"
Cohesion: 0.14
Nodes (19): criarPedido(), definirAceiteAutomatico(), marcarPago(), mensagem(), mudarStatus(), NovoPedido, Resultado, CartaoPedido() (+11 more)

### Community 27 - "entregas/page.tsx"
Cohesion: 0.14
Nodes (20): rastreioAoVivo(), diaDoTurno(), dynamic, Entregas(), CORES, haQuanto(), iniciais(), MapaAoVivo() (+12 more)

### Community 28 - "cardapio/actions.ts"
Cohesion: 0.11
Nodes (47): alterarDisponibilidade(), CategoriaOrigem, criarProduto(), definirFoto(), definirFotoOpcao(), definirGruposDoProduto(), definirProdutosDoGrupo(), desvincularGrupo() (+39 more)

### Community 29 - "Workflow do APK do motoboy"
Cohesion: 0.08
Nodes (24): runs-on, steps, GH_TOKEN, KS_B64, KS_PASS, jobs, apk, name (+16 more)

### Community 30 - "importar-nfe.tsx"
Cohesion: 0.21
Nodes (9): areas_entrega_auditar, marca_horarios_auditar, private.marca_aberta(), public.areas_entrega, public.marca_horarios, public.salvar_config_delivery(), private.taxa_bairro(), private.area_do_pedido() (+1 more)

### Community 31 - "form-delivery.tsx"
Cohesion: 0.18
Nodes (17): PedidoCliente, ConfigDelivery, definirStatus(), replicarHorarios(), salvarConfig(), salvarVitrine(), Vitrine, dynamic (+9 more)

### Community 32 - "fidelidade/actions.ts"
Cohesion: 0.06
Nodes (60): ajustarSaldo(), buscarSaldos(), copiarPrograma(), excluirRecompensa(), extratoCliente(), R, saldoDoCliente(), salvarConfigFidelidade() (+52 more)

### Community 33 - "Bairros e entregas ao vivo"
Cohesion: 0.16
Nodes (24): AoVivo, AreaForm, calcularKmBairro(), FaixaForm, localizarLoja(), MotoboyAoVivo, R, salvarAreas() (+16 more)

### Community 34 - "Workflow do agente de impressão"
Cohesion: 0.09
Nodes (21): GH_TOKEN, runs-on, steps, jobs, exe, name, on, push (+13 more)

### Community 35 - "Montagem do cupom impresso"
Cohesion: 0.18
Nodes (18): blocosCombo(), colunasLR(), CupomDados, cupomTexto(), dataHora(), FRACAO, fracaoTexto(), LAYOUT_PADRAO (+10 more)

### Community 36 - "saida.ts"
Cohesion: 0.09
Nodes (20): adapt, app, g, gradle, m, man, permissoes, res (+12 more)

### Community 37 - "Rota e geolocalização"
Cohesion: 0.17
Nodes (21): chegadas(), espera(), medirEntrega(), montar(), painelMotoboy(), planejarRota(), dynamic, maxDuration (+13 more)

### Community 38 - "preco.ts"
Cohesion: 0.14
Nodes (24): calcularCombo(), PassoCombo, precoSeparado(), LinhaTotal, Totais, calcularItem(), ErroEscolha, grupoVisivel() (+16 more)

### Community 39 - "painel-caixa.tsx"
Cohesion: 0.08
Nodes (50): cadastrar(), credenciais(), entrar(), abrirCaixa(), fecharCaixa(), movimentar(), msg(), R (+42 more)

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
Cohesion: 0.20
Nodes (14): ajustarEntrega(), CartaoMotoboy(), FechamentoMotoboys(), FONTE, hora(), LinhaEntrega(), Numero(), Total (+6 more)

### Community 48 - "public.opcoes"
Cohesion: 0.18
Nodes (27): public.complementos, public.grupos_opcoes, public.opcoes, public.produto_grupos, public.produto_marcas, private.preco_item(), private.produto_publico(), public.definir_grupos_do_produto() (+19 more)

### Community 49 - "20261021000004_cardapio_edicao.sql"
Cohesion: 0.29
Nodes (4): public.criar_grupo_vinculado(), public.desvincular_grupo(), public.reordenar(), public.vincular_grupo()

### Community 50 - "cardapio-cliente.tsx"
Cohesion: 0.12
Nodes (33): calcularEntregaKm(), conferirCupom(), enviarPedido(), situacaoPedidos(), CardapioCliente(), Checkout(), ETIQUETA, Extras() (+25 more)

### Community 51 - "src/caixa.ts"
Cohesion: 0.18
Nodes (15): marcarImpressao(), RC, useImprimir(), FilaImpressao(), colunasNavegador(), CSS_CUPOM, CupomFila, cupomHtml() (+7 more)

### Community 52 - "index.ts"
Cohesion: 0.25
Nodes (15): exportarClientes(), listarClientes(), salvarCliente(), Clientes(), dynamic, baixarCsv(), FichaCliente(), ListaClientes() (+7 more)

### Community 53 - "cardapio-dados.ts"
Cohesion: 0.29
Nodes (10): Cardapio(), dynamic, carregarCardapio(), Cardapio, GrupoRow, OpcaoRow, PassoRow, ProdutoMarcaRow (+2 more)

### Community 54 - "beefood_para_res.py"
Cohesion: 0.33
Nodes (3): converter(), limpa(), L()

### Community 55 - "public.pedidos"
Cohesion: 0.06
Nodes (37): pedidos_atualizado, pedidos_loja_status_idx, public.pedidos, private.composicao_vendas(), public.resumo_vendas(), pedidos_entregador_idx, pedidos_qr_idx, private.motoboy_no_grupo() (+29 more)

### Community 56 - "pedido.ts"
Cohesion: 0.42
Nodes (7): acaoAvancar(), ErroPedido, proximosStatus(), STATUS_ROTULO, totalizar(), transicaoValida(), troco()

### Community 58 - "pg_temp.como"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 59 - "promocao.test.ts"
Cohesion: 0.21
Nodes (14): AbaProduto(), D-021 Cardápio novo: cards com foto e promoção De/Por com agenda, AgendaPromo, diaAnterior(), diaDaSemana(), DIAS_CURTOS, partesLocais(), percentualDesconto() (+6 more)

### Community 60 - "cliente.tsx"
Cohesion: 0.52
Nodes (6): programaFidelidade(), saldoFidelidade(), FidelidadeCliente(), lembrarPedidoFidelidade(), ler(), provaFidelidade()

### Community 61 - "[slug]/actions.ts"
Cohesion: 0.19
Nodes (15): POST(), conferirPixMercadoPago(), EntregaKm, FaixaKm, pixMercadoPago(), PagarPixMp(), atualizarPagamento(), conferirPix() (+7 more)

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
Cohesion: 0.09
Nodes (45): alterarFuncao(), cancelarConvite(), convidar(), criarCardapio(), criarLoja(), criarUsuarioCaixa(), definirAtivo(), definirCidade() (+37 more)

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

### Community 78 - "importar-nfe.tsx"
Cohesion: 0.16
Nodes (24): importarNFe(), vinculosFornecedor(), cnpjTexto(), dataTexto(), ImportarNFe(), lerFator(), Linha, D-036 · Estoque: entrada por NF-e e baixa pela ficha técnica (+16 more)

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
Cohesion: 0.12
Nodes (23): carregar(), dynamic, generateMetadata(), PaginaCardapio(), acrescimo(), cheio(), completo(), Extras (+15 more)

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
Cohesion: 0.13
Nodes (24): DadosGrupo, salvarDetalheOpcao(), salvarGrupo(), DetalheOpcao(), FotoOpcao(), reduzir(), TIPOS, useEnviarFoto() (+16 more)

### Community 99 - "public.combo_passos"
Cohesion: 0.17
Nodes (7): private.preco_item(), combo_passos_auditar, combo_passos_combo_idx, private.preco_combo(), public.combo_passos, public.duplicar_produto(), public.salvar_combo()

### Community 101 - "cardapio.test.ts"
Cohesion: 0.15
Nodes (16): salvarSetor(), FormSetor(), Marca, descreverSelecao(), Papel, Recurso, RECURSOS, temPermissao() (+8 more)

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
Cohesion: 0.12
Nodes (19): espera(), LoteSugerido, sugerirLotes(), SugestaoLoja, SugestaoLotes(), D-027 · Rota sugerida quando o motoboy sai com várias entregas, D-028 · Cliente acompanha a entrega, prazo por loja, alerta e lotes na expedição, tempos e atrasos, agruparEntregas() (+11 more)

### Community 116 - "sabores-pizza.tsx"
Cohesion: 0.18
Nodes (20): definirModoEstoque(), excluirInsumo(), feito(), ItemImportar, R, salvarFatoresSabor(), salvarFichaSabor(), amigavel() (+12 more)

### Community 117 - "anon"
Cohesion: 0.15
Nodes (11): pedido_eventos_pedido_idx, private.contador_pedidos, public.mudar_status_pedido(), public.pedido_eventos, public.resumo_vendas(), private.inserir_pedido(), public.relatorio_entregas(), public.relatorio_fidelidade() (+3 more)

### Community 118 - "pedido-flutuante.tsx"
Cohesion: 0.16
Nodes (17): PainelLayout(), trocarLoja(), Icone(), Link_, LINKS, NavPainel(), SECOES, RascunhoPedido (+9 more)

### Community 119 - "escpos.ts"
Cohesion: 0.29
Nodes (9): codificar(), CP850, CP860, ESC_T, Pagina, semAcento(), ConfigImpressora, gerarEscPos() (+1 more)

### Community 120 - "99zzzz_descontos.sql"
Cohesion: 0.47
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 122 - "pixCopiaECola"
Cohesion: 0.36
Nodes (6): campo(), crc16Pix(), FORMATOS_RASTREAMENTO, pixCopiaECola(), semAcento(), TipoChavePix

### Community 123 - "public.lojas"
Cohesion: 0.10
Nodes (42): public.lojas, public.marcas, pedido_item_opcoes_item_idx, pedido_itens_pedido_idx, public.criar_pedido(), public.pedido_item_opcoes, public.pedido_itens, public.acompanhar_pedido() (+34 more)

### Community 125 - "99zzzzz_clientes.sql"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 126 - "99zzzzzzzzzzzzzzzzzzzz_equipe.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 127 - "impressoras.ts"
Cohesion: 0.33
Nodes (4): ModeloImpressora, PaginaCodigo, PAGINAS_CODIGO, Protocolo

### Community 129 - "insumos.tsx"
Cohesion: 0.28
Nodes (15): ajustarEstoque(), salvarInsumo(), Contagem(), NovoItem(), num(), Origem, Ajuste(), confirmarExclusao() (+7 more)

### Community 130 - "grafico-dias.tsx"
Cohesion: 0.33
Nodes (8): DiaLojas, DIAS, GraficoDias(), LojaCor, pedidosDia(), rotulo(), semana(), totalDia()

### Community 131 - "50_multilojas.sql"
Cohesion: 0.47
Nodes (4): ids, pg_temp.como(), pg_temp.id(), saida

### Community 132 - "private.importar_cardapio"
Cohesion: 0.67
Nodes (3): private.importacoes, private.importar_cardapio(), pg_temp.k()

## Knowledge Gaps
- **9 isolated node(s):** `pedidos.qr_token (/m/d/<código>)`, `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `GitHub Actions CI (rules, db, build)`, `Roadmap stages 3c-7 and integrations`, `supabase/migrations (Postgres RLS, audit, atomic ops)` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 608 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `lib/estoque.ts`, `gestao/actions.ts`, `API aberta e MCP (rotas)`, `Tela de impressoras`, `Resumo de vendas`, `acompanhar-pedido.tsx`, `Dependências do painel`, `App do motoboy`, `criarClienteServidor`, `novo-pedido.tsx`, `contextoLoja`, `react`, `Promoções e cupons (tela)`, `Quadro de pedidos`, `entregas/page.tsx`, `cardapio/actions.ts`, `form-delivery.tsx`, `fidelidade/actions.ts`, `Bairros e entregas ao vivo`, `painel-caixa.tsx`, `cardapio-cliente.tsx`, `index.ts`, `[slug]/actions.ts`, `equipe.tsx`, `publico.ts`, `cardapio.test.ts`, `sabores-pizza.tsx`, `pedido-flutuante.tsx`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **What connects `pedidos.qr_token (/m/d/<código>)`, `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `GitHub Actions CI (rules, db, build)` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `lib/estoque.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12169312169312169 - nodes in this community are weakly interconnected._
- **Why does `formatarReais()` connect `Resumo de vendas` to `lib/estoque.ts`, `insumos.tsx`, `grafico-dias.tsx`, `acompanhar-pedido.tsx`, `App do motoboy`, `criarClienteServidor`, `novo-pedido.tsx`, `react`, `Promoções e cupons (tela)`, `Quadro de pedidos`, `cardapio/actions.ts`, `form-delivery.tsx`, `fidelidade/actions.ts`, `Bairros e entregas ao vivo`, `Montagem do cupom impresso`, `preco.ts`, `painel-caixa.tsx`, `entregas/fechamento.tsx`, `cardapio-cliente.tsx`, `index.ts`, `promocao.test.ts`, `cliente.tsx`, `[slug]/actions.ts`, `importar-nfe.tsx`, `publico.ts`, `cardapio.test.ts`, `cardapio.test.ts`, `sabores-pizza.tsx`, `pedido-flutuante.tsx`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Should `gestao/actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10454545454545454 - nodes in this community are weakly interconnected._
- **Why does `criarClienteServidor()` connect `criarClienteServidor` to `lib/estoque.ts`, `insumos.tsx`, `gestao/actions.ts`, `Tela de impressoras`, `Resumo de vendas`, `acompanhar-pedido.tsx`, `App do motoboy`, `next`, `novo-pedido.tsx`, `contextoLoja`, `react`, `Promoções e cupons (tela)`, `Quadro de pedidos`, `entregas/page.tsx`, `cardapio/actions.ts`, `form-delivery.tsx`, `fidelidade/actions.ts`, `Bairros e entregas ao vivo`, `Rota e geolocalização`, `painel-caixa.tsx`, `entregas/fechamento.tsx`, `cardapio-cliente.tsx`, `src/caixa.ts`, `index.ts`, `cardapio-dados.ts`, `cliente.tsx`, `[slug]/actions.ts`, `equipe.tsx`, `importar-nfe.tsx`, `publico.ts`, `cardapio.test.ts`, `cardapio.test.ts`, `expedicao.ts`, `sabores-pizza.tsx`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Should `20261020000001_base.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.0944741532976827 - nodes in this community are weakly interconnected._