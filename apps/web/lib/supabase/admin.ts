import { createClient } from '@supabase/supabase-js';

/**
 * Cliente com a chave service_role, só para o servidor (Server Actions). Usado apenas para
 * criar usuários de caixa e trocar a senha deles, sempre depois de o banco confirmar que
 * quem pede tem a permissão "equipe" (D-012). Nunca importar em componente 'use client'
 * e nunca expor como NEXT_PUBLIC_* (D-008). Sem a variável configurada, devolve null.
 */
export function clienteAdmin() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (typeof window !== 'undefined' || !chave) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const SEM_CHAVE_ADMIN =
  'Para criar usuários de caixa, configure a variável SUPABASE_SERVICE_ROLE_KEY na Vercel (Settings → Environment Variables) e publique de novo.';
