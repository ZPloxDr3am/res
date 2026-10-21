'use client';
import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  LAYOUT_PADRAO,
  MODELOS_IMPRESSORA,
  modeloPorId,
  nomeModelo,
  PAGINAS_CODIGO,
  type CupomDados,
  type LayoutCupom,
} from '@res/core';
import {
  excluirImpressora,
  imprimirTeste,
  reimprimir,
  salvarConfigImpressao,
  salvarImpressora,
  salvarLayout,
  type ConfigImpressao,
  type DadosImpressora,
} from '@/app/(painel)/impressoras/actions';
import { salvando } from '@/components/tempo-real';
import { useImprimir } from '@/components/impressao/usar-impressao';
import { agenteOnline, cupomHtml, CSS_CUPOM, linhasDoCupom } from '@/lib/impressao';

export type Aba = 'impressoras' | 'regras' | 'layout' | 'historico';
type Impressora = DadosImpressora & { id: string; ultimo_sinal: string | null; ultimo_erro: string | null };
export type DadosPainelImpressoras = {
  podeEditar: boolean;
  configurado: boolean;
  impressoras: Impressora[];
  config: ConfigImpressao;
  layouts: { marca_id: string; tipo: 'pedido' | 'cozinha'; opcoes: LayoutCupom }[];
  marcas: { id: string; nome: string }[];
  setores: { id: string; nome: string }[];
  produtos: { id: string; nome: string; setor_id: string | null }[];
  historico: {
    id: string;
    tipo: string;
    motivo: string;
    titulo: string;
    status: string;
    erro: string | null;
    impresso_por: string | null;
    criado_em: string;
    impresso_em: string | null;
    impressora_id: string | null;
    tentativas: number;
  }[];
};
type Msg = { ok: boolean; texto: string } | null;

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'impressoras', rotulo: 'Impressoras' },
  { id: 'regras', rotulo: 'Regras da cozinha' },
  { id: 'layout', rotulo: 'Layout do cupom' },
  { id: 'historico', rotulo: 'Fila e histórico' },
];

export function PainelImpressoras({ aba, dados }: { aba: Aba; dados: DadosPainelImpressoras }) {
  return (
    <div className="grade">
      <div className="grade" style={{ gap: '0.15rem' }}>
        <h1 style={{ margin: 0 }}>Impressoras</h1>
        <span className="dica">Cadastre as impressoras da loja, diga o que cada uma imprime e ajuste o cupom de cada marca.</span>
      </div>
      <nav className="abas" aria-label="Seções">
        {ABAS.map((a) => (
          <Link key={a.id} href={`/impressoras?aba=${a.id}`} aria-current={aba === a.id ? 'page' : undefined} className={aba === a.id ? 'aba-ativa' : undefined}>
            {a.rotulo}
          </Link>
        ))}
      </nav>
      {!dados.podeEditar && aba !== 'historico' && <p className="aviso">Você pode ver, mas só quem tem a permissão "Impressoras" muda a configuração.</p>}
      <Agente impressoras={dados.impressoras} />
      {aba === 'impressoras' && <AbaImpressoras dados={dados} />}
      {aba === 'regras' && <AbaRegras dados={dados} />}
      {aba === 'layout' && <AbaLayout dados={dados} />}
      {aba === 'historico' && <AbaHistorico dados={dados} />}
    </div>
  );
}

/** Situação do agente do Windows (próxima entrega). Por enquanto, tudo sai pelo navegador. */
function Agente({ impressoras }: { impressoras: Impressora[] }) {
  const online = impressoras.some((i) => agenteOnline(i.ultimo_sinal));
  return (
    <section className="cartao linha" style={{ alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
      <div className="grade" style={{ gap: '0.15rem', flex: '1 1 20rem' }}>
        <strong>RES Impressão · agente do Windows</strong>
        <span className="dica">
          {online
            ? 'Conectado: os pedidos aceitos saem sozinhos nas impressoras.'
            : 'Ainda não instalado. Enquanto isso, use os botões 🖨 do pedido ou "Imprimir aqui" na fila: o cupom abre na janela de impressão do navegador, já no tamanho do papel.'}
        </span>
      </div>
      <span className={`pub-status ${online ? 'aberto' : 'fechado'}`}>{online ? 'Conectado' : 'Sem agente'}</span>
    </section>
  );
}

// ---------------------------------------------------------------- Impressoras
const novoForm = (): DadosImpressora => {
  const m = modeloPorId('epson-tm-t20x')!;
  return { nome: '', modelo: m.id, protocolo: m.protocolo, conexao: 'usb', endereco: '', colunas: m.colunas, pagina_codigo: m.pagina, espaco_linhas: m.espaco ?? 0, pular_linhas: m.pular, corte: true, gaveta: false, ativo: true };
};

function AbaImpressoras({ dados }: { dados: DadosPainelImpressoras }) {
  const [editando, setEditando] = useState<string | 'nova' | null>(dados.impressoras.length === 0 && dados.podeEditar ? 'nova' : null);
  const teste = useImprimir();
  const [m, setM] = useState<Msg>(null);
  const [pendente, iniciar] = useTransition();

  return (
    <section className="cartao grade" style={{ gap: '0.6rem' }}>
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1rem' }}>Impressoras cadastradas</h2>
        {dados.podeEditar && editando !== 'nova' && <button type="button" className="mini botao-primario" onClick={() => setEditando('nova')}>+ Adicionar impressora</button>}
      </div>
      {editando === 'nova' && <FormImpressora inicial={novoForm()} id={null} fechar={() => setEditando(null)} />}
      {dados.impressoras.length === 0 && editando !== 'nova' && <p className="dica" style={{ margin: 0 }}>Nenhuma impressora cadastrada.</p>}
      {dados.impressoras.length > 0 && (
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead><tr><th>Situação</th><th>Nome</th><th>Modelo</th><th>Ligação</th><th>Papel</th><th></th></tr></thead>
            <tbody>
              {dados.impressoras.map((i) => (
                <tr key={i.id} style={{ opacity: i.ativo ? 1 : 0.55 }}>
                  <td>
                    <span className={`selo ${agenteOnline(i.ultimo_sinal) ? 'selo-presencial' : ''}`}>{agenteOnline(i.ultimo_sinal) ? '● Online' : '○ Sem agente'}</span>
                    {i.ultimo_erro && <div className="erro" style={{ fontSize: '0.8rem' }}>{i.ultimo_erro}</div>}
                  </td>
                  <td><strong>{i.nome}</strong></td>
                  <td>{nomeModelo(i.modelo)} <span className="dica">({i.protocolo}, pág. {i.pagina_codigo})</span></td>
                  <td>{i.conexao === 'usb' ? 'USB' : 'Rede'}{i.endereco ? <span className="dica"> · {i.endereco}</span> : ''}</td>
                  <td>{i.colunas <= 32 ? '58 mm' : '80 mm'} <span className="dica">· {i.colunas} col.</span></td>
                  <td className="num" style={{ whiteSpace: 'nowrap' }}>
                    <button type="button" className="mini" disabled={teste.pendente} onClick={() => teste.imprimir(() => imprimirTeste(i.id))}>🖨 Testar</button>{' '}
                    {dados.podeEditar && <button type="button" className="mini" onClick={() => setEditando(i.id)}>Editar</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {teste.aviso && <p className={teste.aviso.ok ? 'dica' : 'erro'} style={{ margin: 0 }}>{teste.aviso.texto}</p>}
      {dados.impressoras.filter((i) => i.id === editando).map((i) => (
        <div key={i.id} className="grade" style={{ gap: '0.4rem' }}>
          <FormImpressora inicial={i} id={i.id} fechar={() => setEditando(null)} />
          <button
            type="button"
            className="mini erro"
            style={{ justifySelf: 'start' }}
            disabled={pendente}
            onClick={() =>
              iniciar(async () => {
                if (!window.confirm(`Excluir a impressora "${i.nome}"? Os cupons que esperavam por ela passam a sair pelo navegador.`)) return;
                const r = await salvando(excluirImpressora(i.id));
                setM(r.ok ? { ok: true, texto: 'Impressora excluída.' } : { ok: false, texto: r.erro });
                if (r.ok) setEditando(null);
              })
            }
          >
            Excluir impressora
          </button>
        </div>
      ))}
      {m && <p className={m.ok ? 'dica' : 'erro'} style={{ margin: 0 }}>{m.texto}</p>}
      <details className="dica">
        <summary>Modelos com configuração pronta ({MODELOS_IMPRESSORA.filter((x) => x.homologada).length} homologados pelo Projeto ACBr)</summary>
        <p style={{ margin: '0.4rem 0' }}>Escolha o seu modelo e os parâmetros vêm preenchidos. Se a acentuação sair errada, troque a página de código nesta ordem: 860 → 850 → 1252 → UTF8.</p>
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead><tr><th>Modelo</th><th>Comando</th><th>Página</th><th className="num">Colunas</th><th className="num">Avanço</th></tr></thead>
            <tbody>
              {MODELOS_IMPRESSORA.map((x) => (
                <tr key={x.id}><td>{x.marca} {x.nome}{!x.homologada && ' (genérica)'}</td><td>{x.protocolo}</td><td>{x.pagina}</td><td className="num">{x.colunas}</td><td className="num">{x.pular}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function FormImpressora({ inicial, id, fechar }: { inicial: DadosImpressora; id: string | null; fechar: () => void }) {
  const [d, setD] = useState<DadosImpressora>({ ...inicial, endereco: inicial.endereco ?? '' });
  const [avancado, setAvancado] = useState(false);
  const [m, setM] = useState<Msg>(null);
  const [pendente, iniciar] = useTransition();
  const marcas = [...new Set(MODELOS_IMPRESSORA.map((x) => x.marca))];

  const escolherModelo = (modeloId: string) => {
    const x = modeloPorId(modeloId);
    if (!x) return;
    setD({ ...d, modelo: x.id, protocolo: x.protocolo, colunas: x.colunas, pagina_codigo: x.pagina, espaco_linhas: x.espaco ?? 0, pular_linhas: x.pular });
  };
  const modelo = modeloPorId(d.modelo);

  return (
    <form
      className="grade caixa-cadastro"
      style={{ gap: '0.5rem' }}
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await salvando(salvarImpressora(id, d));
          setM(r.ok ? { ok: true, texto: 'Impressora salva.' } : { ok: false, texto: r.erro });
          if (r.ok) fechar();
        });
      }}
    >
      <h3>{id ? `Editar ${inicial.nome}` : 'Nova impressora'}</h3>
      <div className="linha">
        <label style={{ flex: '1 1 10rem' }}>Nome<input type="text" required maxLength={60} value={d.nome} placeholder="Ex.: Cozinha, Bar, Caixa" onChange={(e) => setD({ ...d, nome: e.target.value })} /></label>
        <label style={{ flex: '2 1 14rem' }}>
          Modelo
          <select value={d.modelo} onChange={(e) => escolherModelo(e.target.value)}>
            {marcas.map((mc) => (
              <optgroup key={mc} label={mc}>
                {MODELOS_IMPRESSORA.filter((x) => x.marca === mc).map((x) => <option key={x.id} value={x.id}>{x.marca} {x.nome}</option>)}
              </optgroup>
            ))}
          </select>
          {modelo && <span className="dica">{modelo.papel} mm · {modelo.colunas} colunas · {modelo.protocolo} · página {modelo.pagina}{modelo.nota ? ` · ${modelo.nota}` : ''}{!modelo.homologada ? ' · não homologada: teste a impressão' : ''}</span>}
        </label>
      </div>
      <div className="linha">
        <fieldset className="linha" style={{ gap: '0.6rem', flex: '1 1 12rem' }}>
          <legend>Ligação</legend>
          <label className="check"><input type="radio" checked={d.conexao === 'usb'} onChange={() => setD({ ...d, conexao: 'usb' })} /> USB no computador</label>
          <label className="check"><input type="radio" checked={d.conexao === 'rede'} onChange={() => setD({ ...d, conexao: 'rede' })} /> Rede (cabo ou Wi-Fi)</label>
        </fieldset>
        <label style={{ flex: '2 1 14rem' }}>
          {d.conexao === 'usb' ? 'Nome da impressora no Windows' : 'IP e porta'}
          <input
            type="text"
            maxLength={120}
            value={d.endereco}
            placeholder={d.conexao === 'usb' ? 'Ex.: EPSON TM-T20X Receipt' : '192.168.0.50:9100'}
            onChange={(e) => setD({ ...d, endereco: e.target.value })}
          />
          <span className="dica">{d.conexao === 'usb' ? 'Como aparece em Configurações → Impressoras do Windows. O agente vai listar para você escolher.' : 'Porta padrão das térmicas de rede: 9100.'}</span>
        </label>
      </div>
      <div className="linha">
        <label className="check"><input type="checkbox" checked={d.corte} onChange={(e) => setD({ ...d, corte: e.target.checked })} /> Cortar o papel no fim</label>
        <label className="check"><input type="checkbox" checked={d.gaveta} onChange={(e) => setD({ ...d, gaveta: e.target.checked })} /> Abrir a gaveta de dinheiro</label>
        <label className="check"><input type="checkbox" checked={d.ativo} onChange={(e) => setD({ ...d, ativo: e.target.checked })} /> Ativa</label>
      </div>
      <button type="button" className="mini" style={{ justifySelf: 'start' }} onClick={() => setAvancado(!avancado)}>{avancado ? '▾' : '▸'} Ajustes avançados</button>
      {avancado && (
        <div className="linha">
          <label style={{ width: '9rem' }}>Comando
            <select value={d.protocolo} onChange={(e) => setD({ ...d, protocolo: e.target.value })}>
              {['EscPosEpson', 'EscBematech', 'EscDaruma', 'EscGPrinter', 'CustomPos'].map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <label style={{ width: '8rem' }}>Página de código
            <select value={d.pagina_codigo} onChange={(e) => setD({ ...d, pagina_codigo: e.target.value })}>
              {PAGINAS_CODIGO.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <label style={{ width: '6rem' }}>Colunas<input type="number" min={24} max={64} value={d.colunas} onChange={(e) => setD({ ...d, colunas: Number(e.target.value) })} /></label>
          <label style={{ width: '7rem' }}>Espaço entre linhas<input type="number" min={0} max={255} value={d.espaco_linhas} onChange={(e) => setD({ ...d, espaco_linhas: Number(e.target.value) })} /></label>
          <label style={{ width: '7rem' }}>Linhas antes do corte<input type="number" min={0} max={20} value={d.pular_linhas} onChange={(e) => setD({ ...d, pular_linhas: Number(e.target.value) })} /></label>
        </div>
      )}
      <div className="linha" style={{ alignItems: 'center' }}>
        <button className="botao-primario" disabled={pendente}>{pendente ? 'Salvando…' : 'Salvar impressora'}</button>
        <button type="button" onClick={fechar}>Cancelar</button>
        {m && <span className={m.ok ? 'dica' : 'erro'}>{m.texto}</span>}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- Regras
const CANAIS: { id: keyof ConfigImpressao['canais']; rotulo: string; dica: string }[] = [
  { id: 'painel', rotulo: 'Pedidos lançados no painel', dica: 'balcão, telefone, WhatsApp' },
  { id: 'cardapio_digital', rotulo: 'Cardápio digital', dica: 'pedidos do link/QR' },
  { id: 'marketplace', rotulo: 'Marketplace (iFood)', dica: 'quando a integração entrar' },
];

function SelImpressora({ valor, onChange, impressoras, vazio = 'Nenhuma (imprimir pelo navegador)', disabled }: { valor: string; onChange: (v: string) => void; impressoras: Impressora[]; vazio?: string; disabled?: boolean }) {
  return (
    <select value={valor} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      <option value="">{vazio}</option>
      {impressoras.filter((i) => i.ativo || i.id === valor).map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
    </select>
  );
}

function AbaRegras({ dados }: { dados: DadosPainelImpressoras }) {
  const [c, setC] = useState<ConfigImpressao>(dados.config);
  const [busca, setBusca] = useState('');
  const [m, setM] = useState<Msg>(null);
  const [pendente, iniciar] = useTransition();
  const ro = !dados.podeEditar;
  const imps = dados.impressoras;
  const destino = (tipo: 'setor' | 'produto', alvo: string) => c.destinos.find((d) => d.tipo === tipo && d.alvo_id === alvo)?.impressora_id ?? '';
  const definir = (tipo: 'setor' | 'produto', alvo: string, imp: string) =>
    setC({ ...c, destinos: [...c.destinos.filter((d) => !(d.tipo === tipo && d.alvo_id === alvo)), ...(imp ? [{ tipo, alvo_id: alvo, impressora_id: imp }] : [])] });
  const produtosFiltrados = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return dados.produtos.filter((p) => !b || p.nome.toLowerCase().includes(b));
  }, [busca, dados.produtos]);
  const nomeSetor = (id: string | null) => dados.setores.find((s) => s.id === id)?.nome ?? 'Sem categoria';

  if (imps.length === 0) return <p className="cartao dica">Cadastre pelo menos uma impressora na aba <Link href="/impressoras?aba=impressoras">Impressoras</Link> para montar as regras.</p>;

  return (
    <form
      className="grade"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await salvando(salvarConfigImpressao(c));
          setM(r.ok ? { ok: true, texto: 'Regras salvas. Valem para os próximos pedidos aceitos.' } : { ok: false, texto: r.erro });
        });
      }}
    >
      {!dados.configurado && <p className="aviso">Ainda não há regras salvas: nada sai sozinho ao aceitar. Configure e clique em Salvar.</p>}

      <section className="cartao grade" style={{ gap: '0.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1rem' }}>Quando imprimir a via da cozinha</h2>
        {CANAIS.map((k) => (
          <div key={k.id} className="linha" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{k.rotulo} <span className="dica">({k.dica})</span></span>
            <div className="abas-metrica" role="group" aria-label={k.rotulo}>
              {(['automatico', 'manual'] as const).map((v) => (
                <button key={v} type="button" disabled={ro} aria-pressed={c.canais[k.id] === v} onClick={() => setC({ ...c, canais: { ...c.canais, [k.id]: v } })}>
                  {v === 'automatico' ? 'Ao aceitar' : 'Só no botão'}
                </button>
              ))}
            </div>
          </div>
        ))}
        <span className="dica">"Ao aceitar" imprime quando o pedido entra em preparo (inclusive pelo aceite automático). Pedido agendado imprime quando for aceito.</span>
      </section>

      <section className="cartao grade" style={{ gap: '0.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1rem' }}>Onde sai a via da cozinha</h2>
        <div className="linha" style={{ gap: '0.5rem' }}>
          {([
            ['unica', 'Uma impressora só', 'Todos os itens na mesma impressora'],
            ['setor', 'Por categoria', 'Cada categoria do cardápio na sua impressora'],
            ['produto', 'Por produto', 'Produtos escolhidos em impressoras específicas'],
          ] as const).map(([v, t, dica]) => (
            <label key={v} className={`opcao-cartao ${c.modo_destino === v ? 'ativa' : ''}`}>
              <input type="radio" name="modo" checked={c.modo_destino === v} disabled={ro} onChange={() => setC({ ...c, modo_destino: v })} />
              <strong>{t}</strong>
              <span className="dica">{dica}</span>
            </label>
          ))}
        </div>
        <label style={{ maxWidth: '24rem' }}>
          Impressora padrão {c.modo_destino !== 'unica' && <span className="dica">(o que não tiver destino próprio)</span>}
          <SelImpressora valor={c.impressora_padrao} onChange={(v) => setC({ ...c, impressora_padrao: v })} impressoras={imps} disabled={ro} />
        </label>

        {(c.modo_destino === 'setor' || c.modo_destino === 'produto') && (
          <div className="grade" style={{ gap: '0.3rem' }}>
            <h3>Categorias</h3>
            {dados.setores.map((s) => (
              <div key={s.id} className="linha" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{s.nome}</span>
                <span style={{ width: '16rem' }}><SelImpressora valor={destino('setor', s.id)} onChange={(v) => definir('setor', s.id, v)} impressoras={imps} vazio="Impressora padrão" disabled={ro} /></span>
              </div>
            ))}
          </div>
        )}
        {c.modo_destino === 'produto' && (
          <div className="grade" style={{ gap: '0.3rem' }}>
            <div className="linha" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <h3>Produtos <span className="dica">(vence a categoria)</span></h3>
              <input type="search" placeholder="Buscar produto" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ maxWidth: '14rem' }} />
            </div>
            <div className="lista-rolagem">
              {produtosFiltrados.map((p) => (
                <div key={p.id} className="linha" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{p.nome} <span className="dica">· {nomeSetor(p.setor_id)}</span></span>
                  <span style={{ width: '16rem' }}><SelImpressora valor={destino('produto', p.id)} onChange={(v) => definir('produto', p.id, v)} impressoras={imps} vazio="Como a categoria" disabled={ro} /></span>
                </div>
              ))}
            </div>
          </div>
        )}
        <fieldset className="linha" style={{ gap: '0.6rem' }}>
          <legend>Como juntar</legend>
          <label className="check"><input type="radio" checked={c.agrupamento === 'completo'} disabled={ro} onChange={() => setC({ ...c, agrupamento: 'completo' })} /> Um cupom por impressora</label>
          <label className="check"><input type="radio" checked={c.agrupamento === 'por_setor'} disabled={ro} onChange={() => setC({ ...c, agrupamento: 'por_setor' })} /> Um cupom por categoria</label>
        </fieldset>
      </section>

      <section className="cartao grade" style={{ gap: '0.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1rem' }}>Via do pedido (caixa e entregador)</h2>
        <span className="dica">Cupom completo com endereço, valores, pagamento e troco a levar.</span>
        <div className="linha" style={{ alignItems: 'end' }}>
          <label style={{ flex: '1 1 16rem' }}>Impressora<SelImpressora valor={c.via_pedido_impressora} onChange={(v) => setC({ ...c, via_pedido_impressora: v })} impressoras={imps} vazio="A impressora padrão" disabled={ro} /></label>
          <label className="check"><input type="checkbox" checked={c.via_pedido_auto} disabled={ro} onChange={(e) => setC({ ...c, via_pedido_auto: e.target.checked })} /> Imprimir ao aceitar</label>
        </div>
      </section>

      <section className="cartao grade" style={{ gap: '0.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1rem' }}>Marketplace (iFood)</h2>
        <span className="dica">Pedidos do iFood às vezes trazem itens ainda não ligados a um produto do cardápio. Escolha para onde eles vão.</span>
        <label style={{ maxWidth: '24rem' }}>Impressora do marketplace<SelImpressora valor={c.marketplace_impressora} onChange={(v) => setC({ ...c, marketplace_impressora: v })} impressoras={imps} vazio="Seguir as regras acima" disabled={ro} /></label>
        {c.marketplace_impressora && (
          <fieldset className="grade" style={{ gap: '0.3rem' }}>
            <label className="check"><input type="radio" checked={c.marketplace_modo === 'sem_vinculo'} disabled={ro} onChange={() => setC({ ...c, marketplace_modo: 'sem_vinculo' })} /> Só os itens sem vínculo (os outros seguem as regras)</label>
            <label className="check"><input type="radio" checked={c.marketplace_modo === 'tudo'} disabled={ro} onChange={() => setC({ ...c, marketplace_modo: 'tudo' })} /> O pedido inteiro nesta impressora</label>
          </fieldset>
        )}
      </section>

      {!ro && (
        <div className="linha" style={{ alignItems: 'center' }}>
          <button className="botao-primario" disabled={pendente}>{pendente ? 'Salvando…' : 'Salvar regras'}</button>
          {m && <span className={m.ok ? 'dica' : 'erro'} role="status">{m.texto}</span>}
        </div>
      )}
    </form>
  );
}

// ---------------------------------------------------------------- Layout
const EXEMPLO: CupomDados = {
  loja: 'Loja', marca: 'Sua marca', numero: 128, tipo_pedido: 'entrega', origem: 'cardapio_digital',
  criado_em: new Date().toISOString(), agendado_para: null, fuso: 'America/Sao_Paulo', setor: 'Pizzas',
  cliente: { nome: 'Maria Souza', telefone: '47999990000' },
  endereco: { logradouro: 'Rua 300', numero: '120', complemento: 'ap 402', bairro: 'Centro', referencia: 'perto da praça' },
  observacao: 'Tocar o interfone', pagamento: 'dinheiro', troco_para: 15000,
  subtotal: 11880, taxa_entrega: 700, desconto: 1000, total: 11580,
  itens: [
    { quantidade: 1, nome: 'Pizza Grande', total: 8990, observacao: 'bem assada', opcoes: [
      { grupo: 'Sabores', nome: 'Calabresa', quantidade: 1, fracao: 0.5 },
      { grupo: 'Sabores', nome: 'Quatro queijos', quantidade: 1, fracao: 0.5 },
      { grupo: 'Borda', nome: 'Catupiry', quantidade: 1, fracao: null },
    ] },
    { quantidade: 2, nome: 'Refrigerante 2L', total: 2890, observacao: null, opcoes: [] },
  ],
};

function AbaLayout({ dados }: { dados: DadosPainelImpressoras }) {
  const [marca, setMarca] = useState(dados.marcas[0]?.id ?? '');
  const [tipo, setTipo] = useState<'cozinha' | 'pedido'>('cozinha');
  const salvo = dados.layouts.find((l) => l.marca_id === marca && l.tipo === tipo)?.opcoes ?? {};
  return <EditorLayout key={marca + tipo} dados={dados} marca={marca} setMarca={setMarca} tipo={tipo} setTipo={setTipo} salvo={salvo} />;
}

function EditorLayout({ dados, marca, setMarca, tipo, setTipo, salvo }: { dados: DadosPainelImpressoras; marca: string; setMarca: (v: string) => void; tipo: 'cozinha' | 'pedido'; setTipo: (v: 'cozinha' | 'pedido') => void; salvo: LayoutCupom }) {
  const [l, setL] = useState<Required<LayoutCupom>>({ ...LAYOUT_PADRAO[tipo], ...salvo });
  const [colunas, setColunas] = useState(dados.impressoras[0]?.colunas ?? 48);
  const [m, setM] = useState<Msg>(null);
  const [pendente, iniciar] = useTransition();
  const ro = !dados.podeEditar;
  const nomeMarca = dados.marcas.find((x) => x.id === marca)?.nome ?? 'Marca';
  const html = cupomHtml(linhasDoCupom({ tipo, conteudo: { ...EXEMPLO, marca: nomeMarca }, layout: l, colunas, motivo: 'manual' }), colunas);
  const chave = (k: 'negrito_itens' | 'destacar_obs' | 'mostrar_grupos' | 'mostrar_cliente' | 'mostrar_endereco' | 'mostrar_precos', rotulo: string) => (
    <label className="check"><input type="checkbox" disabled={ro} checked={!!l[k]} onChange={(e) => setL({ ...l, [k]: e.target.checked })} /> {rotulo}</label>
  );

  return (
    <div className="grade grade-2" style={{ alignItems: 'start' }}>
      <section className="cartao grade" style={{ gap: '0.6rem' }}>
        <div className="linha">
          {dados.marcas.length > 1 && (
            <label style={{ flex: '1 1 10rem' }}>Marca<select value={marca} onChange={(e) => setMarca(e.target.value)}>{dados.marcas.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</select></label>
          )}
          <label style={{ flex: '1 1 10rem' }}>Cupom
            <select value={tipo} onChange={(e) => setTipo(e.target.value as 'cozinha' | 'pedido')}>
              <option value="cozinha">Via da cozinha</option>
              <option value="pedido">Via do pedido (caixa/entrega)</option>
            </select>
          </label>
        </div>
        <fieldset className="grade" style={{ gap: '0.3rem' }}>
          <legend>Itens</legend>
          <label className="check"><input type="checkbox" disabled={ro} checked={l.fonte === 'grande'} onChange={(e) => setL({ ...l, fonte: e.target.checked ? 'grande' : 'normal' })} /> Letra grande nos itens</label>
          {chave('negrito_itens', 'Itens em negrito')}
          {chave('destacar_obs', 'Destacar observações (MAIÚSCULAS e negrito)')}
          {chave('mostrar_grupos', 'Agrupar opções pelo nome do grupo (ex.: "Sabores: ½ Calabresa, ½ Frango")')}
          {chave('mostrar_precos', 'Mostrar preços')}
        </fieldset>
        <fieldset className="grade" style={{ gap: '0.3rem' }}>
          <legend>Cliente</legend>
          {chave('mostrar_cliente', 'Nome do cliente')}
          {chave('mostrar_endereco', 'Endereço de entrega')}
        </fieldset>
        <label>Texto no topo<input type="text" maxLength={120} disabled={ro} value={l.cabecalho} onChange={(e) => setL({ ...l, cabecalho: e.target.value })} placeholder="Ex.: CNPJ, telefone, Instagram" /></label>
        <label>Texto no fim<input type="text" maxLength={160} disabled={ro} value={l.rodape} onChange={(e) => setL({ ...l, rodape: e.target.value })} placeholder="Ex.: Obrigado pela preferência!" /></label>
        {!ro && (
          <div className="linha" style={{ alignItems: 'center' }}>
            <button
              type="button"
              className="botao-primario"
              disabled={pendente}
              onClick={() =>
                iniciar(async () => {
                  const r = await salvando(salvarLayout(marca, tipo, l));
                  setM(r.ok ? { ok: true, texto: 'Layout salvo. Vale para os próximos cupons.' } : { ok: false, texto: r.erro });
                })
              }
            >
              {pendente ? 'Salvando…' : 'Salvar layout'}
            </button>
            <button type="button" onClick={() => setL({ ...LAYOUT_PADRAO[tipo] })}>Voltar ao padrão</button>
            {m && <span className={m.ok ? 'dica' : 'erro'}>{m.texto}</span>}
          </div>
        )}
      </section>
      <section className="grade" style={{ gap: '0.4rem', justifyItems: 'center' }}>
        <div className="linha" style={{ alignItems: 'center' }}>
          <span className="dica">Prévia</span>
          <select value={colunas} onChange={(e) => setColunas(Number(e.target.value))} aria-label="Largura do papel">
            <option value={48}>80 mm (48 colunas)</option>
            <option value={42}>80 mm (42 colunas)</option>
            <option value={32}>58 mm (32 colunas)</option>
          </select>
        </div>
        <style>{CSS_CUPOM}</style>
        <div className="papel-cupom"><div className="cupom" style={{ width: `${colunas}ch` }} dangerouslySetInnerHTML={{ __html: html }} /></div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- Histórico
const STATUS: Record<string, string> = { pendente: 'Na fila', imprimindo: 'Imprimindo', impresso: 'Impresso', erro: 'Erro', cancelado: 'Cancelado' };
const MOTIVO: Record<string, string> = { aceite: 'ao aceitar', manual: 'botão', reimpressao: '2ª via', teste: 'teste' };

function AbaHistorico({ dados }: { dados: DadosPainelImpressoras }) {
  const acao = useImprimir();
  const nomeImp = (id: string | null) => dados.impressoras.find((i) => i.id === id)?.nome ?? 'Navegador';
  const pendentes = dados.historico.filter((h) => h.status === 'pendente' || h.status === 'erro').length;
  return (
    <section className="cartao grade" style={{ gap: '0.5rem' }}>
      <div className="linha" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: '1rem' }}>Últimos cupons</h2>
        {pendentes > 0 && <span className="dica">{pendentes} na fila — use "Imprimir aqui" no quadro de Pedidos ou reimprima abaixo.</span>}
      </div>
      {acao.aviso && <p className={acao.aviso.ok ? 'dica' : 'erro'} style={{ margin: 0 }}>{acao.aviso.texto}</p>}
      {dados.historico.length === 0 ? (
        <p className="dica" style={{ margin: 0 }}>Nenhum cupom ainda.</p>
      ) : (
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead><tr><th>Quando</th><th>Cupom</th><th>Impressora</th><th>Situação</th><th></th></tr></thead>
            <tbody>
              {dados.historico.map((h) => (
                <tr key={h.id}>
                  <td>{new Date(h.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{h.titulo} <span className="dica">· {MOTIVO[h.motivo] ?? h.motivo}</span></td>
                  <td>{nomeImp(h.impressora_id)}</td>
                  <td>
                    <span className={`var ${h.status === 'impresso' ? 'boa' : h.status === 'erro' ? 'ruim' : 'neutra'}`}>{STATUS[h.status] ?? h.status}</span>
                    {h.impresso_por && <span className="dica"> · {h.impresso_por === 'agente' ? 'agente' : 'navegador'}</span>}
                    {h.erro && <div className="erro" style={{ fontSize: '0.8rem' }}>{h.erro}</div>}
                  </td>
                  <td className="num"><button type="button" className="mini" disabled={acao.pendente} onClick={() => acao.imprimir(() => reimprimir(h.id))}>Reimprimir</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
