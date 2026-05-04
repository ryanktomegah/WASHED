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
  ['x-19-plan', '/#/plan', 'X-19'],
  ['x-19u-plan-upgrade', '/#/plan/upgrade', 'X-19.U'],
  ['x-19r-plan-paused', '/#/plan/paused', 'X-19.R'],
  ['x-22-plan-pause', '/#/plan/pause', 'X-22'],
  ['x-22a-plan-pause-submitted', '/#/plan/pause/submitted', 'X-22.A'],
  ['x-24-profile', '/#/profile', 'X-24'],
  ['x-25-profile-address', '/#/profile/address', 'X-25'],
  ['x-26-profile-notifications', '/#/profile/notifications', 'X-26'],
  ['x-27-profile-privacy', '/#/profile/privacy', 'X-27'],
  ['x-28-profile-delete', '/#/profile/delete', 'X-28'],
] as const;

test.describe('Subscriber implemented hub, visit, relationship, forfait, and profile flows through X-28', () => {
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

      if (screenId === 'X-19') {
        await expect(page.getByText('Votre forfait')).toBeVisible();
        await expect(
          page.getByRole('heading', { name: /Compte bon jusqu'au 31 mai/u }),
        ).toBeVisible();
        await expect(page.getByText(/Une visite · 2\s500\s+XOF \/ mois/u)).toBeVisible();
        await expect(page.getByText('Mardi 5 mai · 9 h 00')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Forfait' })).toHaveAttribute(
          'aria-current',
          'page',
        );
      }

      if (screenId === 'X-19.U') {
        await expect(page.getByRole('heading', { name: 'Deux visites par mois.' })).toBeVisible();
        await expect(page.getByText('Ce qui change')).toBeVisible();
        await expect(
          page.getByRole('button', { name: /Confirmer · 4\s500\s+XOF \/ mois/u }),
        ).toBeVisible();
      }

      if (screenId === 'X-19.R') {
        await expect(page.getByText('FORFAIT EN PAUSE')).toBeVisible();
        await expect(
          page.getByRole('heading', { name: 'Tout est prêt à reprendre.' }),
        ).toBeVisible();
        await expect(page.getByText('Akouvi K. vous attend.')).toBeVisible();
        await expect(page.getByText(/14 août/u)).toBeVisible();
      }

      if (screenId === 'X-22') {
        await expect(page.getByRole('heading', { name: 'Vous êtes sûre ?' })).toBeVisible();
        await expect(page.getByText('Ce qui va arriver')).toBeVisible();
        await expect(page.getByText("Si c'est une question de prix")).toBeVisible();
      }

      if (screenId === 'X-22.A') {
        await expect(page.getByRole('heading', { name: /Pause/u })).toBeVisible();
        await expect(page.getByText('Ce qui change maintenant')).toBeVisible();
        await expect(page.getByText('Rappel · délai max')).toBeVisible();
      }

      if (screenId === 'X-24') {
        await expect(page.getByRole('heading', { name: 'Yawa Mensah' })).toBeVisible();
        await expect(page.getByText('+228 90 12 34 56')).toBeVisible();
        await expect(page.getByText('Abonnée depuis sept. 2025')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Profil' })).toHaveAttribute(
          'aria-current',
          'page',
        );
      }

      if (screenId === 'X-25') {
        await expect(page.getByRole('heading', { name: 'Vous déménagez ?' })).toBeVisible();
        await expect(page.getByText(/24-48 h/u)).toBeVisible();
        await expect(page.getByRole('button', { name: 'Envoyer pour validation' })).toBeVisible();
      }

      if (screenId === 'X-26') {
        await expect(
          page.getByRole('heading', { name: 'Que voulez-vous recevoir ?' }),
        ).toBeVisible();
        await expect(page.getByRole('switch', { name: 'SMS · rappel J-1 et J' })).toHaveAttribute(
          'aria-checked',
          'true',
        );
        await expect(page.getByRole('switch', { name: 'Email mensuel · récap' })).toHaveAttribute(
          'aria-checked',
          'false',
        );
        await expect(page.getByText(/Aucune notification marketing/u)).toBeVisible();
      }

      if (screenId === 'X-27') {
        await expect(page.getByRole('heading', { name: "Ce qu'on garde sur vous." })).toBeVisible();
        await expect(page.getByText('DONNÉES DE COMPTE')).toBeVisible();
        await expect(page.getByText('PHOTOS DE VISITE')).toBeVisible();
        await expect(page.getByText('LOCALISATION')).toBeVisible();
      }

      if (screenId === 'X-28') {
        await expect(page.getByRole('heading', { name: "C'est définitif." })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Supprimer définitivement' })).toBeDisabled();
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

  test('Profil flow · hub → profile → address; profile → privacy → delete; typed-confirm gates the danger CTA', async ({
    page,
  }) => {
    await page.goto('/#/hub');

    await page.getByRole('button', { name: 'Profil' }).click();
    await expect(page).toHaveURL(/#\/profile$/u);
    await expect(page.locator('[data-screen-id="X-24"]')).toBeVisible();

    // Address edit round-trip.
    await page.getByRole('button', { name: /Adresse/u }).click();
    await expect(page).toHaveURL(/#\/profile\/address/u);
    await expect(page.locator('[data-screen-id="X-25"]')).toBeVisible();
    await page.getByRole('button', { name: 'Envoyer pour validation' }).click();
    await expect(page).toHaveURL(/#\/profile$/u);

    // Privacy → delete with typed confirmation.
    await page.getByRole('button', { name: /Vie privée/u }).click();
    await expect(page).toHaveURL(/#\/profile\/privacy/u);
    await expect(page.locator('[data-screen-id="X-27"]')).toBeVisible();

    await page.getByRole('button', { name: 'Supprimer mon compte' }).click();
    await expect(page).toHaveURL(/#\/profile\/delete/u);
    await expect(page.locator('[data-screen-id="X-28"]')).toBeVisible();

    const danger = page.getByRole('button', { name: 'Supprimer définitivement' });
    await expect(danger).toBeDisabled();

    // Wrong casing keeps it disabled.
    await page.getByLabel(/TAPEZ « SUPPRIMER »/u).fill('supprimer');
    await expect(danger).toBeDisabled();

    // Exact match enables it.
    await page.getByLabel(/TAPEZ « SUPPRIMER »/u).fill('SUPPRIMER');
    await expect(danger).toBeEnabled();

    // Cancel routes back to privacy.
    await page.getByRole('button', { name: 'Annuler' }).click();
    await expect(page).toHaveURL(/#\/profile\/privacy/u);
  });

  test('Forfait flow · hub → plan → upgrade → keep, plan → pause → submitted → paused → resume', async ({
    page,
  }) => {
    await page.goto('/#/hub');

    // Open the plan tab from the hub bottom nav.
    await page.getByRole('button', { name: 'Forfait' }).click();
    await expect(page).toHaveURL(/#\/plan$/u);
    await expect(page.locator('[data-screen-id="X-19"]')).toBeVisible();

    // Upgrade flow.
    await page.getByRole('button', { name: 'Passer à 2 visites' }).click();
    await expect(page).toHaveURL(/#\/plan\/upgrade/u);
    await expect(page.locator('[data-screen-id="X-19.U"]')).toBeVisible();
    await page.getByRole('button', { name: 'Garder mon forfait' }).click();
    await expect(page).toHaveURL(/#\/plan$/u);

    // Pause flow.
    await page.getByRole('button', { name: 'Mettre en pause' }).click();
    await expect(page).toHaveURL(/#\/plan\/pause$/u);
    await expect(page.locator('[data-screen-id="X-22"]')).toBeVisible();
    await page.locator('button.plan-button.danger').click();
    await expect(page).toHaveURL(/#\/plan\/pause\/submitted/u);
    await expect(page.locator('[data-screen-id="X-22.A"]')).toBeVisible();

    await page.getByRole('button', { name: 'Compris' }).click();
    await expect(page).toHaveURL(/#\/plan\/paused/u);
    await expect(page.locator('[data-screen-id="X-19.R"]')).toBeVisible();

    // Resume returns to active plan.
    await page.getByRole('button', { name: 'Reprendre maintenant' }).click();
    await expect(page).toHaveURL(/#\/plan$/u);
    await expect(page.locator('[data-screen-id="X-19"]')).toBeVisible();
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
