-- 0053: equipe mais clara (D-051). Pode rodar de novo.
-- Mudar a função de alguém e ajustar o que o "Caixa / Atendente" pode fazer, com regras firmes:
--  • só dono ou gerente mexem; só o DONO transforma alguém em gerente ou tira de gerente;
--  • ninguém muda a função do dono nem a própria;
--  • o Caixa / Atendente nunca recebe "equipe", "plano", "dados da empresa" nem "histórico" (evita
--    que alguém se dê mais acesso).

create or replace function public.alterar_funcao_membro(p_membro uuid, p_papel text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m       public.membros;
  v_grupo uuid;
  v_dono  boolean;
begin
  select * into m from public.membros where id = p_membro;
  if not found or not private.e_gestor(m.loja_id) then
    raise exception 'Só o dono ou o gerente mudam a função de alguém.' using errcode = 'insufficient_privilege';
  end if;
  if p_papel not in ('gerente', 'funcionario', 'garcom', 'entregador') then
    raise exception 'Função inválida.' using errcode = 'check_violation';
  end if;
  if m.papel = 'dono' then
    raise exception 'A função do dono não muda por aqui.' using errcode = 'check_violation';
  end if;
  if m.user_id = auth.uid() then
    raise exception 'Você não pode mudar a sua própria função.' using errcode = 'check_violation';
  end if;
  v_dono := exists (select 1 from public.membros x where x.loja_id = m.loja_id and x.user_id = auth.uid() and x.ativo and x.papel = 'dono');
  if (p_papel = 'gerente' or m.papel = 'gerente') and not v_dono then
    raise exception 'Só o dono pode colocar ou tirar alguém da função de gerente.' using errcode = 'insufficient_privilege';
  end if;
  if p_papel = 'funcionario' then
    select id into v_grupo from public.grupos_acesso where loja_id = m.loja_id and nome = 'Funcionário';
  end if;
  update public.membros set papel = p_papel::public.papel_membro, grupo_acesso_id = v_grupo where id = p_membro;
end;
$$;
revoke execute on function public.alterar_funcao_membro(uuid, text) from anon, public;
grant execute on function public.alterar_funcao_membro(uuid, text) to authenticated;

-- O que o Caixa / Atendente (grupo "Funcionário") pode fazer. Recebe só as chaves da tela; as que a tela
-- não mostra (ex.: pdv, mesas) ficam como estão.
create or replace function public.salvar_permissoes_equipe(p_loja uuid, p_permissoes text[])
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tela  text[] := array['pedidos_delivery', 'caixa', 'cardapio', 'cardapio_visibilidade', 'clientes', 'estoque', 'impressoras',
                          'cardapio_digital', 'marketing', 'relatorios', 'caixas_cadastro'];
  v_atual text[];
  v_nova  text[];
begin
  if not private.e_gestor(p_loja) then
    raise exception 'Só o dono ou o gerente mudam as permissões.' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from unnest(coalesce(p_permissoes, '{}')) x where not (x = any (v_tela))) then
    raise exception 'Permissão que não pode ser dada por aqui.' using errcode = 'check_violation';
  end if;
  select permissoes into v_atual from public.grupos_acesso where loja_id = p_loja and nome = 'Funcionário';
  if not found then
    insert into public.grupos_acesso (loja_id, nome, permissoes) values (p_loja, 'Funcionário', '{}') returning permissoes into v_atual;
  end if;
  v_nova := array(select distinct x from unnest(array(select y from unnest(v_atual) y where not (y = any (v_tela))) || coalesce(p_permissoes, '{}')) x
                   where x not in ('equipe', 'plano', 'dados_empresa', 'historico_alteracoes') order by 1);
  update public.grupos_acesso set permissoes = v_nova where loja_id = p_loja and nome = 'Funcionário';
  -- caixas/atendentes sem grupo (criados antes) passam a seguir o grupo
  update public.membros set grupo_acesso_id = (select id from public.grupos_acesso where loja_id = p_loja and nome = 'Funcionário')
   where loja_id = p_loja and papel = 'funcionario' and grupo_acesso_id is null;
  return v_nova;
end;
$$;
revoke execute on function public.salvar_permissoes_equipe(uuid, text[]) from anon, public;
grant execute on function public.salvar_permissoes_equipe(uuid, text[]) to authenticated;
