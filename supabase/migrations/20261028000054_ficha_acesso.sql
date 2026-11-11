-- 0054: liga a ficha do funcionário (Gestão Empresarial) ao acesso dele no RES (Equipe), D-052. Pode rodar de novo.
-- Uma ficha ↔ um acesso, sempre da mesma loja. Desligar a ficha pode tirar o acesso junto (a tela pergunta).

alter table public.funcionarios add column if not exists membro_id uuid references public.membros (id) on delete set null;
create unique index if not exists funcionarios_membro_idx on public.funcionarios (membro_id) where membro_id is not null;

create or replace function private.ficha_mesma_loja()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.membro_id is not null
     and not exists (select 1 from public.membros m where m.id = new.membro_id and m.loja_id = new.loja_id) then
    raise exception 'Esse acesso é de outra loja.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
drop trigger if exists funcionarios_mesma_loja on public.funcionarios;
create trigger funcionarios_mesma_loja before insert or update of membro_id, loja_id on public.funcionarios
  for each row execute function private.ficha_mesma_loja();
