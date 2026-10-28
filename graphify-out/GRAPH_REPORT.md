# Graph Report - res  (2026-10-28)

## Corpus Check
- 278 files · ~230,260 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 2364 nodes · 5980 edges · 113 communities (96 shown, 17 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 53 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `25c37ee2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Telas de estoque
- Login, caixa e ações do painel
- public.pedidos
- main.ts
- Telas de fidelidade
- Banco: caixa e webhooks
- Banco: impressão
- Banco: fidelidade
- Banco: estoque
- API aberta e MCP (rotas)
- Tela de impressoras
- Resumo de vendas
- Banco: multilojas e contas
- Banco: grupos de opções
- Dependências do painel
- CI (testes automáticos)
- App do motoboy
- Tela Aplicativos
- Prazo e sugestão de lotes
- Decisões de arquitetura — RES
- Ações do cardápio
- TempoReal
- cardapio-cliente.tsx
- Grupos de opções (tela)
- entregas/page.tsx
- Promoções e cupons (tela)
- Quadro de pedidos
- Banco: cardápio
- Banco: clientes
- Workflow do APK do motoboy
- novo-pedido.tsx
- form-delivery.tsx
- editor-cardapio.tsx
- Bairros e entregas ao vivo
- Workflow do agente de impressão
- Montagem do cupom impresso
- Pix pelo Mercado Pago
- Rota e geolocalização
- 20261020000001_base.sql
- lista-clientes.tsx
- Configuração TypeScript
- Banco: cupons e descontos
- Banco: Mercado Pago
- Dependências do app do motoboy
- preco.ts
- Grupo 45: package.json
- Grupo 46: package.json
- entregas/fechamento.tsx
- Grupo 48: diversos
- Grupo 49: agendamento.ts
- form-setor.tsx
- public.marcas
- publico.ts
- salvando
- resultados.tsx
- Grupo 55: rastreio_motoboys.sql
- pedido.ts
- graphify
- Grupo 58: promocao.ts
- Grupo 59: diversos
- Grupo 60: page.tsx
- criarClienteServidor
- Grupo 62: package.json
- Grupo 63: 99zzzzzzzzzzz_fidelidade.sql
- Grupo 64: decisoes.md
- Grupo 65: README.md
- Grupo 66: decisoes.md
- Grupo 67: tsconfig.json
- Grupo 68: tsconfig.json
- rota.ts
- editor-combo.tsx
- Grupo 72: decisoes.md
- pixCopiaECola
- Grupo 74: 99_motoboy.sql
- Grupo 75: 99z_entregas_km.sql
- Grupo 76: 99zzzzzzzzzzzz_estoque.sql
- Grupo 77: 99zzzzzzzzzzzzzz_api.sql
- cliente.tsx
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
- Grupo 92: 99zzzzz_clientes.sql
- Grupo 93: 99zzzzzzzzzzzzzzz_mercadopago.sql
- 20261021000007_cardapio_biblioteca.sql
- private.consumo_pedido
- Grupo 96: 70_caixa.sql
- Grupo 97: 99zzzz_descontos.sql
- Grupo 100: tempos_ajuste.sql
- Grupo 101: cardapio_edicao.sql
- Grupo 102: 20_cardapio_pedidos.sql
- Grupo 103: 40_cardapio_biblioteca.sql
- Grupo 104: 99zz_promocao.sql
- Grupo 105: next.config.mjs
- Grupo 106: vercel.json
- Grupo 108: test-db.sh

## God Nodes (most connected - your core abstractions)
1. `criarClienteServidor()` - 175 edges
2. `public.lojas` - 118 edges
3. `public.pedidos` - 108 edges
4. `formatarReais()` - 100 edges
5. `contextoLoja` - 94 edges
6. `public.marcas` - 94 edges
7. `salvando()` - 81 edges
8. `public.produtos` - 68 edges
9. `next` - 65 edges
10. `react` - 60 edges

## Surprising Connections (you probably didn't know these)
- `Ambiente no ar (piloto)` --references--> `main()`  [INFERRED]
  README.md → packages/agente/src/main.ts
- `D-022 Combos com escolhas e categoria de up-sell` --references--> `calcularCombo()`  [INFERRED]
  docs/decisoes.md → packages/core/src/combo.ts
- `D-023 % por categoria, cupons e desconto no balcão com limite` --references--> `precoBase()`  [INFERRED]
  docs/decisoes.md → packages/core/src/preco.ts
- `D-011 Pedido agendado e taxa por bairro no painel` --references--> `taxaDoBairro()`  [INFERRED]
  docs/decisoes.md → packages/core/src/agendamento.ts
- `D-036 · Estoque: entrada por NF-e e baixa pela ficha técnica` --references--> `lerNFe()`  [INFERRED]
  docs/decisoes.md → packages/core/src/estoque.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Rules duplicated in core and DB with shared test cases** — docs_decisoes_d_021_cardapio_cards_promo, docs_decisoes_d_022_combos_upsell, docs_decisoes_d_029_segmentos_clientes, docs_decisoes_d_030_telefone_nono_digito, docs_decisoes_d_031_fidelidade_grupo, docs_decisoes_core_db_parity [EXTRACTED 1.00]
- **Motoboy delivery flow (QR dispatch, app, tracking, routing)** — docs_decisoes_d_017_app_motoboy_qr, docs_decisoes_d_018_comanda_motoboy_pago, docs_decisoes_d_019_app_android_leitor_qr, docs_decisoes_d_026_rastreio_motoboys, docs_decisoes_d_027_rota_sugerida, apps_mobile_motoboy_readme_res_motoboy_android [INFERRED 0.85]
- **Stock management module (NF-e, recipes, counts, CMV)** — docs_decisoes_d_036_estoque_nfe_ficha, docs_decisoes_d_037_movimentacoes_estoque, docs_decisoes_d_038_meu_estoque_contagem, docs_decisoes_d_039_fechamento_cmv, docs_decisoes_d_040_ficha_sabor_pizza [INFERRED 0.85]

## Communities (113 total, 17 thin omitted)

### Community 0 - "Telas de estoque"
Cohesion: 0.05
Nodes (101): ajustarEstoque(), buscarMovimentos(), copiarFicha(), definirModoEstoque(), excluirInsumo(), feito(), FiltroMovimentos, importarNFe() (+93 more)

### Community 1 - "Login, caixa e ações do painel"
Cohesion: 0.05
Nodes (77): abrirCaixa(), fecharCaixa(), movimentar(), msg(), R, salvarCaixa(), vincularSemCaixa(), dynamic (+69 more)

### Community 2 - "public.pedidos"
Cohesion: 0.07
Nodes (54): public.marcas, pedido_eventos_pedido_idx, pedido_item_opcoes_item_idx, pedido_itens_pedido_idx, pedidos_atualizado, pedidos_loja_status_idx, private.contador_pedidos, public.criar_pedido() (+46 more)

### Community 3 - "main.ts"
Cohesion: 0.05
Nodes (57): adapt, app, g, gradle, m, man, permissoes, res (+49 more)

### Community 4 - "Telas de fidelidade"
Cohesion: 0.11
Nodes (36): ajustarSaldo(), buscarSaldos(), copiarPrograma(), excluirRecompensa(), extratoCliente(), R, saldoDoCliente(), salvarConfigFidelidade() (+28 more)

### Community 5 - "Banco: caixa e webhooks"
Cohesion: 0.05
Nodes (49): caixa_movimentos_sessao_idx, caixa_sessoes_auditar, caixa_sessoes_loja_idx, caixa_sessoes_uma_aberta_idx, caixas_auditar, caixas_nome_idx, lojas_caixa_inicial, pedidos_caixa_idx (+41 more)

### Community 6 - "Banco: impressão"
Cohesion: 0.06
Nodes (47): impressao_config_auditar, impressao_destinos_loja_idx, impressoes_loja_idx, impressoes_pedido_idx, impressoes_pendentes_idx, impressoras_auditar, impressoras_nome_idx, pedidos_imprimir_ao_aceitar (+39 more)

### Community 7 - "Banco: fidelidade"
Cohesion: 0.07
Nodes (41): fidelidade_mov_cliente_idx, fidelidade_mov_grupo_idx, fidelidade_mov_pedido_idx, fidelidade_recompensas_grupo_idx, pedidos_fidelidade, private.aplicar_cupom(), private.aplicar_fidelidade(), private.expirar_fidelidade() (+33 more)

### Community 8 - "Banco: estoque"
Cohesion: 0.09
Nodes (38): public.lojas, public.resumo_vendas(), private.cupom_da_loja(), public.relatorio_entregas(), public.salvar_prazo_entrega(), public.relatorio_fidelidade(), estoque_mov_estoque_idx, estoque_mov_insumo_idx (+30 more)

### Community 9 - "API aberta e MCP (rotas)"
Cohesion: 0.08
Nodes (33): DELETE, POST(), DELETE, POST(), GET(), OPTIONS, GET(), OPTIONS (+25 more)

### Community 10 - "Tela de impressoras"
Cohesion: 0.07
Nodes (52): ConfigImpressao, DadosImpressora, excluirImpressora(), gerarCodigoAgente(), imprimirTeste(), marcarImpressao(), msg(), R (+44 more)

### Community 11 - "Resumo de vendas"
Cohesion: 0.11
Nodes (35): Composicao, ComposicaoVendas(), dataBR(), dynamic, Kpi(), Metricas, PRESETS, Resumo (+27 more)

### Community 12 - "Banco: multilojas e contas"
Cohesion: 0.07
Nodes (38): contas_atualizado, contas_proteger_plano, contas_titulares_user_idx, lojas_conta_idx, lojas_limite, marcas_limite, pedidos_loja_criado_idx, private.e_titular() (+30 more)

### Community 13 - "Banco: grupos de opções"
Cohesion: 0.30
Nodes (20): public.complementos, public.grupos_opcoes, public.opcoes, public.produto_grupos, public.vincular_grupo(), private.preco_item(), private.produto_publico(), public.definir_produtos_do_grupo() (+12 more)

### Community 14 - "Dependências do painel"
Cohesion: 0.06
Nodes (34): config, PUBLICAS, dependencies, jsqr@1.4.0, next@^15.5.9, react@^19.2.1, react-dom@^19.2.1, @res/core@* (+26 more)

### Community 15 - "CI (testes automáticos)"
Cohesion: 0.07
Nodes (34): name, runs-on, services, steps, DATABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, POSTGRES_PASSWORD (+26 more)

### Community 16 - "App do motoboy"
Cohesion: 0.11
Nodes (32): despachar(), entregar(), painelMotoboy(), PlanoRota, dynamic, metadata, PaginaDespacho(), dynamic (+24 more)

### Community 17 - "Tela Aplicativos"
Cohesion: 0.10
Nodes (46): conectarMercadoPago(), criarChaveApi(), desconectarMercadoPago(), excluirWebhook(), mpAceitarAoPagar(), R, removerIntegracao(), revogarChaveApi() (+38 more)

### Community 18 - "Prazo e sugestão de lotes"
Cohesion: 0.16
Nodes (13): espera(), LoteSugerido, sugerirLotes(), SugestaoLoja, SugestaoLotes(), D-028 · Cliente acompanha a entrega, prazo por loja, alerta e lotes na expedição, tempos e atrasos, agruparEntregas(), Lote (+5 more)

### Community 19 - "Decisões de arquitetura — RES"
Cohesion: 0.06
Nodes (34): D-002 Modelo multiloja: Loja → Marcas, D-003 Regras de cadastro valem no banco e no formulário, D-004 Auditoria calculada no servidor, D-005 Operações compostas são atômicas, D-006 Gravar só em ação explícita, D-007 Texto em UTF-8 completo, D-008 Nenhum segredo de integração no navegador, D-009 Preço de itens com grupos (decisão provisória, Q-009) (+26 more)

### Community 20 - "Ações do cardápio"
Cohesion: 0.19
Nodes (25): alterarDisponibilidade(), CategoriaOrigem, criarProduto(), definirFoto(), definirFotoOpcao(), definirGruposDoProduto(), definirProdutosDoGrupo(), desvincularGrupo() (+17 more)

### Community 21 - "TempoReal"
Cohesion: 0.27
Nodes (8): Caixa(), Cardapio(), dynamic, ABAS, dynamic, Impressoras(), TempoReal(), carregarCardapio()

### Community 22 - "cardapio-cliente.tsx"
Cohesion: 0.09
Nodes (21): CardapioCliente(), Checkout(), EscolhaGrupos(), ETIQUETA, Extras(), gravar(), Item, ItemCalculado (+13 more)

### Community 23 - "Grupos de opções (tela)"
Cohesion: 0.12
Nodes (26): DadosGrupo, salvarGrupo(), FotoOpcao(), FORMACOES, FormGrupo(), GrupoInicial, lerPreco(), mostrarPreco() (+18 more)

### Community 24 - "entregas/page.tsx"
Cohesion: 0.14
Nodes (20): rastreioAoVivo(), diaDoTurno(), dynamic, Entregas(), CORES, haQuanto(), iniciais(), MapaAoVivo() (+12 more)

### Community 25 - "Promoções e cupons (tela)"
Cohesion: 0.11
Nodes (34): agenda(), alternarCupom(), CupomForm, excluirCupom(), excluirPromoCategoria(), fim(), PromoCategoriaForm, R (+26 more)

### Community 26 - "Quadro de pedidos"
Cohesion: 0.15
Nodes (25): cuponsPendentes(), imprimirPedido(), criarPedido(), definirAceiteAutomatico(), marcarPago(), mensagem(), mudarStatus(), Resultado (+17 more)

### Community 27 - "Banco: cardápio"
Cohesion: 0.15
Nodes (28): complementos_loja_idx, grupos_opcoes_loja_idx, opcoes_grupo_idx, private.setor_exige_marca(), produto_grupos_grupo_idx, produtos_loja_setor_idx, public.criar_grupo_vinculado(), public.criar_produto() (+20 more)

### Community 28 - "Banco: clientes"
Cohesion: 0.11
Nodes (21): clientes_auditar, clientes_grupo_nome_idx, pedidos_cliente_idx, pedidos_registra_cliente, private.grupo_da_loja(), private.pedido_registra_cliente(), public.buscar_clientes(), public.cliente_enderecos (+13 more)

### Community 29 - "Workflow do APK do motoboy"
Cohesion: 0.08
Nodes (24): runs-on, steps, GH_TOKEN, KS_B64, KS_PASS, jobs, apk, name (+16 more)

### Community 30 - "novo-pedido.tsx"
Cohesion: 0.13
Nodes (33): buscarClientes(), autorizarDesconto(), dadosNovoPedido(), dynamic, PaginaNovoPedido(), GruposBalcao(), ItemCarrinho, lerCentavos() (+25 more)

### Community 31 - "form-delivery.tsx"
Cohesion: 0.30
Nodes (10): ConfigDelivery, definirStatus(), replicarHorarios(), salvarConfig(), Delivery(), centavos(), DIAS, FORMAS (+2 more)

### Community 32 - "editor-cardapio.tsx"
Cohesion: 0.23
Nodes (16): Resultado, AplicarGrupo(), EditorCardapio(), Marca, Painel, EditorProduto(), ETIQUETAS, FORMACAO (+8 more)

### Community 33 - "Bairros e entregas ao vivo"
Cohesion: 0.17
Nodes (20): AoVivo, AreaForm, calcularKmBairro(), localizarLoja(), MotoboyAoVivo, R, salvarAreas(), salvarLocalLoja() (+12 more)

### Community 34 - "Workflow do agente de impressão"
Cohesion: 0.09
Nodes (21): GH_TOKEN, runs-on, steps, jobs, exe, name, on, push (+13 more)

### Community 35 - "Montagem do cupom impresso"
Cohesion: 0.15
Nodes (18): D-014 Impressão: fila no banco, regras como no BeeFood, navegador até o agente chegar, D-015 Agente de impressão do Windows (RES Impressão), colunasLR(), CupomTeste, cupomTexto(), dataHora(), FRACAO, fracaoTexto() (+10 more)

### Community 36 - "Pix pelo Mercado Pago"
Cohesion: 0.18
Nodes (15): POST(), conferirPixMercadoPago(), pixMercadoPago(), PagarPixMp(), atualizarPagamento(), conferirPix(), marcarPago(), Ped (+7 more)

### Community 37 - "Rota e geolocalização"
Cohesion: 0.22
Nodes (18): chegadas(), espera(), medirEntrega(), montar(), planejarRota(), Achado, distanciaRota(), EnderecoEntrega (+10 more)

### Community 38 - "20261020000001_base.sql"
Cohesion: 0.11
Nodes (24): grupos_acesso_atualizado, grupos_acesso_auditar, grupos_acesso_validar, lojas_atualizado, lojas_auditar, marcas_atualizado, marcas_auditar, marcas_loja_idx (+16 more)

### Community 39 - "lista-clientes.tsx"
Cohesion: 0.15
Nodes (25): exportarClientes(), listarClientes(), salvarCliente(), Clientes(), dynamic, baixarCsv(), FichaCliente(), ListaClientes() (+17 more)

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
Cohesion: 0.16
Nodes (22): calcularCombo(), EscolhaPasso, PassoCombo, calcularItem(), ErroEscolha, grupoVisivel(), opcaoVisivel(), precoBase() (+14 more)

### Community 45 - "Grupo 45: package.json"
Cohesion: 0.14
Nodes (17): description, devDependencies, esbuild@0.24.0, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, tsx, @types/node (+9 more)

### Community 46 - "Grupo 46: package.json"
Cohesion: 0.13
Nodes (17): description, devDependencies, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, exports, tsx, @types/node (+9 more)

### Community 47 - "entregas/fechamento.tsx"
Cohesion: 0.24
Nodes (13): ajustarEntrega(), CartaoMotoboy(), FechamentoMotoboys(), FONTE, hora(), LinhaEntrega(), Numero(), Total (+5 more)

### Community 48 - "Grupo 48: diversos"
Cohesion: 0.12
Nodes (14): public.produto_marcas, public.compartilhar_catalogo(), private.preco_item(), public.compartilhar_catalogo(), public.duplicar_produto(), combo_passos_auditar, combo_passos_combo_idx, private.preco_combo() (+6 more)

### Community 49 - "Grupo 49: agendamento.ts"
Cohesion: 0.40
Nodes (8): chaveBairro(), dataNoFuso(), faseAgendamento, FOLGA_AGENDADO_MIN, horaNoFuso(), partes(), rotuloHorario(), taxaDoBairro()

### Community 50 - "form-setor.tsx"
Cohesion: 0.39
Nodes (7): salvarSetor(), FormSetor(), Marca, novoSetor(), SetorForm, setorVisivel(), validarSetor()

### Community 51 - "public.marcas"
Cohesion: 0.09
Nodes (19): areas_entrega_auditar, marca_horarios_auditar, private.marca_aberta(), public.areas_entrega, public.marca_horarios, public.salvar_config_delivery(), public.replicar_horarios(), private.dentro_do_horario() (+11 more)

### Community 52 - "publico.ts"
Cohesion: 0.10
Nodes (16): carregar(), dynamic, generateMetadata(), PaginaCardapio(), AgendamentoPublico, CardapioPublico, DIAS, GrupoPublico (+8 more)

### Community 53 - "salvando"
Cohesion: 0.16
Nodes (19): salvarVitrine(), Vitrine, BotaoExcluir(), reduzir(), TIPOS, useEnviarFoto(), CORES, FormVitrine() (+11 more)

### Community 54 - "resultados.tsx"
Cohesion: 0.13
Nodes (20): DIAS, FAIXA, MEC, ORIGEM, pct(), PERFIL, PERIODOS, REC (+12 more)

### Community 55 - "Grupo 55: rastreio_motoboys.sql"
Cohesion: 0.15
Nodes (13): motoboy_local_grupo_idx, motoboy_posicoes_em_idx, motoboy_posicoes_entregador_idx, pedidos_motoboy_sai_do_mapa, private.e_membro_do_grupo(), private.motoboy_sai_do_mapa(), public.motoboy_local, public.motoboy_posicoes (+5 more)

### Community 56 - "pedido.ts"
Cohesion: 0.20
Nodes (15): PedidoCliente, NovoPedido, CupomDados, acaoAvancar(), ErroPedido, FormaPagamento, LinhaTotal, proximosStatus() (+7 more)

### Community 58 - "Grupo 58: promocao.ts"
Cohesion: 0.24
Nodes (11): D-021 Cardápio novo: cards com foto e promoção De/Por com agenda, AgendaPromo, diaAnterior(), diaDaSemana(), DIAS_CURTOS, partesLocais(), promoEncerrada(), promoVale() (+3 more)

### Community 60 - "Grupo 60: page.tsx"
Cohesion: 0.16
Nodes (18): dynamic, metadata, PaginaAcompanhar(), AcompanharPedido(), ExtrasPedido, hora(), MapaCliente(), PagarPix() (+10 more)

### Community 61 - "criarClienteServidor"
Cohesion: 0.09
Nodes (25): GET(), POST(), conferirCupom(), enviarPedido(), programaFidelidade(), carregar(), dynamic, generateMetadata() (+17 more)

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

### Community 69 - "rota.ts"
Cohesion: 0.24
Nodes (7): distanciaReta(), minutosEstimados(), OpcoesRota, Parada, ResultadoRota, agora, M

### Community 71 - "editor-combo.tsx"
Cohesion: 0.33
Nodes (9): PassoForm, salvarCombo(), EditorCombo(), lerCentavos(), Passo, reais(), AreaFoto(), precoSeparado() (+1 more)

### Community 72 - "Grupo 72: decisoes.md"
Cohesion: 0.28
Nodes (4): agruparEntregas (core), OSRM / Nominatim (OpenStreetMap services), otimizarRota (core), Shift window 05:00→05:00

### Community 73 - "pixCopiaECola"
Cohesion: 0.39
Nodes (7): campo(), crc16Pix(), FORMATOS_RASTREAMENTO, normalizarChavePix(), pixCopiaECola(), semAcento(), TipoChavePix

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

### Community 78 - "cliente.tsx"
Cohesion: 0.38
Nodes (9): saldoFidelidade(), FidelidadeBalcao(), UsoFidelidade, FidelidadeCliente(), lembrarPedidoFidelidade(), ler(), provaFidelidade(), cashbackUsavel() (+1 more)

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

### Community 92 - "Grupo 92: 99zzzzz_clientes.sql"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 93 - "Grupo 93: 99zzzzzzzzzzzzzzz_mercadopago.sql"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 96 - "Grupo 96: 70_caixa.sql"
Cohesion: 0.47
Nodes (4): ids, pg_temp.como(), pg_temp.id(), saida

### Community 97 - "Grupo 97: 99zzzz_descontos.sql"
Cohesion: 0.47
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 101 - "Grupo 101: cardapio_edicao.sql"
Cohesion: 0.33
Nodes (3): public.criar_grupo_vinculado(), public.desvincular_grupo(), public.reordenar()

### Community 102 - "Grupo 102: 20_cardapio_pedidos.sql"
Cohesion: 0.60
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 103 - "Grupo 103: 40_cardapio_biblioteca.sql"
Cohesion: 0.60
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 104 - "Grupo 104: 99zz_promocao.sql"
Cohesion: 0.60
Nodes (4): ids, pg_temp.como(), pg_temp.id(), pg_temp.vale()

## Knowledge Gaps
- **9 isolated node(s):** `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `pedidos.qr_token (/m/d/<código>)`, `GitHub Actions CI (rules, db, build)`, `Roadmap stages 3c-7 and integrations`, `supabase/migrations (Postgres RLS, audit, atomic ops)` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 595 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `criarClienteServidor` to `Telas de estoque`, `Login, caixa e ações do painel`, `Telas de fidelidade`, `API aberta e MCP (rotas)`, `Tela de impressoras`, `Resumo de vendas`, `Dependências do painel`, `App do motoboy`, `Tela Aplicativos`, `Ações do cardápio`, `cardapio-cliente.tsx`, `entregas/page.tsx`, `Promoções e cupons (tela)`, `Quadro de pedidos`, `novo-pedido.tsx`, `form-delivery.tsx`, `Bairros e entregas ao vivo`, `Pix pelo Mercado Pago`, `lista-clientes.tsx`, `publico.ts`, `salvando`, `resultados.tsx`, `Grupo 60: page.tsx`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **What connects `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `pedidos.qr_token (/m/d/<código>)`, `GitHub Actions CI (rules, db, build)` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Telas de estoque` be split into smaller, more focused modules?**
  _Cohesion score 0.051874062968515745 - nodes in this community are weakly interconnected._
- **Why does `react` connect `salvando` to `Telas de estoque`, `Login, caixa e ações do painel`, `Telas de fidelidade`, `Tela de impressoras`, `Resumo de vendas`, `Dependências do painel`, `App do motoboy`, `Tela Aplicativos`, `Prazo e sugestão de lotes`, `Ações do cardápio`, `cardapio-cliente.tsx`, `Grupos de opções (tela)`, `entregas/page.tsx`, `Promoções e cupons (tela)`, `Quadro de pedidos`, `novo-pedido.tsx`, `form-delivery.tsx`, `editor-cardapio.tsx`, `Bairros e entregas ao vivo`, `Pix pelo Mercado Pago`, `lista-clientes.tsx`, `entregas/fechamento.tsx`, `form-setor.tsx`, `Grupo 60: page.tsx`, `editor-combo.tsx`, `cliente.tsx`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `Login, caixa e ações do painel` be split into smaller, more focused modules?**
  _Cohesion score 0.051526251526251524 - nodes in this community are weakly interconnected._
- **Why does `formatarReais()` connect `Telas de estoque` to `Login, caixa e ações do painel`, `Telas de fidelidade`, `Resumo de vendas`, `App do motoboy`, `Tela Aplicativos`, `Grupos de opções (tela)`, `Promoções e cupons (tela)`, `Quadro de pedidos`, `novo-pedido.tsx`, `form-delivery.tsx`, `editor-cardapio.tsx`, `Bairros e entregas ao vivo`, `Montagem do cupom impresso`, `Pix pelo Mercado Pago`, `lista-clientes.tsx`, `preco.ts`, `entregas/fechamento.tsx`, `resultados.tsx`, `Grupo 60: page.tsx`, `editor-combo.tsx`, `cliente.tsx`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Should `public.pedidos` be split into smaller, more focused modules?**
  _Cohesion score 0.06628621597892889 - nodes in this community are weakly interconnected._