-- RES · 0003 · Tempo real: alterações de cardápio chegam a todos os dispositivos da loja
-- (equivale ao CARDAPIO_ATUALIZADO do BeeFood, R-005/R-019, por push do Supabase Realtime).
-- O RLS continua valendo: cada dispositivo só recebe linhas da própria loja.

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end;
$$;

alter publication supabase_realtime add table
  public.setores, public.setor_marcas, public.produtos, public.produto_marcas,
  public.complementos, public.grupos_opcoes, public.opcoes, public.produto_grupos,
  public.marcas;
