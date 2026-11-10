'use client';
import { clienteNavegador } from '@/lib/supabase/client';

// Registro de erros do navegador (D-084): vai para o banco e aparece em Painel da empresa → Erros.
const recentes = new Map<string, number>();
const RUIDO = [/ResizeObserver loop/i, /^Script error\.?$/i, /chrome-extension:|moz-extension:|safari-extension:/i, /NEXT_REDIRECT|NEXT_NOT_FOUND/];

export function reportarErro(erro: unknown, extra: { digest?: string } = {}) {
  try {
    const e = erro instanceof Error ? erro : new Error(typeof erro === 'string' ? erro : JSON.stringify(erro));
    const mensagem = `${e.name && e.name !== 'Error' ? `${e.name}: ` : ''}${e.message}`.slice(0, 500);
    const pilha = (e.stack ?? '').slice(0, 4000);
    if (RUIDO.some((r) => r.test(mensagem) || r.test(pilha))) return;
    const chave = `${mensagem}|${location.pathname}`;
    const agora = Date.now();
    if ((recentes.get(chave) ?? 0) > agora - 10_000) return; // o mesmo erro em rajada conta uma vez
    recentes.set(chave, agora);
    void clienteNavegador()
      .rpc('registrar_erro', { p: { origem: 'navegador', mensagem, pilha, caminho: location.pathname, digest: extra.digest ?? (e as { digest?: string }).digest, navegador: navigator.userAgent } })
      .then(() => undefined, () => undefined);
  } catch {
    /* registrar erro nunca pode quebrar a tela */
  }
}
