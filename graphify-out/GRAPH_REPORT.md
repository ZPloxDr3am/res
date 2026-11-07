# Graph Report - res  (2026-11-06)

## Corpus Check
- 367 files · ~336,765 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 3124 nodes · 8006 edges · 154 communities (132 shown, 22 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 54 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5af24fc5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- salvando
- 20261020000001_base.sql
- gestao/page.tsx
- main.ts
- nav-painel.tsx
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
- funcionarios.tsx
- 20261106153000_marketplace_base.sql
- Decisões de arquitetura — RES
- criarClienteServidor
- gestao.ts
- contextoLoja
- salvando
- lista-clientes.tsx
- Promoções e cupons (tela)
- quadro-pedidos.tsx
- steps
- financeiro/page.tsx
- Workflow do APK do motoboy
- evento.tsx
- editor-combo.tsx
- acompanhar-pedido.tsx
- next
- Workflow do agente de impressão
- Montagem do cupom impresso
- acompanhar-pedido.tsx
- 20261028000040_api_webhooks.sql
- preco.ts
- painel-caixa.tsx
- Configuração TypeScript
- 20261021000008_multilojas.sql
- Banco: Mercado Pago
- motoboy/package.json
- cardapio-dados.ts
- Grupo 45: package.json
- Grupo 46: package.json
- motoboy/scripts/ajustar-android.mjs
- 20261021000006_cardapio_digital.sql
- escpos.ts
- impressao.ts
- public.produtos
- negociacoes-ifood.tsx
- [link]/page.tsx
- beefood_para_res.py
- resumo/page.tsx
- montagem.tsx
- graphify
- gestao/actions.ts
- novo-pedido.tsx
- public.usuarios_login
- login/actions.ts
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
- public.lojas
- Grupo 79: 99zzzzzzzzz_segmentos.sql
- Grupo 80: 90_agente.sql
- Grupo 81: 95_impressora_grupo.sql
- Grupo 82: 99zzzzzz_rastreio.sql
- public.fin_lancamentos
- Grupo 84: 99zzzzzzzz_entregas_cliente.sql
- Grupo 85: 99zzzzzzzzzzzzz_aplicativos.sql
- Grupo 86: README.md
- Grupo 87: decisoes.md
- 99zzzzzzzzzzzzzzzz_vitrine.sql
- Grupo 89: 30_cardapio_digital.sql
- Grupo 90: 60_agendamento.sql
- impressoras.ts
- Grupo 93: 99zzzzzzzzzzzzzzz_mercadopago.sql
- lancamentos.tsx
- 99zzzzzzzzzzzzzzzzzzz_gestao.sql
- Grupo 96: 70_caixa.sql
- 99zzzzzzzzzzzzzzzzz_taxa_km.sql
- criarClienteServidor
- pg_temp.como
- Grupo 100: tempos_ajuste.sql
- pedido.ts
- entregas/page.tsx
- gestao.ts
- meta-mes.tsx
- Grupo 105: next.config.mjs
- Grupo 106: vercel.json
- funcionarios.tsx
- Grupo 108: test-db.sh
- criarClienteServidor
- CardapioCliente
- 99zzzzzzzzzzzzzzzzzzzzz_evento.sql
- ifood.ts
- public.pedidos
- grafico-dias.tsx
- 99zzzzzzzzzzzzzzzzzzzz_equipe.sql
- middleware.ts
- grafico-lojas.tsx
- 99zzzzzzzzzzzzzzzzzzzzzzz_financeiro.sql
- ref_node_assert
- public.contas
- 99zzzzzzzzzzzzzzzzzzzzzz_quadro.sql
- 20261021000007_cardapio_biblioteca.sql
- 99_motoboy.sql
- agendamento.ts
- 99zzzzzzz_rota.sql
- pg_temp.como
- 20261021000005_pedidos.sql
- pg_temp.como
- ao-vivo.tsx
- planejamento/README.md
- 99zzzzzzzzzzzzzzzzzzzzzzzzz_marketplace.sql
- form-setor.tsx
- Estado atual por área
- Integrações com marketplaces
- Pendências
- 99zzzzz_clientes.sql
- 99zzzzzzzzzzzzzzzzzzzzzzzzzz_negociacao.sql
- Checklist 2 — Implementação e atualizações do software · Responsável: Emmanuel
- Checklist 1 — CNPJ e integrações · Responsável: Hugo
- Checklist 3 — Planejamento tributário e operação no CNPJ · Responsável: Hugo
- app/layout.tsx
- Objetivo
- 05-decisoes-abertas.md
- m/page.tsx

## God Nodes (most connected - your core abstractions)
1. `criarClienteServidor()` - 237 edges
2. `public.lojas` - 164 edges
3. `public.pedidos` - 142 edges
4. `public.marcas` - 127 edges
5. `contextoLoja` - 124 edges
6. `salvando()` - 123 edges
7. `formatarReais()` - 121 edges
8. `next` - 86 edges
9. `react` - 82 edges
10. `public.produtos` - 79 edges

## Surprising Connections (you probably didn't know these)
- `A. Processo e base` --references--> `main()`  [INFERRED]
  docs/planejamento/checklists/emmanuel-software.md → packages/agente/src/main.ts
- `Ambiente no ar (piloto)` --references--> `main()`  [INFERRED]
  README.md → packages/agente/src/main.ts
- `D-022 Combos com escolhas e categoria de up-sell` --references--> `calcularCombo()`  [INFERRED]
  docs/decisoes.md → packages/core/src/combo.ts
- `D-014 Impressão: fila no banco, regras como no BeeFood, navegador até o agente chegar` --references--> `montarCupom()`  [INFERRED]
  docs/decisoes.md → packages/core/src/cupom.ts
- `D-015 Agente de impressão do Windows (RES Impressão)` --references--> `montarCupom()`  [INFERRED]
  docs/decisoes.md → packages/core/src/cupom.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Rules duplicated in core and DB with shared test cases** — docs_decisoes_d_021_cardapio_cards_promo, docs_decisoes_d_022_combos_upsell, docs_decisoes_d_029_segmentos_clientes, docs_decisoes_d_030_telefone_nono_digito, docs_decisoes_d_031_fidelidade_grupo, docs_decisoes_core_db_parity [EXTRACTED 1.00]
- **Motoboy delivery flow (QR dispatch, app, tracking, routing)** — docs_decisoes_d_017_app_motoboy_qr, docs_decisoes_d_018_comanda_motoboy_pago, docs_decisoes_d_019_app_android_leitor_qr, docs_decisoes_d_026_rastreio_motoboys, docs_decisoes_d_027_rota_sugerida, apps_mobile_motoboy_readme_res_motoboy_android [INFERRED 0.85]
- **Stock management module (NF-e, recipes, counts, CMV)** — docs_decisoes_d_036_estoque_nfe_ficha, docs_decisoes_d_037_movimentacoes_estoque, docs_decisoes_d_038_meu_estoque_contagem, docs_decisoes_d_039_fechamento_cmv, docs_decisoes_d_040_ficha_sabor_pizza [INFERRED 0.85]

## Communities (154 total, 22 thin omitted)

### Community 0 - "salvando"
Cohesion: 0.05
Nodes (101): ajustarEstoque(), buscarMovimentos(), copiarFicha(), definirModoEstoque(), excluirInsumo(), feito(), FiltroMovimentos, importarNFe() (+93 more)

### Community 1 - "20261020000001_base.sql"
Cohesion: 0.12
Nodes (22): grupos_acesso_atualizado, grupos_acesso_auditar, grupos_acesso_validar, lojas_atualizado, lojas_auditar, marcas_atualizado, marcas_auditar, marcas_loja_idx (+14 more)

### Community 2 - "gestao/page.tsx"
Cohesion: 0.14
Nodes (21): EscopoCustos, Aba, ABAS, dynamic, Gestao(), brl(), ler(), Linha (+13 more)

### Community 3 - "main.ts"
Cohesion: 0.10
Nodes (36): acharWindows(), alcance(), argumento(), ARQ_CONFIG, ARQ_LOG, atualizarSePrecisar(), atualizarWindows(), Config (+28 more)

### Community 4 - "nav-painel.tsx"
Cohesion: 0.13
Nodes (21): PainelLayout(), trocarLoja(), dadosNovoPedido(), BARRA, COR_SECAO, Icone(), Link_, LINKS (+13 more)

### Community 5 - "20261021000014_caixa.sql"
Cohesion: 0.13
Nodes (24): caixa_movimentos_sessao_idx, caixa_sessoes_auditar, caixa_sessoes_loja_idx, caixa_sessoes_uma_aberta_idx, caixas_auditar, caixas_nome_idx, lojas_caixa_inicial, pedidos_caixa_idx (+16 more)

### Community 6 - "Banco: impressão"
Cohesion: 0.06
Nodes (48): impressao_config_auditar, impressao_destinos_loja_idx, impressoes_loja_idx, impressoes_pedido_idx, impressoes_pendentes_idx, impressoras_auditar, impressoras_nome_idx, pedidos_imprimir_ao_aceitar (+40 more)

### Community 7 - "20261027000032_fidelidade.sql"
Cohesion: 0.05
Nodes (60): clientes_auditar, clientes_grupo_nome_idx, pedidos_cliente_idx, pedidos_registra_cliente, private.grupo_da_loja(), private.pedido_registra_cliente(), public.buscar_clientes(), public.cliente_enderecos (+52 more)

### Community 8 - "Banco: estoque"
Cohesion: 0.07
Nodes (39): public.resumo_vendas(), estoque_mov_estoque_idx, estoque_mov_insumo_idx, estoque_mov_pedido_idx, fichas_opcao_idx, fichas_produto_idx, insumos_estoque_idx, pedidos_estoque (+31 more)

### Community 9 - "API aberta e MCP (rotas)"
Cohesion: 0.08
Nodes (33): DELETE, POST(), DELETE, POST(), GET(), OPTIONS, GET(), OPTIONS (+25 more)

### Community 10 - "salvando"
Cohesion: 0.10
Nodes (41): ConfigImpressao, DadosImpressora, excluirImpressora(), gerarCodigoAgente(), imprimirPedido(), imprimirTeste(), marcarImpressao(), msg() (+33 more)

### Community 11 - "relatorios/page.tsx"
Cohesion: 0.09
Nodes (29): Aba, ABAS, Cancelado, Cor, CORES_BARRA, corTempo(), dataBR(), dynamic (+21 more)

### Community 12 - "m/actions.ts"
Cohesion: 0.23
Nodes (17): chegadas(), espera(), medirEntrega(), montar(), planejarRota(), Achado, distanciaRota(), EnderecoEntrega (+9 more)

### Community 13 - "programa.tsx"
Cohesion: 0.06
Nodes (60): ajustarSaldo(), buscarSaldos(), copiarPrograma(), excluirRecompensa(), extratoCliente(), R, saldoDoCliente(), salvarConfigFidelidade() (+52 more)

### Community 14 - "web/package.json"
Cohesion: 0.06
Nodes (34): config, PUBLICAS, dependencies, jsqr@1.4.0, next@^15.5.9, react@^19.2.1, react-dom@^19.2.1, @res/core@* (+26 more)

### Community 15 - "CI (testes automáticos)"
Cohesion: 0.07
Nodes (34): name, runs-on, services, steps, DATABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, POSTGRES_PASSWORD (+26 more)

### Community 16 - "app-motoboy.tsx"
Cohesion: 0.13
Nodes (29): despachar(), entregar(), PlanoRota, dynamic, metadata, PaginaDespacho(), Acerto(), AppMotoboy() (+21 more)

### Community 17 - "funcionarios.tsx"
Cohesion: 0.26
Nodes (16): ligarFicha(), criarUsuarioCaixa(), Assistente(), doFuncionario(), Funcionarios(), ModoAcesso, novo(), gerarSenha() (+8 more)

### Community 18 - "20261106153000_marketplace_base.sql"
Cohesion: 0.06
Nodes (40): public.tabela_preco_horarios, public.tabela_preco_itens, public.tabela_preco_marcas, public.tabelas_preco, cupons_auditar, cupons_codigo_idx, pedidos_cupom_idx, private.agenda_vale() (+32 more)

### Community 19 - "Decisões de arquitetura — RES"
Cohesion: 0.05
Nodes (36): D-002 Modelo multiloja: Loja → Marcas, D-003 Regras de cadastro valem no banco e no formulário, D-004 Auditoria calculada no servidor, D-005 Operações compostas são atômicas, D-006 Gravar só em ação explícita, D-007 Texto em UTF-8 completo, D-008 Nenhum segredo de integração no navegador, D-009 Preço de itens com grupos (decisão provisória, Q-009) (+28 more)

### Community 20 - "criarClienteServidor"
Cohesion: 0.26
Nodes (14): convidar(), criarCardapio(), criarLoja(), definirCidade(), msg(), R, CartaoLoja(), Conta (+6 more)

### Community 21 - "gestao.ts"
Cohesion: 0.21
Nodes (19): RegistroForm, salvarEmpresa(), dias(), Documento(), dynamic, DadosEmpresa(), BotaoImprimir(), cnpjValido() (+11 more)

### Community 22 - "contextoLoja"
Cohesion: 0.07
Nodes (66): conectarMercadoPago(), criarChaveApi(), desconectarMercadoPago(), excluirWebhook(), mpAceitarAoPagar(), R, removerIntegracao(), revogarChaveApi() (+58 more)

### Community 23 - "salvando"
Cohesion: 0.24
Nodes (13): ajustarEntrega(), CartaoMotoboy(), FechamentoMotoboys(), FONTE, hora(), LinhaEntrega(), Numero(), Total (+5 more)

### Community 24 - "lista-clientes.tsx"
Cohesion: 0.16
Nodes (23): exportarClientes(), listarClientes(), salvarCliente(), Clientes(), dynamic, baixarCsv(), FichaCliente(), ListaClientes() (+15 more)

### Community 25 - "Promoções e cupons (tela)"
Cohesion: 0.09
Nodes (46): agenda(), alternarCupom(), alternarFreteGratis(), CupomForm, excluirCupom(), excluirFreteGratis(), excluirPromoCategoria(), fim() (+38 more)

### Community 26 - "quadro-pedidos.tsx"
Cohesion: 0.09
Nodes (40): cuponsPendentes(), criarPedido(), definirAceiteAutomatico(), definirMovimento(), definirProntoAuto(), marcarAviso(), marcarPago(), mensagem() (+32 more)

### Community 27 - "steps"
Cohesion: 0.08
Nodes (24): runs-on, steps, GH_TOKEN, KS_B64, KS_PASS, jobs, apk, name (+16 more)

### Community 28 - "financeiro/page.tsx"
Cohesion: 0.07
Nodes (76): configCustos(), criarLancamento(), donoFin(), editarLancamento(), excluirLancamento(), gerarContasCustos(), lancarNfe(), marcarPago() (+68 more)

### Community 29 - "Workflow do APK do motoboy"
Cohesion: 0.08
Nodes (24): runs-on, steps, GH_TOKEN, KS_B64, KS_PASS, jobs, apk, name (+16 more)

### Community 30 - "evento.tsx"
Cohesion: 0.12
Nodes (35): AjusteProduto, copiarParaEvento(), criarEvento(), msg(), R, refrescar(), removerProdutoEvento(), salvarEvento() (+27 more)

### Community 31 - "editor-combo.tsx"
Cohesion: 0.23
Nodes (13): PassoForm, salvarCombo(), EditorCombo(), lerCentavos(), Passo, reais(), AreaFoto(), FotoOpcao() (+5 more)

### Community 32 - "acompanhar-pedido.tsx"
Cohesion: 0.14
Nodes (20): carregar(), dynamic, generateMetadata(), PaginaCardapio(), dynamic, metadata, PaginaAcompanhar(), ExtrasPedido (+12 more)

### Community 33 - "next"
Cohesion: 0.15
Nodes (25): AoVivo, AreaForm, calcularKmBairro(), FaixaForm, localizarLoja(), MotoboyAoVivo, R, salvarAreas() (+17 more)

### Community 34 - "Workflow do agente de impressão"
Cohesion: 0.09
Nodes (21): GH_TOKEN, runs-on, steps, jobs, exe, name, on, push (+13 more)

### Community 35 - "Montagem do cupom impresso"
Cohesion: 0.16
Nodes (20): blocosCombo(), colunasLR(), CupomDados, CupomTeste, cupomTexto(), dataHora(), FRACAO, fracaoTexto() (+12 more)

### Community 36 - "acompanhar-pedido.tsx"
Cohesion: 0.14
Nodes (19): POST(), conferirPixMercadoPago(), pixMercadoPago(), AcompanharPedido(), hora(), MapaCliente(), Ponto, PagarPixMp() (+11 more)

### Community 37 - "20261028000040_api_webhooks.sql"
Cohesion: 0.13
Nodes (20): private.total_contagem(), pedidos_webhooks, private.disparar_webhook(), private.loja_da_chave(), private.processar_webhooks(), private.webhooks_pedido(), public.api_chaves, public.api_painel() (+12 more)

### Community 38 - "preco.ts"
Cohesion: 0.14
Nodes (24): calcularCombo(), EscolhaPasso, PassoCombo, LinhaTotal, Totais, calcularItem(), ErroEscolha, grupoVisivel() (+16 more)

### Community 39 - "painel-caixa.tsx"
Cohesion: 0.07
Nodes (50): abrirCaixa(), fecharCaixa(), movimentar(), msg(), R, salvarCaixa(), vincularSemCaixa(), dynamic (+42 more)

### Community 40 - "Configuração TypeScript"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 41 - "20261021000008_multilojas.sql"
Cohesion: 0.13
Nodes (17): private.validar_permissoes(), public.recursos_acesso, contas_proteger_plano, contas_titulares_user_idx, lojas_conta_idx, lojas_limite, marcas_limite, pedidos_loja_criado_idx (+9 more)

### Community 42 - "Banco: Mercado Pago"
Cohesion: 0.16
Nodes (13): mp_pagamentos_pedido_idx, public.desconectar_mp(), public.mp_contas, public.mp_pagamentos, public.mp_status(), public.salvar_mp(), public.mp_aceitar_ao_pagar(), public.mp_status() (+5 more)

### Community 43 - "motoboy/package.json"
Cohesion: 0.14
Nodes (17): dependencies, @capacitor/android@6.2.0, @capacitor/app@6.0.2, @capacitor/cli@6.2.0, @capacitor-community/background-geolocation@1.2.26, @capacitor/core@6.2.0, description, @capacitor/android (+9 more)

### Community 44 - "cardapio-dados.ts"
Cohesion: 0.25
Nodes (11): ETIQUETAS, FORMACAO, Marca, reais(), Cardapio, GrupoRow, OpcaoRow, PassoRow (+3 more)

### Community 45 - "Grupo 45: package.json"
Cohesion: 0.14
Nodes (17): description, devDependencies, esbuild@0.24.0, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, tsx, @types/node (+9 more)

### Community 46 - "Grupo 46: package.json"
Cohesion: 0.13
Nodes (17): description, devDependencies, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, exports, tsx, @types/node (+9 more)

### Community 47 - "motoboy/scripts/ajustar-android.mjs"
Cohesion: 0.09
Nodes (19): adapt, app, g, gradle, m, man, permissoes, res (+11 more)

### Community 48 - "20261021000006_cardapio_digital.sql"
Cohesion: 0.21
Nodes (9): areas_entrega_auditar, marca_horarios_auditar, private.marca_aberta(), public.areas_entrega, public.marca_horarios, public.salvar_config_delivery(), private.taxa_bairro(), private.area_do_pedido() (+1 more)

### Community 49 - "escpos.ts"
Cohesion: 0.26
Nodes (10): codificar(), CP850, CP860, ESC_T, Pagina, semAcento(), ConfigImpressora, gerarEscPos() (+2 more)

### Community 50 - "impressao.ts"
Cohesion: 0.28
Nodes (10): EditorLayout(), RC, colunasNavegador(), CSS_CUPOM, CupomFila, cupomHtml(), esc(), imprimirNoNavegador() (+2 more)

### Community 51 - "public.produtos"
Cohesion: 0.06
Nodes (73): complementos_loja_idx, grupos_opcoes_loja_idx, opcoes_grupo_idx, private.setor_exige_marca(), produto_grupos_grupo_idx, produtos_loja_setor_idx, public.complementos, public.criar_grupo_vinculado() (+65 more)

### Community 52 - "negociacoes-ifood.tsx"
Cohesion: 0.12
Nodes (25): responderNegociacao(), CartaoNegociacao(), NegociacoesIfood(), Prazo(), reais(), bipar(), AcaoNegociacao, Alternativa (+17 more)

### Community 53 - "[link]/page.tsx"
Cohesion: 0.47
Nodes (5): carregar(), dynamic, generateMetadata(), Grupo, PaginaGrupo()

### Community 54 - "beefood_para_res.py"
Cohesion: 0.33
Nodes (3): converter(), limpa(), L()

### Community 55 - "resumo/page.tsx"
Cohesion: 0.20
Nodes (19): Composicao, ComposicaoVendas(), dataBR(), dynamic, Kpi(), Metricas, PRESETS, Resumo (+11 more)

### Community 56 - "montagem.tsx"
Cohesion: 0.12
Nodes (29): CardapioCliente(), Extras(), MaisInformacoes(), MontadorCombo(), resumoCombo(), resumoEscolhas(), useEsc(), acrescimo() (+21 more)

### Community 58 - "gestao/actions.ts"
Cohesion: 0.38
Nodes (9): excluirRegistro(), FuncionarioForm, lojaGestor(), R, salvarCustos(), salvarFuncionario(), salvarModoGrupo(), salvarRegistro() (+1 more)

### Community 59 - "novo-pedido.tsx"
Cohesion: 0.22
Nodes (19): buscarClientes(), autorizarDesconto(), dynamic, PaginaNovoPedido(), GruposBalcao(), ItemCarrinho, lerCentavos(), Montador() (+11 more)

### Community 60 - "public.usuarios_login"
Cohesion: 0.29
Nodes (4): public.pode_gerir_usuario(), public.registrar_usuario_caixa(), public.usuarios_login, auth.users

### Community 61 - "login/actions.ts"
Cohesion: 0.60
Nodes (3): cadastrar(), credenciais(), entrar()

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
Cohesion: 0.19
Nodes (6): agruparEntregas (core), D-042 · Aplicativos, OSRM / Nominatim (OpenStreetMap services), otimizarRota (core), Shift window 05:00→05:00, Digital menu (/c/<endereço>)

### Community 73 - "equipe.tsx"
Cohesion: 0.13
Nodes (26): alterarFuncao(), cancelarConvite(), definirAtivo(), salvarPermissoesEquipe(), trocarSenhaUsuario(), ABAS, dynamic, Lojas() (+18 more)

### Community 74 - "painel/package.json"
Cohesion: 0.16
Nodes (15): dependencies, @capacitor/android@6.2.0, @capacitor/app@6.0.2, @capacitor/cli@6.2.0, @capacitor/core@6.2.0, description, @capacitor/android, @capacitor/app (+7 more)

### Community 75 - "Grupo 75: 99z_entregas_km.sql"
Cohesion: 0.39
Nodes (7): ids, pg_temp.como(), pg_temp.id(), pg_temp.token(), pg_temp.v(), saida, tokens

### Community 76 - "Grupo 76: 99zzzzzzzzzzzz_estoque.sql"
Cohesion: 0.32
Nodes (6): ids, pg_temp.id(), pg_temp.v(), s1, s2, saida

### Community 77 - "Grupo 77: 99zzzzzzzzzzzzzz_api.sql"
Cohesion: 0.39
Nodes (7): chaves, ids, pg_temp.como(), pg_temp.id(), pg_temp.k(), pg_temp.v(), saida

### Community 78 - "public.lojas"
Cohesion: 0.06
Nodes (68): public.lojas, public.marcas, public.criar_pedido(), public.pedido_item_opcoes, public.pedido_itens, public.acompanhar_pedido(), private.limite_cardapios(), public.replicar_horarios() (+60 more)

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

### Community 83 - "public.fin_lancamentos"
Cohesion: 0.06
Nodes (54): custos_auditar, custos_loja_idx, funcionario_registros_idx, funcionario_registros_numero, funcionarios_loja_idx, gestao_empresa_auditar, private.contadores_registro, private.numerar_registro() (+46 more)

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

### Community 91 - "impressoras.ts"
Cohesion: 0.33
Nodes (4): ModeloImpressora, PaginaCodigo, PAGINAS_CODIGO, Protocolo

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

### Community 98 - "criarClienteServidor"
Cohesion: 0.11
Nodes (23): PedidoCliente, LayoutMotoboy(), metadata, viewport, criarLoja(), ConfigDelivery, definirStatus(), replicarHorarios() (+15 more)

### Community 101 - "pedido.ts"
Cohesion: 0.38
Nodes (8): acaoAvancar(), ErroPedido, proximosStatus(), tempoDecorrido(), TIPO_ROTULO, totalizar(), transicaoValida(), troco()

### Community 102 - "entregas/page.tsx"
Cohesion: 0.23
Nodes (11): rastreioAoVivo(), diaDoTurno(), dynamic, Entregas(), LojaBairros, diaCurto(), pct(), PERIODOS (+3 more)

### Community 103 - "gestao.ts"
Cohesion: 0.11
Nodes (28): DadosGrupo, salvarDetalheOpcao(), salvarGrupo(), DetalheOpcao(), FORMACOES, FormGrupo(), GrupoInicial, lerPreco() (+20 more)

### Community 104 - "meta-mes.tsx"
Cohesion: 0.27
Nodes (10): salvarMeta(), ler(), MESES, MetaMes(), pct(), calcularMeta(), DadosMeta, diaUTC() (+2 more)

### Community 107 - "funcionarios.tsx"
Cohesion: 0.10
Nodes (22): espera(), LoteSugerido, sugerirLotes(), SugestaoLoja, SugestaoLotes(), D-027 · Rota sugerida quando o motoboy sai com várias entregas, D-028 · Cliente acompanha a entrega, prazo por loja, alerta e lotes na expedição, tempos e atrasos, agruparEntregas() (+14 more)

### Community 118 - "criarClienteServidor"
Cohesion: 0.15
Nodes (36): GET(), POST(), alterarDisponibilidade(), CategoriaOrigem, criarProduto(), definirFoto(), definirFotoOpcao(), definirGruposDoProduto() (+28 more)

### Community 119 - "CardapioCliente"
Cohesion: 0.12
Nodes (32): calcularEntregaKm(), conferirCupom(), EntregaKm, enviarPedido(), FaixaKm, programaFidelidade(), saldoFidelidade(), situacaoPedidos() (+24 more)

### Community 121 - "99zzzzzzzzzzzzzzzzzzzzz_evento.sql"
Cohesion: 0.32
Nodes (5): ids, pg_temp.id(), pg_temp.v(), quando, saida

### Community 122 - "ifood.ts"
Cohesion: 0.08
Nodes (36): dynamic, GET(), POST(), dynamic, POST(), assinaturaValida(), CAMINHO_ACAO, chamar() (+28 more)

### Community 123 - "public.pedidos"
Cohesion: 0.05
Nodes (46): public.pedidos, private.metricas_vendas(), public.criar_marca(), private.composicao_vendas(), public.resumo_vendas(), pedidos_entregador_idx, pedidos_qr_idx, private.motoboy_no_grupo() (+38 more)

### Community 125 - "grafico-dias.tsx"
Cohesion: 0.33
Nodes (8): DiaLojas, DIAS, GraficoDias(), LojaCor, pedidosDia(), rotulo(), semana(), totalDia()

### Community 126 - "99zzzzzzzzzzzzzzzzzzzz_equipe.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 127 - "middleware.ts"
Cohesion: 0.60
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 130 - "grafico-lojas.tsx"
Cohesion: 0.33
Nodes (8): curto(), formatar(), GraficoLojas(), LojaDesempenho, Metrica, METRICAS, valor(), formatarVariacao()

### Community 132 - "99zzzzzzzzzzzzzzzzzzzzzzz_financeiro.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 133 - "ref_node_assert"
Cohesion: 0.21
Nodes (14): AbaProduto(), D-021 Cardápio novo: cards com foto e promoção De/Por com agenda, AgendaPromo, diaAnterior(), diaDaSemana(), DIAS_CURTOS, partesLocais(), percentualDesconto() (+6 more)

### Community 134 - "public.contas"
Cohesion: 0.16
Nodes (16): contas_atualizado, public.contas, private.estoque_da_loja(), contas_link_unico, private.config_integracao(), public.aplicativos_painel(), public.extras_pedido_publico(), public.integracoes (+8 more)

### Community 135 - "99zzzzzzzzzzzzzzzzzzzzzz_quadro.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 136 - "20261021000007_cardapio_biblioteca.sql"
Cohesion: 0.47
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 137 - "99_motoboy.sql"
Cohesion: 0.39
Nodes (7): ids, pg_temp.como(), pg_temp.id(), pg_temp.token(), pg_temp.v(), saida, tokens

### Community 138 - "agendamento.ts"
Cohesion: 0.30
Nodes (10): D-011 Pedido agendado e taxa por bairro no painel, chaveBairro(), dataNoFuso(), DIAS_CURTOS, faseAgendamento, FOLGA_AGENDADO_MIN, horaNoFuso(), partes() (+2 more)

### Community 139 - "99zzzzzzz_rota.sql"
Cohesion: 0.43
Nodes (6): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida, tok

### Community 141 - "pg_temp.como"
Cohesion: 0.60
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 145 - "20261021000005_pedidos.sql"
Cohesion: 0.07
Nodes (29): public.reordenar(), pedido_eventos_pedido_idx, pedido_item_opcoes_item_idx, pedido_itens_pedido_idx, pedidos_atualizado, pedidos_loja_status_idx, private.contador_pedidos, public.mudar_status_pedido() (+21 more)

### Community 146 - "pg_temp.como"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 148 - "ao-vivo.tsx"
Cohesion: 0.20
Nodes (13): CORES, haQuanto(), iniciais(), MapaAoVivo(), segundos(), cap(), Capacitor, EstadoRastreio (+5 more)

### Community 150 - "planejamento/README.md"
Cohesion: 0.22
Nodes (4): Checklists por área (nosso "Monday"), Regras do quadro, Como usamos, Planejamento do RES

### Community 151 - "99zzzzzzzzzzzzzzzzzzzzzzzzz_marketplace.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 153 - "form-setor.tsx"
Cohesion: 0.39
Nodes (7): salvarSetor(), FormSetor(), Marca, novoSetor(), SetorForm, setorVisivel(), validarSetor()

### Community 155 - "Estado atual por área"
Cohesion: 0.22
Nodes (9): Base e infraestrutura, Cardápio e pedidos, Clientes e marketing, Documentação e processo, Estado atual por área, Gestão e relatórios, Integrações e API, Operação (+1 more)

### Community 157 - "Integrações com marketplaces"
Cohesion: 0.29
Nodes (7): 1. O que o RES precisa ter antes de qualquer marketplace, 2. iFood, 3. Aiqfome, 4. Delivery Much, 5. Outros (decidir em Q-2), 6. Riscos conhecidos, Integrações com marketplaces

### Community 158 - "Pendências"
Cohesion: 0.29
Nodes (7): Agora (próximas 2 semanas), Concluídas, Empresa (CNPJ e tributário) — detalhe em checklists/hugo-cnpj-e-integracoes.md e checklists/hugo-tributario.md, Frentes já previstas no README (fora dos marketplaces), Integrações (detalhe em 03-integracoes-marketplaces.md), Pendências, Piloto com restaurante real

### Community 160 - "99zzzzz_clientes.sql"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 161 - "99zzzzzzzzzzzzzzzzzzzzzzzzzz_negociacao.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 162 - "Checklist 2 — Implementação e atualizações do software · Responsável: Emmanuel"
Cohesion: 0.33
Nodes (6): A. Processo e base, B. Piloto com restaurante real, C. Código das integrações (em dupla com o Hugo — ver checklist 1, seção C), Checklist 2 — Implementação e atualizações do software · Responsável: Emmanuel, D. Próximas etapas do README (fora dos marketplaces), E. Manutenção contínua

### Community 163 - "Checklist 1 — CNPJ e integrações · Responsável: Hugo"
Cohesion: 0.33
Nodes (5): A. Abrir o CNPJ, B. Contas de desenvolvedor (em nome da empresa), C. Integração — o que o RES precisa (genérico, vale para todos os apps), Checklist 1 — CNPJ e integrações · Responsável: Hugo, D. Setup pessoal

### Community 164 - "Checklist 3 — Planejamento tributário e operação no CNPJ · Responsável: Hugo"
Cohesion: 0.33
Nodes (5): A. Regime tributário, B. Como o dinheiro entra, C. Como o dinheiro sai, Checklist 3 — Planejamento tributário e operação no CNPJ · Responsável: Hugo, D. Obrigações recorrentes (depois de aberto)

### Community 166 - "Objetivo"
Cohesion: 0.40
Nodes (4): O que já temos (resumo), Objetivo, Onde queremos chegar, Ordem sugerida das frentes

### Community 178 - "m/page.tsx"
Cohesion: 0.50
Nodes (4): painelMotoboy(), dynamic, maxDuration, Motoboy()

## Knowledge Gaps
- **9 isolated node(s):** `pedidos.qr_token (/m/d/<código>)`, `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `GitHub Actions CI (rules, db, build)`, `Roadmap stages 3c-7 and integrations`, `supabase/migrations (Postgres RLS, audit, atomic ops)` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 777 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `formatarReais()` connect `salvando` to `grafico-lojas.tsx`, `nav-painel.tsx`, `ref_node_assert`, `relatorios/page.tsx`, `programa.tsx`, `app-motoboy.tsx`, `contextoLoja`, `salvando`, `lista-clientes.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `editor-combo.tsx`, `next`, `Montagem do cupom impresso`, `acompanhar-pedido.tsx`, `preco.ts`, `painel-caixa.tsx`, `cardapio-dados.ts`, `negociacoes-ifood.tsx`, `resumo/page.tsx`, `montagem.tsx`, `novo-pedido.tsx`, `criarClienteServidor`, `gestao.ts`, `meta-mes.tsx`, `criarClienteServidor`, `CardapioCliente`, `grafico-dias.tsx`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **What connects `pedidos.qr_token (/m/d/<código>)`, `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `GitHub Actions CI (rules, db, build)` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `salvando` be split into smaller, more focused modules?**
  _Cohesion score 0.05412293853073463 - nodes in this community are weakly interconnected._
- **Why does `next` connect `nav-painel.tsx` to `salvando`, `gestao/page.tsx`, `API aberta e MCP (rotas)`, `salvando`, `relatorios/page.tsx`, `programa.tsx`, `web/package.json`, `app-motoboy.tsx`, `criarClienteServidor`, `gestao.ts`, `contextoLoja`, `lista-clientes.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `financeiro/page.tsx`, `evento.tsx`, `acompanhar-pedido.tsx`, `next`, `acompanhar-pedido.tsx`, `app/layout.tsx`, `painel-caixa.tsx`, `[link]/page.tsx`, `resumo/page.tsx`, `gestao/actions.ts`, `novo-pedido.tsx`, `login/actions.ts`, `equipe.tsx`, `criarClienteServidor`, `entregas/page.tsx`, `meta-mes.tsx`, `criarClienteServidor`, `CardapioCliente`, `ifood.ts`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Should `20261020000001_base.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.1225071225071225 - nodes in this community are weakly interconnected._
- **Why does `criarClienteServidor()` connect `criarClienteServidor` to `salvando`, `gestao/page.tsx`, `salvando`, `relatorios/page.tsx`, `m/actions.ts`, `programa.tsx`, `app-motoboy.tsx`, `funcionarios.tsx`, `criarClienteServidor`, `gestao.ts`, `contextoLoja`, `salvando`, `lista-clientes.tsx`, `form-setor.tsx`, `quadro-pedidos.tsx`, `Promoções e cupons (tela)`, `financeiro/page.tsx`, `evento.tsx`, `editor-combo.tsx`, `acompanhar-pedido.tsx`, `next`, `painel-caixa.tsx`, `cardapio-dados.ts`, `m/page.tsx`, `negociacoes-ifood.tsx`, `[link]/page.tsx`, `resumo/page.tsx`, `gestao/actions.ts`, `novo-pedido.tsx`, `login/actions.ts`, `equipe.tsx`, `criarClienteServidor`, `entregas/page.tsx`, `gestao.ts`, `meta-mes.tsx`, `funcionarios.tsx`, `CardapioCliente`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Should `gestao/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14130434782608695 - nodes in this community are weakly interconnected._