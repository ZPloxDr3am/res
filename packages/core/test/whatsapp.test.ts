import { test } from 'node:test';
import assert from 'node:assert/strict';
import { corpoParaMeta, nomeModeloWhatsapp as nomeModelo, parametrosModelo, telefoneWhatsapp } from '../src/whatsapp.js';

test('modelo vira {{n}} na ordem, repetida conta uma vez', () => {
  const r = corpoParaMeta('Oi {nome}! Use {cupom} em {link}. Abraço da {loja}, {nome}');
  assert.equal(r.texto, 'Oi {{1}}! Use {{2}} em {{3}}. Abraço da {{4}}, {{1}}');
  assert.deepEqual(r.ordem, ['nome', 'cupom', 'link', 'loja']);
  assert.equal(r.exemplos.length, 4);
});
test('nome, telefone e parâmetros', () => {
  assert.equal(nomeModelo('Volta Sumido 10%!'), 'volta_sumido_10');
  assert.equal(telefoneWhatsapp('(47) 99999-0000'), '5547999990000');
  assert.equal(telefoneWhatsapp('5547999990000'), '5547999990000');
  assert.deepEqual(parametrosModelo(['nome', 'cupom'], { nome: 'Ana', cupom: '' }), ['Ana', '-']);
});
