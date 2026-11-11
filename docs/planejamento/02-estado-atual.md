# Estado atual por área

Fonte: `README.md`, `docs/decisoes.md` (D-001 a D-072) e as telas em `apps/web/app/(painel)`. Atualizado em 06/11/2026.

Legenda: ✅ pronto · 🔧 em andamento · ⏳ não começou · ⛔ bloqueado · ❄️ adiado

## Base e infraestrutura

| Item | Situação | Observação |
|---|---|---|
| Stack Next.js + Supabase, RLS por loja, auditoria, operações atômicas | ✅ | D-001 a D-008 |
| Deploy automático (Vercel) e CI (core, banco, build, apps) | ✅ | 4 workflows em `.github/workflows` |
| Multilojas: conta → lojas → marcas, pacotes/limites | ✅ | Pacote só muda via SQL pela equipe RES |
| Login, permissões por grupo, usuário de caixa sem e-mail | ✅ | D-012 |
| Mapa do código (graphify) | ✅ | Regra do dono: consultar antes de ler código, `graphify update .` depois |
| Monitoramento de erros em produção (Sentry ou similar) | ⏳ | Não há nada registrado |
| Backup/restore do banco testado | ⏳ | Supabase faz backup, mas nunca testamos restaurar |
| Ambiente de homologação separado da produção | ⏳ | Hoje só existe "RES - PRÓPRIO" (produção/piloto) |

## Cardápio e pedidos

| Item | Situação | Observação |
|---|---|---|
| Cardápio: categorias, produtos, grupos de opções, pizza por fração, preços por canal, fotos, combos | ✅ | D-009, D-021, D-022, D-040, D-041 |
| Importar cardápio do BeeFood | ✅ | D-049, `scripts/beefood_para_res.py` |
| Quadro de pedidos em tempo real, aceite automático, agendados, filtros, pausa com recado, modo movimento | ✅ | D-011, D-057, D-059, D-062, D-063 |
| Novo pedido em janela flutuante | ✅ | |
| Cardápio digital `/c/<slug>`: vitrine, montagem, pedido, acompanhamento, horários, bairros, raio em km | ✅ | D-045 a D-048 (entregas 1 e 2 de 3) |
| Cardápio digital — entrega 3 de 3 | 🔧 | Confirmar com o Emmanuel o que faltou da 3ª entrega |
| Cardápio de evento / pré-venda | ✅ | D-055, D-056 |
| KDS (tela da cozinha) | ⏳ | README etapa 4; listado "Em breve" em Aplicativos |
| Salão: mesas, comandas, PDV, garçom por tablet | ⏳ | README etapa 7; D-067 deixa indicadores "para o atendimento por tablet" |

## Pagamentos

| Item | Situação | Observação |
|---|---|---|
| Pix estático (BR Code) com confirmação manual | ✅ | D-042 |
| Mercado Pago Pix dinâmico com confirmação automática, pedido só vai à cozinha depois de pago | ✅ | D-044, migrações 0042–0044 |
| Cartão online | ⏳ | D-044: "próxima etapa" |
| TEF (maquininha integrada) | ⏳ | "Em breve" |
| Fiscal: NFC-e | ⏳ | Depende de certificado A1 e provedor fiscal |

## Operação

| Item | Situação | Observação |
|---|---|---|
| Caixa: sessão, sangria, suprimento, fechamento cego | ✅ | D-013 |
| Impressão: fila, regras, layout por marca, agente Windows "RES Impressão" | ✅ | D-014 a D-016, `packages/agente` |
| Motoboy: app `/m`, QR da comanda, rota sugerida, rastreio ao vivo, km e valor por bairro | ✅ | D-017 a D-020, D-026 a D-028 |
| App Android motoboy e app Android painel (Capacitor) | ✅ | D-019, D-069; painel adaptado ao celular D-070 |
| Entregador sob demanda (Lalamove, Loggi…) | ⏳ | "Em breve" |
| Estoque: NF-e, ficha técnica, contagem, perdas, CMV | ✅ | D-036 a D-039, D-071, D-072 |
| Busca automática de NF-e na SEFAZ | ❄️ | D-036: exige certificado A1 e provedor fiscal |

## Clientes e marketing

| Item | Situação | Observação |
|---|---|---|
| Cadastro de clientes, telefone normalizado, segmentos | ✅ | D-025, D-029, D-030 |
| Cupons (inclusive por área/produto, frete grátis automático), promoções De/Por | ✅ | D-023, D-066 |
| Fidelidade (cashback e pontos por loja) | ✅ | D-031 a D-033 |
| "Avisar cliente" em fila (hoje abre o WhatsApp manual) | ✅ | D-057, D-058 |
| WhatsApp oficial (API da Meta) para envio automático | ⛔ | D-058: depende do cadastro na Meta — **quem faz?** |
| SMS | ⏳ | "Em breve" |
| Pixels (Meta, GA4, Ads, GTM), avaliação no Google | ✅ | D-042 |

## Gestão e relatórios

| Item | Situação | Observação |
|---|---|---|
| Resumo, relatórios (ABC, cancelamentos, calendário, operação, cores) | ✅ | D-064, D-065, D-067, D-068 |
| Financeiro: contas, fluxo, DRE, taxas | ✅ | D-060, D-061 |
| Gestão Empresarial: custos, funcionários, faltas/advertências | ✅ | D-050 a D-054 |

## Integrações e API

| Item | Situação | Observação |
|---|---|---|
| API REST só leitura, webhooks assinados, servidor MCP | ✅ | D-043 |
| API de **escrita** (criar pedido, alterar cardápio) | ⏳ | Necessária para qualquer marketplace entrar |
| **iFood** | ❄️ → ⏳ | Adiado em 28/10 "até o projeto avançar". Ver `03-integracoes-marketplaces.md` |
| **Aiqfome** | ⏳ | |
| **Delivery Much** | ⏳ | |
| Outros (Rappi, 99Food, Uber Eats…) | ⏳ | Decidir se entram (Q-2) |

## Documentação e processo

| Item | Situação | Observação |
|---|---|---|
| `docs/decisoes.md` em dia | ✅ | 72 decisões em 2 semanas |
| `README.md` em dia | 🔧 | Diz "D-001 a D-010" e "etapa 1 do piloto"; está muito atrás do código |
| Hugo com acesso de escrita no repo | ✅ | Convite aceito em 06/11 |
| Ambiente de desenvolvimento do Hugo rodando (`npm test`, `npm run dev`, Supabase local) | ⏳ | |
