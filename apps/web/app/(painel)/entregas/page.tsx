import type { ReactNode } from 'react';
import Link from 'next/link';
import { fecharMotoboys, type EntregaFechamento } from '@res/core';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import { TempoReal } from '@/components/tempo-real';
import { BairrosEntregas, type LojaBairros } from '@/components/entregas/bairros';
import { FechamentoMotoboys } from '@/components/entregas/fechamento';
import { MapaAoVivo } from '@/components/entregas/ao-vivo';
import { rastreioAoVivo } from './actions';

export const dynamic = 'force-dynamic';

/** Dia do turno atual (o turno vai das 05:00 às 05:00): de madrugada ainda é "ontem". */
function diaDoTurno(): string {
  return new Date(Date.now() - 5 * 3600_000).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

export default async function Entregas({ searchParams }: { searchParams: Promise<{ aba?: string; dia?: string }> }) {
  const sp = await searchParams;
  const aba = sp.aba === 'fechamento' ? 'fechamento' : sp.aba === 'bairros' ? 'bairros' : 'aovivo';
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();

  // lojas do grupo (mesma conta) que a pessoa acessa
  const conta = ctx.lojas.find((l) => l.id === ctx.lojaId)?.contaId ?? null;
  const grupo = ctx.lojas.filter((l) => l.id === ctx.lojaId || (conta && l.contaId === conta));
  const ids = grupo.map((l) => l.id);

  let conteudo: ReactNode;
  if (aba === 'aovivo') {
    const vivo = await rastreioAoVivo();
    conteudo = vivo ? <MapaAoVivo inicial={vivo} /> : <p className="cartao dica">Seu acesso não inclui as entregas desta loja.</p>;
  } else if (aba === 'bairros') {
    const [lojas, marcas, areas] = await Promise.all([
      supabase.from('lojas').select('id, nome, cidade, endereco, lat, lng').in('id', ids),
      supabase.from('marcas').select('id, nome, loja_id').in('loja_id', ids).order('ordem').order('nome'),
      supabase.from('areas_entrega').select('marca_id, bairro, taxa, valor_motoboy, km, ativo').in('loja_id', ids),
    ]);
    if (lojas.error) throw new Error(lojas.error.message);
    const lista: LojaBairros[] = grupo.map((g) => {
      const l = (lojas.data ?? []).find((x) => x.id === g.id);
      return {
        id: g.id,
        nome: g.nome,
        cidade: (l?.cidade as string | null) ?? null,
        endereco: (l?.endereco as string | null) ?? null,
        lat: (l?.lat as number | null) ?? null,
        lng: (l?.lng as number | null) ?? null,
        marcas: (marcas.data ?? [])
          .filter((m) => m.loja_id === g.id)
          .map((m) => ({
            id: m.id as string,
            nome: m.nome as string,
            areas: (areas.data ?? [])
              .filter((a) => a.marca_id === m.id)
              .map((a) => ({
                bairro: a.bairro as string,
                taxa: Math.round(Number(a.taxa) * 100),
                valorMotoboy: a.valor_motoboy == null ? null : Math.round(Number(a.valor_motoboy) * 100),
                km: a.km == null ? null : Number(a.km),
                ativo: a.ativo as boolean,
              })),
          })),
      };
    });
    conteudo = <BairrosEntregas lojas={lista} inicial={ctx.lojaId} />;
  } else {
    const dia = /^\d{4}-\d{2}-\d{2}$/.test(sp.dia ?? '') ? sp.dia! : diaDoTurno();
    const { data, error } = await supabase.rpc('fechamento_motoboys', { p_loja: ctx.lojaId, p_dia: dia });
    const entregas = ((data as { entregas?: EntregaFechamento[] } | null)?.entregas ?? []).map((e) => ({ ...e, distancia_km: e.distancia_km == null ? null : Number(e.distancia_km) }));
    const { motoboys, total } = fecharMotoboys(entregas);
    conteudo = (
      <>
        <TempoReal lojaId={ctx.lojaId} tabelas={['pedidos']} reservaMs={30000} />
        <FechamentoMotoboys dia={dia} motoboys={motoboys} total={total} erro={error ? error.message : null} />
      </>
    );
  }

  return (
    <div className="grade">
      <h1>Entregas</h1>
      <nav className="abas nao-imprimir" aria-label="Entregas">
        <Link href="/entregas" role="tab" aria-selected={aba === 'aovivo'} className="aba-link">Ao vivo</Link>
        <Link href="/entregas?aba=bairros" role="tab" aria-selected={aba === 'bairros'} className="aba-link">Bairros e preços</Link>
        <Link href="/entregas?aba=fechamento" role="tab" aria-selected={aba === 'fechamento'} className="aba-link">Fechamento dos motoboys</Link>
      </nav>
      {conteudo}
    </div>
  );
}
