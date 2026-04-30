import { expect, test } from '@playwright/test';

test('subscriber can complete the local signup flow on an iPhone-sized viewport', async ({
  page,
}) => {
  const phoneNumber = `+22890${String(Date.now()).slice(-6)}`;

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Washed' })).toBeVisible();
  await page.getByRole('button', { name: 'Commencer' }).click();

  await expect(page.getByRole('heading', { name: 'Votre numéro' })).toBeVisible();
  await page.getByRole('textbox').fill(phoneNumber);
  await page.getByRole('button', { name: 'Envoyer le code' }).click();

  await expect(page.getByRole('heading', { name: 'Code de vérification' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirmer' }).click();

  await expect(page.getByRole('heading', { name: 'Votre adresse' })).toBeVisible();
  await page.locator('#neighborhood').fill('Tokoin');
  await page.locator('#landmark').fill('Portail noir, près de la pharmacie');
  await page.getByRole('button', { name: 'Continuer' }).click();

  await expect(page.getByRole('heading', { name: 'Votre formule' })).toBeVisible();
  await page.locator('[data-tier="T2"]').click();
  await page.getByRole('button', { name: 'Continuer' }).click();

  await expect(page.getByRole('heading', { name: 'Créneau habituel' })).toBeVisible();
  await page.getByRole('button', { name: /Créer mon abonnement/u }).click();

  await expect(page.getByText('Aucune visite planifiée')).toBeVisible();
  await expect(page.getByText('Abonnement', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Payer maintenant' })).toBeVisible();

  await assertNoHorizontalOverflow(page);
});

async function assertNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}
