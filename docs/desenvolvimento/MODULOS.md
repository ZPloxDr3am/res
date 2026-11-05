# Módulos e donos

**Proposta inicial** (05/11/2026) — confirmem na primeira segunda-feira e troquem o nome "Dev 2" pelo nome e usuário do GitHub de quem chega.

O **dono** decide o que entra no módulo, faz o merge e roda as migrações dele. O **outro** sempre revisa (METODO §4).

| Módulo | Etiqueta | Dono | Onde fica (principal) |
|---|---|---|---|
| Pedidos e quadro | `mod:pedidos` | Emmanuel | `components/quadro-pedidos.tsx`, `app/(painel)/pedidos` |
| Delivery e cardápio digital | `mod:delivery` | Emmanuel | `app/c/[slug]`, `components/publico`, `app/(painel)/delivery` |
| Cardápio (produtos, combos, grupos) | `mod:cardapio` | Emmanuel | `app/(painel)/cardapio`, `components/cardapio` |
| Estoque / CMV | `mod:estoque` | Emmanuel | `app/(painel)/estoque`, `components/estoque` |
| Financeiro e Gestão Empresarial | `mod:financeiro`, `mod:gestao` | Emmanuel | `app/(painel)/financeiro`, `app/(painel)/gestao` |
| Relatórios e Resumo | `mod:relatorios` | Emmanuel | `app/(painel)/relatorios`, `app/(painel)/resumo` |
| Clientes, fidelidade, promoções | `mod:clientes` | Emmanuel | `app/(painel)/clientes`, `fidelidade`, `promocoes` |
| **Salão e atendimento por tablet** (mesas, comandas, garçom, taxa de serviço, KDS) | `mod:salao` | **Dev 2** | novo |
| **Fiscal** (NFC-e/NF-e) | `mod:integracoes` | **Dev 2** | novo |
| **Integrações** (iFood, WhatsApp oficial, marketplaces) | `mod:integracoes` | **Dev 2** | novo |
| Entregas e motoboy | `mod:entregas` | Dev 2 | `app/(painel)/entregas`, `app/m`, `apps-mobile/motoboy` |
| Impressão (agente) | `mod:impressao` | Dev 2 | `packages/agente`, `app/(painel)/impressoras` |
| Apps Android | `mod:apps` | Dev 2 | `apps-mobile/` |

## Compartilhado (os dois aprovam)

| Peça | Por quê |
|---|---|
| Base do banco: `lojas`, `membros`, permissões, `pedidos`, `pedido_itens`, `criar_pedido_publico`, `mudar_status_pedido`, `aplicar_cupom`, RLS | Tudo depende disso |
| `packages/core` (preço, permissões, regras) | Usado pelo painel, banco e agente |
| Visual e navegação: `globals.css`, `nav-painel.tsx`, `layout.tsx` | Arquivos quentes |
| CI e workflows (`.github/`), `CLAUDE.md`, este método | Mudam a forma de trabalhar |
