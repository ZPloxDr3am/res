-- D-088 (LGPD): o CPF do dono (loja sem CNPJ) não fica mais visível para a equipe toda.
-- A coluna lojas.cpf sai da leitura direta; só o titular da conta (e o time do RES) lê, pela função.
-- ATENÇÃO para migrações futuras: coluna nova em public.lojas precisa de
--   select private.liberar_colunas_lojas();
-- no fim da migração (o teste 99 do banco acusa se esquecer). Pode rodar de novo.

create or replace function private.liberar_colunas_lojas()
returns void language plpgsql security definer set search_path = '' as $$
declare v_cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into v_cols
    from information_schema.columns
   where table_schema = 'public' and table_name = 'lojas' and column_name <> 'cpf';
  execute 'revoke select on public.lojas from anon, authenticated';
  execute format('grant select (%s) on public.lojas to authenticated', v_cols);
end;
$$;
select private.liberar_colunas_lojas();

create or replace function public.cpf_da_loja(p_loja uuid)
returns text language sql stable security definer set search_path = '' as $$
  select l.cpf from public.lojas l
   where l.id = p_loja and (private.e_titular(l.conta_id) or private.e_equipe_res());
$$;
revoke execute on function public.cpf_da_loja(uuid) from public, anon;
grant execute on function public.cpf_da_loja(uuid) to authenticated;

-- a tela Lojas e equipe mostra "Ainda não tenho CNPJ" sem precisar ler o CPF
create or replace function public.loja_tem_cpf(p_loja uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select l.cpf is not null from public.lojas l where l.id = p_loja and private.e_membro(l.id);
$$;
revoke execute on function public.loja_tem_cpf(uuid) from public, anon;
grant execute on function public.loja_tem_cpf(uuid) to authenticated;

-- gerente salvando Dados da empresa sem ver o CPF: mantém o CPF guardado (só o dono troca ou apaga)
create or replace function private.lojas_mantem_cpf()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.cnpj is null and new.cpf is null and old.cpf is not null and current_user in ('authenticated', 'postgres')
     and auth.uid() is not null and not private.e_titular(old.conta_id) then
    new.cpf := old.cpf;
  end if;
  return new;
end;
$$;
drop trigger if exists lojas_mantem_cpf on public.lojas;
create trigger lojas_mantem_cpf before update on public.lojas for each row execute function private.lojas_mantem_cpf();
