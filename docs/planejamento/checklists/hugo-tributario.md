# Checklist 3 — Planejamento tributário e operação no CNPJ · Responsável: Hugo

Objetivo da área: saber quais impostos a empresa paga, escolher o regime mais barato e legal para um SaaS com dois sócios, e definir como o dinheiro entra (cobrança dos restaurantes) e sai (pró-labore, distribuição de lucros). Tudo aqui é para **confirmar com o contador** (H-2) — esta lista organiza as perguntas e as decisões, não substitui o profissional.

Legenda: ⏳ a fazer · 🔧 fazendo · ⛔ travado · ✅ feito

## A. Regime tributário

| # | Tarefa | Situação | Prazo | Nota |
|---|---|---|---|---|
| T-1 | Estimar o faturamento do 1º e do 2º ano (nº de lojas × mensalidade) — base para tudo abaixo | ⏳ | | Depende de Q-8 (modelo de cobrança) |
| T-2 | Simples Nacional: confirmar com o contador em qual anexo o nosso CNAE cai (III ou V) e a regra do **Fator R** (folha ≥ 28% da receita → Anexo III, alíquota menor) | ⏳ | | Pró-labore dos sócios conta como folha — isso muda a conta |
| T-3 | Comparar Simples × Lucro Presumido para o faturamento estimado | ⏳ | | Contador faz a simulação |
| T-4 | Verificar enquadramento como **ME** (até R$ 360 mil/ano) ou EPP e os benefícios | ⏳ | | |
| T-5 | ISS: alíquota do município do endereço fiscal para software/SaaS e se há benefício local | ⏳ | | Afeta a escolha do endereço (H-6) |
| T-6 | Entender a transição para a **reforma tributária** (CBS/IBS, a partir de 2026–2027) e o que muda para o Simples | ⏳ | | Perguntar ao contador o impacto para SaaS |
| T-7 | Decidir o regime e registrar em `05-decisoes-abertas.md` | ⏳ | | Decisão conjunta com o Emmanuel |

## B. Como o dinheiro entra

| # | Tarefa | Situação | Prazo | Nota |
|---|---|---|---|---|
| T-8 | Modelo de cobrança dos restaurantes: mensalidade por loja, por pacote (básico/multilojas já existe no banco), % das vendas, ou misto (Q-8) | ⏳ | | Decisão conjunta |
| T-9 | Como cobrar: boleto/Pix via banco PJ, gateway (Asaas, Mercado Pago, Stripe), ou cobrança recorrente dentro do próprio RES | ⏳ | | |
| T-10 | NFS-e para cada mensalidade (obrigatória); automatizar a emissão quando passar de ~10 lojas | ⏳ | | Depende de H-10 |
| T-11 | Contrato de prestação de serviço com o restaurante (SLA, dados, LGPD, cancelamento) — modelo | ⏳ | | Advogado ou modelo revisado |
| T-12 | Fiscal do **restaurante** (NFC-e para o cliente final): escolher provedor (Focus NFe, Nuvem Fiscal, Tecnospeed, PlugNotas…) e quando entra (Q-7) | ⏳ | | Destrava E-26 |

## C. Como o dinheiro sai

| # | Tarefa | Situação | Prazo | Nota |
|---|---|---|---|---|
| T-13 | Pró-labore dos sócios: valor e a partir de quando (impacta Fator R e INSS) | ⏳ | | Decisão conjunta |
| T-14 | Distribuição de lucros (isenta de IR) × pró-labore: regra combinada entre os sócios | ⏳ | | Contador orienta |
| T-15 | Custos fixos da empresa: contador, Supabase, Vercel, domínio, certificado, bancos, ferramentas — planilha mensal | ⏳ | | Pode usar o próprio módulo Gestão Empresarial do RES |
| T-16 | Como dividir despesas pessoais já feitas no projeto (aportes) e registrar no contrato social | ⏳ | | |

## D. Obrigações recorrentes (depois de aberto)

| # | Tarefa | Situação | Prazo | Nota |
|---|---|---|---|---|
| T-17 | Calendário: DAS mensal (dia 20), DEFIS anual, folha/pró-labore (eSocial), declaração do município | ⏳ | | Contador entrega; nós acompanhamos |
| T-18 | LGPD: política de privacidade e termos de uso do RES (dados de clientes dos restaurantes, CPF de funcionários na Gestão Empresarial) | ⏳ | | Já tratamos dados pessoais em produção |
| T-19 | Marca "RES" no INPI | ⏳ | | Verificar disponibilidade em H-3 |
| T-20 | Revisar o regime no fim do 1º ano com o faturamento real | ⏳ | | Anual |
