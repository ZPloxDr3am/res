'use client';
import { useRef, useState, useTransition } from 'react';
import { clienteNavegador } from '@/lib/supabase/client';
import { definirFoto, definirFotoOpcao } from '@/app/(painel)/cardapio/actions';
import { salvando } from '@/components/tempo-real';

const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];
const LADO = 1200; // maior lado da foto enviada (px)

/** Reduz a foto no navegador (foto de celular tem 4–12 MB) e devolve JPEG/WebP leve. */
async function reduzir(arquivo: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(arquivo);
    const k = Math.min(1, LADO / Math.max(bmp.width, bmp.height));
    if (k === 1 && arquivo.size < 900 * 1024) return arquivo;
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/jpeg', 0.85));
    return blob ?? arquivo;
  } catch {
    return arquivo;
  }
}

/** Envia a foto direto para o Storage (pasta da loja; a política do bucket confere a permissão). */
export function useEnviarFoto(lojaId: string, salvar: (id: string, url: string | null) => Promise<{ ok: true } | { ok: false; erro: string }> = definirFoto) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const enviar = (produtoId: string, arquivo: File, depois?: () => void) =>
    iniciar(async () => {
      if (!TIPOS.includes(arquivo.type) && !arquivo.type.startsWith('image/')) return setErro('Use uma foto JPG, PNG ou WebP.');
      if (arquivo.size > 25 * 1024 * 1024) return setErro('Foto grande demais (até 25 MB).');
      const corpo = await reduzir(arquivo);
      const tipo = corpo.type || arquivo.type;
      const ext = tipo.split('/')[1] === 'png' ? 'png' : tipo.split('/')[1] === 'webp' ? 'webp' : 'jpeg';
      const caminho = `${lojaId}/${produtoId}-${Date.now()}.${ext}`;
      const supabase = clienteNavegador();
      const up = await supabase.storage.from('cardapio').upload(caminho, corpo, { contentType: tipo, cacheControl: '31536000' });
      if (up.error) return setErro(`Não foi possível enviar a foto: ${up.error.message}`);
      const url = supabase.storage.from('cardapio').getPublicUrl(caminho).data.publicUrl;
      const r = await salvando(salvar(produtoId, url));
      setErro(r.ok ? null : r.erro);
      if (r.ok) depois?.();
    });
  const remover = (produtoId: string) =>
    iniciar(async () => {
      const r = await salvando(salvar(produtoId, null));
      setErro(r.ok ? null : r.erro);
    });
  return { enviar, remover, pendente, erro, setErro };
}

/** Área de foto: mostra a foto, aceita arrastar e soltar ou clicar para escolher. */
export function AreaFoto({
  produtoId,
  lojaId,
  atual,
  grande = false,
  rotulo,
}: {
  produtoId: string;
  lojaId: string;
  atual: string | null;
  grande?: boolean;
  rotulo?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [sobre, setSobre] = useState(false);
  const { enviar, remover, pendente, erro } = useEnviarFoto(lojaId);
  const escolher = (f: File | undefined) => {
    if (!f) return;
    enviar(produtoId, f, () => {
      if (ref.current) ref.current.value = '';
    });
  };

  return (
    <div className={`cd-foto ${grande ? 'grande' : ''}`}>
      <button
        type="button"
        className={`cd-foto-area ${sobre ? 'sobre' : ''} ${atual ? 'tem' : 'vazia'}`}
        aria-label={atual ? `Trocar foto${rotulo ? ` de ${rotulo}` : ''}` : `Adicionar foto${rotulo ? ` de ${rotulo}` : ''}`}
        onClick={() => ref.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setSobre(true);
        }}
        onDragLeave={() => setSobre(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSobre(false);
          escolher(e.dataTransfer.files?.[0]);
        }}
        disabled={pendente}
      >
        {atual && <img src={atual} alt="" />}
        {!atual && (
          <span className="cd-foto-convite">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 16V8M8 12l4-4 4 4" />
              <rect x="3" y="3" width="18" height="18" rx="4" />
            </svg>
            <strong>{sobre ? 'Solte a foto aqui' : 'Arraste a foto aqui'}</strong>
            <small>ou clique para escolher</small>
          </span>
        )}
        {pendente && <span className="cd-foto-enviando">Enviando…</span>}
      </button>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => escolher(e.target.files?.[0])} />
      {grande && (
        <div className="linha" style={{ gap: '0.5rem' }}>
          <button type="button" style={{ flex: 1 }} disabled={pendente} onClick={() => ref.current?.click()}>
            {atual ? 'Trocar foto' : 'Escolher foto'}
          </button>
          {atual && (
            <button type="button" className="texto-perigo" disabled={pendente} onClick={() => remover(produtoId)}>
              Remover
            </button>
          )}
        </div>
      )}
      {erro && <span className="erro">{erro}</span>}
    </div>
  );
}

/** Foto pequena de uma opção do grupo: clicar troca, arrastar e soltar também (D-035). */
export function FotoOpcao({ opcaoId, lojaId, atual, rotulo }: { opcaoId: string; lojaId: string; atual: string | null; rotulo: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [foto, setFoto] = useState(atual);
  const { enviar, remover, pendente, erro } = useEnviarFoto(lojaId, async (id, url) => {
    const r = await definirFotoOpcao(id, url);
    if (r.ok) setFoto(url);
    return r;
  });
  const escolher = (f: File | undefined) => f && enviar(opcaoId, f, () => ref.current && (ref.current.value = ''));
  return (
    <span className="fo">
      <button
        type="button"
        className={`fo-area ${foto ? 'tem' : ''}`}
        title={erro ?? (foto ? `Trocar foto de ${rotulo}` : `Pôr foto em ${rotulo}`)}
        aria-label={foto ? `Trocar foto de ${rotulo}` : `Pôr foto em ${rotulo}`}
        disabled={pendente}
        onClick={() => ref.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          escolher(e.dataTransfer.files?.[0]);
        }}
      >
        {foto ? <img src={foto} alt="" /> : <span aria-hidden="true">{pendente ? '…' : '+'}</span>}
      </button>
      {foto && !pendente && (
        <button type="button" className="fo-tirar" aria-label={`Tirar foto de ${rotulo}`} title="Tirar foto" onClick={() => remover(opcaoId)}>×</button>
      )}
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => escolher(e.target.files?.[0])} />
    </span>
  );
}
