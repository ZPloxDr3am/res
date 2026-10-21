'use server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { criarClienteServidor } from '@/lib/supabase/server';

function credenciais(form: FormData) {
  return { email: String(form.get('email') ?? '').trim(), password: String(form.get('senha') ?? '') };
}

export async function entrar(form: FormData) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword(credenciais(form));
  if (error) redirect(`/login?erro=${encodeURIComponent('E-mail ou senha incorretos.')}`);
  redirect('/pedidos');
}

export async function cadastrar(form: FormData) {
  const supabase = await criarClienteServidor();
  const origem = (await headers()).get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const { data, error } = await supabase.auth.signUp({ ...credenciais(form), options: { emailRedirectTo: `${origem}/auth/confirmar` } });
  if (error) redirect(`/login?erro=${encodeURIComponent(error.message)}`);
  if (data.session) redirect('/onboarding'); // confirmação de e-mail desligada: já entra
  redirect(`/login?aviso=${encodeURIComponent('Conta criada. Confira seu e-mail para confirmar e depois entre.')}`);
}
