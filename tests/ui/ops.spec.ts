import { expect, test } from '@playwright/test';

test('operator console covers planning, matching, notifications, reports, and governance', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Washed Ops login' })).toBeVisible();
  await page.getByRole('button', { name: 'Send OTP' }).click();
  await expect(page.getByText('OTP sent to the operator phone.')).toBeVisible();
  await page.getByLabel('OTP code').fill('123456');
  await page.getByRole('button', { name: 'Verify OTP' }).click();
  await expect(page.getByText('Operator session verified.')).toBeVisible();

  await expect(page.getByRole('heading', { name: 'Operations dashboard' })).toBeVisible();
  await expect(page.getByText('Operational coverage')).toBeVisible();
  await expect(page.getByText('18 surfaces')).toBeVisible();

  await page.getByRole('button', { name: 'Planning' }).click();
  await expect(page.getByRole('heading', { name: 'Daily route planning' })).toBeVisible();
  await page.getByRole('button', { name: 'Acknowledge risk' }).click();
  await expect(
    page.getByText('Route overload risk acknowledged for manual intervention.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Approve routes' }).click();
  await expect(page.getByText('Daily route plan approved and audit logged.')).toBeVisible();

  await page.getByRole('button', { name: 'Attribution' }).click();
  await expect(page.getByRole('heading', { name: 'Matching command center' })).toBeVisible();
  await page.getByRole('button', { name: 'Accept' }).first().click();
  await expect(page.getByText('Matching decision accepted and audit logged.')).toBeVisible();
  await expect(page.getByText('Accepted', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Notifications' }).click();
  await expect(page.getByRole('heading', { name: 'Notifications and push devices' })).toBeVisible();
  await page.getByRole('button', { name: 'Deliver due notifications' }).click();
  await expect(
    page.getByText('Due notifications delivered through the operator queue.'),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Rapports' }).click();
  await expect(page.getByRole('heading', { name: 'Reports and KPI exports' })).toBeVisible();
  await page.getByRole('button', { name: 'Export report' }).click();
  await expect(page.getByText('Closed-beta report export prepared for review.')).toBeVisible();

  await page.getByRole('button', { name: 'Profiles' }).click();
  await expect(page.getByRole('heading', { name: 'Worker and subscriber profiles' })).toBeVisible();
  await page.getByRole('button', { name: 'Add relationship block' }).click();
  await expect(
    page.getByText('Household relationship block added and audit logged.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Handle worker privacy' }).click();
  await expect(page.getByText('Worker privacy request marked handled.')).toBeVisible();

  await assertNoHorizontalOverflow(page);
});

async function assertNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}
