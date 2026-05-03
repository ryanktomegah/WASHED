import { expect, test } from '@playwright/test';

test('capture all 3 onboarding screens at iPhone 15/16/17 (393×852)', async ({ page }) => {
  await page.goto('/#/welcome');
  await expect(page.locator('[data-screen-id="X-01"]')).toBeVisible();
  await page.screenshot({ path: 'screenshots/x01-splash-iphone17.png', fullPage: true });

  await page.goto('/#/signup/phone');
  await expect(page.locator('[data-screen-id="X-02"]')).toBeVisible();
  await page.screenshot({ path: 'screenshots/x02-phone-iphone17.png', fullPage: true });

  await page.getByRole('textbox', { name: 'Numéro' }).fill('90123456');
  await page.screenshot({ path: 'screenshots/x02-phone-iphone17-filled.png', fullPage: true });

  await page.goto('/#/signup/otp');
  await expect(page.locator('[data-screen-id="X-03"]')).toBeVisible();
  await page.screenshot({ path: 'screenshots/x03-otp-iphone17.png', fullPage: true });
});
