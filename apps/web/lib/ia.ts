// IA do RES (D-107): chamada à API da Anthropic só no servidor, com a chave ANTHROPIC_API_KEY da Vercel.
// A resposta vem sempre por uma ferramenta (tool) com formato fixo; quem limpa e confere é o @res/core.
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const MODELO = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';

export class ErroIA extends Error {}

export type BlocoIA =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } };

type Ferramenta = { name: string; description: string; input_schema: unknown };

/** Pede à IA e devolve o que ela preencheu na ferramenta. Mensagens de erro já em português para a tela. */
export async function pedirIA({ sistema, conteudo, ferramenta, maxTokens = 8000 }: { sistema: string; conteudo: BlocoIA[]; ferramenta: Ferramenta; maxTokens?: number }): Promise<unknown> {
  const chave = process.env.ANTHROPIC_API_KEY;
  if (!chave) throw new ErroIA('A inteligência artificial ainda não foi ligada neste servidor (falta a chave ANTHROPIC_API_KEY na Vercel).');
  let res: Response;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': chave, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: maxTokens,
        system: sistema,
        tools: [ferramenta],
        tool_choice: { type: 'tool', name: ferramenta.name },
        messages: [{ role: 'user', content: conteudo }],
      }),
      signal: AbortSignal.timeout(55_000),
    });
  } catch (e) {
    throw new ErroIA(e instanceof Error && e.name === 'TimeoutError' ? 'A IA demorou demais. Tente com menos páginas ou fotos por vez.' : 'Não consegui falar com a IA agora. Tente de novo.');
  }
  const corpo = (await res.json().catch(() => null)) as { content?: { type: string; name?: string; input?: unknown }[]; error?: { message?: string } } | null;
  if (!res.ok) {
    const m = corpo?.error?.message ?? '';
    if (res.status === 401) throw new ErroIA('A chave da IA (ANTHROPIC_API_KEY) não foi aceita. Confira a chave na Vercel.');
    if (/credit balance/i.test(m)) throw new ErroIA('A conta da IA está sem crédito. Adicione saldo em console.anthropic.com (Billing).');
    if (res.status === 429 || res.status === 529) throw new ErroIA('A IA está ocupada agora. Tente de novo em um minuto.');
    if (res.status === 413 || /too large|too long/i.test(m)) throw new ErroIA('Arquivo grande demais para a IA. Mande menos páginas ou fotos menores.');
    throw new ErroIA(`A IA recusou o pedido (${res.status}). Tente de novo.`);
  }
  const uso = corpo?.content?.find((b) => b.type === 'tool_use' && b.name === ferramenta.name);
  if (!uso) throw new ErroIA('A IA não conseguiu ler. Tente uma foto mais nítida ou outro arquivo.');
  return uso.input;
}

// ───────────── link do cardápio: busca a página com proteção contra endereços internos ─────────────

function ipPrivado(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80')) return true;
    const m = v.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return m ? ipPrivado(m[1]!) : false;
  }
  const [a, b] = ip.split('.').map(Number) as [number, number];
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

/** Texto visível de uma página pública (até ~60 mil caracteres). Recusa endereço interno, arquivo grande e redirecionamento para fora. */
export async function textoDaPagina(endereco: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(endereco.trim());
  } catch {
    throw new ErroIA('Link inválido. Copie o endereço completo (começa com https://).');
  }
  for (let saltos = 0; saltos < 4; saltos++) {
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new ErroIA('Use um link https://.');
    if (url.username || url.password || (url.port && !['80', '443'].includes(url.port))) throw new ErroIA('Link não permitido.');
    const ips = isIP(url.hostname) ? [{ address: url.hostname }] : await lookup(url.hostname, { all: true }).catch(() => []);
    if (!ips.length) throw new ErroIA('Não encontrei esse site.');
    if (ips.some((i) => ipPrivado(i.address))) throw new ErroIA('Link não permitido.');
    const res = await fetch(url, { redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0 (RES cardapio)', accept: 'text/html,text/plain' }, signal: AbortSignal.timeout(12_000) }).catch(() => null);
    if (!res) throw new ErroIA('O site não respondeu.');
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = new URL(res.headers.get('location')!, url);
      continue;
    }
    if (!res.ok) throw new ErroIA(`O site respondeu ${res.status}.`);
    const tipo = res.headers.get('content-type') ?? '';
    if (!/text\/html|text\/plain|application\/xhtml/.test(tipo)) throw new ErroIA('O link não é uma página. Para PDF ou foto, use "Enviar arquivo".');
    const leitor = res.body?.getReader();
    const partes: Uint8Array[] = [];
    let total = 0;
    while (leitor) {
      const { done, value } = await leitor.read();
      if (done) break;
      total += value.length;
      if (total > 3_000_000) {
        await leitor.cancel();
        break;
      }
      partes.push(value);
    }
    const html = new TextDecoder().decode(Buffer.concat(partes));
    const texto = html
      .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr|section)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n+/g, '\n')
      .trim();
    if (texto.length < 80) {
      throw new ErroIA('Essa página monta o cardápio só no navegador (como o iFood) e não dá para ler pelo link. Tire prints da tela e envie como foto.');
    }
    return texto.slice(0, 60_000);
  }
  throw new ErroIA('O link redireciona demais.');
}
