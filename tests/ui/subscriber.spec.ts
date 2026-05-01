import { expect, test } from '@playwright/test';

test('subscriber mobile exposes production routes and bounded tracking', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Essi Agbodzan' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /mardi 5 mai/u })).toBeVisible();
  await expect(page.getByText('Tout est prêt')).toBeVisible();
  await expect(page.getByText('Dernier message')).toBeVisible();
  await expect(page.getByText('Inventaire des écrans production')).toHaveCount(0);

  await page.getByRole('button', { name: 'Profil', exact: true }).click();
  await page.getByRole('button', { name: 'Départ' }).click();
  await expect(page.getByRole('heading', { name: 'Inscription abonnée' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Langue' })).toBeVisible();

  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByRole('textbox', { name: 'Téléphone' })).toBeVisible();

  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByRole('textbox', { name: 'OTP' })).toBeVisible();

  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByRole('textbox', { name: 'Quartier' })).toBeVisible();

  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('button', { name: /T3/u }).click();
  await expect(page.getByRole('button', { name: /T3/u })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('button', { name: /Jeudi/u }).click();
  await expect(page.getByRole('button', { name: /Jeudi/u })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByRole('textbox', { name: 'Mobile Money' })).toBeVisible();

  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByText(/prêt pour validation Washed/u)).toBeVisible();
  await page.getByRole('button', { name: 'Terminé' }).click();

  await page.getByRole('button', { name: 'Voir la visite' }).click();
  await page.getByRole('button', { name: 'Démarrer le suivi' }).click();
  await expect(page.getByLabel('Bounded live map')).toBeVisible();
  await page.getByRole('button', { name: "Confirmer l'arrivée" }).click();
  await expect(page.getByText("Arrivée confirmée; le suivi s'arrête.")).toBeVisible();

  await expect(page.getByRole('heading', { name: 'Détail de visite' })).toBeVisible();
  await page.getByRole('button', { name: 'Sauter la visite' }).click();
  await expect(page.getByText('Crédit de saut utilisé pour la prochaine visite.')).toBeVisible();

  await page.getByRole('button', { name: 'Messages' }).click();
  await expect(page.getByRole('heading', { name: 'Support' })).toBeVisible();
  await page.getByRole('button', { name: 'Inbox' }).click();
  await expect(
    page.getByRole('heading', { name: 'Boîte de réception et notifications' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Abonnement' }).click();
  await expect(page.getByRole('heading', { name: "Gestion de l'abonnement" })).toBeVisible();
  await page.getByRole('button', { exact: true, name: 'Paiements' }).click();
  await expect(page.getByRole('heading', { name: 'Historique de paiement' })).toBeVisible();

  await page.getByRole('button', { name: 'Abonnement' }).click();
  await page.getByRole('button', { name: 'Paiement', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Régularisation du paiement' })).toBeVisible();

  await page.getByRole('button', { name: 'Profil', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Profil et confidentialité' })).toBeVisible();
  await page.getByRole('button', { name: 'Legal' }).click();
  await expect(page.getByRole('heading', { name: 'Conditions et confidentialité' })).toBeVisible();

  await page.getByRole('button', { name: 'Profil', exact: true }).click();
  await page.getByRole('button', { name: 'Récupération' }).click();
  await expect(page.getByRole('heading', { name: 'Récupération du compte' })).toBeVisible();

  await assertNoHorizontalOverflow(page);
});

async function assertNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}
