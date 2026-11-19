-- Nova tentativa automática dos eventos de apps parados (auditoria de 19/11/2026).
\set ON_ERROR_STOP on
\o /dev/null
insert into private.marketplace_eventos (canal, evento_id, codigo, corpo, recebido_em, processado_em, tentativas) values
  ('ifood', 'rp-parado',    'PLC', '{"id":"rp-parado"}',    now() - interval '5 minutes', null, 0),   -- pega
  ('ifood', 'rp-erro',      'PLC', '{"id":"rp-erro"}',      now() - interval '10 minutes', null, 2),  -- pega (falhou 2 vezes)
  ('ifood', 'rp-recente',   'PLC', '{"id":"rp-recente"}',   now() - interval '30 seconds', null, 0),  -- ainda pode estar em processamento
  ('ifood', 'rp-velho',     'PLC', '{"id":"rp-velho"}',     now() - interval '7 hours', null, 0),     -- velho demais
  ('ifood', 'rp-desistiu',  'PLC', '{"id":"rp-desistiu"}',  now() - interval '10 minutes', null, 5),  -- 5 tentativas
  ('ifood', 'rp-feito',     'PLC', '{"id":"rp-feito"}',     now() - interval '10 minutes', now(), 1), -- já processado
  ('ifood', 'rp-sem-corpo', 'PLC', null,                    now() - interval '10 minutes', null, 0);  -- nada para refazer

create temp table r1 as select * from public.marketplace_eventos_parados(20);
create temp table r2 as select * from public.marketplace_eventos_parados(20);  -- logo depois: já reservados
do $$ begin
  if (select string_agg(evento_id, ',' order by evento_id) from r1 where evento_id like 'rp-%') <> 'rp-erro,rp-parado' then
    raise exception 'parados: esperava rp-erro,rp-parado, veio %', (select string_agg(evento_id, ',' order by evento_id) from r1);
  end if;
  if exists (select 1 from r2 where evento_id like 'rp-%') then raise exception 'reserva: devolveu de novo antes de 2 minutos'; end if;
end $$;
-- reserva vencida volta a ser oferecida; o resultado com sucesso tira da lista
update private.marketplace_eventos set tentado_em = now() - interval '3 minutes' where evento_id in ('rp-parado', 'rp-erro');
select public.marketplace_evento_resultado('ifood', 'rp-parado', null);
create temp table r3 as select * from public.marketplace_eventos_parados(20);
do $$ begin
  if (select string_agg(evento_id, ',') from r3 where evento_id like 'rp-%') <> 'rp-erro' then raise exception 'depois do sucesso, só rp-erro'; end if;
end $$;
-- só o servidor chama
set role authenticated;
do $$ begin
  begin perform public.marketplace_eventos_parados(1); raise exception 'deveria ser negado';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
delete from private.marketplace_eventos where evento_id like 'rp-%';
\o
select 'ok reprocesso: eventos de apps parados há 2 min a 6 h, até 5 tentativas, com reserva' as resultado;
