import type { ReactNode } from 'react';
import Link from 'next/link';
import { formatarReais } from '@res/core';
import { contextoLoja } from '@/lib/loja';
import { carregarCardapio } from '@/lib/cardapio';
import { criarClienteServidor } from '@/lib/supabase/server';
import { n, quantidadeTexto, type ItemFicha, type Movimento, type NotaImportada, type PainelEstoque } from '@/lib/estoque';
import { ListaInsumos } from '@/components/estoque/insumos';
import { ImportarNFe } from '@/components/estoque/importar-nfe';
import { Fichas } from '@/components/estoque/fichas';
import { ModoEstoque } from '@/components/estoque/modo';

export const dynamic = 'force-dynamic';

const TIPO: Record<Movimento['tipo'], string> = {
  entrada_nfe: 'Entrada (NF-e)',
  entrada: 'Entrada',
  perda: 'Perda',
  contagem: 'Contagem',
  venda: 'Venda',
  estorno_venda: 'Venda cancelada',
};

export default async function Estoque({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const sp = await searchParams;
  const aba = ['nfe', 'fichas', 'movimentos'].includes(sp.aba ?? '') ? sp.aba! : 'insumos';
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('estoque_painel', { p_loja: ctx.lojaId });
  if (error || !data) return <p className="cartao dica">{error?.message ?? 'Sem acesso ao estoque.'}</p>;
  const p = data as PainelEstoque;

  let conteudo: ReactNode;
  if (aba === 'insumos') {
    conteudo = <ListaInsumos insumos={p.insumos} />;
  } else if (aba === 'nfe') {
    const notas = await supabase.rpc('notas_importadas', { p_loja: ctx.lojaId });
    conteudo = <ImportarNFe insumos={p.insumos} notas={(notas.data as NotaImportada[] | null) ?? []} />;
  } else if (aba === 'fichas') {
    const [cardapio, fichas] = await Promise.all([carregarCardapio(ctx.lojaId), supabase.rpc('fichas_loja', { p_loja: ctx.lojaId })]);
    conteudo = <Fichas produtos={cardapio.produtos} grupos={Object.values(cardapio.grupos)} insumos={p.insumos} fichas={(fichas.data as ItemFicha[] | null) ?? []} />;
  } else {
    const m = await supabase.rpc('movimentos_estoque', { p_loja: ctx.lojaId, p_insumo: null, p_limite: 300 });
    const lista = (m.data as Movimento[] | null) ?? [];
    conteudo =
      lista.length === 0 ? (
        <p className="cartao dica" style={{ margin: 0 }}>Nenhuma movimentação ainda.</p>
      ) : (
        <div className="cartao tabela-rolagem" style={{ padding: 0 }}>
          <table className="tabela">
            <thead><tr><th>Quando</th><th>Insumo</th><th>O quê</th><th>Quantidade</th><th>Saldo depois</th><th>Detalhe</th></tr></thead>
            <tbody>
              {lista.map((x) => (
                <tr key={x.id}>
                  <td className="dica">{new Date(x.em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td>{x.insumo}</td>
                  <td><span className="est-mov" data-tipo={x.tipo}>{TIPO[x.tipo]}</span></td>
                  <td className={n(x.quantidade) < 0 ? 'erro' : undefined}>{n(x.quantidade) > 0 ? '+' : ''}{quantidadeTexto(n(x.quantidade), x.unidade)}</td>
                  <td>{quantidadeTexto(n(x.saldo_apos), x.unidade)}</td>
                  <td className="dica">{x.motivo ?? ''}{x.loja && p.compartilhado ? ` · ${x.loja}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
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
        <Link href="/estoque" role="tab" aria-selected={aba === 'insumos'} className="aba-link">Insumos</Link>
        <Link href="/estoque?aba=nfe" role="tab" aria-selected={aba === 'nfe'} className="aba-link">Entrada por NF-e</Link>
        <Link href="/estoque?aba=fichas" role="tab" aria-selected={aba === 'fichas'} className="aba-link">Ficha técnica</Link>
        <Link href="/estoque?aba=movimentos" role="tab" aria-selected={aba === 'movimentos'} className="aba-link">Movimentações</Link>
      </nav>
      {conteudo}
    </div>
  );
}
