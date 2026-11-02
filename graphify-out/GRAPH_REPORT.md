# Graph Report - res  (2026-11-01)

## Corpus Check
- 343 files · ~315,500 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 2920 nodes · 7474 edges · 150 communities (131 shown, 19 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 53 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `12a9da82`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- importar-nfe.tsx
- resumo/page.tsx
- 20261027000026_rastreio_motoboys.sql
- main.ts
- pedido-flutuante.tsx
- 20261021000014_caixa.sql
- Banco: impressão
- 20261027000032_fidelidade.sql
- Banco: estoque
- API aberta e MCP (rotas)
- salvando
- saida.ts
- geo.ts
- programa.tsx
- web/package.json
- CI (testes automáticos)
- app-motoboy.tsx
- resultados.tsx
- public.pedidos
- Decisões de arquitetura — RES
- next
- tempo-real.tsx
- aplicativos.tsx
- salvando
- estoque/page.tsx
- Promoções e cupons (tela)
- quadro-pedidos.tsx
- estoque/actions.ts
- financeiro/page.tsx
- Workflow do APK do motoboy
- evento.tsx
- form-delivery.tsx
- editor-cardapio.tsx
- bairros.tsx
- Workflow do agente de impressão
- Montagem do cupom impresso
- impressao.ts
- gestao/actions.ts
- preco.ts
- painel-caixa.tsx
- Configuração TypeScript
- Banco: cupons e descontos
- Banco: Mercado Pago
- Dependências do app do motoboy
- public.fin_lancamentos
- Grupo 45: package.json
- Grupo 46: package.json
- [slug]/page.tsx
- public.opcoes
- cardapio-cliente.tsx
- 20261027000026_rastreio_motoboys.sql
- public.setores
- index.ts
- cardapio/actions.ts
- beefood_para_res.py
- resumo/page.tsx
- sabores-pizza.tsx
- graphify
- public.clientes
- promocao.test.ts
- formatarReais
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
- conta-cliente.tsx
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
- 20261021000006_cardapio_digital.sql
- 99zzzzzzzzzzzzzzzzzzz_gestao.sql
- Grupo 96: 70_caixa.sql
- 99zzzzzzzzzzzzzzzzz_taxa_km.sql
- 99zz_promocao.sql
- 20261020000002_cardapio.sql
- Grupo 100: tempos_ajuste.sql
- escpos.ts
- entregas/page.tsx
- form-grupo.tsx
- 20261023000020_entregas_km.sql
- Grupo 105: next.config.mjs
- Grupo 106: vercel.json
- funcionarios.tsx
- Grupo 108: test-db.sh
- public.importar_cardapio
- programa.tsx
- meta-mes.tsx
- pedidos/actions.ts
- lojas/page.tsx
- 99zzzzzzzzzzzzzzzzzzzzz_evento.sql
- mercadopago.ts
- public.marcas
- 99zzzzz_clientes.sql
- 99zzzzzzzzzzzzzzzzzzzz_equipe.sql
- middleware.ts
- ao-vivo.tsx
- [slug]/actions.ts
- movimentos.tsx
- 99zzzzzzzzzzzzzzzzzzzzzzz_financeiro.sql
- public.lojas
- public.contas
- 99zzzzzzzzzzzzzzzzzzzzzz_quadro.sql
- 20261021000007_cardapio_biblioteca.sql
- impressoras.ts
- api.tsx
- QuadroPedidos
- insumos.tsx
- pg_temp.como
- 20261021000004_cardapio_edicao.sql
- conta-cliente.tsx
- public.produtos
- 20261101000067_cupom_area_frete.sql
- contagem.tsx
- pixCopiaECola
- public.relatorio_fidelidade
- m/layout.tsx

## God Nodes (most connected - your core abstractions)
1. `criarClienteServidor()` - 228 edges
2. `public.lojas` - 159 edges
3. `public.pedidos` - 129 edges
4. `public.marcas` - 125 edges
5. `contextoLoja` - 120 edges
6. `salvando()` - 119 edges
7. `formatarReais()` - 95 edges
8. `next` - 82 edges
9. `react` - 79 edges
10. `public.produtos` - 78 edges

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

## Communities (150 total, 19 thin omitted)

### Community 0 - "importar-nfe.tsx"
Cohesion: 0.15
Nodes (25): importarNFe(), ItemImportar, vinculosFornecedor(), cnpjTexto(), dataTexto(), ImportarNFe(), lerFator(), Linha (+17 more)

### Community 1 - "resumo/page.tsx"
Cohesion: 0.20
Nodes (16): curto(), formatar(), GraficoLojas(), LojaDesempenho, Metrica, METRICAS, valor(), diasEntre() (+8 more)

### Community 2 - "20261027000026_rastreio_motoboys.sql"
Cohesion: 0.09
Nodes (27): grupos_acesso_atualizado, grupos_acesso_auditar, grupos_acesso_validar, lojas_atualizado, lojas_auditar, marcas_atualizado, marcas_auditar, marcas_loja_idx (+19 more)

### Community 3 - "main.ts"
Cohesion: 0.14
Nodes (27): acharWindows(), alcance(), argumento(), ARQ_CONFIG, ARQ_LOG, atualizarSePrecisar(), atualizarWindows(), Config (+19 more)

### Community 4 - "pedido-flutuante.tsx"
Cohesion: 0.15
Nodes (18): PainelLayout(), trocarLoja(), dadosNovoPedido(), Icone(), Link_, LINKS, NavPainel(), SECOES (+10 more)

### Community 5 - "20261021000014_caixa.sql"
Cohesion: 0.05
Nodes (50): caixa_movimentos_sessao_idx, caixa_sessoes_auditar, caixa_sessoes_loja_idx, caixa_sessoes_uma_aberta_idx, caixas_auditar, caixas_nome_idx, lojas_caixa_inicial, pedidos_caixa_idx (+42 more)

### Community 6 - "Banco: impressão"
Cohesion: 0.06
Nodes (48): impressao_config_auditar, impressao_destinos_loja_idx, impressoes_loja_idx, impressoes_pedido_idx, impressoes_pendentes_idx, impressoras_auditar, impressoras_nome_idx, pedidos_imprimir_ao_aceitar (+40 more)

### Community 7 - "20261027000032_fidelidade.sql"
Cohesion: 0.06
Nodes (43): fidelidade_mov_cliente_idx, fidelidade_mov_grupo_idx, fidelidade_mov_pedido_idx, fidelidade_recompensas_grupo_idx, pedidos_fidelidade, private.aplicar_cupom(), private.aplicar_fidelidade(), private.expirar_fidelidade() (+35 more)

### Community 8 - "Banco: estoque"
Cohesion: 0.09
Nodes (33): estoque_mov_estoque_idx, estoque_mov_insumo_idx, estoque_mov_pedido_idx, fichas_opcao_idx, fichas_produto_idx, insumos_estoque_idx, pedidos_estoque, private.consumo_pedido() (+25 more)

### Community 9 - "API aberta e MCP (rotas)"
Cohesion: 0.08
Nodes (33): DELETE, POST(), DELETE, POST(), GET(), OPTIONS, GET(), OPTIONS (+25 more)

### Community 10 - "salvando"
Cohesion: 0.10
Nodes (40): ConfigImpressao, DadosImpressora, excluirImpressora(), gerarCodigoAgente(), imprimirPedido(), imprimirTeste(), msg(), R (+32 more)

### Community 11 - "saida.ts"
Cohesion: 0.09
Nodes (20): adapt, app, g, gradle, m, man, permissoes, res (+12 more)

### Community 12 - "geo.ts"
Cohesion: 0.16
Nodes (22): chegadas(), espera(), medirEntrega(), montar(), painelMotoboy(), planejarRota(), dynamic, maxDuration (+14 more)

### Community 13 - "programa.tsx"
Cohesion: 0.07
Nodes (59): ajustarSaldo(), buscarSaldos(), copiarPrograma(), excluirRecompensa(), extratoCliente(), R, saldoDoCliente(), salvarConfigFidelidade() (+51 more)

### Community 14 - "web/package.json"
Cohesion: 0.06
Nodes (36): config, PUBLICAS, dependencies, jsqr@1.4.0, next@^15.5.9, qrcode@^1.5.4, react@^19.2.1, react-dom@^19.2.1 (+28 more)

### Community 15 - "CI (testes automáticos)"
Cohesion: 0.07
Nodes (34): name, runs-on, services, steps, DATABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, POSTGRES_PASSWORD (+26 more)

### Community 16 - "app-motoboy.tsx"
Cohesion: 0.14
Nodes (28): despachar(), entregar(), PlanoRota, dynamic, metadata, PaginaDespacho(), Acerto(), AppMotoboy() (+20 more)

### Community 17 - "resultados.tsx"
Cohesion: 0.18
Nodes (9): pedidos_a_evento_periodo, private.limite_cardapios(), private.pedido_no_periodo_do_evento(), private.produto_de_evento(), public.criar_evento(), public.evento_publico(), public.remover_produto_evento(), public.salvar_evento() (+1 more)

### Community 18 - "public.pedidos"
Cohesion: 0.06
Nodes (51): pedido_eventos_pedido_idx, pedido_item_opcoes_item_idx, pedido_itens_pedido_idx, pedidos_atualizado, pedidos_loja_status_idx, private.contador_pedidos, public.criar_pedido(), public.mudar_status_pedido() (+43 more)

### Community 19 - "Decisões de arquitetura — RES"
Cohesion: 0.06
Nodes (35): D-002 Modelo multiloja: Loja → Marcas, D-003 Regras de cadastro valem no banco e no formulário, D-004 Auditoria calculada no servidor, D-005 Operações compostas são atômicas, D-006 Gravar só em ação explícita, D-007 Texto em UTF-8 completo, D-008 Nenhum segredo de integração no navegador, D-009 Preço de itens com grupos (decisão provisória, Q-009) (+27 more)

### Community 20 - "next"
Cohesion: 0.09
Nodes (23): fonte, metadata, cadastrar(), credenciais(), entrar(), dynamic, definirCidade(), ABAS (+15 more)

### Community 21 - "tempo-real.tsx"
Cohesion: 0.11
Nodes (36): buscarClientes(), autorizarDesconto(), criarPedido(), dynamic, PaginaNovoPedido(), GruposBalcao(), ItemCarrinho, lerCentavos() (+28 more)

### Community 22 - "aplicativos.tsx"
Cohesion: 0.09
Nodes (45): conectarMercadoPago(), criarChaveApi(), desconectarMercadoPago(), excluirWebhook(), mpAceitarAoPagar(), R, removerIntegracao(), revogarChaveApi() (+37 more)

### Community 23 - "salvando"
Cohesion: 0.21
Nodes (13): ajustarEntrega(), CartaoMotoboy(), FechamentoMotoboys(), FONTE, hora(), LinhaEntrega(), Numero(), Total (+5 more)

### Community 24 - "estoque/page.tsx"
Cohesion: 0.18
Nodes (18): dynamic, dataCurta(), Fechamento(), pctTexto(), somaMes(), Filtro, FechamentoEstoque, ItemFicha (+10 more)

### Community 25 - "Promoções e cupons (tela)"
Cohesion: 0.08
Nodes (45): agenda(), alternarCupom(), alternarFreteGratis(), CupomForm, excluirCupom(), excluirFreteGratis(), excluirPromoCategoria(), fim() (+37 more)

### Community 26 - "quadro-pedidos.tsx"
Cohesion: 0.08
Nodes (18): cuponsPendentes(), marcarAviso(), abrirWhatsApp(), AvisarTodos(), CartaoPedido(), COLUNAS, ETAPAS_AVISO, FilaImpressao() (+10 more)

### Community 27 - "estoque/actions.ts"
Cohesion: 0.21
Nodes (15): ajustarEstoque(), copiarFicha(), definirModoEstoque(), excluirInsumo(), feito(), R, salvarFatoresSabor(), salvarFicha() (+7 more)

### Community 28 - "financeiro/page.tsx"
Cohesion: 0.05
Nodes (96): configCustos(), criarLancamento(), donoFin(), editarLancamento(), excluirLancamento(), gerarContasCustos(), lancarNfe(), marcarPago() (+88 more)

### Community 29 - "Workflow do APK do motoboy"
Cohesion: 0.08
Nodes (24): runs-on, steps, GH_TOKEN, KS_B64, KS_PASS, jobs, apk, name (+16 more)

### Community 30 - "evento.tsx"
Cohesion: 0.12
Nodes (35): AjusteProduto, copiarParaEvento(), criarEvento(), msg(), R, refrescar(), removerProdutoEvento(), salvarEvento() (+27 more)

### Community 31 - "form-delivery.tsx"
Cohesion: 0.17
Nodes (20): ConfigDelivery, definirStatus(), replicarHorarios(), salvarConfig(), salvarVitrine(), Vitrine, Delivery(), BotaoExcluir() (+12 more)

### Community 32 - "editor-cardapio.tsx"
Cohesion: 0.24
Nodes (13): funcionario_registros_idx, funcionario_registros_numero, funcionarios_loja_idx, gestao_empresa_auditar, private.contadores_registro, private.numerar_registro(), public.funcionario_registros, public.funcionarios (+5 more)

### Community 33 - "bairros.tsx"
Cohesion: 0.17
Nodes (23): AoVivo, AreaForm, calcularKmBairro(), FaixaForm, localizarLoja(), R, salvarAreas(), salvarFaixasKm() (+15 more)

### Community 34 - "Workflow do agente de impressão"
Cohesion: 0.09
Nodes (21): GH_TOKEN, runs-on, steps, jobs, exe, name, on, push (+13 more)

### Community 35 - "Montagem do cupom impresso"
Cohesion: 0.18
Nodes (18): blocosCombo(), colunasLR(), CupomDados, cupomTexto(), dataHora(), FRACAO, fracaoTexto(), LAYOUT_PADRAO (+10 more)

### Community 36 - "impressao.ts"
Cohesion: 0.20
Nodes (14): marcarImpressao(), RC, useImprimir(), colunasNavegador(), CSS_CUPOM, CupomFila, cupomHtml(), esc() (+6 more)

### Community 37 - "gestao/actions.ts"
Cohesion: 0.09
Nodes (51): EscopoCustos, excluirRegistro(), ligarFicha(), lojaGestor(), R, RegistroForm, salvarCustos(), salvarEmpresa() (+43 more)

### Community 38 - "preco.ts"
Cohesion: 0.14
Nodes (24): calcularCombo(), EscolhaPasso, PassoCombo, LinhaTotal, Totais, calcularItem(), ErroEscolha, grupoVisivel() (+16 more)

### Community 39 - "painel-caixa.tsx"
Cohesion: 0.09
Nodes (47): abrirCaixa(), fecharCaixa(), movimentar(), msg(), R, salvarCaixa(), vincularSemCaixa(), dynamic (+39 more)

### Community 40 - "Configuração TypeScript"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 41 - "Banco: cupons e descontos"
Cohesion: 0.13
Nodes (16): cupons_auditar, cupons_codigo_idx, pedidos_cupom_idx, private.agenda_vale(), private.aplicar_cupom(), private.cupom_da_loja(), private.desconto_categoria_pct(), private.desconto_cupom() (+8 more)

### Community 42 - "Banco: Mercado Pago"
Cohesion: 0.16
Nodes (13): mp_pagamentos_pedido_idx, public.desconectar_mp(), public.mp_contas, public.mp_pagamentos, public.mp_status(), public.salvar_mp(), public.mp_aceitar_ao_pagar(), public.mp_status() (+5 more)

### Community 43 - "Dependências do app do motoboy"
Cohesion: 0.14
Nodes (17): dependencies, @capacitor/android@6.2.0, @capacitor/app@6.0.2, @capacitor/cli@6.2.0, @capacitor-community/background-geolocation@1.2.26, @capacitor/core@6.2.0, description, name (+9 more)

### Community 44 - "public.fin_lancamentos"
Cohesion: 0.10
Nodes (26): fin_fornecedores_doc, fin_lanc_comp, fin_lanc_origem, fin_lanc_serie, fin_lanc_venc, fin_lancamentos_auditar, fin_lancamentos_loja, private.fin_mesma_loja() (+18 more)

### Community 45 - "Grupo 45: package.json"
Cohesion: 0.14
Nodes (17): description, devDependencies, esbuild@0.24.0, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, tsx, @types/node (+9 more)

### Community 46 - "Grupo 46: package.json"
Cohesion: 0.13
Nodes (17): description, devDependencies, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, exports, tsx, @types/node (+9 more)

### Community 47 - "[slug]/page.tsx"
Cohesion: 0.16
Nodes (17): dynamic, metadata, PaginaAcompanhar(), AcompanharPedido(), ExtrasPedido, hora(), PagarPix(), carregar() (+9 more)

### Community 48 - "public.opcoes"
Cohesion: 0.18
Nodes (28): public.complementos, public.grupos_opcoes, public.opcoes, public.produto_grupos, public.produto_marcas, private.preco_item(), private.produto_publico(), public.definir_grupos_do_produto() (+20 more)

### Community 49 - "cardapio-cliente.tsx"
Cohesion: 0.12
Nodes (22): MontadorCombo(), acrescimo(), cheio(), completo(), Extras, GruposMontagem(), minimo(), Montador() (+14 more)

### Community 50 - "20261027000026_rastreio_motoboys.sql"
Cohesion: 0.15
Nodes (13): motoboy_local_grupo_idx, motoboy_posicoes_em_idx, motoboy_posicoes_entregador_idx, pedidos_motoboy_sai_do_mapa, private.e_membro_do_grupo(), public.motoboy_posicoes, public.rastreio_ao_vivo(), public.registrar_destino() (+5 more)

### Community 51 - "public.setores"
Cohesion: 0.14
Nodes (28): private.setor_exige_marca(), public.produtos, public.setor_marcas, public.setores, setor_marcas_exige_marca, setores_exige_marca, areas_entrega_auditar, marca_horarios_auditar (+20 more)

### Community 52 - "index.ts"
Cohesion: 0.17
Nodes (22): exportarClientes(), listarClientes(), salvarCliente(), Clientes(), dynamic, baixarCsv(), FichaCliente(), ListaClientes() (+14 more)

### Community 53 - "cardapio/actions.ts"
Cohesion: 0.11
Nodes (45): GET(), POST(), criarLoja(), alterarDisponibilidade(), CategoriaOrigem, criarProduto(), definirFoto(), definirFotoOpcao() (+37 more)

### Community 54 - "beefood_para_res.py"
Cohesion: 0.33
Nodes (3): converter(), limpa(), L()

### Community 55 - "resumo/page.tsx"
Cohesion: 0.08
Nodes (30): salvarMeta(), Composicao, ComposicaoVendas(), dataBR(), dynamic, Kpi(), Metricas, PRESETS (+22 more)

### Community 56 - "sabores-pizza.tsx"
Cohesion: 0.26
Nodes (14): salvarInsumo(), amigavel(), Como(), diametro(), EditorSabor(), fmt(), Linha, num() (+6 more)

### Community 58 - "public.clientes"
Cohesion: 0.11
Nodes (20): clientes_auditar, clientes_grupo_nome_idx, pedidos_cliente_idx, pedidos_registra_cliente, private.grupo_da_loja(), private.pedido_registra_cliente(), public.buscar_clientes(), public.cliente_enderecos (+12 more)

### Community 59 - "promocao.test.ts"
Cohesion: 0.24
Nodes (11): D-021 Cardápio novo: cards com foto e promoção De/Por com agenda, AgendaPromo, diaAnterior(), diaDaSemana(), DIAS_CURTOS, partesLocais(), promoEncerrada(), promoVale() (+3 more)

### Community 60 - "formatarReais"
Cohesion: 0.21
Nodes (12): custos_auditar, custos_loja_idx, public.custos, custos_auditar, custos_auditar_apagar, public.gestao_conta, public.preparar_gestao_grupo(), public.config_custos_financeiro() (+4 more)

### Community 61 - "insumos.tsx"
Cohesion: 0.30
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
Cohesion: 0.28
Nodes (4): agruparEntregas (core), OSRM / Nominatim (OpenStreetMap services), otimizarRota (core), Shift window 05:00→05:00

### Community 73 - "equipe.tsx"
Cohesion: 0.12
Nodes (38): FuncionarioForm, alterarFuncao(), cancelarConvite(), convidar(), criarCardapio(), criarLoja(), criarUsuarioCaixa(), definirAtivo() (+30 more)

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

### Community 78 - "conta-cliente.tsx"
Cohesion: 0.09
Nodes (21): calcularEntregaKm(), conferirCupom(), enviarPedido(), CardapioCliente(), Checkout(), ETIQUETA, Extras(), gravar() (+13 more)

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

### Community 94 - "20261021000006_cardapio_digital.sql"
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

### Community 99 - "20261020000002_cardapio.sql"
Cohesion: 0.17
Nodes (13): complementos_loja_idx, grupos_opcoes_loja_idx, opcoes_grupo_idx, produto_grupos_grupo_idx, produtos_loja_setor_idx, public.criar_grupo_vinculado(), public.criar_produto(), public.salvar_setor() (+5 more)

### Community 101 - "escpos.ts"
Cohesion: 0.29
Nodes (9): codificar(), CP850, CP860, ESC_T, Pagina, semAcento(), ConfigImpressora, gerarEscPos() (+1 more)

### Community 102 - "entregas/page.tsx"
Cohesion: 0.18
Nodes (13): Cardapio(), dynamic, diaDoTurno(), dynamic, Entregas(), LojaBairros, diaCurto(), pct() (+5 more)

### Community 103 - "form-grupo.tsx"
Cohesion: 0.11
Nodes (27): DadosGrupo, salvarDetalheOpcao(), salvarGrupo(), DetalheOpcao(), FORMACOES, FormGrupo(), GrupoInicial, lerPreco() (+19 more)

### Community 104 - "20261023000020_entregas_km.sql"
Cohesion: 0.15
Nodes (11): pedidos_saiu_idx, private.area_do_pedido(), private.entrega_json(), public.ajustar_entrega(), public.fechamento_motoboys(), public.motoboy_despachar(), public.motoboy_painel(), public.registrar_distancia() (+3 more)

### Community 107 - "funcionarios.tsx"
Cohesion: 0.10
Nodes (21): espera(), LoteSugerido, sugerirLotes(), SugestaoLoja, SugestaoLotes(), D-028 · Cliente acompanha a entrega, prazo por loja, alerta e lotes na expedição, tempos e atrasos, Ponto, agruparEntregas() (+13 more)

### Community 117 - "programa.tsx"
Cohesion: 0.47
Nodes (5): carregar(), dynamic, generateMetadata(), Grupo, PaginaGrupo()

### Community 118 - "meta-mes.tsx"
Cohesion: 0.22
Nodes (14): PassoForm, salvarCombo(), EditorCombo(), lerCentavos(), Passo, reais(), AreaFoto(), FotoOpcao() (+6 more)

### Community 119 - "pedidos/actions.ts"
Cohesion: 0.26
Nodes (9): definirAceiteAutomatico(), definirMovimento(), definirProntoAuto(), marcarPago(), mensagem(), mudarStatus(), NovoPedido, pausarLoja() (+1 more)

### Community 120 - "lojas/page.tsx"
Cohesion: 0.28
Nodes (8): FaixaKm, carregar(), dynamic, generateMetadata(), PaginaCardapio(), FreteGratisPublico, AgendamentoPublico, CardapioPublico

### Community 121 - "99zzzzzzzzzzzzzzzzzzzzz_evento.sql"
Cohesion: 0.32
Nodes (5): ids, pg_temp.id(), pg_temp.v(), quando, saida

### Community 122 - "mercadopago.ts"
Cohesion: 0.21
Nodes (13): POST(), conferirPixMercadoPago(), pixMercadoPago(), PagarPixMp(), atualizarPagamento(), conferirPix(), marcarPago(), Ped (+5 more)

### Community 123 - "public.marcas"
Cohesion: 0.08
Nodes (36): public.lojas, public.marcas, public.replicar_horarios(), private.dentro_do_horario(), private.horarios_agendamento(), private.marca_aberta(), private.validar_agendamento(), public.horarios_agendamento() (+28 more)

### Community 125 - "99zzzzz_clientes.sql"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 126 - "99zzzzzzzzzzzzzzzzzzzz_equipe.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 127 - "middleware.ts"
Cohesion: 0.60
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 129 - "ao-vivo.tsx"
Cohesion: 0.15
Nodes (18): MotoboyAoVivo, rastreioAoVivo(), CORES, haQuanto(), iniciais(), MapaAoVivo(), segundos(), cap() (+10 more)

### Community 130 - "[slug]/actions.ts"
Cohesion: 0.26
Nodes (11): EntregaKm, PedidoCliente, programaFidelidade(), saldoFidelidade(), FidelidadeCliente(), lembrarPedidoFidelidade(), ler(), provaFidelidade() (+3 more)

### Community 131 - "movimentos.tsx"
Cohesion: 0.25
Nodes (10): buscarMovimentos(), FiltroMovimentos, hoje(), menos(), Movimentacoes(), quando(), ROTULO, TIPOS (+2 more)

### Community 132 - "99zzzzzzzzzzzzzzzzzzzzzzz_financeiro.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 133 - "public.lojas"
Cohesion: 0.25
Nodes (5): public.criar_lancamento(), public.dre_financeiro(), public.meta_vendas(), public.metas_vendas, public.salvar_meta_vendas()

### Community 134 - "public.contas"
Cohesion: 0.07
Nodes (34): contas_atualizado, contas_proteger_plano, contas_titulares_user_idx, lojas_conta_idx, lojas_limite, marcas_limite, pedidos_loja_criado_idx, private.e_titular() (+26 more)

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

### Community 139 - "QuadroPedidos"
Cohesion: 0.21
Nodes (9): dynamic, Pedidos(), bipar(), MovimentoLoja(), PausaLoja(), QuadroPedidos(), seloCliente(), carregarQuadro() (+1 more)

### Community 140 - "insumos.tsx"
Cohesion: 0.42
Nodes (10): Estoque(), Ajuste(), confirmarExclusao(), FormInsumo(), LinhaInsumo(), ListaInsumos(), num(), SIT (+2 more)

### Community 141 - "pg_temp.como"
Cohesion: 0.60
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 142 - "20261021000004_cardapio_edicao.sql"
Cohesion: 0.29
Nodes (4): public.criar_grupo_vinculado(), public.desvincular_grupo(), public.reordenar(), public.vincular_grupo()

### Community 143 - "conta-cliente.tsx"
Cohesion: 0.27
Nodes (9): situacaoPedidos(), Dados, guardarPedido(), lerPedidos(), MeusPedidos(), NavCliente(), PedidoGuardado, PerfilCliente() (+1 more)

### Community 144 - "public.produtos"
Cohesion: 0.67
Nodes (3): private.importacoes, private.importar_cardapio(), pg_temp.k()

### Community 145 - "20261101000067_cupom_area_frete.sql"
Cohesion: 0.29
Nodes (7): frete_gratis_auditar, frete_gratis_loja_idx, private.base_cupom(), private.regra_frete_gratis(), public.frete_gratis, public.frete_gratis_publico(), public.validar_cupom()

### Community 146 - "contagem.tsx"
Cohesion: 0.33
Nodes (8): salvarContagem(), Contagem(), NovoItem(), num(), Origem, ContagemPainel, UnidadeEstoque, UNIDADES_ESTOQUE

### Community 147 - "pixCopiaECola"
Cohesion: 0.39
Nodes (7): campo(), crc16Pix(), FORMATOS_RASTREAMENTO, normalizarChavePix(), pixCopiaECola(), semAcento(), TipoChavePix

### Community 148 - "public.relatorio_fidelidade"
Cohesion: 0.28
Nodes (6): public.resumo_vendas(), public.relatorio_entregas(), public.salvar_prazo_entrega(), public.relatorio_fidelidade(), public.fechamento_estoque(), private.periodo_api()

### Community 149 - "m/layout.tsx"
Cohesion: 0.50
Nodes (3): LayoutMotoboy(), metadata, viewport

## Knowledge Gaps
- **9 isolated node(s):** `pedidos.qr_token (/m/d/<código>)`, `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `GitHub Actions CI (rules, db, build)`, `Roadmap stages 3c-7 and integrations`, `supabase/migrations (Postgres RLS, audit, atomic ops)` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 712 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `pedido-flutuante.tsx`, `API aberta e MCP (rotas)`, `salvando`, `programa.tsx`, `web/package.json`, `conta-cliente.tsx`, `app-motoboy.tsx`, `m/layout.tsx`, `aplicativos.tsx`, `tempo-real.tsx`, `estoque/page.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `estoque/actions.ts`, `financeiro/page.tsx`, `evento.tsx`, `form-delivery.tsx`, `bairros.tsx`, `gestao/actions.ts`, `painel-caixa.tsx`, `[slug]/page.tsx`, `index.ts`, `cardapio/actions.ts`, `resumo/page.tsx`, `sabores-pizza.tsx`, `equipe.tsx`, `conta-cliente.tsx`, `entregas/page.tsx`, `programa.tsx`, `pedidos/actions.ts`, `lojas/page.tsx`, `mercadopago.ts`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **What connects `pedidos.qr_token (/m/d/<código>)`, `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `GitHub Actions CI (rules, db, build)` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `20261027000026_rastreio_motoboys.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.09243697478991597 - nodes in this community are weakly interconnected._
- **Why does `criarClienteServidor()` connect `cardapio/actions.ts` to `importar-nfe.tsx`, `ao-vivo.tsx`, `[slug]/actions.ts`, `movimentos.tsx`, `api.tsx`, `salvando`, `geo.ts`, `insumos.tsx`, `programa.tsx`, `conta-cliente.tsx`, `app-motoboy.tsx`, `QuadroPedidos`, `contagem.tsx`, `next`, `m/layout.tsx`, `aplicativos.tsx`, `tempo-real.tsx`, `salvando`, `estoque/page.tsx`, `quadro-pedidos.tsx`, `estoque/actions.ts`, `financeiro/page.tsx`, `Promoções e cupons (tela)`, `evento.tsx`, `form-delivery.tsx`, `bairros.tsx`, `impressao.ts`, `gestao/actions.ts`, `painel-caixa.tsx`, `[slug]/page.tsx`, `index.ts`, `resumo/page.tsx`, `sabores-pizza.tsx`, `equipe.tsx`, `conta-cliente.tsx`, `entregas/page.tsx`, `form-grupo.tsx`, `funcionarios.tsx`, `programa.tsx`, `meta-mes.tsx`, `pedidos/actions.ts`, `lojas/page.tsx`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Should `main.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13793103448275862 - nodes in this community are weakly interconnected._
- **Why does `formatarReais()` connect `resumo/page.tsx` to `importar-nfe.tsx`, `[slug]/actions.ts`, `movimentos.tsx`, `pedido-flutuante.tsx`, `insumos.tsx`, `programa.tsx`, `conta-cliente.tsx`, `app-motoboy.tsx`, `contagem.tsx`, `tempo-real.tsx`, `aplicativos.tsx`, `salvando`, `estoque/page.tsx`, `estoque/actions.ts`, `form-delivery.tsx`, `bairros.tsx`, `Montagem do cupom impresso`, `preco.ts`, `painel-caixa.tsx`, `[slug]/page.tsx`, `cardapio-cliente.tsx`, `index.ts`, `cardapio/actions.ts`, `resumo/page.tsx`, `sabores-pizza.tsx`, `form-grupo.tsx`, `meta-mes.tsx`, `mercadopago.ts`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Should `20261021000014_caixa.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.05454545454545454 - nodes in this community are weakly interconnected._