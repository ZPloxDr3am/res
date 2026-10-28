# Graph Report - res  (2026-10-28)

## Corpus Check
- 308 files · ~266,215 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 2542 nodes · 6571 edges · 133 communities (114 shown, 19 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0e953c87`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- sabores-pizza.tsx
- gestao/actions.ts
- 20261020000001_base.sql
- main.ts
- pedido-flutuante.tsx
- 20261021000014_caixa.sql
- Banco: impressão
- Banco: fidelidade
- Banco: estoque
- API aberta e MCP (rotas)
- Tela de impressoras
- Resumo de vendas
- 20261021000008_multilojas.sql
- editor-combo.tsx
- Dependências do painel
- CI (testes automáticos)
- App do motoboy
- importar-nfe.tsx
- rota.ts
- Decisões de arquitetura — RES
- next
- novo-pedido.tsx
- aplicativos.tsx
- ajustar-android.mjs
- gestao/page.tsx
- Promoções e cupons (tela)
- quadro-pedidos.tsx
- lojas/actions.ts
- criarClienteServidor
- Workflow do APK do motoboy
- public.marcas
- saida.ts
- fidelidade/actions.ts
- bairros.tsx
- Workflow do agente de impressão
- Montagem do cupom impresso
- [slug]/actions.ts
- m/actions.ts
- preco.ts
- painel-caixa.tsx
- Configuração TypeScript
- Banco: cupons e descontos
- Banco: Mercado Pago
- Dependências do app do motoboy
- 20261028000052_gestao_empresarial.sql
- Grupo 45: package.json
- Grupo 46: package.json
- editor-produto.tsx
- public.produtos
- lojas/actions.ts
- cardapio-cliente.tsx
- src/caixa.ts
- index.ts
- salvando
- beefood_para_res.py
- 20261027000026_rastreio_motoboys.sql
- cardapio-dados.ts
- graphify
- public.clientes
- gestao/actions.ts
- resultados.tsx
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
- Grupo 74: 99_motoboy.sql
- Grupo 75: 99z_entregas_km.sql
- Grupo 76: 99zzzzzzzzzzzz_estoque.sql
- Grupo 77: 99zzzzzzzzzzzzzz_api.sql
- publico.ts
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
- normalizarTelefone
- 99zzzzzzzzzzzzzzzzzzz_gestao.sql
- Grupo 96: 70_caixa.sql
- 99zzzzzzzzzzzzzzzzz_taxa_km.sql
- cardapio.test.ts
- programa.tsx
- Grupo 100: tempos_ajuste.sql
- form-setor.tsx
- Grupo 102: 20_cardapio_pedidos.sql
- Grupo 103: 40_cardapio_biblioteca.sql
- 99zz_promocao.sql
- Grupo 105: next.config.mjs
- Grupo 106: vercel.json
- funcionarios.tsx
- Grupo 108: test-db.sh
- m/page.tsx
- pedido.ts
- anon
- escpos.ts
- 99zzzz_descontos.sql
- pg_temp.como
- mercadopago.ts
- public.pedidos
- 99zzzzz_clientes.sql
- 99zzzzzzzzzzzzzzzzzzzz_equipe.sql
- impressoras.ts
- rastreador.tsx
- 50_multilojas.sql
- private.importar_cardapio
- despacho.tsx

## God Nodes (most connected - your core abstractions)
1. `criarClienteServidor()` - 193 edges
2. `public.lojas` - 129 edges
3. `formatarReais()` - 110 edges
4. `public.pedidos` - 109 edges
5. `contextoLoja` - 100 edges
6. `public.marcas` - 100 edges
7. `salvando()` - 99 edges
8. `next` - 74 edges
9. `react` - 71 edges
10. `public.produtos` - 70 edges

## Surprising Connections (you probably didn't know these)
- `D-022 Combos com escolhas e categoria de up-sell` --references--> `calcularCombo()`  [INFERRED]
  docs/decisoes.md → packages/core/src/combo.ts
- `D-014 Impressão: fila no banco, regras como no BeeFood, navegador até o agente chegar` --references--> `montarCupom()`  [INFERRED]
  docs/decisoes.md → packages/core/src/cupom.ts
- `D-015 Agente de impressão do Windows (RES Impressão)` --references--> `montarCupom()`  [INFERRED]
  docs/decisoes.md → packages/core/src/cupom.ts
- `D-023 % por categoria, cupons e desconto no balcão com limite` --references--> `precoBase()`  [INFERRED]
  docs/decisoes.md → packages/core/src/preco.ts
- `Ambiente no ar (piloto)` --references--> `main()`  [INFERRED]
  README.md → packages/agente/src/main.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Rules duplicated in core and DB with shared test cases** — docs_decisoes_d_021_cardapio_cards_promo, docs_decisoes_d_022_combos_upsell, docs_decisoes_d_029_segmentos_clientes, docs_decisoes_d_030_telefone_nono_digito, docs_decisoes_d_031_fidelidade_grupo, docs_decisoes_core_db_parity [EXTRACTED 1.00]
- **Motoboy delivery flow (QR dispatch, app, tracking, routing)** — docs_decisoes_d_017_app_motoboy_qr, docs_decisoes_d_018_comanda_motoboy_pago, docs_decisoes_d_019_app_android_leitor_qr, docs_decisoes_d_026_rastreio_motoboys, docs_decisoes_d_027_rota_sugerida, apps_mobile_motoboy_readme_res_motoboy_android [INFERRED 0.85]
- **Stock management module (NF-e, recipes, counts, CMV)** — docs_decisoes_d_036_estoque_nfe_ficha, docs_decisoes_d_037_movimentacoes_estoque, docs_decisoes_d_038_meu_estoque_contagem, docs_decisoes_d_039_fechamento_cmv, docs_decisoes_d_040_ficha_sabor_pizza [INFERRED 0.85]

## Communities (133 total, 19 thin omitted)

### Community 0 - "sabores-pizza.tsx"
Cohesion: 0.05
Nodes (101): ajustarEstoque(), buscarMovimentos(), copiarFicha(), definirModoEstoque(), excluirInsumo(), feito(), FiltroMovimentos, importarNFe() (+93 more)

### Community 1 - "gestao/actions.ts"
Cohesion: 0.14
Nodes (35): excluirRegistro(), FuncionarioForm, ligarFicha(), lojaGestor(), R, RegistroForm, salvarCustos(), salvarEmpresa() (+27 more)

### Community 2 - "20261020000001_base.sql"
Cohesion: 0.09
Nodes (26): grupos_acesso_atualizado, grupos_acesso_auditar, grupos_acesso_validar, lojas_atualizado, lojas_auditar, marcas_atualizado, marcas_auditar, marcas_loja_idx (+18 more)

### Community 3 - "main.ts"
Cohesion: 0.09
Nodes (37): acharWindows(), alcance(), argumento(), ARQ_CONFIG, ARQ_LOG, atualizarSePrecisar(), atualizarWindows(), Config (+29 more)

### Community 4 - "pedido-flutuante.tsx"
Cohesion: 0.15
Nodes (18): PainelLayout(), trocarLoja(), dadosNovoPedido(), Icone(), Link_, LINKS, NavPainel(), SECOES (+10 more)

### Community 5 - "20261021000014_caixa.sql"
Cohesion: 0.05
Nodes (49): caixa_movimentos_sessao_idx, caixa_sessoes_auditar, caixa_sessoes_loja_idx, caixa_sessoes_uma_aberta_idx, caixas_auditar, caixas_nome_idx, lojas_caixa_inicial, pedidos_caixa_idx (+41 more)

### Community 6 - "Banco: impressão"
Cohesion: 0.06
Nodes (48): impressao_config_auditar, impressao_destinos_loja_idx, impressoes_loja_idx, impressoes_pedido_idx, impressoes_pendentes_idx, impressoras_auditar, impressoras_nome_idx, pedidos_imprimir_ao_aceitar (+40 more)

### Community 7 - "Banco: fidelidade"
Cohesion: 0.07
Nodes (45): public.clientes, fidelidade_mov_cliente_idx, fidelidade_mov_grupo_idx, fidelidade_mov_pedido_idx, fidelidade_recompensas_grupo_idx, pedidos_fidelidade, private.aplicar_cupom(), private.aplicar_fidelidade() (+37 more)

### Community 8 - "Banco: estoque"
Cohesion: 0.09
Nodes (32): private.cupom_da_loja(), estoque_mov_estoque_idx, estoque_mov_insumo_idx, estoque_mov_pedido_idx, fichas_opcao_idx, fichas_produto_idx, insumos_estoque_idx, pedidos_estoque (+24 more)

### Community 9 - "API aberta e MCP (rotas)"
Cohesion: 0.08
Nodes (33): DELETE, POST(), DELETE, POST(), GET(), OPTIONS, GET(), OPTIONS (+25 more)

### Community 10 - "Tela de impressoras"
Cohesion: 0.10
Nodes (39): ConfigImpressao, DadosImpressora, excluirImpressora(), gerarCodigoAgente(), imprimirTeste(), msg(), R, RC (+31 more)

### Community 11 - "Resumo de vendas"
Cohesion: 0.11
Nodes (35): Composicao, ComposicaoVendas(), dataBR(), dynamic, Kpi(), Metricas, PRESETS, Resumo (+27 more)

### Community 12 - "20261021000008_multilojas.sql"
Cohesion: 0.10
Nodes (33): public.lojas, contas_atualizado, contas_proteger_plano, contas_titulares_user_idx, lojas_conta_idx, lojas_limite, private.e_titular(), private.limite_cardapios() (+25 more)

### Community 13 - "editor-combo.tsx"
Cohesion: 0.24
Nodes (12): PassoForm, salvarCombo(), EditorCombo(), lerCentavos(), Passo, reais(), AreaFoto(), FotoOpcao() (+4 more)

### Community 14 - "Dependências do painel"
Cohesion: 0.06
Nodes (34): config, PUBLICAS, dependencies, jsqr@1.4.0, next@^15.5.9, react@^19.2.1, react-dom@^19.2.1, @res/core@* (+26 more)

### Community 15 - "CI (testes automáticos)"
Cohesion: 0.07
Nodes (34): name, runs-on, services, steps, DATABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, POSTGRES_PASSWORD (+26 more)

### Community 16 - "App do motoboy"
Cohesion: 0.24
Nodes (14): entregar(), Acerto(), AppMotoboy(), Aviso, CartaoEntrega(), Leitor(), vibrar(), enderecoMapa() (+6 more)

### Community 17 - "importar-nfe.tsx"
Cohesion: 0.13
Nodes (30): complementos_loja_idx, grupos_opcoes_loja_idx, opcoes_grupo_idx, private.setor_exige_marca(), produto_grupos_grupo_idx, produtos_loja_setor_idx, public.criar_grupo_vinculado(), public.criar_produto() (+22 more)

### Community 18 - "rota.ts"
Cohesion: 0.22
Nodes (7): D-027 · Rota sugerida quando o motoboy sai com várias entregas, OpcoesRota, otimizarRota(), Parada, ResultadoRota, agora, M

### Community 19 - "Decisões de arquitetura — RES"
Cohesion: 0.06
Nodes (35): D-002 Modelo multiloja: Loja → Marcas, D-003 Regras de cadastro valem no banco e no formulário, D-004 Auditoria calculada no servidor, D-005 Operações compostas são atômicas, D-006 Gravar só em ação explícita, D-007 Texto em UTF-8 completo, D-008 Nenhum segredo de integração no navegador, D-009 Preço de itens com grupos (decisão provisória, Q-009) (+27 more)

### Community 20 - "next"
Cohesion: 0.10
Nodes (14): GET(), POST(), carregar(), dynamic, generateMetadata(), Grupo, PaginaGrupo(), fonte (+6 more)

### Community 21 - "novo-pedido.tsx"
Cohesion: 0.22
Nodes (19): buscarClientes(), autorizarDesconto(), dynamic, PaginaNovoPedido(), GruposBalcao(), ItemCarrinho, lerCentavos(), Montador() (+11 more)

### Community 22 - "aplicativos.tsx"
Cohesion: 0.08
Nodes (52): conectarMercadoPago(), criarChaveApi(), desconectarMercadoPago(), excluirWebhook(), mpAceitarAoPagar(), R, removerIntegracao(), revogarChaveApi() (+44 more)

### Community 23 - "ajustar-android.mjs"
Cohesion: 0.17
Nodes (11): adapt, app, g, gradle, m, man, permissoes, res (+3 more)

### Community 24 - "gestao/page.tsx"
Cohesion: 0.14
Nodes (21): EscopoCustos, salvarModoGrupo(), Aba, ABAS, dynamic, Gestao(), brl(), ler() (+13 more)

### Community 25 - "Promoções e cupons (tela)"
Cohesion: 0.15
Nodes (27): agenda(), alternarCupom(), CupomForm, excluirCupom(), excluirPromoCategoria(), fim(), PromoCategoriaForm, R (+19 more)

### Community 26 - "quadro-pedidos.tsx"
Cohesion: 0.15
Nodes (24): cuponsPendentes(), imprimirPedido(), criarPedido(), definirAceiteAutomatico(), marcarPago(), mensagem(), mudarStatus(), NovoPedido (+16 more)

### Community 27 - "lojas/actions.ts"
Cohesion: 0.29
Nodes (12): criarCardapio(), criarLoja(), definirCidade(), msg(), CartaoLoja(), Conta, GestaoLojas(), Msg() (+4 more)

### Community 28 - "criarClienteServidor"
Cohesion: 0.21
Nodes (28): alterarDisponibilidade(), CategoriaOrigem, definirFoto(), definirFotoOpcao(), definirGruposDoProduto(), definirProdutosDoGrupo(), desvincularGrupo(), duplicarGrupo() (+20 more)

### Community 29 - "Workflow do APK do motoboy"
Cohesion: 0.08
Nodes (24): runs-on, steps, GH_TOKEN, KS_B64, KS_PASS, jobs, apk, name (+16 more)

### Community 30 - "public.marcas"
Cohesion: 0.07
Nodes (32): public.marcas, public.criar_pedido(), areas_entrega_auditar, marca_horarios_auditar, private.marca_aberta(), public.areas_entrega, public.marca_horarios, public.salvar_config_delivery() (+24 more)

### Community 31 - "saida.ts"
Cohesion: 0.18
Nodes (18): PedidoCliente, ConfigDelivery, definirStatus(), replicarHorarios(), salvarConfig(), salvarVitrine(), Vitrine, Delivery() (+10 more)

### Community 32 - "fidelidade/actions.ts"
Cohesion: 0.11
Nodes (36): ajustarSaldo(), buscarSaldos(), copiarPrograma(), excluirRecompensa(), extratoCliente(), R, saldoDoCliente(), salvarConfigFidelidade() (+28 more)

### Community 33 - "bairros.tsx"
Cohesion: 0.07
Nodes (57): ajustarEntrega(), AoVivo, AreaForm, calcularKmBairro(), FaixaForm, localizarLoja(), MotoboyAoVivo, R (+49 more)

### Community 34 - "Workflow do agente de impressão"
Cohesion: 0.09
Nodes (21): GH_TOKEN, runs-on, steps, jobs, exe, name, on, push (+13 more)

### Community 35 - "Montagem do cupom impresso"
Cohesion: 0.21
Nodes (16): blocosCombo(), colunasLR(), CupomDados, cupomTexto(), dataHora(), FRACAO, fracaoTexto(), LAYOUT_PADRAO (+8 more)

### Community 36 - "[slug]/actions.ts"
Cohesion: 0.31
Nodes (11): calcularEntregaKm(), EntregaKm, Achado, EnderecoEntrega, espera(), localizar(), localizarBairro(), localizarEntrega() (+3 more)

### Community 37 - "m/actions.ts"
Cohesion: 0.24
Nodes (14): chegadas(), espera(), medirEntrega(), montar(), planejarRota(), PlanoRota, hora(), PlanoRotaMotoboy() (+6 more)

### Community 38 - "preco.ts"
Cohesion: 0.14
Nodes (24): calcularCombo(), EscolhaPasso, PassoCombo, LinhaTotal, Totais, calcularItem(), ErroEscolha, grupoVisivel() (+16 more)

### Community 39 - "painel-caixa.tsx"
Cohesion: 0.07
Nodes (53): cadastrar(), credenciais(), entrar(), abrirCaixa(), fecharCaixa(), movimentar(), msg(), R (+45 more)

### Community 40 - "Configuração TypeScript"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 41 - "Banco: cupons e descontos"
Cohesion: 0.14
Nodes (15): cupons_auditar, cupons_codigo_idx, pedidos_cupom_idx, private.agenda_vale(), private.aplicar_cupom(), private.desconto_categoria_pct(), private.desconto_cupom(), private.preco_combo() (+7 more)

### Community 42 - "Banco: Mercado Pago"
Cohesion: 0.16
Nodes (13): mp_pagamentos_pedido_idx, public.desconectar_mp(), public.mp_contas, public.mp_pagamentos, public.mp_status(), public.salvar_mp(), public.mp_aceitar_ao_pagar(), public.mp_status() (+5 more)

### Community 43 - "Dependências do app do motoboy"
Cohesion: 0.14
Nodes (17): dependencies, @capacitor/android@6.2.0, @capacitor/app@6.0.2, @capacitor/cli@6.2.0, @capacitor-community/background-geolocation@1.2.26, @capacitor/core@6.2.0, description, name (+9 more)

### Community 44 - "20261028000052_gestao_empresarial.sql"
Cohesion: 0.15
Nodes (20): custos_auditar, custos_loja_idx, funcionario_registros_idx, funcionario_registros_numero, funcionarios_loja_idx, gestao_empresa_auditar, private.contadores_registro, private.numerar_registro() (+12 more)

### Community 45 - "Grupo 45: package.json"
Cohesion: 0.14
Nodes (17): description, devDependencies, esbuild@0.24.0, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, tsx, @types/node (+9 more)

### Community 46 - "Grupo 46: package.json"
Cohesion: 0.13
Nodes (17): description, devDependencies, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, exports, tsx, @types/node (+9 more)

### Community 47 - "editor-produto.tsx"
Cohesion: 0.27
Nodes (11): criarProduto(), lerPromocao(), salvarProduto(), EditorProduto(), ETIQUETAS, FORMACAO, Marca, reais() (+3 more)

### Community 48 - "public.produtos"
Cohesion: 0.18
Nodes (27): public.complementos, public.grupos_opcoes, public.opcoes, public.produto_grupos, public.produto_marcas, private.preco_item(), private.produto_publico(), public.definir_grupos_do_produto() (+19 more)

### Community 49 - "lojas/actions.ts"
Cohesion: 0.29
Nodes (4): public.criar_grupo_vinculado(), public.desvincular_grupo(), public.reordenar(), public.vincular_grupo()

### Community 50 - "cardapio-cliente.tsx"
Cohesion: 0.09
Nodes (43): conferirCupom(), enviarPedido(), situacaoPedidos(), CardapioCliente(), Checkout(), ETIQUETA, Extras(), gravar() (+35 more)

### Community 51 - "src/caixa.ts"
Cohesion: 0.20
Nodes (13): marcarImpressao(), RC, colunasNavegador(), CSS_CUPOM, CupomFila, cupomHtml(), esc(), imprimirNoNavegador() (+5 more)

### Community 52 - "index.ts"
Cohesion: 0.27
Nodes (14): exportarClientes(), listarClientes(), salvarCliente(), Clientes(), dynamic, FichaCliente(), ListaClientes(), SEG (+6 more)

### Community 53 - "salvando"
Cohesion: 0.25
Nodes (10): salvarDetalheOpcao(), Cardapio(), dynamic, BotaoExcluir(), DetalheOpcao(), CARDAPIO, salvando(), TempoReal() (+2 more)

### Community 54 - "beefood_para_res.py"
Cohesion: 0.33
Nodes (3): converter(), limpa(), L()

### Community 55 - "20261027000026_rastreio_motoboys.sql"
Cohesion: 0.20
Nodes (11): motoboy_local_grupo_idx, motoboy_posicoes_em_idx, motoboy_posicoes_entregador_idx, pedidos_motoboy_sai_do_mapa, private.e_membro_do_grupo(), private.motoboy_sai_do_mapa(), public.motoboy_local, public.motoboy_posicoes (+3 more)

### Community 56 - "cardapio-dados.ts"
Cohesion: 0.19
Nodes (16): c(), dynamic, Promocoes(), CupomLinha, PromoCategoriaLinha, PromoProdutoLinha, UsoCupom, agendaDe() (+8 more)

### Community 58 - "public.clientes"
Cohesion: 0.09
Nodes (19): clientes_auditar, clientes_grupo_nome_idx, pedidos_cliente_idx, pedidos_registra_cliente, private.grupo_da_loja(), private.pedido_registra_cliente(), public.buscar_clientes(), public.cliente_enderecos (+11 more)

### Community 59 - "gestao/actions.ts"
Cohesion: 0.24
Nodes (11): D-021 Cardápio novo: cards com foto e promoção De/Por com agenda, AgendaPromo, diaAnterior(), diaDaSemana(), DIAS_CURTOS, partesLocais(), promoEncerrada(), promoVale() (+3 more)

### Community 60 - "resultados.tsx"
Cohesion: 0.10
Nodes (30): programaFidelidade(), saldoFidelidade(), FidelidadeBalcao(), UsoFidelidade, FidelidadeCliente(), lembrarPedidoFidelidade(), ler(), provaFidelidade() (+22 more)

### Community 61 - "[slug]/actions.ts"
Cohesion: 0.14
Nodes (23): conferirPixMercadoPago(), pixMercadoPago(), dynamic, metadata, PaginaAcompanhar(), AcompanharPedido(), ExtrasPedido, hora() (+15 more)

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
Cohesion: 0.32
Nodes (4): agruparEntregas (core), OSRM / Nominatim (OpenStreetMap services), otimizarRota (core), Shift window 05:00→05:00

### Community 73 - "equipe.tsx"
Cohesion: 0.11
Nodes (35): alterarFuncao(), cancelarConvite(), convidar(), criarUsuarioCaixa(), definirAtivo(), R, salvarPermissoesEquipe(), trocarSenhaUsuario() (+27 more)

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

### Community 78 - "publico.ts"
Cohesion: 0.11
Nodes (25): FaixaKm, carregar(), dynamic, generateMetadata(), PaginaCardapio(), acrescimo(), cheio(), completo() (+17 more)

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

### Community 91 - "Grupo 91: 99zzz_combos.sql"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 93 - "Grupo 93: 99zzzzzzzzzzzzzzz_mercadopago.sql"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 94 - "normalizarTelefone"
Cohesion: 0.32
Nodes (10): baixarCsv(), D-029 · Segmentos de clientes para marketing, D-030 · Telefone sempre com o 9 do celular, CASOS_SEGMENTO, CASOS_TELEFONE, eCelular(), normalizarTelefone(), segmentoCliente() (+2 more)

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
Cohesion: 0.17
Nodes (7): private.preco_item(), combo_passos_auditar, combo_passos_combo_idx, private.preco_combo(), public.combo_passos, public.duplicar_produto(), public.salvar_combo()

### Community 101 - "form-setor.tsx"
Cohesion: 0.39
Nodes (7): salvarSetor(), FormSetor(), Marca, novoSetor(), SetorForm, setorVisivel(), validarSetor()

### Community 102 - "Grupo 102: 20_cardapio_pedidos.sql"
Cohesion: 0.60
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 103 - "Grupo 103: 40_cardapio_biblioteca.sql"
Cohesion: 0.60
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 104 - "99zz_promocao.sql"
Cohesion: 0.60
Nodes (4): ids, pg_temp.como(), pg_temp.id(), pg_temp.vale()

### Community 107 - "funcionarios.tsx"
Cohesion: 0.15
Nodes (15): espera(), LoteSugerido, sugerirLotes(), SugestaoLoja, SugestaoLotes(), D-028 · Cliente acompanha a entrega, prazo por loja, alerta e lotes na expedição, tempos e atrasos, Ponto, agruparEntregas() (+7 more)

### Community 116 - "m/page.tsx"
Cohesion: 0.50
Nodes (4): painelMotoboy(), dynamic, maxDuration, Motoboy()

### Community 117 - "pedido.ts"
Cohesion: 0.33
Nodes (9): acaoAvancar(), ErroPedido, proximosStatus(), STATUS_ROTULO, tempoDecorrido(), TIPO_ROTULO, totalizar(), transicaoValida() (+1 more)

### Community 118 - "anon"
Cohesion: 0.24
Nodes (8): private.entrega_json(), public.motoboy_painel(), public.registrar_rota(), public.relatorio_entregas(), public.relatorio_fidelidade(), public.movimentos_estoque_filtro(), public.fechamento_estoque(), private.periodo_api()

### Community 119 - "escpos.ts"
Cohesion: 0.29
Nodes (9): codificar(), CP850, CP860, ESC_T, Pagina, semAcento(), ConfigImpressora, gerarEscPos() (+1 more)

### Community 120 - "99zzzz_descontos.sql"
Cohesion: 0.47
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 122 - "mercadopago.ts"
Cohesion: 0.36
Nodes (7): POST(), atualizarPagamento(), conferirPix(), marcarPago(), Ped, pedidoECConta(), pixDoPedido()

### Community 123 - "public.pedidos"
Cohesion: 0.07
Nodes (45): pedido_eventos_pedido_idx, pedido_item_opcoes_item_idx, pedido_itens_pedido_idx, pedidos_atualizado, pedidos_loja_status_idx, private.contador_pedidos, public.mudar_status_pedido(), public.pedido_eventos (+37 more)

### Community 125 - "99zzzzz_clientes.sql"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 126 - "99zzzzzzzzzzzzzzzzzzzz_equipe.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 127 - "impressoras.ts"
Cohesion: 0.29
Nodes (5): ModeloImpressora, MODELOS_IMPRESSORA, PaginaCodigo, PAGINAS_CODIGO, Protocolo

### Community 129 - "rastreador.tsx"
Cohesion: 0.33
Nodes (7): cap(), Capacitor, EstadoRastreio, FaixaRastreio(), useRastreio(), Watcher, clienteNavegador()

### Community 130 - "50_multilojas.sql"
Cohesion: 0.47
Nodes (4): ids, pg_temp.como(), pg_temp.id(), saida

### Community 132 - "private.importar_cardapio"
Cohesion: 0.67
Nodes (3): private.importacoes, private.importar_cardapio(), pg_temp.k()

### Community 134 - "despacho.tsx"
Cohesion: 0.36
Nodes (7): despachar(), dynamic, metadata, PaginaDespacho(), Despacho(), cobranca(), linkMaps()

## Knowledge Gaps
- **9 isolated node(s):** `pedidos.qr_token (/m/d/<código>)`, `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `GitHub Actions CI (rules, db, build)`, `Roadmap stages 3c-7 and integrations`, `supabase/migrations (Postgres RLS, audit, atomic ops)` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 608 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `sabores-pizza.tsx`, `gestao/actions.ts`, `pedido-flutuante.tsx`, `despacho.tsx`, `API aberta e MCP (rotas)`, `Tela de impressoras`, `Resumo de vendas`, `Dependências do painel`, `App do motoboy`, `novo-pedido.tsx`, `aplicativos.tsx`, `gestao/page.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `lojas/actions.ts`, `criarClienteServidor`, `saida.ts`, `fidelidade/actions.ts`, `bairros.tsx`, `m/actions.ts`, `painel-caixa.tsx`, `cardapio-cliente.tsx`, `index.ts`, `salvando`, `resultados.tsx`, `[slug]/actions.ts`, `equipe.tsx`, `publico.ts`, `mercadopago.ts`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **What connects `pedidos.qr_token (/m/d/<código>)`, `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `GitHub Actions CI (rules, db, build)` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `sabores-pizza.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.050613258810743675 - nodes in this community are weakly interconnected._
- **Why does `formatarReais()` connect `[slug]/actions.ts` to `sabores-pizza.tsx`, `pedido-flutuante.tsx`, `despacho.tsx`, `Resumo de vendas`, `editor-combo.tsx`, `App do motoboy`, `novo-pedido.tsx`, `aplicativos.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `criarClienteServidor`, `saida.ts`, `fidelidade/actions.ts`, `bairros.tsx`, `Montagem do cupom impresso`, `preco.ts`, `painel-caixa.tsx`, `editor-produto.tsx`, `cardapio-cliente.tsx`, `index.ts`, `resultados.tsx`, `publico.ts`, `cardapio.test.ts`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Should `gestao/actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14169570267131243 - nodes in this community are weakly interconnected._
- **Why does `criarClienteServidor()` connect `criarClienteServidor` to `sabores-pizza.tsx`, `gestao/actions.ts`, `despacho.tsx`, `Tela de impressoras`, `Resumo de vendas`, `editor-combo.tsx`, `App do motoboy`, `next`, `novo-pedido.tsx`, `aplicativos.tsx`, `gestao/page.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `lojas/actions.ts`, `saida.ts`, `fidelidade/actions.ts`, `bairros.tsx`, `[slug]/actions.ts`, `m/actions.ts`, `painel-caixa.tsx`, `editor-produto.tsx`, `cardapio-cliente.tsx`, `src/caixa.ts`, `index.ts`, `salvando`, `cardapio-dados.ts`, `resultados.tsx`, `[slug]/actions.ts`, `equipe.tsx`, `publico.ts`, `cardapio.test.ts`, `form-setor.tsx`, `funcionarios.tsx`, `m/page.tsx`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Should `20261020000001_base.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.0944741532976827 - nodes in this community are weakly interconnected._