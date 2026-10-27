-- RES · 0031 · Telefones no padrão com o 9 do celular (D-030).
--
-- * private.normalizar_telefone: só dígitos, sem +55 e zeros da frente; celular com 8 dígitos
--   ganha o 9 ("47 96731809" → "47996731809"). Fixo (começa com 2 a 5) fica igual. Mesma regra de
--   normalizarTelefone (packages/core).
-- * Todo pedido novo passa pela regra antes de gravar (e antes de cadastrar o cliente).
-- * Corrige os telefones já gravados. Se o mesmo cliente estava salvo duas vezes (com e sem o 9),
--   junta os dois: pedidos, endereços e observações ficam no cadastro que já estava certo.

create or replace function private.normalizar_telefone(p_tel text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  d text := regexp_replace(regexp_replace(coalesce(p_tel, ''), '\D', '', 'g'), '^0+', '');
begin
  if length(d) in (12, 13) and left(d, 2) = '55' then
    d := substr(d, 3);
  end if;
  if length(d) = 10 and substr(d, 3, 1) between '6' and '9' then
    d := left(d, 2) || '9' || substr(d, 3);
  end if;
  return nullif(d, '');
end;
$$;

-- pedido novo: telefone no padrão (o nome começa com "a_" para rodar antes de pedidos_registra_cliente)
create or replace function private.pedido_normaliza_telefone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.cliente_telefone is not null then
    new.cliente_telefone := private.normalizar_telefone(new.cliente_telefone);
  end if;
  return new;
end;
$$;
drop trigger if exists pedidos_a_normaliza_telefone on public.pedidos;  -- pode rodar de novo
create trigger pedidos_a_normaliza_telefone before insert or update of cliente_telefone on public.pedidos
  for each row execute function private.pedido_normaliza_telefone();

-- ---------------------------------------------------------------- corrige o que já está gravado
create or replace function private.corrigir_telefones()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c record;
  v_certo uuid;
begin
  update public.pedidos set cliente_telefone = private.normalizar_telefone(cliente_telefone)
   where cliente_telefone is not null and cliente_telefone is distinct from private.normalizar_telefone(cliente_telefone);
  
    for c in select * from public.clientes where telefone <> private.normalizar_telefone(telefone) order by criado_em loop
      select id into v_certo from public.clientes where grupo = c.grupo and telefone = private.normalizar_telefone(c.telefone);
      if v_certo is null then
        update public.clientes set telefone = private.normalizar_telefone(c.telefone), atualizado_em = now() where id = c.id;
      else
        -- mesmo cliente salvo duas vezes: junta no cadastro certo
        update public.pedidos set cliente_id = v_certo where cliente_id = c.id;
        insert into public.cliente_enderecos (cliente_id, chave, logradouro, numero, complemento, bairro, referencia, ultimo_uso)
        select v_certo, e.chave, e.logradouro, e.numero, e.complemento, e.bairro, e.referencia, e.ultimo_uso
          from public.cliente_enderecos e where e.cliente_id = c.id
        on conflict (cliente_id, chave) do update set ultimo_uso = greatest(public.cliente_enderecos.ultimo_uso, excluded.ultimo_uso);
        update public.clientes k
           set observacoes = nullif(left(concat_ws(' · ', k.observacoes, case when c.observacoes is distinct from k.observacoes then c.observacoes end), 500), ''),
               ultimo_pedido_em = greatest(k.ultimo_pedido_em, c.ultimo_pedido_em),
               criado_em = least(k.criado_em, c.criado_em),
               atualizado_em = now()
         where k.id = v_certo;
        delete from public.clientes where id = c.id;
      end if;
    end loop;
end;
$$;
revoke execute on function private.corrigir_telefones() from anon, public, authenticated;

select private.corrigir_telefones();
