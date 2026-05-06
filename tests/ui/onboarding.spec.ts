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

async function continueThroughLaunchPreferences(page: Page): Promise<void> {
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

test('X-01 splash · French subscriber entry', async ({ page }) => {
  await page.goto('/#/welcome');
  await continueThroughLaunchPreferences(page);

  await expect(page.locator('[data-screen-id="X-01"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Washed' })).toBeVisible();
  await expect(page.getByText("L'app abonné · Lomé")).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuer' })).toBeEnabled();
  await expect(page.getByRole('button', { name: "J'ai déjà un compte" })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'English' })).toHaveCount(0);

  await page.screenshot({ path: 'playwright-report/x-01-splash.png', fullPage: true });
});

test('X-00L language choice can launch the subscriber app in English', async ({ page }) => {
  await page.goto('/#/welcome');

  await expect(page.locator('[data-screen-id="X-00L"]')).toBeVisible();
  await page.getByRole('radio', { name: /English/u }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.locator('[data-screen-id="X-00A"]')).toBeVisible();
  await page.getByRole('radio', { name: /Light/u }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page).toHaveURL(/#\/signup\/phone/u);
  await expect(page.locator('[data-screen-id="X-02"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your phone number.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send the code' })).toBeVisible();
  const storedLocale = await page.evaluate(() => window.localStorage.getItem('washed.locale'));
  expect(storedLocale).toBe('en');
});

test('X-02 phone · ÉTAPE 1 / 5, +228 prefix, CTA disabled until 8 digits', async ({ page }) => {
  await page.goto('/#/signup/phone');
  await continueThroughLaunchPreferences(page);

  await expect(page.locator('[data-screen-id="X-02"]')).toBeVisible();
  await expect(page.getByText('Étape 1 / 5')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Votre numéro de téléphone' })).toBeVisible();
  await expect(page.getByText('+228')).toBeVisible();

  const cta = page.getByRole('button', { name: 'Recevoir le code' });
  await expect(cta).toBeDisabled();

  await page.getByRole('textbox', { name: 'Numéro' }).fill('90123456');
  await expect(page.getByRole('textbox', { name: 'Numéro' })).toHaveValue('90 12 34 56');
  await expect(cta).toBeEnabled();

  await page.screenshot({ path: 'playwright-report/x-02-phone.png', fullPage: true });
});

test('X-03 OTP · ÉTAPE 2 / 5, 6 cells, resend timer ticking, call link', async ({ page }) => {
  await page.goto('/#/signup/phone');
  await continueThroughLaunchPreferences(page);
  await page.getByRole('textbox', { name: 'Numéro' }).fill('90123456');
  await page.getByRole('button', { name: 'Recevoir le code' }).click();

  await expect(page.locator('[data-screen-id="X-03"]')).toBeVisible();
  await expect(page.getByText('Étape 2 / 5')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Le code reçu par SMS' })).toBeVisible();
  await expect(page.getByLabel('Le code reçu par SMS').getByRole('textbox')).toHaveCount(6);
  await expect(page.getByRole('button', { name: 'Modifier' })).toHaveCount(0);
  await expect(page.getByText(/Renvoyer dans 0:\d+ s/u)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Appeler le bureau' })).toBeVisible();

  await page.screenshot({ path: 'playwright-report/x-03-otp.png', fullPage: true });
});

test('X-02 → X-03 navigation forwards the +228 phone in signup state', async ({ page }) => {
  await page.goto('/#/signup/phone');
  await continueThroughLaunchPreferences(page);

  await page.getByRole('textbox', { name: 'Numéro' }).fill('90123456');
  await page.getByRole('button', { name: 'Recevoir le code' }).click();

  await expect(page).toHaveURL(/#\/signup\/otp/u);
  await expect(page.locator('[data-screen-id="X-03"]')).toBeVisible();
  await expect(page.getByText(/\+228 90 •••• 56/u)).toBeVisible();
});

test('X-03I → X-10 complete signup flow personalizes the first-time hub', async ({ page }) => {
  await page.goto('/#/signup/phone');
  await continueThroughLaunchPreferences(page);
  await page.getByRole('textbox', { name: 'Numéro' }).fill('90123456');
  await page.getByRole('button', { name: 'Recevoir le code' }).click();

  await expect(page.locator('[data-screen-id="X-03"]')).toBeVisible();
  await page.getByLabel('Chiffre 1').fill('123456');

  await expect(page.locator('[data-screen-id="X-03I"]')).toBeVisible();
  await expect(page.getByText('Étape 3 / 5')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Vos informations' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuer' })).toBeDisabled();
  await page.getByRole('textbox', { name: 'Prénom' }).fill('Afi');
  await page.getByRole('textbox', { name: 'Nom', exact: true }).fill('Mensah');
  await page.getByRole('textbox', { name: 'Email (facultatif)' }).fill('afi@email.com');
  await page.locator('[data-screen-id="X-03I"] .consent-row').click();
  await page.getByRole('button', { name: 'Continuer' }).click();

  await expect(page.locator('[data-screen-id="X-04"]')).toBeVisible();
  await expect(page.getByText('Étape 4 / 5')).toBeVisible();
  await page.getByLabel('Quartier').selectOption('Tokoin Casablanca');
  await page.getByLabel('Rue / détail').fill('rue 254, maison bleue');
  await page.getByRole('button', { name: 'Continuer' }).click();

  await expect(page.locator('[data-screen-id="X-05"]')).toBeVisible();
  await expect(page.getByText('Étape 5 / 5')).toBeVisible();
  await expect(page.locator('label.tier-card', { hasText: '1 visite / mois' })).toBeVisible();
  await page.getByRole('button', { name: /Continuer · 2/u }).click();

  await expect(page.locator('[data-screen-id="X-06"]')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Ajoutez votre moyen de paiement' }),
  ).toBeVisible();
  await expect(page.getByText('Mixx by Yas', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Numéro Mobile Money' })).toHaveValue(
    '90 12 34 56',
  );
  await page.getByRole('button', { name: 'Continuer' }).click();

  await expect(page.locator('[data-screen-id="X-07"]')).toBeVisible();
  await expect(page.getByText('Récap')).toBeVisible();
  await expect(page.getByText('Afi Mensah')).toBeVisible();
  await expect(page.getByText('1 visite / mois')).toBeVisible();
  await expect(page.getByText('2 500 XOF')).toBeVisible();
  await expect(page.getByText('Mixx by Yas · 90 12…')).toBeVisible();
  await page.locator('.consent-row').click();
  await page.getByRole('button', { name: "Confirmer l'abonnement" }).click();

  await expect(page.locator('[data-screen-id="X-08"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bienvenue chez Washed.' })).toBeVisible();
  await expect(page.getByText(/Choisissez maintenant le jour et le moment/u)).toBeVisible();

  await page.getByRole('button', { name: 'Passer pour le moment' }).click();
  await expect(page).toHaveURL(/#\/hub/u);
  await expect(page.locator('[data-screen-id="X-10"]')).toBeVisible();
  await expect(page.getByText('bonjour Afi')).toBeVisible();
  await expect(page.getByText('bonjour Mariam')).not.toBeVisible();
});

test('X-08 skip for now enters the first-time hub without booking', async ({ page }) => {
  await page.goto('/#/signup/welcome');
  await continueThroughLaunchPreferences(page);

  await expect(page.locator('[data-screen-id="X-08"]')).toBeVisible();
  await page.getByRole('button', { name: 'Passer pour le moment' }).click();

  await expect(page).toHaveURL(/#\/hub/u);
  await expect(page.locator('[data-screen-id="X-10"]')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Planifiez votre première visite' }),
  ).toBeVisible();
});

test('X-08 first-time booking back returns to the welcome choice', async ({ page }) => {
  await page.goto('/#/signup/welcome');
  await continueThroughLaunchPreferences(page);

  await page.getByRole('button', { name: 'Planifier ma première visite' }).click();
  await expect(page).toHaveURL(/#\/booking/u);
  await expect(page.getByRole('heading', { name: 'Quel jour vous convient ?' })).toBeVisible();

  await page.getByRole('button', { name: 'Retour' }).click();
  await expect(page).toHaveURL(/#\/signup\/welcome/u);
  await expect(page.locator('[data-screen-id="X-08"]')).toBeVisible();

  await page.getByRole('button', { name: 'Planifier ma première visite' }).click();
  await page.getByText('Samedi').click();
  await expect(page.getByRole('heading', { name: 'Quel moment ce samedi ?' })).toBeVisible();

  await page.getByRole('button', { name: 'Retour' }).click();
  await expect(page).toHaveURL(/#\/booking/u);
  await expect(page.getByRole('heading', { name: 'Quel jour vous convient ?' })).toBeVisible();

  await page.getByRole('button', { name: 'Retour' }).click();
  await expect(page).toHaveURL(/#\/signup\/welcome/u);
});

test('X-01 continue button routes to X-02 phone', async ({ page }) => {
  await page.goto('/#/welcome');
  await continueThroughLaunchPreferences(page);

  await page.getByRole('button', { name: 'Continuer' }).click();

  await expect(page).toHaveURL(/#\/signup\/phone/u);
  await expect(page.locator('[data-screen-id="X-02"]')).toBeVisible();
});

test('X-01 visual contract · white background, green Geist wordmark', async ({ page }) => {
  await page.goto('/#/welcome');
  await continueThroughLaunchPreferences(page);

  const main = page.locator('[data-screen-id="X-01"]');
  await expect(main).toBeVisible();

  const bgColor = await main.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bgColor).toBe('rgb(255, 255, 255)');

  const wordmark = page.locator('.splash-mark');
  const fontFamily = await wordmark.evaluate((el) => getComputedStyle(el).fontFamily);
  expect(fontFamily.toLowerCase()).toContain('geist');

  const fontStyle = await wordmark.evaluate((el) => getComputedStyle(el).fontStyle);
  expect(fontStyle).toBe('normal');

  const color = await wordmark.evaluate((el) => getComputedStyle(el).color);
  expect(color).toBe('rgb(10, 61, 31)');
});

test('X-02 visual contract · light background, forest primary CTA', async ({ page }) => {
  await page.goto('/#/signup/phone');
  await continueThroughLaunchPreferences(page);
  await page.getByRole('textbox', { name: 'Numéro' }).fill('90123456');

  const main = page.locator('[data-screen-id="X-02"]');
  const bgColor = await main.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bgColor).toBe('rgb(255, 255, 255)');

  const themeAttr = await page.evaluate(() => document.body.getAttribute('data-theme'));
  expect(themeAttr).toBe('subscriber');

  const primaryHex = await page.evaluate(() =>
    getComputedStyle(document.body).getPropertyValue('--primary').trim(),
  );
  expect(primaryHex.toUpperCase()).toBe('#0A3D1F');
});
