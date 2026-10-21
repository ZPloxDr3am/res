'use client';
import { useRef, useState, useTransition } from 'react';
import { clienteNavegador } from '@/lib/supabase/client';
import { definirFoto } from '@/app/(painel)/cardapio/actions';
import { salvando } from '@/components/tempo-real';

const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];

/** Envia a foto direto para o Storage (pasta da loja; a política do bucket confere a permissão). */
export function FotoProduto({ produtoId, lojaId, atual }: { produtoId: string; lojaId: string; atual: string | null }) {
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
