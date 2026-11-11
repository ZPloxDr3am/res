'use client';
import { useRef, useState, useTransition } from 'react';
import { salvarVitrine, type Vitrine } from '@/app/(painel)/delivery/actions';
import { useEnviarFoto } from '@/components/cardapio/foto-produto';
import { salvando } from '@/components/tempo-real';

const CORES = ['#c8102e', '#e4572e', '#f2a541', '#1d6a50', '#2b59c3', '#6b3fa0', '#1f1f1f'];

/** Vitrine do cardápio digital (D-045): o cliente vê a capa, o logo e a cor desta marca. */
export function FormVitrine({ marcaId, lojaId, nome, link, inicial }: { marcaId: string; lojaId: string; nome: string; link: string; inicial: Vitrine }) {
  const [v, setV] = useState<Vitrine>(inicial);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const muda = (p: Partial<Vitrine>) => setV((x) => ({ ...x, ...p }));
  const mudou = JSON.stringify(v) !== JSON.stringify(inicial);

  return (
    <section className="cartao grade vt">
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="grade" style={{ gap: 0 }}>
          <h2 style={{ margin: 0 }}>Vitrine · {nome}</h2>
          <span className="dica">O que o cliente vê no topo do cardápio. Cada cardápio tem a sua.</span>
        </div>
        <a className="botao mini" href={link} target="_blank" rel="noopener noreferrer">Ver cardápio ↗</a>
      </div>

      <div className="vt-previa" style={{ ['--marca' as string]: v.cor ?? '#c8102e' }}>
        <Foto rotulo="Capa (foto larga, 1600×500)" classe="vt-capa" url={v.capa_url} id={`marca-${marcaId}-capa`} lojaId={lojaId} aoMudar={(u) => muda({ capa_url: u })} />
        <div className="vt-cab">
          <Foto rotulo="Logo" classe="vt-logo" url={v.logo_url} id={`marca-${marcaId}-logo`} lojaId={lojaId} aoMudar={(u) => muda({ logo_url: u })} />
          <div className="grade" style={{ gap: '0.1rem' }}>
            <strong style={{ fontSize: '1.2rem' }}>{nome}</strong>
            <span className="vt-status">Aberto agora</span>
          </div>
        </div>
      </div>

      <div className="linha" style={{ alignItems: 'center' }}>
        <span className="dica">Cor da marca</span>
        {CORES.map((c) => (
          <button key={c} type="button" className="vt-cor" style={{ background: c }} aria-pressed={v.cor === c} aria-label={`Cor ${c}`} onClick={() => muda({ cor: c })} />
        ))}
        <input type="color" value={v.cor ?? '#c8102e'} onChange={(e) => muda({ cor: e.target.value })} aria-label="Outra cor" />
      </div>
      <div className="linha">
        <label style={{ flex: '2 1 18rem' }}>Sobre a loja (aparece em "Mais informações")
          <input value={v.descricao ?? ''} maxLength={300} onChange={(e) => muda({ descricao: e.target.value || null })} placeholder="Ex.: Pizzaria artesanal em Itapema desde 2019" />
        </label>
        <label>Instagram<input value={v.instagram ?? ''} onChange={(e) => muda({ instagram: e.target.value || null })} placeholder="@lapizza.itp" style={{ width: '11rem' }} /></label>
        <label>WhatsApp da loja<input inputMode="tel" value={v.whatsapp ?? ''} onChange={(e) => muda({ whatsapp: e.target.value || null })} placeholder="(47) 99920-1943" style={{ width: '11rem' }} /></label>
      </div>
      <div className="linha" style={{ alignItems: 'center' }}>
        <button
          type="button"
          className="botao-primario"
          disabled={pendente || !mudou}
          onClick={() =>
            iniciar(async () => {
              const r = await salvando(salvarVitrine(marcaId, v));
              setMsg(r.ok ? { ok: true, t: 'Vitrine salva. Já aparece no cardápio.' } : { ok: false, t: r.erro });
            })
          }
        >
          {pendente ? 'Salvando…' : 'Salvar vitrine'}
        </button>
        {msg && <span className={msg.ok ? 'dica' : 'erro'} role="status">{msg.t}</span>}
      </div>
    </section>
  );
}

function Foto({ rotulo, classe, url, id, lojaId, aoMudar }: { rotulo: string; classe: string; url: string | null; id: string; lojaId: string; aoMudar: (u: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const { enviar, pendente, erro } = useEnviarFoto(lojaId, async (_id, u) => {
    aoMudar(u);
    return { ok: true };
  });
  return (
    <div className={`vt-foto ${classe}`} style={url ? { backgroundImage: `url(${url})` } : undefined}>
      <button type="button" className="mini" onClick={() => ref.current?.click()} disabled={pendente}>{pendente ? 'Enviando…' : url ? `Trocar ${rotulo.split(' ')[0].toLowerCase()}` : `+ ${rotulo}`}</button>
      {url && <button type="button" className="mini" onClick={() => aoMudar(null)}>Tirar</button>}
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) enviar(id, f); }} />
      {erro && <span className="erro">{erro}</span>}
    </div>
  );
}
