# Graph Report - res  (2026-10-28)

## Corpus Check
- 315 files · ~276,290 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 2601 nodes · 6731 edges · 134 communities (114 shown, 20 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b6bccb72`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- importar-nfe.tsx
- gestao/actions.ts
- 20261020000001_base.sql
- main.ts
- (painel)/layout.tsx
- 20261021000014_caixa.sql
- Banco: impressão
- Banco: fidelidade
- Banco: estoque
- API aberta e MCP (rotas)
- Tela de impressoras
- Resumo de vendas
- 20261021000008_multilojas.sql
- editor-combo.tsx
- dependencies
- CI (testes automáticos)
- app-motoboy.tsx
- public.marcas
- 20261028000040_api_webhooks.sql
- Decisões de arquitetura — RES
- next
- cardapio-dados.ts
- aplicativos.tsx
- formatarReais
- custos.tsx
- Promoções e cupons (tela)
- quadro-pedidos.tsx
- lojas/actions.ts
- criarClienteServidor
- Workflow do APK do motoboy
- evento.tsx
- saida.ts
- fidelidade/actions.ts
- bairros.tsx
- Workflow do agente de impressão
- Montagem do cupom impresso
- m/actions.ts
- estoque/page.tsx
- preco.ts
- painel-caixa.tsx
- Configuração TypeScript
- Banco: cupons e descontos
- Banco: Mercado Pago
- Dependências do app do motoboy
- 20261028000052_gestao_empresarial.sql
- Grupo 45: package.json
- Grupo 46: package.json
- acompanhar-pedido.tsx
- public.produtos
- estoque/actions.ts
- gestao/actions.ts
- src/caixa.ts
- index.ts
- sabores-pizza.tsx
- beefood_para_res.py
- 20261027000026_rastreio_motoboys.sql
- web/package.json
- graphify
- public.clientes
- promocao.test.ts
- cardapio-cliente.tsx
- rastreamento.tsx
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
- formatarReais
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
- public.usuarios_login
- 99zzzzzzzzzzzzzzzzzzz_gestao.sql
- Grupo 96: 70_caixa.sql
- 99zzzzzzzzzzzzzzzzz_taxa_km.sql
- cardapio.test.ts
- entregas/page.tsx
- Grupo 100: tempos_ajuste.sql
- form-setor.tsx
- Grupo 102: 20_cardapio_pedidos.sql
- insumos.tsx
- contagem.tsx
- Grupo 105: next.config.mjs
- Grupo 106: vercel.json
- funcionarios.tsx
- Grupo 108: test-db.sh
- pedido-flutuante.tsx
- pedido.ts
- pg_temp.como
- estoque/fechamento.tsx
- 99zzzz_descontos.sql
- 99zzzzzzzzzzzzzzzzzzzzz_evento.sql
- mercadopago.ts
- public.pedidos
- pg_temp.como
- 99zzzzzzzzzzzzzzzzzzzz_equipe.sql
- impressoras.ts
- entregas/page.tsx
- middleware.ts
- m/page.tsx
- scripts
- Multilojas (conta → lojas → marcas)

## God Nodes (most connected - your core abstractions)
1. `criarClienteServidor()` - 201 edges
2. `public.lojas` - 129 edges
3. `public.pedidos` - 110 edges
4. `formatarReais()` - 108 edges
5. `public.marcas` - 107 edges
6. `contextoLoja` - 104 edges
7. `salvando()` - 104 edges
8. `next` - 76 edges
9. `public.produtos` - 73 edges
10. `react` - 72 edges

## Surprising Connections (you probably didn't know these)
- `D-022 Combos com escolhas e categoria de up-sell` --references--> `calcularCombo()`  [INFERRED]
  docs/decisoes.md → packages/core/src/combo.ts
- `D-023 % por categoria, cupons e desconto no balcão com limite` --references--> `precoBase()`  [INFERRED]
  docs/decisoes.md → packages/core/src/preco.ts
- `D-030 · Telefone sempre com o 9 do celular` --references--> `normalizarTelefone()`  [INFERRED]
  docs/decisoes.md → packages/core/src/segmentos.ts
- `D-011 Pedido agendado e taxa por bairro no painel` --references--> `taxaDoBairro()`  [INFERRED]
  docs/decisoes.md → packages/core/src/agendamento.ts
- `D-036 · Estoque: entrada por NF-e e baixa pela ficha técnica` --references--> `lerNFe()`  [INFERRED]
  docs/decisoes.md → packages/core/src/estoque.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Rules duplicated in core and DB with shared test cases** — docs_decisoes_d_021_cardapio_cards_promo, docs_decisoes_d_022_combos_upsell, docs_decisoes_d_029_segmentos_clientes, docs_decisoes_d_030_telefone_nono_digito, docs_decisoes_d_031_fidelidade_grupo, docs_decisoes_core_db_parity [EXTRACTED 1.00]
- **Motoboy delivery flow (QR dispatch, app, tracking, routing)** — docs_decisoes_d_017_app_motoboy_qr, docs_decisoes_d_018_comanda_motoboy_pago, docs_decisoes_d_019_app_android_leitor_qr, docs_decisoes_d_026_rastreio_motoboys, docs_decisoes_d_027_rota_sugerida, apps_mobile_motoboy_readme_res_motoboy_android [INFERRED 0.85]
- **Stock management module (NF-e, recipes, counts, CMV)** — docs_decisoes_d_036_estoque_nfe_ficha, docs_decisoes_d_037_movimentacoes_estoque, docs_decisoes_d_038_meu_estoque_contagem, docs_decisoes_d_039_fechamento_cmv, docs_decisoes_d_040_ficha_sabor_pizza [INFERRED 0.85]

## Communities (134 total, 20 thin omitted)

### Community 0 - "importar-nfe.tsx"
Cohesion: 0.16
Nodes (24): importarNFe(), vinculosFornecedor(), cnpjTexto(), dataTexto(), ImportarNFe(), lerFator(), Linha, D-036 · Estoque: entrada por NF-e e baixa pela ficha técnica (+16 more)

### Community 1 - "gestao/actions.ts"
Cohesion: 0.19
Nodes (17): excluirRegistro(), RegistroForm, dias(), Documento(), dynamic, BotaoImprimir(), hoje(), Registros() (+9 more)

### Community 2 - "20261020000001_base.sql"
Cohesion: 0.11
Nodes (25): grupos_acesso_atualizado, grupos_acesso_auditar, grupos_acesso_validar, lojas_atualizado, lojas_auditar, marcas_atualizado, marcas_auditar, marcas_loja_idx (+17 more)

### Community 3 - "main.ts"
Cohesion: 0.05
Nodes (57): adapt, app, g, gradle, m, man, permissoes, res (+49 more)

### Community 4 - "(painel)/layout.tsx"
Cohesion: 0.27
Nodes (9): PainelLayout(), trocarLoja(), Icone(), Link_, LINKS, NavPainel(), SECOES, usePedidoFlutuante() (+1 more)

### Community 5 - "20261021000014_caixa.sql"
Cohesion: 0.13
Nodes (24): caixa_movimentos_sessao_idx, caixa_sessoes_auditar, caixa_sessoes_loja_idx, caixa_sessoes_uma_aberta_idx, caixas_auditar, caixas_nome_idx, lojas_caixa_inicial, pedidos_caixa_idx (+16 more)

### Community 6 - "Banco: impressão"
Cohesion: 0.06
Nodes (48): impressao_config_auditar, impressao_destinos_loja_idx, impressoes_loja_idx, impressoes_pedido_idx, impressoes_pendentes_idx, impressoras_auditar, impressoras_nome_idx, pedidos_imprimir_ao_aceitar (+40 more)

### Community 7 - "Banco: fidelidade"
Cohesion: 0.06
Nodes (46): fidelidade_mov_cliente_idx, fidelidade_mov_grupo_idx, fidelidade_mov_pedido_idx, fidelidade_recompensas_grupo_idx, pedidos_fidelidade, private.aplicar_cupom(), private.aplicar_fidelidade(), private.expirar_fidelidade() (+38 more)

### Community 8 - "Banco: estoque"
Cohesion: 0.07
Nodes (37): public.reordenar(), private.cupom_da_loja(), estoque_mov_estoque_idx, estoque_mov_insumo_idx, estoque_mov_pedido_idx, fichas_opcao_idx, fichas_produto_idx, insumos_estoque_idx (+29 more)

### Community 9 - "API aberta e MCP (rotas)"
Cohesion: 0.08
Nodes (33): DELETE, POST(), DELETE, POST(), GET(), OPTIONS, GET(), OPTIONS (+25 more)

### Community 10 - "Tela de impressoras"
Cohesion: 0.10
Nodes (40): ConfigImpressao, DadosImpressora, excluirImpressora(), gerarCodigoAgente(), imprimirPedido(), imprimirTeste(), msg(), R (+32 more)

### Community 11 - "Resumo de vendas"
Cohesion: 0.11
Nodes (35): Composicao, ComposicaoVendas(), dataBR(), dynamic, Kpi(), Metricas, PRESETS, Resumo (+27 more)

### Community 12 - "20261021000008_multilojas.sql"
Cohesion: 0.14
Nodes (19): contas_atualizado, public.contas, private.estoque_da_loja(), public.definir_modo_estoque(), public.estoque_painel(), contas_link_unico, private.config_integracao(), public.aplicativos_painel() (+11 more)

### Community 13 - "editor-combo.tsx"
Cohesion: 0.17
Nodes (21): PassoForm, Resultado, AplicarGrupo(), EditorCardapio(), Marca, Painel, EditorCombo(), lerCentavos() (+13 more)

### Community 14 - "dependencies"
Cohesion: 0.13
Nodes (13): dependencies, jsqr@1.4.0, next@^15.5.9, qrcode@^1.5.4, react@^19.2.1, react-dom@^19.2.1, @res/core@*, @supabase/supabase-js@2.47.10 (+5 more)

### Community 15 - "CI (testes automáticos)"
Cohesion: 0.07
Nodes (34): name, runs-on, services, steps, DATABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, POSTGRES_PASSWORD (+26 more)

### Community 16 - "app-motoboy.tsx"
Cohesion: 0.14
Nodes (28): despachar(), entregar(), PlanoRota, dynamic, metadata, PaginaDespacho(), Acerto(), AppMotoboy() (+20 more)

### Community 17 - "public.marcas"
Cohesion: 0.05
Nodes (56): public.marcas, private.setor_exige_marca(), public.setor_marcas, public.setores, setor_marcas_exige_marca, setores_exige_marca, areas_entrega_auditar, marca_horarios_auditar (+48 more)

### Community 18 - "20261028000040_api_webhooks.sql"
Cohesion: 0.12
Nodes (20): private.total_contagem(), pedidos_webhooks, private.disparar_webhook(), private.loja_da_chave(), private.processar_webhooks(), private.webhooks_pedido(), public.api_chaves, public.api_painel() (+12 more)

### Community 19 - "Decisões de arquitetura — RES"
Cohesion: 0.06
Nodes (35): D-002 Modelo multiloja: Loja → Marcas, D-003 Regras de cadastro valem no banco e no formulário, D-004 Auditoria calculada no servidor, D-005 Operações compostas são atômicas, D-006 Gravar só em ação explícita, D-007 Texto em UTF-8 completo, D-008 Nenhum segredo de integração no navegador, D-009 Preço de itens com grupos (decisão provisória, Q-009) (+27 more)

### Community 20 - "next"
Cohesion: 0.11
Nodes (13): carregar(), dynamic, generateMetadata(), Grupo, PaginaGrupo(), fonte, metadata, LayoutMotoboy() (+5 more)

### Community 21 - "cardapio-dados.ts"
Cohesion: 0.13
Nodes (22): Cardapio(), dynamic, dynamic, PaginaNovoPedido(), c(), dynamic, Promocoes(), CupomLinha (+14 more)

### Community 22 - "aplicativos.tsx"
Cohesion: 0.08
Nodes (53): conectarMercadoPago(), criarChaveApi(), desconectarMercadoPago(), excluirWebhook(), mpAceitarAoPagar(), R, removerIntegracao(), revogarChaveApi() (+45 more)

### Community 23 - "formatarReais"
Cohesion: 0.20
Nodes (13): ajustarEntrega(), CartaoMotoboy(), FechamentoMotoboys(), FONTE, hora(), LinhaEntrega(), Numero(), Total (+5 more)

### Community 24 - "custos.tsx"
Cohesion: 0.15
Nodes (21): EscopoCustos, salvarModoGrupo(), Aba, ABAS, dynamic, Gestao(), brl(), ler() (+13 more)

### Community 25 - "Promoções e cupons (tela)"
Cohesion: 0.15
Nodes (27): agenda(), alternarCupom(), CupomForm, excluirCupom(), excluirPromoCategoria(), fim(), PromoCategoriaForm, R (+19 more)

### Community 26 - "quadro-pedidos.tsx"
Cohesion: 0.14
Nodes (26): cuponsPendentes(), criarPedido(), definirAceiteAutomatico(), marcarPago(), mensagem(), mudarStatus(), Resultado, dynamic (+18 more)

### Community 27 - "lojas/actions.ts"
Cohesion: 0.17
Nodes (19): criarCardapio(), criarLoja(), definirCidade(), msg(), ABAS, dynamic, Lojas(), LojaEquipe (+11 more)

### Community 28 - "criarClienteServidor"
Cohesion: 0.19
Nodes (28): GET(), POST(), alterarDisponibilidade(), criarProduto(), definirFoto(), definirFotoOpcao(), definirGruposDoProduto(), definirProdutosDoGrupo() (+20 more)

### Community 29 - "Workflow do APK do motoboy"
Cohesion: 0.08
Nodes (24): runs-on, steps, GH_TOKEN, KS_B64, KS_PASS, jobs, apk, name (+16 more)

### Community 30 - "evento.tsx"
Cohesion: 0.13
Nodes (31): AjusteProduto, copiarParaEvento(), criarEvento(), msg(), R, refrescar(), removerProdutoEvento(), salvarEvento() (+23 more)

### Community 31 - "saida.ts"
Cohesion: 0.13
Nodes (25): CategoriaOrigem, ConfigDelivery, definirStatus(), replicarHorarios(), salvarConfig(), salvarVitrine(), Vitrine, Delivery() (+17 more)

### Community 32 - "fidelidade/actions.ts"
Cohesion: 0.07
Nodes (59): ajustarSaldo(), buscarSaldos(), copiarPrograma(), excluirRecompensa(), extratoCliente(), R, saldoDoCliente(), salvarConfigFidelidade() (+51 more)

### Community 33 - "bairros.tsx"
Cohesion: 0.15
Nodes (23): AoVivo, AreaForm, FaixaForm, localizarLoja(), MotoboyAoVivo, R, salvarAreas(), salvarFaixasKm() (+15 more)

### Community 34 - "Workflow do agente de impressão"
Cohesion: 0.09
Nodes (21): GH_TOKEN, runs-on, steps, jobs, exe, name, on, push (+13 more)

### Community 35 - "Montagem do cupom impresso"
Cohesion: 0.17
Nodes (17): D-014 Impressão: fila no banco, regras como no BeeFood, navegador até o agente chegar, D-015 Agente de impressão do Windows (RES Impressão), colunasLR(), cupomTexto(), dataHora(), FRACAO, fracaoTexto(), LAYOUT_PADRAO (+9 more)

### Community 36 - "m/actions.ts"
Cohesion: 0.23
Nodes (17): chegadas(), espera(), medirEntrega(), montar(), planejarRota(), calcularKmBairro(), Achado, distanciaRota() (+9 more)

### Community 37 - "estoque/page.tsx"
Cohesion: 0.15
Nodes (21): copiarFicha(), salvarFicha(), dynamic, Estoque(), Alvo, chave(), Editor(), Fichas() (+13 more)

### Community 38 - "preco.ts"
Cohesion: 0.11
Nodes (28): calcularCombo(), PassoCombo, precoSeparado(), Papel, Recurso, RECURSOS, temPermissao(), calcularItem() (+20 more)

### Community 39 - "painel-caixa.tsx"
Cohesion: 0.07
Nodes (53): cadastrar(), credenciais(), entrar(), abrirCaixa(), fecharCaixa(), movimentar(), msg(), R (+45 more)

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

### Community 44 - "20261028000052_gestao_empresarial.sql"
Cohesion: 0.15
Nodes (20): custos_auditar, custos_loja_idx, funcionario_registros_idx, funcionario_registros_numero, funcionarios_loja_idx, gestao_empresa_auditar, private.contadores_registro, private.numerar_registro() (+12 more)

### Community 45 - "Grupo 45: package.json"
Cohesion: 0.14
Nodes (17): description, devDependencies, esbuild@0.24.0, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, tsx, @types/node (+9 more)

### Community 46 - "Grupo 46: package.json"
Cohesion: 0.13
Nodes (17): description, devDependencies, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, exports, tsx, @types/node (+9 more)

### Community 47 - "acompanhar-pedido.tsx"
Cohesion: 0.31
Nodes (8): dynamic, metadata, PaginaAcompanhar(), AcompanharPedido(), ExtrasPedido, hora(), PagarPix(), Acompanhamento

### Community 48 - "public.produtos"
Cohesion: 0.06
Nodes (59): complementos_loja_idx, grupos_opcoes_loja_idx, opcoes_grupo_idx, produto_grupos_grupo_idx, produtos_loja_setor_idx, public.complementos, public.criar_grupo_vinculado(), public.criar_produto() (+51 more)

### Community 49 - "estoque/actions.ts"
Cohesion: 0.17
Nodes (17): ajustarEstoque(), buscarMovimentos(), definirModoEstoque(), excluirInsumo(), feito(), FiltroMovimentos, ItemImportar, R (+9 more)

### Community 50 - "gestao/actions.ts"
Cohesion: 0.36
Nodes (14): ligarFicha(), lojaGestor(), R, salvarCustos(), salvarEmpresa(), salvarFuncionario(), salvarRegistro(), vazio() (+6 more)

### Community 51 - "src/caixa.ts"
Cohesion: 0.20
Nodes (14): marcarImpressao(), RC, useImprimir(), colunasNavegador(), CSS_CUPOM, CupomFila, cupomHtml(), esc() (+6 more)

### Community 52 - "index.ts"
Cohesion: 0.12
Nodes (39): buscarClientes(), exportarClientes(), listarClientes(), salvarCliente(), Clientes(), dynamic, autorizarDesconto(), baixarCsv() (+31 more)

### Community 53 - "sabores-pizza.tsx"
Cohesion: 0.26
Nodes (14): salvarInsumo(), amigavel(), Como(), diametro(), EditorSabor(), fmt(), Linha, num() (+6 more)

### Community 54 - "beefood_para_res.py"
Cohesion: 0.33
Nodes (3): converter(), limpa(), L()

### Community 55 - "20261027000026_rastreio_motoboys.sql"
Cohesion: 0.20
Nodes (11): motoboy_local_grupo_idx, motoboy_posicoes_em_idx, motoboy_posicoes_entregador_idx, pedidos_motoboy_sai_do_mapa, private.e_membro_do_grupo(), private.motoboy_sai_do_mapa(), public.motoboy_local, public.motoboy_posicoes (+3 more)

### Community 56 - "web/package.json"
Cohesion: 0.18
Nodes (14): devDependencies, @types/node@22.10.2, @types/qrcode@^1.5.5, @types/react@^19.2.0, @types/react-dom@^19.2.0, typescript@5.6.3, @types/node, typescript (+6 more)

### Community 58 - "public.clientes"
Cohesion: 0.13
Nodes (17): clientes_auditar, clientes_grupo_nome_idx, pedidos_cliente_idx, pedidos_registra_cliente, private.grupo_da_loja(), private.pedido_registra_cliente(), public.buscar_clientes(), public.cliente_enderecos (+9 more)

### Community 59 - "promocao.test.ts"
Cohesion: 0.24
Nodes (11): D-021 Cardápio novo: cards com foto e promoção De/Por com agenda, AgendaPromo, diaAnterior(), diaDaSemana(), DIAS_CURTOS, partesLocais(), promoEncerrada(), promoVale() (+3 more)

### Community 60 - "cardapio-cliente.tsx"
Cohesion: 0.16
Nodes (21): calcularEntregaKm(), conferirCupom(), EntregaKm, enviarPedido(), programaFidelidade(), saldoFidelidade(), FidelidadeCliente(), lembrarPedidoFidelidade() (+13 more)

### Community 61 - "rastreamento.tsx"
Cohesion: 0.36
Nodes (7): carregar(), enviar(), Janela, Rastreamento(), script(), ConfigRastreio, EventoRastreio

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
Cohesion: 0.12
Nodes (31): FuncionarioForm, alterarFuncao(), cancelarConvite(), convidar(), criarUsuarioCaixa(), definirAtivo(), R, salvarPermissoesEquipe() (+23 more)

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

### Community 78 - "formatarReais"
Cohesion: 0.08
Nodes (52): FaixaKm, situacaoPedidos(), carregar(), dynamic, generateMetadata(), PaginaCardapio(), CardapioCliente(), ETIQUETA (+44 more)

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

### Community 94 - "public.usuarios_login"
Cohesion: 0.29
Nodes (4): public.pode_gerir_usuario(), public.registrar_usuario_caixa(), public.usuarios_login, auth.users

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
Cohesion: 0.18
Nodes (18): DadosGrupo, salvarGrupo(), DetalheOpcao(), FORMACOES, FormGrupo(), GrupoInicial, lerPreco(), mostrarPreco() (+10 more)

### Community 99 - "entregas/page.tsx"
Cohesion: 0.23
Nodes (11): diaDoTurno(), dynamic, Entregas(), BairrosEntregas(), LojaBairros, diaCurto(), pct(), PERIODOS (+3 more)

### Community 101 - "form-setor.tsx"
Cohesion: 0.39
Nodes (7): salvarSetor(), FormSetor(), Marca, novoSetor(), SetorForm, setorVisivel(), validarSetor()

### Community 102 - "Grupo 102: 20_cardapio_pedidos.sql"
Cohesion: 0.60
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 103 - "insumos.tsx"
Cohesion: 0.47
Nodes (9): Ajuste(), confirmarExclusao(), FormInsumo(), LinhaInsumo(), ListaInsumos(), num(), SIT, n() (+1 more)

### Community 104 - "contagem.tsx"
Cohesion: 0.33
Nodes (8): salvarContagem(), Contagem(), NovoItem(), num(), Origem, ContagemPainel, Insumo, UnidadeEstoque

### Community 107 - "funcionarios.tsx"
Cohesion: 0.10
Nodes (22): espera(), LoteSugerido, sugerirLotes(), SugestaoLoja, SugestaoLotes(), D-027 · Rota sugerida quando o motoboy sai com várias entregas, D-028 · Cliente acompanha a entrega, prazo por loja, alerta e lotes na expedição, tempos e atrasos, Ponto (+14 more)

### Community 116 - "pedido-flutuante.tsx"
Cohesion: 0.28
Nodes (8): dadosNovoPedido(), RascunhoPedido, AbrirPorLink(), Contexto, Ctx, Estado, PedidoFlutuanteProvider(), DadosNovoPedido

### Community 117 - "pedido.ts"
Cohesion: 0.18
Nodes (17): PedidoCliente, NovoPedido, CupomDados, acaoAvancar(), ErroPedido, FormaPagamento, LinhaTotal, proximosStatus() (+9 more)

### Community 119 - "estoque/fechamento.tsx"
Cohesion: 0.46
Nodes (7): dataCurta(), Fechamento(), pctTexto(), somaMes(), nomeMes(), pctDe(), quantidadeTexto()

### Community 120 - "99zzzz_descontos.sql"
Cohesion: 0.47
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 121 - "99zzzzzzzzzzzzzzzzzzzzz_evento.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 122 - "mercadopago.ts"
Cohesion: 0.23
Nodes (13): POST(), conferirPixMercadoPago(), pixMercadoPago(), PagarPixMp(), atualizarPagamento(), conferirPix(), marcarPago(), Ped (+5 more)

### Community 123 - "public.pedidos"
Cohesion: 0.05
Nodes (71): public.lojas, pedido_eventos_pedido_idx, pedido_item_opcoes_item_idx, pedido_itens_pedido_idx, pedidos_atualizado, pedidos_loja_status_idx, private.contador_pedidos, public.criar_pedido() (+63 more)

### Community 125 - "pg_temp.como"
Cohesion: 0.22
Nodes (10): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida, ids, pg_temp.como(), pg_temp.id() (+2 more)

### Community 126 - "99zzzzzzzzzzzzzzzzzzzz_equipe.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 127 - "impressoras.ts"
Cohesion: 0.29
Nodes (5): ModeloImpressora, MODELOS_IMPRESSORA, PaginaCodigo, PAGINAS_CODIGO, Protocolo

### Community 129 - "entregas/page.tsx"
Cohesion: 0.16
Nodes (17): rastreioAoVivo(), CORES, haQuanto(), iniciais(), MapaAoVivo(), segundos(), cap(), Capacitor (+9 more)

### Community 130 - "middleware.ts"
Cohesion: 0.33
Nodes (4): config, PUBLICAS, @supabase/ssr@0.5.2, @supabase/ssr

### Community 131 - "m/page.tsx"
Cohesion: 0.50
Nodes (4): painelMotoboy(), dynamic, maxDuration, Motoboy()

### Community 132 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, start, typecheck

## Knowledge Gaps
- **9 isolated node(s):** `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `pedidos.qr_token (/m/d/<código>)`, `GitHub Actions CI (rules, db, build)`, `Roadmap stages 3c-7 and integrations`, `supabase/migrations (Postgres RLS, audit, atomic ops)` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 620 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `gestao/actions.ts`, `middleware.ts`, `(painel)/layout.tsx`, `API aberta e MCP (rotas)`, `Tela de impressoras`, `Resumo de vendas`, `dependencies`, `app-motoboy.tsx`, `aplicativos.tsx`, `custos.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `lojas/actions.ts`, `criarClienteServidor`, `evento.tsx`, `saida.ts`, `fidelidade/actions.ts`, `bairros.tsx`, `estoque/page.tsx`, `painel-caixa.tsx`, `acompanhar-pedido.tsx`, `estoque/actions.ts`, `gestao/actions.ts`, `index.ts`, `sabores-pizza.tsx`, `web/package.json`, `equipe.tsx`, `formatarReais`, `entregas/page.tsx`, `pedido-flutuante.tsx`, `estoque/fechamento.tsx`, `mercadopago.ts`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **What connects `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `pedidos.qr_token (/m/d/<código>)`, `GitHub Actions CI (rules, db, build)` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `20261020000001_base.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.10752688172043011 - nodes in this community are weakly interconnected._
- **Why does `criarClienteServidor()` connect `criarClienteServidor` to `importar-nfe.tsx`, `entregas/page.tsx`, `gestao/actions.ts`, `m/page.tsx`, `Tela de impressoras`, `Resumo de vendas`, `app-motoboy.tsx`, `next`, `cardapio-dados.ts`, `aplicativos.tsx`, `formatarReais`, `custos.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `lojas/actions.ts`, `evento.tsx`, `saida.ts`, `fidelidade/actions.ts`, `bairros.tsx`, `m/actions.ts`, `estoque/page.tsx`, `painel-caixa.tsx`, `acompanhar-pedido.tsx`, `estoque/actions.ts`, `gestao/actions.ts`, `src/caixa.ts`, `index.ts`, `sabores-pizza.tsx`, `cardapio-cliente.tsx`, `equipe.tsx`, `formatarReais`, `cardapio.test.ts`, `entregas/page.tsx`, `form-setor.tsx`, `contagem.tsx`, `funcionarios.tsx`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Should `main.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0546583850931677 - nodes in this community are weakly interconnected._
- **Why does `formatarReais()` connect `formatarReais` to `importar-nfe.tsx`, `Resumo de vendas`, `editor-combo.tsx`, `app-motoboy.tsx`, `aplicativos.tsx`, `formatarReais`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `saida.ts`, `fidelidade/actions.ts`, `bairros.tsx`, `Montagem do cupom impresso`, `estoque/page.tsx`, `preco.ts`, `painel-caixa.tsx`, `acompanhar-pedido.tsx`, `estoque/actions.ts`, `index.ts`, `sabores-pizza.tsx`, `cardapio-cliente.tsx`, `cardapio.test.ts`, `insumos.tsx`, `contagem.tsx`, `pedido-flutuante.tsx`, `estoque/fechamento.tsx`, `mercadopago.ts`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `20261021000014_caixa.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._