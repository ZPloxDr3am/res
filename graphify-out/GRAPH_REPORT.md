# Graph Report - res  (2026-11-08)

## Corpus Check
- 391 files · ~356,071 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 3226 nodes · 8398 edges · 164 communities (144 shown, 20 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 54 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f14aa557`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- equipe.tsx
- 20261020000001_base.sql
- cardapio-cliente.tsx
- main.ts
- next
- 20261021000014_caixa.sql
- Banco: impressão
- mercadopago.ts
- Banco: estoque
- API aberta e MCP (rotas)
- salvando
- relatorios/page.tsx
- funcionarios.tsx
- index.ts
- web/package.json
- CI (testes automáticos)
- app-motoboy.tsx
- 99zzzzz_clientes.sql
- editor-cardapio.tsx
- Decisões de arquitetura — RES
- mcp.ts
- foto-produto.tsx
- contextoLoja
- salvando
- novo-pedido.tsx
- Promoções e cupons (tela)
- quadro-pedidos.tsx
- steps
- financeiro/page.tsx
- Workflow do APK do motoboy
- evento.tsx
- criarClienteServidor
- publico.ts
- next
- Workflow do agente de impressão
- cupom.ts
- form-grupo.tsx
- conta-cliente.tsx
- preco.ts
- painel-caixa.tsx
- Configuração TypeScript
- ifood.ts
- Banco: Mercado Pago
- motoboy/package.json
- gestao/actions.ts
- Grupo 45: package.json
- Grupo 46: package.json
- motoboy/scripts/ajustar-android.mjs
- formatarReais
- escpos.ts
- 99zzzzzzzz_entregas_cliente.sql
- public.produtos
- negociacoes-ifood.tsx
- rastreador.tsx
- beefood_para_res.py
- resumo/page.tsx
- anon
- graphify
- lojas/actions.ts
- dependencies
- 20261027000032_fidelidade.sql
- saida.ts
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
- gestao/page.tsx
- painel/package.json
- Grupo 75: 99z_entregas_km.sql
- Grupo 76: 99zzzzzzzzzzzz_estoque.sql
- Grupo 77: 99zzzzzzzzzzzzzz_api.sql
- acompanhar-pedido.tsx
- Grupo 79: 99zzzzzzzzz_segmentos.sql
- Grupo 80: 90_agente.sql
- Grupo 81: 95_impressora_grupo.sql
- Grupo 82: 99zzzzzz_rastreio.sql
- criarClienteServidor
- painel/scripts/ajustar-android.mjs
- Grupo 85: 99zzzzzzzzzzzzz_aplicativos.sql
- Grupo 86: README.md
- Grupo 87: decisoes.md
- 99zzzzzzzzzzzzzzzz_vitrine.sql
- Grupo 89: 30_cardapio_digital.sql
- Grupo 90: 60_agendamento.sql
- 20261101000067_cupom_area_frete.sql
- Grupo 93: 99zzzzzzzzzzzzzzz_mercadopago.sql
- lancamentos.tsx
- 99zzzzzzzzzzzzzzzzzzz_gestao.sql
- Grupo 96: 70_caixa.sql
- 99zzzzzzzzzzzzzzzzz_taxa_km.sql
- lista-clientes.tsx
- negociacoes-ifood.tsx
- Grupo 100: tempos_ajuste.sql
- pg_temp.como
- tempo-real.tsx
- form-setor.tsx
- meta-mes.tsx
- Grupo 105: next.config.mjs
- Grupo 106: vercel.json
- funcionarios.tsx
- Grupo 108: test-db.sh
- ifood.tsx
- marketplace.ts
- [slug]/page.tsx
- gestao/page.tsx
- index.ts
- 99zzzzzzzzzzzzzzzzzzzzz_evento.sql
- grafico-lojas.tsx
- nav-painel.tsx
- grafico-dias.tsx
- 99zzzzzzzzzzzzzzzzzzzz_equipe.sql
- form-delivery.tsx
- public
- public.pedidos
- expedicao.ts
- 99zzzzzzzzzzzzzzzzzzzzzzz_financeiro.sql
- ref_node_assert
- 20261021000008_multilojas.sql
- 99zzzzzzzzzzzzzzzzzzzzzz_quadro.sql
- 20261021000007_cardapio_biblioteca.sql
- 99_motoboy.sql
- agendamento.ts
- 99zzzzzzz_rota.sql
- despacho.tsx
- pg_temp.como
- editor-combo.tsx
- promocao.test.ts
- impressoras.ts
- public.lojas
- 50_multilojas.sql
- mcp/route.ts
- app/layout.tsx
- m/page.tsx
- planejamento/README.md
- 99zzzzzzzzzzzzzzzzzzzzzzzzz_marketplace.sql
- scripts
- pedido.ts
- Estado atual por área
- Integrações com marketplaces
- Pendências
- 99zzzzzzzzzzzzzzzzzzzzzzzzzz_negociacao.sql
- Checklist 2 — Implementação e atualizações do software · Responsável: Emmanuel
- Checklist 1 — CNPJ e integrações · Responsável: Hugo
- Checklist 3 — Planejamento tributário e operação no CNPJ · Responsável: Hugo
- Objetivo
- 05-decisoes-abertas.md
- 40_cardapio_biblioteca.sql

## God Nodes (most connected - your core abstractions)
1. `criarClienteServidor()` - 254 edges
2. `public.lojas` - 169 edges
3. `public.pedidos` - 142 edges
4. `contextoLoja` - 130 edges
5. `public.marcas` - 129 edges
6. `salvando()` - 128 edges
7. `formatarReais()` - 121 edges
8. `next` - 96 edges
9. `react` - 86 edges
10. `public.produtos` - 81 edges

## Surprising Connections (you probably didn't know these)
- `A. Processo e base` --references--> `main()`  [INFERRED]
  docs/planejamento/checklists/emmanuel-software.md → packages/agente/src/main.ts
- `D-022 Combos com escolhas e categoria de up-sell` --references--> `calcularCombo()`  [INFERRED]
  docs/decisoes.md → packages/core/src/combo.ts
- `D-023 % por categoria, cupons e desconto no balcão com limite` --references--> `precoBase()`  [INFERRED]
  docs/decisoes.md → packages/core/src/preco.ts
- `Ambiente no ar (piloto)` --references--> `main()`  [INFERRED]
  README.md → packages/agente/src/main.ts
- `D-011 Pedido agendado e taxa por bairro no painel` --references--> `taxaDoBairro()`  [INFERRED]
  docs/decisoes.md → packages/core/src/agendamento.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Rules duplicated in core and DB with shared test cases** — docs_decisoes_d_021_cardapio_cards_promo, docs_decisoes_d_022_combos_upsell, docs_decisoes_d_029_segmentos_clientes, docs_decisoes_d_030_telefone_nono_digito, docs_decisoes_d_031_fidelidade_grupo, docs_decisoes_core_db_parity [EXTRACTED 1.00]
- **Motoboy delivery flow (QR dispatch, app, tracking, routing)** — docs_decisoes_d_017_app_motoboy_qr, docs_decisoes_d_018_comanda_motoboy_pago, docs_decisoes_d_019_app_android_leitor_qr, docs_decisoes_d_026_rastreio_motoboys, docs_decisoes_d_027_rota_sugerida, apps_mobile_motoboy_readme_res_motoboy_android [INFERRED 0.85]
- **Stock management module (NF-e, recipes, counts, CMV)** — docs_decisoes_d_036_estoque_nfe_ficha, docs_decisoes_d_037_movimentacoes_estoque, docs_decisoes_d_038_meu_estoque_contagem, docs_decisoes_d_039_fechamento_cmv, docs_decisoes_d_040_ficha_sabor_pizza [INFERRED 0.85]

## Communities (164 total, 20 thin omitted)

### Community 0 - "equipe.tsx"
Cohesion: 0.16
Nodes (23): alterarFuncao(), cancelarConvite(), definirAtivo(), salvarPermissoesEquipe(), trocarSenhaUsuario(), Assistente(), CartaoAcesso(), Equipe() (+15 more)

### Community 1 - "20261020000001_base.sql"
Cohesion: 0.09
Nodes (28): grupos_acesso_atualizado, grupos_acesso_auditar, grupos_acesso_validar, lojas_atualizado, lojas_auditar, marcas_atualizado, marcas_auditar, marcas_loja_idx (+20 more)

### Community 2 - "cardapio-cliente.tsx"
Cohesion: 0.16
Nodes (23): calcularEntregaKm(), conferirCupom(), EntregaKm, enviarPedido(), FaixaKm, programaFidelidade(), saldoFidelidade(), FidelidadeCliente() (+15 more)

### Community 3 - "main.ts"
Cohesion: 0.13
Nodes (29): acharWindows(), alcance(), argumento(), ARQ_CONFIG, ARQ_LOG, atualizarSePrecisar(), atualizarWindows(), Config (+21 more)

### Community 4 - "next"
Cohesion: 0.10
Nodes (14): carregar(), dynamic, generateMetadata(), Grupo, PaginaGrupo(), cadastrar(), credenciais(), entrar() (+6 more)

### Community 5 - "20261021000014_caixa.sql"
Cohesion: 0.06
Nodes (48): caixa_movimentos_sessao_idx, caixa_sessoes_auditar, caixa_sessoes_loja_idx, caixa_sessoes_uma_aberta_idx, caixas_auditar, caixas_nome_idx, lojas_caixa_inicial, pedidos_caixa_idx (+40 more)

### Community 6 - "Banco: impressão"
Cohesion: 0.06
Nodes (48): impressao_config_auditar, impressao_destinos_loja_idx, impressoes_loja_idx, impressoes_pedido_idx, impressoes_pendentes_idx, impressoras_auditar, impressoras_nome_idx, pedidos_imprimir_ao_aceitar (+40 more)

### Community 7 - "mercadopago.ts"
Cohesion: 0.25
Nodes (11): POST(), conferirPixMercadoPago(), pixMercadoPago(), PagarPixMp(), atualizarPagamento(), conferirPix(), marcarPago(), Ped (+3 more)

### Community 8 - "Banco: estoque"
Cohesion: 0.07
Nodes (43): public.reordenar(), public.relatorio_entregas(), public.relatorio_fidelidade(), estoque_mov_estoque_idx, estoque_mov_insumo_idx, estoque_mov_pedido_idx, fichas_opcao_idx, fichas_produto_idx (+35 more)

### Community 9 - "API aberta e MCP (rotas)"
Cohesion: 0.16
Nodes (18): GET(), OPTIONS, GET(), OPTIONS, GET(), OPTIONS, GET(), OPTIONS (+10 more)

### Community 10 - "salvando"
Cohesion: 0.08
Nodes (51): ConfigImpressao, DadosImpressora, excluirImpressora(), gerarCodigoAgente(), imprimirPedido(), imprimirTeste(), marcarImpressao(), msg() (+43 more)

### Community 11 - "relatorios/page.tsx"
Cohesion: 0.09
Nodes (29): Aba, ABAS, Cancelado, Cor, CORES_BARRA, corTempo(), dataBR(), dynamic (+21 more)

### Community 12 - "funcionarios.tsx"
Cohesion: 0.26
Nodes (12): FuncionarioForm, criarUsuarioCaixa(), Cartao, SeloFicha(), Acesso, doFuncionario(), Funcionarios(), ModoAcesso (+4 more)

### Community 13 - "index.ts"
Cohesion: 0.07
Nodes (57): ajustarSaldo(), buscarSaldos(), excluirRecompensa(), extratoCliente(), R, saldoDoCliente(), salvarRecompensa(), diaDoTurno() (+49 more)

### Community 14 - "web/package.json"
Cohesion: 0.18
Nodes (14): devDependencies, @types/node@22.10.2, @types/qrcode@^1.5.5, @types/react@^19.2.0, @types/react-dom@^19.2.0, typescript@5.6.3, @types/node, typescript (+6 more)

### Community 15 - "CI (testes automáticos)"
Cohesion: 0.07
Nodes (34): name, runs-on, services, steps, DATABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, POSTGRES_PASSWORD (+26 more)

### Community 16 - "app-motoboy.tsx"
Cohesion: 0.17
Nodes (23): entregar(), PlanoRota, Acerto(), AppMotoboy(), Aviso, CartaoEntrega(), Leitor(), vibrar() (+15 more)

### Community 17 - "99zzzzz_clientes.sql"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 18 - "editor-cardapio.tsx"
Cohesion: 0.21
Nodes (19): criarProduto(), Resultado, AplicarGrupo(), EditorCardapio(), Marca, Painel, EditorProduto(), ETIQUETAS (+11 more)

### Community 19 - "Decisões de arquitetura — RES"
Cohesion: 0.06
Nodes (33): D-002 Modelo multiloja: Loja → Marcas, D-003 Regras de cadastro valem no banco e no formulário, D-004 Auditoria calculada no servidor, D-005 Operações compostas são atômicas, D-006 Gravar só em ação explícita, D-007 Texto em UTF-8 completo, D-008 Nenhum segredo de integração no navegador, D-009 Preço de itens com grupos (decisão provisória, Q-009) (+25 more)

### Community 20 - "mcp.ts"
Cohesion: 0.18
Nodes (12): DELETE, POST(), clienteApi(), DATA, Escopo, falha(), Ferramenta, FERRAMENTAS (+4 more)

### Community 21 - "foto-produto.tsx"
Cohesion: 0.29
Nodes (9): salvarVitrine(), Vitrine, FotoOpcao(), reduzir(), TIPOS, useEnviarFoto(), CORES, FormVitrine() (+1 more)

### Community 22 - "contextoLoja"
Cohesion: 0.11
Nodes (35): dynamic, PaginaAplicativos(), copiar(), ENDPOINTS, FormWebhook(), LinhaWebhook(), ListaChaves(), NovaChave() (+27 more)

### Community 23 - "salvando"
Cohesion: 0.22
Nodes (15): ajustarEntrega(), CartaoMotoboy(), FechamentoMotoboys(), FONTE, hora(), LinhaEntrega(), Numero(), Total (+7 more)

### Community 24 - "novo-pedido.tsx"
Cohesion: 0.15
Nodes (29): buscarClientes(), autorizarDesconto(), dynamic, PaginaNovoPedido(), GruposBalcao(), ItemCarrinho, lerCentavos(), Montador() (+21 more)

### Community 25 - "Promoções e cupons (tela)"
Cohesion: 0.10
Nodes (45): agenda(), alternarCupom(), alternarFreteGratis(), CupomForm, excluirCupom(), excluirFreteGratis(), excluirPromoCategoria(), fim() (+37 more)

### Community 26 - "quadro-pedidos.tsx"
Cohesion: 0.10
Nodes (39): criarPedido(), definirAceiteAutomatico(), definirMovimento(), definirProntoAuto(), definirQuadroTodas(), marcarAviso(), marcarPago(), mensagem() (+31 more)

### Community 27 - "steps"
Cohesion: 0.08
Nodes (24): runs-on, steps, GH_TOKEN, KS_B64, KS_PASS, jobs, apk, name (+16 more)

### Community 28 - "financeiro/page.tsx"
Cohesion: 0.08
Nodes (73): configCustos(), criarLancamento(), donoFin(), editarLancamento(), excluirLancamento(), gerarContasCustos(), lancarNfe(), marcarPago() (+65 more)

### Community 29 - "Workflow do APK do motoboy"
Cohesion: 0.08
Nodes (24): runs-on, steps, GH_TOKEN, KS_B64, KS_PASS, jobs, apk, name (+16 more)

### Community 30 - "evento.tsx"
Cohesion: 0.12
Nodes (34): AjusteProduto, copiarParaEvento(), criarEvento(), msg(), R, refrescar(), removerProdutoEvento(), salvarEvento() (+26 more)

### Community 31 - "criarClienteServidor"
Cohesion: 0.19
Nodes (25): alterarDisponibilidade(), CategoriaOrigem, definirFoto(), definirFotoOpcao(), definirGruposDoProduto(), definirProdutosDoGrupo(), desvincularGrupo(), duplicarGrupo() (+17 more)

### Community 32 - "publico.ts"
Cohesion: 0.13
Nodes (28): CardapioCliente(), Extras(), MaisInformacoes(), MontadorCombo(), resumoCombo(), resumoEscolhas(), useEsc(), acrescimo() (+20 more)

### Community 33 - "next"
Cohesion: 0.16
Nodes (24): AoVivo, AreaForm, calcularKmBairro(), FaixaForm, localizarLoja(), MotoboyAoVivo, R, salvarAreas() (+16 more)

### Community 34 - "Workflow do agente de impressão"
Cohesion: 0.09
Nodes (21): GH_TOKEN, runs-on, steps, jobs, exe, name, on, push (+13 more)

### Community 35 - "cupom.ts"
Cohesion: 0.13
Nodes (23): NovoPedido, D-014 Impressão: fila no banco, regras como no BeeFood, navegador até o agente chegar, D-015 Agente de impressão do Windows (RES Impressão), blocosCombo(), colunasLR(), CupomDados, CupomTeste, cupomTexto() (+15 more)

### Community 36 - "form-grupo.tsx"
Cohesion: 0.11
Nodes (27): DadosGrupo, salvarDetalheOpcao(), salvarGrupo(), DetalheOpcao(), FORMACOES, FormGrupo(), GrupoInicial, lerPreco() (+19 more)

### Community 37 - "conta-cliente.tsx"
Cohesion: 0.27
Nodes (9): situacaoPedidos(), Dados, guardarPedido(), lerPedidos(), MeusPedidos(), NavCliente(), PedidoGuardado, PerfilCliente() (+1 more)

### Community 38 - "preco.ts"
Cohesion: 0.17
Nodes (20): calcularCombo(), EscolhaPasso, PassoCombo, calcularItem(), ErroEscolha, grupoVisivel(), opcaoVisivel(), precoBase() (+12 more)

### Community 39 - "painel-caixa.tsx"
Cohesion: 0.09
Nodes (45): abrirCaixa(), fecharCaixa(), movimentar(), msg(), R, salvarCaixa(), vincularSemCaixa(), dynamic (+37 more)

### Community 40 - "Configuração TypeScript"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 41 - "ifood.ts"
Cohesion: 0.20
Nodes (17): dynamic, GET(), POST(), dynamic, POST(), assinaturaValida(), CAMINHO_ACAO, chamar() (+9 more)

### Community 42 - "Banco: Mercado Pago"
Cohesion: 0.16
Nodes (13): mp_pagamentos_pedido_idx, public.desconectar_mp(), public.mp_contas, public.mp_pagamentos, public.mp_status(), public.salvar_mp(), public.mp_aceitar_ao_pagar(), public.mp_status() (+5 more)

### Community 43 - "motoboy/package.json"
Cohesion: 0.14
Nodes (17): dependencies, @capacitor/android@6.2.0, @capacitor/app@6.0.2, @capacitor/cli@6.2.0, @capacitor-community/background-geolocation@1.2.26, @capacitor/core@6.2.0, description, @capacitor/android (+9 more)

### Community 44 - "gestao/actions.ts"
Cohesion: 0.36
Nodes (14): ligarFicha(), lojaGestor(), R, salvarCustos(), salvarEmpresa(), salvarFuncionario(), salvarRegistro(), vazio() (+6 more)

### Community 45 - "Grupo 45: package.json"
Cohesion: 0.14
Nodes (17): description, devDependencies, esbuild@0.24.0, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, tsx, @types/node (+9 more)

### Community 46 - "Grupo 46: package.json"
Cohesion: 0.13
Nodes (17): description, devDependencies, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, exports, tsx, @types/node (+9 more)

### Community 47 - "motoboy/scripts/ajustar-android.mjs"
Cohesion: 0.17
Nodes (11): adapt, app, g, gradle, m, man, permissoes, res (+3 more)

### Community 48 - "formatarReais"
Cohesion: 0.05
Nodes (101): ajustarEstoque(), buscarMovimentos(), copiarFicha(), definirModoEstoque(), excluirInsumo(), feito(), FiltroMovimentos, importarNFe() (+93 more)

### Community 49 - "escpos.ts"
Cohesion: 0.29
Nodes (9): codificar(), CP850, CP860, ESC_T, Pagina, semAcento(), ConfigImpressora, gerarEscPos() (+1 more)

### Community 50 - "99zzzzzzzz_entregas_cliente.sql"
Cohesion: 0.43
Nodes (6): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida, tok

### Community 51 - "public.produtos"
Cohesion: 0.05
Nodes (81): complementos_loja_idx, grupos_opcoes_loja_idx, opcoes_grupo_idx, private.setor_exige_marca(), produto_grupos_grupo_idx, produtos_loja_setor_idx, public.complementos, public.criar_grupo_vinculado() (+73 more)

### Community 52 - "negociacoes-ifood.tsx"
Cohesion: 0.16
Nodes (16): AcaoNegociacao, Alternativa, centavos(), descreverNegociacao(), disputaIfoodExemplo(), IfoodAlternativa, IfoodDisputa, MOTIVOS_NEGOCIACAO (+8 more)

### Community 53 - "rastreador.tsx"
Cohesion: 0.40
Nodes (5): cap(), Capacitor, EstadoRastreio, useRastreio(), Watcher

### Community 54 - "beefood_para_res.py"
Cohesion: 0.33
Nodes (3): converter(), limpa(), L()

### Community 55 - "resumo/page.tsx"
Cohesion: 0.20
Nodes (19): Composicao, ComposicaoVendas(), dataBR(), dynamic, Kpi(), Metricas, PRESETS, Resumo (+11 more)

### Community 56 - "anon"
Cohesion: 0.05
Nodes (56): custos_auditar, custos_loja_idx, funcionario_registros_idx, funcionario_registros_numero, funcionarios_loja_idx, gestao_empresa_auditar, private.contadores_registro, private.numerar_registro() (+48 more)

### Community 58 - "lojas/actions.ts"
Cohesion: 0.20
Nodes (17): convidar(), criarCardapio(), criarLoja(), definirCidade(), msg(), R, CartaoLoja(), Conta (+9 more)

### Community 59 - "dependencies"
Cohesion: 0.14
Nodes (12): dependencies, jsqr@1.4.0, next@^15.5.9, qrcode@^1.5.4, react@^19.2.1, react-dom@^19.2.1, @res/core@*, @supabase/supabase-js@2.47.10 (+4 more)

### Community 60 - "20261027000032_fidelidade.sql"
Cohesion: 0.04
Nodes (62): clientes_auditar, clientes_grupo_nome_idx, pedidos_cliente_idx, pedidos_registra_cliente, private.grupo_da_loja(), private.pedido_registra_cliente(), public.buscar_clientes(), public.cliente_enderecos (+54 more)

### Community 61 - "saida.ts"
Cohesion: 0.22
Nodes (8): caminhoScript(), hostPorta(), imprimirRede(), imprimirWindows(), listarImpressorasWindows(), powershell(), PS_RAW, testarRede()

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
Cohesion: 0.11
Nodes (16): pedidos.qr_token (/m/d/<código>), Colocar no ar, contas table plans and limits (plano, limite_lojas, limite_cardapios), Estrutura, GitHub Actions CI (rules, db, build), Multilojas (conta → lojas → marcas), O que já funciona, packages/core (business rules TS) (+8 more)

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

### Community 73 - "gestao/page.tsx"
Cohesion: 0.20
Nodes (15): excluirRegistro(), RegistroForm, dias(), Documento(), dynamic, BotaoImprimir(), hoje(), Registros() (+7 more)

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

### Community 78 - "acompanhar-pedido.tsx"
Cohesion: 0.30
Nodes (8): AcompanharPedido(), hora(), MapaCliente(), Ponto, PagarPix(), carregarLeaflet(), L, rotuloHorario()

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

### Community 83 - "criarClienteServidor"
Cohesion: 0.11
Nodes (34): GET(), POST(), LayoutMotoboy(), metadata, viewport, conectarMercadoPago(), criarChaveApi(), desconectarMercadoPago() (+26 more)

### Community 84 - "painel/scripts/ajustar-android.mjs"
Cohesion: 0.20
Nodes (8): adapt, app, g, gradle, m, man, res, run

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

### Community 91 - "20261101000067_cupom_area_frete.sql"
Cohesion: 0.20
Nodes (10): private.aplicar_cupom(), frete_gratis_auditar, frete_gratis_loja_idx, private.aplicar_cupom(), private.aplicar_frete_gratis(), private.base_cupom(), private.regra_frete_gratis(), public.frete_gratis (+2 more)

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

### Community 98 - "lista-clientes.tsx"
Cohesion: 0.17
Nodes (23): exportarClientes(), listarClientes(), salvarCliente(), Clientes(), dynamic, baixarCsv(), FichaCliente(), ListaClientes() (+15 more)

### Community 99 - "negociacoes-ifood.tsx"
Cohesion: 0.36
Nodes (9): responderNegociacao(), CartaoNegociacao(), NegociacaoAberta, NegociacoesIfood(), Prazo(), reais(), bipar(), rotuloMotivo() (+1 more)

### Community 101 - "pg_temp.como"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 102 - "tempo-real.tsx"
Cohesion: 0.12
Nodes (23): Caixa(), dynamic, Cardapio(), dynamic, rastreioAoVivo(), diaDoTurno(), dynamic, Entregas() (+15 more)

### Community 103 - "form-setor.tsx"
Cohesion: 0.39
Nodes (6): FormSetor(), Marca, novoSetor(), SetorForm, setorVisivel(), validarSetor()

### Community 104 - "meta-mes.tsx"
Cohesion: 0.29
Nodes (10): salvarMeta(), ler(), MESES, MetaMes(), pct(), calcularMeta(), DadosMeta, diaUTC() (+2 more)

### Community 107 - "funcionarios.tsx"
Cohesion: 0.22
Nodes (18): chegadas(), espera(), medirEntrega(), montar(), planejarRota(), Achado, distanciaRota(), EnderecoEntrega (+10 more)

### Community 116 - "ifood.tsx"
Cohesion: 0.31
Nodes (13): desligarLojaIfood(), fim(), ligarItemIfood(), R, salvarLojaIfood(), simularEventoIfood(), simularNegociacaoIfood(), simularPedidoIfood() (+5 more)

### Community 117 - "marketplace.ts"
Cohesion: 0.14
Nodes (18): acaoDoEvento(), acaoParaIfood(), CanalExterno, EVENTOS_IFOOD, formaDoIfood(), FormaRes, IfoodBeneficio, IfoodItem (+10 more)

### Community 118 - "[slug]/page.tsx"
Cohesion: 0.13
Nodes (22): carregar(), dynamic, generateMetadata(), PaginaCardapio(), dynamic, metadata, PaginaAcompanhar(), ExtrasPedido (+14 more)

### Community 119 - "gestao/page.tsx"
Cohesion: 0.15
Nodes (21): EscopoCustos, salvarModoGrupo(), Aba, ABAS, dynamic, Gestao(), brl(), ler() (+13 more)

### Community 120 - "index.ts"
Cohesion: 0.07
Nodes (70): cadastrarRestaurante(), conferirEtapa(), consultarCep(), consultarCnpj(), DadosCadastro, montarLojaDoCadastro(), PedidoDeLoja, verificarSlug() (+62 more)

### Community 121 - "99zzzzzzzzzzzzzzzzzzzzz_evento.sql"
Cohesion: 0.32
Nodes (5): ids, pg_temp.id(), pg_temp.v(), quando, saida

### Community 122 - "grafico-lojas.tsx"
Cohesion: 0.33
Nodes (8): curto(), formatar(), GraficoLojas(), LojaDesempenho, Metrica, METRICAS, valor(), formatarVariacao()

### Community 123 - "nav-painel.tsx"
Cohesion: 0.14
Nodes (21): PainelLayout(), trocarLoja(), dadosNovoPedido(), BARRA, COMECO, COR_SECAO, Icone(), Link_ (+13 more)

### Community 125 - "grafico-dias.tsx"
Cohesion: 0.33
Nodes (8): DiaLojas, DIAS, GraficoDias(), LojaCor, pedidosDia(), rotulo(), semana(), totalDia()

### Community 126 - "99zzzzzzzzzzzzzzzzzzzz_equipe.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 127 - "form-delivery.tsx"
Cohesion: 0.29
Nodes (11): PedidoCliente, ConfigDelivery, definirStatus(), replicarHorarios(), salvarConfig(), centavos(), DIAS, FORMAS (+3 more)

### Community 129 - "public"
Cohesion: 0.06
Nodes (36): public.tabela_preco_horarios, public.tabela_preco_itens, public.tabela_preco_marcas, public.tabelas_preco, cupons_auditar, cupons_codigo_idx, pedidos_cupom_idx, private.agenda_vale() (+28 more)

### Community 130 - "public.pedidos"
Cohesion: 0.04
Nodes (60): pedido_eventos_pedido_idx, pedido_item_opcoes_item_idx, pedido_itens_pedido_idx, pedidos_atualizado, pedidos_loja_status_idx, private.contador_pedidos, public.mudar_status_pedido(), public.pedido_eventos (+52 more)

### Community 131 - "expedicao.ts"
Cohesion: 0.10
Nodes (21): espera(), LoteSugerido, sugerirLotes(), SugestaoLoja, SugestaoLotes(), D-028 · Cliente acompanha a entrega, prazo por loja, alerta e lotes na expedição, tempos e atrasos, Ponto, agruparEntregas() (+13 more)

### Community 132 - "99zzzzzzzzzzzzzzzzzzzzzzz_financeiro.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 133 - "ref_node_assert"
Cohesion: 0.33
Nodes (7): campo(), crc16Pix(), FORMATOS_RASTREAMENTO, normalizarChavePix(), pixCopiaECola(), semAcento(), TipoChavePix

### Community 134 - "20261021000008_multilojas.sql"
Cohesion: 0.06
Nodes (34): contas_atualizado, contas_proteger_plano, contas_titulares_user_idx, lojas_conta_idx, lojas_limite, marcas_limite, pedidos_loja_criado_idx, private.e_titular() (+26 more)

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
Cohesion: 0.31
Nodes (9): D-011 Pedido agendado e taxa por bairro no painel, chaveBairro(), dataNoFuso(), DIAS_CURTOS, faseAgendamento, FOLGA_AGENDADO_MIN, horaNoFuso(), partes() (+1 more)

### Community 139 - "99zzzzzzz_rota.sql"
Cohesion: 0.43
Nodes (6): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida, tok

### Community 140 - "despacho.tsx"
Cohesion: 0.39
Nodes (6): despachar(), dynamic, metadata, PaginaDespacho(), Despacho(), cobranca()

### Community 141 - "pg_temp.como"
Cohesion: 0.60
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 142 - "editor-combo.tsx"
Cohesion: 0.39
Nodes (7): PassoForm, salvarCombo(), EditorCombo(), lerCentavos(), Passo, reais(), precoSeparado()

### Community 143 - "promocao.test.ts"
Cohesion: 0.24
Nodes (11): D-021 Cardápio novo: cards com foto e promoção De/Por com agenda, AgendaPromo, diaAnterior(), diaDaSemana(), DIAS_CURTOS, partesLocais(), promoEncerrada(), promoVale() (+3 more)

### Community 144 - "impressoras.ts"
Cohesion: 0.29
Nodes (5): ModeloImpressora, MODELOS_IMPRESSORA, PaginaCodigo, PAGINAS_CODIGO, Protocolo

### Community 145 - "public.lojas"
Cohesion: 0.05
Nodes (71): public.lojas, public.marcas, public.criar_pedido(), public.pedido_item_opcoes, public.pedido_itens, private.marca_aberta(), public.acompanhar_pedido(), private.limite_cardapios() (+63 more)

### Community 146 - "50_multilojas.sql"
Cohesion: 0.47
Nodes (4): ids, pg_temp.como(), pg_temp.id(), saida

### Community 147 - "mcp/route.ts"
Cohesion: 0.50
Nodes (3): DELETE, POST(), chaveDe()

### Community 149 - "m/page.tsx"
Cohesion: 0.50
Nodes (4): painelMotoboy(), dynamic, maxDuration, Motoboy()

### Community 150 - "planejamento/README.md"
Cohesion: 0.22
Nodes (4): Checklists por área (nosso "Monday"), Regras do quadro, Como usamos, Planejamento do RES

### Community 151 - "99zzzzzzzzzzzzzzzzzzzzzzzzz_marketplace.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 152 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, start, typecheck

### Community 154 - "pedido.ts"
Cohesion: 0.27
Nodes (10): acaoAvancar(), LinhaTotal, proximosStatus(), STATUS_ROTULO, StatusPedido, TIPO_ROTULO, Totais, transicaoValida() (+2 more)

### Community 155 - "Estado atual por área"
Cohesion: 0.22
Nodes (9): Base e infraestrutura, Cardápio e pedidos, Clientes e marketing, Documentação e processo, Estado atual por área, Gestão e relatórios, Integrações e API, Operação (+1 more)

### Community 157 - "Integrações com marketplaces"
Cohesion: 0.29
Nodes (7): 1. O que o RES precisa ter antes de qualquer marketplace, 2. iFood, 3. Aiqfome, 4. Delivery Much, 5. Outros (decidir em Q-2), 6. Riscos conhecidos, Integrações com marketplaces

### Community 158 - "Pendências"
Cohesion: 0.29
Nodes (7): Agora (próximas 2 semanas), Concluídas, Empresa (CNPJ e tributário) — detalhe em checklists/hugo-cnpj-e-integracoes.md e checklists/hugo-tributario.md, Frentes já previstas no README (fora dos marketplaces), Integrações (detalhe em 03-integracoes-marketplaces.md), Pendências, Piloto com restaurante real

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

### Community 174 - "40_cardapio_biblioteca.sql"
Cohesion: 0.60
Nodes (3): ids, pg_temp.como(), pg_temp.id()

## Knowledge Gaps
- **9 isolated node(s):** `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `pedidos.qr_token (/m/d/<código>)`, `GitHub Actions CI (rules, db, build)`, `Roadmap stages 3c-7 and integrations`, `supabase/migrations (Postgres RLS, audit, atomic ops)` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 789 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `equipe.tsx`, `cardapio-cliente.tsx`, `mercadopago.ts`, `API aberta e MCP (rotas)`, `salvando`, `relatorios/page.tsx`, `despacho.tsx`, `index.ts`, `web/package.json`, `app-motoboy.tsx`, `mcp/route.ts`, `mcp.ts`, `app/layout.tsx`, `contextoLoja`, `novo-pedido.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `financeiro/page.tsx`, `evento.tsx`, `criarClienteServidor`, `next`, `conta-cliente.tsx`, `painel-caixa.tsx`, `ifood.ts`, `gestao/actions.ts`, `formatarReais`, `resumo/page.tsx`, `lojas/actions.ts`, `dependencies`, `gestao/page.tsx`, `acompanhar-pedido.tsx`, `criarClienteServidor`, `lista-clientes.tsx`, `tempo-real.tsx`, `ifood.tsx`, `[slug]/page.tsx`, `gestao/page.tsx`, `index.ts`, `nav-painel.tsx`, `form-delivery.tsx`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **What connects `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `pedidos.qr_token (/m/d/<código>)`, `GitHub Actions CI (rules, db, build)` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `20261020000001_base.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.08558558558558559 - nodes in this community are weakly interconnected._
- **Why does `criarClienteServidor()` connect `criarClienteServidor` to `equipe.tsx`, `cardapio-cliente.tsx`, `expedicao.ts`, `next`, `salvando`, `relatorios/page.tsx`, `despacho.tsx`, `index.ts`, `editor-combo.tsx`, `funcionarios.tsx`, `app-motoboy.tsx`, `editor-cardapio.tsx`, `m/page.tsx`, `contextoLoja`, `foto-produto.tsx`, `novo-pedido.tsx`, `salvando`, `quadro-pedidos.tsx`, `Promoções e cupons (tela)`, `financeiro/page.tsx`, `evento.tsx`, `criarClienteServidor`, `next`, `form-grupo.tsx`, `conta-cliente.tsx`, `painel-caixa.tsx`, `gestao/actions.ts`, `formatarReais`, `resumo/page.tsx`, `lojas/actions.ts`, `gestao/page.tsx`, `lista-clientes.tsx`, `negociacoes-ifood.tsx`, `tempo-real.tsx`, `meta-mes.tsx`, `funcionarios.tsx`, `ifood.tsx`, `[slug]/page.tsx`, `gestao/page.tsx`, `index.ts`, `nav-painel.tsx`, `form-delivery.tsx`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Should `main.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12903225806451613 - nodes in this community are weakly interconnected._
- **Why does `formatarReais()` connect `formatarReais` to `cardapio-cliente.tsx`, `mercadopago.ts`, `relatorios/page.tsx`, `despacho.tsx`, `index.ts`, `editor-combo.tsx`, `app-motoboy.tsx`, `editor-cardapio.tsx`, `salvando`, `novo-pedido.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `publico.ts`, `next`, `cupom.ts`, `form-grupo.tsx`, `conta-cliente.tsx`, `preco.ts`, `painel-caixa.tsx`, `resumo/page.tsx`, `acompanhar-pedido.tsx`, `criarClienteServidor`, `lista-clientes.tsx`, `negociacoes-ifood.tsx`, `meta-mes.tsx`, `ifood.tsx`, `grafico-lojas.tsx`, `nav-painel.tsx`, `grafico-dias.tsx`, `form-delivery.tsx`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Should `next` be split into smaller, more focused modules?**
  _Cohesion score 0.10333333333333333 - nodes in this community are weakly interconnected._