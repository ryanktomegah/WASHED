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
  ['x-16-history', '/#/history', 'X-16'],
  ['x-17-history-detail', '/#/history/visit-2026-04-28', 'X-17'],
  ['x-18-worker-profile', '/#/worker/akouvi', 'X-18'],
  ['x-18c-worker-change', '/#/worker/akouvi/change', 'X-18.C'],
  ['x-18c-worker-change-submitted', '/#/worker/akouvi/change/submitted', 'X-18.C.S'],
] as const;

test.describe('Subscriber hub, visit, and relationship flows X-10 → X-18.C', () => {
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

      if (screenId === 'X-16') {
        await expect(page.getByText('Vos visites')).toBeVisible();
        await expect(page.getByText('Akouvi')).toBeVisible();
        await expect(page.getByText('32')).toBeVisible();
        await expect(page.getByText(/80\s000/u)).toBeVisible();
        await expect(page.getByRole('button', { name: /28 avr · 9 h 02/u })).toBeVisible();
      }

      if (screenId === 'X-17') {
        await expect(page.getByText('Visite · 28 avril')).toBeVisible();
        await expect(page.getByRole('heading', { name: /Bonne visite/u })).toBeVisible();
        await expect(page.getByLabel('Photos avant et après')).toBeVisible();
        await expect(page.getByText('Photo avant')).toBeVisible();
        await expect(page.getByText('9 h 03')).toBeVisible();
        await expect(page.getByText('Visite incluse au forfait')).toBeVisible();
      }

      if (screenId === 'X-18') {
        await expect(page.getByText('Profil de la laveuse')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Akouvi K.' })).toBeVisible();
        await expect(
          page.getByText('Tokoin · vit avec sa famille à 800 m de chez vous'),
        ).toBeVisible();
        await expect(page.getByText('Votre relation')).toBeVisible();
        await expect(page.getByText('Son parcours')).toBeVisible();
        await expect(page.getByText('Fiabilité')).toBeVisible();
      }

      if (screenId === 'X-18.C') {
        await expect(page.getByText('Changer de laveuse')).toBeVisible();
        await expect(
          page.getByRole('heading', { name: 'Pourquoi voulez-vous changer ?' }),
        ).toBeVisible();
        await expect(page.getByLabel('Préférence personnelle')).toBeChecked();
        await expect(page.getByText('À noter')).toBeVisible();
      }

      if (screenId === 'X-18.C.S') {
        await expect(page.getByRole('heading', { name: 'Demande envoyée.' })).toBeVisible();
        await expect(
          page.getByText(/La prochaine visite reste maintenue avec Akouvi/u),
        ).toBeVisible();
      }

      const screenshotPath = testInfo.outputPath(`${slug}-${testInfo.project.name}.png`);
      await page.screenshot({ fullPage: true, path: screenshotPath });
      await testInfo.attach(`${slug}-${testInfo.project.name}`, {
        contentType: 'image/png',
        path: screenshotPath,
      });
    });
  }

  test('X-10 routes visible history actions to X-16, then a visit card to X-17', async ({
    page,
  }) => {
    await page.goto('/#/hub');

    await page.getByRole('button', { name: 'Voir les visites' }).click();
    await expect(page).toHaveURL(/#\/history/u);
    await expect(page.locator('[data-screen-id="X-16"]')).toBeVisible();

    await page.goto('/#/hub');
    await page.getByRole('button', { exact: true, name: 'Visites' }).click();
    await expect(page).toHaveURL(/#\/history/u);
    await expect(page.locator('[data-screen-id="X-16"]')).toBeVisible();

    await page.getByRole('button', { name: /28 avr · 9 h 02/u }).click();
    await expect(page).toHaveURL(/#\/history\/visit-2026-04-28/u);
    await expect(page.locator('[data-screen-id="X-17"]')).toBeVisible();
  });

  test('X-10 worker card routes to X-18 worker profile', async ({ page }) => {
    await page.goto('/#/hub');

    await page.getByRole('button', { name: 'Akouvi K.' }).click();
    await expect(page).toHaveURL(/#\/worker\/akouvi/u);
    await expect(page.locator('[data-screen-id="X-18"]')).toBeVisible();

    await page.getByRole('button', { name: 'Accueil' }).click();
    await expect(page).toHaveURL(/#\/hub/u);
    await expect(page.locator('[data-screen-id="X-10"]')).toBeVisible();
  });

  test('X-18 change request selects a reason and submits to confirmation', async ({ page }) => {
    await page.goto('/#/worker/akouvi');

    await page.getByRole('button', { name: 'Demander un changement' }).click();
    await expect(page).toHaveURL(/#\/worker\/akouvi\/change/u);
    await expect(page.locator('[data-screen-id="X-18.C"]')).toBeVisible();

    await page.getByText('Souci de qualité du travail').click();
    await expect(page.getByLabel('Souci de qualité du travail')).toBeChecked();

    await page.getByRole('button', { name: 'Envoyer la demande' }).click();
    await expect(page).toHaveURL(/#\/worker\/akouvi\/change\/submitted/u);
    await expect(page.locator('[data-screen-id="X-18.C.S"]')).toBeVisible();

    await page.getByRole('button', { name: "Retour à l'accueil" }).click();
    await expect(page).toHaveURL(/#\/hub/u);
    await expect(page.locator('[data-screen-id="X-10"]')).toBeVisible();
  });

  test('X-17 routes back to history and to issue reporting', async ({ page }) => {
    await page.goto('/#/history/visit-2026-04-28');

    await page.getByRole('button', { name: 'Visites' }).click();
    await expect(page).toHaveURL(/#\/history/u);
    await expect(page.locator('[data-screen-id="X-16"]')).toBeVisible();

    await page.goto('/#/history/visit-2026-04-28');
    await page.getByRole('button', { name: 'Signaler a posteriori' }).click();
    await expect(page).toHaveURL(/#\/visit\/issue/u);
    await expect(page.locator('[data-screen-id="X-15.S"]')).toBeVisible();
  });

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
