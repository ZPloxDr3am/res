-- Os testes antigos criam lojas direto (criar_loja): a plataforma fica em cadastro aberto aqui.
-- O modo convite (padrão em produção, D-082) é testado em 99…_convites.
insert into private.config_plataforma (chave, valor) values ('cadastro_modo', 'aberto') on conflict (chave) do update set valor = 'aberto';
select 'ok plataforma em modo aberto para os testes';
