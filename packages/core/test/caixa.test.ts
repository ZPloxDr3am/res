import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emailDeLogin, limparContagem, situacaoDiferenca, totalContagem, validarSenha, validarUsuario } from '../src/caixa.js';

test('contagem por cédula e moeda (mesmo exemplo do teste do banco)', () => {
  assert.equal(totalContagem({ '5000': 2, '1000': 3, '25': 4 }), 13100);
  assert.equal(totalContagem({ '10000': 1, '2000': 1, '500': 2 }), 13000);
  assert.equal(totalContagem({ '300': 5, '1000': -1, '200': 1.5 }), 0, 'cédula inexistente e quantidades inválidas não contam');
  assert.deepEqual(limparContagem({ '5000': 2, '1000': 0, '25': 4 }), { '5000': 2, '25': 4 });
});

test('situação da diferença do fechamento', () => {
  assert.equal(situacaoDiferenca(0), 'confere');
  assert.equal(situacaoDiferenca(150), 'sobra');
  assert.equal(situacaoDiferenca(-100), 'falta');
});

test('usuário de caixa: validação e e-mail interno', () => {
  assert.equal(validarUsuario('Ana.Caixa'), null);
  assert.equal(validarUsuario('jo'), 'O usuário deve ter de 3 a 30 caracteres.');
  assert.notEqual(validarUsuario('joão'), null, 'acento não');
  assert.notEqual(validarUsuario('.ana'), null, 'não começa com ponto');
  assert.equal(emailDeLogin(' Ana.Caixa '), 'ana.caixa@equipe.res.invalid');
  assert.equal(emailDeLogin('dono@pizzaria.com'), 'dono@pizzaria.com', 'quem digita e-mail entra por e-mail');
  assert.equal(validarSenha('1234567'), 'A senha precisa ter pelo menos 8 caracteres.');
  assert.equal(validarSenha('12345678'), null);
});
