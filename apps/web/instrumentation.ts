// Erros do servidor (D-084): cada falha de página, ação ou rota vai para o registro de erros.
export async function register() {}

export async function onRequestError(
  err: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string; routeType: string },
) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !chave) return;
    const e = err instanceof Error ? err : new Error(String(err));
    if (/NEXT_REDIRECT|NEXT_NOT_FOUND|DYNAMIC_SERVER_USAGE/.test(e.message)) return;
    await fetch(`${url}/rest/v1/rpc/registrar_erro`, {
      method: 'POST',
      headers: { apikey: chave, Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p: {
          origem: 'servidor',
          mensagem: `${e.name && e.name !== 'Error' ? `${e.name}: ` : ''}${e.message}`.slice(0, 500),
          pilha: (e.stack ?? '').slice(0, 4000),
          caminho: `${request.method} ${request.path}`.slice(0, 300),
          digest: (e as { digest?: string }).digest ?? context.routePath,
          navegador: `${context.routerKind} ${context.routeType}`,
        },
      }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    /* nunca derrubar a resposta por causa do registro */
  }
}
