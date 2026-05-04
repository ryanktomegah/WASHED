import { expect, test } from '@playwright/test';

const screenRoutes = [
  ['x-10-hub', '/#/hub', 'X-10'],
  ['x-11-detail', '/#/visit/detail', 'X-11'],
  ['x-11m-reschedule', '/#/visit/reschedule', 'X-11.M'],
  ['x-12-en-route', '/#/visit/en-route', 'X-12'],
  ['x-13-in-progress', '/#/visit/in-progress', 'X-13'],
  ['x-14-reveal', '/#/visit/reveal', 'X-14'],
  ['x-15-feedback', '/#/visit/feedback', 'X-15'],
  ['x-15s-issue', '/#/visit/issue', 'X-15.S'],
] as const;

test.describe('Subscriber visit flow X-11 → X-15', () => {
  // Most tests target post-onboarding state — pre-mark the X-09 first-session
  // tour completed so the hub renders clean. The tour itself has its own spec
  // below where the flag is explicitly cleared.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('washed.x09.completed', '1');
    });
  });

  for (const [slug, route, screenId] of screenRoutes) {
    test(`${screenId} deep-link capture`, async ({ page }, testInfo) => {
      await page.goto(route);

      await expect(page.locator(`[data-screen-id="${screenId}"]`)).toBeVisible();

      if (screenId === 'X-12') {
        await expect(page.getByLabel('Carte de suivi')).toBeVisible();
        await expect(page.getByText('800 m')).toBeVisible();
        await expect(page.getByText('8 min')).toBeVisible();
      }

      if (screenId === 'X-14') {
        await expect(page.getByLabel('Photos avant et après')).toBeVisible();
        await expect(page.getByText('Avant — 9 h 01')).toBeVisible();
        await expect(page.getByText('Après — 10 h 04')).toBeVisible();
      }

      if (screenId === 'X-10') {
        await expect(page.getByText('Prochaine visite')).toBeVisible();
        await expect(page.getByText('Mardi')).toBeVisible();
        await expect(page.getByText('9 h 00')).toBeVisible();
        await expect(page.getByText('Akouvi K.')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Accueil' })).toHaveAttribute(
          'aria-current',
          'page',
        );
      }

      const screenshotPath = testInfo.outputPath(`${slug}-${testInfo.project.name}.png`);
      await page.screenshot({ fullPage: true, path: screenshotPath });
      await testInfo.attach(`${slug}-${testInfo.project.name}`, {
        contentType: 'image/png',
        path: screenshotPath,
      });
    });
  }

  test('X-11 routes to tracking, reschedule, and issue branch', async ({ page }) => {
    await page.goto('/#/visit/detail');

    await page.getByRole('button', { name: 'Suivre Akouvi' }).click();
    await expect(page).toHaveURL(/#\/visit\/en-route/u);
    await expect(page.locator('[data-screen-id="X-12"]')).toBeVisible();

    await page.goto('/#/visit/detail');
    await page.getByRole('button', { name: 'Reporter' }).click();
    await expect(page).toHaveURL(/#\/visit\/reschedule/u);
    await expect(page.locator('[data-screen-id="X-11.M"]')).toBeVisible();
    await page.locator('label.visit-choice', { hasText: 'Samedi 9 mai' }).click();
    await page.getByRole('button', { name: 'Confirmer le report' }).click();
    await expect(page).toHaveURL(/#\/visit\/detail/u);

    await page.goto('/#/visit/detail');
    await page.getByRole('button', { name: 'Signaler un souci' }).click();
    await expect(page).toHaveURL(/#\/visit\/issue/u);
    await expect(page.locator('[data-screen-id="X-15.S"]')).toBeVisible();
  });

  test('X-14 reveal routes to good feedback and issue reporting', async ({ page }) => {
    await page.goto('/#/visit/reveal');

    await expect(page.getByLabel('Photos avant et après')).toBeVisible();
    await page.getByRole('button', { name: 'Tout va bien' }).click();
    await expect(page).toHaveURL(/#\/visit\/feedback/u);
    await expect(page.locator('[data-screen-id="X-15"]')).toBeVisible();
    await page.getByRole('button', { name: "Retour à l'accueil" }).click();
    await expect(page).toHaveURL(/#\/hub/u);
    await expect(page.locator('[data-screen-id="X-10"]')).toBeVisible();

    await page.goto('/#/visit/reveal');
    await page.getByRole('button', { name: 'Signaler un souci' }).click();
    await expect(page).toHaveURL(/#\/visit\/issue/u);
    await page.locator('label.visit-choice', { hasText: 'Linge mal lavé' }).click();
    await page.getByRole('button', { name: 'Suivant · ajouter photos' }).click();
    await expect(page).toHaveURL(/#\/visit\/issue\/submitted/u);
    await expect(page.getByRole('heading', { name: 'Signalement reçu.' })).toBeVisible();
    await page.getByRole('button', { name: "Retour à l'accueil" }).click();
    await expect(page).toHaveURL(/#\/hub/u);
    await expect(page.locator('[data-screen-id="X-10"]')).toBeVisible();
  });

  test('X-13 close action lands on the X-10 hub', async ({ page }) => {
    await page.goto('/#/visit/in-progress');

    await page.getByRole('button', { name: "Fermer l'app sereinement" }).click();
    await expect(page).toHaveURL(/#\/hub/u);
    await expect(page.locator('[data-screen-id="X-10"]')).toBeVisible();
  });

});

// The X-09 first-session tour belongs to its own describe so it does NOT
// inherit the parent suite's `localStorage.setItem('washed.x09.completed', '1')`
// init script — that pre-set would suppress the tour we're trying to assert.
test.describe('Subscriber tour X-09 (first session)', () => {
  test('mounts on a fresh hub, walks 3 steps, persists the completed flag', async ({
    page,
  }, testInfo) => {
    await page.goto('/#/hub');

    const dialog = page.locator('[data-screen-id="X-09"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('role', 'dialog');
    await expect(page.getByText(/1 \/ 3 · DÉCOUVERTE/u)).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Votre prochaine visite est ici.' }),
    ).toBeVisible();

    const screenshotPath = testInfo.outputPath(`x-09-tour-step1-${testInfo.project.name}.png`);
    await page.screenshot({ fullPage: true, path: screenshotPath });
    await testInfo.attach(`x-09-tour-step1-${testInfo.project.name}`, {
      contentType: 'image/png',
      path: screenshotPath,
    });

    await page.getByRole('button', { name: 'Suivant' }).click();
    await expect(
      page.getByRole('heading', { name: 'Votre laveuse, toujours la même.' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Suivant' }).click();
    await expect(page.getByRole('heading', { name: 'Une relation qui dure.' })).toBeVisible();

    await page.getByRole('button', { name: 'Commencer' }).click();
    await expect(dialog).toBeHidden();

    // Reload — the localStorage flag should keep the tour from re-mounting.
    await page.reload();
    await expect(dialog).toBeHidden();
    await expect(page.locator('[data-screen-id="X-10"]')).toBeVisible();
  });
});
