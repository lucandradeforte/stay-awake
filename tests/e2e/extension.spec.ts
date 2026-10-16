import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import { resolve } from 'node:path';
let context: BrowserContext;
let extensionId = '';
test.beforeAll(async () => {
  const extensionPath = resolve('apps/extension/dist');
  context = await chromium.launchPersistentContext('', {
    channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`]
  });
  let [worker] = context.serviceWorkers();
  if (!worker) worker = await context.waitForEvent('serviceworker');
  extensionId = new URL(worker.url()).host;
});
test.afterAll(async () => { await context?.close(); });

test('popup can start and stop a timed session', async () => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(page.getByText('Pronto para iniciar')).toBeVisible();
  await page.getByRole('button', { name: /iniciar sessão/i }).click();
  await expect(page.getByText('Solicitação ativa')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Solicitação ativa')).toBeVisible();
  await page.getByRole('button', { name: /parar sessão/i }).click();
  await expect(page.getByText('Pronto para iniciar')).toBeVisible();
  await page.close();
});

test('workspace persists its theme and protects experimental lab by opt-in', async () => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/workspace.html`);
  await expect(page.getByRole('heading', {name:/seu espaço/i})).toBeVisible();
  await page.getByRole('button', {name:'Alternar tema'}).click();
  await expect(page.locator('body')).toHaveAttribute('data-theme','light');
  await page.getByRole('button', { name:'Configurações' }).click();
  await page.getByRole('switch', { name:/Ativar Developer Lab/i }).click();
  await page.getByRole('button', {name:'Developer Lab'}).click();
  await expect(page.getByText(/Media Lab/)).toBeVisible();
  await page.close();
});
