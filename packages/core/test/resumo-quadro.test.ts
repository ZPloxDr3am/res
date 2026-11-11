import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumoQuadro, type PedidoResumo } from '../src/resumo-quadro.js';

const T = Date.parse('2026-11-10T22:00:00Z');
const iso = (m: number) => new Date(T + m * 60000).toISOString();
const p = (x: Partial<PedidoResumo>): PedidoResumo => ({ loja_id: 'a', status: 'concluido', tipo: 'entrega', criado_em: iso(-90), agendado_para: null, aceito_em: null, pronto_em: null, saiu_em: null, concluido_em: null, ...x });

test('médias, ativos e atrasados por loja', () => {
  const r = resumoQuadro(
    [
      p({ aceito_em: iso(-80), pronto_em: iso(-60), saiu_em: iso(-55), concluido_em: iso(-35) }), // preparo 20, entrega 20
      p({ aceito_em: iso(-70), pronto_em: iso(-40), saiu_em: iso(-40), concluido_em: iso(-30) }), // preparo 30, entrega 10
      p({ status: 'em_preparo', criado_em: iso(-70), aceito_em: iso(-69) }), // atrasado (prazo 50)
      p({ status: 'novo', criado_em: iso(-5), loja_id: 'b', tipo: 'retirada' }),
      p({ status: 'novo', criado_em: iso(-5), agendado_para: iso(180) }), // agendado longe: não conta
      p({ aceito_em: iso(-500), pronto_em: iso(-10) }), // esquecido aberto: fora da média
    ],
    { agora: T, prazoMin: (_l, tipo) => (tipo === 'entrega' ? 50 : 30) },
  );
  assert.equal(r.porLoja.a!.preparoMin, 25);
  assert.equal(r.porLoja.a!.entregaMin, 15);
  assert.equal(r.porLoja.a!.ativos, 1);
  assert.equal(r.porLoja.a!.atrasados, 1);
  assert.equal(r.porLoja.b!.novos, 1);
  assert.equal(r.total.ativos, 2);
});
