import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Pareamento do agente de impressão do Windows: troca o código de uso único (gerado no painel)
// por um token. Devolve também o endereço e a chave PÚBLICA (anon) do Supabase, que o agente usa
// com o token nas chamadas seguintes. Nenhum segredo sai daqui (D-008, D-015).
export async function POST(req: Request) {
  let corpo: { codigo?: string; nome?: string; versao?: string };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Pedido inválido.' }, { status: 400 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc('parear_agente', {
    p_codigo: String(corpo.codigo ?? '').slice(0, 20),
    p_nome: String(corpo.nome ?? 'Computador').slice(0, 80),
    p_versao: String(corpo.versao ?? '').slice(0, 20) || null,
  });
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 400 });
  const r = data as { token: string; loja: string };
  return NextResponse.json({ ok: true, token: r.token, loja: r.loja, supabaseUrl: url, anonKey: anon });
}
