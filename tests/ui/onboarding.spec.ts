import { expect, test } from '@playwright/test';

test('X-01 splash · Savane palette, FR-default, EN disabled per D-06', async ({ page }) => {
  await page.goto('/#/welcome');

  await expect(page.locator('[data-screen-id="X-01"]')).toBeVisible();
  await expect(page.getByText("L'APPLI LAVEUSE POUR LOMÉ")).toBeVisible();
  await expect(page.getByRole('button', { name: 'Français' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'English' })).toBeDisabled();
  await expect(page.getByText('Bientôt disponible').first()).toBeVisible();

  await page.screenshot({ path: 'playwright-report/x-01-splash.png', fullPage: true });
});

test('X-02 phone · ÉTAPE 1 / 4, +228 prefix, CTA disabled until 8 digits', async ({ page }) => {
  await page.goto('/#/signup/phone');

  await expect(page.locator('[data-screen-id="X-02"]')).toBeVisible();
  await expect(page.getByText('Étape 1 sur 4')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Votre numéro de téléphone.' })).toBeVisible();
  await expect(page.getByText('+228')).toBeVisible();

  const cta = page.getByRole('button', { name: 'Recevoir le code' });
  await expect(cta).toBeDisabled();

  await page.getByRole('textbox', { name: 'Numéro' }).fill('90123456');
  await expect(page.getByRole('textbox', { name: 'Numéro' })).toHaveValue('90 12 34 56');
  await expect(cta).toBeEnabled();

  await page.screenshot({ path: 'playwright-report/x-02-phone.png', fullPage: true });
});

test('X-03 OTP · ÉTAPE 2 / 4, 6 cells, resend timer ticking, modifier link', async ({ page }) => {
  await page.goto('/#/signup/phone');
  await page.getByRole('textbox', { name: 'Numéro' }).fill('90123456');
  await page.getByRole('button', { name: 'Recevoir le code' }).click();

  await expect(page.locator('[data-screen-id="X-03"]')).toBeVisible();
  await expect(page.getByText('Étape 2 sur 4')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Le code reçu par SMS.' })).toBeVisible();
  await expect(page.getByLabel('Le code reçu par SMS.').getByRole('textbox')).toHaveCount(6);
  await expect(page.getByRole('button', { name: 'Modifier' })).toBeVisible();
  await expect(page.getByText(/Renvoyer dans \d+ s/u)).toBeVisible();

  await page.screenshot({ path: 'playwright-report/x-03-otp.png', fullPage: true });
});

test('X-02 → X-03 navigation forwards the +228 phone in signup state', async ({ page }) => {
  await page.goto('/#/signup/phone');

  await page.getByRole('textbox', { name: 'Numéro' }).fill('90123456');
  await page.getByRole('button', { name: 'Recevoir le code' }).click();

  await expect(page).toHaveURL(/#\/signup\/otp/u);
  await expect(page.locator('[data-screen-id="X-03"]')).toBeVisible();
  await expect(page.getByText(/\+228 90 ●● ●● 56/u)).toBeVisible();
});

test('X-04 → X-08 complete signup flow', async ({ page }) => {
  await page.goto('/#/signup/phone');
  await page.getByRole('textbox', { name: 'Numéro' }).fill('90123456');
  await page.getByRole('button', { name: 'Recevoir le code' }).click();

  await expect(page.locator('[data-screen-id="X-03"]')).toBeVisible();
  await page.getByLabel('Chiffre 1').fill('123456');

  await expect(page.locator('[data-screen-id="X-04"]')).toBeVisible();
  await expect(page.getByText('Étape 3 sur 4')).toBeVisible();
  await page.getByLabel('Quartier').selectOption('Tokoin Forever');
  await page.getByLabel('Rue / détail').fill('rue 254, maison bleue');
  await page.getByRole('button', { name: 'Continuer' }).click();

  await expect(page.locator('[data-screen-id="X-05"]')).toBeVisible();
  await expect(page.getByText('Étape 4 sur 4')).toBeVisible();
  await page.locator('label.tier-card', { hasText: 'Deux visites' }).click();
  await page.getByRole('button', { name: /Continuer · 4/u }).click();

  await expect(page.locator('[data-screen-id="X-06"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Le moyen de paiement.' })).toBeVisible();
  await page.locator('label.provider-card', { hasText: 'Flooz' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();

  await expect(page.locator('[data-screen-id="X-07"]')).toBeVisible();
  await expect(page.getByText('Récap')).toBeVisible();
  await expect(page.getByRole('button', { name: "Confirmer l'abonnement" })).toBeDisabled();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: "Confirmer l'abonnement" }).click();

  await expect(page.locator('[data-screen-id="X-08"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bienvenue chez Washed.' })).toBeVisible();

  await page.getByRole('button', { name: 'Voir mon accueil' }).click();
  await expect(page).toHaveURL(/#\/hub/u);
  await expect(page.locator('[data-screen-id="X-10"]')).toBeVisible();
});

test('X-01 Français button routes to X-02 phone', async ({ page }) => {
  await page.goto('/#/welcome');

  await page.getByRole('button', { name: 'Français' }).click();

  await expect(page).toHaveURL(/#\/signup\/phone/u);
  await expect(page.locator('[data-screen-id="X-02"]')).toBeVisible();
});

test('X-01 visual contract · ink background, Fraunces wordmark', async ({ page }) => {
  await page.goto('/#/welcome');

  const main = page.locator('[data-screen-id="X-01"]');
  await expect(main).toBeVisible();

  const bgColor = await main.evaluate((el) => getComputedStyle(el).backgroundColor);
  // Subscriber theme ink token: #1C1208 → rgb(28, 18, 8)
  expect(bgColor).toBe('rgb(28, 18, 8)');

  const wordmark = page.locator('.splash-mark');
  const fontFamily = await wordmark.evaluate((el) => getComputedStyle(el).fontFamily);
  expect(fontFamily.toLowerCase()).toContain('fraunces');

  const fontStyle = await wordmark.evaluate((el) => getComputedStyle(el).fontStyle);
  expect(fontStyle).toBe('italic');
});

test('X-02 visual contract · Savane cream background, primary terracotta CTA', async ({ page }) => {
  await page.goto('/#/signup/phone');
  await page.getByRole('textbox', { name: 'Numéro' }).fill('90123456');

  const main = page.locator('[data-screen-id="X-02"]');
  const bgColor = await main.evaluate((el) => getComputedStyle(el).backgroundColor);
  // Subscriber theme bg token: #FAF6F0 → rgb(250, 246, 240)
  expect(bgColor).toBe('rgb(250, 246, 240)');

  // Verify the design-tokens contract is wired end-to-end:
  // body has data-theme="subscriber" → --primary resolves to the Savane
  // terracotta hex → the CTA inherits that var via the .btn.primary rule.
  const themeAttr = await page.evaluate(() => document.body.getAttribute('data-theme'));
  expect(themeAttr).toBe('subscriber');

  const primaryHex = await page.evaluate(() =>
    getComputedStyle(document.body).getPropertyValue('--primary').trim(),
  );
  expect(primaryHex.toUpperCase()).toBe('#C4622D');
});
