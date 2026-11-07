import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARDAPIO_EXEMPLO, TIPOS_RESTAURANTE, faltaParaAbrir, primeirosPassos, slugValido, sugerirSlug, type EstadoPrimeirosPassos } from '../src/cadastro.js';

test('endereço do cardápio sugerido a partir do nome (D-076)', () => {
  assert.equal(sugerirSlug('Pizzaria do Zé!'), 'pizzaria-do-ze');
  assert.equal(sugerirSlug('  Açaí & Cia  '), 'acai-e-cia');
  assert.equal(sugerirSlug('X'), 'x-delivery');
  assert.equal(sugerirSlug('---'), '');
  assert.ok(sugerirSlug('a'.repeat(80)).length <= 60);
  for (const n of ['Pizzaria do Zé!', 'Açaí & Cia', 'Bar 2000', 'X']) assert.ok(slugValido(sugerirSlug(n)), n);
});

test('cardápio de exemplo para todo tipo de restaurante', () => {
  for (const t of TIPOS_RESTAURANTE) {
    const c = CARDAPIO_EXEMPLO[t.id];
    assert.ok(c.length >= 2, t.id);
    assert.ok(c.flatMap((x) => x.produtos).length >= 4, t.id);
    for (const p of c.flatMap((x) => x.produtos)) assert.ok(p.preco > 0 && p.nome.length <= 120);
  }
});

test('primeiros passos: exemplo não editado não conta; opcionais não travam o "pronto"', () => {
  const base: EstadoPrimeirosPassos = { cidade: true, whatsapp: true, produtos: 5, produtos_exemplo: 4, logo: false, horarios: 0, entrega: false, impressoras: 0, equipe: 1, cardapio_aberto: false, slug: 'x' };
  const r = primeirosPassos(base);
  assert.equal(r.passos.find((p) => p.id === 'cardapio')!.feito, false);
  assert.match(r.passos.find((p) => p.id === 'cardapio')!.aviso!, /4 produto/);
  assert.equal(r.pronto, false);
  assert.deepEqual(faltaParaAbrir(base), ['definir o horário de funcionamento', 'configurar entrega ou retirada']);
  const ok = primeirosPassos({ ...base, produtos_exemplo: 0, logo: true, horarios: 7, entrega: true, cardapio_aberto: true });
  assert.equal(ok.pronto, true);
  assert.equal(ok.obrigatoriosFeitos, ok.obrigatorios);
});
