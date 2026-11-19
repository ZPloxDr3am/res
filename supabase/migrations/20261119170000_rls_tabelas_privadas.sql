-- Conferência de produção (19/11/2026): em produção estas 13 tabelas internas já estão com RLS ligada
-- (o Supabase liga em tabelas novas); no repositório, não. Alinha o repositório com a produção.
-- Não muda nada em produção (já está assim) e não afeta as funções: elas rodam como dono das tabelas.
-- Pode rodar de novo.
alter table private.cardapios_importados   enable row level security;
alter table private.config_plataforma      enable row level security;
alter table private.contadores_registro    enable row level security;
alter table private.equipe_res             enable row level security;
alter table private.erros_app              enable row level security;
alter table private.importacoes            enable row level security;
alter table private.marketplace_app_tokens enable row level security;
alter table private.marketplace_eventos    enable row level security;
alter table private.marketplace_segredos   enable row level security;
alter table private.motoboy_links          enable row level security;
alter table private.nfe_certificados       enable row level security;
alter table private.nfe_segredos           enable row level security;
alter table private.whatsapp_contas        enable row level security;
