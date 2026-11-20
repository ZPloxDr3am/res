// Regressão do erro React #418 (divergência de hidratação no quadro de Pedidos).
// Causa: horas formatadas sem fuso (servidor em UTC × loja em Brasília) e textos com Date.now()
// calculados na renderização. Correção: <Relogio> com a hora do servidor + timeZone da loja.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const web = join(aqui, '..');

function renderizarNoFuso(tz: string): string {
  return execFileSync(process.execPath, ['--import', 'tsx', join(aqui, 'renderizar-relogio.tsx')], {
    cwd: web,
    env: { ...process.env, TZ: tz, TSX_TSCONFIG_PATH: join(aqui, 'tsconfig.json') },
    encoding: 'utf8',
  });
}

test('servidor em UTC e navegador em Brasília montam o mesmo HTML', () => {
  const servidor = renderizarNoFuso('UTC');
  const navegador = renderizarNoFuso('America/Sao_Paulo');
  assert.equal(servidor, navegador);
  // a 1ª renderização usa a hora do servidor (21:47:30), não a hora real da máquina
  assert.match(servidor, /há 27 min/);
  assert.match(servidor, /Saiu · 21:41/);
  assert.match(servidor, /amanhã 19:30/);
});

// Componentes montados na tela /pedidos (renderizados no servidor e hidratados no navegador)
const ARQUIVOS = ['components/quadro-pedidos.tsx', 'components/negociacoes-ifood.tsx'];

for (const arq of ARQUIVOS) {
  const linhas = readFileSync(join(web, arq), 'utf8').split('\n');

  test(`${arq}: não lê o relógio durante a renderização`, () => {
    const ruins = linhas
      .map((l, i) => ({ l, n: i + 1 }))
      .filter(({ l }) => /Date\.now\(\)|new Date\(\)/.test(l))
      // permitido: em cliques (onClick) e no relógio que só anda depois de montar (setAgora)
      .filter(({ l }) => !/onClick=|setAgora\(/.test(l));
    assert.deepEqual(ruins.map((r) => `${r.n}: ${r.l.trim()}`), [], 'use useAgora() (components/relogio.tsx)');
  });

  test(`${arq}: toda hora formatada tem o fuso da loja`, () => {
    const ruins = linhas
      .map((l, i) => ({ l, n: i + 1 }))
      .filter(({ l }) => /toLocale(Time|Date)?String\([^)]*hour/.test(l) && !/timeZone/.test(l));
    assert.deepEqual(ruins.map((r) => `${r.n}: ${r.l.trim()}`), [], 'passe { timeZone: fuso }');
  });
}
