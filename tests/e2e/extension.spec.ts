import { test as base, expect, chromium, type BrowserContext, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import type { Command, Response } from '../../packages/contracts/src/index';

type Extension = { context: BrowserContext; page: Page; url: (entry: string) => string };
const test = base.extend<{ extension: Extension }>({
  extension: async ({ browserName }, provide) => {
    expect(browserName).toBe('chromium');
    const extensionPath = resolve(process.env.EXTENSION_PATH ?? 'apps/extension/dist');
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: true,
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    });
    try {
      let [worker] = context.serviceWorkers();
      if (!worker) worker = await context.waitForEvent('serviceworker');
      const id = new URL(worker.url()).host;
      const url = (entry: string) => `chrome-extension://${id}/${entry}.html`;
      const page = await context.newPage();
      const errors: string[] = [];
      context.on('page', (tab) => {
        tab.on('pageerror', (error) => errors.push(error.message));
        tab.on('console', (event) => {
          if (event.type() === 'error') errors.push(event.text());
        });
      });
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (event) => {
        if (event.type() === 'error') errors.push(event.text());
      });
      await page.goto(url('popup'));
      await provide({ context, page, url });
      expect(errors, 'Unexpected application exceptions').toEqual([]);
    } finally {
      await context.close();
    }
  },
});
async function command(page: Page, input: Command) {
  const response = await page.evaluate(
    async (input) => (await chrome.runtime.sendMessage(input)) as Response,
    input,
  );
  if (!response.ok) throw new Error(response.error);
  return response.data;
}
async function screenshot(page: Page, name: string) {
  if (!process.env.STAY_AWAKE_EVIDENCE_DIR) return;
  await mkdir(process.env.STAY_AWAKE_EVIDENCE_DIR, { recursive: true });
  await page.screenshot({
    path: resolve(process.env.STAY_AWAKE_EVIDENCE_DIR, name),
    fullPage: true,
  });
}

test('popup starts/stops offline, persists state after reopening, and stays dark', async ({
  extension: { context, page, url },
}) => {
  await context.setOffline(true);
  await expect(page).toHaveTitle(/Stay Awake/);
  await expect(page.getByText('Pronto para iniciar')).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole('button', { name: '15 min', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: '15 min', exact: true }).click();
  await page.getByRole('button', { name: /iniciar sessão/i }).click();
  await expect(page.getByText('Solicitação ativa', { exact: true })).toBeVisible();
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto(url('popup'));
  await expect(reopened.getByText('Solicitação ativa', { exact: true })).toBeVisible();
  await expect(reopened.locator('body')).toHaveAttribute('data-theme', 'dark');
  await screenshot(reopened, 'popup-active.png');
  await reopened.getByRole('button', { name: /parar sessão/i }).click();
  await expect(reopened.getByText('Pronto para iniciar')).toBeVisible();
});

test('workspace persists theme, protects Lab opt-in, and keeps popup dark', async ({
  extension: { context, page, url },
}) => {
  await page.goto(url('workspace'));
  await expect(page.getByRole('heading', { name: /seu espaço/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Developer Lab', exact: true })).toHaveCount(0);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await screenshot(page, 'workspace-dark.png');
  await page.getByRole('button', { name: 'Alternar tema' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'light');
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'light');
  await screenshot(page, 'workspace-light.png');
  const popup = await context.newPage();
  await popup.goto(url('popup'));
  await expect(popup.locator('body')).toHaveAttribute('data-theme', 'dark');
  await popup.close();
  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  await page.getByRole('switch', { name: /Ativar Developer Lab/i }).click();
  await page.getByRole('button', { name: 'Developer Lab', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Media Lab/ })).toBeVisible();
});

test('system/unlimited survives restart-duration and shows the warning badge', async ({
  extension: { page },
}) => {
  await page.getByRole('button', { name: 'Sem limite', exact: true }).click();
  await expect(page.getByText(/aumentar o consumo de bateria/)).toBeVisible();
  await page.getByRole('button', { name: 'Só sistema', exact: true }).click();
  await page.getByRole('button', { name: /iniciar sessão/i }).click();
  await expect(page.getByText('Solicitação ativa', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Reiniciar prazo/i }).click();
  const snapshot = await command(page, { type: 'SESSION_GET' });
  expect(snapshot.session.durationMinutes).toBeNull();
  expect(snapshot.session.level).toBe('system');
  expect(await page.evaluate(() => chrome.alarms.getAll())).toEqual([]);
  expect(await page.evaluate(() => chrome.action.getBadgeText({}))).toBe('∞');
  await page.getByRole('button', { name: /parar sessão/i }).click();
  await expect.poll(() => page.evaluate(() => chrome.action.getBadgeText({}))).toBe('');
});

test('worker termination restores a finite session and its lost alarm', async ({
  extension: { context, page },
}) => {
  const initial = await command(page, {
    type: 'SESSION_START',
    level: 'display',
    durationMinutes: 1,
  });
  await page.evaluate(() => chrome.alarms.clearAll());
  const cdp = await context.newCDPSession(page);
  await cdp.send('ServiceWorker.enable');
  await cdp.send('ServiceWorker.stopAllWorkers');
  await page.reload();
  await expect(page.getByText('Solicitação ativa', { exact: true })).toBeVisible();
  const restored = await command(page, { type: 'SESSION_GET' });
  expect(restored.session.id).toBe(initial.session.id);
  expect((await page.evaluate(() => chrome.alarms.getAll())).map((a) => a.name)).toEqual([
    `stay-awake:expire:${initial.session.id}`,
  ]);
});

test('a one-minute native alarm expires with every UI page closed', async ({
  extension: { context, page, url },
}) => {
  test.setTimeout(90_000);
  await command(page, { type: 'SESSION_START', level: 'display', durationMinutes: 1 });
  await Promise.all(context.pages().map((tab) => tab.close()));
  await expect
    .poll(
      async () => {
        let [worker] = context.serviceWorkers();
        if (!worker) worker = await context.waitForEvent('serviceworker');
        return worker.evaluate(
          async () => (await chrome.storage.local.get('stayAwakeSession')).stayAwakeSession?.status,
        );
      },
      { timeout: 75_000, intervals: [1000, 3000] },
    )
    .toBe('expired');
  const reopened = await context.newPage();
  await reopened.goto(url('popup'));
  await expect(reopened.getByText('Expirada', { exact: true })).toBeVisible();
  expect(await reopened.evaluate(() => chrome.alarms.getAll())).toEqual([]);
  expect(await reopened.evaluate(() => chrome.action.getBadgeText({}))).toBe('');
});

test('visible generated video plays, pauses, resumes, and releases on navigation', async ({
  extension: { page, url },
}) => {
  await command(page, { type: 'PREFERENCES_SET', patch: { developerModeEnabled: true } });
  await page.goto(url('workspace') + '#developer');
  await expect(page.getByRole('heading', { name: /Media Lab/ })).toBeVisible();
  await page.getByRole('button', { name: 'Iniciar reprodução' }).click();
  await expect(page.getByText('Reproduzindo vídeo gerado', { exact: true })).toBeVisible();
  expect(
    await page.locator('video').evaluate((video: HTMLVideoElement) => ({
      paused: video.paused,
      tracks: (video.srcObject as MediaStream).getTracks().length,
    })),
  ).toEqual({ paused: false, tracks: 1 });
  await page.getByRole('button', { name: 'Pausar / retomar' }).click();
  await expect(page.getByText('Pausado', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pausar / retomar' }).click();
  await expect(page.getByText('Reproduzindo vídeo gerado', { exact: true })).toBeVisible();
  await screenshot(page, 'media-lab.png');
  await page.getByRole('button', { name: 'Parar', exact: true }).click();
  await expect(page.getByText('Parado', { exact: true })).toBeVisible();
  expect(
    await page.locator('video').evaluate((video: HTMLVideoElement) => video.srcObject),
  ).toBeNull();
  await page.getByRole('button', { name: 'Iniciar reprodução' }).click();
  await expect(page.getByText('Reproduzindo vídeo gerado', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sessão', exact: true }).click();
  await page.getByRole('button', { name: 'Developer Lab', exact: true }).click();
  await expect(page.getByText('Parado', { exact: true })).toBeVisible();
});

test('diagnostics are local, reset clears preferences and power state', async ({
  extension: { page, url },
}) => {
  await command(page, { type: 'SESSION_START', level: 'display', durationMinutes: 1 });
  await command(page, {
    type: 'PREFERENCES_SET',
    patch: { workspaceTheme: 'light', developerModeEnabled: true },
  });
  await page.goto(url('workspace') + '#diagnostics');
  await expect(page.getByRole('heading', { name: 'Diagnósticos', exact: true })).toBeVisible();
  await expect(page.getByText('chrome.power', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Limpar eventos' }).click();
  await expect(page.getByText('Nenhum evento registrado.')).toBeVisible();
  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: /Encerrar sessão e apagar dados/ }).click();
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('switch', { name: /Ativar Developer Lab/ })).not.toBeChecked();
  expect((await command(page, { type: 'SESSION_GET' })).session.status).toBe('inactive');
});
