import { NextResponse, type NextRequest } from 'next/server';
import { criarClienteServidor } from '@/lib/supabase/server';

/** Destino do link de confirmação de e-mail: troca o código pela sessão e entra no painel. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (code) {
    const supabase = await criarClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // conta do cadastro (D-076): /comecar → sem loja vai ao /onboarding, que cria a loja com os dados guardados
    if (!error) return NextResponse.redirect(new URL('/comecar', url.origin));
  }
  return NextResponse.redirect(new URL(`/login?erro=${encodeURIComponent('Link de confirmação inválido ou expirado.')}`, url.origin));
}
