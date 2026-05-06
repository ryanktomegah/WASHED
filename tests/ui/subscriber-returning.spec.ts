import { expect, test } from '@playwright/test';

const SUBSCRIBER_APPEARANCE_STORAGE_KEY = 'washed.subscriber.appearance';
const SUBSCRIBER_LANGUAGE_STORAGE_KEY = 'washed.locale';
const SUBSCRIBER_SIGNUP_STORAGE_KEY = 'washed.subscriber.signup-state';
const SUBSCRIBER_SUBSCRIPTION_STORAGE_KEY = 'washed.subscriber.subscription';

const RETURNING_SIGNUP_STATE = {
  address: {
    gpsLatitude: 6.1319,
    gpsLongitude: 1.2228,
    landmark: 'Pres de la pharmacie du quartier',
    neighborhood: 'Tokoin',
    street: 'Rue 42',
  },
  avatarDataUrl: '',
  identity: {
    email: 'yawa@example.test',
    firstName: 'Yawa',
    isAdult: true,
    lastName: 'Mensah',
  },
  mode: 'signup',
  otpChallengeId: 'simulated-returning-subscriber',
  paymentProvider: 'mixx',
  phone: '+22890123456',
  tier: 'T1',
};

const RETURNING_SUBSCRIPTION_STATE = {
  address: {
    gpsLatitude: 6.1319,
    gpsLongitude: 1.2228,
    landmark: 'Pres de la pharmacie du quartier',
    neighborhood: 'Tokoin',
  },
  addressNeighborhood: 'Tokoin',
  assignedWorker: {
    averageRating: null,
    completedVisitCount: 3,
    displayName: 'Akouvi K.',
    disputeCount: 0,
    workerId: '22222222-2222-4222-8222-222222222222',
  },
  billingStatus: {
    nextChargeAt: '2026-06-01T08:00:00.000Z',
    overdueSince: null,
    paymentAuthorizationStatus: 'ready',
  },
  createdAtIso: '2026-03-01T08:00:00.000Z',
  firstVisitRequest: null,
  isHydratedFromApi: false,
  paymentPhoneNumber: '+22890123456',
  paymentProvider: 'mixx',
  pendingAddressChange: null,
  recentVisits: [
    {
      scheduledDate: '2026-04-28',
      scheduledTimeWindow: 'morning',
      status: 'completed',
      visitId: 'visit-2026-04-28',
      workerId: '22222222-2222-4222-8222-222222222222',
    },
    {
      scheduledDate: '2026-04-21',
      scheduledTimeWindow: 'morning',
      status: 'completed',
      visitId: 'visit-2026-04-21',
      workerId: '22222222-2222-4222-8222-222222222222',
    },
    {
      scheduledDate: '2026-04-14',
      scheduledTimeWindow: 'morning',
      status: 'completed',
      visitId: 'visit-2026-04-14',
      workerId: '22222222-2222-4222-8222-222222222222',
    },
  ],
  status: 'active',
  subscriptionId: '33333333-3333-4333-8333-333333333333',
  tier: 'T1',
  upcomingVisits: [
    {
      scheduledDate: '2026-05-12',
      scheduledTimeWindow: 'morning',
      status: 'scheduled',
      visitId: 'visit-2026-05-12',
      workerId: '22222222-2222-4222-8222-222222222222',
    },
  ],
  visitsPerCycle: 1,
};

test('returning three-month subscriber home, visits, and payment history', async ({ page }) => {
  await page.addInitScript(
    ([appearanceKey, languageKey, signupKey, subscriptionKey, signupState, subscriptionState]) => {
      window.localStorage.setItem(appearanceKey, 'light');
      window.localStorage.setItem(languageKey, 'fr');
      window.localStorage.setItem('washed.x09.completed', '1');
      window.localStorage.setItem(signupKey, JSON.stringify(signupState));
      window.localStorage.setItem(subscriptionKey, JSON.stringify(subscriptionState));
    },
    [
      SUBSCRIBER_APPEARANCE_STORAGE_KEY,
      SUBSCRIBER_LANGUAGE_STORAGE_KEY,
      SUBSCRIBER_SIGNUP_STORAGE_KEY,
      SUBSCRIBER_SUBSCRIPTION_STORAGE_KEY,
      RETURNING_SIGNUP_STATE,
      RETURNING_SUBSCRIPTION_STATE,
    ] as const,
  );

  await page.goto('/#/hub');
  await expect(page.locator('[data-screen-id="X-10"]')).toBeVisible();
  await expect(page.getByText('bonjour Yawa')).toBeVisible();
  await expect(page.getByText('Prochaine visite')).toBeVisible();
  await expect(page.getByText('Matin')).toBeVisible();
  await expect(page.getByText('Mardi 12 mai')).toBeVisible();
  await expect(page.getByText('Akouvi K.')).toBeVisible();
  await expect(page.getByText('1 juin · auto')).toBeVisible();
  await expect(page.getByText('Visite à planifier')).toHaveCount(0);
  await page.screenshot({ fullPage: true, path: 'screenshots/subscriber-returning-3m-home.png' });

  await page.goto('/#/history');
  await expect(page.locator('[data-screen-id="X-16"]')).toBeVisible();
  await expect(page.getByText(/Avec Akouvi depuis 3 mois/u)).toBeVisible();
  await expect(page.getByText('Mois couverts')).toBeVisible();
  await expect(page.getByText('28 avr · Matin')).toBeVisible();
  await expect(page.getByText('Total payé')).toHaveCount(0);
  await expect(page.getByText(/80\s000/u)).toHaveCount(0);
  await page.screenshot({
    fullPage: true,
    path: 'screenshots/subscriber-returning-3m-visits.png',
  });

  await page.goto('/#/plan/payments');
  await expect(page.locator('[data-screen-id="X-20"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: /3 mois couverts/u })).toBeVisible();
  await expect(page.getByText('Mois couverts', { exact: true })).toBeVisible();
  await expect(page.getByText('À jour')).toBeVisible();
  await expect(page.getByText('3 prélèvements')).toBeVisible();
  await expect(page.getByText('Total payé')).toHaveCount(0);
  await page.screenshot({
    fullPage: true,
    path: 'screenshots/subscriber-returning-3m-payments.png',
  });
});
