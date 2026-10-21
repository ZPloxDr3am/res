# RES

Sistema de pedidos para restaurantes, com delivery, salão e gestão. Esta é a **etapa 1 do piloto**:

- uma loja com várias marcas
- usuários e permissões
- cardápio completo: setores, produtos, grupos de opções e frações de pizza
- testes que conferem as regras aprendidas no estudo do BeeFood

## Estrutura

| Pasta | O que tem |
|---|---|
| `packages/core` | Regras de negócio em TypeScript puro: preço, grupos, setores e permissões. Tem testes. |
| `supabase/migrations` | Banco Postgres com isolamento por loja (RLS), auditoria e operações atômicas |
| `supabase/tests` | Testes do banco: regras de paridade (T-xxx), edição do cardápio e pedidos, incluindo a paridade de preço com o core |
| `apps/web` | Painel em Next.js com login, cadastro da loja e telas do cardápio |
| `docs/decisoes.md` | Decisões de projeto D-001 a D-010 |

## Rodar os testes

```bash
npm install
npm test               # regras (core)
npm run test:db        # banco: sobe um Postgres temporário (precisa do PostgreSQL 16 instalado)
```

O GitHub Actions roda os três conjuntos a cada push: regras, banco e build do app.

## Colocar no ar

1. Crie um projeto em [supabase.com](https://supabase.com), na região São Paulo.
2. Aplique as migrações:
   ```bash
   npx supabase link --project-ref SEU_REF
   npx supabase db push
   ```
3. No Supabase, em Authentication → URL Configuration, informe a URL do site.
4. Copie `apps/web/.env.example` para `apps/web/.env.local` e preencha a URL e a chave *anon* do projeto.
5. Para rodar localmente, use `npm run dev`. Para publicar, importe o repositório na Vercel com *Root Directory* `apps/web` e as mesmas duas variáveis.

A chave *service_role* nunca vai para o navegador nem para o app (D-008). Toda escrita passa pela RLS com o usuário logado.

## O que já funciona

| Área | Telas |
|---|---|
| Base | Login, cadastro da loja e marcas, permissões por grupo, histórico de alterações no banco |
| Cardápio | Categorias à esquerda e produtos à direita, com busca e liga/desliga rápido (ativo, delivery, salão). Editor do produto em painel lateral: dados, grupos, preços por canal e foto. Aba **Grupos de opções** como biblioteca: o grupo é criado uma vez e aplicado em vários produtos ("marcar todos da categoria"). Duplicar produto, categoria e grupo. Simulador de preço |
| Pedidos | Quadro em tempo real (Novo → Em preparo → Pronto → Saiu → Concluído) com alerta sonoro e aceite automático. Lançar pedido com montagem de pizza, taxa do bairro preenchida sozinha e opção de agendar. Faixa **Agendados** que solta o pedido em "Novo" na hora de preparar. Preço recalculado no banco |
| Cardápio digital | Link e QR por marca (`/c/<endereço>`). O cliente monta e envia o pedido sem login e acompanha por um código secreto. Horários (inclusive depois da meia-noite), abrir/fechar na hora, bairros com taxa, pedido mínimo, formas de pagamento, limite contra pedidos repetidos e **pedido agendado** (o cliente escolhe dia e horário; com a loja fechada ainda pode agendar). Configurado na tela **Delivery** |
| Multilojas | Conta do cliente → lojas → marcas/cardápios, com limites do pacote garantidos no banco. Seletor de loja no menu; tela **Lojas e equipe** (uso do pacote, nova loja, novo cardápio, convites por e-mail com acesso só àquela loja); quadro de pedidos com "ver todas as lojas"; nova loja pode começar com cópia do cardápio de outra loja do grupo, novo cardápio pode compartilhar o catálogo de outra marca da mesma loja, e o Cardápio tem **Importar de outra loja** (categorias escolhidas, sem duplicar ao repetir); horários replicáveis para o grupo |
| Resumo | Faturamento, pedidos, ticket médio e cancelados de todas as lojas ou de uma só: hoje, ontem, 7 ou 30 dias, mês ou datas escolhidas. Variação vs período anterior (até a mesma hora), gráfico por dia e tabela por loja com participação |

## Próximas etapas

| Etapa | Escopo |
|---|---|
| 3c | Pix online e Mercado Pago no cardápio digital (taxa por bairro no balcão e agendamento já entraram) |
| 4 | Impressão por setor, KDS, caixa, relatórios |
| 5 | Entregas e entregador, WhatsApp oficial |
| 6 | Clientes, cupons, fidelidade |
| 7 | Salão (mesas, comandas, PDV), estoque, financeiro, fiscal |
| Integrações | Pix, iFood, NFC-e (dependem de credenciamentos) |

## Pacotes (equipe RES)

O pacote de cada cliente fica na tabela `contas` (`plano`, `limite_lojas`, `limite_cardapios`; `null` = sem limite). Só a equipe RES muda, pelo SQL Editor do Supabase:

```sql
update public.contas set plano = 'multilojas', limite_lojas = 3, limite_cardapios = 3 where nome = 'Nome do cliente';
```

Conta nova nasce no básico (1 loja, 1 cardápio).

## Ambiente no ar (piloto)

| Peça | Onde |
|---|---|
| Painel | https://res-iqzs.vercel.app (Vercel, projeto `res-iqzs`, pasta `apps/web`) |
| Banco | Supabase, projeto **RES - PRÓPRIO** (São Paulo), ref `avodakkmqyvnbabfwydr` |
| Código | github.com/ZPloxDr3am/res, com deploy automático a cada push na `main` |
| Auth | Site URL é o painel; o redirect de confirmação é `/auth/confirmar` |
