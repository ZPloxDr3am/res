// Robô de ponta a ponta (D-095): a cada publicação de teste (preview da Vercel), faz um pedido de
// verdade no cardápio da "Loja Robô", entra no painel e leva o pedido até Concluídos.
// Pega o que os testes do banco não pegam: tela que não carrega, botão que não responde, middleware
// barrando rota, pedido que some do quadro.
// Precisa (segredos do GitHub): E2E_EMAIL, E2E_SENHA (login da Loja Robô) e E2E_CARDAPIO (endereço do
// cardápio dela, ex.: loja-robo). A Loja Robô é uma conta separada, ativa sem prazo, nunca uma loja real.
import { expect, test } from '@playwright/test';

const EMAIL = process.env.E2E_EMAIL ?? '';
const SENHA = process.env.E2E_SENHA ?? '';
const CARDAPIO = process.env.E2E_CARDAPIO ?? '';

test.skip(!EMAIL || !SENHA || !CARDAPIO, 'Sem os segredos E2E_EMAIL / E2E_SENHA / E2E_CARDAPIO: robô desligado.');

test('pedido do cardápio até Concluídos', async ({ page }) => {
  const nome = `Robô ${new Date().toISOString().slice(5, 16).replace('T', ' ')}`;

  // 1. Cliente faz o pedido no cardápio digital
  await page.goto(`/c/${CARDAPIO}`);
  await expect(page.getByRole('heading').first()).toBeVisible();
  await page.locator('button.pub-produto').first().click();
  await page.getByRole('button', { name: /Ver pedido/ }).click();
  await page.getByPlaceholder('(47) 99999-0000').fill('47900000000');
  await page.getByLabel('Nome').fill(nome);
  const retirada = page.getByLabel('Retirar na loja');
  if (await retirada.count()) await retirada.check();
  const dinheiro = page.getByLabel('Dinheiro');
  if (await dinheiro.count()) await dinheiro.check();
  await page.getByRole('button', { name: /Enviar pedido/ }).click();
  await expect(page).toHaveURL(/\/pedido\//, { timeout: 20_000 });
  await expect(page.getByText('Pedido enviado')).toBeVisible();

  // 2. Loja entra no painel
  await page.goto('/login');
  await page.locator('input[name=email]').fill(EMAIL);
  await page.locator('input[name=senha]').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20_000 });

  // 3. Quadro: o pedido aparece e anda até Concluídos pelo botão de cada etapa
  await page.goto('/pedidos?todas=0');
  const cartao = page.locator('.qk-cartao', { hasText: nome });
  await expect(cartao).toBeVisible({ timeout: 20_000 });
  for (let i = 0; i < 5; i++) {
    const concluido = page.locator('.qk-coluna[data-status=concluido] .qk-cartao', { hasText: nome });
    if (await concluido.count()) break;
    const acao = page.locator('.qk-coluna:not([data-status=concluido]):not([data-status=cancelado]) .qk-cartao', { hasText: nome }).locator('.qk-acao');
    await expect(acao).toBeEnabled({ timeout: 15_000 });
    await acao.click();
    await page.waitForTimeout(1500);
  }
  await expect(page.locator('.qk-coluna[data-status=concluido] .qk-cartao', { hasText: nome })).toBeVisible({ timeout: 20_000 });

  // 4. Telas principais abrem sem erro
  for (const rota of ['/resumo', '/cardapio', '/delivery', '/clientes', '/assinatura']) {
    const r = await page.goto(rota);
    expect(r?.status(), rota).toBeLessThan(400);
    await expect(page.getByText(/Algo deu errado|Application error/)).toHaveCount(0);
  }
});
