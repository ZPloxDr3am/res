import { criarClienteServidor } from '@/lib/supabase/server';

export const metadata = { title: 'Erros' };

type ErroAgrupado = { hash: string; origem: 'navegador' | 'servidor'; mensagem: string; caminho: string | null; pilha: string | null; digest: string | null; vezes: number; primeiro_em: string; ultimo_em: string; pessoas: number; lojas: string | null };

const quando = (iso: string) => {
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  if (min < 48 * 60) return `há ${Math.round(min / 60)} h`;
  return new Date(iso).toLocaleDateString('pt-BR');
};

/** Erros da plataforma (D-084): o que quebrou, onde, quantas vezes e para quantas pessoas. */
export default async function Erros({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const dias = Math.min(90, Math.max(1, Number((await searchParams).dias ?? 7) || 7));
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc('erros_recentes', { p_dias: dias });
  const lista = (data ?? []) as ErroAgrupado[];
  const total = lista.reduce((t, e) => t + Number(e.vezes), 0);
  return (
    <div className="grade">
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <h1>Erros</h1>
          <p className="dica" style={{ margin: 0 }}>{lista.length === 0 ? 'Nenhum erro registrado no período.' : `${total} ocorrência(s) de ${lista.length} erro(s) diferente(s). Os mais recentes primeiro.`}</p>
        </div>
        <nav className="abas" aria-label="Período">
          {[1, 7, 30].map((d) => (
            <a key={d} className="aba-link" href={`/empresa/erros?dias=${d}`} aria-selected={d === dias}>{d === 1 ? '24 horas' : `${d} dias`}</a>
          ))}
        </nav>
      </div>
      {lista.map((e) => (
        <details key={e.hash} className="cartao emp-erro" data-origem={e.origem}>
          <summary>
            <span className="emp-erro-msg">{e.mensagem}</span>
            <span className="dica">
              {e.origem === 'servidor' ? 'Servidor' : 'Navegador'} · {e.caminho ?? '—'} · {e.vezes}× · {e.pessoas} pessoa(s){e.lojas ? ` · ${e.lojas}` : ''} · último {quando(e.ultimo_em)}
            </span>
          </summary>
          {e.digest && <p className="dica" style={{ margin: 'var(--e2) 0 0' }}>Código: {e.digest}</p>}
          {e.pilha && <pre className="emp-pilha">{e.pilha}</pre>}
        </details>
      ))}
    </div>
  );
}
