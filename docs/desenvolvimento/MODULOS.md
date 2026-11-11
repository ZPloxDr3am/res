# Quem está com cada frente

Os dois — **Emmanuel** (`ZPloxDr3am`) e **Hugo** (`CriadorHugo`) — são **donos do projeto inteiro**, com acesso igual. Aqui só fica a **divisão das tarefas**: quem está tocando cada frente faz o merge e roda as migrações dela; o outro sempre revisa (METODO §4). A divisão muda quando vocês quiserem, no planejamento de segunda.

Proposta inicial (05/11/2026):

| Módulo | Etiqueta | Quem está com ele | Onde fica (principal) |
|---|---|---|---|
| Pedidos e quadro | `mod:pedidos` | Emmanuel | `components/quadro-pedidos.tsx`, `app/(painel)/pedidos` |
| Delivery e cardápio digital | `mod:delivery` | Emmanuel | `app/c/[slug]`, `components/publico`, `app/(painel)/delivery` |
| Cardápio (produtos, combos, grupos) | `mod:cardapio` | Emmanuel | `app/(painel)/cardapio`, `components/cardapio` |
| Estoque / CMV | `mod:estoque` | Emmanuel | `app/(painel)/estoque`, `components/estoque` |
| Financeiro e Gestão Empresarial | `mod:financeiro`, `mod:gestao` | Emmanuel | `app/(painel)/financeiro`, `app/(painel)/gestao` |
| Relatórios e Resumo | `mod:relatorios` | Emmanuel | `app/(painel)/relatorios`, `app/(painel)/resumo` |
| Clientes, fidelidade, promoções | `mod:clientes` | Emmanuel | `app/(painel)/clientes`, `fidelidade`, `promocoes` |
| **Salão e atendimento por tablet** (mesas, comandas, garçom, taxa de serviço, KDS) | `mod:salao` | **Hugo** | novo |
| **Fiscal** (NFC-e/NF-e) | `mod:integracoes` | **Hugo** | novo |
| **Integrações** (iFood, WhatsApp oficial, marketplaces) | `mod:integracoes` | **Hugo** | novo |
| Entregas e motoboy | `mod:entregas` | Hugo | `app/(painel)/entregas`, `app/m`, `apps-mobile/motoboy` |
| Impressão (agente) | `mod:impressao` | Hugo | `packages/agente`, `app/(painel)/impressoras` |
| Apps Android | `mod:apps` | Hugo | `apps-mobile/` |

## Compartilhado (os dois aprovam)

| Peça | Por quê |
|---|---|
| Base do banco: `lojas`, `membros`, permissões, `pedidos`, `pedido_itens`, `criar_pedido_publico`, `mudar_status_pedido`, `aplicar_cupom`, RLS | Tudo depende disso |
| `packages/core` (preço, permissões, regras) | Usado pelo painel, banco e agente |
| Visual e navegação: `globals.css`, `nav-painel.tsx`, `layout.tsx` | Arquivos quentes |
| CI e workflows (`.github/`), `CLAUDE.md`, este método | Mudam a forma de trabalhar |
