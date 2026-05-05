import { cleanup, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { setActiveLocale } from '@washed/i18n';

import { HistoryDetailX17, HistoryX16 } from './history/HistoryX16.js';
import { HubX10 } from './hub/HubX10.js';
import { TOUR_STORAGE_KEY } from './hub/useTourState.js';
import { PlanX19 } from './plan/PlanScreens.js';
import { ProfileX24 } from './profile/ProfileScreens.js';
import { TicketsX31 } from './support/SupportScreens.js';
import { VisitDetailX11, VisitRescheduleX11M } from './visits/VisitScreens.js';
import { WorkerProfileX18 } from './worker-profile/WorkerProfileX18.js';

function renderEnglishAt(path: string, element: ReactElement, routePath = path): void {
  cleanup();
  setActiveLocale('en');
  window.localStorage.setItem(TOUR_STORAGE_KEY, '1');

  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={element} path={routePath} />
      </Routes>
    </MemoryRouter>,
  );
}

function expectNoFrenchDateOrRecordCopy(): void {
  expect(document.body).not.toHaveTextContent(
    /\b(Mardi|Jeudi|Samedi|avril|septembre|il y a|Linge endommagé|laveuse|créneau)\b/u,
  );
}

afterEach(() => {
  window.localStorage.removeItem(TOUR_STORAGE_KEY);
});

describe('Subscriber English locale smoke', () => {
  it('renders hub schedule and streak data in English', () => {
    renderEnglishAt('/hub', <HubX10 />);

    expect(screen.getByText('Next visit')).toBeVisible();
    expect(screen.getByText('Tuesday')).toBeVisible();
    expect(screen.getByText('Last visit · April 28')).toBeVisible();
    expect(screen.getByText('32 visits')).toBeVisible();
    expectNoFrenchDateOrRecordCopy();
  });

  it('renders history list and detail dates in English', () => {
    renderEnglishAt('/history', <HistoryX16 />);

    expect(screen.getByRole('heading', { name: /With Akouvi for 8 months\./u })).toBeVisible();
    expect(screen.getByRole('button', { name: /Apr 28 · 9:02 AM/u })).toBeVisible();
    expect(screen.getByText('1 hr 06 · all good')).toBeVisible();
    expectNoFrenchDateOrRecordCopy();

    renderEnglishAt('/history/visit-2026-04-28', <HistoryDetailX17 />, '/history/:visitId');

    expect(screen.getByText('Visit · April 28')).toBeVisible();
    expect(
      screen.getByRole('heading', { name: /Good visit\. 1 hr 06 with Akouvi\./u }),
    ).toBeVisible();
    expect(screen.getByText('9:02 AM')).toBeVisible();
    expectNoFrenchDateOrRecordCopy();
  });

  it('renders plan dates and actions in English', () => {
    renderEnglishAt('/plan', <PlanX19 />);

    expect(screen.getByRole('heading', { name: 'All set until May 31.' })).toBeVisible();
    expect(screen.getByText('June 1 · auto')).toBeVisible();
    expect(screen.getByText('Tuesday May 5 · 9:00 AM')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Upgrade to 2 visits' })).toBeVisible();
    expectNoFrenchDateOrRecordCopy();
  });

  it('renders visit detail and reschedule options in English', () => {
    renderEnglishAt('/visit/detail', <VisitDetailX11 />);

    expect(screen.getByText('Visit · Tuesday, May 5')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Akouvi K. arrives at 9:00 AM.' })).toBeVisible();
    expect(screen.getByText('month 8')).toBeVisible();
    expect(screen.getByText('~1 hr 30')).toBeVisible();
    expectNoFrenchDateOrRecordCopy();

    renderEnglishAt('/visit/reschedule', <VisitRescheduleX11M />);

    expect(screen.getByText('Thursday, May 7')).toBeVisible();
    expect(screen.getByText('9:00 AM · Akouvi available')).toBeVisible();
    expect(screen.getByText('10:30 AM · same zone slot')).toBeVisible();
    expectNoFrenchDateOrRecordCopy();
  });

  it('renders support tickets, worker profile, and profile settings in English', () => {
    renderEnglishAt('/support/tickets', <TicketsX31 />);

    expect(screen.getByRole('heading', { name: 'Your requests.' })).toBeVisible();
    expect(screen.getByText('12 min ago')).toBeVisible();
    expect(screen.getByText('Damaged laundry — red sweater bled')).toBeVisible();
    expect(screen.getByText('The office is reviewing the April 28 visit.')).toBeVisible();
    expectNoFrenchDateOrRecordCopy();

    renderEnglishAt('/worker/akouvi', <WorkerProfileX18 />, '/worker/:workerId');

    expect(screen.getByText('Washerwoman profile')).toBeVisible();
    expect(
      screen.getByText(
        'Washerwoman since September 2025. 14 regular households in Lomé. Speaks French and Ewe.',
      ),
    ).toBeVisible();
    expectNoFrenchDateOrRecordCopy();

    renderEnglishAt('/profile', <ProfileX24 />);

    expect(screen.getByRole('heading', { name: 'Yawa Mensah' })).toBeVisible();
    expect(screen.getByText('Subscriber since Sep 2025')).toBeVisible();
    expect(screen.getByText('EN')).toBeVisible();
    expectNoFrenchDateOrRecordCopy();
  });
});
