# Integrações com marketplaces

A frente principal que falta. Esta página diz o que é preciso construir no RES (igual para todos os apps) e o que é específico de cada app.

## 1. O que o RES precisa ter antes de qualquer marketplace

Hoje a API é **só leitura** (D-043) e o pedido só nasce pelo painel ou pelo cardápio digital. Para um pedido externo entrar, faltam estas peças — todas valem para iFood, Aiqfome, Delivery Much e qualquer outro:

| # | Peça | Situação | Responsável |
|---|---|---|---|
| M-1 | **Modelo de "pedido externo"** no banco: `canal` (ifood/aiqfome/…), id externo, loja ligada, status espelhado, dados do cliente como vêm do app, taxa/comissão, forma de pagamento "pago no app" | ⏳ | |
| M-2 | **Vínculo de cardápio**: tabela que liga item/opção do marketplace ao produto/opção do RES. Já existe o conceito "item sem vínculo" nas regras de impressão (D-014) — reaproveitar | ⏳ | |
| M-3 | **Função de criar pedido externo** (`criar_pedido_externo`) que grava igual a um pedido normal: cai no quadro, imprime pelos gatilhos atuais, entra no caixa como "pago online" (motoboy vê PAGO — NÃO COBRAR) | ⏳ | |
| M-4 | **Espelhar status para fora**: aceitar/em preparo/pronto/saiu/entregue/cancelado no RES → chamada ao app. Reaproveitar pg_net + fila com reenvio dos webhooks (D-043) | ⏳ | |
| M-5 | **Segredos por loja** (tokens dos apps) em tabela só do service_role, como `mp_contas` (D-044) | ⏳ | |
| M-6 | **Cartão em Aplicativos** para conectar/desconectar cada app por loja, com estado da conexão e últimos eventos (como o Mercado Pago hoje) | ⏳ | |
| M-7 | **Quadro**: selo do canal no cartão do pedido, filtro por canal, pedido do app que a loja não aceitou em X min | ⏳ | |
| M-8 | **Relatórios/Financeiro**: vendas por canal, comissão do app como taxa (`fin_taxas` já aceita % + fixo) | ⏳ | |
| M-9 | **Loja de testes** no app de cada marketplace, e ambiente de homologação do RES separado da produção | ⏳ | |
| M-10 | Depois: **cardápio para fora** — alterar no RES e publicar preço/pausa/horário no app | ⏳ | |

Sugestão: fazer M-1 a M-8 pensando no iFood mas com `canal` genérico; o segundo app deve custar uma fração do primeiro.

## 2. iFood

- **Situação:** ❄️ adiado em 28/10 a pedido do dono. Retomar.
- **Como funciona (confirmar no portal do desenvolvedor, developer.ifood.com.br):**
  - Cadastro como desenvolvedor e criação de um aplicativo; o restaurante autoriza o app pelo portal do parceiro.
  - Autenticação OAuth2 (client credentials).
  - **Pedidos chegam por polling de eventos** (consulta periódica, com confirmação de recebimento de cada evento), não por webhook. Precisa de um processo sempre ligado — ver Q-3 (pg_cron no Supabase, Vercel cron, ou um worker).
  - Fluxo do pedido: receber → confirmar → em preparo → pronto/despachado → concluído; cancelamento com motivos padronizados.
  - Módulos separados para catálogo, status da loja (aberta/pausada), horários e avaliações.
  - **Homologação obrigatória** antes de usar com restaurante real.
- **O que precisa acontecer:**
  1. Criar a conta de desenvolvedor e o app (quem? Q-4).
  2. Ler a documentação e anotar aqui os endpoints e os prazos de homologação.
  3. Loja de testes.
  4. Implementar M-1 a M-8 com `canal = 'ifood'`.
  5. Homologar.

## 3. Aiqfome

- **Situação:** ⏳ não começou.
- Tem programa de integração para parceiros/sistemas de gestão; a documentação é liberada após cadastro. **Verificar**: forma de receber pedido (webhook ou polling), como vincular cardápio, exigências de homologação.
- Depende de M-1 a M-8 prontos.

## 4. Delivery Much

- **Situação:** ⏳ não começou.
- Forte no interior; a integração é feita via parceria com o Delivery Much. **Verificar** se há API aberta ou se é por contato comercial, e o que é exigido.
- Depende de M-1 a M-8 prontos.

## 5. Outros (decidir em Q-2)

Rappi, 99Food, Uber Eats, Goomer, Anota AI (como canal), WhatsApp como canal de pedido. Cada um só entra se tiver cliente pedindo.

## 6. Riscos conhecidos

- **Cardápio divergente**: item criado no app e não vinculado no RES → pedido entra "sem vínculo" e a cozinha não sabe o que é. Mitigação: pedido com item sem vínculo imprime o nome bruto do app e aparece em destaque no quadro; tela de vínculos pendentes.
- **Processo de polling parado** → pedidos do iFood acumulam sem a loja ver. Mitigação: alerta no painel quando a última consulta tem mais de 2 min (igual ao sinal do agente de impressão, D-015).
- **Homologação demora** (semanas). Começar o cadastro cedo, em paralelo ao código.
- **Comissões e repasse**: o pedido do app é "pago online" para o caixa, mas o dinheiro chega depois descontada a comissão; o Financeiro precisa tratar como recebível, não como venda à vista.
