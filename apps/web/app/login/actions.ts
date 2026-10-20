'use server';
import { redirect } from 'next/navigation';
import { criarClienteServidor } from '@/lib/supabase/server';

function credenciais(form: FormData) {
  return { email: String(form.get('email') ?? '').trim(), password: String(form.get('senha') ?? '') };
}

export async function entrar(form: FormData) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword(credenciais(form));
  if (error) redirect(`/login?erro=${encodeURIComponent('E-mail ou senha incorretos.')}`);
  redirect('/cardapio');
}

export async function cadastrar(form: FormData) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signUp(credenciais(form));
  if (error) redirect(`/login?erro=${encodeURIComponent(error.message)}`);
  redirect(`/login?aviso=${encodeURIComponent('Conta criada. Confira seu e-mail para confirmar e depois entre.')}`);
}
