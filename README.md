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
| `supabase/tests` | Testes do banco, um por regra de paridade (T-xxx) |
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

## Próximas etapas

| Etapa | Escopo |
|---|---|
| 2 | Pedidos e tela de delivery em tempo real |
| 3 | Cardápio digital público e checkout |
| 4 | Salão: mesas, comandas e PDV |
| 5 | Integrações: Pix, iFood, WhatsApp oficial e NFC-e |
