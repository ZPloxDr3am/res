# Graph Report - res  (2026-11-01)

## Corpus Check
- 333 files · ~301,401 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 2812 nodes · 7235 edges · 145 communities (122 shown, 23 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 53 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `371f057c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- estoque/page.tsx
- funcionarios.tsx
- 20261020000001_base.sql
- main.ts
- editor-cardapio.tsx
- 20261021000014_caixa.sql
- Banco: impressão
- 20261027000032_fidelidade.sql
- Banco: estoque
- API aberta e MCP (rotas)
- painel-impressoras.tsx
- public.setores
- 20261028000040_api_webhooks.sql
- fidelidade/actions.ts
- web/package.json
- CI (testes automáticos)
- app-motoboy.tsx
- public.lojas
- resumo/page.tsx
- Decisões de arquitetura — RES
- next
- novo-pedido.tsx
- aplicativos.tsx
- formatarReais
- custos.tsx
- Promoções e cupons (tela)
- quadro-pedidos.tsx
- lojas/actions.ts
- financeiro/page.tsx
- Workflow do APK do motoboy
- evento.tsx
- salvando
- 20261028000052_gestao_empresarial.sql
- bairros.tsx
- Workflow do agente de impressão
- Montagem do cupom impresso
- cardapio-dados.ts
- estoque/actions.ts
- preco.ts
- painel-caixa.tsx
- Configuração TypeScript
- Banco: cupons e descontos
- Banco: Mercado Pago
- Dependências do app do motoboy
- anon
- Grupo 45: package.json
- Grupo 46: package.json
- resultados.tsx
- public.produtos
- 20261028000052_gestao_empresarial.sql
- formatarReais
- 20261021000006_cardapio_digital.sql
- index.ts
- criarClienteServidor
- beefood_para_res.py
- escpos.ts
- saida.ts
- graphify
- pg_temp.como
- promocao.test.ts
- ajustar-android.mjs
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
- cardapio.test.ts
- programa.tsx
- Grupo 100: tempos_ajuste.sql
- 20261020000002_cardapio.sql
- impressao.ts
- cliente.tsx
- mapa-cliente.tsx
- Grupo 105: next.config.mjs
- Grupo 106: vercel.json
- funcionarios.tsx
- Grupo 108: test-db.sh
- 20261027000026_rastreio_motoboys.sql
- form-delivery.tsx
- editor-produto.tsx
- movimentos.tsx
- 99zz_promocao.sql
- 99zzzzzzzzzzzzzzzzzzzzz_evento.sql
- form-setor.tsx
- public.pedidos
- 99zzzzz_clientes.sql
- 99zzzzzzzzzzzzzzzzzzzz_equipe.sql
- 40_cardapio_biblioteca.sql
- entregas/page.tsx
- normalizarTelefone
- editor-combo.tsx
- 99zzzzzzzzzzzzzzzzzzzzzzz_financeiro.sql
- AbaImpressoras
- public.contas
- 99zzzzzzzzzzzzzzzzzzzzzz_quadro.sql
- 99zzzz_descontos.sql
- Multilojas (conta → lojas → marcas)
- form-setor.tsx
- index.ts
- Multilojas (conta → lojas → marcas)
- pg_temp.como
- pedido-flutuante.tsx
- public.usuarios_login
- pg_temp.como

## God Nodes (most connected - your core abstractions)
1. `criarClienteServidor()` - 219 edges
2. `public.lojas` - 146 edges
3. `public.pedidos` - 118 edges
4. `contextoLoja` - 115 edges
5. `salvando()` - 115 edges
6. `public.marcas` - 115 edges
7. `formatarReais()` - 103 edges
8. `next` - 80 edges
9. `react` - 77 edges
10. `public.produtos` - 73 edges

## Surprising Connections (you probably didn't know these)
- `D-036 · Estoque: entrada por NF-e e baixa pela ficha técnica` --references--> `lerNFe()`  [INFERRED]
  docs/decisoes.md → packages/core/src/estoque.ts
- `Ambiente no ar (piloto)` --references--> `main()`  [INFERRED]
  README.md → packages/agente/src/main.ts
- `D-022 Combos com escolhas e categoria de up-sell` --references--> `calcularCombo()`  [INFERRED]
  docs/decisoes.md → packages/core/src/combo.ts
- `D-023 % por categoria, cupons e desconto no balcão com limite` --references--> `precoBase()`  [INFERRED]
  docs/decisoes.md → packages/core/src/preco.ts
- `D-031 · Programa de fidelidade: cashback e pontos nas lojas do grupo` --references--> `recomendacaoDia()`  [INFERRED]
  docs/decisoes.md → packages/core/src/fidelidade.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Rules duplicated in core and DB with shared test cases** — docs_decisoes_d_021_cardapio_cards_promo, docs_decisoes_d_022_combos_upsell, docs_decisoes_d_029_segmentos_clientes, docs_decisoes_d_030_telefone_nono_digito, docs_decisoes_d_031_fidelidade_grupo, docs_decisoes_core_db_parity [EXTRACTED 1.00]
- **Motoboy delivery flow (QR dispatch, app, tracking, routing)** — docs_decisoes_d_017_app_motoboy_qr, docs_decisoes_d_018_comanda_motoboy_pago, docs_decisoes_d_019_app_android_leitor_qr, docs_decisoes_d_026_rastreio_motoboys, docs_decisoes_d_027_rota_sugerida, apps_mobile_motoboy_readme_res_motoboy_android [INFERRED 0.85]
- **Stock management module (NF-e, recipes, counts, CMV)** — docs_decisoes_d_036_estoque_nfe_ficha, docs_decisoes_d_037_movimentacoes_estoque, docs_decisoes_d_038_meu_estoque_contagem, docs_decisoes_d_039_fechamento_cmv, docs_decisoes_d_040_ficha_sabor_pizza [INFERRED 0.85]

## Communities (145 total, 23 thin omitted)

### Community 0 - "estoque/page.tsx"
Cohesion: 0.05
Nodes (100): ajustarEstoque(), buscarMovimentos(), copiarFicha(), definirModoEstoque(), excluirInsumo(), feito(), FiltroMovimentos, importarNFe() (+92 more)

### Community 1 - "funcionarios.tsx"
Cohesion: 0.23
Nodes (23): FuncionarioForm, ligarFicha(), lojaGestor(), R, salvarCustos(), salvarEmpresa(), salvarFuncionario(), salvarRegistro() (+15 more)

### Community 2 - "20261020000001_base.sql"
Cohesion: 0.11
Nodes (25): grupos_acesso_atualizado, grupos_acesso_auditar, grupos_acesso_validar, lojas_atualizado, lojas_auditar, marcas_atualizado, marcas_auditar, marcas_loja_idx (+17 more)

### Community 3 - "main.ts"
Cohesion: 0.13
Nodes (29): acharWindows(), alcance(), argumento(), ARQ_CONFIG, ARQ_LOG, atualizarSePrecisar(), atualizarWindows(), Config (+21 more)

### Community 4 - "editor-cardapio.tsx"
Cohesion: 0.14
Nodes (12): fonte, metadata, PainelLayout(), trocarLoja(), Icone(), Link_, LINKS, NavPainel() (+4 more)

### Community 5 - "20261021000014_caixa.sql"
Cohesion: 0.13
Nodes (24): caixa_movimentos_sessao_idx, caixa_sessoes_auditar, caixa_sessoes_loja_idx, caixa_sessoes_uma_aberta_idx, caixas_auditar, caixas_nome_idx, lojas_caixa_inicial, pedidos_caixa_idx (+16 more)

### Community 6 - "Banco: impressão"
Cohesion: 0.06
Nodes (48): impressao_config_auditar, impressao_destinos_loja_idx, impressoes_loja_idx, impressoes_pedido_idx, impressoes_pendentes_idx, impressoras_auditar, impressoras_nome_idx, pedidos_imprimir_ao_aceitar (+40 more)

### Community 7 - "20261027000032_fidelidade.sql"
Cohesion: 0.06
Nodes (42): fidelidade_mov_cliente_idx, fidelidade_mov_grupo_idx, fidelidade_mov_pedido_idx, fidelidade_recompensas_grupo_idx, pedidos_fidelidade, private.aplicar_cupom(), private.expirar_fidelidade(), private.fidelidade_status() (+34 more)

### Community 8 - "Banco: estoque"
Cohesion: 0.07
Nodes (39): private.cupom_da_loja(), public.relatorio_fidelidade(), estoque_mov_estoque_idx, estoque_mov_insumo_idx, estoque_mov_pedido_idx, fichas_opcao_idx, fichas_produto_idx, insumos_estoque_idx (+31 more)

### Community 9 - "API aberta e MCP (rotas)"
Cohesion: 0.08
Nodes (33): DELETE, POST(), DELETE, POST(), GET(), OPTIONS, GET(), OPTIONS (+25 more)

### Community 10 - "painel-impressoras.tsx"
Cohesion: 0.10
Nodes (39): ConfigImpressao, DadosImpressora, excluirImpressora(), gerarCodigoAgente(), imprimirTeste(), marcarImpressao(), msg(), R (+31 more)

### Community 11 - "public.setores"
Cohesion: 0.17
Nodes (18): private.setor_exige_marca(), public.setor_marcas, public.setores, setor_marcas_exige_marca, setores_exige_marca, public.criar_pedido_publico(), public.duplicar_setor(), public.compartilhar_catalogo() (+10 more)

### Community 12 - "20261028000040_api_webhooks.sql"
Cohesion: 0.12
Nodes (22): private.total_contagem(), pedidos_webhooks, private.disparar_webhook(), private.loja_da_chave(), private.processar_webhooks(), private.webhooks_pedido(), public.api_chaves, public.api_clientes() (+14 more)

### Community 13 - "fidelidade/actions.ts"
Cohesion: 0.06
Nodes (60): ajustarSaldo(), buscarSaldos(), copiarPrograma(), excluirRecompensa(), extratoCliente(), R, saldoDoCliente(), salvarConfigFidelidade() (+52 more)

### Community 14 - "web/package.json"
Cohesion: 0.06
Nodes (35): config, PUBLICAS, dependencies, jsqr@1.4.0, next@^15.5.9, qrcode@^1.5.4, react@^19.2.1, react-dom@^19.2.1 (+27 more)

### Community 15 - "CI (testes automáticos)"
Cohesion: 0.07
Nodes (34): name, runs-on, services, steps, DATABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, POSTGRES_PASSWORD (+26 more)

### Community 16 - "app-motoboy.tsx"
Cohesion: 0.10
Nodes (41): chegadas(), despachar(), entregar(), espera(), medirEntrega(), montar(), painelMotoboy(), planejarRota() (+33 more)

### Community 17 - "public.lojas"
Cohesion: 0.08
Nodes (30): public.marcas, private.dentro_do_horario(), private.horarios_agendamento(), private.marca_aberta(), private.validar_agendamento(), public.horarios_agendamento(), public.salvar_config_delivery(), public.compartilhar_catalogo() (+22 more)

### Community 18 - "resumo/page.tsx"
Cohesion: 0.11
Nodes (35): Composicao, ComposicaoVendas(), dataBR(), dynamic, Kpi(), Metricas, PRESETS, Resumo (+27 more)

### Community 19 - "Decisões de arquitetura — RES"
Cohesion: 0.06
Nodes (34): D-002 Modelo multiloja: Loja → Marcas, D-003 Regras de cadastro valem no banco e no formulário, D-004 Auditoria calculada no servidor, D-005 Operações compostas são atômicas, D-006 Gravar só em ação explícita, D-007 Texto em UTF-8 completo, D-008 Nenhum segredo de integração no navegador, D-009 Preço de itens com grupos (decisão provisória, Q-009) (+26 more)

### Community 20 - "next"
Cohesion: 0.11
Nodes (25): GET(), POST(), carregar(), dynamic, generateMetadata(), Grupo, PaginaGrupo(), LayoutMotoboy() (+17 more)

### Community 21 - "novo-pedido.tsx"
Cohesion: 0.23
Nodes (21): buscarClientes(), autorizarDesconto(), criarPedido(), GruposBalcao(), ItemCarrinho, lerCentavos(), Montador(), MontadorCombo() (+13 more)

### Community 22 - "aplicativos.tsx"
Cohesion: 0.08
Nodes (52): conectarMercadoPago(), criarChaveApi(), desconectarMercadoPago(), excluirWebhook(), mpAceitarAoPagar(), R, removerIntegracao(), revogarChaveApi() (+44 more)

### Community 23 - "formatarReais"
Cohesion: 0.23
Nodes (14): ajustarEntrega(), CartaoMotoboy(), FechamentoMotoboys(), FONTE, hora(), LinhaEntrega(), Numero(), Total (+6 more)

### Community 24 - "custos.tsx"
Cohesion: 0.10
Nodes (37): EscopoCustos, excluirRegistro(), RegistroForm, salvarModoGrupo(), dias(), Documento(), dynamic, Aba (+29 more)

### Community 25 - "Promoções e cupons (tela)"
Cohesion: 0.11
Nodes (36): agenda(), alternarCupom(), CupomForm, excluirCupom(), excluirPromoCategoria(), fim(), PromoCategoriaForm, R (+28 more)

### Community 26 - "quadro-pedidos.tsx"
Cohesion: 0.08
Nodes (22): cuponsPendentes(), imprimirPedido(), marcarAviso(), BotaoNovoPedido(), abrirWhatsApp(), AvisarTodos(), bipar(), CartaoPedido() (+14 more)

### Community 27 - "lojas/actions.ts"
Cohesion: 0.19
Nodes (19): convidar(), criarCardapio(), criarLoja(), criarUsuarioCaixa(), definirCidade(), msg(), R, trocarSenhaUsuario() (+11 more)

### Community 28 - "financeiro/page.tsx"
Cohesion: 0.07
Nodes (75): configCustos(), criarLancamento(), donoFin(), editarLancamento(), excluirLancamento(), gerarContasCustos(), lancarNfe(), marcarPago() (+67 more)

### Community 29 - "Workflow do APK do motoboy"
Cohesion: 0.08
Nodes (24): runs-on, steps, GH_TOKEN, KS_B64, KS_PASS, jobs, apk, name (+16 more)

### Community 30 - "evento.tsx"
Cohesion: 0.12
Nodes (34): AjusteProduto, copiarParaEvento(), criarEvento(), msg(), R, refrescar(), removerProdutoEvento(), salvarEvento() (+26 more)

### Community 31 - "salvando"
Cohesion: 0.16
Nodes (18): salvarDetalheOpcao(), salvarVitrine(), Vitrine, BotaoExcluir(), AplicarGrupo(), DetalheOpcao(), AreaFoto(), FotoOpcao() (+10 more)

### Community 32 - "20261028000052_gestao_empresarial.sql"
Cohesion: 0.14
Nodes (22): custos_auditar, custos_loja_idx, funcionario_registros_idx, funcionario_registros_numero, funcionarios_loja_idx, gestao_empresa_auditar, private.contadores_registro, private.numerar_registro() (+14 more)

### Community 33 - "bairros.tsx"
Cohesion: 0.12
Nodes (31): AreaForm, calcularKmBairro(), FaixaForm, localizarLoja(), R, salvarAreas(), salvarFaixasKm(), salvarLocalLoja() (+23 more)

### Community 34 - "Workflow do agente de impressão"
Cohesion: 0.09
Nodes (21): GH_TOKEN, runs-on, steps, jobs, exe, name, on, push (+13 more)

### Community 35 - "Montagem do cupom impresso"
Cohesion: 0.15
Nodes (21): D-014 Impressão: fila no banco, regras como no BeeFood, navegador até o agente chegar, D-015 Agente de impressão do Windows (RES Impressão), blocosCombo(), colunasLR(), CupomDados, cupomTexto(), dataHora(), FRACAO (+13 more)

### Community 36 - "cardapio-dados.ts"
Cohesion: 0.22
Nodes (12): Cardapio(), dynamic, dynamic, PaginaNovoPedido(), carregarCardapio(), Cardapio, GrupoRow, OpcaoRow (+4 more)

### Community 37 - "estoque/actions.ts"
Cohesion: 0.21
Nodes (7): definirAceiteAutomatico(), marcarPago(), mensagem(), mudarStatus(), NovoPedido, pausarLoja(), Resultado

### Community 38 - "preco.ts"
Cohesion: 0.16
Nodes (17): EscolhaPasso, PassoCombo, precoSeparado(), grupoVisivel(), opcaoVisivel(), precoGrupo(), precoOpcao(), validarEscolhasGrupo() (+9 more)

### Community 39 - "painel-caixa.tsx"
Cohesion: 0.09
Nodes (46): abrirCaixa(), fecharCaixa(), movimentar(), msg(), R, salvarCaixa(), vincularSemCaixa(), dynamic (+38 more)

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

### Community 44 - "anon"
Cohesion: 0.08
Nodes (33): fin_fornecedores_doc, fin_lanc_comp, fin_lanc_origem, fin_lanc_serie, fin_lanc_venc, fin_lancamentos_auditar, fin_lancamentos_loja, private.fin_mesma_loja() (+25 more)

### Community 45 - "Grupo 45: package.json"
Cohesion: 0.14
Nodes (17): description, devDependencies, esbuild@0.24.0, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, tsx, @types/node (+9 more)

### Community 46 - "Grupo 46: package.json"
Cohesion: 0.13
Nodes (17): description, devDependencies, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, exports, tsx, @types/node (+9 more)

### Community 47 - "resultados.tsx"
Cohesion: 0.14
Nodes (16): carregar(), dynamic, generateMetadata(), PaginaCardapio(), AgendamentoPublico, CardapioPublico, DIAS, GrupoPublico (+8 more)

### Community 48 - "public.produtos"
Cohesion: 0.16
Nodes (33): public.complementos, public.criar_grupo_vinculado(), public.grupos_opcoes, public.opcoes, public.produto_grupos, public.produto_marcas, public.produtos, public.criar_grupo_vinculado() (+25 more)

### Community 49 - "20261028000052_gestao_empresarial.sql"
Cohesion: 0.20
Nodes (19): CardapioCliente(), Extras(), MaisInformacoes(), MontadorCombo(), resumoCombo(), resumoEscolhas(), useEsc(), acrescimo() (+11 more)

### Community 50 - "formatarReais"
Cohesion: 0.19
Nodes (14): dynamic, metadata, PaginaAcompanhar(), ExtrasPedido, carregar(), enviar(), Janela, Rastreamento() (+6 more)

### Community 51 - "20261021000006_cardapio_digital.sql"
Cohesion: 0.18
Nodes (11): areas_entrega_auditar, marca_horarios_auditar, private.marca_aberta(), public.areas_entrega, public.cardapio_publico(), public.marca_horarios, public.salvar_config_delivery(), public.replicar_horarios() (+3 more)

### Community 52 - "index.ts"
Cohesion: 0.24
Nodes (16): exportarClientes(), listarClientes(), salvarCliente(), Clientes(), dynamic, baixarCsv(), FichaCliente(), ListaClientes() (+8 more)

### Community 53 - "criarClienteServidor"
Cohesion: 0.18
Nodes (27): alterarDisponibilidade(), CategoriaOrigem, definirFoto(), definirFotoOpcao(), definirGruposDoProduto(), definirProdutosDoGrupo(), desvincularGrupo(), duplicarGrupo() (+19 more)

### Community 54 - "beefood_para_res.py"
Cohesion: 0.33
Nodes (3): converter(), limpa(), L()

### Community 55 - "escpos.ts"
Cohesion: 0.29
Nodes (9): codificar(), CP850, CP860, ESC_T, Pagina, semAcento(), ConfigImpressora, gerarEscPos() (+1 more)

### Community 56 - "saida.ts"
Cohesion: 0.21
Nodes (7): caminhoScript(), hostPorta(), imprimirRede(), imprimirWindows(), powershell(), PS_RAW, testarRede()

### Community 58 - "pg_temp.como"
Cohesion: 0.11
Nodes (20): clientes_auditar, clientes_grupo_nome_idx, pedidos_cliente_idx, pedidos_registra_cliente, private.grupo_da_loja(), private.pedido_registra_cliente(), public.buscar_clientes(), public.cliente_enderecos (+12 more)

### Community 59 - "promocao.test.ts"
Cohesion: 0.24
Nodes (11): D-021 Cardápio novo: cards com foto e promoção De/Por com agenda, AgendaPromo, diaAnterior(), diaDaSemana(), DIAS_CURTOS, partesLocais(), promoEncerrada(), promoVale() (+3 more)

### Community 60 - "ajustar-android.mjs"
Cohesion: 0.17
Nodes (11): adapt, app, g, gradle, m, man, permissoes, res (+3 more)

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
Cohesion: 0.14
Nodes (25): alterarFuncao(), cancelarConvite(), definirAtivo(), salvarPermissoesEquipe(), ABAS, dynamic, Lojas(), Cartao (+17 more)

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
Cohesion: 0.09
Nodes (17): conferirCupom(), enviarPedido(), programaFidelidade(), saldoFidelidade(), FidelidadeCliente(), lembrarPedidoFidelidade(), ler(), provaFidelidade() (+9 more)

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
Cohesion: 0.24
Nodes (7): combo_passos_auditar, combo_passos_combo_idx, private.preco_combo(), public.combo_passos, public.duplicar_produto(), public.salvar_combo(), private.preco_combo()

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
Cohesion: 0.12
Nodes (25): DadosGrupo, salvarGrupo(), FORMACOES, FormGrupo(), GrupoInicial, lerPreco(), mostrarPreco(), OpcaoForm (+17 more)

### Community 99 - "programa.tsx"
Cohesion: 0.52
Nodes (4): cadastrar(), credenciais(), entrar(), emailDeLogin()

### Community 101 - "20261020000002_cardapio.sql"
Cohesion: 0.19
Nodes (12): complementos_loja_idx, grupos_opcoes_loja_idx, opcoes_grupo_idx, produto_grupos_grupo_idx, produtos_loja_setor_idx, public.criar_produto(), public.salvar_setor(), public.tabela_preco_horarios (+4 more)

### Community 102 - "impressao.ts"
Cohesion: 0.31
Nodes (9): colunasNavegador(), CSS_CUPOM, cupomHtml(), esc(), imprimirNoNavegador(), linhasDoCupom(), qrsDosCupons(), CupomTeste (+1 more)

### Community 107 - "funcionarios.tsx"
Cohesion: 0.10
Nodes (23): espera(), LoteSugerido, sugerirLotes(), SugestaoLoja, SugestaoLotes(), D-027 · Rota sugerida quando o motoboy sai com várias entregas, D-028 · Cliente acompanha a entrega, prazo por loja, alerta e lotes na expedição, tempos e atrasos, Ponto (+15 more)

### Community 116 - "20261027000026_rastreio_motoboys.sql"
Cohesion: 0.16
Nodes (12): motoboy_local_grupo_idx, motoboy_posicoes_em_idx, motoboy_posicoes_entregador_idx, pedidos_motoboy_sai_do_mapa, private.e_membro_do_grupo(), public.motoboy_posicoes, public.rastreio_ao_vivo(), public.registrar_destino() (+4 more)

### Community 117 - "form-delivery.tsx"
Cohesion: 0.27
Nodes (11): acaoAvancar(), ErroPedido, LinhaTotal, proximosStatus(), STATUS_ROTULO, Totais, totalizar(), transicaoValida() (+3 more)

### Community 118 - "editor-produto.tsx"
Cohesion: 0.31
Nodes (10): criarProduto(), lerPromocao(), salvarProduto(), EditorProduto(), FORMACAO, Marca, reais(), resumoGrupo() (+2 more)

### Community 119 - "movimentos.tsx"
Cohesion: 0.27
Nodes (9): diaDoTurno(), dynamic, Entregas(), BairrosEntregas(), diaCurto(), pct(), PERIODOS, Relatorio (+1 more)

### Community 120 - "99zz_promocao.sql"
Cohesion: 0.60
Nodes (4): ids, pg_temp.como(), pg_temp.id(), pg_temp.vale()

### Community 121 - "99zzzzzzzzzzzzzzzzzzzzz_evento.sql"
Cohesion: 0.32
Nodes (5): ids, pg_temp.id(), pg_temp.v(), quando, saida

### Community 122 - "form-setor.tsx"
Cohesion: 0.15
Nodes (18): POST(), calcularEntregaKm(), conferirPixMercadoPago(), EntregaKm, FaixaKm, PedidoCliente, pixMercadoPago(), PagarPixMp() (+10 more)

### Community 123 - "public.pedidos"
Cohesion: 0.05
Nodes (58): pedido_eventos_pedido_idx, pedido_item_opcoes_item_idx, pedido_itens_pedido_idx, pedidos_atualizado, pedidos_loja_status_idx, private.contador_pedidos, public.criar_pedido(), public.mudar_status_pedido() (+50 more)

### Community 125 - "99zzzzz_clientes.sql"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 126 - "99zzzzzzzzzzzzzzzzzzzz_equipe.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 127 - "40_cardapio_biblioteca.sql"
Cohesion: 0.60
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 129 - "entregas/page.tsx"
Cohesion: 0.15
Nodes (18): AoVivo, MotoboyAoVivo, rastreioAoVivo(), CORES, haQuanto(), iniciais(), MapaAoVivo(), segundos() (+10 more)

### Community 130 - "normalizarTelefone"
Cohesion: 0.35
Nodes (9): D-029 · Segmentos de clientes para marketing, D-030 · Telefone sempre com o 9 do celular, CASOS_SEGMENTO, CASOS_TELEFONE, eCelular(), normalizarTelefone(), segmentoCliente(), SEGMENTOS (+1 more)

### Community 131 - "editor-combo.tsx"
Cohesion: 0.33
Nodes (8): PassoForm, salvarCombo(), EditorCombo(), lerCentavos(), Passo, reais(), ProdutoRow, paraCentavos()

### Community 132 - "99zzzzzzzzzzzzzzzzzzzzzzz_financeiro.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 133 - "AbaImpressoras"
Cohesion: 0.22
Nodes (8): novoForm(), ModeloImpressora, modeloPorId(), MODELOS_IMPRESSORA, nomeModelo(), PaginaCodigo, PAGINAS_CODIGO, Protocolo

### Community 134 - "public.contas"
Cohesion: 0.08
Nodes (37): public.lojas, contas_atualizado, contas_proteger_plano, contas_titulares_user_idx, lojas_conta_idx, lojas_limite, marcas_limite, pedidos_loja_criado_idx (+29 more)

### Community 135 - "99zzzzzzzzzzzzzzzzzzzzzz_quadro.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 136 - "99zzzz_descontos.sql"
Cohesion: 0.47
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 137 - "Multilojas (conta → lojas → marcas)"
Cohesion: 0.27
Nodes (9): situacaoPedidos(), Dados, guardarPedido(), lerPedidos(), MeusPedidos(), NavCliente(), PedidoGuardado, PerfilCliente() (+1 more)

### Community 138 - "form-setor.tsx"
Cohesion: 0.39
Nodes (7): salvarSetor(), FormSetor(), Marca, novoSetor(), SetorForm, setorVisivel(), validarSetor()

### Community 139 - "index.ts"
Cohesion: 0.23
Nodes (9): dynamic, Pedidos(), AcompanharPedido(), hora(), PagarPix(), TempoReal(), carregarQuadro(), PedidoRow (+1 more)

### Community 141 - "pg_temp.como"
Cohesion: 0.60
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 142 - "pedido-flutuante.tsx"
Cohesion: 0.28
Nodes (8): dadosNovoPedido(), RascunhoPedido, AbrirPorLink(), Contexto, Ctx, Estado, PedidoFlutuanteProvider(), DadosNovoPedido

### Community 143 - "public.usuarios_login"
Cohesion: 0.29
Nodes (4): public.pode_gerir_usuario(), public.registrar_usuario_caixa(), public.usuarios_login, auth.users

## Knowledge Gaps
- **9 isolated node(s):** `pedidos.qr_token (/m/d/<código>)`, `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `GitHub Actions CI (rules, db, build)`, `Roadmap stages 3c-7 and integrations`, `supabase/migrations (Postgres RLS, audit, atomic ops)` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 682 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `editor-cardapio.tsx` to `estoque/page.tsx`, `funcionarios.tsx`, `API aberta e MCP (rotas)`, `painel-impressoras.tsx`, `index.ts`, `Multilojas (conta → lojas → marcas)`, `fidelidade/actions.ts`, `web/package.json`, `pedido-flutuante.tsx`, `app-motoboy.tsx`, `resumo/page.tsx`, `next`, `novo-pedido.tsx`, `aplicativos.tsx`, `custos.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `lojas/actions.ts`, `financeiro/page.tsx`, `evento.tsx`, `salvando`, `bairros.tsx`, `estoque/actions.ts`, `painel-caixa.tsx`, `resultados.tsx`, `formatarReais`, `index.ts`, `criarClienteServidor`, `equipe.tsx`, `cardapio-cliente.tsx`, `programa.tsx`, `movimentos.tsx`, `form-setor.tsx`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **What connects `pedidos.qr_token (/m/d/<código>)`, `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `GitHub Actions CI (rules, db, build)` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `estoque/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05420353982300885 - nodes in this community are weakly interconnected._
- **Why does `react` connect `salvando` to `estoque/page.tsx`, `entregas/page.tsx`, `funcionarios.tsx`, `editor-combo.tsx`, `editor-cardapio.tsx`, `Multilojas (conta → lojas → marcas)`, `form-setor.tsx`, `painel-impressoras.tsx`, `index.ts`, `fidelidade/actions.ts`, `pedido-flutuante.tsx`, `web/package.json`, `app-motoboy.tsx`, `resumo/page.tsx`, `next`, `novo-pedido.tsx`, `aplicativos.tsx`, `formatarReais`, `custos.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `lojas/actions.ts`, `financeiro/page.tsx`, `evento.tsx`, `bairros.tsx`, `painel-caixa.tsx`, `20261028000052_gestao_empresarial.sql`, `formatarReais`, `index.ts`, `criarClienteServidor`, `equipe.tsx`, `cardapio-cliente.tsx`, `cardapio.test.ts`, `funcionarios.tsx`, `editor-produto.tsx`, `movimentos.tsx`, `form-setor.tsx`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `20261020000001_base.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.10752688172043011 - nodes in this community are weakly interconnected._
- **Why does `criarClienteServidor()` connect `next` to `estoque/page.tsx`, `entregas/page.tsx`, `funcionarios.tsx`, `editor-combo.tsx`, `editor-cardapio.tsx`, `Multilojas (conta → lojas → marcas)`, `form-setor.tsx`, `painel-impressoras.tsx`, `index.ts`, `fidelidade/actions.ts`, `app-motoboy.tsx`, `resumo/page.tsx`, `novo-pedido.tsx`, `aplicativos.tsx`, `formatarReais`, `custos.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `lojas/actions.ts`, `financeiro/page.tsx`, `evento.tsx`, `salvando`, `bairros.tsx`, `cardapio-dados.ts`, `estoque/actions.ts`, `painel-caixa.tsx`, `resultados.tsx`, `formatarReais`, `index.ts`, `criarClienteServidor`, `equipe.tsx`, `cardapio-cliente.tsx`, `cardapio.test.ts`, `programa.tsx`, `funcionarios.tsx`, `editor-produto.tsx`, `movimentos.tsx`, `form-setor.tsx`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `main.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13118279569892474 - nodes in this community are weakly interconnected._