# Graph Report - res  (2026-11-05)

## Corpus Check
- 366 files · ~324,432 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 3042 nodes · 7701 edges · 157 communities (137 shown, 20 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 59 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1428a197`
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
- public.fidelidade_movimentos
- Banco: estoque
- API aberta e MCP (rotas)
- salvando
- relatorios/page.tsx
- geo.ts
- fidelidade/actions.ts
- web/package.json
- CI (testes automáticos)
- app-motoboy.tsx
- ref_node_test
- public.pedidos
- Decisões de arquitetura — RES
- criarClienteServidor
- novo-pedido.tsx
- aplicativos.tsx
- salvando
- gestao/actions.ts
- Promoções e cupons (tela)
- quadro-pedidos.tsx
- steps
- financeiro/page.tsx
- Workflow do APK do motoboy
- evento.tsx
- form-delivery.tsx
- acompanhar-pedido.tsx
- next
- Workflow do agente de impressão
- Montagem do cupom impresso
- estoque/actions.ts
- sabores-pizza.tsx
- preco.ts
- painel-caixa.tsx
- Configuração TypeScript
- Banco: cupons e descontos
- Banco: Mercado Pago
- Dependências do app do motoboy
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
- promocao.test.ts
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
- 20261028000056_evento.sql
- Grupo 79: 99zzzzzzzzz_segmentos.sql
- Grupo 80: 90_agente.sql
- Grupo 81: 95_impressora_grupo.sql
- Grupo 82: 99zzzzzz_rastreio.sql
- gestao/actions.ts
- Grupo 84: 99zzzzzzzz_entregas_cliente.sql
- Grupo 85: 99zzzzzzzzzzzzz_aplicativos.sql
- Grupo 86: README.md
- Grupo 87: decisoes.md
- 99zzzzzzzzzzzzzzzz_vitrine.sql
- Grupo 89: 30_cardapio_digital.sql
- Grupo 90: 60_agendamento.sql
- Grupo 91: 99zzz_combos.sql
- Grupo 93: 99zzzzzzzzzzzzzzz_mercadopago.sql
- lancamentos.tsx
- 99zzzzzzzzzzzzzzzzzzz_gestao.sql
- Grupo 96: 70_caixa.sql
- 99zzzzzzzzzzzzzzzzz_taxa_km.sql
- editor-combo.tsx
- promocao.test.ts
- Grupo 100: tempos_ajuste.sql
- resultados.tsx
- mapa-cliente.tsx
- gestao.ts
- 20261027000032_fidelidade.sql
- Grupo 105: next.config.mjs
- Grupo 106: vercel.json
- funcionarios.tsx
- Grupo 108: test-db.sh
- programa.tsx
- bug.yml
- salvando
- evento/actions.ts
- criarClienteServidor
- 99zzzzzzzzzzzzzzzzzzzzz_evento.sql
- mercadopago.ts
- impressao.ts
- formatarReais
- 99zzzzzzzzzzzzzzzzzzzz_equipe.sql
- middleware.ts
- teste.yml
- Método de trabalho do RES (duas pessoas + o Claude de cada uma)
- insumos.tsx
- 99zzzzzzzzzzzzzzzzzzzzzzz_financeiro.sql
- painel/scripts/ajustar-android.mjs
- 20261021000008_multilojas.sql
- 99zzzzzzzzzzzzzzzzzzzzzz_quadro.sql
- 20261021000007_cardapio_biblioteca.sql
- 99_motoboy.sql
- O que o RES faz (novembro/2026)
- 99zzzzzzz_rota.sql
- next
- pg_temp.como
- qualidade/README.md
- movimentos.tsx
- contagem.tsx
- 20261101000067_cupom_area_frete.sql
- comercial/README.md
- desenvolvimento/README.md
- public.fidelidade_config
- pg_temp.como
- Comece aqui (primeiro dia)
- pull_request_template.md
- 20261028000043_pix_segura.sql
- Roteiro (o que vem, em ordem)
- 20261027000031_telefone_nono_digito.sql
- [token]/page.tsx
- github-etiquetas.sh

## God Nodes (most connected - your core abstractions)
1. `criarClienteServidor()` - 228 edges
2. `public.lojas` - 160 edges
3. `public.pedidos` - 130 edges
4. `public.marcas` - 125 edges
5. `contextoLoja` - 120 edges
6. `salvando()` - 119 edges
7. `formatarReais()` - 111 edges
8. `next` - 82 edges
9. `react` - 80 edges
10. `public.produtos` - 78 edges

## Surprising Connections (you probably didn't know these)
- `Método de trabalho (duas pessoas, 05/11/2026)` --references--> `main()`  [INFERRED]
  CLAUDE.md → packages/agente/src/main.ts
- `1. Princípios` --references--> `main()`  [INFERRED]
  docs/desenvolvimento/METODO.md → packages/agente/src/main.ts
- `5. Para os dois não se atropelarem` --references--> `main()`  [INFERRED]
  docs/desenvolvimento/METODO.md → packages/agente/src/main.ts
- `7. Publicação e versões` --references--> `main()`  [INFERRED]
  docs/desenvolvimento/METODO.md → packages/agente/src/main.ts
- `9. Trabalhando com o Claude` --references--> `main()`  [INFERRED]
  docs/desenvolvimento/METODO.md → packages/agente/src/main.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Rules duplicated in core and DB with shared test cases** — docs_decisoes_d_021_cardapio_cards_promo, docs_decisoes_d_022_combos_upsell, docs_decisoes_d_029_segmentos_clientes, docs_decisoes_d_030_telefone_nono_digito, docs_decisoes_d_031_fidelidade_grupo, docs_decisoes_core_db_parity [EXTRACTED 1.00]
- **Motoboy delivery flow (QR dispatch, app, tracking, routing)** — docs_decisoes_d_017_app_motoboy_qr, docs_decisoes_d_018_comanda_motoboy_pago, docs_decisoes_d_019_app_android_leitor_qr, docs_decisoes_d_026_rastreio_motoboys, docs_decisoes_d_027_rota_sugerida, apps_mobile_motoboy_readme_res_motoboy_android [INFERRED 0.85]
- **Stock management module (NF-e, recipes, counts, CMV)** — docs_decisoes_d_036_estoque_nfe_ficha, docs_decisoes_d_037_movimentacoes_estoque, docs_decisoes_d_038_meu_estoque_contagem, docs_decisoes_d_039_fechamento_cmv, docs_decisoes_d_040_ficha_sabor_pizza [INFERRED 0.85]

## Communities (157 total, 20 thin omitted)

### Community 0 - "estoque/page.tsx"
Cohesion: 0.19
Nodes (17): dynamic, dataCurta(), Fechamento(), pctTexto(), somaMes(), Filtro, FechamentoEstoque, MeuEstoque (+9 more)

### Community 1 - "20261020000001_base.sql"
Cohesion: 0.08
Nodes (28): grupos_acesso_atualizado, grupos_acesso_auditar, grupos_acesso_validar, lojas_atualizado, lojas_auditar, marcas_atualizado, marcas_auditar, marcas_loja_idx (+20 more)

### Community 2 - "gestao/page.tsx"
Cohesion: 0.14
Nodes (22): EscopoCustos, salvarModoGrupo(), Aba, ABAS, dynamic, Gestao(), brl(), ler() (+14 more)

### Community 3 - "main.ts"
Cohesion: 0.14
Nodes (28): acharWindows(), alcance(), argumento(), ARQ_CONFIG, ARQ_LOG, atualizarSePrecisar(), atualizarWindows(), Config (+20 more)

### Community 4 - "nav-painel.tsx"
Cohesion: 0.14
Nodes (20): PainelLayout(), trocarLoja(), dadosNovoPedido(), BARRA, COR_SECAO, Icone(), Link_, LINKS (+12 more)

### Community 5 - "20261021000014_caixa.sql"
Cohesion: 0.05
Nodes (50): caixa_movimentos_sessao_idx, caixa_sessoes_auditar, caixa_sessoes_loja_idx, caixa_sessoes_uma_aberta_idx, caixas_auditar, caixas_nome_idx, lojas_caixa_inicial, pedidos_caixa_idx (+42 more)

### Community 6 - "Banco: impressão"
Cohesion: 0.06
Nodes (47): impressao_config_auditar, impressao_destinos_loja_idx, impressoes_loja_idx, impressoes_pedido_idx, impressoes_pendentes_idx, impressoras_auditar, impressoras_nome_idx, pedidos_imprimir_ao_aceitar (+39 more)

### Community 7 - "public.fidelidade_movimentos"
Cohesion: 0.13
Nodes (14): fidelidade_mov_cliente_idx, fidelidade_mov_grupo_idx, fidelidade_mov_pedido_idx, private.expirar_fidelidade(), public.fidelidade_movimentos, fidelidade_mov_cliente_loja_idx, fidelidade_mov_loja_idx, private.expirar_fidelidade() (+6 more)

### Community 8 - "Banco: estoque"
Cohesion: 0.07
Nodes (43): private.cupom_da_loja(), estoque_mov_estoque_idx, estoque_mov_insumo_idx, estoque_mov_pedido_idx, fichas_opcao_idx, fichas_produto_idx, insumos_estoque_idx, pedidos_estoque (+35 more)

### Community 9 - "API aberta e MCP (rotas)"
Cohesion: 0.08
Nodes (33): DELETE, POST(), DELETE, POST(), GET(), OPTIONS, GET(), OPTIONS (+25 more)

### Community 10 - "salvando"
Cohesion: 0.08
Nodes (45): ConfigImpressao, DadosImpressora, excluirImpressora(), imprimirTeste(), marcarImpressao(), msg(), R, RC (+37 more)

### Community 11 - "relatorios/page.tsx"
Cohesion: 0.07
Nodes (29): Aba, ABAS, Cancelado, Cor, CORES_BARRA, corTempo(), dataBR(), dynamic (+21 more)

### Community 12 - "geo.ts"
Cohesion: 0.22
Nodes (18): chegadas(), espera(), medirEntrega(), montar(), planejarRota(), Achado, distanciaRota(), EnderecoEntrega (+10 more)

### Community 13 - "fidelidade/actions.ts"
Cohesion: 0.11
Nodes (35): ajustarSaldo(), buscarSaldos(), copiarPrograma(), excluirRecompensa(), extratoCliente(), R, salvarConfigFidelidade(), salvarRecompensa() (+27 more)

### Community 14 - "web/package.json"
Cohesion: 0.07
Nodes (32): config, PUBLICAS, dependencies, next@^15.5.9, react@^19.2.1, react-dom@^19.2.1, @res/core@*, @supabase/ssr@0.5.2 (+24 more)

### Community 15 - "CI (testes automáticos)"
Cohesion: 0.07
Nodes (34): name, runs-on, services, steps, DATABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, POSTGRES_PASSWORD (+26 more)

### Community 16 - "app-motoboy.tsx"
Cohesion: 0.15
Nodes (27): despachar(), entregar(), PlanoRota, Acerto(), AppMotoboy(), Aviso, CartaoEntrega(), Leitor() (+19 more)

### Community 17 - "ref_node_test"
Cohesion: 0.16
Nodes (12): distanciaReta(), EntregaFechamento, fecharMotoboys(), fraseAcerto(), lerCoordenadas(), Ponto, minutosEstimados(), OpcoesRota (+4 more)

### Community 18 - "public.pedidos"
Cohesion: 0.07
Nodes (60): public.lojas, public.marcas, public.criar_pedido(), public.pedido_item_opcoes, public.pedido_itens, private.marca_aberta(), public.acompanhar_pedido(), private.limite_lojas() (+52 more)

### Community 19 - "Decisões de arquitetura — RES"
Cohesion: 0.06
Nodes (35): D-002 Modelo multiloja: Loja → Marcas, D-003 Regras de cadastro valem no banco e no formulário, D-004 Auditoria calculada no servidor, D-005 Operações compostas são atômicas, D-006 Gravar só em ação explícita, D-007 Texto em UTF-8 completo, D-008 Nenhum segredo de integração no navegador, D-009 Preço de itens com grupos (decisão provisória, Q-009) (+27 more)

### Community 20 - "criarClienteServidor"
Cohesion: 0.15
Nodes (22): convidar(), criarCardapio(), criarLoja(), definirCidade(), msg(), R, salvarPermissoesEquipe(), ABAS (+14 more)

### Community 21 - "novo-pedido.tsx"
Cohesion: 0.18
Nodes (25): buscarClientes(), autorizarDesconto(), dynamic, PaginaNovoPedido(), GruposBalcao(), ItemCarrinho, lerCentavos(), Montador() (+17 more)

### Community 22 - "aplicativos.tsx"
Cohesion: 0.08
Nodes (51): conectarMercadoPago(), criarChaveApi(), desconectarMercadoPago(), excluirWebhook(), mpAceitarAoPagar(), R, removerIntegracao(), revogarChaveApi() (+43 more)

### Community 23 - "salvando"
Cohesion: 0.29
Nodes (10): ajustarEntrega(), CartaoMotoboy(), FechamentoMotoboys(), FONTE, hora(), LinhaEntrega(), Numero(), Total (+2 more)

### Community 25 - "Promoções e cupons (tela)"
Cohesion: 0.10
Nodes (45): agenda(), alternarCupom(), alternarFreteGratis(), CupomForm, excluirCupom(), excluirFreteGratis(), excluirPromoCategoria(), fim() (+37 more)

### Community 26 - "quadro-pedidos.tsx"
Cohesion: 0.07
Nodes (21): imprimirPedido(), abrirWhatsApp(), AvisarTodos(), bipar(), CartaoPedido(), COLUNAS, ETAPAS_AVISO, Filtros (+13 more)

### Community 27 - "steps"
Cohesion: 0.08
Nodes (24): runs-on, steps, GH_TOKEN, KS_B64, KS_PASS, jobs, apk, name (+16 more)

### Community 28 - "financeiro/page.tsx"
Cohesion: 0.07
Nodes (75): configCustos(), criarLancamento(), donoFin(), editarLancamento(), excluirLancamento(), gerarContasCustos(), lancarNfe(), marcarPago() (+67 more)

### Community 29 - "Workflow do APK do motoboy"
Cohesion: 0.08
Nodes (24): runs-on, steps, GH_TOKEN, KS_B64, KS_PASS, jobs, apk, name (+16 more)

### Community 30 - "evento.tsx"
Cohesion: 0.12
Nodes (34): AjusteProduto, copiarParaEvento(), criarEvento(), msg(), R, refrescar(), removerProdutoEvento(), salvarEvento() (+26 more)

### Community 31 - "form-delivery.tsx"
Cohesion: 0.26
Nodes (12): PedidoCliente, ConfigDelivery, definirStatus(), replicarHorarios(), salvarConfig(), Vitrine, centavos(), DIAS (+4 more)

### Community 32 - "acompanhar-pedido.tsx"
Cohesion: 0.20
Nodes (13): dynamic, metadata, PaginaAcompanhar(), ExtrasPedido, carregar(), enviar(), Janela, Rastreamento() (+5 more)

### Community 33 - "next"
Cohesion: 0.07
Nodes (46): GET(), POST(), LayoutMotoboy(), metadata, viewport, dynamic, AoVivo, AreaForm (+38 more)

### Community 34 - "Workflow do agente de impressão"
Cohesion: 0.09
Nodes (21): GH_TOKEN, runs-on, steps, jobs, exe, name, on, push (+13 more)

### Community 35 - "Montagem do cupom impresso"
Cohesion: 0.21
Nodes (16): blocosCombo(), colunasLR(), CupomDados, cupomTexto(), dataHora(), FRACAO, fracaoTexto(), LAYOUT_PADRAO (+8 more)

### Community 36 - "estoque/actions.ts"
Cohesion: 0.20
Nodes (16): ajustarEstoque(), copiarFicha(), definirModoEstoque(), excluirInsumo(), feito(), R, salvarFatoresSabor(), salvarFicha() (+8 more)

### Community 37 - "sabores-pizza.tsx"
Cohesion: 0.26
Nodes (14): salvarInsumo(), amigavel(), Como(), diametro(), EditorSabor(), fmt(), Linha, num() (+6 more)

### Community 38 - "preco.ts"
Cohesion: 0.11
Nodes (28): calcularCombo(), EscolhaPasso, PassoCombo, Papel, Recurso, RECURSOS, temPermissao(), calcularItem() (+20 more)

### Community 39 - "painel-caixa.tsx"
Cohesion: 0.09
Nodes (45): abrirCaixa(), fecharCaixa(), movimentar(), msg(), R, salvarCaixa(), vincularSemCaixa(), dynamic (+37 more)

### Community 40 - "Configuração TypeScript"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 41 - "Banco: cupons e descontos"
Cohesion: 0.15
Nodes (14): cupons_auditar, cupons_codigo_idx, pedidos_cupom_idx, private.agenda_vale(), private.aplicar_cupom(), private.desconto_categoria_pct(), private.desconto_cupom(), promocoes_categoria_auditar (+6 more)

### Community 42 - "Banco: Mercado Pago"
Cohesion: 0.26
Nodes (9): mp_pagamentos_pedido_idx, public.desconectar_mp(), public.mp_contas, public.mp_pagamentos, public.mp_status(), public.salvar_mp(), public.mp_aceitar_ao_pagar(), public.mp_status() (+1 more)

### Community 43 - "Dependências do app do motoboy"
Cohesion: 0.09
Nodes (28): dependencies, @capacitor/android@6.2.0, @capacitor/app@6.0.2, @capacitor/cli@6.2.0, @capacitor-community/background-geolocation@1.2.26, @capacitor/core@6.2.0, description, name (+20 more)

### Community 44 - "public.fin_lancamentos"
Cohesion: 0.06
Nodes (46): custos_auditar, custos_loja_idx, funcionario_registros_idx, funcionario_registros_numero, funcionarios_loja_idx, gestao_empresa_auditar, private.contadores_registro, private.numerar_registro() (+38 more)

### Community 45 - "Grupo 45: package.json"
Cohesion: 0.14
Nodes (17): description, devDependencies, esbuild@0.24.0, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, tsx, @types/node (+9 more)

### Community 46 - "Grupo 46: package.json"
Cohesion: 0.13
Nodes (17): description, devDependencies, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, exports, tsx, @types/node (+9 more)

### Community 47 - "motoboy/scripts/ajustar-android.mjs"
Cohesion: 0.17
Nodes (11): adapt, app, g, gradle, m, man, permissoes, res (+3 more)

### Community 48 - "public.setores"
Cohesion: 0.16
Nodes (22): private.setor_exige_marca(), public.setor_marcas, public.setores, setor_marcas_exige_marca, setores_exige_marca, areas_entrega_auditar, marca_horarios_auditar, public.areas_entrega (+14 more)

### Community 49 - "escpos.ts"
Cohesion: 0.26
Nodes (10): codificar(), CP850, CP860, ESC_T, Pagina, semAcento(), ConfigImpressora, gerarEscPos() (+2 more)

### Community 50 - "20261027000026_rastreio_motoboys.sql"
Cohesion: 0.04
Nodes (53): pedido_eventos_pedido_idx, pedido_item_opcoes_item_idx, pedido_itens_pedido_idx, pedidos_atualizado, pedidos_loja_status_idx, private.contador_pedidos, public.pedido_eventos, public.pedidos (+45 more)

### Community 51 - "public.produtos"
Cohesion: 0.06
Nodes (59): complementos_loja_idx, grupos_opcoes_loja_idx, opcoes_grupo_idx, produto_grupos_grupo_idx, produtos_loja_setor_idx, public.complementos, public.criar_grupo_vinculado(), public.criar_produto() (+51 more)

### Community 52 - "index.ts"
Cohesion: 0.16
Nodes (23): exportarClientes(), listarClientes(), salvarCliente(), Clientes(), dynamic, baixarCsv(), FichaCliente(), ListaClientes() (+15 more)

### Community 53 - "src/caixa.ts"
Cohesion: 0.52
Nodes (4): cadastrar(), credenciais(), entrar(), emailDeLogin()

### Community 54 - "beefood_para_res.py"
Cohesion: 0.33
Nodes (3): converter(), limpa(), L()

### Community 55 - "resumo/page.tsx"
Cohesion: 0.08
Nodes (45): salvarMeta(), Composicao, ComposicaoVendas(), dataBR(), dynamic, Kpi(), Metricas, PRESETS (+37 more)

### Community 56 - "cardapio-cliente.tsx"
Cohesion: 0.08
Nodes (50): calcularEntregaKm(), conferirCupom(), EntregaKm, enviarPedido(), FaixaKm, programaFidelidade(), saldoFidelidade(), situacaoPedidos() (+42 more)

### Community 57 - "graphify"
Cohesion: 0.50
Nodes (3): graphify, Método de trabalho (duas pessoas, 05/11/2026), RES: como usamos o graphify (pedido do dono, 28/10/2026)

### Community 58 - "public.clientes"
Cohesion: 0.15
Nodes (18): clientes_auditar, clientes_grupo_nome_idx, pedidos_cliente_idx, pedidos_registra_cliente, private.grupo_da_loja(), private.pedido_registra_cliente(), public.buscar_clientes(), public.cliente_enderecos (+10 more)

### Community 59 - "promocao.test.ts"
Cohesion: 0.24
Nodes (11): D-021 Cardápio novo: cards com foto e promoção De/Por com agenda, AgendaPromo, diaAnterior(), diaDaSemana(), DIAS_CURTOS, partesLocais(), promoEncerrada(), promoVale() (+3 more)

### Community 60 - "saida.ts"
Cohesion: 0.22
Nodes (8): caminhoScript(), hostPorta(), imprimirRede(), imprimirWindows(), listarImpressorasWindows(), powershell(), PS_RAW, testarRede()

### Community 61 - "[slug]/actions.ts"
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
Cohesion: 0.15
Nodes (29): alterarFuncao(), cancelarConvite(), criarUsuarioCaixa(), definirAtivo(), trocarSenhaUsuario(), Assistente(), Cartao, CartaoAcesso() (+21 more)

### Community 74 - "painel/package.json"
Cohesion: 0.15
Nodes (25): importarNFe(), ItemImportar, vinculosFornecedor(), cnpjTexto(), dataTexto(), ImportarNFe(), lerFator(), Linha (+17 more)

### Community 75 - "Grupo 75: 99z_entregas_km.sql"
Cohesion: 0.39
Nodes (7): ids, pg_temp.como(), pg_temp.id(), pg_temp.token(), pg_temp.v(), saida, tokens

### Community 76 - "Grupo 76: 99zzzzzzzzzzzz_estoque.sql"
Cohesion: 0.33
Nodes (7): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), s1, s2, saida

### Community 77 - "Grupo 77: 99zzzzzzzzzzzzzz_api.sql"
Cohesion: 0.39
Nodes (7): chaves, ids, pg_temp.como(), pg_temp.id(), pg_temp.k(), pg_temp.v(), saida

### Community 78 - "20261028000056_evento.sql"
Cohesion: 0.25
Nodes (7): pedidos_a_evento_periodo, private.limite_cardapios(), private.pedido_no_periodo_do_evento(), private.produto_de_evento(), public.criar_evento(), public.evento_publico(), public.salvar_evento()

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

### Community 83 - "gestao/actions.ts"
Cohesion: 0.22
Nodes (16): excluirRegistro(), FuncionarioForm, ligarFicha(), lojaGestor(), R, RegistroForm, salvarCustos(), salvarFuncionario() (+8 more)

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
Cohesion: 0.15
Nodes (22): MontadorCombo(), acrescimo(), cheio(), completo(), Extras, GruposMontagem(), minimo(), Montador() (+14 more)

### Community 101 - "resultados.tsx"
Cohesion: 0.13
Nodes (23): saldoDoCliente(), FidelidadeBalcao(), DIAS, FAIXA, MEC, ORIGEM, pct(), PERFIL (+15 more)

### Community 102 - "mapa-cliente.tsx"
Cohesion: 0.53
Nodes (4): MapaCliente(), Ponto, carregarLeaflet(), L

### Community 103 - "gestao.ts"
Cohesion: 0.29
Nodes (14): salvarEmpresa(), dias(), Documento(), dynamic, DadosEmpresa(), BotaoImprimir(), cnpjValido(), dataBr() (+6 more)

### Community 104 - "20261027000032_fidelidade.sql"
Cohesion: 0.15
Nodes (11): fidelidade_recompensas_grupo_idx, pedidos_fidelidade, private.fidelidade_status(), private.recompensas_json(), private.ultimo_pedido_cliente(), public.excluir_recompensa(), public.fidelidade_recompensas, public.salvar_recompensa() (+3 more)

### Community 107 - "funcionarios.tsx"
Cohesion: 0.16
Nodes (14): espera(), LoteSugerido, sugerirLotes(), SugestaoLoja, SugestaoLotes(), D-028 · Cliente acompanha a entrega, prazo por loja, alerta e lotes na expedição, tempos e atrasos, agruparEntregas(), Lote (+6 more)

### Community 116 - "programa.tsx"
Cohesion: 0.50
Nodes (4): painelMotoboy(), dynamic, maxDuration, Motoboy()

### Community 117 - "bug.yml"
Cohesion: 0.14
Nodes (13): label, options, placeholder, body, attributes, id, type, validations (+5 more)

### Community 118 - "salvando"
Cohesion: 0.05
Nodes (96): alterarDisponibilidade(), CategoriaOrigem, criarProduto(), DadosGrupo, definirFoto(), definirFotoOpcao(), definirGruposDoProduto(), definirProdutosDoGrupo() (+88 more)

### Community 119 - "evento/actions.ts"
Cohesion: 0.23
Nodes (13): acaoAvancar(), ErroPedido, LinhaTotal, proximosStatus(), STATUS_ROTULO, tempoDecorrido(), TIPO_ROTULO, Totais (+5 more)

### Community 120 - "criarClienteServidor"
Cohesion: 0.12
Nodes (33): criarLoja(), PaginaAplicativos(), Caixa(), Cardapio(), dynamic, Delivery(), buscarMovimentos(), cuponsPendentes() (+25 more)

### Community 121 - "99zzzzzzzzzzzzzzzzzzzzz_evento.sql"
Cohesion: 0.32
Nodes (5): ids, pg_temp.id(), pg_temp.v(), quando, saida

### Community 122 - "mercadopago.ts"
Cohesion: 0.26
Nodes (10): POST(), atualizarPagamento(), conferirPix(), marcarPago(), Ped, pedidoECConta(), pixDoPedido(), usaPixMp() (+2 more)

### Community 123 - "impressao.ts"
Cohesion: 0.31
Nodes (9): colunasNavegador(), CSS_CUPOM, cupomHtml(), esc(), imprimirNoNavegador(), linhasDoCupom(), qrsDosCupons(), CupomTeste (+1 more)

### Community 125 - "formatarReais"
Cohesion: 0.32
Nodes (10): conferirPixMercadoPago(), pixMercadoPago(), AcompanharPedido(), hora(), PagarPixMp(), PagarPix(), PixMp, qrcode@^1.5.4 (+2 more)

### Community 126 - "99zzzzzzzzzzzzzzzzzzzz_equipe.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 127 - "middleware.ts"
Cohesion: 0.60
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 129 - "teste.yml"
Cohesion: 0.15
Nodes (12): label, placeholder, body, attributes, id, type, validations, description (+4 more)

### Community 130 - "Método de trabalho do RES (duas pessoas + o Claude de cada uma)"
Cohesion: 0.17
Nodes (12): 10. Etiquetas (labels) das Issues, 1. Princípios, 2. A semana (ciclo de 1 semana), 3. Fluxo de uma tarefa, 4. Quem pode o quê, 5. Para os dois não se atropelarem, 6. Banco: migrações sem acidente, 7. Publicação e versões (+4 more)

### Community 131 - "insumos.tsx"
Cohesion: 0.42
Nodes (10): Estoque(), Ajuste(), confirmarExclusao(), FormInsumo(), LinhaInsumo(), ListaInsumos(), num(), SIT (+2 more)

### Community 132 - "99zzzzzzzzzzzzzzzzzzzzzzz_financeiro.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 133 - "painel/scripts/ajustar-android.mjs"
Cohesion: 0.20
Nodes (8): adapt, app, g, gradle, m, man, res, run

### Community 134 - "20261021000008_multilojas.sql"
Cohesion: 0.08
Nodes (33): contas_atualizado, contas_proteger_plano, contas_titulares_user_idx, lojas_conta_idx, lojas_limite, marcas_limite, pedidos_loja_criado_idx, private.e_titular() (+25 more)

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
Cohesion: 0.20
Nodes (10): Caixa, impressão, equipe, Cardápio digital próprio (sem comissão), Cardápio e promoções, Clientes e fidelidade, Entregas, Estoque e CMV, Gestão, No celular (+2 more)

### Community 139 - "99zzzzzzz_rota.sql"
Cohesion: 0.43
Nodes (6): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida, tok

### Community 140 - "next"
Cohesion: 0.47
Nodes (5): carregar(), dynamic, generateMetadata(), Grupo, PaginaGrupo()

### Community 141 - "pg_temp.como"
Cohesion: 0.60
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 142 - "qualidade/README.md"
Cohesion: 0.20
Nodes (7): Bug, Como registrar uma rodada de testes, Qualidade / testes, Roteiros, Três níveis, Roteiro: Estoque e CMV, Roteiro: <módulo>

### Community 143 - "movimentos.tsx"
Cohesion: 0.31
Nodes (8): FiltroMovimentos, hoje(), menos(), Movimentacoes(), quando(), ROTULO, TIPOS, MovimentosFiltrados

### Community 144 - "contagem.tsx"
Cohesion: 0.33
Nodes (8): salvarContagem(), Contagem(), NovoItem(), num(), Origem, ContagemPainel, UnidadeEstoque, UNIDADES_ESTOQUE

### Community 145 - "20261101000067_cupom_area_frete.sql"
Cohesion: 0.08
Nodes (26): public.reordenar(), public.mudar_status_pedido(), public.resumo_vendas(), public.compartilhar_catalogo(), public.relatorio_entregas(), public.salvar_prazo_entrega(), private.aplicar_cupom(), public.relatorio_fidelidade() (+18 more)

### Community 146 - "comercial/README.md"
Cohesion: 0.22
Nodes (5): Novidades, Semana 44 (26/10–01/11/2026), Semana 45 (02–06/11/2026), Comercial, Documentação do RES

### Community 147 - "desenvolvimento/README.md"
Cohesion: 0.39
Nodes (3): Compartilhado (os dois aprovam), Módulos e donos, Desenvolvimento

### Community 148 - "public.fidelidade_config"
Cohesion: 0.25
Nodes (8): private.saldo_fidelidade(), public.ajustar_fidelidade(), public.fidelidade_config, public.fidelidade_publica(), public.salvar_config_fidelidade(), private.saldo_fidelidade(), public.ajustar_fidelidade(), public.salvar_config_fidelidade()

### Community 149 - "pg_temp.como"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 150 - "Comece aqui (primeiro dia)"
Cohesion: 0.33
Nodes (6): 1. Acessos (o Emmanuel libera), 2. Instalar e rodar, 3. Abrir no Claude, 4. Ler, nesta ordem (≈ 40 min), 5. Primeira tarefa, Comece aqui (primeiro dia)

### Community 151 - "pull_request_template.md"
Cohesion: 0.33
Nodes (5): Checklist (docs/desenvolvimento/METODO.md §3), Como testar (critério de aceite), Migração, Módulo e revisão, O que muda

### Community 152 - "20261028000043_pix_segura.sql"
Cohesion: 0.47
Nodes (4): pedidos_b_segura_pix, pedidos_pago_libera, private.pago_libera(), private.segura_pix_mp()

### Community 153 - "Roteiro (o que vem, em ordem)"
Cohesion: 0.40
Nodes (5): Agora (delivery e gestão — Emmanuel), Depois, Fora (decidido não fazer agora), Próximo (salão — Dev 2), Roteiro (o que vem, em ordem)

### Community 155 - "[token]/page.tsx"
Cohesion: 0.50
Nodes (3): dynamic, metadata, PaginaDespacho()

## Knowledge Gaps
- **9 isolated node(s):** `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `pedidos.qr_token (/m/d/<código>)`, `GitHub Actions CI (rules, db, build)`, `Roadmap stages 3c-7 and integrations`, `supabase/migrations (Postgres RLS, audit, atomic ops)` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 783 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `estoque/page.tsx`, `gestao/page.tsx`, `nav-painel.tsx`, `API aberta e MCP (rotas)`, `salvando`, `relatorios/page.tsx`, `next`, `fidelidade/actions.ts`, `web/package.json`, `app-motoboy.tsx`, `criarClienteServidor`, `novo-pedido.tsx`, `aplicativos.tsx`, `gestao/actions.ts`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `financeiro/page.tsx`, `evento.tsx`, `form-delivery.tsx`, `acompanhar-pedido.tsx`, `estoque/actions.ts`, `sabores-pizza.tsx`, `painel-caixa.tsx`, `index.ts`, `src/caixa.ts`, `resumo/page.tsx`, `cardapio-cliente.tsx`, `equipe.tsx`, `gestao/actions.ts`, `resultados.tsx`, `gestao.ts`, `salvando`, `criarClienteServidor`, `mercadopago.ts`, `formatarReais`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **What connects `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `pedidos.qr_token (/m/d/<código>)`, `GitHub Actions CI (rules, db, build)` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `20261020000001_base.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.08408408408408409 - nodes in this community are weakly interconnected._
- **Why does `criarClienteServidor()` connect `criarClienteServidor` to `estoque/page.tsx`, `gestao/page.tsx`, `insumos.tsx`, `salvando`, `relatorios/page.tsx`, `next`, `geo.ts`, `fidelidade/actions.ts`, `app-motoboy.tsx`, `contagem.tsx`, `criarClienteServidor`, `novo-pedido.tsx`, `aplicativos.tsx`, `salvando`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `financeiro/page.tsx`, `evento.tsx`, `form-delivery.tsx`, `acompanhar-pedido.tsx`, `next`, `estoque/actions.ts`, `sabores-pizza.tsx`, `painel-caixa.tsx`, `index.ts`, `src/caixa.ts`, `resumo/page.tsx`, `cardapio-cliente.tsx`, `equipe.tsx`, `painel/package.json`, `gestao/actions.ts`, `resultados.tsx`, `gestao.ts`, `funcionarios.tsx`, `programa.tsx`, `salvando`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `gestao/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
- **Why does `react` connect `salvando` to `estoque/page.tsx`, `gestao/page.tsx`, `insumos.tsx`, `nav-painel.tsx`, `salvando`, `relatorios/page.tsx`, `fidelidade/actions.ts`, `web/package.json`, `movimentos.tsx`, `contagem.tsx`, `app-motoboy.tsx`, `criarClienteServidor`, `novo-pedido.tsx`, `aplicativos.tsx`, `salvando`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `financeiro/page.tsx`, `evento.tsx`, `form-delivery.tsx`, `acompanhar-pedido.tsx`, `next`, `estoque/actions.ts`, `sabores-pizza.tsx`, `painel-caixa.tsx`, `index.ts`, `resumo/page.tsx`, `cardapio-cliente.tsx`, `equipe.tsx`, `painel/package.json`, `gestao/actions.ts`, `promocao.test.ts`, `resultados.tsx`, `mapa-cliente.tsx`, `gestao.ts`, `funcionarios.tsx`, `formatarReais`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Should `main.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.135632183908046 - nodes in this community are weakly interconnected._