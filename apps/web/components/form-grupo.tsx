'use client';
import { useState, useTransition } from 'react';
import {
  alterarMaximo,
  alterarMinimo,
  calcularItem,
  descreverSelecao,
  formatarReais,
  marcarObrigatorio,
  paraCentavos,
  validarGrupo,
  ErroEscolha,
  type FormacaoPreco,
  type Grupo,
} from '@res/core';
import { salvarGrupo, type DadosGrupo } from '@/app/(painel)/cardapio/actions';
import { salvando } from '@/components/tempo-real';

type OpcaoForm = { id?: string; nome: string; preco: string };

export interface GrupoInicial {
  id: string;
  nome: string;
  formacao: FormacaoPreco;
  obrigatorio: boolean;
  minQtd: number;
  maxQtd: number;
  pizza: boolean;
  permiteRepetir: boolean;
  opcoes: { id: string; nome: string; preco: number | null }[];
}

const FORMACOES: { valor: FormacaoPreco; rotulo: string; dica: string }[] = [
  { valor: 'soma', rotulo: 'Somar', dica: 'Cada opção escolhida soma seu preço.' },
  { valor: 'maior', rotulo: 'Maior preço', dica: 'Cobra o preço da opção mais cara.' },
  { valor: 'proporcional', rotulo: 'Proporcional', dica: 'Média dos preços pela fração de cada opção (meio a meio).' },
  { valor: 'brinde', rotulo: 'Brinde', dica: 'As opções não alteram o preço.' },
];

const lerPreco = (t: string): number | null => {
  const s = t.trim().replace(/\s|R\$/g, '');
  if (!s) return null;
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN;
};
const mostrarPreco = (p: number | null) => (p == null ? '' : p.toFixed(2).replace('.', ','));

const vazio = { nome: '', obrigatorio: false, minQtd: 0, maxQtd: 1, formacao: 'soma' as FormacaoPreco, pizza: false, permiteRepetir: false };

/** Grupo de opções (criar ou editar) com as mesmas regras do banco e um simulador de preço ao vivo. */
export function FormGrupo({
  produtoId,
  precoProduto = 0,
  inicial,
  usos = 1,
  aoTerminar,
  aoCancelar,
}: {
  /** Ao criar: liga o grupo a este produto. Sem ele, vai só para a biblioteca. */
  produtoId?: string;
  /** Preço do produto, só para o simulador (centavos). */
  precoProduto?: number;
  inicial?: GrupoInicial;
  usos?: number;
  aoTerminar?: (id?: string) => void;
  aoCancelar?: () => void;
}) {
  const [g, setG] = useState(() => (inicial ? { ...inicial } : { ...vazio }));
  const [opcoes, setOpcoes] = useState<OpcaoForm[]>(() =>
    inicial ? inicial.opcoes.map((o) => ({ id: o.id, nome: o.nome, preco: mostrarPreco(o.preco) })) : [{ nome: '', preco: '' }],
  );
  const [simulacao, setSimulacao] = useState<Record<number, number>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const erros = validarGrupo(g);
  const precos = opcoes.map((o) => lerPreco(o.preco));
  const precoInvalido = precos.some((p) => Number.isNaN(p));
  const validas = opcoes.filter((o) => o.nome.trim());

  const sim = ((): { total?: string; aviso?: string } => {
    const grupo: Grupo = {
      id: 'g', nome: g.nome || 'grupo', formacao: g.formacao, obrigatorio: g.obrigatorio, pizza: g.pizza,
      minQtd: g.minQtd, maxQtd: g.maxQtd, permiteRepetir: g.permiteRepetir, ativo: true, delivery: true, presencial: true,
      opcoes: opcoes.map((o, i) => ({
        id: String(i), nome: o.nome || `opção ${i + 1}`, precoItem: 0,
        preco: Number.isNaN(precos[i]) || precos[i] == null ? 0 : paraCentavos(precos[i]!),
        minQtd: 0, maxQtd: g.maxQtd, ativo: true, delivery: true, presencial: true,
      })),
    };
    const escolhas = Object.fromEntries(Object.entries(simulacao).filter(([, q]) => q > 0));
    try {
      const r = calcularItem(
        { id: 'p', nome: '', preco: precoProduto, marcas: [{ marcaId: 'm', ativo: true, delivery: true, presencial: true, totem: true }] },
        [grupo], { g: escolhas }, 'm', 'delivery',
      );
      return { total: formatarReais(r.unitario) };
    } catch (e) {
      return { aviso: e instanceof ErroEscolha ? e.message : 'Não foi possível simular.' };
    }
  })();

  const mover = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= opcoes.length) return;
    const nova = [...opcoes];
    [nova[i], nova[j]] = [nova[j]!, nova[i]!];
    setOpcoes(nova);
    setSimulacao({});
  };

  const enviar = () =>
    iniciar(async () => {
      const dados: DadosGrupo = {
        id: inicial?.id, produtoId, nome: g.nome, formacao: g.formacao, obrigatorio: g.obrigatorio,
        minQtd: g.minQtd, maxQtd: g.maxQtd, pizza: g.pizza, permiteRepetir: g.permiteRepetir,
        opcoes: opcoes.map((o, i) => ({ id: o.id, nome: o.nome, preco: precos[i] ?? null })).filter((o) => o.nome.trim()),
      };
      const r = await salvando(salvarGrupo(dados));
      if (!r.ok) return setErro(r.erro);
      setErro(null);
      if (!inicial) {
        setG({ ...vazio });
        setOpcoes([{ nome: '', preco: '' }]);
        setSimulacao({});
      }
      aoTerminar?.(r.id);
    });

  return (
    <div className="grade" style={{ paddingTop: '0.5rem' }}>
      {inicial && usos > 1 && (
        <p className="aviso">Este grupo é usado em {usos} produtos. As mudanças valem para todos.</p>
      )}
      <label>
        Nome do grupo
        <input type="text" value={g.nome} maxLength={100} onChange={(e) => setG({ ...g, nome: e.target.value })} placeholder="Ex.: Sabores" />
      </label>
      <div className="linha">
        <label className="check">
          <input type="checkbox" checked={g.obrigatorio} onChange={(e) => setG(marcarObrigatorio(g, e.target.checked))} /> Obrigatório
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={g.pizza}
            onChange={(e) => setG({ ...g, pizza: e.target.checked, formacao: e.target.checked && g.formacao === 'soma' ? 'proporcional' : g.formacao })}
          />{' '}
          Frações de pizza
        </label>
        <label className="check">
          <input type="checkbox" checked={g.permiteRepetir} onChange={(e) => setG({ ...g, permiteRepetir: e.target.checked })} /> Pode repetir opção
        </label>
        <label>
          Mínimo
          <input type="number" min={0} value={g.minQtd} onChange={(e) => setG(alterarMinimo(g, Number(e.target.value)))} style={{ width: '5rem' }} />
        </label>
        <label>
          Máximo
          <input type="number" min={1} value={g.maxQtd} onChange={(e) => setG(alterarMaximo(g, Number(e.target.value)))} style={{ width: '5rem' }} />
        </label>
      </div>
      <p className="dica">{descreverSelecao(g)}</p>
      <label>
        Como o preço é formado
        <select value={g.formacao} onChange={(e) => setG({ ...g, formacao: e.target.value as FormacaoPreco })}>
          {FORMACOES.map((f) => (
            <option key={f.valor} value={f.valor}>
              {f.rotulo}
            </option>
          ))}
        </select>
        <span className="dica">{FORMACOES.find((f) => f.valor === g.formacao)?.dica}</span>
      </label>

      <fieldset className="grade" style={{ gap: '0.5rem' }}>
        <legend>Opções</legend>
        {opcoes.map((o, i) => (
          <div key={o.id ?? `n${i}`} className="linha" style={{ alignItems: 'center' }}>
            <span className="linha" style={{ gap: '0.15rem' }}>
              <button type="button" className="mini" aria-label="Subir opção" disabled={i === 0} onClick={() => mover(i, -1)}>↑</button>
              <button type="button" className="mini" aria-label="Descer opção" disabled={i === opcoes.length - 1} onClick={() => mover(i, 1)}>↓</button>
            </span>
            <input type="text" aria-label="Nome da opção" placeholder="Ex.: Calabresa" value={o.nome} onChange={(e) => setOpcoes(opcoes.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))} />
            <input type="text" aria-label="Preço da opção" inputMode="decimal" placeholder="0,00" value={o.preco} style={{ width: '6rem' }} onChange={(e) => setOpcoes(opcoes.map((x, j) => (j === i ? { ...x, preco: e.target.value } : x)))} />
            <label className="check dica" title="Quantidade no simulador">
              Simular
              <input type="number" min={0} value={simulacao[i] ?? 0} style={{ width: '4rem' }} onChange={(e) => setSimulacao({ ...simulacao, [i]: Math.max(0, Math.trunc(Number(e.target.value))) })} />
            </label>
            {opcoes.length > 1 && (
              <button type="button" className="dica" onClick={() => { setOpcoes(opcoes.filter((_, j) => j !== i)); setSimulacao({}); }}>
                Remover
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => setOpcoes([...opcoes, { nome: '', preco: '' }])}>
          + Opção
        </button>
      </fieldset>

      <div className="cartao" style={{ padding: '0.6rem' }} aria-live="polite">
        <span className="dica">Simulador: </span>
        {sim.total ? <strong>{sim.total}</strong> : <span className="dica">{sim.aviso}</span>}
      </div>

      {erros.map((e) => (
        <p key={e.campo + e.mensagem} className="erro">{e.mensagem}</p>
      ))}
      {precoInvalido && <p className="erro">Há um preço inválido nas opções.</p>}
      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="linha">
        <button type="button" className="botao-primario" disabled={pendente || erros.length > 0 || precoInvalido || validas.length === 0} onClick={enviar}>
          {pendente ? 'Salvando…' : inicial ? 'Salvar grupo' : 'Criar grupo'}
        </button>
        {aoCancelar && (
          <button type="button" onClick={aoCancelar} disabled={pendente}>
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
