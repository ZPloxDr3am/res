# Graph Report - res  (2026-11-02)

## Corpus Check
- 348 files · ~319,018 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 2928 nodes · 7598 edges · 138 communities (116 shown, 22 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 53 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `134eadb7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- estoque/page.tsx
- 20261020000001_base.sql
- gestao.ts
- main.ts
- pedido-flutuante.tsx
- 20261021000014_caixa.sql
- Banco: impressão
- public.fidelidade_movimentos
- Banco: estoque
- API aberta e MCP (rotas)
- salvando
- relatorios/page.tsx
- geo.ts
- fidelidade/page.tsx
- web/package.json
- CI (testes automáticos)
- app-motoboy.tsx
- resultados.tsx
- public.pedidos
- Decisões de arquitetura — RES
- criarClienteServidor
- novo-pedido.tsx
- aplicativos.tsx
- salvando
- app/layout.tsx
- Promoções e cupons (tela)
- quadro-pedidos.tsx
- steps
- financeiro/page.tsx
- Workflow do APK do motoboy
- evento.tsx
- form-delivery.tsx
- [slug]/page.tsx
- bairros.tsx
- Workflow do agente de impressão
- Montagem do cupom impresso
- react
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
- motoboy/scripts/ajustar-android.mjs
- 20261027000032_fidelidade.sql
- escpos.ts
- 20261027000026_rastreio_motoboys.sql
- public.produtos
- index.ts
- next
- beefood_para_res.py
- resumo/page.tsx
- CardapioCliente
- graphify
- public.clientes
- promocao.test.ts
- saida.ts
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
- D-017 Motoboy app with dispatch by order QR
- Grupo 75: 99z_entregas_km.sql
- Grupo 76: 99zzzzzzzzzzzz_estoque.sql
- Grupo 77: 99zzzzzzzzzzzzzz_api.sql
- 20261028000056_evento.sql
- Grupo 79: 99zzzzzzzzz_segmentos.sql
- Grupo 80: 90_agente.sql
- Grupo 81: 95_impressora_grupo.sql
- Grupo 82: 99zzzzzz_rastreio.sql
- public.fidelidade_config
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
- 99zzzzz_clientes.sql
- montagem.tsx
- Grupo 100: tempos_ajuste.sql
- pg_temp.como
- ao-vivo.tsx
- form-grupo.tsx
- 20261021000006_cardapio_digital.sql
- Grupo 105: next.config.mjs
- Grupo 106: vercel.json
- funcionarios.tsx
- Grupo 108: test-db.sh
- m/page.tsx
- 20261027000031_telefone_nono_digito.sql
- editor-cardapio.tsx
- pedido.ts
- lojas/actions.ts
- 99zzzzzzzzzzzzzzzzzzzzz_evento.sql
- mercadopago.ts
- salvando
- 99zzzzzzzzzzzzzzzzzzzz_equipe.sql
- middleware.ts
- gestao/actions.ts
- formatarReais
- 99zzzzzzzzzzzzzzzzzzzzzzz_financeiro.sql
- 20261021000008_multilojas.sql
- 99zzzzzzzzzzzzzzzzzzzzzz_quadro.sql
- 20261021000007_cardapio_biblioteca.sql
- api.tsx
- pg_temp.como
- cliente.tsx
- grafico-dias.tsx

## God Nodes (most connected - your core abstractions)
1. `criarClienteServidor()` - 228 edges
2. `public.lojas` - 160 edges
3. `public.pedidos` - 130 edges
4. `public.marcas` - 125 edges
5. `contextoLoja` - 120 edges
6. `salvando()` - 119 edges
7. `formatarReais()` - 113 edges
8. `next` - 82 edges
9. `react` - 79 edges
10. `public.produtos` - 78 edges

## Surprising Connections (you probably didn't know these)
- `D-022 Combos com escolhas e categoria de up-sell` --references--> `calcularCombo()`  [INFERRED]
  docs/decisoes.md → packages/core/src/combo.ts
- `D-023 % por categoria, cupons e desconto no balcão com limite` --references--> `precoBase()`  [INFERRED]
  docs/decisoes.md → packages/core/src/preco.ts
- `Ambiente no ar (piloto)` --references--> `main()`  [INFERRED]
  README.md → packages/agente/src/main.ts
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

## Communities (138 total, 22 thin omitted)

### Community 0 - "estoque/page.tsx"
Cohesion: 0.05
Nodes (97): ajustarEstoque(), buscarMovimentos(), copiarFicha(), excluirInsumo(), feito(), FiltroMovimentos, importarNFe(), ItemImportar (+89 more)

### Community 1 - "20261020000001_base.sql"
Cohesion: 0.08
Nodes (28): grupos_acesso_atualizado, grupos_acesso_auditar, grupos_acesso_validar, lojas_atualizado, lojas_auditar, marcas_atualizado, marcas_auditar, marcas_loja_idx (+20 more)

### Community 2 - "gestao.ts"
Cohesion: 0.15
Nodes (29): EscopoCustos, excluirRegistro(), FuncionarioForm, lojaGestor(), R, RegistroForm, salvarEmpresa(), salvarFuncionario() (+21 more)

### Community 3 - "main.ts"
Cohesion: 0.12
Nodes (31): acharWindows(), alcance(), argumento(), ARQ_CONFIG, ARQ_LOG, atualizarSePrecisar(), atualizarWindows(), Config (+23 more)

### Community 4 - "pedido-flutuante.tsx"
Cohesion: 0.15
Nodes (18): PainelLayout(), trocarLoja(), dadosNovoPedido(), Icone(), Link_, LINKS, NavPainel(), SECOES (+10 more)

### Community 5 - "20261021000014_caixa.sql"
Cohesion: 0.05
Nodes (51): caixa_movimentos_sessao_idx, caixa_sessoes_auditar, caixa_sessoes_loja_idx, caixa_sessoes_uma_aberta_idx, caixas_auditar, caixas_nome_idx, lojas_caixa_inicial, pedidos_caixa_idx (+43 more)

### Community 6 - "Banco: impressão"
Cohesion: 0.06
Nodes (48): impressao_config_auditar, impressao_destinos_loja_idx, impressoes_loja_idx, impressoes_pedido_idx, impressoes_pendentes_idx, impressoras_auditar, impressoras_nome_idx, pedidos_imprimir_ao_aceitar (+40 more)

### Community 7 - "public.fidelidade_movimentos"
Cohesion: 0.12
Nodes (16): fidelidade_mov_cliente_idx, fidelidade_mov_grupo_idx, fidelidade_mov_pedido_idx, private.expirar_fidelidade(), public.extrato_fidelidade(), public.fidelidade_movimentos, public.painel_fidelidade(), fidelidade_mov_cliente_loja_idx (+8 more)

### Community 8 - "Banco: estoque"
Cohesion: 0.07
Nodes (41): public.resumo_vendas(), private.cupom_da_loja(), public.relatorio_entregas(), estoque_mov_estoque_idx, estoque_mov_insumo_idx, estoque_mov_pedido_idx, fichas_opcao_idx, fichas_produto_idx (+33 more)

### Community 9 - "API aberta e MCP (rotas)"
Cohesion: 0.08
Nodes (33): DELETE, POST(), DELETE, POST(), GET(), OPTIONS, GET(), OPTIONS (+25 more)

### Community 10 - "salvando"
Cohesion: 0.07
Nodes (53): ConfigImpressao, DadosImpressora, excluirImpressora(), gerarCodigoAgente(), imprimirPedido(), imprimirTeste(), msg(), R (+45 more)

### Community 11 - "relatorios/page.tsx"
Cohesion: 0.07
Nodes (29): Aba, ABAS, Cancelado, Cor, CORES_BARRA, corTempo(), dataBR(), dynamic (+21 more)

### Community 12 - "geo.ts"
Cohesion: 0.25
Nodes (16): chegadas(), espera(), medirEntrega(), montar(), planejarRota(), Achado, distanciaRota(), EnderecoEntrega (+8 more)

### Community 13 - "fidelidade/page.tsx"
Cohesion: 0.07
Nodes (59): ajustarSaldo(), buscarSaldos(), copiarPrograma(), excluirRecompensa(), extratoCliente(), R, saldoDoCliente(), salvarConfigFidelidade() (+51 more)

### Community 14 - "web/package.json"
Cohesion: 0.08
Nodes (30): dependencies, jsqr@1.4.0, next@^15.5.9, react@^19.2.1, react-dom@^19.2.1, @res/core@*, @supabase/supabase-js@2.47.10, devDependencies (+22 more)

### Community 15 - "CI (testes automáticos)"
Cohesion: 0.07
Nodes (34): name, runs-on, services, steps, DATABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, POSTGRES_PASSWORD (+26 more)

### Community 16 - "app-motoboy.tsx"
Cohesion: 0.13
Nodes (29): despachar(), entregar(), PlanoRota, dynamic, metadata, PaginaDespacho(), Acerto(), AppMotoboy() (+21 more)

### Community 17 - "resultados.tsx"
Cohesion: 0.14
Nodes (15): campo(), crc16Pix(), FORMATOS_RASTREAMENTO, normalizarChavePix(), pixCopiaECola(), semAcento(), TipoChavePix, Papel (+7 more)

### Community 18 - "public.pedidos"
Cohesion: 0.04
Nodes (100): public.lojas, public.marcas, pedido_eventos_pedido_idx, pedido_item_opcoes_item_idx, pedido_itens_pedido_idx, pedidos_atualizado, pedidos_loja_status_idx, private.contador_pedidos (+92 more)

### Community 19 - "Decisões de arquitetura — RES"
Cohesion: 0.06
Nodes (35): D-002 Modelo multiloja: Loja → Marcas, D-003 Regras de cadastro valem no banco e no formulário, D-004 Auditoria calculada no servidor, D-005 Operações compostas são atômicas, D-006 Gravar só em ação explícita, D-007 Texto em UTF-8 completo, D-008 Nenhum segredo de integração no navegador, D-009 Preço de itens com grupos (decisão provisória, Q-009) (+27 more)

### Community 20 - "criarClienteServidor"
Cohesion: 0.29
Nodes (12): criarCardapio(), criarLoja(), definirCidade(), msg(), CartaoLoja(), Conta, GestaoLojas(), Msg() (+4 more)

### Community 21 - "novo-pedido.tsx"
Cohesion: 0.15
Nodes (29): buscarClientes(), autorizarDesconto(), dynamic, PaginaNovoPedido(), GruposBalcao(), ItemCarrinho, lerCentavos(), Montador() (+21 more)

### Community 22 - "aplicativos.tsx"
Cohesion: 0.10
Nodes (47): conectarMercadoPago(), criarChaveApi(), desconectarMercadoPago(), excluirWebhook(), mpAceitarAoPagar(), R, removerIntegracao(), revogarChaveApi() (+39 more)

### Community 23 - "salvando"
Cohesion: 0.23
Nodes (15): ajustarEntrega(), CartaoMotoboy(), FechamentoMotoboys(), FONTE, hora(), LinhaEntrega(), Numero(), Total (+7 more)

### Community 25 - "Promoções e cupons (tela)"
Cohesion: 0.10
Nodes (46): agenda(), alternarCupom(), alternarFreteGratis(), CupomForm, excluirCupom(), excluirFreteGratis(), excluirPromoCategoria(), fim() (+38 more)

### Community 26 - "quadro-pedidos.tsx"
Cohesion: 0.10
Nodes (39): PedidoCliente, cuponsPendentes(), criarPedido(), definirAceiteAutomatico(), definirMovimento(), definirProntoAuto(), marcarAviso(), marcarPago() (+31 more)

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
Nodes (33): AjusteProduto, copiarParaEvento(), criarEvento(), msg(), R, refrescar(), removerProdutoEvento(), salvarEvento() (+25 more)

### Community 31 - "form-delivery.tsx"
Cohesion: 0.19
Nodes (16): ConfigDelivery, definirStatus(), replicarHorarios(), salvarConfig(), salvarVitrine(), Vitrine, Delivery(), dynamic (+8 more)

### Community 32 - "[slug]/page.tsx"
Cohesion: 0.17
Nodes (16): carregar(), dynamic, generateMetadata(), PaginaCardapio(), FreteGratisPublico, carregar(), enviar(), Janela (+8 more)

### Community 33 - "bairros.tsx"
Cohesion: 0.16
Nodes (24): AoVivo, AreaForm, calcularKmBairro(), FaixaForm, localizarLoja(), MotoboyAoVivo, R, salvarAreas() (+16 more)

### Community 34 - "Workflow do agente de impressão"
Cohesion: 0.09
Nodes (21): GH_TOKEN, runs-on, steps, jobs, exe, name, on, push (+13 more)

### Community 35 - "Montagem do cupom impresso"
Cohesion: 0.20
Nodes (16): blocosCombo(), colunasLR(), cupomTexto(), dataHora(), FRACAO, fracaoTexto(), LAYOUT_PADRAO, montarCupom() (+8 more)

### Community 36 - "react"
Cohesion: 0.11
Nodes (23): Caixa(), definirFotoOpcao(), Cardapio(), dynamic, definirModoEstoque(), Evento(), marcarImpressao(), dynamic (+15 more)

### Community 37 - "gestao/actions.ts"
Cohesion: 0.16
Nodes (20): salvarCustos(), salvarModoGrupo(), Aba, ABAS, dynamic, Gestao(), brl(), ler() (+12 more)

### Community 38 - "preco.ts"
Cohesion: 0.15
Nodes (20): PassoCombo, precoSeparado(), LinhaTotal, Totais, grupoVisivel(), opcaoVisivel(), precoGrupo(), precoOpcao() (+12 more)

### Community 39 - "painel-caixa.tsx"
Cohesion: 0.09
Nodes (43): abrirCaixa(), fecharCaixa(), movimentar(), msg(), R, salvarCaixa(), vincularSemCaixa(), dynamic (+35 more)

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
Cohesion: 0.09
Nodes (28): dependencies, @capacitor/android@6.2.0, @capacitor/app@6.0.2, @capacitor/cli@6.2.0, @capacitor-community/background-geolocation@1.2.26, @capacitor/core@6.2.0, description, name (+20 more)

### Community 44 - "public.fin_lancamentos"
Cohesion: 0.05
Nodes (60): public.tabela_preco_horarios, public.tabela_preco_itens, public.tabela_preco_marcas, public.tabelas_preco, public.reordenar(), custos_auditar, custos_loja_idx, funcionario_registros_idx (+52 more)

### Community 45 - "Grupo 45: package.json"
Cohesion: 0.14
Nodes (17): description, devDependencies, esbuild@0.24.0, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, tsx, @types/node (+9 more)

### Community 46 - "Grupo 46: package.json"
Cohesion: 0.13
Nodes (17): description, devDependencies, tsx@4.19.2, @types/node@22.10.2, typescript@5.6.3, exports, tsx, @types/node (+9 more)

### Community 47 - "motoboy/scripts/ajustar-android.mjs"
Cohesion: 0.09
Nodes (19): adapt, app, g, gradle, m, man, permissoes, res (+11 more)

### Community 48 - "20261027000032_fidelidade.sql"
Cohesion: 0.13
Nodes (14): fidelidade_recompensas_grupo_idx, pedidos_fidelidade, private.aplicar_cupom(), private.fidelidade_status(), private.recompensas_json(), private.ultimo_pedido_cliente(), public.excluir_recompensa(), public.fidelidade_recompensas (+6 more)

### Community 49 - "escpos.ts"
Cohesion: 0.26
Nodes (10): codificar(), CP850, CP860, ESC_T, Pagina, semAcento(), ConfigImpressora, gerarEscPos() (+2 more)

### Community 50 - "20261027000026_rastreio_motoboys.sql"
Cohesion: 0.10
Nodes (22): motoboy_local_grupo_idx, motoboy_posicoes_em_idx, motoboy_posicoes_entregador_idx, pedidos_motoboy_sai_do_mapa, private.e_membro_do_grupo(), public.motoboy_posicoes, public.rastreio_ao_vivo(), public.registrar_destino() (+14 more)

### Community 51 - "public.produtos"
Cohesion: 0.05
Nodes (75): complementos_loja_idx, grupos_opcoes_loja_idx, opcoes_grupo_idx, private.setor_exige_marca(), produto_grupos_grupo_idx, produtos_loja_setor_idx, public.complementos, public.criar_grupo_vinculado() (+67 more)

### Community 52 - "index.ts"
Cohesion: 0.23
Nodes (16): exportarClientes(), listarClientes(), salvarCliente(), Clientes(), dynamic, baixarCsv(), FichaCliente(), ListaClientes() (+8 more)

### Community 53 - "next"
Cohesion: 0.08
Nodes (21): GET(), POST(), carregar(), dynamic, generateMetadata(), Grupo, PaginaGrupo(), cadastrar() (+13 more)

### Community 54 - "beefood_para_res.py"
Cohesion: 0.33
Nodes (3): converter(), limpa(), L()

### Community 55 - "resumo/page.tsx"
Cohesion: 0.08
Nodes (45): salvarMeta(), Composicao, ComposicaoVendas(), dataBR(), dynamic, Kpi(), Metricas, PRESETS (+37 more)

### Community 56 - "CardapioCliente"
Cohesion: 0.12
Nodes (30): enviarPedido(), situacaoPedidos(), CardapioCliente(), Checkout(), ETIQUETA, Extras(), gravar(), Item (+22 more)

### Community 58 - "public.clientes"
Cohesion: 0.16
Nodes (17): clientes_auditar, clientes_grupo_nome_idx, pedidos_cliente_idx, pedidos_registra_cliente, private.grupo_da_loja(), private.pedido_registra_cliente(), public.buscar_clientes(), public.cliente_enderecos (+9 more)

### Community 59 - "promocao.test.ts"
Cohesion: 0.24
Nodes (11): D-021 Cardápio novo: cards com foto e promoção De/Por com agenda, AgendaPromo, diaAnterior(), diaDaSemana(), DIAS_CURTOS, partesLocais(), promoEncerrada(), promoVale() (+3 more)

### Community 60 - "saida.ts"
Cohesion: 0.23
Nodes (7): caminhoScript(), hostPorta(), imprimirRede(), imprimirWindows(), powershell(), PS_RAW, testarRede()

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
Cohesion: 0.11
Nodes (37): ligarFicha(), alterarFuncao(), cancelarConvite(), convidar(), definirAtivo(), salvarPermissoesEquipe(), ABAS, dynamic (+29 more)

### Community 75 - "Grupo 75: 99z_entregas_km.sql"
Cohesion: 0.39
Nodes (7): ids, pg_temp.como(), pg_temp.id(), pg_temp.token(), pg_temp.v(), saida, tokens

### Community 76 - "Grupo 76: 99zzzzzzzzzzzz_estoque.sql"
Cohesion: 0.32
Nodes (6): ids, pg_temp.id(), pg_temp.v(), s1, s2, saida

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

### Community 83 - "public.fidelidade_config"
Cohesion: 0.22
Nodes (9): private.saldo_fidelidade(), public.ajustar_fidelidade(), public.fidelidade_config, public.fidelidade_publica(), public.salvar_config_fidelidade(), private.saldo_fidelidade(), public.ajustar_fidelidade(), public.fidelidade_publica() (+1 more)

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

### Community 98 - "99zzzzz_clientes.sql"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 99 - "montagem.tsx"
Cohesion: 0.17
Nodes (20): MontadorCombo(), acrescimo(), cheio(), completo(), Extras, GruposMontagem(), minimo(), Montador() (+12 more)

### Community 101 - "pg_temp.como"
Cohesion: 0.48
Nodes (5): ids, pg_temp.como(), pg_temp.id(), pg_temp.v(), saida

### Community 102 - "ao-vivo.tsx"
Cohesion: 0.14
Nodes (20): rastreioAoVivo(), diaDoTurno(), dynamic, Entregas(), CORES, haQuanto(), iniciais(), MapaAoVivo() (+12 more)

### Community 103 - "form-grupo.tsx"
Cohesion: 0.17
Nodes (19): DadosGrupo, salvarDetalheOpcao(), salvarGrupo(), DetalheOpcao(), FORMACOES, FormGrupo(), GrupoInicial, lerPreco() (+11 more)

### Community 104 - "20261021000006_cardapio_digital.sql"
Cohesion: 0.22
Nodes (10): areas_entrega_auditar, marca_horarios_auditar, private.marca_aberta(), public.areas_entrega, public.cardapio_publico(), public.marca_horarios, public.salvar_config_delivery(), private.taxa_bairro() (+2 more)

### Community 107 - "funcionarios.tsx"
Cohesion: 0.10
Nodes (23): espera(), LoteSugerido, sugerirLotes(), SugestaoLoja, SugestaoLotes(), D-027 · Rota sugerida quando o motoboy sai com várias entregas, D-028 · Cliente acompanha a entrega, prazo por loja, alerta e lotes na expedição, tempos e atrasos, Ponto (+15 more)

### Community 116 - "m/page.tsx"
Cohesion: 0.50
Nodes (4): painelMotoboy(), dynamic, maxDuration, Motoboy()

### Community 118 - "editor-cardapio.tsx"
Cohesion: 0.11
Nodes (49): alterarDisponibilidade(), CategoriaOrigem, criarProduto(), definirFoto(), definirGruposDoProduto(), definirProdutosDoGrupo(), desvincularGrupo(), duplicarGrupo() (+41 more)

### Community 119 - "pedido.ts"
Cohesion: 0.44
Nodes (7): acaoAvancar(), ErroPedido, proximosStatus(), tempoDecorrido(), totalizar(), transicaoValida(), troco()

### Community 120 - "lojas/actions.ts"
Cohesion: 0.29
Nodes (11): criarUsuarioCaixa(), R, trocarSenhaUsuario(), clienteAdmin(), SEM_CHAVE_ADMIN, CEDULAS, DOMINIO_USUARIOS, emailDeLogin() (+3 more)

### Community 121 - "99zzzzzzzzzzzzzzzzzzzzz_evento.sql"
Cohesion: 0.32
Nodes (5): ids, pg_temp.id(), pg_temp.v(), quando, saida

### Community 122 - "mercadopago.ts"
Cohesion: 0.13
Nodes (22): POST(), conferirPixMercadoPago(), pixMercadoPago(), dynamic, metadata, PaginaAcompanhar(), AcompanharPedido(), ExtrasPedido (+14 more)

### Community 125 - "salvando"
Cohesion: 0.30
Nodes (10): seloCliente(), D-029 · Segmentos de clientes para marketing, D-030 · Telefone sempre com o 9 do celular, CASOS_SEGMENTO, CASOS_TELEFONE, eCelular(), normalizarTelefone(), segmentoCliente() (+2 more)

### Community 126 - "99zzzzzzzzzzzzzzzzzzzz_equipe.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 127 - "middleware.ts"
Cohesion: 0.60
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 129 - "gestao/actions.ts"
Cohesion: 0.40
Nodes (5): cap(), Capacitor, EstadoRastreio, useRastreio(), Watcher

### Community 131 - "formatarReais"
Cohesion: 0.47
Nodes (4): ids, pg_temp.como(), pg_temp.id(), saida

### Community 132 - "99zzzzzzzzzzzzzzzzzzzzzzz_financeiro.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 134 - "20261021000008_multilojas.sql"
Cohesion: 0.10
Nodes (28): contas_atualizado, contas_proteger_plano, contas_titulares_user_idx, lojas_conta_idx, lojas_limite, marcas_limite, pedidos_loja_criado_idx, private.e_titular() (+20 more)

### Community 135 - "99zzzzzzzzzzzzzzzzzzzzzz_quadro.sql"
Cohesion: 0.38
Nodes (4): ids, pg_temp.id(), pg_temp.v(), saida

### Community 136 - "20261021000007_cardapio_biblioteca.sql"
Cohesion: 0.47
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 138 - "api.tsx"
Cohesion: 0.39
Nodes (7): salvarSetor(), FormSetor(), Marca, novoSetor(), SetorForm, setorVisivel(), validarSetor()

### Community 141 - "pg_temp.como"
Cohesion: 0.60
Nodes (3): ids, pg_temp.como(), pg_temp.id()

### Community 143 - "cliente.tsx"
Cohesion: 0.26
Nodes (11): calcularEntregaKm(), conferirCupom(), EntregaKm, FaixaKm, programaFidelidade(), saldoFidelidade(), FidelidadeCliente(), lembrarPedidoFidelidade() (+3 more)

### Community 145 - "grafico-dias.tsx"
Cohesion: 0.23
Nodes (9): frete_gratis_auditar, frete_gratis_loja_idx, private.aplicar_cupom(), private.aplicar_frete_gratis(), private.base_cupom(), private.regra_frete_gratis(), public.frete_gratis, public.frete_gratis_publico() (+1 more)

## Knowledge Gaps
- **9 isolated node(s):** `pedidos.qr_token (/m/d/<código>)`, `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `GitHub Actions CI (rules, db, build)`, `Roadmap stages 3c-7 and integrations`, `supabase/migrations (Postgres RLS, audit, atomic ops)` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 707 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `estoque/page.tsx`, `gestao.ts`, `pedido-flutuante.tsx`, `API aberta e MCP (rotas)`, `salvando`, `relatorios/page.tsx`, `fidelidade/page.tsx`, `web/package.json`, `app-motoboy.tsx`, `criarClienteServidor`, `novo-pedido.tsx`, `aplicativos.tsx`, `app/layout.tsx`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `financeiro/page.tsx`, `evento.tsx`, `form-delivery.tsx`, `[slug]/page.tsx`, `bairros.tsx`, `react`, `gestao/actions.ts`, `painel-caixa.tsx`, `index.ts`, `resumo/page.tsx`, `CardapioCliente`, `equipe.tsx`, `ao-vivo.tsx`, `editor-cardapio.tsx`, `lojas/actions.ts`, `mercadopago.ts`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **What connects `pedidos.qr_token (/m/d/<código>)`, `contas table plans and limits (plano, limite_lojas, limite_cardapios)`, `GitHub Actions CI (rules, db, build)` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `estoque/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05070892410341952 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `estoque/page.tsx`, `gestao/actions.ts`, `gestao.ts`, `pedido-flutuante.tsx`, `api.tsx`, `relatorios/page.tsx`, `salvando`, `fidelidade/page.tsx`, `web/package.json`, `cliente.tsx`, `app-motoboy.tsx`, `criarClienteServidor`, `novo-pedido.tsx`, `aplicativos.tsx`, `salvando`, `Promoções e cupons (tela)`, `quadro-pedidos.tsx`, `financeiro/page.tsx`, `evento.tsx`, `form-delivery.tsx`, `[slug]/page.tsx`, `bairros.tsx`, `gestao/actions.ts`, `painel-caixa.tsx`, `index.ts`, `resumo/page.tsx`, `CardapioCliente`, `equipe.tsx`, `montagem.tsx`, `ao-vivo.tsx`, `form-grupo.tsx`, `funcionarios.tsx`, `editor-cardapio.tsx`, `mercadopago.ts`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `20261020000001_base.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.08408408408408409 - nodes in this community are weakly interconnected._
- **Why does `criarClienteServidor()` connect `Promoções e cupons (tela)` to `estoque/page.tsx`, `gestao.ts`, `api.tsx`, `salvando`, `geo.ts`, `fidelidade/page.tsx`, `relatorios/page.tsx`, `cliente.tsx`, `app-motoboy.tsx`, `criarClienteServidor`, `novo-pedido.tsx`, `aplicativos.tsx`, `salvando`, `quadro-pedidos.tsx`, `financeiro/page.tsx`, `evento.tsx`, `form-delivery.tsx`, `[slug]/page.tsx`, `bairros.tsx`, `react`, `gestao/actions.ts`, `painel-caixa.tsx`, `index.ts`, `next`, `resumo/page.tsx`, `CardapioCliente`, `equipe.tsx`, `ao-vivo.tsx`, `form-grupo.tsx`, `funcionarios.tsx`, `m/page.tsx`, `editor-cardapio.tsx`, `lojas/actions.ts`, `mercadopago.ts`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Should `gestao.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1495798319327731 - nodes in this community are weakly interconnected._