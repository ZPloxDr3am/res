'use client';
import { useState, useTransition } from 'react';
import { jaExiste, type CategoriaLida } from '@res/core';
import { criarCardapioIA, lerCardapioIA } from '@/app/(painel)/cardapio/actions';
import { salvando } from '@/components/tempo-real';

type Linha = { nome: string; descricao: string; preco: string; marcado: boolean; existe: boolean };
type Cat = { nome: string; produtos: Linha[] };

/** Reduz a foto no navegador (lado maior 1600 px, JPEG) para caber no limite de envio e ler mais rápido. */
async function reduzir(f: File): Promise<File> {
  if (f.type === 'application/pdf' || f.size < 600_000) return f;
  try {
    const img = await createImageBitmap(f);
    const k = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/jpeg', 0.82));
    return blob ? new File([blob], f.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : f;
  } catch {
    return f;
  }
}

const reais = (c: number | null) => (c == null ? '' : (c / 100).toFixed(2).replace('.', ','));
const centavos = (s: string) => {
  const t = s.replace(/\s|R\$/g, '');
  if (!t) return null;
  const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : NaN;
};

/** ✨ Cardápio pela IA (D-107): fotos, PDF ou link → categorias e produtos para revisar → cria no cardápio. */
export function ImportarComIA({ aoFechar }: { aoFechar: () => void }) {
  const [modo, setModo] = useState<'arquivo' | 'link'>('arquivo');
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [link, setLink] = useState('');
  const [cats, setCats] = useState<Cat[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<string | null>(null);
  const [lendo, iniciarLeitura] = useTransition();
  const [criando, iniciar] = useTransition();

  const ler = () =>
    iniciarLeitura(async () => {
      setErro(null);
      setFeito(null);
      const f = new FormData();
      if (modo === 'arquivo') {
        const prontos = await Promise.all(arquivos.map(reduzir));
        if (prontos.reduce((t, a) => t + a.size, 0) > 4_300_000) return setErro('Arquivos grandes demais (até 4 MB no total). Mande menos páginas do PDF ou menos fotos por vez.');
        prontos.forEach((a) => f.append('arquivos', a));
      } else f.set('link', link);
      const r = await lerCardapioIA(f);
      if (!r.ok) return setErro(r.erro);
      setCats(
        r.categorias.map((c: CategoriaLida) => ({
          nome: c.nome,
          produtos: c.produtos.map((p) => {
            const existe = jaExiste(p.nome, r.existentes);
            return { nome: p.nome, descricao: p.descricao ?? '', preco: reais(p.preco), marcado: !existe, existe };
          }),
        })),
      );
    });

  const mudar = (ci: number, pi: number, x: Partial<Linha>) =>
    setCats((cs) => cs!.map((c, i) => (i !== ci ? c : { ...c, produtos: c.produtos.map((p, j) => (j === pi ? { ...p, ...x } : p)) })));
  const marcados = (cats ?? []).flatMap((c) => c.produtos.filter((p) => p.marcado));
  const precoRuim = marcados.some((p) => Number.isNaN(centavos(p.preco)));

  const criar = () =>
    iniciar(async () => {
      const dados = (cats ?? [])
        .map((c) => ({ nome: c.nome, produtos: c.produtos.filter((p) => p.marcado && p.nome.trim()).map((p) => ({ nome: p.nome, descricao: p.descricao || null, preco: centavos(p.preco) })) }))
        .filter((c) => c.produtos.length && c.nome.trim());
      const r = await salvando(criarCardapioIA(dados));
      if (!r.ok) return setErro(r.erro);
      setCats(null);
      setArquivos([]);
      setFeito(`Pronto: ${r.produtos} produto(s) criados${r.categorias ? ` em ${r.categorias} categoria(s) nova(s)` : ''}. Confira fotos, grupos de opções e preços por marca no cardápio.`);
    });

  if (cats) {
    return (
      <div className="grade">
        <p className="dica" style={{ margin: 0 }}>
          Confira o que a IA leu: corrija nomes e preços, desmarque o que não quer. Produto que já existe no cardápio vem desmarcado. Nada é criado até você clicar em <b>Criar no cardápio</b>.
        </p>
        {cats.map((c, ci) => (
          <fieldset key={ci} className="grade ia-cat">
            <legend className="linha" style={{ gap: '0.4rem', alignItems: 'center' }}>
              <input value={c.nome} maxLength={150} aria-label="Categoria" onChange={(e) => setCats((cs) => cs!.map((x, i) => (i === ci ? { ...x, nome: e.target.value } : x)))} />
              <span className="dica">{c.produtos.filter((p) => p.marcado).length}/{c.produtos.length}</span>
            </legend>
            {c.produtos.map((p, pi) => (
              <div key={pi} className="ia-prod" data-off={!p.marcado || undefined}>
                <input type="checkbox" checked={p.marcado} onChange={(e) => mudar(ci, pi, { marcado: e.target.checked })} aria-label={`Criar ${p.nome}`} />
                <div className="grade" style={{ gap: '0.2rem', minWidth: 0 }}>
                  <input value={p.nome} maxLength={150} onChange={(e) => mudar(ci, pi, { nome: e.target.value })} aria-label="Nome" />
                  <input value={p.descricao} maxLength={1000} onChange={(e) => mudar(ci, pi, { descricao: e.target.value })} placeholder="Descrição" aria-label="Descrição" className="dica" />
                  {p.existe && <span className="dica">Já existe um produto com esse nome.</span>}
                </div>
                <input value={p.preco} inputMode="decimal" onChange={(e) => mudar(ci, pi, { preco: e.target.value })} placeholder="sem preço" aria-label="Preço" style={{ width: '6.5rem', textAlign: 'right' }} aria-invalid={Number.isNaN(centavos(p.preco)) || undefined} />
              </div>
            ))}
          </fieldset>
        ))}
        {erro && <p className="erro" role="alert">{erro}</p>}
        {precoRuim && <p className="erro">Corrija os preços em vermelho (ex.: 39,90).</p>}
        <div className="gaveta-acoes">
          <button type="button" onClick={() => setCats(null)} disabled={criando}>Voltar</button>
          <button type="button" className="botao-primario" disabled={criando || !marcados.length || precoRuim} onClick={criar}>
            {criando ? 'Criando…' : `Criar no cardápio (${marcados.length} produto${marcados.length === 1 ? '' : 's'})`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grade">
      <p className="dica" style={{ margin: 0 }}>
        Mande fotos do cardápio impresso, o PDF ou o link do seu site: a IA lê categorias, produtos, descrições e preços. Você revisa tudo antes de criar. Leva de 20 a 60 segundos.
      </p>
      <div className="abas-metrica" role="group" aria-label="De onde">
        <button type="button" aria-pressed={modo === 'arquivo'} onClick={() => setModo('arquivo')}>📷 Fotos ou PDF</button>
        <button type="button" aria-pressed={modo === 'link'} onClick={() => setModo('link')}>🔗 Link</button>
      </div>
      {modo === 'arquivo' ? (
        <label>
          Fotos (até 8) ou PDF
          <input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setArquivos([...(e.target.files ?? [])].slice(0, 8))} />
          {arquivos.length > 0 && <span className="dica">{arquivos.map((a) => a.name).join(', ')}</span>}
        </label>
      ) : (
        <label>
          Link do cardápio (site da loja, cardápio digital)
          <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
          <span className="dica">iFood e apps parecidos montam o cardápio só no navegador: para eles, tire prints e mande como foto.</span>
        </label>
      )}
      {erro && <p className="erro" role="alert">{erro}</p>}
      {feito && <p className="aviso" role="status">{feito}</p>}
      <div className="gaveta-acoes">
        <button type="button" onClick={aoFechar}>Fechar</button>
        <button type="button" className="botao-primario" disabled={lendo || (modo === 'arquivo' ? !arquivos.length : !/^https?:\/\/\S+\.\S+/.test(link))} onClick={ler}>
          {lendo ? 'A IA está lendo…' : '✨ Ler cardápio'}
        </button>
      </div>
    </div>
  );
}

