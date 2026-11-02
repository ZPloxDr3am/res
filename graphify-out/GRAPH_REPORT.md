# Graph Report - res  (2026-11-01)

## Corpus Check
- 342 files · ~310,723 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 2886 nodes · 7398 edges · 146 communities (125 shown, 21 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 53 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9276dd3a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.ts
- formatarReais
- 20261020000001_base.sql
- main.ts
- (painel)/layout.tsx
- 20261021000014_caixa.sql
- Banco: impressão
- 20261027000032_fidelidade.sql
- Banco: estoque
- API aberta e MCP (rotas)
- salvando
- relatorios/page.tsx
- m/actions.ts
- programa.tsx
- web/package.json
- CI (testes automáticos)
- app-motoboy.tsx
- 20261020000002_cardapio.sql
- public.pedidos
- Decisões de arquitetura — RES
- next
- novo-pedido.tsx
- aplicativos.tsx
- formatarReais
- gestao/page.tsx
- Promoções e cupons (tela)
- quadro-pedidos.tsx
- lojas/actions.ts
- financeiro/page.tsx
- Workflow do APK do motoboy
- evento.tsx
- form-delivery.tsx
- 20261028000052_gestao_empresarial.sql
- bairros.tsx
- Workflow do agente de impressão
- Montagem do cupom impresso
- impressao.ts
- documento/[id]/page.tsx
- preco.ts
- painel-caixa.tsx
- Configuração TypeScript
- Banco: cupons e descontos
- Banco: Mercado Pago
- Dependências do app do motoboy
- public.fin_lancamentos
- Grupo 45: package.json
- Grupo 46: package.json
- acompanhar-pedido.tsx
- public.produtos
- cardapio-cliente.tsx
- funcionarios.tsx
- public.setores
- index.ts
- cardapio/actions.ts
- beefood_para_res.py
- resumo/page.tsx
- 20261021000005_pedidos.sql
- graphify
- public.clientes
- promocao.test.ts
- 20261027000026_rastreio_motoboys.sql
- insumos.tsx
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
- cardapio-cliente.tsx
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
- public.combo_passos
- 99zzzzzzzzzzzzzzzzzzz_gestao.sql
- Grupo 96: 70_caixa.sql
- 99zzzzzzzzzzzzzzzzz_taxa_km.sql
- 99zz_promocao.sql
- gestao/actions.ts
- Grupo 100: tempos_ajuste.sql
- pedido.ts
- entregas/page.tsx
- form-grupo.tsx
- meta-mes.tsx
- Grupo 105: next.config.mjs
- Grupo 106: vercel.json
- funcionarios.tsx
- Grupo 108: test-db.sh
- public.importar_cardapio
- 99zzzzz_clientes.sql
- salvando
- grafico-dias.tsx
- [slug]/page.tsx
- 99zzzzzzzzzzzzzzzzzzzzz_evento.sql
- mercadopago.ts
- public.marcas
- 99zzzzz_clientes.sql
- 99zzzzzzzzzzzzzzzzzzzz_equipe.sql
- middleware.ts
- rastreador.tsx
- [slug]/actions.ts
- formatarReais
- 99zzzzzzzzzzzzzzzzzzzzzzz_financeiro.sql
- v_fuso
- public.contas
- 99zzzzzzzzzzzzzzzzzzzzzz_quadro.sql
- 20261021000007_cardapio_biblioteca.sql
- impressoras.ts
- api.tsx
- pedidos/page.tsx
- escpos.ts
- pg_temp.como
- 20261021000004_cardapio_edicao.sql
- 20261028000043_pix_segura.sql
- private.importar_cardapio
- private.consumo_pedido

## God Nodes (most connected - your core abstractions)
1. `criarClienteServidor()` - 225 edges
2. `public.lojas` - 157 edges
3. `public.pedidos` - 126 edges
4. `public.marcas` - 121 edges
5. `contextoLoja` - 119 edges
6. `salvando()` - 118 edges
7. `formatarReais()` - 99 edges
8. `next` - 82 edges
9. `react` - 79 edges
10. `public.produtos` - 75 edges

## Surprising Connections (you probably didn't know these)
- `Ambiente no ar (piloto)` --references--> `main()`  [INFERRED]
  README.md → packages/agente/src/main.ts
- `D-022 Combos com escolhas e categoria de up-sell` --references--> `calcularCombo()`  [INFERRED]
  docs/decisoes.md → packages/core/src/combo.ts
- `D-023 % por categoria, cupons e desconto no balcão com limite` --references--> `precoBase()`  [INFERRED]
  docs/decisoes.md → packages/core/src/preco.ts
- `D-036 · Estoque: entrada por NF-e e baixa pela ficha técnica` --references--> `lerNFe()`  [INFERRED]
  docs/decisoes.md → packages/core/src/estoque.ts
- `D-027 · Rota sugerida quando o motoboy sai com várias entregas` --references--> `otimizarRota()`  [INFERRED]
  docs/decisoes.md → packages/core/src/rota.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Rules duplicated in core and DB with shared test cases** — docs_decisoes_d_021_cardapio_cards_promo, docs_decisoes_d_022_combos_upsell, docs_decisoes_d_029_segmentos_clientes, docs_decisoes_d_030_telefone_nono_digito, docs_decisoes_d_031_fidelidade_grupo, docs_decisoes_core_db_parity [EXTRACTED 1.00]
- **Motoboy delivery flow (QR dispatch, app, tracking, routing)** — docs_decisoes_d_017_app_motoboy_qr, docs_decisoes_d_018_comanda_motoboy_pago, docs_decisoes_d_019_app_android_leitor_qr, docs_decisoes_d_026_rastreio_motoboys, docs_decisoes_d_027_rota_sugerida, apps_mobile_motoboy_readme_res_motoboy_android [INFERRED 0.85]
- **Stock management module (NF-e, recipes, counts, CMV)** — docs_decisoes_d_036_estoque_nfe_ficha, docs_decisoes_d_037_movimentacoes_estoque, docs_decisoes_d_038_meu_estoque_contagem, docs_decisoes_d_039_fechamento_cmv, docs_decisoes_d_040_ficha_sabor_pizza [INFERRED 0.85]

## Communities (146 total, 21 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.05
Nodes (101): ajustarEstoque(), buscarMovimentos(), copiarFicha(), definirModoEstoque(), excluirInsumo(), feito(), FiltroMovimentos, importarNFe() (+93 more)

### Community 1 - "formatarReais"
Cohesion: 0.20
Nodes (16): curto(), formatar(), GraficoLojas(), LojaDesempenho, Metrica, METRICAS, valor(), diasEntre() (+8 more)

### Community 2 - "20261020000001_base.sql"
Cohesion: 0.09
Nodes (28): grupos_acesso_atualizado, grupos_acesso_auditar, grupos_acesso_validar, lojas_atualizado, lojas_auditar, marcas_atualizado, marcas_auditar, marcas_loja_idx (+20 more)

### Community 3 - "main.ts"
Cohesion: 0.06
Nodes (56): adapt, app, g, gradle, m, man, permissoes, res (+48 more)

### Community 4 - "(painel)/layout.tsx"
Cohesion: 0.16
Nodes (17): PainelLayout(), trocarLoja(), dadosNovoPedido(), Icone(), Link_, LINKS, NavPainel(), SECOES (+9 more)

### Community 5 - "20261021000014_caixa.sql"
Cohesion: 0.06
Nodes (48): caixa_movimentos_sessao_idx, caixa_sessoes_auditar, caixa_sessoes_loja_idx, caixa_sessoes_uma_aberta_idx, caixas_auditar, caixas_nome_idx, lojas_caixa_inicial, pedidos_caixa_idx (+40 more)

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
Cohesion: 0.10
Nodes (38): ConfigImpressao, DadosImpressora, excluirImpressora(), gerarCodigoAgente(), imprimirPedido(), imprimirTeste(), msg(), R (+30 more)

### Community 11 - "relatorios/page.tsx"
Cohesion: 0.10
Nodes (20): Aba, ABAS, Cancelado, dataBR(), dynamic, hora(), MESES, num() (+12 more)

### Community 12 - "m/actions.ts"
Cohesion: 0.18
Nodes (20): chegadas(), espera(), medirEntrega(), montar(), painelMotoboy(), planejarRota(), dynamic, maxDuration (+12 more)

### Community 13 - "programa.tsx"
Cohesion: 0.06
Nodes (60): ajustarSaldo(), buscarSaldos(), copiarPrograma(), excluirRecompensa(), extratoCliente(), R, saldoDoCliente(), salvarConfigFidelidade() (+52 more)

### Community 14 - "web/package.json"
Cohesion: 0.06
Nodes (34): config, PUBLICAS, dependencies, next@^15.5.9, qrcode@^1.5.4, react@^19.2.1, react-dom@^19.2.1, @res/core@* (+26 more)

### Community 15 - "CI (testes automáticos)"
Cohesion: 0.07
Nodes (34): name, runs-on, services, steps, DATABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, POSTGRES_PASSWORD (+26 more)

### Community 16 - "app-motoboy.tsx"
Cohesion: 0.12
Nodes (30): despachar(), entregar(), PlanoRota, dynamic, metadata, PaginaDespacho(), Acerto(), AppMotoboy() (+22 more)

### Community 17 - "20261020000002_cardapio.sql"
Cohesion: 0.25
Nodes (7): pedidos_a_evento_periodo, private.limite_cardapios(), private.pedido_no_periodo_do_evento(), private.produto_de_evento(), public.criar_evento(), public.evento_publico(), public.salvar_evento()

### Community 18 - "public.pedidos"
Cohesion: 0.06
Nodes (40): public.pedidos, private.composicao_vendas(), public.resumo_vendas(), pedidos_entregador_idx, pedidos_qr_idx, private.dados_cupom(), public.motoboy_despachar(), public.motoboy_entregar() (+32 more)

### Community 19 - "Decisões de arquitetura — RES"
Cohesion: 0.06
Nodes (33): D-002 Modelo multiloja: Loja → Marcas, D-003 Regras de cadastro valem no banco e no formulário, D-004 Auditoria calculada no servidor, D-005 Operações compostas são atômicas, D-006 Gravar só em ação explícita, D-007 Texto em UTF-8 completo, D-008 Nenhum segredo de integração no navegador, D-009 Preço de itens com grupos (decisão provisória, Q-009) (+25 more)

### Community 20 - "next"
Cohesion: 0.10
Nodes (14): GET(), POST(), fonte, metadata, cadastrar(), credenciais(), entrar(), LayoutMotoboy() (+6 more)

### Community 21 - "novo-pedido.tsx"
Cohesion: 0.16
Nodes (27): buscarClientes(), autorizarDesconto(), criarPedido(), dynamic, PaginaNovoPedido(), GruposBalcao(), ItemCarrinho, lerCentavos() (+19 more)

### Community 22 - "aplicativos.tsx"
Cohesion: 0.08
Nodes (52): conectarMercadoPago(), criarChaveApi(), desconectarMercadoPago(), excluirWebhook(), mpAceitarAoPagar(), R, removerIntegracao(), revogarChaveApi() (+44 more)

### Community 23 - "formatarReais"
Cohesion: 0.23
Nodes (14): ajustarEntrega(), CartaoMotoboy(), FechamentoMotoboys(), FONTE, hora(), LinhaEntrega(), Numero(), Total (+6 more)

### Community 24 - "gestao/page.tsx"
Cohesion: 0.16
Nodes (20): EscopoCustos, salvarModoGrupo(), Gestao(), BotaoExcluir(), brl(), ler(), Linha, pct() (+12 more)

### Community 25 - "Promoções e cupons (tela)"
Cohesion: 0.12
Nodes (34): agenda(), alternarCupom(), CupomForm, excluirCupom(), excluirPromoCategoria(), fim(), PromoCategoriaForm, R (+26 more)

### Community 26 - "quadro-pedidos.tsx"
Cohesion: 0.06
Nodes (34): cuponsPendentes(), definirAceiteAutomatico(), definirMovimento(), definirProntoAuto(), marcarAviso(), marcarPago(), mensagem(), mudarStatus() (+26 more)

### Community 27 - "lojas/actions.ts"
Cohesion: 0.26
Nodes (14): convidar(), criarCardapio(), criarLoja(), definirCidade(), msg(), R, CartaoLoja(), Conta (+6 more)

### Community 28 - "financeiro/page.tsx"
Cohesion: 0.07
Nodes (75): configCustos(), criarLancamento(), donoFin(), editarLancamento(), excluirLancamento(), gerarContasCustos(), lancarNfe(), marcarPago() (+67 more)

### Community 29 - "Workflow do APK do motoboy"
Cohesion: 0.08
Nodes (24): runs-on, steps, GH_TOKEN, KS_B64, KS_PASS, jobs, apk, name (+16 more)

### Community 30 - "evento.tsx"
Cohesion: 0.12
Nodes (35): AjusteProduto, copiarParaEvento(), criarEvento(), msg(), R, refrescar(), removerProdutoEvento(), salvarEvento() (+27 more)

### Community 31 - "form-delivery.tsx"
Cohesion: 0.20
Nodes (16): ConfigDelivery, definirStatus(), replicarHorarios(), salvarConfig(), salvarVitrine(), Vitrine, Delivery(), CORES (+8 more)

### Community 32 - "20261028000052_gestao_empresarial.sql"
Cohesion: 0.24
Nodes (13): funcionario_registros_idx, funcionario_registros_numero, funcionarios_loja_idx, gestao_empresa_auditar, private.contadores_registro, private.numerar_registro(), public.funcionario_registros, public.funcionarios (+5 more)

### Community 33 - "bairros.tsx"
Cohesion: 0.18
Nodes (22): AreaForm, calcularKmBairro(), FaixaForm, localizarLoja(), R, salvarAreas(), salvarFaixasKm(), salvarLocalLoja() (+14 more)

### Community 34 - "Workflow do agente de impressão"
Cohesion: 0.09
Nodes (21): GH_TOKEN, runs-on, steps, jobs, exe, name, on, push (+13 more)

### Community 35 - "Montagem do cupom impresso"
Cohesion: 0.15
Nodes (21): D-014 Impressão: fila no banco, regras como no BeeFood, navegador até o agente chegar, D-015 Agente de impressão do Windows (RES Impressão), blocosCombo(), colunasLR(), CupomDados, cupomTexto(), dataHora(), FRACAO (+13 more)

### Community 36 - "impressao.ts"
Cohesion: 0.18
Nodes (16): marcarImpressao(), AbaLayout(), EditorLayout(), RC, useImprimir(), colunasNavegador(), CSS_CUPOM, CupomFila (+8 more)

### Community 37 - "documento/[id]/page.tsx"
Cohesion: 0.18
Nodes (19): dias(), Documento(), dynamic, Aba, ABAS, dynamic, DadosEmpresa(), Acesso (+11 more)

### Community 38 - "preco.ts"
Cohesion: 0.12
Nodes (28): calcularCombo(), PassoCombo, precoSeparado(), Papel, Recurso, RECURSOS, temPermissao(), calcularItem() (+20 more)

### Community 39 - "painel-caixa.tsx"
Cohesion: 0.09
Nodes (47): abrirCaixa(), fecharCaixa(), movimentar(), msg(), R, salvarCaixa(), vincularSemCaixa(), dynamic (+39 more)

### Community 40 - "Configuração TypeScript"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 41 - "Banco: cupons e descontos"
Cohesion: 0.14
Nodes (15): cupons_auditar, cupons_codigo_idx, pedidos_cupom_idx, private.agenda_vale(), private.aplicar_cupom(), private.desconto_categoria_pct(), private.desconto_cupom(), private.preco_combo() (+7 more)

### Community 42 - "Banco: Mercado Pago"
Cohesion: 0.15
Nodes (15): public.resumo_vendas(), public.relatorio_entregas(), public.relatorio_fidelidade(), public.movimentos_estoque_filtro(), public.fechamento_estoque(), private.periodo_api(), mp_pagamentos_pedido_idx, public.desconectar_mp() (+7 more)

### Community 43 - "Dependências do app do motoboy"
Cohesion: 0.14
Nodes (17): dependencies, @capacitor/android@6.2.0, @capacitor/app@6.0.2, @capacitor/cli@6.2.0, @capacitor-community/background-geolocation@1.2.26, @capacitor/core@6.2.0, description, name (+9 more)

### Community 44 - "public.fin_lancamentos"
Cohesion: 0.16
Nodes (21): fin_fornecedores_doc, fin_lanc_comp, fin_lanc_origem, fin_lanc_serie, fin_lanc_venc, fin_lancamentos_auditar, fin_lancamentos_loja, private.fin_mesma_loja() (+13 more)

### Community 45 - "Grupo 45: package.json"
Cohesion: 0.14
Nodes (17): description, devDependencies, esbuild@0.24.0, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, tsx, @types/node (+9 more)

### Community 46 - "Grupo 46: package.json"
Cohesion: 0.13
Nodes (17): description, devDependencies, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, exports, tsx, @types/node (+9 more)

### Community 47 - "acompanhar-pedido.tsx"
Cohesion: 0.14
Nodes (19): dynamic, metadata, PaginaAcompanhar(), AcompanharPedido(), ExtrasPedido, hora(), MapaCliente(), Ponto (+11 more)

### Community 48 - "public.produtos"
Cohesion: 0.14
Nodes (41): complementos_loja_idx, grupos_opcoes_loja_idx, opcoes_grupo_idx, produto_grupos_grupo_idx, produtos_loja_setor_idx, public.complementos, public.criar_grupo_vinculado(), public.criar_produto() (+33 more)

### Community 49 - "cardapio-cliente.tsx"
Cohesion: 0.14
Nodes (21): MontadorCombo(), acrescimo(), cheio(), completo(), Extras, GruposMontagem(), minimo(), Montador() (+13 more)

### Community 50 - "funcionarios.tsx"
Cohesion: 0.30
Nodes (17): ligarFicha(), salvarFuncionario(), criarUsuarioCaixa(), Assistente(), CartaoAcesso(), doFuncionario(), Funcionarios(), ModoAcesso (+9 more)

### Community 51 - "public.setores"
Cohesion: 0.12
Nodes (26): private.setor_exige_marca(), public.salvar_setor(), public.setor_marcas, public.setores, setor_marcas_exige_marca, setores_exige_marca, setores_loja_idx, areas_entrega_auditar (+18 more)

### Community 52 - "index.ts"
Cohesion: 0.16
Nodes (23): exportarClientes(), listarClientes(), salvarCliente(), Clientes(), dynamic, baixarCsv(), FichaCliente(), ListaClientes() (+15 more)

### Community 53 - "cardapio/actions.ts"
Cohesion: 0.18
Nodes (32): alterarDisponibilidade(), CategoriaOrigem, criarProduto(), definirFoto(), definirFotoOpcao(), definirGruposDoProduto(), definirProdutosDoGrupo(), desvincularGrupo() (+24 more)

### Community 54 - "beefood_para_res.py"
Cohesion: 0.33
Nodes (3): converter(), limpa(), L()

### Community 55 - "resumo/page.tsx"
Cohesion: 0.17
Nodes (12): Composicao, ComposicaoVendas(), dataBR(), dynamic, Kpi(), Metricas, PRESETS, Resumo (+4 more)

### Community 56 - "20261021000005_pedidos.sql"
Cohesion: 0.15
Nodes (10): pedido_eventos_pedido_idx, pedido_item_opcoes_item_idx, pedido_itens_pedido_idx, pedidos_atualizado, pedidos_loja_status_idx, private.contador_pedidos, public.criar_pedido(), public.mudar_status_pedido() (+2 more)

### Community 58 - "public.clientes"
Cohesion: 0.09
Nodes (25): clientes_auditar, clientes_grupo_nome_idx, pedidos_cliente_idx, pedidos_registra_cliente, private.grupo_da_loja(), private.pedido_registra_cliente(), public.buscar_clientes(), public.cliente_enderecos (+17 more)

### Community 59 - "promocao.test.ts"
Cohesion: 0.24
Nodes (11): D-021 Cardápio novo: cards com foto e promoção De/Por com agenda, AgendaPromo, diaAnterior(), diaDaSemana(), DIAS_CURTOS, partesLocais(), promoEncerrada(), promoVale() (+3 more)

### Community 60 - "20261027000026_rastreio_motoboys.sql"
Cohesion: 0.23
Nodes (11): custos_auditar, custos_loja_idx, public.custos, custos_auditar, custos_auditar_apagar, public.gestao_conta, public.preparar_gestao_grupo(), public.fin_config (+3 more)

### Community 61 - "insumos.tsx"
Cohesion: 0.23
Nodes (10): D-011 Pedido agendado e taxa por bairro no painel, chaveBairro(), dataNoFuso(), DIAS_CURTOS, faseAgendamento, FOLGA_AGENDADO_MIN, horaNoFuso(), partes() (+2 more)

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

### Community 73 - "equipe.tsx"
Cohesion: 0.14
Nodes (25): alterarFuncao(), cancelarConvite(), definirAtivo(), salvarPermissoesEquipe(), trocarSenhaUsuario(), ABAS, dynamic, Lojas() (+17 more)

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

### Community 78 - "cardapio-cliente.tsx"
Cohesion: 0.08
Nodes (26): situacaoPedidos(), CardapioCliente(), Checkout(), ETIQUETA, Extras(), gravar(), Item, ItemCalculado (+18 more)

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

### Community 94 - "public.combo_passos"
Cohesion: 0.17
Nodes (7): private.preco_item(), combo_passos_auditar, combo_passos_combo_idx, private.preco_combo(), public.combo_passos, public.duplicar_produto(), public.salvar_combo()

### Community 95 - "99zzzzzzzzzzzzzzzzzzz_gestao.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 96 - "Grupo 96: 70_caixa.sql"
Cohesion: 0.47
Nodes (4): ids, pg_temp.como(), pg_temp.id(), saida

### Community 97 - "99zzzzzzzzzzzzzzzzz_taxa_km.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 98 - "99zz_promocao.sql"
Cohesion: 0.60
Nodes (4): ids, pg_temp.como(), pg_temp.id(), pg_temp.vale()

### Community 99 - "gestao/actions.ts"
Cohesion: 0.26
Nodes (13): excluirRegistro(), FuncionarioForm, lojaGestor(), R, RegistroForm, salvarCustos(), salvarEmpresa(), salvarRegistro() (+5 more)

### Community 101 - "pedido.ts"
Cohesion: 0.23
Nodes (13): acaoAvancar(), ErroPedido, LinhaTotal, proximosStatus(), STATUS_ROTULO, StatusPedido, tempoDecorrido(), Totais (+5 more)

### Community 102 - "entregas/page.tsx"
Cohesion: 0.14
Nodes (20): AoVivo, MotoboyAoVivo, rastreioAoVivo(), diaDoTurno(), dynamic, Entregas(), CORES, haQuanto() (+12 more)

### Community 103 - "form-grupo.tsx"
Cohesion: 0.17
Nodes (18): DadosGrupo, salvarDetalheOpcao(), salvarGrupo(), DetalheOpcao(), FORMACOES, FormGrupo(), GrupoInicial, lerPreco() (+10 more)

### Community 104 - "meta-mes.tsx"
Cohesion: 0.24
Nodes (10): salvarMeta(), ler(), MESES, MetaMes(), pct(), calcularMeta(), DadosMeta, diaUTC() (+2 more)

### Community 107 - "funcionarios.tsx"
Cohesion: 0.10
Nodes (23): espera(), LoteSugerido, sugerirLotes(), SugestaoLoja, SugestaoLotes(), D-027 · Rota sugerida quando o motoboy sai com várias entregas, D-028 · Cliente acompanha a entrega, prazo por loja, alerta e lotes na expedição, tempos e atrasos, Ponto (+15 more)

### Community 116 - "public.importar_cardapio"
Cohesion: 0.15
Nodes (3): public.duplicar_grupo(), public.duplicar_produto(), public.importar_cardapio()

### Community 117 - "99zzzzz_clientes.sql"
Cohesion: 0.47
Nodes (5): carregar(), dynamic, generateMetadata(), Grupo, PaginaGrupo()

### Community 118 - "salvando"
Cohesion: 0.14
Nodes (22): PassoForm, salvarCombo(), EditorCombo(), lerCentavos(), Passo, reais(), EditorProduto(), ETIQUETAS (+14 more)

### Community 119 - "grafico-dias.tsx"
Cohesion: 0.33
Nodes (8): DiaLojas, DIAS, GraficoDias(), LojaCor, pedidosDia(), rotulo(), semana(), totalDia()

### Community 120 - "[slug]/page.tsx"
Cohesion: 0.32
Nodes (7): FaixaKm, carregar(), dynamic, generateMetadata(), PaginaCardapio(), AgendamentoPublico, CardapioPublico

### Community 121 - "99zzzzzzzzzzzzzzzzzzzzz_evento.sql"
Cohesion: 0.32
Nodes (5): ids, pg_temp.id(), pg_temp.v(), quando, saida

### Community 122 - "mercadopago.ts"
Cohesion: 0.21
Nodes (13): POST(), conferirPixMercadoPago(), pixMercadoPago(), PagarPixMp(), atualizarPagamento(), conferirPix(), marcarPago(), Ped (+5 more)

### Community 123 - "public.marcas"
Cohesion: 0.07
Nodes (56): public.lojas, public.marcas, public.pedido_item_opcoes, public.pedido_itens, private.marca_aberta(), public.acompanhar_pedido(), public.replicar_horarios(), private.dentro_do_horario() (+48 more)

### Community 125 - "99zzzzz_clientes.sql"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 126 - "99zzzzzzzzzzzzzzzzzzzz_equipe.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 127 - "middleware.ts"
Cohesion: 0.60
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 129 - "rastreador.tsx"
Cohesion: 0.36
Nodes (6): cap(), Capacitor, EstadoRastreio, useRastreio(), Watcher, clienteNavegador()

### Community 130 - "[slug]/actions.ts"
Cohesion: 0.23
Nodes (13): calcularEntregaKm(), conferirCupom(), EntregaKm, enviarPedido(), PedidoCliente, programaFidelidade(), saldoFidelidade(), FidelidadeCliente() (+5 more)

### Community 131 - "formatarReais"
Cohesion: 0.13
Nodes (7): fin_lanc_grupo_comp, fin_lanc_grupo_venc, fin_lanc_origem_grupo, fin_lancamentos_auditar, fin_lancamentos_auditar_apagar, private.fin_exigir(), public.preparar_financeiro()

### Community 132 - "99zzzzzzzzzzzzzzzzzzzzzzz_financeiro.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 133 - "v_fuso"
Cohesion: 0.29
Nodes (5): public.config_custos_financeiro(), public.dre_financeiro(), public.meta_vendas(), public.metas_vendas, public.salvar_meta_vendas()

### Community 134 - "public.contas"
Cohesion: 0.07
Nodes (37): contas_atualizado, contas_proteger_plano, contas_titulares_user_idx, lojas_conta_idx, lojas_limite, marcas_limite, pedidos_loja_criado_idx, private.e_titular() (+29 more)

### Community 135 - "99zzzzzzzzzzzzzzzzzzzzzz_quadro.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 136 - "20261021000007_cardapio_biblioteca.sql"
Cohesion: 0.47
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 137 - "impressoras.ts"
Cohesion: 0.33
Nodes (4): ModeloImpressora, PaginaCodigo, PAGINAS_CODIGO, Protocolo

### Community 138 - "api.tsx"
Cohesion: 0.39
Nodes (7): salvarSetor(), FormSetor(), Marca, novoSetor(), SetorForm, setorVisivel(), validarSetor()

### Community 139 - "pedidos/page.tsx"
Cohesion: 0.36
Nodes (6): Cardapio(), dynamic, dynamic, Pedidos(), TempoReal(), carregarQuadro()

### Community 141 - "pg_temp.como"
Cohesion: 0.60
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 142 - "20261021000004_cardapio_edicao.sql"
Cohesion: 0.33
Nodes (3): public.criar_grupo_vinculado(), public.desvincular_grupo(), public.reordenar()

### Community 143 - "20261028000043_pix_segura.sql"
Cohesion: 0.47
Nodes (4): pedidos_b_segura_pix, pedidos_pago_libera, private.pago_libera(), private.segura_pix_mp()

### Community 144 - "private.importar_cardapio"
Cohesion: 0.67
Nodes (3): private.importacoes, private.importar_cardapio(), pg_temp.k()

## Knowledge Gaps
- **9 isolated node(s):** `pedidos.qr_token (/m/d/<código>)`, `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `GitHub Actions CI (rules, db, build)`, `Roadmap stages 3c-7 and integrations`, `supabase/migrations (Postgres RLS, audit, atomic ops)` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 703 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `index.ts`, `(painel)/layout.tsx`, `API aberta e MCP (rotas)`, `salvando`, `relatorios/page.tsx`, `programa.tsx`, `web/package.json`, `app-motoboy.tsx`, `novo-pedido.tsx`, `aplicativos.tsx`, `gestao/page.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `lojas/actions.ts`, `financeiro/page.tsx`, `evento.tsx`, `form-delivery.tsx`, `bairros.tsx`, `documento/[id]/page.tsx`, `painel-caixa.tsx`, `acompanhar-pedido.tsx`, `index.ts`, `cardapio/actions.ts`, `resumo/page.tsx`, `equipe.tsx`, `cardapio-cliente.tsx`, `gestao/actions.ts`, `entregas/page.tsx`, `meta-mes.tsx`, `99zzzzz_clientes.sql`, `[slug]/page.tsx`, `mercadopago.ts`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **What connects `pedidos.qr_token (/m/d/<código>)`, `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `GitHub Actions CI (rules, db, build)` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05034324942791762 - nodes in this community are weakly interconnected._
- **Why does `criarClienteServidor()` connect `cardapio/actions.ts` to `index.ts`, `[slug]/actions.ts`, `api.tsx`, `salvando`, `m/actions.ts`, `programa.tsx`, `pedidos/page.tsx`, `relatorios/page.tsx`, `app-motoboy.tsx`, `next`, `novo-pedido.tsx`, `aplicativos.tsx`, `formatarReais`, `gestao/page.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `lojas/actions.ts`, `financeiro/page.tsx`, `evento.tsx`, `form-delivery.tsx`, `bairros.tsx`, `impressao.ts`, `documento/[id]/page.tsx`, `painel-caixa.tsx`, `acompanhar-pedido.tsx`, `funcionarios.tsx`, `index.ts`, `resumo/page.tsx`, `equipe.tsx`, `cardapio-cliente.tsx`, `gestao/actions.ts`, `entregas/page.tsx`, `form-grupo.tsx`, `meta-mes.tsx`, `funcionarios.tsx`, `99zzzzz_clientes.sql`, `salvando`, `[slug]/page.tsx`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `20261020000001_base.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.0873015873015873 - nodes in this community are weakly interconnected._
- **Why does `packages/core (business rules TS)` connect `Grupo 65: README.md` to `preco.ts`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Should `main.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05583972719522592 - nodes in this community are weakly interconnected._