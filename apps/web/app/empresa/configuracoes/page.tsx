import { criarClienteServidor } from '@/lib/supabase/server';
import { ConfigEmpresa } from '@/components/empresa/config';

export const metadata = { title: 'Configurações' };

/** Configurações da plataforma (D-083): cadastro, equipe RES e o que está ligado no servidor. */
export default async function Configuracoes() {
  const supabase = await criarClienteServidor();
  const [{ data: equipe }, { data: modo }, { data: eu }] = await Promise.all([
    supabase.rpc('equipe_res_listar'),
    supabase.rpc('cadastro_modo'),
    supabase.auth.getUser(),
  ]);
  // só diz se está configurado; nenhum valor sai do servidor
  const integracoes = [
    { nome: 'iFood (aplicativo da plataforma)', ok: !!process.env.IFOOD_CLIENT_ID && !!process.env.IFOOD_CLIENT_SECRET, como: 'IFOOD_CLIENT_ID e IFOOD_CLIENT_SECRET na Vercel, quando o app for aprovado.' },
    { nome: 'Busca automática do iFood', ok: !!process.env.MARKETPLACE_CRON_SEGREDO, como: 'MARKETPLACE_CRON_SEGREDO na Vercel e o mesmo valor no Vault do Supabase.' },
    { nome: 'WhatsApp do suporte', ok: !!process.env.NEXT_PUBLIC_SUPORTE_WHATSAPP, como: 'NEXT_PUBLIC_SUPORTE_WHATSAPP na Vercel (número com DDD) e redeploy.' },
  ];
  return (
    <div className="grade">
      <div>
        <h1>Configurações</h1>
        <p className="dica">Quem entra no RES, quem é da equipe e o que está ligado na plataforma.</p>
      </div>
      <ConfigEmpresa
        modo={modo === 'aberto' ? 'aberto' : 'convite'}
        equipe={(equipe ?? []) as { user_id: string; email: string; criado_em: string }[]}
        eu={eu.user?.id ?? ''}
        integracoes={integracoes}
      />
    </div>
  );
}
