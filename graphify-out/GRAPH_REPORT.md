# Graph Report - res  (2026-10-30)

## Corpus Check
- 319 files · ~281,524 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 2647 nodes · 6786 edges · 141 communities (120 shown, 21 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `da350b99`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- estoque/page.tsx
- public.setores
- 20261020000001_base.sql
- main.ts
- (painel)/layout.tsx
- 20261021000014_caixa.sql
- Banco: impressão
- public.fidelidade_movimentos
- Banco: estoque
- API aberta e MCP (rotas)
- painel-impressoras.tsx
- public.setores
- 20261021000008_multilojas.sql
- fidelidade/actions.ts
- web/package.json
- CI (testes automáticos)
- app-motoboy.tsx
- public.lojas
- resumo/page.tsx
- Decisões de arquitetura — RES
- [link]/page.tsx
- server.ts
- aplicativos.tsx
- formatarReais
- custos.tsx
- Promoções e cupons (tela)
- quadro-pedidos.tsx
- lojas/actions.ts
- criarClienteServidor
- Workflow do APK do motoboy
- evento.tsx
- salvando
- saida.ts
- bairros.tsx
- Workflow do agente de impressão
- Montagem do cupom impresso
- m/actions.ts
- importar-nfe.tsx
- preco.ts
- painel-caixa.tsx
- Configuração TypeScript
- Banco: cupons e descontos
- Banco: Mercado Pago
- Dependências do app do motoboy
- 20261028000052_gestao_empresarial.sql
- Grupo 45: package.json
- Grupo 46: package.json
- formatarReais
- public.produtos
- pedidos/actions.ts
- estoque/actions.ts
- gestao/actions.ts
- index.ts
- programa.tsx
- beefood_para_res.py
- 20261027000032_fidelidade.sql
- funcionarios.tsx
- graphify
- pg_temp.como
- promocao.test.ts
- [slug]/actions.ts
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
- formatarReais
- 99zzzzzzzzzzzzzzzzzzz_gestao.sql
- Grupo 96: 70_caixa.sql
- 99zzzzzzzzzzzzzzzzz_taxa_km.sql
- cardapio.test.ts
- lojas/page.tsx
- Grupo 100: tempos_ajuste.sql
- form-setor.tsx
- impressao.ts
- sabores-pizza.tsx
- escpos.ts
- Grupo 105: next.config.mjs
- Grupo 106: vercel.json
- funcionarios.tsx
- Grupo 108: test-db.sh
- 20261027000026_rastreio_motoboys.sql
- form-delivery.tsx
- rastreador.tsx
- contagem.tsx
- public.fidelidade_config
- 99zzzzzzzzzzzzzzzzzzzzz_evento.sql
- mercadopago.ts
- public.pedidos
- 99zzzzz_clientes.sql
- 99zzzzzzzzzzzzzzzzzzzz_equipe.sql
- 40_cardapio_biblioteca.sql
- entregas/page.tsx
- pg_temp.como
- m/page.tsx
- middleware.ts
- impressoras.ts
- 50_multilojas.sql
- 99zzzzzzzzzzzzzzzzzzzzzz_quadro.sql
- 99zzzz_descontos.sql
- app/layout.tsx
- 20261027000031_telefone_nono_digito.sql
- @supabase/supabase-js
- m/layout.tsx

## God Nodes (most connected - your core abstractions)
1. `criarClienteServidor()` - 205 edges
2. `public.lojas` - 131 edges
3. `public.pedidos` - 113 edges
4. `public.marcas` - 111 edges
5. `formatarReais()` - 108 edges
6. `salvando()` - 106 edges
7. `contextoLoja` - 104 edges
8. `next` - 76 edges
9. `public.produtos` - 73 edges
10. `react` - 72 edges

## Surprising Connections (you probably didn't know these)
- `D-014 Impressão: fila no banco, regras como no BeeFood, navegador até o agente chegar` --references--> `montarCupom()`  [INFERRED]
  docs/decisoes.md → packages/core/src/cupom.ts
- `D-015 Agente de impressão do Windows (RES Impressão)` --references--> `montarCupom()`  [INFERRED]
  docs/decisoes.md → packages/core/src/cupom.ts
- `D-022 Combos com escolhas e categoria de up-sell` --references--> `calcularCombo()`  [INFERRED]
  docs/decisoes.md → packages/core/src/combo.ts
- `D-023 % por categoria, cupons e desconto no balcão com limite` --references--> `precoBase()`  [INFERRED]
  docs/decisoes.md → packages/core/src/preco.ts
- `D-030 · Telefone sempre com o 9 do celular` --references--> `normalizarTelefone()`  [INFERRED]
  docs/decisoes.md → packages/core/src/segmentos.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Rules duplicated in core and DB with shared test cases** — docs_decisoes_d_021_cardapio_cards_promo, docs_decisoes_d_022_combos_upsell, docs_decisoes_d_029_segmentos_clientes, docs_decisoes_d_030_telefone_nono_digito, docs_decisoes_d_031_fidelidade_grupo, docs_decisoes_core_db_parity [EXTRACTED 1.00]
- **Motoboy delivery flow (QR dispatch, app, tracking, routing)** — docs_decisoes_d_017_app_motoboy_qr, docs_decisoes_d_018_comanda_motoboy_pago, docs_decisoes_d_019_app_android_leitor_qr, docs_decisoes_d_026_rastreio_motoboys, docs_decisoes_d_027_rota_sugerida, apps_mobile_motoboy_readme_res_motoboy_android [INFERRED 0.85]
- **Stock management module (NF-e, recipes, counts, CMV)** — docs_decisoes_d_036_estoque_nfe_ficha, docs_decisoes_d_037_movimentacoes_estoque, docs_decisoes_d_038_meu_estoque_contagem, docs_decisoes_d_039_fechamento_cmv, docs_decisoes_d_040_ficha_sabor_pizza [INFERRED 0.85]

## Communities (141 total, 21 thin omitted)

### Community 0 - "estoque/page.tsx"
Cohesion: 0.11
Nodes (39): buscarMovimentos(), FiltroMovimentos, dynamic, Estoque(), dataCurta(), Fechamento(), pctTexto(), somaMes() (+31 more)

### Community 1 - "public.setores"
Cohesion: 0.25
Nodes (16): salvarEmpresa(), dias(), Documento(), dynamic, DadosEmpresa(), BotaoImprimir(), cnpjValido(), dataBr() (+8 more)

### Community 2 - "20261020000001_base.sql"
Cohesion: 0.09
Nodes (26): grupos_acesso_atualizado, grupos_acesso_auditar, grupos_acesso_validar, lojas_atualizado, lojas_auditar, marcas_atualizado, marcas_auditar, marcas_loja_idx (+18 more)

### Community 3 - "main.ts"
Cohesion: 0.12
Nodes (30): acharWindows(), alcance(), argumento(), ARQ_CONFIG, ARQ_LOG, atualizarSePrecisar(), atualizarWindows(), Config (+22 more)

### Community 4 - "(painel)/layout.tsx"
Cohesion: 0.14
Nodes (18): PainelLayout(), trocarLoja(), dadosNovoPedido(), Icone(), Link_, LINKS, NavPainel(), SECOES (+10 more)

### Community 5 - "20261021000014_caixa.sql"
Cohesion: 0.05
Nodes (49): caixa_movimentos_sessao_idx, caixa_sessoes_auditar, caixa_sessoes_loja_idx, caixa_sessoes_uma_aberta_idx, caixas_auditar, caixas_nome_idx, lojas_caixa_inicial, pedidos_caixa_idx (+41 more)

### Community 6 - "Banco: impressão"
Cohesion: 0.06
Nodes (48): impressao_config_auditar, impressao_destinos_loja_idx, impressoes_loja_idx, impressoes_pedido_idx, impressoes_pendentes_idx, impressoras_auditar, impressoras_nome_idx, pedidos_imprimir_ao_aceitar (+40 more)

### Community 7 - "public.fidelidade_movimentos"
Cohesion: 0.14
Nodes (13): fidelidade_mov_cliente_idx, fidelidade_mov_grupo_idx, fidelidade_mov_pedido_idx, private.expirar_fidelidade(), public.fidelidade_movimentos, fidelidade_mov_cliente_loja_idx, fidelidade_mov_loja_idx, private.expirar_fidelidade() (+5 more)

### Community 8 - "Banco: estoque"
Cohesion: 0.09
Nodes (31): estoque_mov_estoque_idx, estoque_mov_insumo_idx, estoque_mov_pedido_idx, fichas_opcao_idx, fichas_produto_idx, insumos_estoque_idx, pedidos_estoque, private.mover_estoque() (+23 more)

### Community 9 - "API aberta e MCP (rotas)"
Cohesion: 0.08
Nodes (33): DELETE, POST(), DELETE, POST(), GET(), OPTIONS, GET(), OPTIONS (+25 more)

### Community 10 - "painel-impressoras.tsx"
Cohesion: 0.10
Nodes (40): ConfigImpressao, DadosImpressora, excluirImpressora(), gerarCodigoAgente(), imprimirPedido(), imprimirTeste(), msg(), R (+32 more)

### Community 11 - "public.setores"
Cohesion: 0.11
Nodes (26): private.setor_exige_marca(), public.setor_marcas, public.setores, setor_marcas_exige_marca, setores_exige_marca, areas_entrega_auditar, marca_horarios_auditar, private.marca_aberta() (+18 more)

### Community 12 - "20261021000008_multilojas.sql"
Cohesion: 0.09
Nodes (30): contas_atualizado, contas_proteger_plano, contas_titulares_user_idx, lojas_conta_idx, lojas_limite, marcas_limite, pedidos_loja_criado_idx, private.e_titular() (+22 more)

### Community 13 - "fidelidade/actions.ts"
Cohesion: 0.06
Nodes (60): ajustarSaldo(), buscarSaldos(), copiarPrograma(), excluirRecompensa(), extratoCliente(), R, saldoDoCliente(), salvarConfigFidelidade() (+52 more)

### Community 14 - "web/package.json"
Cohesion: 0.08
Nodes (30): dependencies, jsqr@1.4.0, next@^15.5.9, qrcode@^1.5.4, react@^19.2.1, react-dom@^19.2.1, @res/core@*, devDependencies (+22 more)

### Community 15 - "CI (testes automáticos)"
Cohesion: 0.07
Nodes (34): name, runs-on, services, steps, DATABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, POSTGRES_PASSWORD (+26 more)

### Community 16 - "app-motoboy.tsx"
Cohesion: 0.15
Nodes (25): despachar(), entregar(), dynamic, metadata, PaginaDespacho(), Acerto(), AppMotoboy(), Aviso (+17 more)

### Community 17 - "public.lojas"
Cohesion: 0.07
Nodes (34): public.marcas, private.dentro_do_horario(), private.horarios_agendamento(), private.marca_aberta(), private.validar_agendamento(), public.horarios_agendamento(), public.salvar_config_delivery(), public.saldo_fidelidade_publico() (+26 more)

### Community 18 - "resumo/page.tsx"
Cohesion: 0.11
Nodes (35): Composicao, ComposicaoVendas(), dataBR(), dynamic, Kpi(), Metricas, PRESETS, Resumo (+27 more)

### Community 19 - "Decisões de arquitetura — RES"
Cohesion: 0.05
Nodes (36): D-002 Modelo multiloja: Loja → Marcas, D-003 Regras de cadastro valem no banco e no formulário, D-004 Auditoria calculada no servidor, D-005 Operações compostas são atômicas, D-006 Gravar só em ação explícita, D-007 Texto em UTF-8 completo, D-008 Nenhum segredo de integração no navegador, D-009 Preço de itens com grupos (decisão provisória, Q-009) (+28 more)

### Community 20 - "[link]/page.tsx"
Cohesion: 0.47
Nodes (5): carregar(), dynamic, generateMetadata(), Grupo, PaginaGrupo()

### Community 21 - "server.ts"
Cohesion: 0.16
Nodes (15): criarLoja(), Cardapio(), dynamic, dynamic, PaginaNovoPedido(), carregarCardapio(), c(), Cardapio (+7 more)

### Community 22 - "aplicativos.tsx"
Cohesion: 0.08
Nodes (52): conectarMercadoPago(), criarChaveApi(), desconectarMercadoPago(), excluirWebhook(), mpAceitarAoPagar(), R, removerIntegracao(), revogarChaveApi() (+44 more)

### Community 23 - "formatarReais"
Cohesion: 0.20
Nodes (16): ajustarEntrega(), CartaoMotoboy(), FechamentoMotoboys(), FONTE, hora(), LinhaEntrega(), Numero(), Total (+8 more)

### Community 24 - "custos.tsx"
Cohesion: 0.15
Nodes (21): salvarCustos(), salvarModoGrupo(), Aba, ABAS, dynamic, Gestao(), brl(), ler() (+13 more)

### Community 25 - "Promoções e cupons (tela)"
Cohesion: 0.12
Nodes (33): agenda(), alternarCupom(), CupomForm, excluirCupom(), excluirPromoCategoria(), fim(), PromoCategoriaForm, R (+25 more)

### Community 26 - "quadro-pedidos.tsx"
Cohesion: 0.09
Nodes (18): cuponsPendentes(), marcarAviso(), BotaoNovoPedido(), abrirWhatsApp(), AvisarTodos(), bipar(), CartaoPedido(), COLUNAS (+10 more)

### Community 27 - "lojas/actions.ts"
Cohesion: 0.26
Nodes (14): convidar(), criarCardapio(), criarLoja(), definirCidade(), msg(), R, CartaoLoja(), Conta (+6 more)

### Community 28 - "criarClienteServidor"
Cohesion: 0.16
Nodes (30): GET(), POST(), alterarDisponibilidade(), CategoriaOrigem, criarProduto(), definirFoto(), definirFotoOpcao(), definirGruposDoProduto() (+22 more)

### Community 29 - "Workflow do APK do motoboy"
Cohesion: 0.08
Nodes (24): runs-on, steps, GH_TOKEN, KS_B64, KS_PASS, jobs, apk, name (+16 more)

### Community 30 - "evento.tsx"
Cohesion: 0.12
Nodes (34): AjusteProduto, copiarParaEvento(), criarEvento(), msg(), R, refrescar(), removerProdutoEvento(), salvarEvento() (+26 more)

### Community 31 - "salvando"
Cohesion: 0.14
Nodes (23): PedidoCliente, ConfigDelivery, definirStatus(), replicarHorarios(), salvarConfig(), salvarVitrine(), Vitrine, Delivery() (+15 more)

### Community 32 - "saida.ts"
Cohesion: 0.10
Nodes (18): adapt, app, g, gradle, m, man, permissoes, res (+10 more)

### Community 33 - "bairros.tsx"
Cohesion: 0.16
Nodes (24): AoVivo, AreaForm, calcularKmBairro(), FaixaForm, localizarLoja(), MotoboyAoVivo, R, salvarAreas() (+16 more)

### Community 34 - "Workflow do agente de impressão"
Cohesion: 0.09
Nodes (21): GH_TOKEN, runs-on, steps, jobs, exe, name, on, push (+13 more)

### Community 35 - "Montagem do cupom impresso"
Cohesion: 0.18
Nodes (18): blocosCombo(), colunasLR(), CupomDados, cupomTexto(), dataHora(), FRACAO, fracaoTexto(), LAYOUT_PADRAO (+10 more)

### Community 36 - "m/actions.ts"
Cohesion: 0.21
Nodes (18): chegadas(), espera(), medirEntrega(), montar(), planejarRota(), PlanoRota, Achado, distanciaRota() (+10 more)

### Community 37 - "importar-nfe.tsx"
Cohesion: 0.15
Nodes (25): importarNFe(), ItemImportar, vinculosFornecedor(), cnpjTexto(), dataTexto(), ImportarNFe(), lerFator(), Linha (+17 more)

### Community 38 - "preco.ts"
Cohesion: 0.11
Nodes (29): calcularCombo(), EscolhaPasso, PassoCombo, precoSeparado(), Papel, Recurso, RECURSOS, temPermissao() (+21 more)

### Community 39 - "painel-caixa.tsx"
Cohesion: 0.09
Nodes (45): abrirCaixa(), fecharCaixa(), movimentar(), msg(), R, salvarCaixa(), vincularSemCaixa(), dynamic (+37 more)

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

### Community 44 - "20261028000052_gestao_empresarial.sql"
Cohesion: 0.15
Nodes (20): custos_auditar, custos_loja_idx, funcionario_registros_idx, funcionario_registros_numero, funcionarios_loja_idx, gestao_empresa_auditar, private.contadores_registro, private.numerar_registro() (+12 more)

### Community 45 - "Grupo 45: package.json"
Cohesion: 0.14
Nodes (17): description, devDependencies, esbuild@0.24.0, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, tsx, @types/node (+9 more)

### Community 46 - "Grupo 46: package.json"
Cohesion: 0.13
Nodes (17): description, devDependencies, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, exports, tsx, @types/node (+9 more)

### Community 47 - "formatarReais"
Cohesion: 0.12
Nodes (24): carregar(), dynamic, generateMetadata(), PaginaCardapio(), dynamic, metadata, PaginaAcompanhar(), AcompanharPedido() (+16 more)

### Community 48 - "public.produtos"
Cohesion: 0.06
Nodes (59): complementos_loja_idx, grupos_opcoes_loja_idx, opcoes_grupo_idx, produto_grupos_grupo_idx, produtos_loja_setor_idx, public.complementos, public.criar_grupo_vinculado(), public.criar_produto() (+51 more)

### Community 49 - "pedidos/actions.ts"
Cohesion: 0.15
Nodes (12): criarPedido(), definirAceiteAutomatico(), marcarPago(), mensagem(), mudarStatus(), NovoPedido, Resultado, dynamic (+4 more)

### Community 50 - "estoque/actions.ts"
Cohesion: 0.24
Nodes (17): ajustarEstoque(), definirModoEstoque(), excluirInsumo(), feito(), R, salvarContagem(), salvarFatoresSabor(), salvarFicha() (+9 more)

### Community 51 - "gestao/actions.ts"
Cohesion: 0.26
Nodes (11): EscopoCustos, excluirRegistro(), FuncionarioForm, lojaGestor(), R, RegistroForm, salvarRegistro(), hoje() (+3 more)

### Community 52 - "index.ts"
Cohesion: 0.15
Nodes (23): exportarClientes(), listarClientes(), salvarCliente(), Clientes(), dynamic, baixarCsv(), FichaCliente(), ListaClientes() (+15 more)

### Community 53 - "programa.tsx"
Cohesion: 0.17
Nodes (25): PassoForm, Resultado, AplicarGrupo(), EditorCardapio(), Marca, Painel, EditorCombo(), lerCentavos() (+17 more)

### Community 54 - "beefood_para_res.py"
Cohesion: 0.33
Nodes (3): converter(), limpa(), L()

### Community 55 - "20261027000032_fidelidade.sql"
Cohesion: 0.14
Nodes (12): fidelidade_recompensas_grupo_idx, pedidos_fidelidade, private.aplicar_cupom(), private.fidelidade_status(), private.recompensas_json(), private.ultimo_pedido_cliente(), public.excluir_recompensa(), public.fidelidade_recompensas (+4 more)

### Community 56 - "funcionarios.tsx"
Cohesion: 0.23
Nodes (18): ligarFicha(), salvarFuncionario(), vazio(), criarUsuarioCaixa(), Assistente(), doFuncionario(), Funcionarios(), ModoAcesso (+10 more)

### Community 58 - "pg_temp.como"
Cohesion: 0.16
Nodes (17): clientes_auditar, clientes_grupo_nome_idx, pedidos_cliente_idx, pedidos_registra_cliente, private.grupo_da_loja(), private.pedido_registra_cliente(), public.buscar_clientes(), public.cliente_enderecos (+9 more)

### Community 59 - "promocao.test.ts"
Cohesion: 0.24
Nodes (11): D-021 Cardápio novo: cards com foto e promoção De/Por com agenda, AgendaPromo, diaAnterior(), diaDaSemana(), DIAS_CURTOS, partesLocais(), promoEncerrada(), promoVale() (+3 more)

### Community 60 - "[slug]/actions.ts"
Cohesion: 0.24
Nodes (15): calcularEntregaKm(), conferirCupom(), EntregaKm, enviarPedido(), FaixaKm, programaFidelidade(), saldoFidelidade(), FidelidadeCliente() (+7 more)

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
Cohesion: 0.13
Nodes (26): alterarFuncao(), cancelarConvite(), definirAtivo(), salvarPermissoesEquipe(), trocarSenhaUsuario(), ABAS, dynamic, Lojas() (+18 more)

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
Cohesion: 0.12
Nodes (34): CardapioCliente(), ETIQUETA, Extras(), Item, ItemCalculado, ler(), MaisInformacoes(), MontadorCombo() (+26 more)

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

### Community 94 - "formatarReais"
Cohesion: 0.23
Nodes (19): buscarClientes(), copiarFicha(), autorizarDesconto(), Alvo, chave(), Editor(), Fichas(), num() (+11 more)

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
Cohesion: 0.15
Nodes (22): DadosGrupo, salvarGrupo(), DetalheOpcao(), FotoOpcao(), reduzir(), TIPOS, useEnviarFoto(), FORMACOES (+14 more)

### Community 99 - "lojas/page.tsx"
Cohesion: 0.27
Nodes (9): situacaoPedidos(), Dados, guardarPedido(), lerPedidos(), MeusPedidos(), NavCliente(), PedidoGuardado, PerfilCliente() (+1 more)

### Community 101 - "form-setor.tsx"
Cohesion: 0.39
Nodes (7): salvarSetor(), FormSetor(), Marca, novoSetor(), SetorForm, setorVisivel(), validarSetor()

### Community 102 - "impressao.ts"
Cohesion: 0.22
Nodes (13): marcarImpressao(), RC, useImprimir(), colunasNavegador(), CSS_CUPOM, CupomFila, cupomHtml(), esc() (+5 more)

### Community 103 - "sabores-pizza.tsx"
Cohesion: 0.27
Nodes (13): amigavel(), Como(), diametro(), EditorSabor(), fmt(), Linha, num(), pctTexto() (+5 more)

### Community 104 - "escpos.ts"
Cohesion: 0.26
Nodes (10): codificar(), CP850, CP860, ESC_T, Pagina, semAcento(), ConfigImpressora, gerarEscPos() (+2 more)

### Community 107 - "funcionarios.tsx"
Cohesion: 0.10
Nodes (23): espera(), LoteSugerido, sugerirLotes(), SugestaoLoja, SugestaoLotes(), D-027 · Rota sugerida quando o motoboy sai com várias entregas, D-028 · Cliente acompanha a entrega, prazo por loja, alerta e lotes na expedição, tempos e atrasos, Ponto (+15 more)

### Community 116 - "20261027000026_rastreio_motoboys.sql"
Cohesion: 0.22
Nodes (10): motoboy_local_grupo_idx, motoboy_posicoes_em_idx, motoboy_posicoes_entregador_idx, pedidos_motoboy_sai_do_mapa, private.e_membro_do_grupo(), private.motoboy_sai_do_mapa(), public.motoboy_local, public.motoboy_posicoes (+2 more)

### Community 117 - "form-delivery.tsx"
Cohesion: 0.20
Nodes (13): acaoAvancar(), ErroPedido, LinhaTotal, proximosStatus(), STATUS_ROTULO, tempoDecorrido(), TIPO_ROTULO, Totais (+5 more)

### Community 118 - "rastreador.tsx"
Cohesion: 0.33
Nodes (7): cap(), Capacitor, EstadoRastreio, FaixaRastreio(), useRastreio(), Watcher, clienteNavegador()

### Community 119 - "contagem.tsx"
Cohesion: 0.60
Nodes (3): cadastrar(), credenciais(), entrar()

### Community 120 - "public.fidelidade_config"
Cohesion: 0.29
Nodes (7): private.saldo_fidelidade(), public.ajustar_fidelidade(), public.fidelidade_config, public.fidelidade_publica(), public.salvar_config_fidelidade(), public.ajustar_fidelidade(), public.salvar_config_fidelidade()

### Community 121 - "99zzzzzzzzzzzzzzzzzzzzz_evento.sql"
Cohesion: 0.32
Nodes (5): ids, pg_temp.id(), pg_temp.v(), quando, saida

### Community 122 - "mercadopago.ts"
Cohesion: 0.20
Nodes (14): POST(), conferirPixMercadoPago(), pixMercadoPago(), PagarPixMp(), atualizarPagamento(), conferirPix(), marcarPago(), Ped (+6 more)

### Community 123 - "public.pedidos"
Cohesion: 0.05
Nodes (76): public.lojas, public.reordenar(), pedido_eventos_pedido_idx, pedido_item_opcoes_item_idx, pedido_itens_pedido_idx, pedidos_atualizado, pedidos_loja_status_idx, private.contador_pedidos (+68 more)

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
Nodes (19): rastreioAoVivo(), diaDoTurno(), dynamic, Entregas(), CORES, haQuanto(), iniciais(), MapaAoVivo() (+11 more)

### Community 130 - "pg_temp.como"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 131 - "m/page.tsx"
Cohesion: 0.50
Nodes (4): painelMotoboy(), dynamic, maxDuration, Motoboy()

### Community 132 - "middleware.ts"
Cohesion: 0.33
Nodes (4): config, PUBLICAS, @supabase/ssr@0.5.2, @supabase/ssr

### Community 133 - "impressoras.ts"
Cohesion: 0.33
Nodes (4): ModeloImpressora, PaginaCodigo, PAGINAS_CODIGO, Protocolo

### Community 134 - "50_multilojas.sql"
Cohesion: 0.47
Nodes (4): ids, pg_temp.como(), pg_temp.id(), saida

### Community 135 - "99zzzzzzzzzzzzzzzzzzzzzz_quadro.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 136 - "99zzzz_descontos.sql"
Cohesion: 0.47
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 140 - "m/layout.tsx"
Cohesion: 0.50
Nodes (3): LayoutMotoboy(), metadata, viewport

## Knowledge Gaps
- **9 isolated node(s):** `pedidos.qr_token (/m/d/<código>)`, `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `GitHub Actions CI (rules, db, build)`, `Roadmap stages 3c-7 and integrations`, `supabase/migrations (Postgres RLS, audit, atomic ops)` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 645 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `(painel)/layout.tsx` to `estoque/page.tsx`, `entregas/page.tsx`, `public.setores`, `middleware.ts`, `API aberta e MCP (rotas)`, `app/layout.tsx`, `@supabase/supabase-js`, `m/layout.tsx`, `fidelidade/actions.ts`, `painel-impressoras.tsx`, `web/package.json`, `app-motoboy.tsx`, `resumo/page.tsx`, `[link]/page.tsx`, `server.ts`, `aplicativos.tsx`, `custos.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `lojas/actions.ts`, `criarClienteServidor`, `evento.tsx`, `salvando`, `bairros.tsx`, `painel-caixa.tsx`, `formatarReais`, `pedidos/actions.ts`, `estoque/actions.ts`, `gestao/actions.ts`, `index.ts`, `equipe.tsx`, `cardapio-cliente.tsx`, `formatarReais`, `lojas/page.tsx`, `sabores-pizza.tsx`, `contagem.tsx`, `mercadopago.ts`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `pedidos.qr_token (/m/d/<código>)`, `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `GitHub Actions CI (rules, db, build)` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `estoque/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10707070707070707 - nodes in this community are weakly interconnected._
- **Why does `criarClienteServidor()` connect `criarClienteServidor` to `estoque/page.tsx`, `entregas/page.tsx`, `public.setores`, `m/page.tsx`, `painel-impressoras.tsx`, `m/layout.tsx`, `fidelidade/actions.ts`, `app-motoboy.tsx`, `resumo/page.tsx`, `[link]/page.tsx`, `server.ts`, `aplicativos.tsx`, `formatarReais`, `custos.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `lojas/actions.ts`, `evento.tsx`, `salvando`, `bairros.tsx`, `m/actions.ts`, `importar-nfe.tsx`, `painel-caixa.tsx`, `formatarReais`, `pedidos/actions.ts`, `estoque/actions.ts`, `gestao/actions.ts`, `index.ts`, `funcionarios.tsx`, `[slug]/actions.ts`, `equipe.tsx`, `formatarReais`, `cardapio.test.ts`, `lojas/page.tsx`, `form-setor.tsx`, `impressao.ts`, `funcionarios.tsx`, `contagem.tsx`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `20261020000001_base.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.0944741532976827 - nodes in this community are weakly interconnected._
- **Why does `formatarReais()` connect `formatarReais` to `estoque/page.tsx`, `(painel)/layout.tsx`, `fidelidade/actions.ts`, `app-motoboy.tsx`, `resumo/page.tsx`, `aplicativos.tsx`, `formatarReais`, `Promoções e cupons (tela)`, `salvando`, `bairros.tsx`, `Montagem do cupom impresso`, `importar-nfe.tsx`, `preco.ts`, `painel-caixa.tsx`, `formatarReais`, `estoque/actions.ts`, `index.ts`, `programa.tsx`, `[slug]/actions.ts`, `cardapio-cliente.tsx`, `cardapio.test.ts`, `lojas/page.tsx`, `sabores-pizza.tsx`, `mercadopago.ts`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `main.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._