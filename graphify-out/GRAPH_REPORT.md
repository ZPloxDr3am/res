# Graph Report - res  (2026-11-08)

## Corpus Check
- 385 files · ~350,174 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 3235 nodes · 8334 edges · 161 communities (139 shown, 22 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 54 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7a668f80`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- importar-nfe.tsx
- 20261020000001_base.sql
- gestao/page.tsx
- main.ts
- criarClienteServidor
- 20261021000014_caixa.sql
- Banco: impressão
- cadastro/actions.ts
- Banco: estoque
- API aberta e MCP (rotas)
- salvando
- relatorios/page.tsx
- 20261028000040_api_webhooks.sql
- programa.tsx
- web/package.json
- CI (testes automáticos)
- app-motoboy.tsx
- public.clientes
- 20261106230000_marketplace_negociacao.sql
- Decisões de arquitetura — RES
- gestao-lojas.tsx
- gestao.ts
- contextoLoja
- salvando
- novo-pedido.tsx
- Promoções e cupons (tela)
- quadro-pedidos.tsx
- steps
- financeiro/page.tsx
- Workflow do APK do motoboy
- evento.tsx
- cardapio/actions.ts
- cardapio-cliente.tsx
- next
- Workflow do agente de impressão
- cupom.ts
- acompanhar-pedido.tsx
- comecar/actions.ts
- preco.ts
- painel-caixa.tsx
- Configuração TypeScript
- painel/scripts/ajustar-android.mjs
- Banco: Mercado Pago
- motoboy/package.json
- resultados.tsx
- Grupo 45: package.json
- Grupo 46: package.json
- motoboy/scripts/ajustar-android.mjs
- estoque/page.tsx
- escpos.ts
- 99zzzzzzzz_entregas_cliente.sql
- public.opcoes
- ifood.ts
- saida.ts
- beefood_para_res.py
- resumo/page.tsx
- [slug]/actions.ts
- graphify
- gestao/actions.ts
- privacidade/page.tsx
- 20261027000032_fidelidade.sql
- app/layout.tsx
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
- public.marcas
- Grupo 79: 99zzzzzzzzz_segmentos.sql
- Grupo 80: 90_agente.sql
- Grupo 81: 95_impressora_grupo.sql
- Grupo 82: 99zzzzzz_rastreio.sql
- public.fin_lancamentos
- 50_multilojas.sql
- Grupo 85: 99zzzzzzzzzzzzz_aplicativos.sql
- Grupo 86: README.md
- Grupo 87: decisoes.md
- 99zzzzzzzzzzzzzzzz_vitrine.sql
- Grupo 89: 30_cardapio_digital.sql
- Grupo 90: 60_agendamento.sql
- dados-empresa.tsx
- Grupo 93: 99zzzzzzzzzzzzzzz_mercadopago.sql
- lancamentos.tsx
- 99zzzzzzzzzzzzzzzzzzz_gestao.sql
- Grupo 96: 70_caixa.sql
- 99zzzzzzzzzzzzzzzzz_taxa_km.sql
- Multilojas (conta → lojas → marcas)
- m/actions.ts
- Grupo 100: tempos_ajuste.sql
- insumos.tsx
- ao-vivo.tsx
- gestao.ts
- meta-mes.tsx
- Grupo 105: next.config.mjs
- Grupo 106: vercel.json
- funcionarios.tsx
- Grupo 108: test-db.sh
- ifood.tsx
- sabores-pizza.tsx
- entregas/page.tsx
- empresa.ts
- 99zzzzzzzzzzzzzzzzzzzzz_evento.sql
- estoque/actions.ts
- grafico-dias.tsx
- 99zzzzzzzzzzzzzzzzzzzz_equipe.sql
- middleware.ts
- grafico-lojas.tsx
- lojas/page.tsx
- 99zzzzzzzzzzzzzzzzzzzzzzz_financeiro.sql
- 20261021000008_multilojas.sql
- 99zzzzzzzzzzzzzzzzzzzzzz_quadro.sql
- 20261021000007_cardapio_biblioteca.sql
- 99_motoboy.sql
- agendamento.ts
- 99zzzzzzz_rota.sql
- public
- pg_temp.como
- auth.users
- movimentos.tsx
- public.lojas
- pg_temp.como
- contagem.tsx
- pixCopiaECola
- planejamento/README.md
- 99zzzzzzzzzzzzzzzzzzzzzzzzz_marketplace.sql
- 99zzzzz_clientes.sql
- pedido.ts
- Estado atual por área
- Integrações com marketplaces
- Pendências
- pg_temp.como
- 20261101000067_cupom_area_frete.sql
- 99zzzzzzzzzzzzzzzzzzzzzzzzzz_negociacao.sql
- Checklist 2 — Implementação e atualizações do software · Responsável: Emmanuel
- Checklist 1 — CNPJ e integrações · Responsável: Hugo
- Checklist 3 — Planejamento tributário e operação no CNPJ · Responsável: Hugo
- Objetivo
- m/page.tsx
- 05-decisoes-abertas.md
- private.registrar_venda_caixa

## God Nodes (most connected - your core abstractions)
1. `criarClienteServidor()` - 253 edges
2. `public.lojas` - 169 edges
3. `public.pedidos` - 142 edges
4. `contextoLoja` - 130 edges
5. `public.marcas` - 129 edges
6. `salvando()` - 127 edges
7. `formatarReais()` - 121 edges
8. `next` - 96 edges
9. `react` - 86 edges
10. `public.produtos` - 81 edges

## Surprising Connections (you probably didn't know these)
- `A. Processo e base` --references--> `main()`  [INFERRED]
  docs/planejamento/checklists/emmanuel-software.md → packages/agente/src/main.ts
- `D-011 Pedido agendado e taxa por bairro no painel` --references--> `taxaDoBairro()`  [INFERRED]
  docs/decisoes.md → packages/core/src/agendamento.ts
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

## Communities (161 total, 22 thin omitted)

### Community 0 - "importar-nfe.tsx"
Cohesion: 0.16
Nodes (24): importarNFe(), vinculosFornecedor(), cnpjTexto(), dataTexto(), ImportarNFe(), lerFator(), Linha, D-036 · Estoque: entrada por NF-e e baixa pela ficha técnica (+16 more)

### Community 1 - "20261020000001_base.sql"
Cohesion: 0.09
Nodes (27): grupos_acesso_atualizado, grupos_acesso_auditar, grupos_acesso_validar, lojas_atualizado, lojas_auditar, marcas_atualizado, marcas_auditar, marcas_loja_idx (+19 more)

### Community 2 - "gestao/page.tsx"
Cohesion: 0.14
Nodes (21): EscopoCustos, Aba, ABAS, dynamic, Gestao(), brl(), ler(), Linha (+13 more)

### Community 3 - "main.ts"
Cohesion: 0.13
Nodes (28): acharWindows(), alcance(), argumento(), ARQ_CONFIG, ARQ_LOG, atualizarSePrecisar(), Config, Cupom (+20 more)

### Community 4 - "criarClienteServidor"
Cohesion: 0.07
Nodes (44): GET(), POST(), carregar(), dynamic, generateMetadata(), Grupo, PaginaGrupo(), cadastrar() (+36 more)

### Community 5 - "20261021000014_caixa.sql"
Cohesion: 0.12
Nodes (26): caixa_movimentos_sessao_idx, caixa_sessoes_auditar, caixa_sessoes_loja_idx, caixa_sessoes_uma_aberta_idx, caixas_auditar, caixas_nome_idx, lojas_caixa_inicial, pedidos_caixa_idx (+18 more)

### Community 6 - "Banco: impressão"
Cohesion: 0.06
Nodes (46): impressao_config_auditar, impressao_destinos_loja_idx, impressoes_loja_idx, impressoes_pedido_idx, impressoes_pendentes_idx, impressoras_auditar, impressoras_nome_idx, pedidos_imprimir_ao_aceitar (+38 more)

### Community 7 - "cadastro/actions.ts"
Cohesion: 0.10
Nodes (15): cadastrarRestaurante(), conferirEtapa(), DadosCadastro, montarLojaDoCadastro(), PedidoDeLoja, verificarSlug(), Cadastro(), dynamic (+7 more)

### Community 8 - "Banco: estoque"
Cohesion: 0.10
Nodes (30): estoque_mov_estoque_idx, estoque_mov_insumo_idx, estoque_mov_pedido_idx, fichas_opcao_idx, fichas_produto_idx, insumos_estoque_idx, pedidos_estoque, private.mover_estoque() (+22 more)

### Community 9 - "API aberta e MCP (rotas)"
Cohesion: 0.08
Nodes (33): DELETE, POST(), DELETE, POST(), GET(), OPTIONS, GET(), OPTIONS (+25 more)

### Community 10 - "salvando"
Cohesion: 0.07
Nodes (50): ConfigImpressao, DadosImpressora, excluirImpressora(), gerarCodigoAgente(), imprimirPedido(), imprimirTeste(), marcarImpressao(), msg() (+42 more)

### Community 11 - "relatorios/page.tsx"
Cohesion: 0.09
Nodes (29): Aba, ABAS, Cancelado, Cor, CORES_BARRA, corTempo(), dataBR(), dynamic (+21 more)

### Community 12 - "20261028000040_api_webhooks.sql"
Cohesion: 0.14
Nodes (20): private.total_contagem(), pedidos_webhooks, private.disparar_webhook(), private.loja_da_chave(), private.processar_webhooks(), private.webhooks_pedido(), public.api_chaves, public.api_estoque() (+12 more)

### Community 13 - "programa.tsx"
Cohesion: 0.12
Nodes (33): ajustarSaldo(), buscarSaldos(), copiarPrograma(), excluirRecompensa(), extratoCliente(), R, salvarConfigFidelidade(), salvarRecompensa() (+25 more)

### Community 14 - "web/package.json"
Cohesion: 0.06
Nodes (34): config, PUBLICAS, dependencies, jsqr@1.4.0, next@^15.5.9, react@^19.2.1, react-dom@^19.2.1, @res/core@* (+26 more)

### Community 15 - "CI (testes automáticos)"
Cohesion: 0.07
Nodes (34): name, runs-on, services, steps, DATABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, POSTGRES_PASSWORD (+26 more)

### Community 16 - "app-motoboy.tsx"
Cohesion: 0.14
Nodes (27): despachar(), entregar(), PlanoRota, dynamic, metadata, PaginaDespacho(), Acerto(), AppMotoboy() (+19 more)

### Community 17 - "public.clientes"
Cohesion: 0.14
Nodes (16): clientes_auditar, clientes_grupo_nome_idx, pedidos_cliente_idx, pedidos_registra_cliente, private.grupo_da_loja(), private.pedido_registra_cliente(), public.buscar_clientes(), public.cliente_enderecos (+8 more)

### Community 18 - "20261106230000_marketplace_negociacao.sql"
Cohesion: 0.22
Nodes (8): marketplace_negociacoes_abertas, marketplace_negociacoes_pedido, private.cancelar_pelo_marketplace(), private.marketplace_tique(), private.receber_negociacao(), public.marketplace_negociacoes, public.responder_negociacao(), public.simular_negociacao_marketplace()

### Community 19 - "Decisões de arquitetura — RES"
Cohesion: 0.05
Nodes (36): D-002 Modelo multiloja: Loja → Marcas, D-003 Regras de cadastro valem no banco e no formulário, D-004 Auditoria calculada no servidor, D-005 Operações compostas são atômicas, D-006 Gravar só em ação explícita, D-007 Texto em UTF-8 completo, D-008 Nenhum segredo de integração no navegador, D-009 Preço de itens com grupos (decisão provisória, Q-009) (+28 more)

### Community 20 - "gestao-lojas.tsx"
Cohesion: 0.26
Nodes (14): convidar(), criarCardapio(), criarLoja(), definirCidade(), msg(), R, CartaoLoja(), Conta (+6 more)

### Community 21 - "gestao.ts"
Cohesion: 0.22
Nodes (18): salvarEmpresa(), dias(), Documento(), dynamic, DadosEmpresa(), BotaoImprimir(), cnpjValido(), dataBr() (+10 more)

### Community 22 - "contextoLoja"
Cohesion: 0.10
Nodes (47): conectarMercadoPago(), criarChaveApi(), desconectarMercadoPago(), excluirWebhook(), mpAceitarAoPagar(), R, removerIntegracao(), revogarChaveApi() (+39 more)

### Community 23 - "salvando"
Cohesion: 0.17
Nodes (16): ajustarEntrega(), CartaoMotoboy(), FechamentoMotoboys(), FONTE, hora(), LinhaEntrega(), Numero(), Total (+8 more)

### Community 24 - "novo-pedido.tsx"
Cohesion: 0.06
Nodes (69): buscarClientes(), exportarClientes(), listarClientes(), salvarCliente(), Clientes(), dynamic, autorizarDesconto(), dadosNovoPedido() (+61 more)

### Community 25 - "Promoções e cupons (tela)"
Cohesion: 0.10
Nodes (45): agenda(), alternarCupom(), alternarFreteGratis(), CupomForm, excluirCupom(), excluirFreteGratis(), excluirPromoCategoria(), fim() (+37 more)

### Community 26 - "quadro-pedidos.tsx"
Cohesion: 0.11
Nodes (36): cuponsPendentes(), criarPedido(), definirAceiteAutomatico(), definirMovimento(), definirProntoAuto(), marcarAviso(), marcarPago(), mensagem() (+28 more)

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
Cohesion: 0.10
Nodes (39): Cardapio(), dynamic, AjusteProduto, copiarParaEvento(), criarEvento(), msg(), R, refrescar() (+31 more)

### Community 31 - "cardapio/actions.ts"
Cohesion: 0.10
Nodes (53): alterarDisponibilidade(), CategoriaOrigem, criarProduto(), definirFoto(), definirFotoOpcao(), definirGruposDoProduto(), definirProdutosDoGrupo(), desvincularGrupo() (+45 more)

### Community 32 - "cardapio-cliente.tsx"
Cohesion: 0.08
Nodes (53): situacaoPedidos(), carregar(), dynamic, generateMetadata(), PaginaCardapio(), CardapioCliente(), ETIQUETA, Extras() (+45 more)

### Community 33 - "next"
Cohesion: 0.14
Nodes (25): AoVivo, AreaForm, calcularKmBairro(), FaixaForm, localizarLoja(), MotoboyAoVivo, R, salvarAreas() (+17 more)

### Community 34 - "Workflow do agente de impressão"
Cohesion: 0.09
Nodes (21): GH_TOKEN, runs-on, steps, jobs, exe, name, on, push (+13 more)

### Community 35 - "cupom.ts"
Cohesion: 0.12
Nodes (29): PedidoCliente, NovoPedido, colunasNavegador(), CSS_CUPOM, cupomHtml(), esc(), imprimirNoNavegador(), linhasDoCupom() (+21 more)

### Community 36 - "acompanhar-pedido.tsx"
Cohesion: 0.11
Nodes (29): POST(), conferirPixMercadoPago(), pixMercadoPago(), dynamic, metadata, PaginaAcompanhar(), AcompanharPedido(), ExtrasPedido (+21 more)

### Community 37 - "comecar/actions.ts"
Cohesion: 0.18
Nodes (20): abrirCardapio(), concluirPrimeirosPassos(), fim(), R, usarCardapioExemplo(), Comecar(), dynamic, PrimeirosPassos() (+12 more)

### Community 38 - "preco.ts"
Cohesion: 0.14
Nodes (24): calcularCombo(), PassoCombo, precoSeparado(), LinhaTotal, Totais, calcularItem(), ErroEscolha, grupoVisivel() (+16 more)

### Community 39 - "painel-caixa.tsx"
Cohesion: 0.09
Nodes (48): abrirCaixa(), fecharCaixa(), movimentar(), msg(), R, salvarCaixa(), vincularSemCaixa(), dynamic (+40 more)

### Community 40 - "Configuração TypeScript"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 41 - "painel/scripts/ajustar-android.mjs"
Cohesion: 0.20
Nodes (8): adapt, app, g, gradle, m, man, res, run

### Community 42 - "Banco: Mercado Pago"
Cohesion: 0.16
Nodes (13): mp_pagamentos_pedido_idx, public.desconectar_mp(), public.mp_contas, public.mp_pagamentos, public.mp_status(), public.salvar_mp(), public.mp_aceitar_ao_pagar(), public.mp_status() (+5 more)

### Community 43 - "motoboy/package.json"
Cohesion: 0.14
Nodes (17): dependencies, @capacitor/android@6.2.0, @capacitor/app@6.0.2, @capacitor/cli@6.2.0, @capacitor-community/background-geolocation@1.2.26, @capacitor/core@6.2.0, description, @capacitor/android (+9 more)

### Community 44 - "resultados.tsx"
Cohesion: 0.12
Nodes (25): saldoDoCliente(), FidelidadeBalcao(), DIAS, FAIXA, MEC, ORIGEM, pct(), PERFIL (+17 more)

### Community 45 - "Grupo 45: package.json"
Cohesion: 0.14
Nodes (17): description, devDependencies, esbuild@0.24.0, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, tsx, @types/node (+9 more)

### Community 46 - "Grupo 46: package.json"
Cohesion: 0.13
Nodes (17): description, devDependencies, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, exports, tsx, @types/node (+9 more)

### Community 47 - "motoboy/scripts/ajustar-android.mjs"
Cohesion: 0.17
Nodes (11): adapt, app, g, gradle, m, man, permissoes, res (+3 more)

### Community 48 - "estoque/page.tsx"
Cohesion: 0.13
Nodes (27): copiarFicha(), dynamic, Estoque(), dataCurta(), Fechamento(), pctTexto(), somaMes(), Alvo (+19 more)

### Community 49 - "escpos.ts"
Cohesion: 0.29
Nodes (9): codificar(), CP850, CP860, ESC_T, Pagina, semAcento(), ConfigImpressora, gerarEscPos() (+1 more)

### Community 50 - "99zzzzzzzz_entregas_cliente.sql"
Cohesion: 0.43
Nodes (6): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida, tok

### Community 51 - "public.opcoes"
Cohesion: 0.05
Nodes (77): complementos_loja_idx, grupos_opcoes_loja_idx, opcoes_grupo_idx, private.setor_exige_marca(), produto_grupos_grupo_idx, produtos_loja_setor_idx, public.complementos, public.criar_grupo_vinculado() (+69 more)

### Community 52 - "ifood.ts"
Cohesion: 0.05
Nodes (63): dynamic, GET(), POST(), dynamic, POST(), responderNegociacao(), dynamic, Pedidos() (+55 more)

### Community 53 - "saida.ts"
Cohesion: 0.20
Nodes (9): atualizarWindows(), caminhoScript(), hostPorta(), imprimirRede(), imprimirWindows(), listarImpressorasWindows(), powershell(), PS_RAW (+1 more)

### Community 54 - "beefood_para_res.py"
Cohesion: 0.33
Nodes (3): converter(), limpa(), L()

### Community 55 - "resumo/page.tsx"
Cohesion: 0.20
Nodes (19): Composicao, ComposicaoVendas(), dataBR(), dynamic, Kpi(), Metricas, PRESETS, Resumo (+11 more)

### Community 56 - "[slug]/actions.ts"
Cohesion: 0.17
Nodes (18): calcularEntregaKm(), conferirCupom(), EntregaKm, enviarPedido(), FaixaKm, programaFidelidade(), saldoFidelidade(), UsoFidelidade (+10 more)

### Community 58 - "gestao/actions.ts"
Cohesion: 0.33
Nodes (10): excluirRegistro(), FuncionarioForm, lojaGestor(), R, RegistroForm, salvarCustos(), salvarFuncionario(), salvarModoGrupo() (+2 more)

### Community 59 - "privacidade/page.tsx"
Cohesion: 0.29
Nodes (3): metadata, metadata, VERSAO_TERMOS

### Community 60 - "20261027000032_fidelidade.sql"
Cohesion: 0.07
Nodes (37): fidelidade_mov_cliente_idx, fidelidade_mov_grupo_idx, fidelidade_mov_pedido_idx, fidelidade_recompensas_grupo_idx, pedidos_fidelidade, private.expirar_fidelidade(), private.fidelidade_status(), private.recompensas_json() (+29 more)

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
Cohesion: 0.13
Nodes (14): pedidos.qr_token (/m/d/<código>), Colocar no ar, Estrutura, GitHub Actions CI (rules, db, build), O que já funciona, packages/core (business rules TS), Pacotes (equipe RES), Roadmap stages 3c-7 and integrations (+6 more)

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
Nodes (31): ligarFicha(), alterarFuncao(), cancelarConvite(), criarUsuarioCaixa(), definirAtivo(), trocarSenhaUsuario(), Assistente(), Cartao (+23 more)

### Community 74 - "painel/package.json"
Cohesion: 0.16
Nodes (15): dependencies, @capacitor/android@6.2.0, @capacitor/app@6.0.2, @capacitor/cli@6.2.0, @capacitor/core@6.2.0, description, @capacitor/android, @capacitor/app (+7 more)

### Community 75 - "Grupo 75: 99z_entregas_km.sql"
Cohesion: 0.39
Nodes (7): ids, pg_temp.como(), pg_temp.id(), pg_temp.token(), pg_temp.v(), saida, tokens

### Community 76 - "Grupo 76: 99zzzzzzzzzzzz_estoque.sql"
Cohesion: 0.33
Nodes (7): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), s1, s2, saida

### Community 77 - "Grupo 77: 99zzzzzzzzzzzzzz_api.sql"
Cohesion: 0.39
Nodes (7): chaves, ids, pg_temp.como(), pg_temp.id(), pg_temp.k(), pg_temp.v(), saida

### Community 78 - "public.marcas"
Cohesion: 0.05
Nodes (46): public.marcas, public.criar_produto(), areas_entrega_auditar, marca_horarios_auditar, private.marca_aberta(), public.areas_entrega, public.cardapio_publico(), public.marca_horarios (+38 more)

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
Cohesion: 0.05
Nodes (56): custos_auditar, custos_loja_idx, funcionario_registros_idx, funcionario_registros_numero, funcionarios_loja_idx, gestao_empresa_auditar, private.contadores_registro, private.numerar_registro() (+48 more)

### Community 84 - "50_multilojas.sql"
Cohesion: 0.47
Nodes (4): ids, pg_temp.como(), pg_temp.id(), saida

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

### Community 91 - "dados-empresa.tsx"
Cohesion: 0.60
Nodes (4): salvarDadosEmpresa(), CamposEmpresaValor, DadosEmpresa(), FormEmpresa()

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

### Community 99 - "m/actions.ts"
Cohesion: 0.23
Nodes (17): chegadas(), espera(), medirEntrega(), montar(), planejarRota(), Achado, distanciaRota(), EnderecoEntrega (+9 more)

### Community 101 - "insumos.tsx"
Cohesion: 0.49
Nodes (9): Ajuste(), confirmarExclusao(), FormInsumo(), LinhaInsumo(), ListaInsumos(), num(), SIT, n() (+1 more)

### Community 102 - "ao-vivo.tsx"
Cohesion: 0.17
Nodes (15): CORES, haQuanto(), iniciais(), MapaAoVivo(), segundos(), cap(), Capacitor, EstadoRastreio (+7 more)

### Community 103 - "gestao.ts"
Cohesion: 0.10
Nodes (35): DadosGrupo, salvarDetalheOpcao(), salvarGrupo(), salvarSetor(), BotaoExcluir(), DetalheOpcao(), ModoEstoque(), FORMACOES (+27 more)

### Community 104 - "meta-mes.tsx"
Cohesion: 0.27
Nodes (10): salvarMeta(), ler(), MESES, MetaMes(), pct(), calcularMeta(), DadosMeta, diaUTC() (+2 more)

### Community 107 - "funcionarios.tsx"
Cohesion: 0.10
Nodes (23): espera(), LoteSugerido, sugerirLotes(), SugestaoLoja, SugestaoLotes(), D-027 · Rota sugerida quando o motoboy sai com várias entregas, D-028 · Cliente acompanha a entrega, prazo por loja, alerta e lotes na expedição, tempos e atrasos, Ponto (+15 more)

### Community 116 - "ifood.tsx"
Cohesion: 0.29
Nodes (14): desligarLojaIfood(), fim(), ligarItemIfood(), R, salvarLojaIfood(), simularEventoIfood(), simularNegociacaoIfood(), simularPedidoIfood() (+6 more)

### Community 117 - "sabores-pizza.tsx"
Cohesion: 0.26
Nodes (14): salvarInsumo(), amigavel(), Como(), diametro(), EditorSabor(), fmt(), Linha, num() (+6 more)

### Community 119 - "entregas/page.tsx"
Cohesion: 0.24
Nodes (11): rastreioAoVivo(), diaDoTurno(), dynamic, Entregas(), BairrosEntregas(), diaCurto(), pct(), PERIODOS (+3 more)

### Community 120 - "empresa.ts"
Cohesion: 0.19
Nodes (24): consultarCep(), consultarCnpj(), CamposEmpresa(), cepValido(), cnpjValido(), COMO_CONHECEU, cpfValido(), dadosDaReceita() (+16 more)

### Community 121 - "99zzzzzzzzzzzzzzzzzzzzz_evento.sql"
Cohesion: 0.32
Nodes (5): ids, pg_temp.id(), pg_temp.v(), quando, saida

### Community 122 - "estoque/actions.ts"
Cohesion: 0.33
Nodes (9): ajustarEstoque(), definirModoEstoque(), excluirInsumo(), feito(), ItemImportar, R, salvarFatoresSabor(), salvarFicha() (+1 more)

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

### Community 131 - "lojas/page.tsx"
Cohesion: 0.19
Nodes (9): salvarPermissoesEquipe(), ABAS, dynamic, Lojas(), LojaEquipe, AjusteCaixa(), Funcoes(), QuadroFuncoes() (+1 more)

### Community 132 - "99zzzzzzzzzzzzzzzzzzzzzzz_financeiro.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 134 - "20261021000008_multilojas.sql"
Cohesion: 0.09
Nodes (31): contas_atualizado, contas_proteger_plano, contas_titulares_user_idx, lojas_conta_idx, lojas_limite, marcas_limite, pedidos_loja_criado_idx, private.e_titular() (+23 more)

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
Cohesion: 0.35
Nodes (9): chaveBairro(), dataNoFuso(), DIAS_CURTOS, faseAgendamento, FOLGA_AGENDADO_MIN, horaNoFuso(), partes(), rotuloHorario() (+1 more)

### Community 139 - "99zzzzzzz_rota.sql"
Cohesion: 0.43
Nodes (6): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida, tok

### Community 140 - "public"
Cohesion: 0.08
Nodes (28): cupons_auditar, cupons_codigo_idx, pedidos_cupom_idx, private.agenda_vale(), private.aplicar_cupom(), private.cupom_da_loja(), private.desconto_categoria_pct(), private.desconto_cupom() (+20 more)

### Community 141 - "pg_temp.como"
Cohesion: 0.60
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 142 - "auth.users"
Cohesion: 0.20
Nodes (5): lojas_cnpj_idx, lojas_cpf_idx, public.criar_loja_cadastro(), public.salvar_dados_empresa(), auth.users

### Community 143 - "movimentos.tsx"
Cohesion: 0.33
Nodes (8): buscarMovimentos(), FiltroMovimentos, hoje(), menos(), Movimentacoes(), quando(), ROTULO, TIPOS

### Community 145 - "public.lojas"
Cohesion: 0.03
Nodes (109): public.lojas, pedido_eventos_pedido_idx, pedido_item_opcoes_item_idx, pedido_itens_pedido_idx, pedidos_atualizado, pedidos_loja_status_idx, private.contador_pedidos, public.criar_pedido() (+101 more)

### Community 146 - "pg_temp.como"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 147 - "contagem.tsx"
Cohesion: 0.33
Nodes (8): salvarContagem(), Contagem(), NovoItem(), num(), Origem, ContagemPainel, UnidadeEstoque, UNIDADES_ESTOQUE

### Community 149 - "pixCopiaECola"
Cohesion: 0.39
Nodes (7): campo(), crc16Pix(), FORMATOS_RASTREAMENTO, normalizarChavePix(), pixCopiaECola(), semAcento(), TipoChavePix

### Community 150 - "planejamento/README.md"
Cohesion: 0.22
Nodes (4): Checklists por área (nosso "Monday"), Regras do quadro, Como usamos, Planejamento do RES

### Community 151 - "99zzzzzzzzzzzzzzzzzzzzzzzzz_marketplace.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 153 - "99zzzzz_clientes.sql"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 154 - "pedido.ts"
Cohesion: 0.33
Nodes (9): acaoAvancar(), ErroPedido, proximosStatus(), STATUS_ROTULO, tempoDecorrido(), TIPO_ROTULO, totalizar(), transicaoValida() (+1 more)

### Community 155 - "Estado atual por área"
Cohesion: 0.22
Nodes (9): Base e infraestrutura, Cardápio e pedidos, Clientes e marketing, Documentação e processo, Estado atual por área, Gestão e relatórios, Integrações e API, Operação (+1 more)

### Community 157 - "Integrações com marketplaces"
Cohesion: 0.29
Nodes (7): 1. O que o RES precisa ter antes de qualquer marketplace, 2. iFood, 3. Aiqfome, 4. Delivery Much, 5. Outros (decidir em Q-2), 6. Riscos conhecidos, Integrações com marketplaces

### Community 158 - "Pendências"
Cohesion: 0.29
Nodes (7): Agora (próximas 2 semanas), Concluídas, Empresa (CNPJ e tributário) — detalhe em checklists/hugo-cnpj-e-integracoes.md e checklists/hugo-tributario.md, Frentes já previstas no README (fora dos marketplaces), Integrações (detalhe em 03-integracoes-marketplaces.md), Pendências, Piloto com restaurante real

### Community 159 - "pg_temp.como"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 160 - "20261101000067_cupom_area_frete.sql"
Cohesion: 0.29
Nodes (7): frete_gratis_auditar, frete_gratis_loja_idx, private.base_cupom(), private.regra_frete_gratis(), public.frete_gratis, public.frete_gratis_publico(), public.validar_cupom()

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

### Community 167 - "m/page.tsx"
Cohesion: 0.50
Nodes (4): painelMotoboy(), dynamic, maxDuration, Motoboy()

## Knowledge Gaps
- **9 isolated node(s):** `pedidos.qr_token (/m/d/<código>)`, `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `GitHub Actions CI (rules, db, build)`, `Roadmap stages 3c-7 and integrations`, `supabase/migrations (Postgres RLS, audit, atomic ops)` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 809 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `criarClienteServidor` to `gestao/page.tsx`, `lojas/page.tsx`, `cadastro/actions.ts`, `API aberta e MCP (rotas)`, `salvando`, `relatorios/page.tsx`, `programa.tsx`, `web/package.json`, `app-motoboy.tsx`, `gestao-lojas.tsx`, `gestao.ts`, `contextoLoja`, `novo-pedido.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `financeiro/page.tsx`, `evento.tsx`, `cardapio/actions.ts`, `cardapio-cliente.tsx`, `next`, `acompanhar-pedido.tsx`, `comecar/actions.ts`, `painel-caixa.tsx`, `resultados.tsx`, `estoque/page.tsx`, `ifood.ts`, `resumo/page.tsx`, `gestao/actions.ts`, `privacidade/page.tsx`, `app/layout.tsx`, `equipe.tsx`, `gestao.ts`, `meta-mes.tsx`, `ifood.tsx`, `sabores-pizza.tsx`, `entregas/page.tsx`, `estoque/actions.ts`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **What connects `pedidos.qr_token (/m/d/<código>)`, `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `GitHub Actions CI (rules, db, build)` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `20261020000001_base.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.09243697478991597 - nodes in this community are weakly interconnected._
- **Why does `formatarReais()` connect `acompanhar-pedido.tsx` to `importar-nfe.tsx`, `grafico-lojas.tsx`, `criarClienteServidor`, `relatorios/page.tsx`, `programa.tsx`, `movimentos.tsx`, `app-motoboy.tsx`, `contagem.tsx`, `contextoLoja`, `salvando`, `novo-pedido.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `cardapio/actions.ts`, `cardapio-cliente.tsx`, `next`, `cupom.ts`, `preco.ts`, `painel-caixa.tsx`, `resultados.tsx`, `estoque/page.tsx`, `ifood.ts`, `resumo/page.tsx`, `[slug]/actions.ts`, `insumos.tsx`, `gestao.ts`, `meta-mes.tsx`, `ifood.tsx`, `sabores-pizza.tsx`, `grafico-dias.tsx`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Should `gestao/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14130434782608695 - nodes in this community are weakly interconnected._
- **Why does `criarClienteServidor()` connect `criarClienteServidor` to `importar-nfe.tsx`, `gestao/page.tsx`, `lojas/page.tsx`, `cadastro/actions.ts`, `salvando`, `relatorios/page.tsx`, `programa.tsx`, `movimentos.tsx`, `app-motoboy.tsx`, `contagem.tsx`, `gestao-lojas.tsx`, `gestao.ts`, `contextoLoja`, `salvando`, `novo-pedido.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `financeiro/page.tsx`, `evento.tsx`, `cardapio/actions.ts`, `cardapio-cliente.tsx`, `next`, `acompanhar-pedido.tsx`, `comecar/actions.ts`, `m/page.tsx`, `painel-caixa.tsx`, `resultados.tsx`, `estoque/page.tsx`, `ifood.ts`, `resumo/page.tsx`, `[slug]/actions.ts`, `gestao/actions.ts`, `equipe.tsx`, `dados-empresa.tsx`, `m/actions.ts`, `gestao.ts`, `meta-mes.tsx`, `funcionarios.tsx`, `ifood.tsx`, `sabores-pizza.tsx`, `entregas/page.tsx`, `estoque/actions.ts`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Should `main.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1310344827586207 - nodes in this community are weakly interconnected._