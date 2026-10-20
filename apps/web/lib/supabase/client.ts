'use client';
import { createBrowserClient } from '@supabase/ssr';

let cliente: ReturnType<typeof createBrowserClient> | undefined;

/** Cliente Supabase do navegador (tempo real e leituras rápidas). Nunca recebe segredos (D-008). */
export function clienteNavegador() {
  cliente ??= createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  return cliente;
}
