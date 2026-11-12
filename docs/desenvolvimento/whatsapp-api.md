# WhatsApp oficial (Cloud API da Meta) — como ligar (D-097)

O RES já está pronto. Falta, de cada restaurante, a conta na Meta; e, uma vez só, o app do RES na Meta para o webhook.

## Uma vez (equipe RES)
1. **Variáveis na Vercel** (projeto `res-iqzs`, Production):
   - `WHATSAPP_VERIFY_TOKEN`: uma frase qualquer (ex.: `res-whatsapp-2026`), usada só para a Meta confirmar o webhook.
   - `WHATSAPP_APP_SECRET`: a "Chave secreta do app" (Meta for Developers → app → Configurações → Básico). Com ela, o RES só aceita avisos assinados pela Meta.
   - `MARKETPLACE_CRON_SEGREDO` e `SUPABASE_SERVICE_ROLE_KEY` já existem (o agendador e o servidor usam).
2. **Webhook no app da Meta** (WhatsApp → Configuração): URL `https://res-iqzs.vercel.app/api/whatsapp/webhook`, token de verificação = `WHATSAPP_VERIFY_TOKEN`, e assinar o campo **messages**.

## Por restaurante
1. **Número só para a API**: chip ou fixo que não esteja no app WhatsApp (se estiver, apague a conta do app antes). Pode ser o número que os clientes já conhecem.
2. **Meta Business** (business.facebook.com) com a empresa **verificada** (CNPJ, documentos; de dias a 2 semanas).
3. Em **Meta for Developers**, criar app tipo **Empresa** → adicionar **WhatsApp** → adicionar o número (código por SMS/ligação) → **forma de pagamento** (cartão) na conta do WhatsApp Business.
4. **Token permanente**: Configurações do negócio → Usuários do sistema → Adicionar (Admin) → Atribuir ativos (o app e a conta do WhatsApp, controle total) → Gerar token, sem validade, com `whatsapp_business_messaging` e `whatsapp_business_management`.
5. No RES: **Turbo-Vendas → WhatsApp oficial** → colar **ID do número**, **ID da conta do WhatsApp Business** e o **token** → Conectar (o RES confere na Meta na hora). Só dono ou gerente.
6. **Modelos**: criar (ex.: "volta_sumido"), **Enviar para aprovação**, esperar ✅ (minutos a horas; "↻ Atualizar status").
7. Em cada **automação** e **campanha**, escolher o modelo aprovado. Ligar **Envio automático** (a cada 5 min) ou usar **⚡ Enviar tudo** na fila.

## Como funciona
- O token fica em `private.whatsapp_contas`; só o servidor lê (chave de serviço). A tela nunca mostra.
- Fila: `whatsapp_pegar_envios` marca "enviando" (não manda duas vezes); `whatsapp_resultado_envio` grava o ID da Meta; 3 tentativas e vira "erro".
- Webhook: entregue/lido/falhou atualizam o envio; resposta **SAIR / PARAR / STOP / CANCELAR** tira o cliente do marketing no grupo todo.
- Sem modelo escolhido, a mensagem continua na fila manual (toque e envia), como antes.
- Custo (Meta, Brasil, 2026): marketing US$ 0,0625; aviso (utility) US$ 0,0068 por mensagem; resposta dentro de 24 h da mensagem do cliente é grátis.
