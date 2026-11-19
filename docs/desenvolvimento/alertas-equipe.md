# Avisos de erro para a equipe (e-mail e WhatsApp)

A cada 5 minutos o banco confere três coisas e, se houver novidade, manda **uma** mensagem por canal:

1. **Erro novo**: um erro do painel ou do servidor que não aparecia havia 7 dias. Erros que se repetem não avisam de novo.
2. **Impressão parada**: cupom sem sair há mais de 5 minutos numa impressora ligada ao agente. Repete no máximo 1 vez por hora por loja.
3. **Pedido de app parado**: pedido do iFood ou do Open Delivery que nem a nova tentativa automática conseguiu processar em 15 minutos.

A mensagem traz só o resumo (tipo de erro, tela, nome da loja). Nenhum dado de cliente entra. Os detalhes ficam em **Empresa → Erros**.

Cada canal só funciona depois que a chave dele estiver no Vault do Supabase. Sem chave, nada é enviado, e os alertas ficam guardados até a configuração ser feita.

## E-mail (Resend)

1. Crie uma conta grátis em resend.com (3.000 e-mails por mês).
2. Em **API Keys**, crie uma chave com permissão de envio. Ela começa com `re_`.
3. Sem domínio próprio verificado, o Resend só entrega no e-mail da própria conta. Para avisar outras pessoas, verifique um domínio em **Domains** e use um remetente desse domínio.

## WhatsApp (CallMeBot)

1. No celular que vai receber os avisos, adicione o contato do CallMeBot, informado em callmebot.com → WhatsApp.
2. Mande para ele a frase de ativação indicada no site. Ele responde com a sua **apikey**.
3. O CallMeBot é um serviço gratuito de terceiros, bom para avisos internos da equipe. Quando o WhatsApp oficial (Meta) estiver ligado, dá para trocar.

## Guardar as chaves no Vault (o dono faz, no SQL Editor)

Troque os valores entre aspas pelos seus e clique em **Run**:

```sql
select vault.create_secret('re_SUA_CHAVE',              'alerta_resend_chave');
select vault.create_secret('voce@seudominio.com.br',    'alerta_email_para');      -- vários: separados por vírgula
select vault.create_secret('SINO alertas <alertas@seudominio.com.br>', 'alerta_email_de'); -- opcional
select vault.create_secret('5547999990000',             'alerta_whatsapp_numero'); -- com 55 e DDD
select vault.create_secret('SUA_APIKEY_DO_CALLMEBOT',   'alerta_callmebot_chave');
```

Para trocar uma chave depois: `select vault.update_secret(id, 'novo valor') from vault.secrets where name = 'alerta_resend_chave';`

## Conferir

- **Mensagem de teste:** rode `select public.testar_alertas();` no SQL Editor. Ela manda "SINO · teste de alerta" e devolve por quais canais saiu, por exemplo `{email,whatsapp}`.
- **Pendentes:** `select * from private.alertas_pendentes();` mostra o que seria avisado agora.
- **Já enviados:** `select * from private.alertas_enviados order by enviado_em desc;`. O registro guarda 30 dias.

Migração: `supabase/migrations/20261119180000_alertas_equipe.sql`. Teste: `supabase/tests/99z…x_alertas.sql`. Decisão: D-123.
