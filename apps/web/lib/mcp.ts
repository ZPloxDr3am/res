// Conexão com IA (MCP, D-043): servidor MCP em HTTP (JSON-RPC 2.0, respostas em JSON).
// Cada ferramenta chama a mesma função da API aberta com a chave da loja: o que a chave não pode ver, a IA também não vê.
import { NextResponse } from 'next/server';
import { clienteApi } from '@/lib/api-publica';

type Escopo = 'pedidos' | 'cardapio' | 'clientes' | 'estoque' | 'vendas';
type Ferramenta = {
  name: string;
  title: string;
  description: string;
  escopo: Escopo;
  inputSchema: Record<string, unknown>;
  chamar: (chave: string, a: Record<string, unknown>) => { fn: string; args: Record<string, unknown> };
};

const DATA = { type: 'string', description: 'Data AAAA-MM-DD (o dia vai das 05:00 às 05:00). Padrão: últimos 7 dias.', pattern: '^\\d{4}-\\d{2}-\\d{2}$' };
const d = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

const FERRAMENTAS: Ferramenta[] = [
  {
    name: 'resumo_vendas',
    title: 'Resumo de vendas',
    description: 'Faturamento, número de pedidos, ticket médio, cancelados, vendas por dia, por tipo (entrega, retirada, balcão), por origem e os 20 produtos mais vendidos num período. Valores em reais.',
    escopo: 'vendas',
    inputSchema: { type: 'object', properties: { de: DATA, ate: DATA } },
    chamar: (chave, a) => ({ fn: 'api_vendas', args: { p_chave: chave, p_de: d(a.de), p_ate: d(a.ate) } }),
  },
  {
    name: 'listar_pedidos',
    title: 'Listar pedidos',
    description: 'Pedidos de um período, do mais novo para o mais antigo, com itens, cliente, pagamento e status. Até 200 por página.',
    escopo: 'pedidos',
    inputSchema: {
      type: 'object',
      properties: {
        de: DATA,
        ate: DATA,
        status: { type: 'string', enum: ['novo', 'em_preparo', 'pronto', 'em_entrega', 'concluido', 'cancelado'] },
        limite: { type: 'integer', minimum: 1, maximum: 200 },
        pagina: { type: 'integer', minimum: 1 },
      },
    },
    chamar: (chave, a) => ({ fn: 'api_pedidos', args: { p_chave: chave, p_filtro: { de: d(a.de), ate: d(a.ate), status: a.status ?? null, limite: a.limite ?? 50, pagina: a.pagina ?? 1 } } }),
  },
  {
    name: 'ver_pedido',
    title: 'Ver um pedido',
    description: 'Um pedido pelo número (o mais recente com esse número) ou pelo id.',
    escopo: 'pedidos',
    inputSchema: { type: 'object', properties: { pedido: { type: 'string', description: 'Número (ex.: 1532) ou id' } }, required: ['pedido'] },
    chamar: (chave, a) => ({ fn: 'api_pedido', args: { p_chave: chave, p_ref: String(a.pedido ?? '').slice(0, 40) } }),
  },
  {
    name: 'ver_cardapio',
    title: 'Ver o cardápio',
    description: 'Categorias, produtos com preço, grupos de opções (sabores, adicionais) e opções.',
    escopo: 'cardapio',
    inputSchema: { type: 'object', properties: {} },
    chamar: (chave) => ({ fn: 'api_cardapio', args: { p_chave: chave } }),
  },
  {
    name: 'clientes',
    title: 'Clientes e segmentos',
    description: 'Quantos clientes há em cada segmento e a lista (nome, telefone, pedidos, gasto, último pedido). Segmentos: fieis, potenciais, promissores, atencao, quase_dormentes, em_risco, hibernando, dormindo.',
    escopo: 'clientes',
    inputSchema: {
      type: 'object',
      properties: {
        segmento: { type: 'string', enum: ['fieis', 'potenciais', 'promissores', 'atencao', 'quase_dormentes', 'em_risco', 'hibernando', 'dormindo'] },
        limite: { type: 'integer', minimum: 1, maximum: 1000 },
      },
    },
    chamar: (chave, a) => ({ fn: 'api_clientes', args: { p_chave: chave, p_segmento: a.segmento ?? null, p_limite: a.limite ?? 100 } }),
  },
  {
    name: 'estoque',
    title: 'Estoque',
    description: 'Insumos com saldo, mínimo, custo médio e situação (regular, baixo, acabou), e o valor total em estoque.',
    escopo: 'estoque',
    inputSchema: { type: 'object', properties: {} },
    chamar: (chave) => ({ fn: 'api_estoque', args: { p_chave: chave } }),
  },
];

type Req = { jsonrpc: '2.0'; id?: string | number | null; method: string; params?: Record<string, unknown> };
const ok = (id: Req['id'], result: unknown) => ({ jsonrpc: '2.0', id, result });
const falha = (id: Req['id'], code: number, message: string) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

async function tratar(r: Req, chave: string): Promise<object | null> {
  const db = clienteApi();
  if (r.id === undefined) return null; // notificação (ex.: notifications/initialized)
  switch (r.method) {
    case 'initialize': {
      const { data: quem } = await db.rpc('api_quem', { p_chave: chave });
      if (!quem) return falha(r.id, -32001, 'Chave de API inválida ou revogada.');
      const q = quem as { loja: string; escopos: Escopo[] };
      return ok(r.id, {
        protocolVersion: typeof r.params?.protocolVersion === 'string' ? r.params.protocolVersion : '2025-06-18',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'RES', title: `RES · ${q.loja}`, version: '1.0.0' },
        instructions: `Dados da loja ${q.loja} no RES (sistema de pedidos de restaurante). Valores em reais. O dia de operação vai das 05:00 às 05:00. Datas no formato AAAA-MM-DD. Responda em português.`,
      });
    }
    case 'ping':
      return ok(r.id, {});
    case 'tools/list': {
      const { data: quem } = await db.rpc('api_quem', { p_chave: chave });
      const escopos = ((quem as { escopos?: Escopo[] } | null)?.escopos ?? []) as Escopo[];
      return ok(r.id, {
        tools: FERRAMENTAS.filter((f) => escopos.includes(f.escopo)).map(({ name, title, description, inputSchema }) => ({ name, title, description, inputSchema, annotations: { readOnlyHint: true } })),
      });
    }
    case 'tools/call': {
      const f = FERRAMENTAS.find((x) => x.name === r.params?.name);
      if (!f) return falha(r.id, -32602, 'Ferramenta desconhecida.');
      const { fn, args } = f.chamar(chave, (r.params?.arguments as Record<string, unknown>) ?? {});
      const { data, error } = await db.rpc(fn, args);
      if (error) return ok(r.id, { content: [{ type: 'text', text: error.message }], isError: true });
      return ok(r.id, { content: [{ type: 'text', text: JSON.stringify(data) }], structuredContent: data && typeof data === 'object' && !Array.isArray(data) ? data : { resultado: data } });
    }
    case 'resources/list':
      return ok(r.id, { resources: [] });
    case 'prompts/list':
      return ok(r.id, { prompts: [] });
    default:
      return falha(r.id, -32601, `Método não suportado: ${r.method}`);
  }
}

export async function servidorMcp(req: Request, chave: string | null) {
  if (!chave || !/^res_[0-9a-f]{64}$/.test(chave)) {
    return NextResponse.json(falha(null, -32001, 'Chave de API ausente ou inválida.'), { status: 401 });
  }
  let corpo: Req | Req[];
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json(falha(null, -32700, 'JSON inválido.'), { status: 400 });
  }
  const lista = Array.isArray(corpo) ? corpo : [corpo];
  const respostas = (await Promise.all(lista.map((r) => tratar(r, chave)))).filter((x): x is object => x !== null);
  if (!respostas.length) return new NextResponse(null, { status: 202 });
  return NextResponse.json(Array.isArray(corpo) ? respostas : respostas[0], { headers: { 'Cache-Control': 'no-store' } });
}
