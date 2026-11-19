-- Reverte a D-124 (PR #158): devolve as 85 políticas ao texto anterior (função por linha).
-- Gerado das migrações anteriores ao PR. Pode rodar no SQL Editor; não mexe em dados.
alter policy areas_entrega_ler on public.areas_entrega using (private.e_membro(loja_id));
alter policy auditoria_ler on public.auditoria using (private.tem_permissao(loja_id, 'historico_alteracoes'::text));
alter policy avaliacoes_ler on public.avaliacoes_pedido using (private.e_gestor(loja_id));
alter policy caixa_movimentos_ler on public.caixa_movimentos using ((private.tem_permissao(loja_id, 'relatorios'::text) OR private.tem_permissao(loja_id, 'caixas_cadastro'::text)));
alter policy caixa_operadores_ler on public.caixa_operadores using (private.e_membro(loja_id));
alter policy caixa_sessoes_ler on public.caixa_sessoes using ((private.tem_permissao(loja_id, 'caixa'::text) OR private.tem_permissao(loja_id, 'relatorios'::text)));
alter policy caixas_ler on public.caixas using (private.e_membro(loja_id));
alter policy canal_taxas_gestor on public.canal_taxas using (private.e_gestor(loja_id)) with check (private.e_gestor(loja_id));
alter policy cliente_enderecos_ler on public.cliente_enderecos using ((EXISTS ( SELECT 1
   FROM clientes c
  WHERE ((c.id = cliente_enderecos.cliente_id) AND private.e_membro_grupo(c.loja_id)))));
alter policy clientes_ler on public.clientes using (private.e_membro_grupo(loja_id));
alter policy combo_passos_escrever on public.combo_passos using (private.tem_permissao(loja_id, 'cardapio'::text)) with check (private.tem_permissao(loja_id, 'cardapio'::text));
alter policy combo_passos_ler on public.combo_passos using (private.e_membro(loja_id));
alter policy complementos_escrever on public.complementos using (private.tem_permissao(loja_id, 'cardapio'::text)) with check (private.tem_permissao(loja_id, 'cardapio'::text));
alter policy complementos_ler on public.complementos using (private.e_membro(loja_id));
alter policy contas_ler on public.contas using ((private.e_titular(id) OR (EXISTS ( SELECT 1
   FROM lojas l
  WHERE ((l.conta_id = contas.id) AND private.e_membro(l.id))))));
alter policy convites_apagar on public.convites using (private.tem_permissao(loja_id, 'equipe'::text));
alter policy convites_ler on public.convites using (private.tem_permissao(loja_id, 'equipe'::text));
alter policy cupons_escrever on public.cupons using (private.tem_permissao(loja_id, 'cardapio'::text)) with check (private.tem_permissao(loja_id, 'cardapio'::text));
alter policy cupons_ler on public.cupons using (private.e_membro(loja_id));
alter policy custos_gestor on public.custos using (
CASE
    WHEN (loja_id IS NOT NULL) THEN private.e_gestor(loja_id)
    ELSE private.e_titular(conta_id)
END) with check (
CASE
    WHEN (loja_id IS NOT NULL) THEN private.e_gestor(loja_id)
    ELSE private.e_titular(conta_id)
END);
alter policy faixas_km_ler on public.faixas_km using (private.e_membro(loja_id));
alter policy fin_config_gestor on public.fin_config using (private.e_gestor(loja_id)) with check (private.e_gestor(loja_id));
alter policy fin_taxas_gestor on public.fin_taxas using (private.e_gestor(loja_id)) with check (private.e_gestor(loja_id));
alter policy frete_gratis_escrever on public.frete_gratis using (private.tem_permissao(loja_id, 'cardapio'::text)) with check (private.tem_permissao(loja_id, 'cardapio'::text));
alter policy frete_gratis_ler on public.frete_gratis using (private.e_membro(loja_id));
alter policy funcionario_registros_gestor on public.funcionario_registros using (private.e_gestor(loja_id)) with check (private.e_gestor(loja_id));
alter policy funcionarios_gestor on public.funcionarios using (private.e_gestor(loja_id)) with check (private.e_gestor(loja_id));
alter policy gestao_conta_ler on public.gestao_conta using ((private.e_titular(conta_id) OR (EXISTS ( SELECT 1
   FROM lojas l
  WHERE ((l.conta_id = gestao_conta.conta_id) AND private.e_gestor(l.id))))));
alter policy gestao_empresa_gestor on public.gestao_empresa using (private.e_gestor(loja_id)) with check (private.e_gestor(loja_id));
alter policy grupos_escrever on public.grupos_acesso using (private.tem_permissao(loja_id, 'equipe'::text)) with check (private.tem_permissao(loja_id, 'equipe'::text));
alter policy grupos_ler on public.grupos_acesso using (private.e_membro(loja_id));
alter policy grupos_opcoes_escrever on public.grupos_opcoes using (private.tem_permissao(loja_id, 'cardapio'::text)) with check (private.tem_permissao(loja_id, 'cardapio'::text));
alter policy grupos_opcoes_ler on public.grupos_opcoes using (private.e_membro(loja_id));
alter policy impressao_config_ler on public.impressao_config using (private.e_membro(loja_id));
alter policy impressao_destinos_ler on public.impressao_destinos using (private.e_membro(loja_id));
alter policy impressao_layouts_ler on public.impressao_layouts using (private.e_membro(loja_id));
alter policy impressoes_ler on public.impressoes using ((private.tem_permissao(loja_id, 'pedidos_delivery'::text) OR private.tem_permissao(loja_id, 'impressoras'::text)));
alter policy impressoras_ler on public.impressoras using (private.e_membro_grupo(loja_id));
alter policy lgpd_ler on public.lgpd_registros using (((loja_id IS NOT NULL) AND private.e_gestor(loja_id)));
alter policy lojas_editar on public.lojas using (private.tem_permissao(id, 'dados_empresa'::text)) with check (private.tem_permissao(id, 'dados_empresa'::text));
alter policy lojas_ler on public.lojas using (private.e_membro(id));
alter policy marca_horarios_ler on public.marca_horarios using (private.e_membro(loja_id));
alter policy marcas_escrever on public.marcas using (private.tem_permissao(loja_id, 'dados_empresa'::text)) with check (private.tem_permissao(loja_id, 'dados_empresa'::text));
alter policy marcas_ler on public.marcas using (private.e_membro(loja_id));
alter policy marketplace_itens_escrever on public.marketplace_itens using (private.tem_permissao(loja_id, 'cardapio'::text)) with check (private.tem_permissao(loja_id, 'cardapio'::text));
alter policy marketplace_itens_ler on public.marketplace_itens using (private.e_membro(loja_id));
alter policy marketplace_lojas_gestor on public.marketplace_lojas using (private.e_gestor(loja_id)) with check (private.e_gestor(loja_id));
alter policy marketplace_lojas_ler on public.marketplace_lojas using (private.e_membro(loja_id));
alter policy marketplace_negociacoes_ler on public.marketplace_negociacoes using (private.e_membro(loja_id));
alter policy marketplace_pedidos_ler on public.marketplace_pedidos using (private.e_gestor(loja_id));
alter policy marketplace_precos_gravar on public.marketplace_precos using (private.tem_permissao(loja_id, 'cardapio'::text)) with check (private.tem_permissao(loja_id, 'cardapio'::text));
alter policy marketplace_precos_ler on public.marketplace_precos using (private.e_membro(loja_id));
alter policy marketplace_saida_ler on public.marketplace_saida using (private.e_membro(loja_id));
alter policy membros_escrever on public.membros using (private.tem_permissao(loja_id, 'equipe'::text)) with check (private.tem_permissao(loja_id, 'equipe'::text));
alter policy membros_ler on public.membros using (private.e_membro(loja_id));
alter policy metas_gestor on public.metas_vendas using (private.e_gestor(loja_id)) with check (private.e_gestor(loja_id));
alter policy metas_ler on public.metas_vendas using (private.tem_permissao(loja_id, 'relatorios'::text));
alter policy opcoes_escrever on public.opcoes using (private.tem_permissao(loja_id, 'cardapio'::text)) with check (private.tem_permissao(loja_id, 'cardapio'::text));
alter policy opcoes_ler on public.opcoes using (private.e_membro(loja_id));
alter policy pedido_eventos_ler on public.pedido_eventos using (private.tem_permissao(loja_id, 'pedidos_delivery'::text));
alter policy pedido_item_opcoes_ler on public.pedido_item_opcoes using (private.tem_permissao(loja_id, 'pedidos_delivery'::text));
alter policy pedido_itens_ler on public.pedido_itens using (private.tem_permissao(loja_id, 'pedidos_delivery'::text));
alter policy pedidos_ler on public.pedidos using (private.tem_permissao(loja_id, 'pedidos_delivery'::text));
alter policy produto_grupos_escrever on public.produto_grupos using (private.tem_permissao(loja_id, 'cardapio'::text)) with check (private.tem_permissao(loja_id, 'cardapio'::text));
alter policy produto_grupos_ler on public.produto_grupos using (private.e_membro(loja_id));
alter policy produto_marcas_escrever on public.produto_marcas using (private.tem_permissao(loja_id, 'cardapio'::text)) with check (private.tem_permissao(loja_id, 'cardapio'::text));
alter policy produto_marcas_ler on public.produto_marcas using (private.e_membro(loja_id));
alter policy produtos_escrever on public.produtos using (private.tem_permissao(loja_id, 'cardapio'::text)) with check (private.tem_permissao(loja_id, 'cardapio'::text));
alter policy produtos_ler on public.produtos using (private.e_membro(loja_id));
alter policy promocoes_categoria_escrever on public.promocoes_categoria using (private.tem_permissao(loja_id, 'cardapio'::text)) with check (private.tem_permissao(loja_id, 'cardapio'::text));
alter policy promocoes_categoria_ler on public.promocoes_categoria using (private.e_membro(loja_id));
alter policy salao_contas_ler on public.salao_contas using (private.e_membro(loja_id));
alter policy setor_marcas_escrever on public.setor_marcas using (private.tem_permissao(loja_id, 'cardapio'::text)) with check (private.tem_permissao(loja_id, 'cardapio'::text));
alter policy setor_marcas_ler on public.setor_marcas using (private.e_membro(loja_id));
alter policy setores_escrever on public.setores using (private.tem_permissao(loja_id, 'cardapio'::text)) with check (private.tem_permissao(loja_id, 'cardapio'::text));
alter policy setores_ler on public.setores using (private.e_membro(loja_id));
alter policy tabela_preco_horarios_escrever on public.tabela_preco_horarios using (private.tem_permissao(loja_id, 'cardapio_visibilidade'::text)) with check (private.tem_permissao(loja_id, 'cardapio_visibilidade'::text));
alter policy tabela_preco_horarios_ler on public.tabela_preco_horarios using (private.e_membro(loja_id));
alter policy tabela_preco_itens_escrever on public.tabela_preco_itens using (private.tem_permissao(loja_id, 'cardapio_visibilidade'::text)) with check (private.tem_permissao(loja_id, 'cardapio_visibilidade'::text));
alter policy tabela_preco_itens_ler on public.tabela_preco_itens using (private.e_membro(loja_id));
alter policy tabela_preco_marcas_escrever on public.tabela_preco_marcas using (private.tem_permissao(loja_id, 'cardapio_visibilidade'::text)) with check (private.tem_permissao(loja_id, 'cardapio_visibilidade'::text));
alter policy tabela_preco_marcas_ler on public.tabela_preco_marcas using (private.e_membro(loja_id));
alter policy tabelas_preco_escrever on public.tabelas_preco using (private.tem_permissao(loja_id, 'cardapio_visibilidade'::text)) with check (private.tem_permissao(loja_id, 'cardapio_visibilidade'::text));
alter policy tabelas_preco_ler on public.tabelas_preco using (private.e_membro(loja_id));
alter policy usuarios_login_ler on public.usuarios_login using (((user_id = auth.uid()) OR private.tem_permissao(loja_id, 'equipe'::text)));
