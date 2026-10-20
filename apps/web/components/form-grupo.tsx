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
import { criarGrupo, type NovoGrupo } from '@/app/(painel)/cardapio/actions';

type OpcaoForm = { nome: string; preco: string };

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

/** Grupo de opções com as mesmas regras do banco e um simulador de preço ao vivo. */
export function FormGrupo({ produtoId, precoProduto }: { produtoId: string; precoProduto: number }) {
  const [g, setG] = useState({ nome: '', obrigatorio: false, minQtd: 0, maxQtd: 1, formacao: 'soma' as FormacaoPreco, pizza: false });
  const [opcoes, setOpcoes] = useState<OpcaoForm[]>([{ nome: '', preco: '' }]);
  const [simulacao, setSimulacao] = useState<Record<number, number>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const erros = validarGrupo(g);
  const precos = opcoes.map((o) => lerPreco(o.preco));
  const precoInvalido = precos.some((p) => Number.isNaN(p));
  const validas = opcoes.filter((o) => o.nome.trim());

  const sim = ((): { total?: string; aviso?: string } => {
    const grupo: Grupo = {
      id: 'g', nome: g.nome, formacao: g.formacao, obrigatorio: g.obrigatorio, pizza: g.pizza,
      minQtd: g.minQtd, maxQtd: g.maxQtd, permiteRepetir: true, ativo: true, delivery: true, presencial: true,
      opcoes: opcoes.map((o, i) => ({
        id: String(i), nome: o.nome, precoItem: 0, preco: Number.isNaN(precos[i]) || precos[i] == null ? 0 : paraCentavos(precos[i]!),
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

  const enviar = () =>
    iniciar(async () => {
      const dados: NovoGrupo = {
        produtoId, nome: g.nome, formacao: g.formacao, obrigatorio: g.obrigatorio, minQtd: g.minQtd, maxQtd: g.maxQtd, pizza: g.pizza,
        opcoes: opcoes.map((o, i) => ({ nome: o.nome, preco: precos[i] ?? null })).filter((o) => o.nome.trim()),
      };
      const r = await criarGrupo(dados);
      if (r.ok) {
        setG({ nome: '', obrigatorio: false, minQtd: 0, maxQtd: 1, formacao: 'soma', pizza: false });
        setOpcoes([{ nome: '', preco: '' }]);
        setSimulacao({});
        setErro(null);
      } else setErro(r.erro);
    });

  return (
    <div className="grade" style={{ paddingTop: '0.5rem' }}>
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
          <div key={i} className="linha" style={{ alignItems: 'center' }}>
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
      <button type="button" className="botao-primario" disabled={pendente || erros.length > 0 || precoInvalido || validas.length === 0} onClick={enviar}>
        {pendente ? 'Salvando…' : 'Criar grupo'}
      </button>
    </div>
  );
}
