import { expect, test } from '@playwright/test';

test('worker mobile covers activation, offline visit actions, SOS, and daily summary', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: "3 visites aujourd'hui" })).toBeVisible();
  await expect(page.getByText('Kofi Mensah')).toBeVisible();
  await expect(page.getByText('Ama Dossou')).toBeVisible();
  await expect(page.getByText('Yao Agbeko')).toBeVisible();
  await expect(page.getByText('Salaire · Avril 2026')).toBeVisible();
  await expect(page.getByText(/actions en attente de synchronisation/u)).toHaveCount(0);

  await page.getByRole('button', { name: /Photos \+ Check-out/u }).click();
  await expect(page.getByLabel('Guided visit workflow')).toBeVisible();
  await page.getByRole('button', { name: "Aujourd'hui" }).click();

  await page.getByRole('button', { name: 'Profil' }).click();
  await page.getByRole('button', { exact: true, name: 'Activation' }).click();
  await expect(page.getByRole('heading', { name: 'Activation du profil' })).toBeVisible();
  await page.getByRole('button', { name: "Terminer l'activation" }).click();
  await expect(page.getByText('Profil activé pour les routes terrain.')).toBeVisible();

  await page.getByRole('button', { name: "Aujourd'hui" }).click();
  await page.getByRole('button', { name: /Photos \+ Check-out/u }).click();
  await page.getByRole('button', { name: "Pointer l'arrivée" }).click();
  await expect(page.getByText("Pointage d'arrivée ajouté à la file hors ligne.")).toBeVisible();
  await expect(page.getByText('Arrivée pointée')).toBeVisible();
  await expect(page.getByLabel('Last GPS proof')).toContainText('GPS arrivée capturé');
  await page.getByRole('button', { name: "Aujourd'hui" }).click();
  await expect(page.getByLabel('Offline action ledger')).toContainText('checkInVisit');
  await page.getByRole('button', { name: /Photos \+ Check-out/u }).click();
  await page.getByRole('button', { name: 'Prendre photo avant' }).click();
  await expect(page.getByText('Photo avant ajoutée à la file hors ligne.')).toBeVisible();
  await page.getByRole('button', { name: 'Démarrer la visite' }).click();
  await expect(page.getByText('Visite marquée en cours.')).toBeVisible();
  await page.getByRole('button', { name: 'Prendre photo après' }).click();
  await expect(page.getByText('Photo après ajoutée à la file hors ligne.')).toBeVisible();
  await page.getByRole('button', { name: 'Pointer la sortie' }).click();
  await expect(page.getByText('Pointage de sortie ajouté à la file hors ligne.')).toBeVisible();
  await expect(page.getByLabel('Last GPS proof')).toContainText('GPS sortie capturé');

  await page.getByRole('button', { name: "Aujourd'hui" }).click();
  await expect(page.getByText(/4 actions en attente de synchronisation/u)).toBeVisible();
  await page.getByRole('button', { name: /Photos \+ Check-out/u }).click();
  await page.getByRole('button', { name: 'Photos' }).click();
  await expect(page.getByRole('heading', { name: 'Contrôle photo' })).toBeVisible();
  await expect(page.getByLabel('Photo quality preview')).toBeVisible();
  await page.getByRole('button', { name: 'Reprendre la photo' }).click();
  await expect(page.getByText('Photo avant ajoutée à la file hors ligne.')).toBeVisible();

  await page.getByRole('button', { name: "Aujourd'hui" }).click();
  await page.getByRole('button', { name: /Photos \+ Check-out/u }).click();
  await page.getByRole('button', { name: 'Déclarer absence foyer' }).click();
  await expect(
    page.getByText('Absence foyer déclarée et ajoutée à la file hors ligne.'),
  ).toBeVisible();

  await page.getByRole('button', { name: "Aujourd'hui" }).click();
  await page.getByRole('button', { name: /Photos \+ Check-out/u }).click();
  await page.getByRole('button', { name: 'SOS' }).click();
  await expect(page.getByRole('dialog', { name: 'Aide immédiate' })).toBeVisible();
  await page.getByRole('button', { name: "Prévenir l'opérateur" }).click();
  await expect(page.getByText("Alerte SOS envoyée à l'opérateur.")).toBeVisible();

  await page.getByRole('button', { name: 'Planning' }).click();
  await expect(page.getByRole('heading', { name: 'Planning' })).toBeVisible();
  await page.getByRole('button', { name: 'Marquer indisponible' }).click();
  await expect(page.getByText('Indisponibilité envoyée à la planification.')).toBeVisible();

  await page.getByRole('button', { name: 'Profil' }).click();
  await page.getByRole('button', { name: 'Résumé' }).click();
  await expect(page.getByRole('heading', { name: 'Résumé de fin de journée' })).toBeVisible();
  await page.getByRole('button', { name: 'Clôturer la journée' }).click();
  await expect(page.getByText('Résumé de fin de journée enregistré.')).toBeVisible();

  await assertNoHorizontalOverflow(page);
});

async function assertNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}
