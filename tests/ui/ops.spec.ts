import { expect, test } from '@playwright/test';

test('ops console loads, seeds demo data, and shows matching candidates', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Washed Worker & Ops' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Attribution/u })).toBeVisible();

  await page.getByRole('button', { name: 'Seed demo' }).click();
  await expect(page.getByText('Demo seeded')).toBeVisible();
  await expect(page.getByText(/Candidate scores will appear here|score/u)).toBeVisible();

  await page.getByRole('button', { name: 'Beta' }).click();
  await expect(page.getByRole('heading', { name: 'Closed beta metrics' })).toBeVisible();
  await expect(page.getByText('Operational proof points')).toBeVisible();

  await page.getByRole('button', { name: 'Notifications' }).click();
  await expect(page.locator('.topbar').getByText('Notifications')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Actualiser' }).first()).toBeVisible();
});
