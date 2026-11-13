-- D-106: UM CERTIFICADO PARA TODAS AS LOJAS DO MESMO CNPJ. O e-CNPJ A1 da matriz vale para as filiais
-- (mesma raiz de 8 dígitos). As lojas passam a usar o mesmo segredo do Vault: renovar o certificado numa
-- delas renova em todas; desconectar uma não apaga o segredo enquanto outra ainda usa.
-- Pode rodar de novo.

-- lojas que a pessoa gere com a mesma raiz de CNPJ (para oferecer "usar também em…")
create or replace function private.nfe_lojas_mesma_raiz(p_loja uuid, p_raiz text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'nome', l.nome, 'cnpj', l.cnpj, 'uf', l.uf,
                                               'tem_certificado', c.loja_id is not null,
                                               'mesmo_certificado', c.loja_id is not null and c.segredo_pfx = (select x.segredo_pfx from private.nfe_certificados x where x.loja_id = p_loja))
                            order by l.nome), '[]'::jsonb)
    from public.lojas l left join private.nfe_certificados c on c.loja_id = l.id
   where l.id <> p_loja and p_raiz is not null and left(l.cnpj, 8) = p_raiz and private.e_gestor(l.id);
$$;
revoke execute on function private.nfe_lojas_mesma_raiz(uuid, text) from public, anon, authenticated;

create or replace function public.nfe_auto_situacao(p_loja uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_raiz text;
begin
  if not private.pode_estoque(p_loja) then raise exception 'Sem acesso ao estoque.' using errcode = 'insufficient_privilege'; end if;
  select left(coalesce(c.cnpj_certificado, l.cnpj), 8) into v_raiz
    from public.lojas l left join private.nfe_certificados c on c.loja_id = l.id where l.id = p_loja;
  return jsonb_build_object(
    'loja_id', p_loja,
    'pode_configurar', private.e_gestor(p_loja),
    'cnpj_loja', (select l.cnpj from public.lojas l where l.id = p_loja),
    'uf_loja', (select l.uf from public.lojas l where l.id = p_loja),
    'certificado', (select jsonb_build_object('cnpj', c.cnpj, 'cnpj_certificado', c.cnpj_certificado, 'titular', c.titular, 'validade', c.validade,
                      'ultima_consulta', c.ultima_consulta, 'proxima_consulta', c.proxima_consulta, 'ultimo_status', c.ultimo_status, 'ultimo_erro', c.ultimo_erro,
                      'em_dia', c.max_nsu is not null and c.ult_nsu >= c.max_nsu,
                      'compartilhado', (select count(*) from private.nfe_certificados o where o.segredo_pfx = c.segredo_pfx and o.loja_id <> c.loja_id))
                    from private.nfe_certificados c where c.loja_id = p_loja),
    'outras_lojas', case when private.e_gestor(p_loja) then private.nfe_lojas_mesma_raiz(p_loja, v_raiz) else '[]'::jsonb end,
    'notas', coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'chave', n.chave, 'emitente_cnpj', n.emitente_cnpj, 'emitente_nome', n.emitente_nome,
                         'emissao', n.emissao, 'valor_total', n.valor_total, 'situacao', n.situacao, 'status', n.status, 'tem_xml', n.xml is not null,
                         'ciencia_em', n.ciencia_em, 'erro', n.erro, 'recebida_em', n.criado_em) order by n.emissao desc nulls last)
                       from (select * from public.nfe_recebidas where loja_id = p_loja and (status <> 'ignorada' or atualizado_em > now() - interval '30 days')
                             order by emissao desc nulls last limit 200) n), '[]'::jsonb));
end;
$$;
grant execute on function public.nfe_auto_situacao(uuid) to authenticated;

-- salvar/renovar: se o segredo é dividido com outras lojas e o CNPJ é da mesma raiz, renova em todas;
-- certificado de outra raiz ganha segredo próprio (as outras lojas continuam com o antigo)
create or replace function public.nfe_auto_salvar_certificado(p_loja uuid, p_pfx_base64 text, p_senha text, p_cnpj_certificado text,
                                                              p_titular text, p_validade timestamptz, p_ambiente smallint default 1)
returns void language plpgsql security definer set search_path = '' as $$
declare l public.lojas; c private.nfe_certificados; v_cnpj text; v_dividido boolean; v_pfx uuid; v_senha uuid;
begin
  if not private.e_gestor(p_loja) then raise exception 'Só o dono ou o gerente cadastram o certificado.' using errcode = 'insufficient_privilege'; end if;
  select * into l from public.lojas where id = p_loja;
  if coalesce(l.uf, '') = '' then raise exception 'Cadastre a UF da loja (Configurações da loja) antes do certificado.' using errcode = 'check_violation'; end if;
  if p_cnpj_certificado !~ '^[0-9]{14}$' then raise exception 'O certificado precisa ser um e-CNPJ (A1 da empresa).' using errcode = 'check_violation'; end if;
  v_cnpj := coalesce(l.cnpj, p_cnpj_certificado);
  if left(v_cnpj, 8) <> left(p_cnpj_certificado, 8) then
    raise exception 'O certificado é do CNPJ %, que não é o desta loja (%).', p_cnpj_certificado, v_cnpj using errcode = 'check_violation';
  end if;
  if p_validade < now() then raise exception 'Este certificado está vencido.' using errcode = 'check_violation'; end if;
  if length(coalesce(p_pfx_base64, '')) < 100 or length(p_pfx_base64) > 200000 then raise exception 'Arquivo de certificado inválido.' using errcode = 'check_violation'; end if;
  select * into c from private.nfe_certificados where loja_id = p_loja for update;
  v_dividido := c.loja_id is not null and exists (select 1 from private.nfe_certificados o where o.segredo_pfx = c.segredo_pfx and o.loja_id <> p_loja);
  if v_dividido and left(c.cnpj_certificado, 8) <> left(p_cnpj_certificado, 8) then
    v_pfx := private.nfe_guardar(null, p_pfx_base64);
    v_senha := private.nfe_guardar(null, p_senha);
  else
    v_pfx := private.nfe_guardar(c.segredo_pfx, p_pfx_base64);
    v_senha := private.nfe_guardar(c.segredo_senha, p_senha);
  end if;
  insert into private.nfe_certificados (loja_id, cnpj, cnpj_certificado, titular, validade, uf, ambiente, segredo_pfx, segredo_senha, criado_por)
  values (p_loja, v_cnpj, p_cnpj_certificado, left(p_titular, 160), p_validade, l.uf, coalesce(p_ambiente, 1), v_pfx, v_senha, auth.uid())
  on conflict (loja_id) do update set cnpj = excluded.cnpj, cnpj_certificado = excluded.cnpj_certificado, titular = excluded.titular,
        validade = excluded.validade, uf = excluded.uf, ambiente = excluded.ambiente, segredo_pfx = excluded.segredo_pfx,
        segredo_senha = excluded.segredo_senha, ultimo_erro = null, atualizado_em = now(),
        ult_nsu = case when nfe_certificados.cnpj = excluded.cnpj then nfe_certificados.ult_nsu else '000000000000000' end,
        max_nsu = case when nfe_certificados.cnpj = excluded.cnpj then nfe_certificados.max_nsu else null end;
  -- renovou no mesmo segredo: as outras lojas que o usam passam a ter a validade nova
  update private.nfe_certificados
     set cnpj_certificado = p_cnpj_certificado, titular = left(p_titular, 160), validade = p_validade, ultimo_erro = null,
         proxima_consulta = least(proxima_consulta, now()), atualizado_em = now()
   where segredo_pfx = v_pfx and loja_id <> p_loja;
end;
$$;
grant execute on function public.nfe_auto_salvar_certificado(uuid, text, text, text, text, timestamptz, smallint) to authenticated;

-- usar o certificado de uma loja em outras do mesmo CNPJ raiz (sem enviar o arquivo de novo)
create or replace function public.nfe_auto_usar_certificado(p_origem uuid, p_lojas uuid[])
returns integer language plpgsql security definer set search_path = '' as $$
declare o private.nfe_certificados; l public.lojas; n integer := 0;
begin
  if not private.e_gestor(p_origem) then raise exception 'Só o dono ou o gerente.' using errcode = 'insufficient_privilege'; end if;
  select * into o from private.nfe_certificados where loja_id = p_origem;
  if o.loja_id is null then raise exception 'Esta loja não tem certificado conectado.' using errcode = 'no_data_found'; end if;
  if o.validade < now() then raise exception 'O certificado está vencido. Envie o novo antes.' using errcode = 'check_violation'; end if;
  if coalesce(array_length(p_lojas, 1), 0) > 50 then raise exception 'Até 50 lojas por vez.' using errcode = 'check_violation'; end if;
  for l in select * from public.lojas where id = any (p_lojas) and id <> p_origem loop
    if not private.e_gestor(l.id) then
      raise exception 'Você não gere a loja %.', l.nome using errcode = 'insufficient_privilege';
    end if;
    if l.cnpj is null or left(l.cnpj, 8) <> left(o.cnpj_certificado, 8) then
      raise exception 'A loja % não é do mesmo CNPJ do certificado (cadastre o CNPJ dela em Dados da empresa).', l.nome using errcode = 'check_violation';
    end if;
    if coalesce(l.uf, '') = '' then
      raise exception 'Cadastre a UF da loja % antes.', l.nome using errcode = 'check_violation';
    end if;
    -- a loja tinha um segredo só dela: apaga
    perform private.nfe_apagar(c.segredo_pfx), private.nfe_apagar(c.segredo_senha)
       from private.nfe_certificados c
      where c.loja_id = l.id and c.segredo_pfx <> o.segredo_pfx
        and not exists (select 1 from private.nfe_certificados x where x.segredo_pfx = c.segredo_pfx and x.loja_id <> l.id);
    insert into private.nfe_certificados (loja_id, cnpj, cnpj_certificado, titular, validade, uf, ambiente, segredo_pfx, segredo_senha, criado_por)
    values (l.id, l.cnpj, o.cnpj_certificado, o.titular, o.validade, l.uf, o.ambiente, o.segredo_pfx, o.segredo_senha, auth.uid())
    on conflict (loja_id) do update set cnpj = excluded.cnpj, cnpj_certificado = excluded.cnpj_certificado, titular = excluded.titular,
          validade = excluded.validade, uf = excluded.uf, ambiente = excluded.ambiente, segredo_pfx = excluded.segredo_pfx,
          segredo_senha = excluded.segredo_senha, ultimo_erro = null, proxima_consulta = least(nfe_certificados.proxima_consulta, now()), atualizado_em = now(),
          ult_nsu = case when nfe_certificados.cnpj = excluded.cnpj then nfe_certificados.ult_nsu else '000000000000000' end,
          max_nsu = case when nfe_certificados.cnpj = excluded.cnpj then nfe_certificados.max_nsu else null end;
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.nfe_auto_usar_certificado(uuid, uuid[]) from public, anon;
grant execute on function public.nfe_auto_usar_certificado(uuid, uuid[]) to authenticated;

-- desconectar: o segredo só é apagado quando nenhuma outra loja o usa
create or replace function public.nfe_auto_remover(p_loja uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare c private.nfe_certificados;
begin
  if not private.e_gestor(p_loja) then raise exception 'Só o dono ou o gerente.' using errcode = 'insufficient_privilege'; end if;
  delete from private.nfe_certificados where loja_id = p_loja returning * into c;
  if found and not exists (select 1 from private.nfe_certificados x where x.segredo_pfx = c.segredo_pfx) then
    perform private.nfe_apagar(c.segredo_pfx);
    perform private.nfe_apagar(c.segredo_senha);
  end if;
end;
$$;
grant execute on function public.nfe_auto_remover(uuid) to authenticated;
