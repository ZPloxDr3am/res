// WhatsApp oficial — Cloud API da Meta (D-097). Só no servidor: o token de cada loja sai do banco pela
// chave de serviço e nunca vai para o navegador.
import { corpoParaMeta, parametrosModelo, telefoneWhatsapp } from '@res/core';
import { clienteAdmin } from '@/lib/supabase/admin';

const GRAPH = 'https://graph.facebook.com/v21.0';

type Credenciais = { phone_number_id: string; waba_id: string; token: string; automatico: boolean };
type ErroMeta = { error?: { message?: string; error_user_msg?: string; code?: number } };

async function graph<T>(caminho: string, token: string, init?: { method?: string; body?: unknown }): Promise<{ ok: true; data: T } | { ok: false; erro: string }> {
  try {
    const r = await fetch(`${GRAPH}${caminho}`, {
      method: init?.method ?? 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
    });
    const j = (await r.json().catch(() => ({}))) as T & ErroMeta;
    if (!r.ok) return { ok: false, erro: j.error?.error_user_msg || j.error?.message || `Meta respondeu ${r.status}` };
    return { ok: true, data: j };
  } catch {
    return { ok: false, erro: 'Não consegui falar com a Meta agora.' };
  }
}

/** Confere o número e o token na Meta antes de salvar. */
export async function verificarNumero(phoneId: string, token: string) {
  return graph<{ display_phone_number?: string; verified_name?: string; quality_rating?: string }>(
    `/${encodeURIComponent(phoneId)}?fields=display_phone_number,verified_name,quality_rating`,
    token,
  );
}

export async function credenciais(lojaId: string): Promise<Credenciais | null> {
  const db = clienteAdmin();
  if (!db) return null;
  const { data } = await db.rpc('whatsapp_credenciais', { p_loja: lojaId });
  return (data as Credenciais | null) ?? null;
}

/** Manda o modelo para a Meta aprovar. */
export async function enviarModeloParaMeta(lojaId: string, m: { id: string; nome: string; categoria: string; corpo: string }) {
  const c = await credenciais(lojaId);
  const db = clienteAdmin();
  if (!c || !db) return { ok: false as const, erro: 'WhatsApp não conectado.' };
  const { texto, exemplos } = corpoParaMeta(m.corpo);
  const r = await graph<{ id?: string; status?: string }>(`/${c.waba_id}/message_templates`, c.token, {
    method: 'POST',
    body: {
      name: m.nome,
      language: 'pt_BR',
      category: m.categoria,
      components: [{ type: 'BODY', text: texto, ...(exemplos.length ? { example: { body_text: [exemplos] } } : {}) }],
    },
  });
  if (!r.ok) {
    await db.rpc('whatsapp_registrar_modelo', { p_modelo: m.id, p_meta_id: null, p_status: 'REJECTED', p_motivo: r.erro.slice(0, 300) });
    return r;
  }
  await db.rpc('whatsapp_registrar_modelo', { p_modelo: m.id, p_meta_id: r.data.id ?? null, p_status: r.data.status ?? 'PENDING', p_motivo: null });
  return { ok: true as const };
}

/** Atualiza o status de todos os modelos da loja com o que está na Meta. */
export async function sincronizarModelos(lojaId: string, modelos: { id: string; nome: string }[]) {
  const c = await credenciais(lojaId);
  const db = clienteAdmin();
  if (!c || !db) return { ok: false as const, erro: 'WhatsApp não conectado.' };
  const r = await graph<{ data?: { id: string; name: string; status: string; rejected_reason?: string }[] }>(
    `/${c.waba_id}/message_templates?fields=id,name,status,rejected_reason&limit=200`,
    c.token,
  );
  if (!r.ok) return r;
  for (const t of r.data.data ?? []) {
    const m = modelos.find((x) => x.nome === t.name);
    if (m) await db.rpc('whatsapp_registrar_modelo', { p_modelo: m.id, p_meta_id: t.id, p_status: t.status, p_motivo: t.rejected_reason && t.rejected_reason !== 'NONE' ? t.rejected_reason : null });
  }
  return { ok: true as const };
}

/** Envia a fila da loja (envios com modelo aprovado). Devolve quantos saíram e quantos falharam. */
export async function processarFila(lojaId: string, limite = 50): Promise<{ enviados: number; falhas: number; erro?: string }> {
  const db = clienteAdmin();
  const c = await credenciais(lojaId);
  if (!db || !c) return { enviados: 0, falhas: 0, erro: 'WhatsApp não conectado.' };
  const { data } = await db.rpc('whatsapp_pegar_envios', { p_loja: lojaId, p_limite: limite });
  const lista = (data ?? []) as { id: string; telefone: string; variaveis: Record<string, string>; modelo: string; idioma: string; ordem: string[] }[];
  let enviados = 0;
  let falhas = 0;
  for (const e of lista) {
    const params = parametrosModelo(e.ordem ?? [], e.variaveis ?? {});
    const r = await graph<{ messages?: { id: string }[] }>(`/${c.phone_number_id}/messages`, c.token, {
      method: 'POST',
      body: {
        messaging_product: 'whatsapp',
        to: telefoneWhatsapp(e.telefone),
        type: 'template',
        template: {
          name: e.modelo,
          language: { code: e.idioma || 'pt_BR' },
          ...(params.length ? { components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }] } : {}),
        },
      },
    });
    const waId = r.ok ? r.data.messages?.[0]?.id ?? null : null;
    await db.rpc('whatsapp_resultado_envio', { p_envio: e.id, p_wa_id: waId, p_erro: r.ok ? null : r.erro });
    if (waId) enviados++;
    else falhas++;
  }
  return { enviados, falhas };
}
