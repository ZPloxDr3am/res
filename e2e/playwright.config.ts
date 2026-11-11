import { defineConfig } from '@playwright/test';

// URL vem do preview da Vercel (workflow e2e.yml) ou de E2E_URL ao rodar à mão.
export default defineConfig({
  testDir: '.',
  timeout: 120_000,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'relatorio' }]],
  use: {
    baseURL: process.env.E2E_URL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    // previews da Vercel podem pedir o cabeçalho de bypass quando a proteção estiver ligada
    extraHTTPHeaders: process.env.VERCEL_BYPASS ? { 'x-vercel-protection-bypass': process.env.VERCEL_BYPASS } : {},
  },
});
