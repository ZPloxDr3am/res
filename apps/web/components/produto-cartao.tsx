'use client';
import { useRef, useState, useTransition } from 'react';
import { formatarReais, paraCentavos } from '@res/core';
import { nomeOpcao, type GrupoRow, type ProdutoRow } from '@/lib/cardapio-dados';
import { clienteNavegador } from '@/lib/supabase/client';
import {
  definirFoto,
  desvincularGrupo,
  excluirProduto,
  mover,
  salvarProduto,
  vincularGrupo,
  type Resultado,
} from '@/app/(painel)/cardapio/actions';
import { salvando } from '@/components/tempo-real';
import { Disponibilidade } from '@/components/disponibilidade';
import { FormGrupo } from '@/components/form-grupo';
import { BotaoExcluir } from '@/components/botao-excluir';

type Marca = { id: string; nome: string };

const ETIQUETAS: { valor: string; rotulo: string }[] = [
  { valor: '', rotulo: 'Nenhuma' },
  { valor: 'novo', rotulo: 'Novo' },
  { valor: 'recomendado', rotulo: 'Recomendado' },
  { valor: 'mais_vendido', rotulo: 'Mais vendido' },
  { valor: 'edicao_limitada', rotulo: 'Edição limitada' },
  { valor: 'esgotado', rotulo: 'Esgotado' },
];

const reais = (v: number | null) => (v == null ? '' : Number(v).toFixed(2).replace('.', ','));
const FORMACAO: Record<string, string> = { soma: 'soma', maior: 'maior preço', proporcional: 'proporcional', brinde: 'brinde' };

export function ProdutoCartao({
  produto,
  setores,
  marcas,
  grupos,
  usos,
  gruposDaLoja,
  lojaId,
  primeiro,
  ultimo,
}: {
  produto: ProdutoRow;
  setores: { id: string; nome: string }[];
  marcas: Marca[];
  grupos: GrupoRow[];
  usos: Record<string, number>;
  gruposDaLoja: { id: string; nome: string; opcoes: number }[];
  lojaId: string;
  primeiro: boolean;
  ultimo: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [grupoEditando, setGrupoEditando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const precoCentavos = produto.preco == null ? 0 : paraCentavos(Number(produto.preco));

  const executar = (acao: () => Promise<Resultado>) =>
    iniciar(async () => {
      const r = await salvando(acao());
      setErro(r.ok ? null : r.erro);
    });

  const disponiveis = gruposDaLoja.filter((g) => !produto.produto_grupos.some((pg) => pg.grupo_id === g.id));

  return (
    <li className="item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="linha" style={{ alignItems: 'center', gap: '0.5rem' }}>
          {produto.imagem_url && <img src={produto.imagem_url} alt="" className="miniatura" />}
          <span className="item-titulo">{produto.nome}</span>
          {produto.etiqueta && <span className="selo">{ETIQUETAS.find((e) => e.valor === produto.etiqueta)?.rotulo}</span>}
        </span>
        <span className="linha" style={{ alignItems: 'center', gap: '0.35rem' }}>
          <span>{produto.preco == null ? '—' : formatarReais(precoCentavos)}</span>
          <button type="button" className="mini" aria-label="Subir produto" disabled={primeiro || pendente} onClick={() => executar(() => mover('produtos', produto.id, -1))}>↑</button>
          <button type="button" className="mini" aria-label="Descer produto" disabled={ultimo || pendente} onClick={() => executar(() => mover('produtos', produto.id, 1))}>↓</button>
          <button type="button" onClick={() => setEditando(!editando)}>{editando ? 'Fechar' : 'Editar'}</button>
        </span>
      </div>
      {produto.descricao && !editando && <p className="dica" style={{ margin: 0 }}>{produto.descricao}</p>}

      {editando && <EdicaoProduto produto={produto} setores={setores} marcas={marcas} lojaId={lojaId} aoSalvar={() => setEditando(false)} />}

      <Disponibilidade produtoId={produto.id} marcas={marcas} estado={produto.produto_marcas} />

      {grupos.length > 0 && (
        <ul className="lista" style={{ gap: '0.35rem' }}>
          {grupos.map((g) => (
            <li key={g.id} className="grade" style={{ gap: '0.25rem' }}>
              <div className="linha" style={{ alignItems: 'center', gap: '0.5rem' }}>
                <span className={`selo ${g.pizza ? 'selo-pizza' : ''}`}>
                  {g.nome} · {g.min_qtd}–{g.max_qtd} · {FORMACAO[g.formacao]} · {g.opcoes.length} opções
                  {(usos[g.id] ?? 0) > 1 && ` · em ${usos[g.id]} produtos`}
                </span>
                <button type="button" className="dica" onClick={() => setGrupoEditando(grupoEditando === g.id ? null : g.id)}>
                  {grupoEditando === g.id ? 'Fechar' : 'Editar grupo'}
                </button>
                <BotaoExcluir
                  rotulo="Tirar do produto"
                  confirmacao={(usos[g.id] ?? 0) > 1 ? `Tirar "${g.nome}" deste produto?` : `Tirar "${g.nome}"? Nenhum outro produto usa este grupo, então ele será apagado.`}
                  acao={() => desvincularGrupo(produto.id, g.id)}
                />
              </div>
              {grupoEditando !== g.id && (
                <span className="dica">{g.opcoes.map((o) => nomeOpcao(o) + (o.preco != null ? ` (${reais(o.preco)})` : '')).join(' · ')}</span>
              )}
              {grupoEditando === g.id && (
                <FormGrupo
                  produtoId={produto.id}
                  precoProduto={precoCentavos}
                  usos={usos[g.id] ?? 1}
                  inicial={{
                    id: g.id, nome: g.nome, formacao: g.formacao, obrigatorio: g.obrigatorio, minQtd: g.min_qtd, maxQtd: g.max_qtd,
                    pizza: g.pizza, permiteRepetir: g.permite_repetir,
                    opcoes: g.opcoes.map((o) => ({ id: o.id, nome: nomeOpcao(o), preco: o.preco == null ? null : Number(o.preco) })),
                  }}
                  aoTerminar={() => setGrupoEditando(null)}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      <details>
        <summary className="dica">Adicionar grupo de opções</summary>
        {disponiveis.length > 0 && <UsarGrupoExistente produtoId={produto.id} grupos={disponiveis} />}
        <FormGrupo produtoId={produto.id} precoProduto={precoCentavos} />
      </details>

      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="linha" style={{ justifyContent: 'flex-end' }}>
        <BotaoExcluir
          rotulo="Excluir produto"
          confirmacao={`Excluir o produto "${produto.nome}"? Esta ação não pode ser desfeita.`}
          acao={() => excluirProduto(produto.id)}
        />
      </div>
    </li>
  );
}

function UsarGrupoExistente({ produtoId, grupos }: { produtoId: string; grupos: { id: string; nome: string; opcoes: number }[] }) {
  const [escolhido, setEscolhido] = useState(grupos[0]?.id ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <div className="linha" style={{ alignItems: 'end', paddingTop: '0.5rem' }}>
      <label>
        Usar um grupo que já existe
        <select value={escolhido} onChange={(e) => setEscolhido(e.target.value)}>
          {grupos.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nome} ({g.opcoes} opções)
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={!escolhido || pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await salvando(vincularGrupo(produtoId, escolhido));
            setErro(r.ok ? null : r.erro);
          })
        }
      >
        {pendente ? 'Ligando…' : 'Usar neste produto'}
      </button>
      {erro && <span className="erro">{erro}</span>}
      <p className="dica" style={{ width: '100%', margin: 0 }}>Ex.: os mesmos sabores em todos os tamanhos de pizza. Ou crie um grupo novo abaixo.</p>
    </div>
  );
}

function EdicaoProduto({
  produto,
  setores,
  marcas,
  lojaId,
  aoSalvar,
}: {
  produto: ProdutoRow;
  setores: { id: string; nome: string }[];
  marcas: Marca[];
  lojaId: string;
  aoSalvar: () => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const pm = (marca: string) => produto.produto_marcas.find((m) => m.marca_id === marca);

  return (
    <form
      className="grade cartao"
      action={(fd) =>
        iniciar(async () => {
          const r = await salvando(salvarProduto(fd));
          if (!r.ok) return setErro(r.erro);
          setErro(null);
          aoSalvar();
        })
      }
    >
      <input type="hidden" name="id" value={produto.id} />
      <div className="linha">
        <label style={{ flex: '2 1 14rem' }}>
          Nome
          <input type="text" name="nome" defaultValue={produto.nome} required maxLength={150} />
        </label>
        <label style={{ flex: '1 1 8rem' }}>
          Preço (R$)
          <input type="text" name="preco" inputMode="decimal" defaultValue={reais(produto.preco)} placeholder="0,00" />
        </label>
      </div>
      <label>
        Descrição
        <textarea name="descricao" rows={2} maxLength={1000} defaultValue={produto.descricao ?? ''} />
      </label>
      <div className="linha">
        <label style={{ flex: '1 1 10rem' }}>
          Setor
          <select name="setor" defaultValue={produto.setor_id ?? ''}>
            <option value="">Sem setor</option>
            {setores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </label>
        <label style={{ flex: '1 1 10rem' }}>
          Etiqueta
          <select name="etiqueta" defaultValue={produto.etiqueta ?? ''}>
            {ETIQUETAS.map((e) => (
              <option key={e.valor} value={e.valor}>
                {e.rotulo}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="grade" style={{ gap: '0.5rem' }}>
        <legend>Preços por marca e canal (opcional)</legend>
        <p className="dica" style={{ margin: 0 }}>Vazio = usa o preço acima. O promocional vale em todos os canais.</p>
        {marcas.map((m) => (
          <div key={m.id} className="linha">
            <input type="hidden" name="marca" value={m.id} />
            {marcas.length > 1 && <span className="dica" style={{ minWidth: '8rem', alignSelf: 'center' }}>{m.nome}</span>}
            <label style={{ flex: '1 1 6rem' }}>
              Delivery
              <input type="text" name={`preco_delivery_${m.id}`} inputMode="decimal" defaultValue={reais(pm(m.id)?.preco_delivery ?? null)} />
            </label>
            <label style={{ flex: '1 1 6rem' }}>
              Presencial
              <input type="text" name={`preco_presencial_${m.id}`} inputMode="decimal" defaultValue={reais(pm(m.id)?.preco_presencial ?? null)} />
            </label>
            <label style={{ flex: '1 1 6rem' }}>
              Promocional
              <input type="text" name={`preco_promocional_${m.id}`} inputMode="decimal" defaultValue={reais(pm(m.id)?.preco_promocional ?? null)} />
            </label>
          </div>
        ))}
      </fieldset>

      <FotoProduto produtoId={produto.id} lojaId={lojaId} atual={produto.imagem_url} />

      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="linha">
        <button className="botao-primario" disabled={pendente}>{pendente ? 'Salvando…' : 'Salvar produto'}</button>
        <button type="button" onClick={aoSalvar} disabled={pendente}>Cancelar</button>
      </div>
    </form>
  );
}

const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];

/** Envia a foto direto para o Storage (pasta da loja; a política do bucket confere a permissão). */
function FotoProduto({ produtoId, lojaId, atual }: { produtoId: string; lojaId: string; atual: string | null }) {
  const ref = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const enviar = (arquivo: File) =>
    iniciar(async () => {
      if (!TIPOS.includes(arquivo.type)) return setErro('Use uma foto JPG, PNG ou WebP.');
      if (arquivo.size > 5 * 1024 * 1024) return setErro('A foto pode ter até 5 MB.');
      const ext = arquivo.type.split('/')[1];
      const caminho = `${lojaId}/${produtoId}-${Date.now()}.${ext}`;
      const supabase = clienteNavegador();
      const up = await supabase.storage.from('cardapio').upload(caminho, arquivo, { contentType: arquivo.type, cacheControl: '31536000' });
      if (up.error) return setErro(`Não foi possível enviar a foto: ${up.error.message}`);
      const url = supabase.storage.from('cardapio').getPublicUrl(caminho).data.publicUrl;
      const r = await salvando(definirFoto(produtoId, url));
      setErro(r.ok ? null : r.erro);
      if (ref.current) ref.current.value = '';
    });

  return (
    <fieldset className="linha" style={{ alignItems: 'center' }}>
      <legend>Foto</legend>
      {atual ? <img src={atual} alt="Foto atual do produto" className="foto" /> : <span className="dica">Sem foto.</span>}
      <input ref={ref} type="file" accept={TIPOS.join(',')} disabled={pendente} onChange={(e) => e.target.files?.[0] && enviar(e.target.files[0])} />
      {atual && (
        <button type="button" className="dica" disabled={pendente} onClick={() => iniciar(async () => { const r = await salvando(definirFoto(produtoId, null)); setErro(r.ok ? null : r.erro); })}>
          Tirar foto
        </button>
      )}
      {pendente && <span className="dica">Enviando…</span>}
      {erro && <span className="erro">{erro}</span>}
    </fieldset>
  );
}
