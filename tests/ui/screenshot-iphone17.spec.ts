import { expect, test } from '@playwright/test';

test('capture all 8 onboarding screens at iPhone 15/16/17 (393×852)', async ({ page }) => {
  await page.goto('/#/welcome');
  await expect(page.locator('[data-screen-id="X-01"]')).toBeVisible();
  await page.screenshot({ path: 'screenshots/x01-splash-iphone17.png', fullPage: true });

  await page.goto('/#/signup/phone');
  await expect(page.locator('[data-screen-id="X-02"]')).toBeVisible();
  await page.screenshot({ path: 'screenshots/x02-phone-iphone17.png', fullPage: true });

  await page.getByRole('textbox', { name: 'Numéro' }).fill('90123456');
  await page.screenshot({ path: 'screenshots/x02-phone-iphone17-filled.png', fullPage: true });

  await page.getByRole('button', { name: 'Recevoir le code' }).click();
  await expect(page.locator('[data-screen-id="X-03"]')).toBeVisible();
  await page.screenshot({ path: 'screenshots/x03-otp-iphone17.png', fullPage: true });

  await page.getByLabel('Chiffre 1').fill('123456');
  await expect(page.locator('[data-screen-id="X-04"]')).toBeVisible();
  await page.screenshot({ path: 'screenshots/x04-address-iphone17.png', fullPage: true });

  await page.getByLabel('Quartier').selectOption('Tokoin Casablanca');
  await page.getByLabel('Rue / détail').fill('rue 254, maison bleue');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.locator('[data-screen-id="X-05"]')).toBeVisible();
  await page.screenshot({ path: 'screenshots/x05-tier-iphone17.png', fullPage: true });

  await page.getByRole('button', { name: /Continuer · 2/u }).click();
  await expect(page.locator('[data-screen-id="X-06"]')).toBeVisible();
  await page.screenshot({ path: 'screenshots/x06-payment-iphone17.png', fullPage: true });

  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.locator('[data-screen-id="X-07"]')).toBeVisible();
  await page.screenshot({ path: 'screenshots/x07-review-iphone17.png', fullPage: true });

  await page.getByRole('button', { name: "Confirmer l'abonnement" }).click();
  await expect(page.locator('[data-screen-id="X-08"]')).toBeVisible();
  await page.screenshot({ path: 'screenshots/x08-welcome-iphone17.png', fullPage: true });
});
