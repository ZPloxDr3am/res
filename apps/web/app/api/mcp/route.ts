import { NextResponse } from 'next/server';
import { chaveDe } from '@/lib/api-publica';
import { servidorMcp } from '@/lib/mcp';

/** MCP com a chave no cabeçalho Authorization: Bearer res_… */
export async function POST(req: Request) {
  return servidorMcp(req, chaveDe(req));
}
export async function GET() {
  return NextResponse.json({ erro: 'Use POST (MCP em HTTP).' }, { status: 405, headers: { Allow: 'POST' } });
}
export const DELETE = GET;
