import { expect, test } from '@playwright/test';

test('capture all 3 onboarding screens at iPhone SE', async ({ page }) => {
  await page.goto('/#/welcome');
  await expect(page.locator('[data-screen-id="X-01"]')).toBeVisible();
  await page.screenshot({ path: 'screenshots/x01-splash-iphone-se.png', fullPage: true });

  await page.goto('/#/signup/phone');
  await expect(page.locator('[data-screen-id="X-02"]')).toBeVisible();
  await page.screenshot({ path: 'screenshots/x02-phone-iphone-se.png', fullPage: true });

  await page.getByRole('textbox', { name: 'Numéro' }).fill('90123456');
  await page.screenshot({ path: 'screenshots/x02-phone-filled.png', fullPage: true });

  await page.goto('/#/signup/otp');
  await expect(page.locator('[data-screen-id="X-03"]')).toBeVisible();
  await page.screenshot({ path: 'screenshots/x03-otp-iphone-se.png', fullPage: true });
});
