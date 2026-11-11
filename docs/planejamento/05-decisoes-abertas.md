# Decisões abertas

Perguntas que precisam dos dois. Quando decidir, escreva a resposta aqui, registre em `docs/decisoes.md` se for de arquitetura, e atualize `04-pendencias.md`.

| # | Pergunta | Opções | Decisão | Data |
|---|---|---|---|---|
| Q-1 | **Ordem das frentes**: piloto primeiro e marketplaces depois, ou começar o iFood já em paralelo? | (a) piloto estável → iFood → outros; (b) iFood em paralelo ao piloto; (c) salão/KDS antes dos marketplaces | | |
| Q-2 | **Quais marketplaces entram** na primeira leva? | iFood + Aiqfome + Delivery Much (os três do objetivo); acrescentar Rappi/99Food/Uber Eats só com cliente pedindo | | |
| Q-3 | **Onde roda o polling do iFood** (processo sempre ligado)? | (a) pg_cron + pg_net no Supabase (já usamos para webhooks); (b) Vercel cron chamando uma rota; (c) worker separado (Railway/Fly/VPS); (d) dentro do agente Windows da loja | | |
| Q-4 | **Em nome de quem** ficam as contas de desenvolvedor (iFood, Meta, Mercado Pago)? | CNPJ do RES (precisa existir) ou de um dos sócios | | |
| Q-5 | **Divisão do trabalho** entre os dois daqui para frente | Por área (ex.: um nos marketplaces, outro no piloto/operação) ou por tarefa | | |
| Q-6 | **Restaurante piloto**: qual, quando começa de verdade e o que a loja paga (ou não) durante o piloto | | | |
| Q-7 | **Fiscal**: qual provedor de NFC-e e quando | Adiar até ter cliente exigindo; escolher provedor (Focus NFe, Nuvem Fiscal, Tecnospeed, PlugNotas…) | | |
| Q-8 | **Modelo de cobrança** do RES: por loja/mês, por pacote (básico/multilojas já existe no banco), % das vendas? Quando começa a cobrar? | | | |
| Q-9 | **Ambiente de homologação**: criar um segundo projeto no Supabase agora ou seguir testando na produção? | | | |
| Q-10 | **Dados do cliente que vêm do app** (iFood mascara telefone): o cliente do marketplace entra na base de clientes/fidelidade do RES ou fica separado? | | | |

## Decididas

| # | Decisão | Data | Registro |
|---|---|---|---|
| — | | | |
