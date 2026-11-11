'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatarReais } from '@res/core';
import { situacaoPedidos } from '@/app/c/[slug]/actions';

export type PedidoGuardado = { codigo: string; slug: string; numero: number; total: number; em: string };
const CHAVE = 'res_meus_pedidos';
const STATUS: Record<string, string> = { novo: 'Enviado', em_preparo: 'Em preparo', pronto: 'Pronto', em_entrega: 'Saiu para entrega', concluido: 'Entregue', cancelado: 'Cancelado' };

export function lerPedidos(): PedidoGuardado[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? '[]') as PedidoGuardado[];
  } catch {
    return [];
  }
}
/** Guarda o pedido neste aparelho para a aba "Pedidos" (D-047). */
export function guardarPedido(p: PedidoGuardado) {
  try {
    const l = [p, ...lerPedidos().filter((x) => x.codigo !== p.codigo)].slice(0, 30);
    localStorage.setItem(CHAVE, JSON.stringify(l));
  } catch {}
}

/** Barra de baixo do cardápio: Cardápio · Pedidos · Perfil (D-047). */
export function NavCliente({ aba, setAba, temSacola }: { aba: 'cardapio' | 'pedidos' | 'perfil'; setAba: (a: 'cardapio' | 'pedidos' | 'perfil') => void; temSacola: boolean }) {
  return (
    <nav className="cl-nav" data-sacola={temSacola ? 'sim' : undefined} aria-label="Menu">
      {([['cardapio', '🏠', 'Cardápio'], ['pedidos', '🧾', 'Pedidos'], ['perfil', '👤', 'Perfil']] as const).map(([v, i, r]) => (
        <button key={v} type="button" aria-current={aba === v ? 'page' : undefined} onClick={() => setAba(v)}>
          <span aria-hidden>{i}</span>
          {r}
        </button>
      ))}
    </nav>
  );
}

export function MeusPedidos({ slug }: { slug: string }) {
  const [lista, setLista] = useState<PedidoGuardado[] | null>(null);
  const [vivo, setVivo] = useState<Awaited<ReturnType<typeof situacaoPedidos>>>({});
  useEffect(() => {
    const l = lerPedidos();
    setLista(l);
    if (l.length) situacaoPedidos(l.map((p) => p.codigo)).then(setVivo).catch(() => {});
  }, []);
  if (!lista) return null;
  return (
    <main className="pub-lista grade cl-pagina">
      <h2>Meus pedidos</h2>
      {lista.length === 0 ? (
        <p className="dica">Os pedidos feitos neste aparelho aparecem aqui.</p>
      ) : (
        <ul className="cl-pedidos">
          {lista.map((p) => {
            const v = vivo[p.codigo];
            return (
              <li key={p.codigo}>
                <Link href={`/c/${p.slug}/pedido/${p.codigo}`}>
                  <span className="grade" style={{ gap: '0.1rem' }}>
                    <strong>Pedido #{v?.numero ?? p.numero}{v?.marca && p.slug !== slug ? ` · ${v.marca}` : ''}</strong>
                    <span className="dica">{new Date(v?.criado_em ?? p.em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · {formatarReais(v?.total ?? p.total)}</span>
                  </span>
                  <span className="cl-status" data-status={v?.status}>{v ? STATUS[v.status] ?? v.status : '…'}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

type Dados = { cliente?: { nome: string; telefone: string }; endereco?: { logradouro: string; numero: string; bairro: string; complemento: string; referencia: string } };
export function PerfilCliente() {
  const [d, setD] = useState<Dados | null>(null);
  const [salvo, setSalvo] = useState(false);
  useEffect(() => {
    try {
      setD(JSON.parse(localStorage.getItem('res_cliente') ?? '{}') as Dados);
    } catch {
      setD({});
    }
  }, []);
  if (!d) return null;
  const c = d.cliente ?? { nome: '', telefone: '' };
  const e = d.endereco ?? { logradouro: '', numero: '', bairro: '', complemento: '', referencia: '' };
  const gravar = (x: Dados) => {
    setD(x);
    setSalvo(false);
  };
  return (
    <main className="pub-lista grade cl-pagina">
      <h2>Meus dados</h2>
      <p className="dica" style={{ margin: 0 }}>Ficam guardados só neste aparelho, para o próximo pedido sair mais rápido.</p>
      <label>WhatsApp<input type="tel" value={c.telefone} onChange={(ev) => gravar({ ...d, cliente: { ...c, telefone: ev.target.value } })} placeholder="(47) 99999-0000" /></label>
      <label>Nome<input value={c.nome} maxLength={120} onChange={(ev) => gravar({ ...d, cliente: { ...c, nome: ev.target.value } })} /></label>
      <div className="pub-linha">
        <label style={{ flex: '3 1 12rem' }}>Rua<input value={e.logradouro} onChange={(ev) => gravar({ ...d, endereco: { ...e, logradouro: ev.target.value } })} /></label>
        <label style={{ flex: '1 1 5rem' }}>Número<input value={e.numero} onChange={(ev) => gravar({ ...d, endereco: { ...e, numero: ev.target.value } })} /></label>
      </div>
      <label>Complemento<input value={e.complemento} onChange={(ev) => gravar({ ...d, endereco: { ...e, complemento: ev.target.value } })} /></label>
      <div className="pub-linha">
        <button
          type="button"
          className="botao-primario"
          onClick={() => {
            try {
              localStorage.setItem('res_cliente', JSON.stringify(d));
              setSalvo(true);
            } catch {}
          }}
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={() => {
            if (!window.confirm('Apagar seus dados e a lista de pedidos deste aparelho?')) return;
            try {
              localStorage.removeItem('res_cliente');
              localStorage.removeItem(CHAVE);
            } catch {}
            setD({});
          }}
        >
          Esquecer meus dados
        </button>
        {salvo && <span className="dica">Salvo.</span>}
      </div>
    </main>
  );
}
