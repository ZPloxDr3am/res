import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLICAS = ['/api/v1/', '/api/mcp', '/api/mercadopago/', '/login', '/auth', '/c/', '/g/', '/api/agente/', '/m/manifest.webmanifest']; // /api/agente: pareamento do agente de impressão // /c/: cardápio digital do cliente (sem login)

export async function middleware(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(lista) {
        for (const { name, value } of lista) request.cookies.set(name, value);
        resposta = NextResponse.next({ request });
        for (const { name, value, options } of lista) resposta.cookies.set(name, value, options);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const publica = PUBLICAS.some((p) => request.nextUrl.pathname.startsWith(p));
  if (!user && !publica) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    // depois de entrar, volta para onde ia (ex.: QR da comanda → app do motoboy)
    if (request.nextUrl.pathname.startsWith('/m')) url.searchParams.set('voltar', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return resposta;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
