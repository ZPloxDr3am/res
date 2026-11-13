'use client';
import { useEffect, useState, useTransition } from 'react';
import QRCode from 'qrcode';
import { motoboyDecidir, motoboyPainel, type SolicitacaoMotoboy } from '@/app/(painel)/lojas/actions';
import { salvando } from '@/components/tempo-real';

const fone = (t: string) => t.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3');

/** Motoboys se cadastram pelo link da loja e o gerente só aprova (D-104). */
export function MotoboyLink({ lojaId, loja }: { lojaId: string; loja: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [lista, setLista] = useState<SolicitacaoMotoboy[]>([]);
  const [qr, setQr] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const carregar = (trocar = false) =>
    iniciar(async () => {
      const r = await motoboyPainel(lojaId, trocar);
      if (!r.ok) return setMsg({ ok: false, t: r.erro });
      setToken(r.token);
      setLista(r.lista);
      if (trocar) setMsg({ ok: true, t: 'Link trocado. O link antigo parou de funcionar.' });
    });
  useEffect(() => carregar(), [lojaId]); // eslint-disable-line react-hooks/exhaustive-deps
  const url = token ? `${typeof window === 'undefined' ? '' : window.location.origin}/seja-motoboy/${token}` : '';
  useEffect(() => {
    if (url) QRCode.toDataURL(url, { margin: 1, width: 220 }).then(setQr).catch(() => setQr(null));
  }, [url]);
  const pendentes = lista.filter((s) => s.status === 'pendente');
  const convite = `Olá! Para fazer entregas para a ${loja}, faça seu cadastro por este link: ${url}`;

  return (
    <section className="cartao grade" aria-label="Cadastro de motoboys">
      <div className="linha" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>🛵 Motoboys se cadastram sozinhos{pendentes.length ? ` · ${pendentes.length} esperando aprovação` : ''}</h2>
          <p className="dica" style={{ margin: '0.2rem 0 0' }}>Mande o link (ou mostre o QR). O motoboy preenche nome, WhatsApp, veículo, Pix e escolhe usuário e senha. Você só aprova.</p>
        </div>
        <button type="button" onClick={() => setAberto((a) => !a)} aria-expanded={aberto}>{aberto ? 'Esconder link' : 'Ver link e QR'}</button>
      </div>
      {aberto && token && (
        <div className="linha" style={{ gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {qr && <img src={qr} alt="QR code do cadastro de motoboy" width={150} height={150} style={{ borderRadius: 8, background: '#fff' }} />}
          <div className="grade" style={{ gap: '0.4rem', flex: '1 1 18rem' }}>
            <code style={{ wordBreak: 'break-all' }}>{url}</code>
            <div className="linha" style={{ gap: '0.35rem', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => navigator.clipboard?.writeText(url).then(() => setMsg({ ok: true, t: 'Link copiado.' }))}>Copiar link</button>
              <a className="botao botao-primario" href={`https://wa.me/?text=${encodeURIComponent(convite)}`} target="_blank" rel="noopener noreferrer">Mandar no WhatsApp</a>
              <button type="button" className="dica" disabled={pendente} onClick={() => carregar(true)} title="Use se o link foi parar com quem não devia">Trocar link</button>
            </div>
          </div>
        </div>
      )}
      {msg && <p className={msg.ok ? 'dica' : 'erro'} role="status" style={{ margin: 0 }}>{msg.t}</p>}
      {pendentes.length > 0 && (
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead><tr><th>Motoboy</th><th>WhatsApp</th><th>Veículo</th><th>Pix</th><th /></tr></thead>
            <tbody>
              {pendentes.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.nome}</strong><br /><span className="dica">usuário {s.usuario}</span></td>
                  <td><a href={`https://wa.me/55${s.telefone.replace(/^55/, '')}`} target="_blank" rel="noopener noreferrer">{fone(s.telefone)}</a></td>
                  <td>{[s.veiculo, s.placa].filter(Boolean).join(' · ') || '—'}</td>
                  <td>{s.pix ?? '—'}</td>
                  <td>
                    <div className="linha" style={{ gap: '0.3rem', justifyContent: 'flex-end' }}>
                      <button type="button" className="mini botao-primario" disabled={pendente} onClick={() => iniciar(async () => {
                        const r = await salvando(motoboyDecidir(lojaId, s.id, true));
                        setMsg(r.ok ? { ok: true, t: `${s.nome} aprovado: já pode entrar no app com o usuário ${s.usuario}.` } : { ok: false, t: r.erro });
                        if (r.ok) carregar();
                      })}>Aprovar</button>
                      <button type="button" className="mini dica" disabled={pendente} onClick={() => iniciar(async () => {
                        const r = await salvando(motoboyDecidir(lojaId, s.id, false));
                        setMsg(r.ok ? { ok: true, t: `Cadastro de ${s.nome} recusado.` } : { ok: false, t: r.erro });
                        if (r.ok) carregar();
                      })}>Recusar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
