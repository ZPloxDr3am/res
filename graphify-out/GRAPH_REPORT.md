# Graph Report - res  (2026-11-01)

## Corpus Check
- 339 files · ~307,776 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 2861 nodes · 7342 edges · 149 communities (127 shown, 22 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 53 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `15ca8a47`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- estoque/page.tsx
- resumo/page.tsx
- 20261020000001_base.sql
- main.ts
- (painel)/layout.tsx
- 20261021000014_caixa.sql
- Banco: impressão
- 20261027000032_fidelidade.sql
- Banco: estoque
- API aberta e MCP (rotas)
- salvando
- balcao.tsx
- m/actions.ts
- fidelidade/actions.ts
- web/package.json
- CI (testes automáticos)
- app-motoboy.tsx
- 20261028000056_evento.sql
- public.pedidos
- Decisões de arquitetura — RES
- next
- formatarReais
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
- resumo/page.tsx
- documento/[id]/page.tsx
- preco.ts
- painel-caixa.tsx
- Configuração TypeScript
- Banco: cupons e descontos
- Banco: Mercado Pago
- Dependências do app do motoboy
- anon
- Grupo 45: package.json
- Grupo 46: package.json
- ajustar-android.mjs
- public.produtos
- cardapio-cliente.tsx
- dependencies
- public.setores
- index.ts
- cardapio/actions.ts
- beefood_para_res.py
- public.copiar_ficha
- evento/page.tsx
- graphify
- 20261028000040_api_webhooks.sql
- promocao.test.ts
- importar-nfe.tsx
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
- editor-cardapio.tsx
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
- cardapio-dados.ts
- 99zzzzzzzzzzzzzzzzzzz_gestao.sql
- Grupo 96: 70_caixa.sql
- 99zzzzzzzzzzzzzzzzz_taxa_km.sql
- 99zz_promocao.sql
- resultados.tsx
- Grupo 100: tempos_ajuste.sql
- pedido.ts
- entregas/page.tsx
- form-grupo.tsx
- programa.tsx
- Grupo 105: next.config.mjs
- Grupo 106: vercel.json
- funcionarios.tsx
- Grupo 108: test-db.sh
- pedidos/actions.ts
- app/layout.tsx
- salvando
- evento/actions.ts
- m/page.tsx
- 99zzzzzzzzzzzzzzzzzzzzz_evento.sql
- form-setor.tsx
- public.lojas
- lojas/page.tsx
- 99zzzzzzzzzzzzzzzzzzzz_equipe.sql
- middleware.ts
- entregas/page.tsx
- [slug]/actions.ts
- 20261101000062_financeiro_grupo.sql
- 99zzzzzzzzzzzzzzzzzzzzzzz_financeiro.sql
- public.dre_financeiro
- public.contas
- 99zzzzzzzzzzzzzzzzzzzzzz_quadro.sql
- 20261021000007_cardapio_biblioteca.sql
- impressao.ts
- form-setor.tsx
- pedidos/page.tsx
- D-017 Motoboy app with dispatch by order QR
- pg_temp.como
- public.usuarios_login
- middleware.ts
- app/layout.tsx
- carregarCardapio
- scripts
- QuadroPedidos
- pg_temp.como

## God Nodes (most connected - your core abstractions)
1. `criarClienteServidor()` - 223 edges
2. `public.lojas` - 157 edges
3. `public.pedidos` - 124 edges
4. `public.marcas` - 121 edges
5. `salvando()` - 118 edges
6. `contextoLoja` - 117 edges
7. `formatarReais()` - 99 edges
8. `next` - 81 edges
9. `react` - 78 edges
10. `public.produtos` - 75 edges

## Surprising Connections (you probably didn't know these)
- `D-022 Combos com escolhas e categoria de up-sell` --references--> `calcularCombo()`  [INFERRED]
  docs/decisoes.md → packages/core/src/combo.ts
- `D-023 % por categoria, cupons e desconto no balcão com limite` --references--> `precoBase()`  [INFERRED]
  docs/decisoes.md → packages/core/src/preco.ts
- `Ambiente no ar (piloto)` --references--> `main()`  [INFERRED]
  README.md → packages/agente/src/main.ts
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

## Communities (149 total, 22 thin omitted)

### Community 0 - "estoque/page.tsx"
Cohesion: 0.05
Nodes (102): ajustarEstoque(), buscarMovimentos(), copiarFicha(), definirModoEstoque(), excluirInsumo(), feito(), FiltroMovimentos, importarNFe() (+94 more)

### Community 1 - "resumo/page.tsx"
Cohesion: 0.05
Nodes (45): salvarMeta(), Composicao, ComposicaoVendas(), dataBR(), dynamic, Kpi(), Metricas, PRESETS (+37 more)

### Community 2 - "20261020000001_base.sql"
Cohesion: 0.11
Nodes (25): grupos_acesso_atualizado, grupos_acesso_auditar, grupos_acesso_validar, lojas_atualizado, lojas_auditar, marcas_atualizado, marcas_auditar, marcas_loja_idx (+17 more)

### Community 3 - "main.ts"
Cohesion: 0.13
Nodes (29): acharWindows(), alcance(), argumento(), ARQ_CONFIG, ARQ_LOG, atualizarSePrecisar(), atualizarWindows(), Config (+21 more)

### Community 4 - "(painel)/layout.tsx"
Cohesion: 0.17
Nodes (16): PainelLayout(), trocarLoja(), dadosNovoPedido(), Icone(), Link_, LINKS, NavPainel(), SECOES (+8 more)

### Community 5 - "20261021000014_caixa.sql"
Cohesion: 0.13
Nodes (24): caixa_movimentos_sessao_idx, caixa_sessoes_auditar, caixa_sessoes_loja_idx, caixa_sessoes_uma_aberta_idx, caixas_auditar, caixas_nome_idx, lojas_caixa_inicial, pedidos_caixa_idx (+16 more)

### Community 6 - "Banco: impressão"
Cohesion: 0.06
Nodes (48): impressao_config_auditar, impressao_destinos_loja_idx, impressoes_loja_idx, impressoes_pedido_idx, impressoes_pendentes_idx, impressoras_auditar, impressoras_nome_idx, pedidos_imprimir_ao_aceitar (+40 more)

### Community 7 - "20261027000032_fidelidade.sql"
Cohesion: 0.06
Nodes (43): fidelidade_mov_cliente_idx, fidelidade_mov_grupo_idx, fidelidade_mov_pedido_idx, fidelidade_recompensas_grupo_idx, pedidos_fidelidade, private.aplicar_fidelidade(), private.expirar_fidelidade(), private.fidelidade_status() (+35 more)

### Community 8 - "Banco: estoque"
Cohesion: 0.07
Nodes (41): public.reordenar(), public.relatorio_entregas(), public.relatorio_fidelidade(), estoque_mov_estoque_idx, estoque_mov_insumo_idx, estoque_mov_pedido_idx, fichas_opcao_idx, fichas_produto_idx (+33 more)

### Community 9 - "API aberta e MCP (rotas)"
Cohesion: 0.08
Nodes (33): DELETE, POST(), DELETE, POST(), GET(), OPTIONS, GET(), OPTIONS (+25 more)

### Community 10 - "salvando"
Cohesion: 0.06
Nodes (59): ConfigImpressao, DadosImpressora, excluirImpressora(), gerarCodigoAgente(), imprimirPedido(), imprimirTeste(), marcarImpressao(), msg() (+51 more)

### Community 11 - "balcao.tsx"
Cohesion: 0.22
Nodes (13): saldoDoCliente(), FidelidadeBalcao(), UsoFidelidade, SaldoCliente, CANAIS_FIDELIDADE, canalFidelidade, cashbackUsavel(), CASOS_GANHO (+5 more)

### Community 12 - "m/actions.ts"
Cohesion: 0.19
Nodes (20): chegadas(), espera(), medirEntrega(), montar(), planejarRota(), PlanoRota, Achado, distanciaRota() (+12 more)

### Community 13 - "fidelidade/actions.ts"
Cohesion: 0.17
Nodes (20): ajustarSaldo(), buscarSaldos(), extratoCliente(), R, diaDoTurno(), dynamic, Fidelidade(), menos() (+12 more)

### Community 14 - "web/package.json"
Cohesion: 0.18
Nodes (14): devDependencies, @types/node@22.10.2, @types/qrcode@^1.5.5, @types/react@^19.2.0, @types/react-dom@^19.2.0, typescript@5.6.3, @types/node, typescript (+6 more)

### Community 15 - "CI (testes automáticos)"
Cohesion: 0.07
Nodes (34): name, runs-on, services, steps, DATABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, POSTGRES_PASSWORD (+26 more)

### Community 16 - "app-motoboy.tsx"
Cohesion: 0.15
Nodes (26): despachar(), entregar(), dynamic, metadata, PaginaDespacho(), Acerto(), AppMotoboy(), Aviso (+18 more)

### Community 17 - "20261028000056_evento.sql"
Cohesion: 0.25
Nodes (7): pedidos_a_evento_periodo, private.limite_cardapios(), private.pedido_no_periodo_do_evento(), private.produto_de_evento(), public.criar_evento(), public.evento_publico(), public.salvar_evento()

### Community 18 - "public.pedidos"
Cohesion: 0.05
Nodes (49): pedido_eventos_pedido_idx, pedido_item_opcoes_item_idx, pedido_itens_pedido_idx, pedidos_atualizado, pedidos_loja_status_idx, private.contador_pedidos, public.mudar_status_pedido(), public.pedido_eventos (+41 more)

### Community 19 - "Decisões de arquitetura — RES"
Cohesion: 0.06
Nodes (33): D-002 Modelo multiloja: Loja → Marcas, D-003 Regras de cadastro valem no banco e no formulário, D-004 Auditoria calculada no servidor, D-005 Operações compostas são atômicas, D-006 Gravar só em ação explícita, D-007 Texto em UTF-8 completo, D-008 Nenhum segredo de integração no navegador, D-009 Preço de itens com grupos (decisão provisória, Q-009) (+25 more)

### Community 20 - "next"
Cohesion: 0.16
Nodes (8): GET(), POST(), LayoutMotoboy(), metadata, viewport, criarLoja(), dynamic, next

### Community 21 - "formatarReais"
Cohesion: 0.25
Nodes (18): buscarClientes(), autorizarDesconto(), criarPedido(), GruposBalcao(), ItemCarrinho, lerCentavos(), Montador(), MontadorCombo() (+10 more)

### Community 22 - "aplicativos.tsx"
Cohesion: 0.08
Nodes (52): conectarMercadoPago(), criarChaveApi(), desconectarMercadoPago(), excluirWebhook(), mpAceitarAoPagar(), R, removerIntegracao(), revogarChaveApi() (+44 more)

### Community 23 - "formatarReais"
Cohesion: 0.25
Nodes (12): ajustarEntrega(), CartaoMotoboy(), FechamentoMotoboys(), FONTE, hora(), LinhaEntrega(), Numero(), Total (+4 more)

### Community 24 - "gestao/page.tsx"
Cohesion: 0.11
Nodes (31): EscopoCustos, excluirRegistro(), FuncionarioForm, lojaGestor(), R, RegistroForm, salvarCustos(), salvarModoGrupo() (+23 more)

### Community 25 - "Promoções e cupons (tela)"
Cohesion: 0.12
Nodes (34): agenda(), alternarCupom(), CupomForm, excluirCupom(), excluirPromoCategoria(), fim(), PromoCategoriaForm, R (+26 more)

### Community 26 - "quadro-pedidos.tsx"
Cohesion: 0.08
Nodes (19): cuponsPendentes(), marcarAviso(), marcarPago(), abrirWhatsApp(), AvisarTodos(), CartaoPedido(), COLUNAS, ETAPAS_AVISO (+11 more)

### Community 27 - "lojas/actions.ts"
Cohesion: 0.20
Nodes (17): convidar(), criarCardapio(), criarLoja(), definirCidade(), msg(), R, trocarSenhaUsuario(), CartaoLoja() (+9 more)

### Community 28 - "financeiro/page.tsx"
Cohesion: 0.07
Nodes (76): configCustos(), criarLancamento(), donoFin(), editarLancamento(), excluirLancamento(), gerarContasCustos(), lancarNfe(), marcarPago() (+68 more)

### Community 29 - "Workflow do APK do motoboy"
Cohesion: 0.08
Nodes (24): runs-on, steps, GH_TOKEN, KS_B64, KS_PASS, jobs, apk, name (+16 more)

### Community 30 - "evento.tsx"
Cohesion: 0.15
Nodes (24): dynamic, Evento(), brl(), ConfigEvento(), CriarEvento(), EditorProdutoEvento(), EscolherProdutos(), EventoInfo (+16 more)

### Community 31 - "form-delivery.tsx"
Cohesion: 0.24
Nodes (13): PedidoCliente, ConfigDelivery, definirStatus(), replicarHorarios(), salvarConfig(), Vitrine, Delivery(), centavos() (+5 more)

### Community 32 - "20261028000052_gestao_empresarial.sql"
Cohesion: 0.24
Nodes (13): funcionario_registros_idx, funcionario_registros_numero, funcionarios_loja_idx, gestao_empresa_auditar, private.contadores_registro, private.numerar_registro(), public.funcionario_registros, public.funcionarios (+5 more)

### Community 33 - "bairros.tsx"
Cohesion: 0.15
Nodes (25): AoVivo, AreaForm, calcularKmBairro(), FaixaForm, localizarLoja(), MotoboyAoVivo, R, salvarAreas() (+17 more)

### Community 34 - "Workflow do agente de impressão"
Cohesion: 0.09
Nodes (21): GH_TOKEN, runs-on, steps, jobs, exe, name, on, push (+13 more)

### Community 35 - "Montagem do cupom impresso"
Cohesion: 0.16
Nodes (20): D-014 Impressão: fila no banco, regras como no BeeFood, navegador até o agente chegar, D-015 Agente de impressão do Windows (RES Impressão), blocosCombo(), colunasLR(), CupomDados, cupomTexto(), dataHora(), FRACAO (+12 more)

### Community 36 - "resumo/page.tsx"
Cohesion: 0.14
Nodes (11): adapt, app, g, gradle, m, man, permissoes, res (+3 more)

### Community 37 - "documento/[id]/page.tsx"
Cohesion: 0.22
Nodes (18): salvarEmpresa(), dias(), Documento(), dynamic, DadosEmpresa(), BotaoImprimir(), cnpjValido(), dataBr() (+10 more)

### Community 38 - "preco.ts"
Cohesion: 0.17
Nodes (20): calcularCombo(), PassoCombo, precoSeparado(), calcularItem(), ErroEscolha, grupoVisivel(), opcaoVisivel(), precoBase() (+12 more)

### Community 39 - "painel-caixa.tsx"
Cohesion: 0.08
Nodes (50): cadastrar(), credenciais(), entrar(), abrirCaixa(), fecharCaixa(), movimentar(), msg(), R (+42 more)

### Community 40 - "Configuração TypeScript"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 41 - "Banco: cupons e descontos"
Cohesion: 0.14
Nodes (15): cupons_auditar, cupons_codigo_idx, pedidos_cupom_idx, private.agenda_vale(), private.aplicar_cupom(), private.cupom_da_loja(), private.desconto_categoria_pct(), private.desconto_cupom() (+7 more)

### Community 42 - "Banco: Mercado Pago"
Cohesion: 0.16
Nodes (13): mp_pagamentos_pedido_idx, public.desconectar_mp(), public.mp_contas, public.mp_pagamentos, public.mp_status(), public.salvar_mp(), public.mp_aceitar_ao_pagar(), public.mp_status() (+5 more)

### Community 43 - "Dependências do app do motoboy"
Cohesion: 0.14
Nodes (17): dependencies, @capacitor/android@6.2.0, @capacitor/app@6.0.2, @capacitor/cli@6.2.0, @capacitor-community/background-geolocation@1.2.26, @capacitor/core@6.2.0, description, name (+9 more)

### Community 44 - "anon"
Cohesion: 0.16
Nodes (21): fin_fornecedores_doc, fin_lanc_comp, fin_lanc_origem, fin_lanc_serie, fin_lanc_venc, fin_lancamentos_auditar, fin_lancamentos_loja, private.fin_mesma_loja() (+13 more)

### Community 45 - "Grupo 45: package.json"
Cohesion: 0.14
Nodes (17): description, devDependencies, esbuild@0.24.0, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, tsx, @types/node (+9 more)

### Community 46 - "Grupo 46: package.json"
Cohesion: 0.13
Nodes (17): description, devDependencies, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, exports, tsx, @types/node (+9 more)

### Community 47 - "ajustar-android.mjs"
Cohesion: 0.18
Nodes (15): carregar(), dynamic, generateMetadata(), PaginaCardapio(), carregar(), enviar(), Janela, Rastreamento() (+7 more)

### Community 48 - "public.produtos"
Cohesion: 0.06
Nodes (73): complementos_loja_idx, grupos_opcoes_loja_idx, opcoes_grupo_idx, private.setor_exige_marca(), produto_grupos_grupo_idx, produtos_loja_setor_idx, public.complementos, public.criar_grupo_vinculado() (+65 more)

### Community 49 - "cardapio-cliente.tsx"
Cohesion: 0.13
Nodes (16): acrescimo(), cheio(), completo(), Extras, GruposMontagem(), minimo(), SELO, DIAS (+8 more)

### Community 50 - "dependencies"
Cohesion: 0.13
Nodes (13): dependencies, jsqr@1.4.0, next@^15.5.9, qrcode@^1.5.4, react@^19.2.1, react-dom@^19.2.1, @res/core@*, @supabase/supabase-js@2.47.10 (+5 more)

### Community 51 - "public.setores"
Cohesion: 0.21
Nodes (9): areas_entrega_auditar, marca_horarios_auditar, private.marca_aberta(), public.areas_entrega, public.marca_horarios, public.salvar_config_delivery(), private.taxa_bairro(), private.area_do_pedido() (+1 more)

### Community 52 - "index.ts"
Cohesion: 0.16
Nodes (23): exportarClientes(), listarClientes(), salvarCliente(), Clientes(), dynamic, baixarCsv(), FichaCliente(), ListaClientes() (+15 more)

### Community 53 - "cardapio/actions.ts"
Cohesion: 0.14
Nodes (43): alterarDisponibilidade(), CategoriaOrigem, criarProduto(), definirFoto(), definirFotoOpcao(), definirGruposDoProduto(), definirProdutosDoGrupo(), desvincularGrupo() (+35 more)

### Community 54 - "beefood_para_res.py"
Cohesion: 0.33
Nodes (3): converter(), limpa(), L()

### Community 55 - "public.copiar_ficha"
Cohesion: 0.29
Nodes (9): codificar(), CP850, CP860, ESC_T, Pagina, semAcento(), ConfigImpressora, gerarEscPos() (+1 more)

### Community 56 - "evento/page.tsx"
Cohesion: 0.25
Nodes (7): caminhoScript(), hostPorta(), imprimirRede(), imprimirWindows(), powershell(), PS_RAW, testarRede()

### Community 58 - "20261028000040_api_webhooks.sql"
Cohesion: 0.05
Nodes (47): private.total_contagem(), clientes_auditar, clientes_grupo_nome_idx, pedidos_cliente_idx, pedidos_registra_cliente, private.grupo_da_loja(), private.pedido_registra_cliente(), public.buscar_clientes() (+39 more)

### Community 59 - "promocao.test.ts"
Cohesion: 0.24
Nodes (11): D-021 Cardápio novo: cards com foto e promoção De/Por com agenda, AgendaPromo, diaAnterior(), diaDaSemana(), DIAS_CURTOS, partesLocais(), promoEncerrada(), promoVale() (+3 more)

### Community 60 - "importar-nfe.tsx"
Cohesion: 0.23
Nodes (11): custos_auditar, custos_loja_idx, public.custos, custos_auditar, custos_auditar_apagar, public.gestao_conta, public.preparar_gestao_grupo(), public.fin_config (+3 more)

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
Cohesion: 0.15
Nodes (31): ligarFicha(), salvarFuncionario(), alterarFuncao(), cancelarConvite(), criarUsuarioCaixa(), definirAtivo(), Assistente(), Cartao (+23 more)

### Community 74 - "Grupo 74: 99_motoboy.sql"
Cohesion: 0.39
Nodes (7): ids, pg_temp.como(), pg_temp.id(), pg_temp.token(), pg_temp.v(), saida, tokens

### Community 75 - "Grupo 75: 99z_entregas_km.sql"
Cohesion: 0.39
Nodes (7): ids, pg_temp.como(), pg_temp.id(), pg_temp.token(), pg_temp.v(), saida, tokens

### Community 76 - "Grupo 76: 99zzzzzzzzzzzz_estoque.sql"
Cohesion: 0.32
Nodes (6): ids, pg_temp.id(), pg_temp.v(), s1, s2, saida

### Community 77 - "Grupo 77: 99zzzzzzzzzzzzzz_api.sql"
Cohesion: 0.39
Nodes (7): chaves, ids, pg_temp.como(), pg_temp.id(), pg_temp.k(), pg_temp.v(), saida

### Community 78 - "editor-cardapio.tsx"
Cohesion: 0.11
Nodes (17): CardapioCliente(), ETIQUETA, Extras(), Item, ItemCalculado, MaisInformacoes(), MontadorCombo(), Prevenda (+9 more)

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

### Community 94 - "cardapio-dados.ts"
Cohesion: 0.28
Nodes (10): dynamic, PaginaNovoPedido(), Cardapio, GrupoRow, OpcaoRow, PassoRow, ProdutoMarcaRow, ProdutoRow (+2 more)

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

### Community 99 - "resultados.tsx"
Cohesion: 0.17
Nodes (14): DIAS, FAIXA, MEC, ORIGEM, pct(), PERFIL, PERIODOS, REC (+6 more)

### Community 101 - "pedido.ts"
Cohesion: 0.26
Nodes (12): acaoAvancar(), ErroPedido, LinhaTotal, proximosStatus(), STATUS_ROTULO, tempoDecorrido(), Totais, totalizar() (+4 more)

### Community 102 - "entregas/page.tsx"
Cohesion: 0.23
Nodes (11): rastreioAoVivo(), diaDoTurno(), dynamic, Entregas(), LojaBairros, diaCurto(), pct(), PERIODOS (+3 more)

### Community 103 - "form-grupo.tsx"
Cohesion: 0.11
Nodes (26): DadosGrupo, salvarDetalheOpcao(), DetalheOpcao(), FORMACOES, FormGrupo(), GrupoInicial, lerPreco(), mostrarPreco() (+18 more)

### Community 104 - "programa.tsx"
Cohesion: 0.26
Nodes (13): copiarPrograma(), excluirRecompensa(), salvarConfigFidelidade(), salvarRecompensa(), lerReais(), num(), PRAZOS, ProgramaFidelidade() (+5 more)

### Community 107 - "funcionarios.tsx"
Cohesion: 0.10
Nodes (22): espera(), LoteSugerido, sugerirLotes(), SugestaoLoja, SugestaoLotes(), D-028 · Cliente acompanha a entrega, prazo por loja, alerta e lotes na expedição, tempos e atrasos, distanciaReta(), Ponto (+14 more)

### Community 116 - "pedidos/actions.ts"
Cohesion: 0.20
Nodes (11): definirAceiteAutomatico(), definirMovimento(), definirProntoAuto(), mensagem(), mudarStatus(), NovoPedido, pausarLoja(), Resultado (+3 more)

### Community 117 - "app/layout.tsx"
Cohesion: 0.47
Nodes (5): carregar(), dynamic, generateMetadata(), Grupo, PaginaGrupo()

### Community 118 - "salvando"
Cohesion: 0.17
Nodes (18): PassoForm, salvarVitrine(), BotaoExcluir(), EditorCombo(), lerCentavos(), Passo, reais(), AreaFoto() (+10 more)

### Community 119 - "evento/actions.ts"
Cohesion: 0.33
Nodes (10): AjusteProduto, copiarParaEvento(), criarEvento(), msg(), R, refrescar(), removerProdutoEvento(), salvarEvento() (+2 more)

### Community 120 - "m/page.tsx"
Cohesion: 0.50
Nodes (4): painelMotoboy(), dynamic, maxDuration, Motoboy()

### Community 121 - "99zzzzzzzzzzzzzzzzzzzzz_evento.sql"
Cohesion: 0.32
Nodes (5): ids, pg_temp.id(), pg_temp.v(), quando, saida

### Community 122 - "form-setor.tsx"
Cohesion: 0.14
Nodes (21): POST(), conferirPixMercadoPago(), pixMercadoPago(), dynamic, metadata, PaginaAcompanhar(), AcompanharPedido(), ExtrasPedido (+13 more)

### Community 123 - "public.lojas"
Cohesion: 0.06
Nodes (62): public.lojas, public.marcas, public.criar_pedido(), public.pedido_item_opcoes, public.pedido_itens, public.acompanhar_pedido(), private.limite_lojas(), public.replicar_horarios() (+54 more)

### Community 125 - "lojas/page.tsx"
Cohesion: 0.29
Nodes (9): salvarPermissoesEquipe(), ABAS, dynamic, Lojas(), LojaEquipe, AjusteCaixa(), Funcoes(), QuadroFuncoes() (+1 more)

### Community 126 - "99zzzzzzzzzzzzzzzzzzzz_equipe.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 127 - "middleware.ts"
Cohesion: 0.60
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 129 - "entregas/page.tsx"
Cohesion: 0.17
Nodes (15): CORES, haQuanto(), iniciais(), MapaAoVivo(), segundos(), cap(), Capacitor, EstadoRastreio (+7 more)

### Community 130 - "[slug]/actions.ts"
Cohesion: 0.19
Nodes (17): calcularEntregaKm(), conferirCupom(), EntregaKm, enviarPedido(), FaixaKm, programaFidelidade(), saldoFidelidade(), FidelidadeCliente() (+9 more)

### Community 131 - "20261101000062_financeiro_grupo.sql"
Cohesion: 0.13
Nodes (7): fin_lanc_grupo_comp, fin_lanc_grupo_venc, fin_lanc_origem_grupo, fin_lancamentos_auditar, fin_lancamentos_auditar_apagar, private.fin_exigir(), public.preparar_financeiro()

### Community 132 - "99zzzzzzzzzzzzzzzzzzzzzzz_financeiro.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 133 - "public.dre_financeiro"
Cohesion: 0.29
Nodes (5): public.config_custos_financeiro(), public.dre_financeiro(), public.meta_vendas(), public.metas_vendas, public.salvar_meta_vendas()

### Community 134 - "public.contas"
Cohesion: 0.08
Nodes (33): contas_atualizado, contas_proteger_plano, contas_titulares_user_idx, lojas_conta_idx, lojas_limite, marcas_limite, pedidos_loja_criado_idx, private.e_titular() (+25 more)

### Community 135 - "99zzzzzzzzzzzzzzzzzzzzzz_quadro.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 136 - "20261021000007_cardapio_biblioteca.sql"
Cohesion: 0.47
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 137 - "impressao.ts"
Cohesion: 0.27
Nodes (9): situacaoPedidos(), Dados, guardarPedido(), lerPedidos(), MeusPedidos(), NavCliente(), PedidoGuardado, PerfilCliente() (+1 more)

### Community 138 - "form-setor.tsx"
Cohesion: 0.39
Nodes (7): salvarSetor(), FormSetor(), Marca, novoSetor(), SetorForm, setorVisivel(), validarSetor()

### Community 139 - "pedidos/page.tsx"
Cohesion: 0.28
Nodes (4): dynamic, Pedidos(), carregarQuadro(), PedidoRow

### Community 141 - "pg_temp.como"
Cohesion: 0.60
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 142 - "public.usuarios_login"
Cohesion: 0.29
Nodes (4): public.pode_gerir_usuario(), public.registrar_usuario_caixa(), public.usuarios_login, auth.users

### Community 143 - "middleware.ts"
Cohesion: 0.33
Nodes (4): config, PUBLICAS, @supabase/ssr@0.5.2, @supabase/ssr

### Community 145 - "carregarCardapio"
Cohesion: 0.60
Nodes (4): Cardapio(), dynamic, TempoReal(), carregarCardapio()

### Community 146 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, start, typecheck

### Community 147 - "QuadroPedidos"
Cohesion: 0.50
Nodes (4): BotaoNovoPedido(), bipar(), QuadroPedidos(), seloCliente()

## Knowledge Gaps
- **9 isolated node(s):** `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `pedidos.qr_token (/m/d/<código>)`, `GitHub Actions CI (rules, db, build)`, `Roadmap stages 3c-7 and integrations`, `supabase/migrations (Postgres RLS, audit, atomic ops)` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 697 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `estoque/page.tsx`, `resumo/page.tsx`, `(painel)/layout.tsx`, `API aberta e MCP (rotas)`, `salvando`, `impressao.ts`, `fidelidade/actions.ts`, `web/package.json`, `middleware.ts`, `app/layout.tsx`, `app-motoboy.tsx`, `formatarReais`, `aplicativos.tsx`, `gestao/page.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `lojas/actions.ts`, `financeiro/page.tsx`, `evento.tsx`, `form-delivery.tsx`, `bairros.tsx`, `documento/[id]/page.tsx`, `painel-caixa.tsx`, `ajustar-android.mjs`, `dependencies`, `index.ts`, `cardapio/actions.ts`, `equipe.tsx`, `editor-cardapio.tsx`, `resultados.tsx`, `entregas/page.tsx`, `pedidos/actions.ts`, `app/layout.tsx`, `salvando`, `evento/actions.ts`, `form-setor.tsx`, `lojas/page.tsx`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **What connects `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `pedidos.qr_token (/m/d/<código>)`, `GitHub Actions CI (rules, db, build)` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `estoque/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05186150948862813 - nodes in this community are weakly interconnected._
- **Why does `react` connect `estoque/page.tsx` to `resumo/page.tsx`, `entregas/page.tsx`, `[slug]/actions.ts`, `(painel)/layout.tsx`, `impressao.ts`, `form-setor.tsx`, `balcao.tsx`, `salvando`, `fidelidade/actions.ts`, `web/package.json`, `app-motoboy.tsx`, `formatarReais`, `aplicativos.tsx`, `formatarReais`, `gestao/page.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `lojas/actions.ts`, `financeiro/page.tsx`, `evento.tsx`, `form-delivery.tsx`, `bairros.tsx`, `documento/[id]/page.tsx`, `painel-caixa.tsx`, `ajustar-android.mjs`, `cardapio-cliente.tsx`, `dependencies`, `index.ts`, `cardapio/actions.ts`, `equipe.tsx`, `editor-cardapio.tsx`, `cardapio-dados.ts`, `entregas/page.tsx`, `form-grupo.tsx`, `programa.tsx`, `funcionarios.tsx`, `salvando`, `form-setor.tsx`, `lojas/page.tsx`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Should `resumo/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05478750640040963 - nodes in this community are weakly interconnected._
- **Why does `criarClienteServidor()` connect `cardapio/actions.ts` to `estoque/page.tsx`, `resumo/page.tsx`, `[slug]/actions.ts`, `impressao.ts`, `form-setor.tsx`, `balcao.tsx`, `m/actions.ts`, `fidelidade/actions.ts`, `salvando`, `pedidos/page.tsx`, `app-motoboy.tsx`, `carregarCardapio`, `next`, `formatarReais`, `aplicativos.tsx`, `formatarReais`, `gestao/page.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `lojas/actions.ts`, `financeiro/page.tsx`, `evento.tsx`, `form-delivery.tsx`, `bairros.tsx`, `documento/[id]/page.tsx`, `painel-caixa.tsx`, `ajustar-android.mjs`, `index.ts`, `equipe.tsx`, `cardapio-dados.ts`, `entregas/page.tsx`, `form-grupo.tsx`, `programa.tsx`, `funcionarios.tsx`, `pedidos/actions.ts`, `app/layout.tsx`, `salvando`, `evento/actions.ts`, `m/page.tsx`, `form-setor.tsx`, `lojas/page.tsx`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `20261020000001_base.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.10752688172043011 - nodes in this community are weakly interconnected._