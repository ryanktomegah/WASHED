import { expect, test, type Page } from '@playwright/test';

const SUBSCRIBER_APPEARANCE_STORAGE_KEY = 'washed.subscriber.appearance';
const SUBSCRIBER_LANGUAGE_STORAGE_KEY = 'washed.locale';
const SUBSCRIBER_SUBSCRIPTION_STORAGE_KEY = 'washed.subscriber.subscription';

const screenRoutes = [
  ['x-10-hub', '/#/hub', 'X-10'],
  ['x-10b-booking', '/#/booking', 'X-10B'],
  ['x-10c-booking-submitted', '/#/booking/submitted', 'X-10C'],
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
  ['x-24e-profile-edit', '/#/profile/edit', 'X-24E'],
  ['x-24l-profile-language', '/#/profile/language', 'X-24L'],
  ['x-25-profile-address', '/#/profile/address', 'X-25'],
  ['x-26-profile-notifications', '/#/profile/notifications', 'X-26'],
  ['x-27-profile-privacy', '/#/profile/privacy', 'X-27'],
  ['x-28-profile-delete', '/#/profile/delete', 'X-28'],
  ['x-29-support-help', '/#/support', 'X-29'],
  ['x-30-support-contact', '/#/support/contact', 'X-30'],
  ['x-30s-support-contact-submitted', '/#/support/contact/submitted', 'X-30.S'],
  ['x-31-support-tickets', '/#/support/tickets', 'X-31'],
  ['x-32-support-ticket-detail', '/#/support/tickets/0421', 'X-32'],
  ['x-33-offline', '/#/offline', 'X-33'],
  ['x-34-maintenance', '/#/maintenance', 'X-34'],
  ['x-35-update-required', '/#/update-required', 'X-35'],
] as const;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ([appearanceKey, languageKey, subscriptionKey]) => {
      window.localStorage.setItem(appearanceKey, 'light');
      window.localStorage.removeItem(languageKey);
      window.localStorage.removeItem(subscriptionKey);
    },
    [
      SUBSCRIBER_APPEARANCE_STORAGE_KEY,
      SUBSCRIBER_LANGUAGE_STORAGE_KEY,
      SUBSCRIBER_SUBSCRIPTION_STORAGE_KEY,
    ],
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

async function bottomNavFrame(page: Page): Promise<{ height: number; width: number; y: number }> {
  const nav = page.locator('.hub-nav');
  await expect(nav).toBeVisible();
  const box = await nav.boundingBox();
  const viewport = page.viewportSize();
  if (box === null || viewport === null) {
    throw new Error('Bottom navigation frame is unavailable.');
  }
  expect(Math.round(box.width)).toBe(viewport.width);
  expect(Math.round(box.y + box.height)).toBe(viewport.height);
  return {
    height: Math.round(box.height),
    width: Math.round(box.width),
    y: Math.round(box.y),
  };
}

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
      await continueThroughAppearance(page);

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
        await expect(page.getByText('Bonjour')).toBeVisible();
        await expect(page.getByText('bonjour Mariam')).not.toBeVisible();
        await expect(page.getByRole('button', { name: 'Ouvrir le profil' })).toBeVisible();
        await expect(page.getByText('Prochaine visite')).not.toBeVisible();
        await expect(page.getByText('confirmée')).not.toBeVisible();
        await expect(page.getByText('9:00')).not.toBeVisible();
        await expect(page.getByText('Akouvi K.')).not.toBeVisible();
        await expect(page.getByText('Première visite', { exact: true })).toBeVisible();
        await expect(
          page.getByRole('heading', { name: 'Planifiez votre première visite' }),
        ).toBeVisible();
        await expect(page.getByText(/Le bureau confirme avant d'assigner/u)).toBeVisible();
        await expect(
          page.getByRole('button', { name: /Planifier ma première visite/u }),
        ).toBeVisible();
        await expect(page.locator('.hub-booking-card.first')).toHaveCSS(
          'background-color',
          'rgb(10, 61, 31)',
        );
        const plan = page.getByRole('region', { name: 'Forfait' });
        await expect(plan.getByText('Forfait')).toBeVisible();
        await expect(plan.getByText('Visite à planifier')).toBeVisible();
      }

      if (screenId === 'X-10B') {
        await expect(
          page.getByRole('heading', { name: 'Quel jour vous convient ?' }),
        ).toBeVisible();
        await expect(page.getByText('1 / 2')).toBeVisible();
        await expect(page.getByText('Lundi')).toBeVisible();
        await expect(page.getByText('Mercredi')).toBeVisible();
        await expect(page.getByText('Vendredi')).toBeVisible();
        await expect(page.getByText('Samedi')).toBeVisible();
        await expect(page.getByText('Dimanche')).toBeVisible();
        await expect(page.getByText('Matin')).not.toBeVisible();
        await expect(page.getByText('Après-midi')).not.toBeVisible();
        await expect(page.getByRole('button', { name: /Envoyer la demande/u })).not.toBeVisible();
      }

      if (screenId === 'X-10C') {
        await expect(page.getByRole('heading', { name: 'Demande envoyée.' })).toBeVisible();
        await expect(
          page.getByText('Le bureau confirme votre créneau par appel ou SMS avant la visite.'),
        ).toBeVisible();
      }

      if (screenId === 'X-16') {
        await expect(page.getByText('Vos visites')).toBeVisible();
        await expect(page.getByText('Akouvi')).toBeVisible();
        await expect(page.getByText('32')).toBeVisible();
        await expect(page.getByText(/80\s000/u)).toBeVisible();
        await expect(page.locator('.history-stats-card')).toHaveCSS(
          'background-color',
          'rgb(10, 61, 31)',
        );
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
        await expect(page.locator('.worker-profile-relation-card')).toHaveCSS(
          'background-color',
          'rgb(10, 61, 31)',
        );
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
        await expect(page.getByText('Votre forfait', { exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Votre forfait est prêt.' })).toBeVisible();
        await expect(page.getByText(/Une visite · 2\s500\s+XOF \/ mois/u)).toBeVisible();
        await expect(page.locator('.plan-active-card')).toHaveCSS(
          'background-color',
          'rgb(10, 61, 31)',
        );
        await expect(page.getByText('Visite à planifier')).toBeVisible();
        await expect(page.getByText('Mardi 5 mai · 9 h 00')).not.toBeVisible();
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
        await expect(page.getByRole('heading', { name: 'Compte Washed' })).toBeVisible();
        await expect(page.getByText('Compte actif')).toBeVisible();
        await expect(page.getByText('Informations du compte')).toBeVisible();
        await expect(
          page.getByRole('button', { name: /Informations personnelles/u }),
        ).toBeVisible();
        await expect(page.getByRole('button', { name: 'Modifier la photo' }).first()).toBeVisible();
        await expect(page.getByText('Yawa Mensah')).not.toBeVisible();
        await expect(page.getByText('+228 90 12 34 56')).not.toBeVisible();
        await expect(page.getByRole('button', { name: /Langue/u })).toBeVisible();
        await expect(page.getByRole('button', { name: /Apparence/u })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Profil', exact: true })).toHaveAttribute(
          'aria-current',
          'page',
        );
      }

      if (screenId === 'X-24E') {
        await expect(
          page.getByRole('heading', { name: 'Modifier vos informations' }),
        ).toBeVisible();
        await expect(page.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
        await expect(page.getByText('Le téléphone se modifie par vérification SMS.')).toBeVisible();
      }

      if (screenId === 'X-24L') {
        await expect(page.getByRole('heading', { name: 'Choisir la langue' })).toBeVisible();
        await expect(page.getByRole('radio', { name: /Français/u })).toHaveAttribute(
          'aria-checked',
          'true',
        );
        await expect(page.getByRole('radio', { name: /English/u })).toBeVisible();
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

      if (screenId === 'X-29') {
        await expect(page.getByRole('heading', { name: 'On vous écoute.' })).toBeVisible();
        await expect(page.getByText('Appeler le bureau')).toBeVisible();
        await expect(page.locator('.support-call-card')).toHaveCSS(
          'background-color',
          'rgb(10, 61, 31)',
        );
      }

      if (screenId === 'X-30') {
        await expect(
          page.getByRole('heading', { name: 'De quoi voulez-vous parler ?' }),
        ).toBeVisible();
      }

      if (screenId === 'X-30.S') {
        await expect(page.getByRole('heading', { name: 'Message envoyé.' })).toBeVisible();
      }

      if (screenId === 'X-31') {
        await expect(page.getByRole('heading', { name: 'Vos demandes.' })).toBeVisible();
      }

      if (screenId === 'X-32') {
        // Demo ticket #0421 — the heading is the ticket title from the deck.
        // Use a relaxed match since the deck title may evolve.
        await expect(page.locator('[data-screen-id="X-32"]')).toBeVisible();
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      }

      if (screenId === 'X-33') {
        await expect(page.locator('[data-screen-id="X-33"]')).toBeVisible();
      }

      if (screenId === 'X-34') {
        await expect(page.getByRole('heading', { name: 'Maintenance en cours.' })).toBeVisible();
      }

      if (screenId === 'X-35') {
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      }

      const screenshotPath = testInfo.outputPath(`${slug}-${testInfo.project.name}.png`);
      await page.screenshot({ fullPage: true, path: screenshotPath });
      await testInfo.attach(`${slug}-${testInfo.project.name}`, {
        contentType: 'image/png',
        path: screenshotPath,
      });
    });
  }

  test('X-10 first-time home does not expose visit detail or reschedule actions', async ({
    page,
  }) => {
    await page.goto('/#/hub');
    await continueThroughAppearance(page);

    await expect(page.getByRole('button', { name: 'Détails' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Reporter' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Akouvi K.' })).toHaveCount(0);
  });

  test('X-10 routes booking request through day and time confirmation', async ({ page }) => {
    await page.goto('/#/hub');
    await continueThroughAppearance(page);

    await page.getByRole('button', { name: /Planifier ma première visite/u }).click();
    await expect(page).toHaveURL(/#\/booking/u);
    await expect(page.locator('[data-screen-id="X-10B"]')).toBeVisible();

    await page.getByText('Samedi').click();
    await expect(page.getByRole('heading', { name: 'Quel moment ce samedi ?' })).toBeVisible();
    await expect(page.getByText('2 / 2')).toBeVisible();
    await expect(page.getByText('Jour choisi')).toBeVisible();
    await expect(page.getByText('Matin')).toBeVisible();
    await expect(page.getByRole('button', { name: /Envoyer la demande/u })).toBeDisabled();
    await page.getByText('Matin').click();
    await expect(page.getByLabel(/Matin/u)).toBeChecked();
    await page.getByRole('button', { name: /Envoyer la demande/u }).click();

    await expect(page).toHaveURL(/#\/booking\/submitted/u);
    await expect(page.locator('[data-screen-id="X-10C"]')).toBeVisible();
    await page.getByRole('button', { name: "Retour à l'accueil" }).click();
    await expect(page).toHaveURL(/#\/hub/u);
    await expect(page.locator('[data-screen-id="X-10"]')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Première visite en confirmation' }),
    ).toBeVisible();
    await expect(page.getByText('Demande en confirmation')).toBeVisible();
  });

  test('bottom navigation keeps the same frame while moving across tabs', async ({ page }) => {
    await page.goto('/#/hub');
    await continueThroughAppearance(page);
    await expect(page.locator('[data-screen-id="X-10"]')).toBeVisible();
    const homeFrame = await bottomNavFrame(page);

    await page.getByRole('button', { name: 'Visites' }).click();
    await expect(page.locator('[data-screen-id="X-16"]')).toBeVisible();
    expect(await bottomNavFrame(page)).toEqual(homeFrame);

    await page.getByRole('button', { name: 'Forfait' }).click();
    await expect(page.locator('[data-screen-id="X-19"]')).toBeVisible();
    expect(await bottomNavFrame(page)).toEqual(homeFrame);

    await page.getByRole('button', { name: 'Profil', exact: true }).click();
    await expect(page.locator('[data-screen-id="X-24"]')).toBeVisible();
    expect(await bottomNavFrame(page)).toEqual(homeFrame);

    await page.getByRole('button', { name: 'Accueil' }).click();
    await expect(page.locator('[data-screen-id="X-10"]')).toBeVisible();
    expect(await bottomNavFrame(page)).toEqual(homeFrame);
  });

  test('Profil tab opens account actions and lets the subscriber edit identity', async ({
    page,
  }) => {
    await page.goto('/#/hub');
    await continueThroughAppearance(page);
    await expect(page.locator('[data-screen-id="X-10"]')).toBeVisible();

    await page.getByRole('button', { name: 'Profil', exact: true }).click();
    await expect(page.locator('[data-screen-id="X-24"]')).toBeVisible();
    await expect(page.getByText('Informations du compte')).toBeVisible();
    await expect(page.getByRole('button', { name: /Informations personnelles/u })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Modifier la photo' }).first()).toBeVisible();

    await page.getByRole('button', { name: /Informations personnelles/u }).click();
    await expect(page.locator('[data-screen-id="X-24E"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();

    await page.getByLabel('PRÉNOM').fill('Afi');
    await page.getByLabel('NOM', { exact: true }).fill('Mensah');
    await page.getByLabel('EMAIL (FACULTATIF)').fill('afi@email.com');
    await page.locator('[data-screen-id="X-24E"] .profile-check-row').click();
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(page.locator('[data-screen-id="X-24"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Afi Mensah' })).toBeVisible();
    await expect(page.getByText('afi@email.com')).toBeVisible();
  });

  test('home profile picture opens the profile screen', async ({ page }) => {
    await page.goto('/#/hub');
    await continueThroughAppearance(page);
    await expect(page.locator('[data-screen-id="X-10"]')).toBeVisible();

    await page.getByRole('button', { name: 'Ouvrir le profil' }).click();

    await expect(page).toHaveURL(/#\/profile$/u);
    await expect(page.locator('[data-screen-id="X-24"]')).toBeVisible();
    await expect(page.getByText('Informations du compte')).toBeVisible();
  });

  test('X-18 change request selects a reason and submits to confirmation', async ({ page }) => {
    await page.goto('/#/worker/akouvi');
    await continueThroughAppearance(page);

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
    // X-17 is a sub-screen — it uses a Retour back header (useSafeBack
    // falls back to /history when there's no in-app history). Reach it
    // through X-16 so the back stack includes the history list.
    await page.goto('/#/history');
    await continueThroughAppearance(page);
    await page.getByRole('button', { name: /28 avr · 9 h 02/u }).click();
    await expect(page).toHaveURL(/#\/history\/visit-2026-04-28/u);
    await expect(page.locator('[data-screen-id="X-17"]')).toBeVisible();

    await page.getByRole('button', { name: 'Retour' }).click();
    await expect(page).toHaveURL(/#\/history$/u);
    await expect(page.locator('[data-screen-id="X-16"]')).toBeVisible();

    await page.goto('/#/history/visit-2026-04-28');
    await continueThroughAppearance(page);
    await page.getByRole('button', { name: 'Signaler a posteriori' }).click();
    await expect(page).toHaveURL(/#\/visit\/issue/u);
    await expect(page.locator('[data-screen-id="X-15.S"]')).toBeVisible();
  });

  test('X-11 routes to reschedule', async ({ page }) => {
    await page.goto('/#/visit/detail');
    await continueThroughAppearance(page);

    await expect(page.getByRole('heading', { name: 'Mardi 7 mai · 9:00' })).toBeVisible();
    await expect(page.getByText("Vous pouvez reporter jusqu'à 18 h la veille.")).toBeVisible();
    await page.getByRole('button', { name: 'Reporter la visite' }).click();
    await expect(page).toHaveURL(/#\/visit\/reschedule/u);
    await expect(page.locator('[data-screen-id="X-11.M"]')).toBeVisible();
    await page.locator('label.visit-choice', { hasText: 'Samedi 9 mai' }).click();
    await page.getByRole('button', { name: 'Confirmer le report' }).click();
    await expect(page).toHaveURL(/#\/visit\/detail/u);
  });

  test('X-14 reveal routes to good feedback and issue reporting', async ({ page }) => {
    await page.goto('/#/visit/reveal');
    await continueThroughAppearance(page);

    await expect(page.getByLabel('Photos avant et après')).toBeVisible();
    await page.getByRole('button', { name: 'Tout va bien' }).click();
    await expect(page).toHaveURL(/#\/visit\/feedback/u);
    await expect(page.locator('[data-screen-id="X-15"]')).toBeVisible();
    await page.getByRole('button', { name: "Retour à l'accueil" }).click();
    await expect(page).toHaveURL(/#\/hub/u);
    await expect(page.locator('[data-screen-id="X-10"]')).toBeVisible();

    await page.goto('/#/visit/reveal');
    await continueThroughAppearance(page);
    await page.getByRole('button', { name: 'Signaler un souci' }).click();
    await expect(page).toHaveURL(/#\/visit\/issue/u);
    await page.locator('label.visit-choice', { hasText: 'Linge mal lavé' }).click();
    await page.getByRole('button', { name: 'Suivant · ajouter photos' }).click();
    await expect(page).toHaveURL(/#\/visit\/issue/u);
    await expect(page.getByRole('heading', { name: 'Ajoutez des photos du souci.' })).toBeVisible();
    await expect(page.getByText('Aucune photo ajoutée')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Envoyer le signalement' })).toBeDisabled();
    await page
      .locator('input[type="file"]')
      .setInputFiles(
        'packages/subscriber-app/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',
      );
    await expect(page.getByText('1 photo ajoutée')).toBeVisible();
    await page.getByRole('button', { name: 'Envoyer le signalement' }).click();
    await expect(page).toHaveURL(/#\/visit\/issue\/submitted/u);
    await expect(page.getByRole('heading', { name: 'Signalement reçu.' })).toBeVisible();
    await page.getByRole('button', { name: "Retour à l'accueil" }).click();
    await expect(page).toHaveURL(/#\/hub/u);
    await expect(page.locator('[data-screen-id="X-10"]')).toBeVisible();
  });

  test('X-13 close action lands on the X-10 hub', async ({ page }) => {
    await page.goto('/#/visit/in-progress');
    await continueThroughAppearance(page);

    await page.getByRole('button', { name: "Fermer l'app sereinement" }).click();
    await expect(page).toHaveURL(/#\/hub/u);
    await expect(page.locator('[data-screen-id="X-10"]')).toBeVisible();
  });

  test('Profil flow · hub → profile → address; profile → privacy → delete; typed-confirm gates the danger CTA', async ({
    page,
  }) => {
    await page.goto('/#/hub');
    await continueThroughAppearance(page);

    await page.getByRole('button', { name: 'Profil', exact: true }).click();
    await expect(page).toHaveURL(/#\/profile$/u);
    await expect(page.locator('[data-screen-id="X-24"]')).toBeVisible();

    // Language settings can switch in both directions.
    await page.getByRole('button', { name: /Langue/u }).click();
    await expect(page).toHaveURL(/#\/profile\/language/u);
    await expect(page.locator('[data-screen-id="X-24L"]')).toBeVisible();
    await page.getByRole('radio', { name: /English/u }).click();
    await expect(page.getByRole('heading', { name: 'Choose language' })).toBeVisible();
    await expect(page.getByRole('radio', { name: /English/u })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await page.getByRole('radio', { name: /Français/u }).click();
    await expect(page.getByRole('heading', { name: 'Choisir la langue' })).toBeVisible();
    await page.getByRole('button', { name: 'Retour' }).click();
    await expect(page).toHaveURL(/#\/profile$/u);

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

  test('Forfait flow · hub → plan → first visit request → pending plan', async ({
    page,
  }) => {
    await page.goto('/#/hub');
    await continueThroughAppearance(page);

    // Open the plan tab from the hub bottom nav.
    await page.getByRole('button', { name: 'Forfait' }).click();
    await expect(page).toHaveURL(/#\/plan$/u);
    await expect(page.locator('[data-screen-id="X-19"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Votre forfait est prêt.' })).toBeVisible();

    await page.getByRole('button', { name: /Planifier ma première visite/u }).click();
    await expect(page).toHaveURL(/#\/booking$/u);
    await page.getByText('Samedi').click();
    await page.getByText('Matin').click();
    await page.getByRole('button', { name: /Envoyer la demande/u }).click();
    await expect(page).toHaveURL(/#\/booking\/submitted/u);

    await page.getByRole('button', { name: "Retour à l'accueil" }).click();
    await page.getByRole('button', { name: 'Forfait', exact: true }).click();
    await expect(page).toHaveURL(/#\/plan$/u);
    await expect(page.locator('[data-screen-id="X-19"]')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Votre première visite est en confirmation.' }),
    ).toBeVisible();
    await expect(page.getByText('Samedi · Matin')).toBeVisible();
  });

  test('Support flow · profile → help → contact form → submitted; help → tickets list → ticket detail', async ({
    page,
  }) => {
    await page.goto('/#/profile');
    await continueThroughAppearance(page);
    await page.getByRole('button', { name: 'Aide & support' }).click();
    await expect(page).toHaveURL(/#\/support$/u);
    await expect(page.locator('[data-screen-id="X-29"]')).toBeVisible();

    // Contact form path.
    await page.getByRole('button', { name: 'Écrire au bureau' }).click();
    await expect(page).toHaveURL(/#\/support\/contact$/u);
    await expect(page.locator('[data-screen-id="X-30"]')).toBeVisible();

    // Submit is disabled until message + category are valid.
    const submit = page.getByRole('button', { name: 'Envoyer au bureau' });
    await expect(submit).toBeDisabled();

    // Label is rendered uppercased in CSS but textarea aria-label resolves
    // through `htmlFor`/`id`; use a case-insensitive match to be safe.
    await page.getByLabel(/votre message/iu).fill('Test message');
    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(page).toHaveURL(/#\/support\/contact\/submitted$/u);
    await expect(page.locator('[data-screen-id="X-30.S"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Message envoyé.' })).toBeVisible();

    // From submitted, navigate to tickets list.
    await page.getByRole('button', { name: 'Voir mes tickets' }).click();
    await expect(page).toHaveURL(/#\/support\/tickets$/u);
    await expect(page.locator('[data-screen-id="X-31"]')).toBeVisible();

    await page.getByRole('button', { name: /#0421/u }).click();
    await expect(page).toHaveURL(/#\/support\/tickets\/0421/u);
    await expect(page.locator('[data-screen-id="X-32"]')).toBeVisible();
    const reply = page.getByLabel('Répondre');
    const sendReply = page.getByRole('button', { name: 'Envoyer' });
    await expect(sendReply).toBeDisabled();
    await reply.fill('Merci Ama, je reste disponible.');
    await expect(sendReply).toBeEnabled();
    await sendReply.click();
    await expect(page.getByText('Merci Ama, je reste disponible.')).toBeVisible();
    await expect(reply).toHaveValue('');
    await expect(sendReply).toBeDisabled();
  });

  test('System screens · X-33 offline, X-34 maintenance, X-35 update-required render via deep link', async ({
    page,
  }) => {
    await page.goto('/#/offline');
    await continueThroughAppearance(page);
    await expect(page.locator('[data-screen-id="X-33"]')).toBeVisible();

    await page.goto('/#/maintenance');
    await continueThroughAppearance(page);
    await expect(page.locator('[data-screen-id="X-34"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Maintenance en cours.' })).toBeVisible();

    await page.goto('/#/update-required');
    await continueThroughAppearance(page);
    await expect(page.locator('[data-screen-id="X-35"]')).toBeVisible();
  });
});

// The X-09 first-session tour belongs to its own describe so it does not inherit
// the parent suite's completed flag, which would suppress the screen.
test.describe('Subscriber tour X-09 (first session)', () => {
  test('mounts on a fresh hub and persists the completed flag', async ({ page }, testInfo) => {
    await page.goto('/#/hub');
    await continueThroughAppearance(page);

    const dialog = page.locator('[data-screen-id="X-09"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('role', 'dialog');
    await expect(page.getByText('Première session')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Votre accueil commence ici' })).toBeVisible();
    await expect(
      page.getByText(
        'Planification, forfait et aide sont toujours à portée avant la première visite.',
      ),
    ).toBeVisible();
    await expect(page.getByText('1 / 3')).toBeVisible();
    await expect(page.getByText('nouveau')).toBeVisible();
    await expect(
      page.getByText('Touchez Planifier pour choisir votre premier créneau.'),
    ).toBeVisible();

    const screenshotPath = testInfo.outputPath(`x-09-tour-step1-${testInfo.project.name}.png`);
    await page.screenshot({ fullPage: true, path: screenshotPath });
    await testInfo.attach(`x-09-tour-step1-${testInfo.project.name}`, {
      contentType: 'image/png',
      path: screenshotPath,
    });

    await page.getByRole('button', { name: 'Suivant' }).click();
    await expect(dialog).toBeHidden();

    await page.reload();
    await continueThroughAppearance(page);
    await expect(dialog).toBeHidden();
    await expect(page.locator('[data-screen-id="X-10"]')).toBeVisible();
  });
});
