-- 0055: custos e faturamento do GRUPO ou de cada loja (D-053). Pode rodar de novo.
-- Quem tem várias lojas escolhe: "cada loja separada" (uma planilha por loja + visão somada do grupo)
-- ou "o grupo todo junto" (uma planilha só, com o faturamento de todas as lojas). Só o titular escolhe.

create table if not exists public.gestao_conta (
  conta_id         uuid primary key references public.contas (id) on delete cascade,
  modo             text not null default 'separado' check (modo in ('separado', 'grupo')),
  faturamento_base numeric(14, 2) check (faturamento_base is null or faturamento_base >= 0),
  atualizado_em    timestamptz not null default now()
);
alter table public.gestao_conta enable row level security;
drop policy if exists gestao_conta_ler on public.gestao_conta;
-- quem é gestor de alguma loja do grupo vê o modo (para a tela avisar); só o titular muda
create policy gestao_conta_ler on public.gestao_conta for select to authenticated
  using (private.e_titular(conta_id) or exists (select 1 from public.lojas l where l.conta_id = gestao_conta.conta_id and private.e_gestor(l.id)));
drop policy if exists gestao_conta_escrever on public.gestao_conta;
create policy gestao_conta_escrever on public.gestao_conta for all to authenticated
  using (private.e_titular(conta_id)) with check (private.e_titular(conta_id));
grant select, insert, update on public.gestao_conta to authenticated;

-- planilha do grupo: linhas de custo com conta_id (e sem loja)
alter table public.custos add column if not exists conta_id uuid references public.contas (id) on delete cascade;
alter table public.custos alter column loja_id drop not null;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'custos_dono') then
    alter table public.custos add constraint custos_dono check (num_nonnulls(loja_id, conta_id) = 1);
  end if;
end $$;
create index if not exists custos_conta_idx on public.custos (conta_id, tipo, ordem) where conta_id is not null;
drop policy if exists custos_gestor on public.custos;
create policy custos_gestor on public.custos for all to authenticated
  using (case when loja_id is not null then private.e_gestor(loja_id) else private.e_titular(conta_id) end)
  with check (case when loja_id is not null then private.e_gestor(loja_id) else private.e_titular(conta_id) end);

-- o histórico de alterações precisa de uma loja: custos do grupo não entram nele
drop trigger if exists custos_auditar on public.custos;
create trigger custos_auditar after insert or update on public.custos
  for each row when (new.loja_id is not null) execute function private.auditar();
drop trigger if exists custos_auditar_apagar on public.custos;
create trigger custos_auditar_apagar after delete on public.custos
  for each row when (old.loja_id is not null) execute function private.auditar();

-- modelo pronto para o grupo (mesmas 25 linhas da loja)
create or replace function public.preparar_gestao_grupo(p_conta uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.e_titular(p_conta) then
    raise exception 'Só o titular da conta controla os custos do grupo.' using errcode = 'insufficient_privilege';
  end if;
  insert into public.gestao_conta (conta_id) values (p_conta) on conflict (conta_id) do nothing;
  if not exists (select 1 from public.custos where conta_id = p_conta) then
    insert into public.custos (conta_id, tipo, nome, forma, ordem)
    select p_conta, x.tipo, x.nome, x.forma, x.ordem from (values
      ('fixo', 'Aluguel', 'valor', 1), ('fixo', 'Condomínio e IPTU', 'valor', 2), ('fixo', 'Energia elétrica', 'valor', 3),
      ('fixo', 'Água e esgoto', 'valor', 4), ('fixo', 'Gás', 'valor', 5), ('fixo', 'Internet e telefone', 'valor', 6),
      ('fixo', 'Salários', 'valor', 7), ('fixo', 'Encargos (INSS, FGTS, férias, 13º)', 'valor', 8),
      ('fixo', 'Vale-transporte e alimentação', 'valor', 9), ('fixo', 'Pró-labore dos sócios', 'valor', 10),
      ('fixo', 'Contador', 'valor', 11), ('fixo', 'Sistemas e aplicativos', 'valor', 12), ('fixo', 'Maquininha (aluguel)', 'valor', 13),
      ('fixo', 'Seguro', 'valor', 14), ('fixo', 'Manutenção e limpeza', 'valor', 15), ('fixo', 'Marketing e anúncios', 'valor', 16),
      ('fixo', 'Parcelas de empréstimos e equipamentos', 'valor', 17),
      ('variavel', 'Insumos / CMV (ingredientes)', 'percentual', 1), ('variavel', 'Embalagens', 'percentual', 2),
      ('variavel', 'Impostos sobre vendas (Simples Nacional)', 'percentual', 3), ('variavel', 'Taxas de cartão e Pix', 'percentual', 4),
      ('variavel', 'Comissão de aplicativos (iFood e outros)', 'percentual', 5), ('variavel', 'Motoboys / entregas', 'valor', 6),
      ('variavel', 'Comissões e gorjetas da equipe', 'percentual', 7), ('variavel', 'Perdas e desperdício', 'percentual', 8)
    ) as x(tipo, nome, forma, ordem);
  end if;
end;
$$;
revoke execute on function public.preparar_gestao_grupo(uuid) from anon, public;
grant execute on function public.preparar_gestao_grupo(uuid) to authenticated;
