'use client';
import { useState, useTransition } from 'react';
import { corpoParaMeta, nomeModelo } from '@res/core';
import {
  whatsappApagarModelo,
  whatsappAutomatico,
  whatsappConectar,
  whatsappDesconectar,
  whatsappEnviarModelo,
  whatsappSalvarModelo,
  whatsappSincronizar,
} from '@/app/(painel)/turbo/actions';

export interface ModeloWa { id: string; nome: string; categoria: 'MARKETING' | 'UTILITY'; corpo: string; variaveis: string[]; status: string; motivo: string | null; atualizado_em: string }
export interface StatusWhatsapp {
  conectado: boolean;
  numero: string | null;
  nome: string | null;
  qualidade: string | null;
  automatico: boolean;
  phone_number_id: string | null;
  waba_id: string | null;
  modelos: ModeloWa[];
  falhas_24h: number;
}

const ROTULO_STATUS: Record<string, string> = { rascunho: 'Rascunho', pendente: '⏳ Em análise na Meta', aprovado: '✅ Aprovado', rejeitado: '❌ Recusado', pausado: '⏸ Pausado pela Meta', desativado: 'Desativado' };
const QUALIDADE: Record<string, string> = { GREEN: '🟢 Alta', YELLOW: '🟡 Média', RED: '🔴 Baixa', UNKNOWN: '—' };

/** Aba WhatsApp oficial (D-097): conectar o número da Meta, modelos para aprovação e envio automático. */
export function AbaWhatsapp({ wa }: { wa: StatusWhatsapp | null }) {
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const rodar = (f: () => Promise<{ ok: boolean; erro?: string }>, ok: string) =>
    iniciar(async () => {
      const r = await f();
      setMsg(r.ok ? { ok: true, t: ok } : { ok: false, t: r.erro ?? 'Não deu certo.' });
    });
  if (!wa) return <p className="cartao dica">Sem acesso.</p>;
  return (
    <div className="grade">
      {msg && <p className={msg.ok ? 'dica' : 'erro'} role="status" style={{ margin: 0 }}>{msg.t}</p>}
      {wa.conectado ? (
        <section className="cartao grade">
          <div className="linha" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <span className="plano-selo">Conectado</span>
              <h2 style={{ margin: '0.3rem 0 0' }}>{wa.nome ?? 'WhatsApp oficial'} · {wa.numero ?? wa.phone_number_id}</h2>
              <span className="dica">Qualidade do número: {QUALIDADE[wa.qualidade ?? 'UNKNOWN'] ?? wa.qualidade}{wa.falhas_24h ? ` · ${wa.falhas_24h} falha(s) nas últimas 24 h` : ''}</span>
            </div>
            <button type="button" className="mini dica" disabled={pendente} onClick={() => rodar(whatsappDesconectar, 'Desconectado.')}>Desconectar</button>
          </div>
          <label className="check" style={{ alignItems: 'flex-start' }}>
            <input type="checkbox" checked={wa.automatico} disabled={pendente} onChange={(e) => rodar(() => whatsappAutomatico(e.target.checked), e.target.checked ? 'Envio automático ligado.' : 'Envio automático desligado.')} />
            <span><strong>Envio automático</strong><br /><span className="dica">A cada 5 minutos, as mensagens da fila que têm modelo aprovado saem sozinhas. Desligado, só saem no botão "Enviar tudo" da fila.</span></span>
          </label>
        </section>
      ) : (
        <Conectar />
      )}
      {wa.conectado && <Modelos wa={wa} pendente={pendente} rodar={rodar} />}
    </div>
  );
}

function Conectar() {
  const [phone, setPhone] = useState('');
  const [waba, setWaba] = useState('');
  const [token, setToken] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <section className="cartao grade">
      <div>
        <h2 style={{ margin: 0 }}>Conectar o WhatsApp oficial</h2>
        <p className="dica" style={{ margin: 0 }}>
          Com a API oficial da Meta, a fila do Turbo-Vendas sai sozinha. Precisa de um número só para isso (fora do app WhatsApp), conta no Meta Business e cartão na Meta
          (mensagem de marketing ≈ US$ 0,06 cada). O passo a passo está em <code>docs/desenvolvimento/whatsapp-api.md</code>.
        </p>
      </div>
      <ol className="dica" style={{ margin: 0, paddingLeft: '1.2rem' }}>
        <li>No <a href="https://business.facebook.com/" target="_blank" rel="noopener noreferrer">Meta Business</a>, crie o app (tipo Empresa) e adicione o produto <b>WhatsApp</b>.</li>
        <li>Em WhatsApp → Configuração da API, copie o <b>ID do número de telefone</b> e o <b>ID da conta do WhatsApp Business</b>.</li>
        <li>Em Configurações do negócio → Usuários do sistema, crie um usuário <b>Admin</b>, dê acesso ao app e à conta do WhatsApp e gere um <b>token permanente</b> com as permissões <code>whatsapp_business_messaging</code> e <code>whatsapp_business_management</code>.</li>
      </ol>
      <div className="cad-2">
        <label>ID do número de telefone<input value={phone} inputMode="numeric" onChange={(e) => setPhone(e.target.value)} autoComplete="off" /></label>
        <label>ID da conta do WhatsApp Business<input value={waba} inputMode="numeric" onChange={(e) => setWaba(e.target.value)} autoComplete="off" /></label>
      </div>
      <label>Token permanente<input type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" spellCheck={false} />
        <span className="dica">Fica guardado só no servidor do RES; nem a tela mostra de volta.</span></label>
      {erro && <p className="erro" role="alert" style={{ margin: 0 }}>{erro}</p>}
      <div>
        <button type="button" className="botao-primario" disabled={pendente || !phone || !waba || token.length < 20} onClick={() => iniciar(async () => {
          setErro(null);
          const r = await whatsappConectar(phone, waba, token);
          if (!r.ok) setErro(r.erro);
          else setToken('');
        })}>{pendente ? 'Conferindo na Meta…' : 'Conectar'}</button>
      </div>
    </section>
  );
}

function Modelos({ wa, pendente, rodar }: { wa: StatusWhatsapp; pendente: boolean; rodar: (f: () => Promise<{ ok: boolean; erro?: string }>, ok: string) => void }) {
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState<'MARKETING' | 'UTILITY'>('MARKETING');
  const [corpo, setCorpo] = useState('Oi {nome}! Que saudade. Volte para a {loja} com o cupom {cupom}: {link}\n\nPara não receber mais, responda SAIR.');
  const previa = corpoParaMeta(corpo);
  return (
    <>
      <section className="cartao grade">
        <div className="linha" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ margin: 0 }}>Modelos de mensagem</h2>
            <p className="dica" style={{ margin: 0 }}>A Meta só deixa a empresa puxar conversa com modelos aprovados. Depois de aprovado, escolha o modelo em cada automação e campanha.</p>
          </div>
          <button type="button" className="mini" disabled={pendente} onClick={() => rodar(whatsappSincronizar, 'Status atualizado com a Meta.')}>↻ Atualizar status</button>
        </div>
        {wa.modelos.length === 0 ? <p className="dica" style={{ margin: 0 }}>Nenhum modelo ainda.</p> : (
          <table className="mod-matriz">
            <thead><tr><th>Modelo</th><th>Situação</th><th /></tr></thead>
            <tbody>
              {wa.modelos.map((m) => (
                <tr key={m.id}>
                  <td style={{ textAlign: 'left' }}><strong>{m.nome}</strong> <span className="dica">· {m.categoria === 'MARKETING' ? 'marketing' : 'aviso'}</span><br /><span className="dica" style={{ whiteSpace: 'pre-wrap' }}>{m.corpo}</span></td>
                  <td>{ROTULO_STATUS[m.status] ?? m.status}{m.motivo ? <><br /><span className="erro">{m.motivo}</span></> : null}</td>
                  <td>
                    <div className="linha" style={{ gap: '0.3rem', justifyContent: 'flex-end' }}>
                      {(m.status === 'rascunho' || m.status === 'rejeitado') && <button type="button" className="mini botao-primario" disabled={pendente} onClick={() => rodar(() => whatsappEnviarModelo(m.id), 'Enviado para a Meta aprovar.')}>Enviar para aprovação</button>}
                      {m.status !== 'aprovado' && <button type="button" className="mini" disabled={pendente} onClick={() => rodar(() => whatsappApagarModelo(m.id), 'Modelo apagado.')}>Apagar</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="cartao grade">
        <h2 style={{ margin: 0 }}>Novo modelo</h2>
        <div className="cad-2">
          <label>Nome <span className="dica">(minúsculas e _)</span><input value={nome} onChange={(e) => setNome(nomeModelo(e.target.value))} placeholder="volta_sumido" /></label>
          <label>Tipo
            <select value={categoria} onChange={(e) => setCategoria(e.target.value as 'MARKETING' | 'UTILITY')}>
              <option value="MARKETING">Marketing (promoção, volta, cupom)</option>
              <option value="UTILITY">Aviso (pedido, entrega)</option>
            </select>
          </label>
        </div>
        <label>Texto<textarea rows={4} maxLength={1000} value={corpo} onChange={(e) => setCorpo(e.target.value)} />
          <span className="dica">Use {'{nome} {loja} {cupom} {link} {favorito} {avaliacao}'}. Termine com "responda SAIR" nos de marketing: quem responder sai da lista sozinho.</span></label>
        <p className="dica" style={{ margin: 0 }}>Como vai para a Meta: <code style={{ whiteSpace: 'pre-wrap' }}>{previa.texto}</code></p>
        <div>
          <button type="button" className="botao" disabled={pendente || nome.length < 3 || corpo.trim().length < 5} onClick={() => rodar(async () => {
            const r = await whatsappSalvarModelo(nome, categoria, corpo);
            if (r.ok) setNome('');
            return r;
          }, 'Modelo salvo. Agora envie para aprovação.')}>Salvar modelo</button>
        </div>
      </section>
    </>
  );
}
