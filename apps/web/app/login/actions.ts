'use server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { emailDeLogin } from '@res/core';
import { criarClienteServidor } from '@/lib/supabase/server';

function credenciais(form: FormData) {
  return { email: String(form.get('email') ?? '').trim(), password: String(form.get('senha') ?? '') };
}

export async function entrar(form: FormData) {
  const supabase = await criarClienteServidor();
  const c = credenciais(form);
  // sem "@" é usuário de caixa: entra pelo e-mail interno (D-012)
  const { error } = await supabase.auth.signInWithPassword({ email: emailDeLogin(c.email), password: c.password });
  if (error) redirect(`/login?erro=${encodeURIComponent('Usuário/e-mail ou senha incorretos.')}`);
  await supabase.rpc('aceitar_convites'); // convites de equipe para este e-mail viram acesso às lojas
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
