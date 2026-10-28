# Graph Report - res  (2026-10-28)

## Corpus Check
- 281 files · ~232,146 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 2353 nodes · 6040 edges · 127 communities (107 shown, 20 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `32a97921`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- formatarReais
- Login, caixa e ações do painel
- 20261021000005_pedidos.sql
- main.ts
- fidelidade/actions.ts
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
- prazo.ts
- Decisões de arquitetura — RES
- Ações do cardápio
- ref_node_assert
- cardapio-cliente.tsx
- mercadopago.ts
- entregas/actions.ts
- Promoções e cupons (tela)
- Quadro de pedidos
- Banco: cardápio
- public.clientes
- Workflow do APK do motoboy
- programa.tsx
- form-delivery.tsx
- resultados.tsx
- Bairros e entregas ao vivo
- Workflow do agente de impressão
- Montagem do cupom impresso
- lojas/actions.ts
- Rota e geolocalização
- 20261020000001_base.sql
- novo-pedido.tsx
- Configuração TypeScript
- Banco: cupons e descontos
- Banco: Mercado Pago
- Dependências do app do motoboy
- preco.ts
- Grupo 45: package.json
- Grupo 46: package.json
- entregas/fechamento.tsx
- public.produto_grupos
- pedidos/actions.ts
- cliente.tsx
- impressao.ts
- lista-clientes.tsx
- react
- montagem.tsx
- Grupo 55: rastreio_motoboys.sql
- pedido.ts
- graphify
- publico.ts
- entregas/page.tsx
- 20261021000006_cardapio_digital.sql
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
- ref_node_test
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
- segmentos.ts
- Grupo 93: 99zzzzzzzzzzzzzzz_mercadopago.sql
- caixa/actions.ts
- D-017 Motoboy app with dispatch by order QR
- Grupo 96: 70_caixa.sql
- [id]/page.tsx
- cardapio.test.ts
- expedicao.ts
- Grupo 100: tempos_ajuste.sql
- form-setor.tsx
- Grupo 102: 20_cardapio_pedidos.sql
- Grupo 103: 40_cardapio_biblioteca.sql
- 99zz_promocao.sql
- Grupo 105: next.config.mjs
- Grupo 106: vercel.json
- Checkout
- Grupo 108: test-db.sh
- 80_impressao.sql
- AbaImpressoras
- salvando
- src/caixa.ts
- 99zzzz_descontos.sql
- 20261021000004_cardapio_edicao.sql
- m/page.tsx
- public.lojas
- 20261021000007_cardapio_biblioteca.sql
- private.consumo_pedido

## God Nodes (most connected - your core abstractions)
1. `criarClienteServidor()` - 176 edges
2. `public.lojas` - 118 edges
3. `formatarReais()` - 108 edges
4. `public.pedidos` - 108 edges
5. `contextoLoja` - 94 edges
6. `public.marcas` - 94 edges
7. `salvando()` - 83 edges
8. `public.produtos` - 68 edges
9. `next` - 65 edges
10. `react` - 62 edges

## Surprising Connections (you probably didn't know these)
- `Ambiente no ar (piloto)` --references--> `main()`  [INFERRED]
  README.md → packages/agente/src/main.ts
- `D-022 Combos com escolhas e categoria de up-sell` --references--> `calcularCombo()`  [INFERRED]
  docs/decisoes.md → packages/core/src/combo.ts
- `D-023 % por categoria, cupons e desconto no balcão com limite` --references--> `precoBase()`  [INFERRED]
  docs/decisoes.md → packages/core/src/preco.ts
- `D-011 Pedido agendado e taxa por bairro no painel` --references--> `taxaDoBairro()`  [INFERRED]
  docs/decisoes.md → packages/core/src/agendamento.ts
- `D-014 Impressão: fila no banco, regras como no BeeFood, navegador até o agente chegar` --references--> `montarCupom()`  [INFERRED]
  docs/decisoes.md → packages/core/src/cupom.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Rules duplicated in core and DB with shared test cases** — docs_decisoes_d_021_cardapio_cards_promo, docs_decisoes_d_022_combos_upsell, docs_decisoes_d_029_segmentos_clientes, docs_decisoes_d_030_telefone_nono_digito, docs_decisoes_d_031_fidelidade_grupo, docs_decisoes_core_db_parity [EXTRACTED 1.00]
- **Motoboy delivery flow (QR dispatch, app, tracking, routing)** — docs_decisoes_d_017_app_motoboy_qr, docs_decisoes_d_018_comanda_motoboy_pago, docs_decisoes_d_019_app_android_leitor_qr, docs_decisoes_d_026_rastreio_motoboys, docs_decisoes_d_027_rota_sugerida, apps_mobile_motoboy_readme_res_motoboy_android [INFERRED 0.85]
- **Stock management module (NF-e, recipes, counts, CMV)** — docs_decisoes_d_036_estoque_nfe_ficha, docs_decisoes_d_037_movimentacoes_estoque, docs_decisoes_d_038_meu_estoque_contagem, docs_decisoes_d_039_fechamento_cmv, docs_decisoes_d_040_ficha_sabor_pizza [INFERRED 0.85]

## Communities (127 total, 20 thin omitted)

### Community 0 - "formatarReais"
Cohesion: 0.05
Nodes (98): ajustarEstoque(), buscarMovimentos(), copiarFicha(), definirModoEstoque(), excluirInsumo(), feito(), FiltroMovimentos, importarNFe() (+90 more)

### Community 1 - "Login, caixa e ações do painel"
Cohesion: 0.14
Nodes (28): Caixa(), dynamic, Calculadora(), Abrir(), Cadastro(), CadastroCaixa, CartaoCaixa(), Diferenca() (+20 more)

### Community 2 - "20261021000005_pedidos.sql"
Cohesion: 0.16
Nodes (9): pedido_eventos_pedido_idx, pedido_item_opcoes_item_idx, pedido_itens_pedido_idx, pedidos_atualizado, pedidos_loja_status_idx, private.contador_pedidos, public.mudar_status_pedido(), public.pedido_eventos (+1 more)

### Community 3 - "main.ts"
Cohesion: 0.05
Nodes (57): adapt, app, g, gradle, m, man, permissoes, res (+49 more)

### Community 4 - "fidelidade/actions.ts"
Cohesion: 0.17
Nodes (18): ajustarSaldo(), buscarSaldos(), extratoCliente(), diaDoTurno(), dynamic, Fidelidade(), menos(), data() (+10 more)

### Community 5 - "20261021000014_caixa.sql"
Cohesion: 0.05
Nodes (50): caixa_movimentos_sessao_idx, caixa_sessoes_auditar, caixa_sessoes_loja_idx, caixa_sessoes_uma_aberta_idx, caixas_auditar, caixas_nome_idx, lojas_caixa_inicial, pedidos_caixa_idx (+42 more)

### Community 6 - "Banco: impressão"
Cohesion: 0.06
Nodes (44): impressao_config_auditar, impressao_destinos_loja_idx, impressoes_loja_idx, impressoes_pedido_idx, impressoes_pendentes_idx, impressoras_auditar, impressoras_nome_idx, pedidos_imprimir_ao_aceitar (+36 more)

### Community 7 - "Banco: fidelidade"
Cohesion: 0.07
Nodes (38): fidelidade_mov_cliente_idx, fidelidade_mov_grupo_idx, fidelidade_mov_pedido_idx, fidelidade_recompensas_grupo_idx, pedidos_fidelidade, private.aplicar_cupom(), private.aplicar_fidelidade(), private.expirar_fidelidade() (+30 more)

### Community 8 - "Banco: estoque"
Cohesion: 0.08
Nodes (38): private.cupom_da_loja(), public.relatorio_entregas(), public.salvar_prazo_entrega(), estoque_mov_estoque_idx, estoque_mov_insumo_idx, estoque_mov_pedido_idx, fichas_opcao_idx, fichas_produto_idx (+30 more)

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
Nodes (30): contas_atualizado, contas_proteger_plano, contas_titulares_user_idx, lojas_conta_idx, lojas_limite, marcas_limite, pedidos_loja_criado_idx, private.e_titular() (+22 more)

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
Cohesion: 0.14
Nodes (28): despachar(), entregar(), PlanoRota, dynamic, metadata, PaginaDespacho(), Acerto(), AppMotoboy() (+20 more)

### Community 17 - "aplicativos.tsx"
Cohesion: 0.08
Nodes (53): conectarMercadoPago(), criarChaveApi(), desconectarMercadoPago(), excluirWebhook(), mpAceitarAoPagar(), R, removerIntegracao(), revogarChaveApi() (+45 more)

### Community 18 - "prazo.ts"
Cohesion: 0.23
Nodes (11): D-027 · Rota sugerida quando o motoboy sai com várias entregas, D-028 · Cliente acompanha a entrega, prazo por loja, alerta e lotes na expedição, tempos e atrasos, Ponto, agruparEntregas(), Lote, mesmoBairro(), OpcoesLote, minutosEstimados() (+3 more)

### Community 19 - "Decisões de arquitetura — RES"
Cohesion: 0.06
Nodes (33): D-002 Modelo multiloja: Loja → Marcas, D-003 Regras de cadastro valem no banco e no formulário, D-004 Auditoria calculada no servidor, D-005 Operações compostas são atômicas, D-006 Gravar só em ação explícita, D-007 Texto em UTF-8 completo, D-008 Nenhum segredo de integração no navegador, D-009 Preço de itens com grupos (decisão provisória, Q-009) (+25 more)

### Community 20 - "Ações do cardápio"
Cohesion: 0.21
Nodes (28): alterarDisponibilidade(), CategoriaOrigem, criarProduto(), definirFoto(), definirFotoOpcao(), definirGruposDoProduto(), definirProdutosDoGrupo(), desvincularGrupo() (+20 more)

### Community 21 - "ref_node_assert"
Cohesion: 0.22
Nodes (11): D-021 Cardápio novo: cards com foto e promoção De/Por com agenda, AgendaPromo, diaAnterior(), diaDaSemana(), DIAS_CURTOS, partesLocais(), promoEncerrada(), promoVale() (+3 more)

### Community 22 - "cardapio-cliente.tsx"
Cohesion: 0.14
Nodes (24): conferirCupom(), enviarPedido(), CardapioCliente(), Checkout(), ETIQUETA, Extras(), gravar(), Item (+16 more)

### Community 23 - "mercadopago.ts"
Cohesion: 0.21
Nodes (13): POST(), conferirPixMercadoPago(), pixMercadoPago(), PagarPixMp(), atualizarPagamento(), conferirPix(), marcarPago(), Ped (+5 more)

### Community 24 - "entregas/actions.ts"
Cohesion: 0.14
Nodes (19): AoVivo, MotoboyAoVivo, R, rastreioAoVivo(), CORES, haQuanto(), iniciais(), MapaAoVivo() (+11 more)

### Community 25 - "Promoções e cupons (tela)"
Cohesion: 0.12
Nodes (32): agenda(), alternarCupom(), CupomForm, excluirCupom(), excluirPromoCategoria(), fim(), PromoCategoriaForm, R (+24 more)

### Community 26 - "Quadro de pedidos"
Cohesion: 0.19
Nodes (17): cuponsPendentes(), imprimirPedido(), dynamic, Pedidos(), bipar(), CartaoPedido(), COLUNAS, FilaImpressao() (+9 more)

### Community 27 - "Banco: cardápio"
Cohesion: 0.15
Nodes (28): complementos_loja_idx, grupos_opcoes_loja_idx, opcoes_grupo_idx, private.setor_exige_marca(), produto_grupos_grupo_idx, produtos_loja_setor_idx, public.criar_grupo_vinculado(), public.criar_produto() (+20 more)

### Community 28 - "public.clientes"
Cohesion: 0.09
Nodes (25): clientes_auditar, clientes_grupo_nome_idx, pedidos_cliente_idx, pedidos_registra_cliente, private.grupo_da_loja(), private.pedido_registra_cliente(), public.buscar_clientes(), public.cliente_enderecos (+17 more)

### Community 29 - "Workflow do APK do motoboy"
Cohesion: 0.08
Nodes (24): runs-on, steps, GH_TOKEN, KS_B64, KS_PASS, jobs, apk, name (+16 more)

### Community 30 - "programa.tsx"
Cohesion: 0.24
Nodes (15): copiarPrograma(), excluirRecompensa(), R, salvarConfigFidelidade(), salvarRecompensa(), lerReais(), num(), PRAZOS (+7 more)

### Community 31 - "form-delivery.tsx"
Cohesion: 0.16
Nodes (20): PedidoCliente, ConfigDelivery, definirStatus(), replicarHorarios(), salvarConfig(), salvarVitrine(), Vitrine, Delivery() (+12 more)

### Community 32 - "resultados.tsx"
Cohesion: 0.14
Nodes (20): DIAS, FAIXA, MEC, ORIGEM, pct(), PERFIL, PERIODOS, REC (+12 more)

### Community 33 - "Bairros e entregas ao vivo"
Cohesion: 0.18
Nodes (17): AreaForm, calcularKmBairro(), localizarLoja(), salvarAreas(), salvarLocalLoja(), salvarPrazoEntrega(), centavos(), espera() (+9 more)

### Community 34 - "Workflow do agente de impressão"
Cohesion: 0.09
Nodes (21): GH_TOKEN, runs-on, steps, jobs, exe, name, on, push (+13 more)

### Community 35 - "Montagem do cupom impresso"
Cohesion: 0.16
Nodes (20): NovoPedido, D-014 Impressão: fila no banco, regras como no BeeFood, navegador até o agente chegar, D-015 Agente de impressão do Windows (RES Impressão), blocosCombo(), colunasLR(), CupomDados, cupomTexto(), dataHora() (+12 more)

### Community 36 - "lojas/actions.ts"
Cohesion: 0.15
Nodes (24): cancelarConvite(), convidar(), criarCardapio(), criarLoja(), definirAtivo(), definirCidade(), msg(), R (+16 more)

### Community 37 - "Rota e geolocalização"
Cohesion: 0.25
Nodes (16): chegadas(), espera(), medirEntrega(), montar(), planejarRota(), Achado, distanciaRota(), EnderecoEntrega (+8 more)

### Community 38 - "20261020000001_base.sql"
Cohesion: 0.10
Nodes (25): grupos_acesso_atualizado, grupos_acesso_auditar, grupos_acesso_validar, lojas_atualizado, lojas_auditar, marcas_atualizado, marcas_auditar, marcas_loja_idx (+17 more)

### Community 39 - "novo-pedido.tsx"
Cohesion: 0.15
Nodes (29): Cardapio(), dynamic, buscarClientes(), autorizarDesconto(), dynamic, PaginaNovoPedido(), GruposBalcao(), ItemCarrinho (+21 more)

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
Nodes (19): calcularCombo(), PassoCombo, calcularItem(), ErroEscolha, grupoVisivel(), opcaoVisivel(), precoBase(), precoGrupo() (+11 more)

### Community 45 - "Grupo 45: package.json"
Cohesion: 0.14
Nodes (17): description, devDependencies, esbuild@0.24.0, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, tsx, @types/node (+9 more)

### Community 46 - "Grupo 46: package.json"
Cohesion: 0.13
Nodes (17): description, devDependencies, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, exports, tsx, @types/node (+9 more)

### Community 47 - "entregas/fechamento.tsx"
Cohesion: 0.23
Nodes (15): ajustarEntrega(), CartaoMotoboy(), FechamentoMotoboys(), FONTE, hora(), LinhaEntrega(), Numero(), Total (+7 more)

### Community 48 - "public.produto_grupos"
Cohesion: 0.30
Nodes (20): public.complementos, public.grupos_opcoes, public.opcoes, public.produto_grupos, public.vincular_grupo(), private.preco_item(), private.produto_publico(), public.definir_produtos_do_grupo() (+12 more)

### Community 49 - "pedidos/actions.ts"
Cohesion: 0.19
Nodes (14): criarPedido(), dadosNovoPedido(), definirAceiteAutomatico(), marcarPago(), mensagem(), mudarStatus(), Resultado, RascunhoPedido (+6 more)

### Community 50 - "cliente.tsx"
Cohesion: 0.22
Nodes (15): programaFidelidade(), saldoFidelidade(), saldoDoCliente(), FidelidadeBalcao(), UsoFidelidade, FidelidadeCliente(), lembrarPedidoFidelidade(), ler() (+7 more)

### Community 51 - "impressao.ts"
Cohesion: 0.29
Nodes (10): EditorLayout(), colunasNavegador(), CSS_CUPOM, cupomHtml(), esc(), imprimirNoNavegador(), linhasDoCupom(), qrsDosCupons() (+2 more)

### Community 52 - "lista-clientes.tsx"
Cohesion: 0.25
Nodes (15): exportarClientes(), listarClientes(), salvarCliente(), Clientes(), dynamic, FichaCliente(), ListaClientes(), SEG (+7 more)

### Community 53 - "react"
Cohesion: 0.15
Nodes (26): PassoForm, Resultado, Promocoes(), AplicarGrupo(), EditorCardapio(), Marca, Painel, EditorCombo() (+18 more)

### Community 54 - "montagem.tsx"
Cohesion: 0.25
Nodes (14): MontadorCombo(), acrescimo(), cheio(), completo(), Extras, GruposMontagem(), minimo(), Montador() (+6 more)

### Community 55 - "Grupo 55: rastreio_motoboys.sql"
Cohesion: 0.27
Nodes (8): motoboy_local_grupo_idx, motoboy_posicoes_em_idx, motoboy_posicoes_entregador_idx, pedidos_motoboy_sai_do_mapa, private.e_membro_do_grupo(), public.motoboy_posicoes, public.rastreio_ao_vivo(), public.registrar_destino()

### Community 56 - "pedido.ts"
Cohesion: 0.31
Nodes (9): acaoAvancar(), LinhaTotal, proximosStatus(), STATUS_ROTULO, TIPO_ROTULO, Totais, transicaoValida(), ResultadoPreco (+1 more)

### Community 58 - "publico.ts"
Cohesion: 0.20
Nodes (12): carregar(), dynamic, generateMetadata(), PaginaCardapio(), AgendamentoPublico, CardapioPublico, DIAS, MarcaPublica (+4 more)

### Community 59 - "entregas/page.tsx"
Cohesion: 0.26
Nodes (10): diaDoTurno(), dynamic, Entregas(), BairrosEntregas(), diaCurto(), pct(), PERIODOS, Relatorio (+2 more)

### Community 60 - "20261021000006_cardapio_digital.sql"
Cohesion: 0.12
Nodes (14): areas_entrega_auditar, marca_horarios_auditar, private.marca_aberta(), public.areas_entrega, public.marca_horarios, public.salvar_config_delivery(), public.replicar_horarios(), private.dentro_do_horario() (+6 more)

### Community 61 - "next"
Cohesion: 0.10
Nodes (14): GET(), POST(), carregar(), dynamic, generateMetadata(), Grupo, PaginaGrupo(), fonte (+6 more)

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

### Community 71 - "public.produto_marcas"
Cohesion: 0.12
Nodes (14): public.produto_marcas, public.compartilhar_catalogo(), private.preco_item(), public.compartilhar_catalogo(), public.duplicar_produto(), combo_passos_auditar, combo_passos_combo_idx, private.preco_combo() (+6 more)

### Community 72 - "Grupo 72: decisoes.md"
Cohesion: 0.28
Nodes (4): agruparEntregas (core), OSRM / Nominatim (OpenStreetMap services), otimizarRota (core), Shift window 05:00→05:00

### Community 73 - "(painel)/layout.tsx"
Cohesion: 0.24
Nodes (10): PainelLayout(), trocarLoja(), Icone(), Link_, LINKS, NavPainel(), SECOES, BotaoNovoPedido() (+2 more)

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

### Community 78 - "ref_node_test"
Cohesion: 0.18
Nodes (4): Parada, loja, agora, M

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

### Community 92 - "segmentos.ts"
Cohesion: 0.36
Nodes (8): baixarCsv(), D-029 · Segmentos de clientes para marketing, CASOS_SEGMENTO, CASOS_TELEFONE, eCelular(), segmentoCliente(), SEGMENTOS, telefoneInternacional()

### Community 93 - "Grupo 93: 99zzzzzzzzzzzzzzz_mercadopago.sql"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 94 - "caixa/actions.ts"
Cohesion: 0.42
Nodes (8): abrirCaixa(), fecharCaixa(), movimentar(), msg(), R, salvarCaixa(), vincularSemCaixa(), limparContagem()

### Community 96 - "Grupo 96: 70_caixa.sql"
Cohesion: 0.47
Nodes (4): ids, pg_temp.como(), pg_temp.id(), saida

### Community 97 - "[id]/page.tsx"
Cohesion: 0.39
Nodes (6): dynamic, RelatorioCaixa(), BotaoImprimir(), r$(), situacaoDiferenca, PAGAMENTO_ROTULO

### Community 98 - "cardapio.test.ts"
Cohesion: 0.11
Nodes (27): DadosGrupo, salvarDetalheOpcao(), DetalheOpcao(), FotoOpcao(), FORMACOES, FormGrupo(), GrupoInicial, lerPreco() (+19 more)

### Community 99 - "expedicao.ts"
Cohesion: 0.39
Nodes (6): espera(), LoteSugerido, sugerirLotes(), SugestaoLoja, SugestaoLotes(), PedidoExpedicao

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

### Community 116 - "80_impressao.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.como(), pg_temp.id(), saida

### Community 117 - "AbaImpressoras"
Cohesion: 0.29
Nodes (5): ModeloImpressora, MODELOS_IMPRESSORA, PaginaCodigo, PAGINAS_CODIGO, Protocolo

### Community 118 - "salvando"
Cohesion: 0.28
Nodes (9): marcarImpressao(), BotaoExcluir(), ModoEstoque(), RC, useImprimir(), CARDAPIO, salvando(), CupomFila (+1 more)

### Community 119 - "src/caixa.ts"
Cohesion: 0.21
Nodes (12): cadastrar(), credenciais(), entrar(), criarUsuarioCaixa(), CEDULAS, Contagem, ehMoeda(), emailDeLogin() (+4 more)

### Community 120 - "99zzzz_descontos.sql"
Cohesion: 0.47
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 121 - "20261021000004_cardapio_edicao.sql"
Cohesion: 0.33
Nodes (3): public.criar_grupo_vinculado(), public.desvincular_grupo(), public.reordenar()

### Community 122 - "m/page.tsx"
Cohesion: 0.50
Nodes (4): painelMotoboy(), dynamic, maxDuration, Motoboy()

### Community 123 - "public.lojas"
Cohesion: 0.07
Nodes (64): public.lojas, public.marcas, public.criar_pedido(), public.pedido_item_opcoes, public.pedido_itens, public.pedidos, public.acompanhar_pedido(), private.limite_lojas() (+56 more)

## Knowledge Gaps
- **9 isolated node(s):** `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `pedidos.qr_token (/m/d/<código>)`, `GitHub Actions CI (rules, db, build)`, `Roadmap stages 3c-7 and integrations`, `supabase/migrations (Postgres RLS, audit, atomic ops)` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 577 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `formatarReais()` connect `entregas/fechamento.tsx` to `formatarReais`, `Login, caixa e ações do painel`, `fidelidade/actions.ts`, `Resumo de vendas`, `acompanhar-pedido.tsx`, `App do motoboy`, `aplicativos.tsx`, `cardapio-cliente.tsx`, `mercadopago.ts`, `Promoções e cupons (tela)`, `Quadro de pedidos`, `programa.tsx`, `form-delivery.tsx`, `resultados.tsx`, `Bairros e entregas ao vivo`, `Montagem do cupom impresso`, `novo-pedido.tsx`, `preco.ts`, `pedidos/actions.ts`, `cliente.tsx`, `lista-clientes.tsx`, `react`, `montagem.tsx`, `[id]/page.tsx`, `cardapio.test.ts`, `src/caixa.ts`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **What connects `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `pedidos.qr_token (/m/d/<código>)`, `GitHub Actions CI (rules, db, build)` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `formatarReais` be split into smaller, more focused modules?**
  _Cohesion score 0.05012285012285012 - nodes in this community are weakly interconnected._
- **Why does `criarClienteServidor()` connect `Ações do cardápio` to `formatarReais`, `Login, caixa e ações do painel`, `fidelidade/actions.ts`, `Tela de impressoras`, `Resumo de vendas`, `acompanhar-pedido.tsx`, `App do motoboy`, `aplicativos.tsx`, `cardapio-cliente.tsx`, `mercadopago.ts`, `entregas/actions.ts`, `Promoções e cupons (tela)`, `Quadro de pedidos`, `programa.tsx`, `form-delivery.tsx`, `Bairros e entregas ao vivo`, `lojas/actions.ts`, `Rota e geolocalização`, `novo-pedido.tsx`, `entregas/fechamento.tsx`, `pedidos/actions.ts`, `cliente.tsx`, `lista-clientes.tsx`, `react`, `publico.ts`, `entregas/page.tsx`, `next`, `caixa/actions.ts`, `[id]/page.tsx`, `cardapio.test.ts`, `expedicao.ts`, `form-setor.tsx`, `salvando`, `src/caixa.ts`, `m/page.tsx`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `Login, caixa e ações do painel` be split into smaller, more focused modules?**
  _Cohesion score 0.13978494623655913 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `formatarReais`, `Login, caixa e ações do painel`, `fidelidade/actions.ts`, `API aberta e MCP (rotas)`, `Tela de impressoras`, `Resumo de vendas`, `acompanhar-pedido.tsx`, `Dependências do painel`, `App do motoboy`, `aplicativos.tsx`, `Ações do cardápio`, `cardapio-cliente.tsx`, `mercadopago.ts`, `entregas/actions.ts`, `Promoções e cupons (tela)`, `Quadro de pedidos`, `programa.tsx`, `form-delivery.tsx`, `resultados.tsx`, `lojas/actions.ts`, `novo-pedido.tsx`, `pedidos/actions.ts`, `lista-clientes.tsx`, `publico.ts`, `entregas/page.tsx`, `(painel)/layout.tsx`, `caixa/actions.ts`, `[id]/page.tsx`, `salvando`, `src/caixa.ts`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `main.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0546583850931677 - nodes in this community are weakly interconnected._