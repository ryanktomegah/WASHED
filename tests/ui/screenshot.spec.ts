import { expect, test, type Page } from '@playwright/test';

const SUBSCRIBER_APPEARANCE_STORAGE_KEY = 'washed.subscriber.appearance';
const SUBSCRIBER_LANGUAGE_STORAGE_KEY = 'washed.locale';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ([appearanceKey, languageKey]) => {
      window.localStorage.setItem(appearanceKey, 'light');
      window.localStorage.removeItem(languageKey);
    },
    [SUBSCRIBER_APPEARANCE_STORAGE_KEY, SUBSCRIBER_LANGUAGE_STORAGE_KEY],
  );
});

async function continueThroughAppearance(page: Page): Promise<void> {
  const languageGate = page.locator('[data-screen-id="X-00L"]');
  const languageGateAppeared = await languageGate
    .waitFor({ state: 'visible', timeout: 1000 })
    .then(() => true)
    .catch(() => false);
  if (languageGateAppeared) {
    await page.getByRole('radio', { name: /Français/u }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();
  }

  const gate = page.locator('[data-screen-id="X-00A"]');
  const gateAppeared = await gate
    .waitFor({ state: 'visible', timeout: 1000 })
    .then(() => true)
    .catch(() => false);
  if (!gateAppeared) return;

  await page.getByRole('radio', { name: /Clair/u }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
}

test('capture all 9 onboarding screens at iPhone SE', async ({ page }) => {
  test.setTimeout(60_000);

  await page.goto('/#/welcome');
  await continueThroughAppearance(page);
  await expect(page.locator('[data-screen-id="X-01"]')).toBeVisible();
  await page.screenshot({ path: 'screenshots/x01-splash-iphone-se.png', fullPage: true });

  await page.goto('/#/signup/phone');
  await continueThroughAppearance(page);
  await expect(page.locator('[data-screen-id="X-02"]')).toBeVisible();
  await page.screenshot({ path: 'screenshots/x02-phone-iphone-se.png', fullPage: true });

  await page.getByRole('textbox', { name: 'Numéro' }).fill('90123456');
  await page.screenshot({ path: 'screenshots/x02-phone-filled.png', fullPage: true });

  await page.getByRole('button', { name: 'Recevoir le code' }).click();
  await expect(page.locator('[data-screen-id="X-03"]')).toBeVisible();
  await page.screenshot({ path: 'screenshots/x03-otp-iphone-se.png', fullPage: true });

  await page.getByLabel('Chiffre 1').fill('123456');
  await expect(page.locator('[data-screen-id="X-03I"]')).toBeVisible();
  await page.screenshot({ path: 'screenshots/x03i-identity-iphone-se.png', fullPage: true });

  await page.getByRole('textbox', { name: 'Prénom' }).fill('Afi');
  await page.getByRole('textbox', { name: 'Nom', exact: true }).fill('Mensah');
  await page.getByRole('textbox', { name: 'Email (facultatif)' }).fill('afi@email.com');
  await page.locator('[data-screen-id="X-03I"] .consent-row').click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.locator('[data-screen-id="X-04"]')).toBeVisible();
  await page.screenshot({ path: 'screenshots/x04-address-iphone-se.png', fullPage: true });

  await page.getByLabel('Quartier').selectOption('Tokoin Casablanca');
  await page.getByLabel('Rue / détail').fill('rue 254, maison bleue');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.locator('[data-screen-id="X-05"]')).toBeVisible();
  await page.screenshot({ path: 'screenshots/x05-tier-iphone-se.png', fullPage: true });

  await page.getByRole('button', { name: /Continuer · 2/u }).click();
  await expect(page.locator('[data-screen-id="X-06"]')).toBeVisible();
  await page.screenshot({ path: 'screenshots/x06-payment-iphone-se.png', fullPage: true });

  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.locator('[data-screen-id="X-07"]')).toBeVisible();
  await page.screenshot({ path: 'screenshots/x07-review-iphone-se.png', fullPage: true });

  await page.locator('.consent-row').click();
  await page.getByRole('button', { name: "Confirmer l'abonnement" }).click();
  await expect(page.locator('[data-screen-id="X-08"]')).toBeVisible();
  await page.screenshot({ path: 'screenshots/x08-welcome-iphone-se.png', fullPage: true });
});
