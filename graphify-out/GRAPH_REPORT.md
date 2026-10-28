# Graph Report - res  (2026-10-28)

## Corpus Check
- 274 files · ~226,610 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 1, .example 1, .css 1)

## Summary
- 2264 nodes · 5871 edges · 116 communities (99 shown, 17 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 39 edges (avg confidence: 0.89)
- Token cost: 111,940 input · 0 output

## Community Hubs (Navigation)
- Telas de estoque
- Login, caixa e ações do painel
- Banco: pedidos e entregas
- App Android do motoboy (build)
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
- Banco: base e permissões
- Ações do cardápio
- Componentes do cardápio
- Cardápio digital do cliente
- Grupos de opções (tela)
- Fechamento e tempos de entrega
- Promoções e cupons (tela)
- Quadro de pedidos
- Banco: cardápio
- Banco: clientes
- Workflow do APK do motoboy
- Cálculo de preço e combos
- Autenticação e layout do motoboy
- Editor de produtos e combos
- Bairros e entregas ao vivo
- Workflow do agente de impressão
- Montagem do cupom impresso
- Pix pelo Mercado Pago
- Rota e geolocalização
- Tela de clientes
- Novo pedido no balcão
- Configuração TypeScript
- Banco: cupons e descontos
- Banco: Mercado Pago
- Dependências do app do motoboy
- Tela de API e webhooks
- Grupo 45: package.json
- Grupo 46: package.json
- Grupo 47: impressao.ts
- Grupo 48: diversos
- Grupo 49: agendamento.ts
- Grupo 50: pedido.ts
- Grupo 51: cardapio_digital.sql
- Grupo 52: rastreamento.tsx
- Grupo 53: page.tsx
- Grupo 54: cardapio-dados.ts
- Grupo 55: rastreio_motoboys.sql
- Grupo 56: form-delivery.tsx
- Grupo 57: ao-vivo.tsx
- Grupo 58: promocao.ts
- Grupo 59: diversos
- Grupo 60: page.tsx
- Grupo 61: nav-painel.tsx
- Grupo 62: package.json
- Grupo 63: 99zzzzzzzzzzz_fidelidade.sql
- Grupo 64: decisoes.md
- Grupo 65: README.md
- Grupo 66: decisoes.md
- Grupo 67: tsconfig.json
- Grupo 68: tsconfig.json
- Grupo 69: segmentos.ts
- Grupo 71: pedido-flutuante.tsx
- Grupo 72: decisoes.md
- Grupo 73: aplicativos.ts
- Grupo 74: 99_motoboy.sql
- Grupo 75: 99z_entregas_km.sql
- Grupo 76: 99zzzzzzzzzzzz_estoque.sql
- Grupo 77: 99zzzzzzzzzzzzzz_api.sql
- Grupo 78: cliente.tsx
- Grupo 79: 99zzzzzzzzz_segmentos.sql
- Grupo 80: 90_agente.sql
- Grupo 81: 95_impressora_grupo.sql
- Grupo 82: 99zzzzzz_rastreio.sql
- Grupo 83: 99zzzzzzz_rota.sql
- Grupo 84: 99zzzzzzzz_entregas_cliente.sql
- Grupo 85: 99zzzzzzzzzzzzz_aplicativos.sql
- Grupo 86: README.md
- Grupo 87: decisoes.md
- Grupo 88: impressoras.ts
- Grupo 89: 30_cardapio_digital.sql
- Grupo 90: 60_agendamento.sql
- Grupo 91: 99zzz_combos.sql
- Grupo 92: 99zzzzz_clientes.sql
- Grupo 93: 99zzzzzzzzzzzzzzz_mercadopago.sql
- Grupo 94: page.tsx
- Grupo 95: 50_multilojas.sql
- Grupo 96: 70_caixa.sql
- Grupo 97: 99zzzz_descontos.sql
- Grupo 98: layout.tsx
- Grupo 99: page.tsx
- Grupo 100: tempos_ajuste.sql
- Grupo 101: cardapio_edicao.sql
- Grupo 102: 20_cardapio_pedidos.sql
- Grupo 103: 40_cardapio_biblioteca.sql
- Grupo 104: 99zz_promocao.sql
- Grupo 105: next.config.mjs
- Grupo 106: vercel.json
- Grupo 107: README.md
- Grupo 108: test-db.sh

## God Nodes (most connected - your core abstractions)
1. `criarClienteServidor()` - 174 edges
2. `public.lojas` - 117 edges
3. `public.pedidos` - 107 edges
4. `formatarReais()` - 106 edges
5. `contextoLoja` - 94 edges
6. `public.marcas` - 91 edges
7. `salvando()` - 79 edges
8. `public.produtos` - 67 edges
9. `next` - 65 edges
10. `react` - 59 edges

## Surprising Connections (you probably didn't know these)
- `RES (restaurant ordering SaaS)` --conceptually_related_to--> `D-013 Cash register sessions and blind closing`  [INFERRED]
  README.md → docs/decisoes.md
- `D-026 Real-time motoboy tracking` --references--> `RES Motoboy Android app (Capacitor)`  [INFERRED]
  docs/decisoes.md → apps-mobile/motoboy/README.md
- `PedidoCliente` --references--> `FormaPagamento`  [EXTRACTED]
  apps/web/app/c/[slug]/actions.ts → packages/core/src/pedido.ts
- `RES (restaurant ordering SaaS)` --conceptually_related_to--> `D-015 RES Impressão Windows print agent`  [INFERRED]
  README.md → docs/decisoes.md
- `RES (restaurant ordering SaaS)` --references--> `Architecture decisions log (D-001..D-044)`  [EXTRACTED]
  README.md → docs/decisoes.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Rules duplicated in core and DB with shared test cases** — docs_decisoes_d_021_cardapio_cards_promo, docs_decisoes_d_022_combos_upsell, docs_decisoes_d_029_segmentos_clientes, docs_decisoes_d_030_telefone_nono_digito, docs_decisoes_d_031_fidelidade_grupo, docs_decisoes_core_db_parity [EXTRACTED 1.00]
- **Motoboy delivery flow (QR dispatch, app, tracking, routing)** — docs_decisoes_d_017_app_motoboy_qr, docs_decisoes_d_018_comanda_motoboy_pago, docs_decisoes_d_019_app_android_leitor_qr, docs_decisoes_d_026_rastreio_motoboys, docs_decisoes_d_027_rota_sugerida, apps_mobile_motoboy_readme_res_motoboy_android [INFERRED 0.85]
- **Stock management module (NF-e, recipes, counts, CMV)** — docs_decisoes_d_036_estoque_nfe_ficha, docs_decisoes_d_037_movimentacoes_estoque, docs_decisoes_d_038_meu_estoque_contagem, docs_decisoes_d_039_fechamento_cmv, docs_decisoes_d_040_ficha_sabor_pizza [INFERRED 0.85]

## Communities (116 total, 17 thin omitted)

### Community 0 - "Telas de estoque"
Cohesion: 0.05
Nodes (99): ajustarEstoque(), buscarMovimentos(), copiarFicha(), definirModoEstoque(), excluirInsumo(), feito(), FiltroMovimentos, importarNFe() (+91 more)

### Community 1 - "Login, caixa e ações do painel"
Cohesion: 0.05
Nodes (76): cadastrar(), credenciais(), entrar(), abrirCaixa(), fecharCaixa(), movimentar(), msg(), R (+68 more)

### Community 2 - "Banco: pedidos e entregas"
Cohesion: 0.06
Nodes (63): public.marcas, pedido_eventos_pedido_idx, pedido_item_opcoes_item_idx, pedido_itens_pedido_idx, pedidos_atualizado, pedidos_loja_status_idx, private.contador_pedidos, public.criar_pedido() (+55 more)

### Community 3 - "App Android do motoboy (build)"
Cohesion: 0.05
Nodes (57): adapt, app, g, gradle, m, man, permissoes, res (+49 more)

### Community 4 - "Telas de fidelidade"
Cohesion: 0.07
Nodes (58): ajustarSaldo(), buscarSaldos(), copiarPrograma(), excluirRecompensa(), extratoCliente(), R, saldoDoCliente(), salvarConfigFidelidade() (+50 more)

### Community 5 - "Banco: caixa e webhooks"
Cohesion: 0.05
Nodes (50): caixa_movimentos_sessao_idx, caixa_sessoes_auditar, caixa_sessoes_loja_idx, caixa_sessoes_uma_aberta_idx, caixas_auditar, caixas_nome_idx, lojas_caixa_inicial, pedidos_caixa_idx (+42 more)

### Community 6 - "Banco: impressão"
Cohesion: 0.06
Nodes (47): impressao_config_auditar, impressao_destinos_loja_idx, impressoes_loja_idx, impressoes_pedido_idx, impressoes_pendentes_idx, impressoras_auditar, impressoras_nome_idx, pedidos_imprimir_ao_aceitar (+39 more)

### Community 7 - "Banco: fidelidade"
Cohesion: 0.07
Nodes (42): public.clientes, fidelidade_mov_cliente_idx, fidelidade_mov_grupo_idx, fidelidade_mov_pedido_idx, fidelidade_recompensas_grupo_idx, pedidos_fidelidade, private.aplicar_cupom(), private.aplicar_fidelidade() (+34 more)

### Community 8 - "Banco: estoque"
Cohesion: 0.07
Nodes (39): private.cupom_da_loja(), public.relatorio_entregas(), public.salvar_prazo_entrega(), public.relatorio_fidelidade(), estoque_mov_estoque_idx, estoque_mov_insumo_idx, estoque_mov_pedido_idx, fichas_opcao_idx (+31 more)

### Community 9 - "API aberta e MCP (rotas)"
Cohesion: 0.08
Nodes (33): DELETE, POST(), DELETE, POST(), GET(), OPTIONS, GET(), OPTIONS (+25 more)

### Community 10 - "Tela de impressoras"
Cohesion: 0.10
Nodes (38): ConfigImpressao, DadosImpressora, excluirImpressora(), gerarCodigoAgente(), imprimirTeste(), msg(), R, RC (+30 more)

### Community 11 - "Resumo de vendas"
Cohesion: 0.11
Nodes (35): Composicao, ComposicaoVendas(), dataBR(), dynamic, Kpi(), Metricas, PRESETS, Resumo (+27 more)

### Community 12 - "Banco: multilojas e contas"
Cohesion: 0.09
Nodes (33): public.lojas, contas_atualizado, contas_proteger_plano, contas_titulares_user_idx, lojas_conta_idx, lojas_limite, marcas_limite, pedidos_loja_criado_idx (+25 more)

### Community 13 - "Banco: grupos de opções"
Cohesion: 0.17
Nodes (33): public.complementos, public.criar_grupo_vinculado(), public.grupos_opcoes, public.opcoes, public.produto_grupos, public.produto_marcas, public.produtos, public.criar_grupo_vinculado() (+25 more)

### Community 14 - "Dependências do painel"
Cohesion: 0.07
Nodes (32): dependencies, jsqr@1.4.0, next@^15.5.9, qrcode@^1.5.4, react@^19.2.1, react-dom@^19.2.1, @res/core@*, @supabase/supabase-js@2.47.10 (+24 more)

### Community 15 - "CI (testes automáticos)"
Cohesion: 0.07
Nodes (34): name, runs-on, services, steps, DATABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, POSTGRES_PASSWORD (+26 more)

### Community 16 - "App do motoboy"
Cohesion: 0.14
Nodes (28): despachar(), entregar(), PlanoRota, dynamic, metadata, PaginaDespacho(), Acerto(), AppMotoboy() (+20 more)

### Community 17 - "Tela Aplicativos"
Cohesion: 0.12
Nodes (29): conectarMercadoPago(), desconectarMercadoPago(), mpAceitarAoPagar(), R, removerIntegracao(), salvarIntegracao(), salvarLinkGrupo(), dynamic (+21 more)

### Community 18 - "Prazo e sugestão de lotes"
Cohesion: 0.10
Nodes (21): espera(), LoteSugerido, sugerirLotes(), SugestaoLoja, SugestaoLotes(), distanciaReta(), FechamentoMotoboy, Ponto (+13 more)

### Community 19 - "Banco: base e permissões"
Cohesion: 0.10
Nodes (25): grupos_acesso_atualizado, grupos_acesso_auditar, grupos_acesso_validar, lojas_atualizado, lojas_auditar, marcas_atualizado, marcas_auditar, marcas_loja_idx (+17 more)

### Community 20 - "Ações do cardápio"
Cohesion: 0.21
Nodes (28): alterarDisponibilidade(), CategoriaOrigem, criarProduto(), definirFoto(), definirFotoOpcao(), definirGruposDoProduto(), definirProdutosDoGrupo(), desvincularGrupo() (+20 more)

### Community 21 - "Componentes do cardápio"
Cohesion: 0.13
Nodes (21): BotaoExcluir(), AplicarGrupo(), FotoOpcao(), reduzir(), TIPOS, useEnviarFoto(), FormSetor(), Marca (+13 more)

### Community 22 - "Cardápio digital do cliente"
Cohesion: 0.14
Nodes (28): CardapioCliente(), EscolhaGrupos(), ETIQUETA, gravar(), Item, ItemCalculado, ler(), Montador() (+20 more)

### Community 23 - "Grupos de opções (tela)"
Cohesion: 0.12
Nodes (25): DadosGrupo, salvarGrupo(), FORMACOES, FormGrupo(), GrupoInicial, lerPreco(), mostrarPreco(), OpcaoForm (+17 more)

### Community 24 - "Fechamento e tempos de entrega"
Cohesion: 0.14
Nodes (23): ajustarEntrega(), diaDoTurno(), dynamic, Entregas(), BairrosEntregas(), LojaBairros, CartaoMotoboy(), FechamentoMotoboys() (+15 more)

### Community 25 - "Promoções e cupons (tela)"
Cohesion: 0.15
Nodes (27): agenda(), alternarCupom(), CupomForm, excluirCupom(), excluirPromoCategoria(), fim(), PromoCategoriaForm, R (+19 more)

### Community 26 - "Quadro de pedidos"
Cohesion: 0.15
Nodes (24): cuponsPendentes(), imprimirPedido(), criarPedido(), definirAceiteAutomatico(), marcarPago(), mensagem(), mudarStatus(), Resultado (+16 more)

### Community 27 - "Banco: cardápio"
Cohesion: 0.14
Nodes (22): complementos_loja_idx, grupos_opcoes_loja_idx, opcoes_grupo_idx, private.setor_exige_marca(), produto_grupos_grupo_idx, produtos_loja_setor_idx, public.criar_produto(), public.salvar_setor() (+14 more)

### Community 28 - "Banco: clientes"
Cohesion: 0.09
Nodes (18): clientes_auditar, clientes_grupo_nome_idx, pedidos_cliente_idx, pedidos_registra_cliente, private.grupo_da_loja(), private.pedido_registra_cliente(), public.cliente_enderecos, public.salvar_cliente() (+10 more)

### Community 29 - "Workflow do APK do motoboy"
Cohesion: 0.08
Nodes (24): runs-on, steps, GH_TOKEN, KS_B64, KS_PASS, jobs, apk, name (+16 more)

### Community 30 - "Cálculo de preço e combos"
Cohesion: 0.18
Nodes (19): calcularCombo(), PassoCombo, calcularItem(), ErroEscolha, grupoVisivel(), opcaoVisivel(), precoBase(), precoGrupo() (+11 more)

### Community 31 - "Autenticação e layout do motoboy"
Cohesion: 0.11
Nodes (12): GET(), POST(), LayoutMotoboy(), metadata, viewport, criarLoja(), dynamic, config (+4 more)

### Community 32 - "Editor de produtos e combos"
Cohesion: 0.19
Nodes (19): PassoForm, Resultado, EditorCardapio(), Marca, Painel, EditorCombo(), lerCentavos(), Passo (+11 more)

### Community 33 - "Bairros e entregas ao vivo"
Cohesion: 0.17
Nodes (20): AoVivo, AreaForm, calcularKmBairro(), localizarLoja(), MotoboyAoVivo, R, salvarAreas(), salvarLocalLoja() (+12 more)

### Community 34 - "Workflow do agente de impressão"
Cohesion: 0.09
Nodes (21): GH_TOKEN, runs-on, steps, jobs, exe, name, on, push (+13 more)

### Community 35 - "Montagem do cupom impresso"
Cohesion: 0.17
Nodes (19): NovoPedido, blocosCombo(), colunasLR(), CupomDados, cupomTexto(), dataHora(), FRACAO, fracaoTexto() (+11 more)

### Community 36 - "Pix pelo Mercado Pago"
Cohesion: 0.19
Nodes (14): POST(), conferirPixMercadoPago(), PedidoCliente, pixMercadoPago(), PagarPixMp(), atualizarPagamento(), conferirPix(), marcarPago() (+6 more)

### Community 37 - "Rota e geolocalização"
Cohesion: 0.23
Nodes (17): chegadas(), espera(), medirEntrega(), montar(), planejarRota(), Achado, distanciaRota(), EnderecoEntrega (+9 more)

### Community 38 - "Tela de clientes"
Cohesion: 0.26
Nodes (14): exportarClientes(), listarClientes(), salvarCliente(), Clientes(), dynamic, FichaCliente(), ListaClientes(), SEG (+6 more)

### Community 39 - "Novo pedido no balcão"
Cohesion: 0.25
Nodes (18): buscarClientes(), autorizarDesconto(), GruposBalcao(), ItemCarrinho, lerCentavos(), Montador(), MontadorCombo(), NovoPedido() (+10 more)

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

### Community 44 - "Tela de API e webhooks"
Cohesion: 0.23
Nodes (17): criarChaveApi(), excluirWebhook(), revogarChaveApi(), salvarWebhook(), testarWebhook(), copiar(), ENDPOINTS, FormWebhook() (+9 more)

### Community 45 - "Grupo 45: package.json"
Cohesion: 0.14
Nodes (17): description, devDependencies, esbuild@0.24.0, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, tsx, @types/node (+9 more)

### Community 46 - "Grupo 46: package.json"
Cohesion: 0.13
Nodes (17): description, devDependencies, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, exports, tsx, @types/node (+9 more)

### Community 47 - "Grupo 47: impressao.ts"
Cohesion: 0.20
Nodes (14): marcarImpressao(), RC, useImprimir(), agenteOnline(), colunasNavegador(), CSS_CUPOM, CupomFila, cupomHtml() (+6 more)

### Community 48 - "Grupo 48: diversos"
Cohesion: 0.16
Nodes (8): private.preco_item(), combo_passos_auditar, combo_passos_combo_idx, private.preco_combo(), public.combo_passos, public.duplicar_produto(), public.salvar_combo(), private.preco_combo()

### Community 49 - "Grupo 49: agendamento.ts"
Cohesion: 0.25
Nodes (13): conferirCupom(), enviarPedido(), Checkout(), lerCentavos(), chaveBairro(), dataNoFuso(), DIAS_CURTOS, faseAgendamento (+5 more)

### Community 50 - "Grupo 50: pedido.ts"
Cohesion: 0.26
Nodes (12): acaoAvancar(), ErroPedido, LinhaTotal, proximosStatus(), STATUS_ROTULO, tempoDecorrido(), Totais, totalizar() (+4 more)

### Community 51 - "Grupo 51: cardapio_digital.sql"
Cohesion: 0.20
Nodes (12): areas_entrega_auditar, marca_horarios_auditar, private.marca_aberta(), public.areas_entrega, public.cardapio_publico(), public.criar_pedido_publico(), public.marca_horarios, public.salvar_config_delivery() (+4 more)

### Community 52 - "Grupo 52: rastreamento.tsx"
Cohesion: 0.26
Nodes (11): carregar(), dynamic, generateMetadata(), PaginaCardapio(), carregar(), enviar(), Janela, Rastreamento() (+3 more)

### Community 53 - "Grupo 53: page.tsx"
Cohesion: 0.21
Nodes (12): Cardapio(), dynamic, c(), dynamic, Promocoes(), CupomLinha, PromoCategoriaLinha, PromoProdutoLinha (+4 more)

### Community 54 - "Grupo 54: cardapio-dados.ts"
Cohesion: 0.27
Nodes (10): dynamic, PaginaNovoPedido(), Cardapio, GrupoRow, OpcaoRow, PassoRow, ProdutoMarcaRow, ProdutoRow (+2 more)

### Community 55 - "Grupo 55: rastreio_motoboys.sql"
Cohesion: 0.18
Nodes (11): motoboy_local_grupo_idx, motoboy_posicoes_em_idx, motoboy_posicoes_entregador_idx, pedidos_motoboy_sai_do_mapa, private.e_membro_do_grupo(), public.motoboy_posicoes, public.rastreio_ao_vivo(), public.registrar_destino() (+3 more)

### Community 56 - "Grupo 56: form-delivery.tsx"
Cohesion: 0.29
Nodes (11): ConfigDelivery, definirStatus(), replicarHorarios(), salvarConfig(), Delivery(), centavos(), DIAS, FORMAS (+3 more)

### Community 57 - "Grupo 57: ao-vivo.tsx"
Cohesion: 0.28
Nodes (10): rastreioAoVivo(), CORES, haQuanto(), iniciais(), MapaAoVivo(), segundos(), MapaCliente(), Ponto (+2 more)

### Community 58 - "Grupo 58: promocao.ts"
Cohesion: 0.27
Nodes (10): AgendaPromo, diaAnterior(), diaDaSemana(), DIAS_CURTOS, partesLocais(), promoEncerrada(), promoVale(), seg() (+2 more)

### Community 59 - "Grupo 59: diversos"
Cohesion: 0.15
Nodes (3): public.duplicar_produto(), public.duplicar_setor(), public.importar_cardapio()

### Community 60 - "Grupo 60: page.tsx"
Cohesion: 0.29
Nodes (9): dynamic, metadata, PaginaAcompanhar(), AcompanharPedido(), ExtrasPedido, hora(), PagarPix(), usaPixMp() (+1 more)

### Community 61 - "Grupo 61: nav-painel.tsx"
Cohesion: 0.27
Nodes (9): PainelLayout(), trocarLoja(), Icone(), Link_, LINKS, NavPainel(), SECOES, usePedidoFlutuante() (+1 more)

### Community 62 - "Grupo 62: package.json"
Cohesion: 0.17
Nodes (11): description, engines, node, name, private, scripts, build, dev (+3 more)

### Community 63 - "Grupo 63: 99zzzzzzzzzzz_fidelidade.sql"
Cohesion: 0.23
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 64 - "Grupo 64: decisoes.md"
Cohesion: 0.18
Nodes (3): BeeFood study (R-, B-, T- references), Architecture decisions log (D-001..D-044), Realtime order board (Novo → Concluído)

### Community 65 - "Grupo 65: README.md"
Cohesion: 0.24
Nodes (8): pedidos.qr_token (/m/d/<código>), GitHub Actions CI (rules, db, build), packages/core (business rules TS), Roadmap stages 3c-7 and integrations, RES (restaurant ordering SaaS), supabase/migrations (Postgres RLS, audit, atomic ops), Supabase project RES - PRÓPRIO (São Paulo), supabase/tests (parity T-xxx tests)

### Community 67 - "Grupo 67: tsconfig.json"
Cohesion: 0.18
Nodes (10): compilerOptions, allowImportingTsExtensions, module, moduleResolution, noEmit, skipLibCheck, strict, target (+2 more)

### Community 68 - "Grupo 68: tsconfig.json"
Cohesion: 0.18
Nodes (10): compilerOptions, module, moduleResolution, noEmit, noUncheckedIndexedAccess, skipLibCheck, strict, target (+2 more)

### Community 69 - "Grupo 69: segmentos.ts"
Cohesion: 0.42
Nodes (8): baixarCsv(), CASOS_SEGMENTO, CASOS_TELEFONE, eCelular(), normalizarTelefone(), segmentoCliente(), SEGMENTOS, telefoneInternacional()

### Community 71 - "Grupo 71: pedido-flutuante.tsx"
Cohesion: 0.28
Nodes (8): dadosNovoPedido(), RascunhoPedido, AbrirPorLink(), Contexto, Ctx, Estado, PedidoFlutuanteProvider(), DadosNovoPedido

### Community 72 - "Grupo 72: decisoes.md"
Cohesion: 0.28
Nodes (4): agruparEntregas (core), OSRM / Nominatim (OpenStreetMap services), otimizarRota (core), Shift window 05:00→05:00

### Community 73 - "Grupo 73: aplicativos.ts"
Cohesion: 0.36
Nodes (6): campo(), crc16Pix(), FORMATOS_RASTREAMENTO, pixCopiaECola(), semAcento(), TipoChavePix

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

### Community 78 - "Grupo 78: cliente.tsx"
Cohesion: 0.43
Nodes (7): programaFidelidade(), saldoFidelidade(), FidelidadeCliente(), lembrarPedidoFidelidade(), ler(), provaFidelidade(), ProgramaPublico

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
Cohesion: 0.38
Nodes (6): APK signing secrets MOTOBOY_KEYSTORE_B64 / MOTOBOY_KEYSTORE_PASS, motoboy-app.yml workflow (APK release motoboy-latest), RES Motoboy Android app (Capacitor), RES Motoboy offline fallback page, apps/web (Next.js panel), Vercel deploy (res-iqzs)

### Community 88 - "Grupo 88: impressoras.ts"
Cohesion: 0.29
Nodes (5): ModeloImpressora, MODELOS_IMPRESSORA, PaginaCodigo, PAGINAS_CODIGO, Protocolo

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

### Community 94 - "Grupo 94: page.tsx"
Cohesion: 0.47
Nodes (5): carregar(), dynamic, generateMetadata(), Grupo, PaginaGrupo()

### Community 95 - "Grupo 95: 50_multilojas.sql"
Cohesion: 0.47
Nodes (4): ids, pg_temp.como(), pg_temp.id(), saida

### Community 96 - "Grupo 96: 70_caixa.sql"
Cohesion: 0.47
Nodes (4): ids, pg_temp.como(), pg_temp.id(), saida

### Community 97 - "Grupo 97: 99zzzz_descontos.sql"
Cohesion: 0.47
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 99 - "Grupo 99: page.tsx"
Cohesion: 0.50
Nodes (4): painelMotoboy(), dynamic, maxDuration, Motoboy()

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
- **9 isolated node(s):** `supabase/migrations (Postgres RLS, audit, atomic ops)`, `GitHub Actions CI (rules, db, build)`, `Vercel deploy (res-iqzs)`, `Supabase project RES - PRÓPRIO (São Paulo)`, `contas table plans and limits (plano, limite_lojas, limite_cardapios)` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 530 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `Autenticação e layout do motoboy` to `Telas de estoque`, `Login, caixa e ações do painel`, `Telas de fidelidade`, `API aberta e MCP (rotas)`, `Tela de impressoras`, `Resumo de vendas`, `Dependências do painel`, `App do motoboy`, `Tela Aplicativos`, `Ações do cardápio`, `Componentes do cardápio`, `Cardápio digital do cliente`, `Fechamento e tempos de entrega`, `Promoções e cupons (tela)`, `Quadro de pedidos`, `Bairros e entregas ao vivo`, `Pix pelo Mercado Pago`, `Tela de clientes`, `Novo pedido no balcão`, `Tela de API e webhooks`, `Grupo 52: rastreamento.tsx`, `Grupo 56: form-delivery.tsx`, `Grupo 60: page.tsx`, `Grupo 61: nav-painel.tsx`, `Grupo 71: pedido-flutuante.tsx`, `Grupo 94: page.tsx`, `Grupo 98: layout.tsx`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **What connects `supabase/migrations (Postgres RLS, audit, atomic ops)`, `GitHub Actions CI (rules, db, build)`, `Vercel deploy (res-iqzs)` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Telas de estoque` be split into smaller, more focused modules?**
  _Cohesion score 0.051962676962676965 - nodes in this community are weakly interconnected._
- **Why does `formatarReais()` connect `Fechamento e tempos de entrega` to `Telas de estoque`, `Login, caixa e ações do painel`, `Telas de fidelidade`, `Resumo de vendas`, `App do motoboy`, `Tela Aplicativos`, `Cardápio digital do cliente`, `Grupos de opções (tela)`, `Promoções e cupons (tela)`, `Quadro de pedidos`, `Cálculo de preço e combos`, `Editor de produtos e combos`, `Bairros e entregas ao vivo`, `Montagem do cupom impresso`, `Pix pelo Mercado Pago`, `Tela de clientes`, `Novo pedido no balcão`, `Grupo 49: agendamento.ts`, `Grupo 56: form-delivery.tsx`, `Grupo 60: page.tsx`, `Grupo 71: pedido-flutuante.tsx`, `Grupo 78: cliente.tsx`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Should `Login, caixa e ações do painel` be split into smaller, more focused modules?**
  _Cohesion score 0.05225885225885226 - nodes in this community are weakly interconnected._
- **Why does `criarClienteServidor()` connect `Ações do cardápio` to `Telas de estoque`, `Login, caixa e ações do painel`, `Telas de fidelidade`, `Tela de impressoras`, `Resumo de vendas`, `App do motoboy`, `Tela Aplicativos`, `Prazo e sugestão de lotes`, `Grupos de opções (tela)`, `Fechamento e tempos de entrega`, `Promoções e cupons (tela)`, `Quadro de pedidos`, `Autenticação e layout do motoboy`, `Bairros e entregas ao vivo`, `Pix pelo Mercado Pago`, `Rota e geolocalização`, `Tela de clientes`, `Novo pedido no balcão`, `Tela de API e webhooks`, `Grupo 47: impressao.ts`, `Grupo 49: agendamento.ts`, `Grupo 52: rastreamento.tsx`, `Grupo 53: page.tsx`, `Grupo 54: cardapio-dados.ts`, `Grupo 56: form-delivery.tsx`, `Grupo 57: ao-vivo.tsx`, `Grupo 60: page.tsx`, `Grupo 78: cliente.tsx`, `Grupo 94: page.tsx`, `Grupo 99: page.tsx`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Should `Banco: pedidos e entregas` be split into smaller, more focused modules?**
  _Cohesion score 0.055501460564751706 - nodes in this community are weakly interconnected._