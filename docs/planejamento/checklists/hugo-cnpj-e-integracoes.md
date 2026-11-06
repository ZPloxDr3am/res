# Checklist 1 — CNPJ e integrações · Responsável: Hugo

Objetivo da área: ter a empresa aberta e conseguir receber pedidos de iFood, Aiqfome, Delivery Much e os demais apps dentro do RES. O CNPJ vem primeiro porque as contas de desenvolvedor dos marketplaces (e Mercado Pago, Meta) ficam em nome da empresa.

Legenda: ⏳ a fazer · 🔧 fazendo · ⛔ travado · ✅ feito

## A. Abrir o CNPJ

| # | Tarefa | Situação | Prazo | Nota |
|---|---|---|---|---|
| H-1 | Decidir com o Emmanuel: tipo de empresa (LTDA com dois sócios é o caminho normal), participação de cada um, quem é o administrador | ⏳ | | Decisão conjunta → registrar em `05-decisoes-abertas.md` |
| H-2 | Escolher o contador (pedir 2–3 orçamentos; contador que atenda empresa de software/SaaS) | ⏳ | | Ele conduz H-3 a H-8 |
| H-3 | Nome empresarial e nome fantasia (RES? verificar disponibilidade na Junta e no INPI) | ⏳ | | |
| H-4 | CNAEs: principal de desenvolvimento/licenciamento de software (ex.: 6201-5/01, 6203-1/00); secundário de consultoria em TI (6204-0/00) | ⏳ | | Confirmar com o contador — afeta o anexo do Simples (ver checklist 3) |
| H-5 | Contrato social (cláusulas de saída, aporte, pró-labore, propriedade do código) | ⏳ | | Vale incluir que o código do RES é da empresa |
| H-6 | Endereço fiscal (residencial de um sócio, escritório virtual ou coworking) | ⏳ | | |
| H-7 | Registro na Junta Comercial, CNPJ na Receita, inscrição municipal, alvará (se exigido) | ⏳ | | Contador faz |
| H-8 | Certificado digital A1 da empresa (necessário para NFS-e e, depois, NFC-e/SEFAZ) | ⏳ | | |
| H-9 | Conta bancária PJ (comparar: Inter, Cora, Nubank PJ, BTG, banco tradicional) | ⏳ | | |
| H-10 | Emissor de NFS-e configurado (nota de serviço para cobrar os restaurantes) | ⏳ | | Depende de H-7 e H-8 |

## B. Contas de desenvolvedor (em nome da empresa)

| # | Tarefa | Situação | Prazo | Nota |
|---|---|---|---|---|
| H-11 | iFood: criar conta no portal do desenvolvedor, criar o aplicativo, pedir acesso a sandbox e documentação | ⏳ | | Começar cedo: homologação demora |
| H-12 | iFood: ler a documentação e escrever em `03-integracoes-marketplaces.md` os endpoints, o fluxo de eventos (polling) e os requisitos de homologação | ⏳ | | |
| H-13 | Aiqfome: contato com o programa de parceiros/integradores, pedir documentação | ⏳ | | |
| H-14 | Delivery Much: contato comercial, descobrir se há API e as exigências | ⏳ | | |
| H-15 | Mercado Pago: aplicação em nome da empresa (hoje cada loja cola o próprio token; OAuth vem depois — D-044) | ⏳ | | |
| H-16 | Meta/WhatsApp Business: cadastro da empresa para a API oficial (destrava P-27 / D-058) | ⏳ | | Precisa do CNPJ |
| H-17 | Listar os demais apps que valem a pena (Rappi, 99Food, Uber Eats…) e o que cada um exige | ⏳ | | Decidir em Q-2 |

## C. Integração — o que o RES precisa (genérico, vale para todos os apps)

Especificação detalhada em `03-integracoes-marketplaces.md` (M-1 a M-10). Quem **codifica** é combinado com o Emmanuel; Hugo é o dono da frente (especificação, testes com o app real, homologação).

| # | Tarefa | Situação | Prazo | Nota |
|---|---|---|---|---|
| H-18 | Especificar o modelo de pedido externo (M-1) e o vínculo de cardápio (M-2) em uma decisão D-xxx | ⏳ | | Com o Emmanuel |
| H-19 | Definir onde roda o polling do iFood (Q-3) | ⏳ | | Decisão conjunta |
| H-20 | Loja de testes no iFood ligada a uma loja de homologação do RES (M-9) | ⏳ | | Depende de H-11 e de P-21 (ambiente de homologação) |
| H-21 | Receber o primeiro pedido do iFood no quadro do RES (M-3) | ⏳ | | Marco |
| H-22 | Espelhar status e cancelamento de volta ao iFood (M-4) | ⏳ | | |
| H-23 | Cartão iFood em Aplicativos: conectar/desconectar por loja, estado, últimos eventos (M-5, M-6) | ⏳ | | |
| H-24 | Selo do canal no quadro, filtro, alerta de pedido não aceito (M-7) | ⏳ | | |
| H-25 | Vendas por canal e comissão nos relatórios/financeiro (M-8) | ⏳ | | |
| H-26 | Homologação do iFood concluída | ⏳ | | Marco |
| H-27 | Repetir H-20 a H-26 para Aiqfome | ⏳ | | |
| H-28 | Repetir H-20 a H-26 para Delivery Much | ⏳ | | |
| H-29 | Cardápio do RES publicado nos apps: preço, pausa, horário (M-10) | ⏳ | | Depois de receber pedidos estável |

## D. Setup pessoal

| # | Tarefa | Situação | Prazo | Nota |
|---|---|---|---|---|
| H-30 | Ambiente local rodando: `npm install`, `npm test`, `npm run test:db` (PostgreSQL 16), `npm run dev`, graphify | ⏳ | | README + CLAUDE.md |
| H-31 | Acesso ao Supabase "RES - PRÓPRIO" e à Vercel como membro | ⏳ | | Emmanuel convida |
