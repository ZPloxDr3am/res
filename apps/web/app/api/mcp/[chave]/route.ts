import { NextResponse } from 'next/server';
import { servidorMcp } from '@/lib/mcp';

/** Link do MCP com a chave no endereço (para ChatGPT/Claude, que pedem só um link). */
export async function POST(req: Request, { params }: { params: Promise<{ chave: string }> }) {
  const { chave } = await params;
  return servidorMcp(req, chave);
}
export async function GET() {
  return NextResponse.json({ erro: 'Use POST (MCP em HTTP).' }, { status: 405, headers: { Allow: 'POST' } });
}
export const DELETE = GET;
