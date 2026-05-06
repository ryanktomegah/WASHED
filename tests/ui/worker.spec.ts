import { expect, test } from '@playwright/test';

test('worker mobile covers activation, offline visit actions, SOS, and daily summary', async ({
  page,
}) => {
  await page.goto('/');
  await unlockWorkerApp(page);

  await expect(page.getByRole('heading', { name: 'Bonjour Akouvi.' })).toBeVisible();
  await expect(page.getByText(/5 visites/u)).toBeVisible();
  await expect(page.getByText('Kofi Mensah')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ama Dossou' })).toBeVisible();
  await expect(page.getByText('Yao Agbeko')).toBeVisible();
  await expect(page.getByText(/7\s*500\s*XOF/u)).toBeVisible();
  await expect(page.getByText(/actions en attente de synchronisation/u)).toHaveCount(0);

  await openActiveVisit(page);
  await page.getByRole('button', { name: "Aujourd'hui" }).click();

  await page.getByRole('button', { name: 'Profil' }).click();
  await page.getByRole('button', { exact: true, name: 'Activation' }).click();
  await expect(page.getByRole('heading', { name: 'Activation du profil' })).toBeVisible();
  await page.getByRole('button', { name: "Terminer l'activation" }).click();
  await expect(page.getByText('Profil activé pour les routes terrain.')).toBeVisible();

  await page.getByRole('button', { name: "Aujourd'hui" }).click();
  await openActiveVisit(page);
  await page.getByRole('button', { name: "J'arrive" }).click();
  await expect(page.getByText("Pointage d'arrivée ajouté à la file hors ligne.")).toBeVisible();
  await expect(page.getByText('Vous êtes arrivée')).toBeVisible();
  await expect(page.getByLabel('Last GPS proof')).toContainText('GPS arrivée capturé');
  await page.getByRole('button', { name: "Aujourd'hui" }).click();
  await expect(page.getByLabel('Offline action ledger')).toContainText('Arrivée GPS');
  await expect(page.getByLabel('Offline action ledger')).not.toContainText('checkInVisit');
  await openActiveVisit(page);
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
  await openActiveVisit(page);
  await page.getByRole('button', { name: 'Photos' }).click();
  await expect(page.getByRole('heading', { name: 'Contrôle photo' })).toBeVisible();
  await expect(page.getByLabel('Photo quality preview')).toBeVisible();
  await page.getByRole('button', { name: 'Reprendre la photo' }).click();
  await expect(page.getByText('Photo avant ajoutée à la file hors ligne.')).toBeVisible();

  await page.getByRole('button', { name: "Aujourd'hui" }).click();
  await openActiveVisit(page);
  await page.getByRole('button', { name: 'Déclarer absence foyer' }).click();
  await expect(
    page.getByText('Absence foyer déclarée et ajoutée à la file hors ligne.'),
  ).toBeVisible();

  await page.getByRole('button', { name: "Aujourd'hui" }).click();
  await openActiveVisit(page);
  await page.getByRole('button', { name: 'SOS' }).click();
  await expect(page.getByRole('dialog', { name: 'Que se passe-t-il ?' })).toBeVisible();
  await page.getByRole('button', { name: /Je suis en danger/u }).click();
  await expect(page.getByText("Alerte SOS envoyée à l'opérateur.")).toBeVisible();

  await page.getByRole('button', { name: 'Planning' }).last().click();
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

async function unlockWorkerApp(page: import('@playwright/test').Page) {
  await expect(page.getByRole('heading', { name: /Bonjour\.\s*Votre numéro \?/u })).toBeVisible();
  await expect(page.getByText('Connexion')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entrer' })).toBeDisabled();
  await page.getByLabel('Numéro').fill('99 87 65 43');
  await page.getByLabel('Code PIN — 4 chiffres').fill('2468');
  await page.getByRole('button', { name: 'Entrer' }).click();
  await expect(page.getByRole('heading', { name: 'Bonjour Akouvi.' })).toBeVisible();
}

async function openActiveVisit(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /Démarrer la route/u }).click();
  await expect(page.getByRole('heading', { name: 'Ama Dossou' })).toBeVisible();
  await expect(page.getByText('Tournée · visite 2 / 5')).toBeVisible();
  await expect(page.getByText('Tarif T1')).toBeVisible();
  await expect(page.getByText('Note de la cliente')).toBeVisible();
  await page.getByRole('button', { name: /Démarrer la route/u }).click();
  await expect(page.getByLabel('Guided visit workflow')).toBeVisible();
}
