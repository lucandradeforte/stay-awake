import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`website content, navigation and accessibility at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    const response = await page.goto('http://127.0.0.1:4173/stay-awake/');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/Stay Awake/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.getByRole('link', { name: 'Como instalar' }).click();
    await expect(page).toHaveURL(/#install$/);
    await expect(
      page.getByRole('heading', { name: 'Instalação em poucos passos.' }),
    ).toBeInViewport();
    await page.getByText('Ela impede o bloqueio do Windows?', { exact: true }).click();
    await expect(page.getByText(/Não há garantia. Bloqueio manual/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const accessibility = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(accessibility.violations).toEqual([]);
    expect(errors).toEqual([]);
    if (process.env.STAY_AWAKE_EVIDENCE_DIR) {
      await mkdir(process.env.STAY_AWAKE_EVIDENCE_DIR, { recursive: true });
      await page.goto('http://127.0.0.1:4173/stay-awake/');
      await page.screenshot({
        path: resolve(process.env.STAY_AWAKE_EVIDENCE_DIR, `website-${viewport.width}.png`),
        fullPage: true,
      });
    }
  });
}
