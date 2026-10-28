import type { ReactNode } from 'react';
import Link from 'next/link';
import { formatarReais } from '@res/core';
import { contextoLoja } from '@/lib/loja';
import { carregarCardapio } from '@/lib/cardapio';
import { criarClienteServidor } from '@/lib/supabase/server';
import { n, type ContagemPainel, type FechamentoEstoque, type ItemFicha, type MeuEstoque, type NotaImportada, type PainelEstoque } from '@/lib/estoque';
import { ListaInsumos } from '@/components/estoque/insumos';
import { ImportarNFe } from '@/components/estoque/importar-nfe';
import { Fichas } from '@/components/estoque/fichas';
import { ModoEstoque } from '@/components/estoque/modo';
import { Movimentacoes } from '@/components/estoque/movimentos';
import { MeuEstoqueProdutos } from '@/components/estoque/meu-estoque';
import { Contagem } from '@/components/estoque/contagem';
import { Fechamento } from '@/components/estoque/fechamento';
import { SaboresPizza } from '@/components/estoque/sabores-pizza';

export const dynamic = 'force-dynamic';


export default async function Estoque({ searchParams }: { searchParams: Promise<{ aba?: string; insumo?: string; ver?: string; lojas?: string; mes?: string }> }) {
  const sp = await searchParams;
  const aba = sp.aba === 'fichas' ? 'meu' : ['insumos', 'contagem', 'nfe', 'movimentos', 'cmv'].includes(sp.aba ?? '') ? sp.aba! : 'meu';
  const sabores = sp.aba === 'fichas' || sp.ver === 'sabores';
  const todas = sp.lojas === 'todas';
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('estoque_painel', { p_loja: ctx.lojaId });
  if (error || !data) return <p className="cartao dica">{error?.message ?? 'Sem acesso ao estoque.'}</p>;
  const p = data as PainelEstoque;

  let conteudo: ReactNode;
  if (aba === 'meu') {
    const base = `/estoque?aba=meu${todas ? '&lojas=todas' : ''}`;
    let corpo: ReactNode;
    let outras = 0;
    if (sabores) {
      const [cardapio, fichas, fatores] = await Promise.all([
        carregarCardapio(ctx.lojaId),
        supabase.rpc('fichas_loja', { p_loja: ctx.lojaId }),
        supabase.from('produtos').select('id, nome, fator_sabor').eq('loja_id', ctx.lojaId).eq('combo', false),
      ]);
      const grupos = Object.values(cardapio.grupos);
      const gruposPizza = new Set(grupos.filter((g) => g.pizza).map((g) => g.id));
      const comPizza = new Set(cardapio.produtos.filter((x) => x.produto_grupos.some((pg) => gruposPizza.has(pg.grupo_id))).map((x) => x.id));
      const pizzas = ((fatores.data ?? []) as { id: string; nome: string; fator_sabor: number }[]).filter((x) => comPizza.has(x.id));
      const fs = (fichas.data as ItemFicha[] | null) ?? [];
      const outrosGrupos = grupos.filter((g) => !g.pizza);
      corpo = (
        <div className="grade">
          <SaboresPizza pizzas={pizzas} grupos={grupos} insumos={p.insumos} fichas={fs} />
          {outrosGrupos.some((g) => g.ativo && g.opcoes.some((o) => o.ativo)) && (
            <>
              <h2 style={{ margin: '0.6rem 0 0' }}>Bordas e adicionais</h2>
              <Fichas soOpcoes produtos={cardapio.produtos} grupos={outrosGrupos} insumos={p.insumos} fichas={fs} />
            </>
          )}
        </div>
      );
    } else {
      const meu = await supabase.rpc('meu_estoque', { p_loja: ctx.lojaId, p_todas: todas });
      const dados = meu.data as MeuEstoque | null;
      outras = dados?.outras_lojas ?? 0;
      corpo = dados ? <MeuEstoqueProdutos dados={dados} todas={todas} /> : <p className="erro">{meu.error?.message ?? 'Não consegui carregar.'}</p>;
    }
    conteudo = (
      <div className="grade">
        <div className="linha" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="segmentos" role="group" aria-label="O que ver">
            <Link href={base} aria-current={!sabores ? 'true' : undefined}>Produtos</Link>
            <Link href={`${base}&ver=sabores`} aria-current={sabores ? 'true' : undefined}>Sabores, bordas e adicionais</Link>
          </div>
          {outras > 0 && !sabores && (
            <div className="segmentos" role="group" aria-label="Lojas">
              <Link href="/estoque?aba=meu" aria-current={!todas ? 'true' : undefined}>Esta loja</Link>
              <Link href="/estoque?aba=meu&lojas=todas" aria-current={todas ? 'true' : undefined}>Todas as lojas ({outras + 1})</Link>
            </div>
          )}
        </div>
        {corpo}
      </div>
    );
  } else if (aba === 'insumos') {
    conteudo = <ListaInsumos insumos={p.insumos} />;
  } else if (aba === 'contagem') {
    const c = await supabase.rpc('contagem_painel', { p_loja: ctx.lojaId });
    conteudo = (
      <div className="ct-pagina">
        <Contagem lojaId={ctx.lojaId} insumos={p.insumos} painel={(c.data as ContagemPainel | null) ?? { de_nfe: [], ultima: {} }} />
      </div>
    );
  } else if (aba === 'cmv') {
    const mesAtual = new Date(Date.now() - 5 * 3600_000).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }).slice(0, 7);
    const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? '') && sp.mes! <= mesAtual ? sp.mes! : mesAtual;
    const fc = await supabase.rpc('fechamento_estoque', { p_loja: ctx.lojaId, p_mes: `${mes}-01` });
    conteudo = fc.data ? <Fechamento f={fc.data as FechamentoEstoque} mesAtual={mesAtual} /> : <p className="erro">{fc.error?.message ?? 'Não consegui carregar.'}</p>;
  } else if (aba === 'nfe') {
    const notas = await supabase.rpc('notas_importadas', { p_loja: ctx.lojaId });
    conteudo = <ImportarNFe insumos={p.insumos} notas={(notas.data as NotaImportada[] | null) ?? []} />;
  } else {
    const prods = await supabase.from('produtos').select('id, nome').eq('loja_id', ctx.lojaId).eq('combo', false).order('nome');
    conteudo = <Movimentacoes insumos={p.insumos} produtos={(prods.data ?? []) as { id: string; nome: string }[]} inicial={{ insumo: sp.insumo ?? '' }} />;
  }

  const baixos = p.insumos.filter((i) => i.controla && (n(i.saldo) <= 0 || (i.minimo != null && n(i.saldo) <= n(i.minimo)))).length;
  return (
    <div className="grade">
      <div>
        <h1 style={{ marginBottom: 0 }}>Estoque{p.compartilhado ? ' do grupo' : ` · ${ctx.lojaNome}`}</h1>
        <p className="dica" style={{ margin: 0 }}>
          Entra pela NF-e do fornecedor, sai sozinho a cada pedido concluído (pela ficha técnica).
          {p.insumos.length > 0 && <> {p.insumos.length} insumos · {formatarReais(n(p.valor_estoque))} em estoque{baixos ? ` · ${baixos} acabando` : ''}.</>}
        </p>
      </div>
      {p.pode_escolher && <ModoEstoque compartilhado={p.compartilhado} podeMudar={p.pode_mudar_modo} lojas={p.lojas} />}
      <nav className="abas nao-imprimir" aria-label="Estoque">
        <Link href="/estoque" role="tab" aria-selected={aba === 'meu'} className="aba-link">Meu estoque</Link>
        <Link href="/estoque?aba=insumos" role="tab" aria-selected={aba === 'insumos'} className="aba-link">Insumos</Link>
        <Link href="/estoque?aba=contagem" role="tab" aria-selected={aba === 'contagem'} className="aba-link">Contagem</Link>
        <Link href="/estoque?aba=nfe" role="tab" aria-selected={aba === 'nfe'} className="aba-link">Entrada por NF-e</Link>
        <Link href="/estoque?aba=movimentos" role="tab" aria-selected={aba === 'movimentos'} className="aba-link">Movimentações</Link>
        <Link href="/estoque?aba=cmv" role="tab" aria-selected={aba === 'cmv'} className="aba-link">Fechamento / CMV</Link>
      </nav>
      {conteudo}
    </div>
  );
}
