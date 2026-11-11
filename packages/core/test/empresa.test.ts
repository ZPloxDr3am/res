import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cnpjValido, cpfValido, dadosDaReceita, enderecoDoCep, enderecoLinha, formatarCep, formatarCnpj, formatarTelefone, telefoneValido } from '../src/empresa.js';

test('CNPJ e CPF com dígito verificador (D-077)', () => {
  assert.equal(cnpjValido('19.131.243/0001-97'), true);
  assert.equal(cnpjValido('19131243000198'), false);
  assert.equal(cnpjValido('11111111111111'), false);
  assert.equal(cpfValido('529.982.247-25'), true);
  assert.equal(cpfValido('52998224724'), false);
  assert.equal(cpfValido('00000000000'), false);
  assert.equal(formatarCnpj('19131243000197'), '19.131.243/0001-97');
  assert.equal(formatarCep('89107000'), '89107-000');
});

test('telefone com DDD', () => {
  assert.equal(telefoneValido('(47) 99999-0000'), true);
  assert.equal(telefoneValido('+55 47 3387-1234'), true);
  assert.equal(telefoneValido('9999-0000'), false);
  assert.equal(formatarTelefone('47999990000'), '(47) 99999-0000');
  assert.equal(formatarTelefone('4733871234'), '(47) 3387-1234');
});

test('leitura da Receita (BrasilAPI) e do CEP', () => {
  const r = dadosDaReceita({
    razao_social: 'PIZZARIA DO ZE LTDA', nome_fantasia: 'PIZZARIA DO ZE', descricao_tipo_de_logradouro: 'RUA', logradouro: 'XV DE NOVEMBRO',
    numero: '100', complemento: 'SALA 2', bairro: 'CENTRO', municipio: 'POMERODE', uf: 'sc', cep: '89107000', ddd_telefone_1: '4733871234',
    email: 'CONTATO@ZE.COM', descricao_situacao_cadastral: 'ATIVA', cnae_fiscal_descricao: 'Restaurantes e similares',
  });
  assert.equal(r.nome_fantasia, 'Pizzaria do Ze');
  assert.equal(r.logradouro, 'Rua XV de Novembro');
  assert.equal(r.cidade, 'Pomerode');
  assert.equal(r.uf, 'SC');
  assert.equal(r.cep, '89107-000');
  assert.equal(r.telefone, '(47) 3387-1234');
  assert.equal(r.ativa, true);
  assert.equal(dadosDaReceita({ descricao_situacao_cadastral: 'BAIXADA' }).ativa, false);
  const c = enderecoDoCep({ cep: '89107000', state: 'SC', city: 'Pomerode', neighborhood: 'Centro', street: 'Rua XV de Novembro', location: { coordinates: { latitude: '-26.74', longitude: '-49.17' } } });
  assert.deepEqual([c.cidade, c.uf, c.lat, c.lng], ['Pomerode', 'SC', -26.74, -49.17]);
  assert.equal(enderecoDoCep({ cep: '89107-000', localidade: 'Pomerode', uf: 'SC', logradouro: 'Rua A', bairro: 'Centro' }).cidade, 'Pomerode');
  assert.equal(enderecoLinha({ logradouro: 'Rua A', numero: '', complemento: '', bairro: 'Centro' }), 'Rua A, s/n - Centro');
});
