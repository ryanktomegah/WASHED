import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import {
  VisitDetailX11,
  VisitEnRouteX12,
  VisitFeedbackX15,
  VisitInProgressX13,
  VisitIssueSubmittedX15S,
  VisitIssueX15S,
  VisitRescheduleX11M,
  VisitRevealX14,
} from './VisitScreens.js';

function renderAt(
  path: string,
  element: ReactElement,
  initialEntries: readonly string[] = [path],
): { locationRef: { current: string } } {
  const locationRef = { current: initialEntries.at(-1) ?? path };

  function Spy(): ReactElement {
    const location = useLocation();
    locationRef.current = `${location.pathname}${location.search}${location.hash}`;
    return null as unknown as ReactElement;
  }

  render(
    <MemoryRouter initialEntries={[...initialEntries]} initialIndex={initialEntries.length - 1}>
      <Routes>
        <Route
          element={
            <>
              {element}
              <Spy />
            </>
          }
          path={path}
        />
        <Route element={<Spy />} path="*" />
      </Routes>
    </MemoryRouter>,
  );

  return { locationRef };
}

describe('Subscriber visit · X-11 Detail', () => {
  it('renders the deck copy and routes all in-scope actions', () => {
    const { locationRef } = renderAt('/visit/detail', <VisitDetailX11 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-11');
    expect(screen.getByRole('heading', { name: /Akouvi K\. arrive à 9 h 00\./u })).toBeVisible();
    expect(screen.getByText("Ce qu'elle apporte")).toBeVisible();
    expect(
      screen.getByText("Rien — vous fournissez l'eau, le savon et la bassine, comme d'habitude."),
    ).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Suivre Akouvi' }));
    expect(locationRef.current).toBe('/visit/en-route');
  });

  it('routes reporter action', () => {
    const { locationRef } = renderAt('/visit/detail', <VisitDetailX11 />);

    fireEvent.click(screen.getByRole('button', { name: 'Reporter' }));
    expect(locationRef.current).toBe('/visit/reschedule');
  });

  it('routes issue action', () => {
    const { locationRef } = renderAt('/visit/detail', <VisitDetailX11 />);

    fireEvent.click(screen.getByRole('button', { name: 'Signaler un souci' }));
    expect(locationRef.current).toBe('/visit/issue');
  });
});

describe('Subscriber visit · X-11.M Reschedule', () => {
  it('lets the user pick a date and confirms back to visit detail', () => {
    const { locationRef } = renderAt('/visit/reschedule', <VisitRescheduleX11M />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-11.M');
    expect(screen.getByRole('heading', { name: 'Choisir un autre créneau.' })).toBeVisible();

    const saturday = screen.getByLabelText(/Samedi 9 mai/u) as HTMLInputElement;
    fireEvent.click(saturday);
    expect(saturday.checked).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le report' }));
    expect(locationRef.current).toBe('/visit/detail');
  });

  it('returns to the actual previous visit page from the header control', () => {
    const { locationRef } = renderAt('/visit/reschedule', <VisitRescheduleX11M />, [
      '/visit/detail',
      '/visit/reschedule',
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(locationRef.current).toBe('/visit/detail');
  });
});

describe('Subscriber visit · X-12 En Route', () => {
  it('renders tracking map and ETA details', () => {
    renderAt('/visit/en-route', <VisitEnRouteX12 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-12');
    expect(screen.getByLabelText('Carte de suivi')).toBeVisible();
    expect(screen.getByText('800 m')).toBeVisible();
    expect(screen.getByText('8 min')).toBeVisible();
    expect(screen.getByText('Mise à jour toutes les 30 secondes')).toBeVisible();
  });
});

describe('Subscriber visit · X-13 In Progress', () => {
  it('renders the reassurance copy and routes close to the hub', () => {
    const { locationRef } = renderAt('/visit/in-progress', <VisitInProgressX13 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-13');
    expect(
      screen.getByRole('heading', { name: 'Le linge est entre de bonnes mains.' }),
    ).toBeVisible();
    expect(
      screen.getByText("Vous pouvez fermer l'app. On vous prévient quand c'est fini."),
    ).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: "Fermer l'app sereinement" }));
    expect(locationRef.current).toBe('/hub');
  });
});

describe('Subscriber visit · X-14 Reveal', () => {
  it('renders before/after photo panels and routes good feedback', () => {
    const { locationRef } = renderAt('/visit/reveal', <VisitRevealX14 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-14');
    expect(screen.getByLabelText('Photos avant et après')).toBeVisible();
    expect(screen.getByText('Avant — 9 h 01')).toBeVisible();
    expect(screen.getByText('Après — 10 h 04')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Tout va bien' }));
    expect(locationRef.current).toBe('/visit/feedback');
  });

  it('routes the issue branch', () => {
    const { locationRef } = renderAt('/visit/reveal', <VisitRevealX14 />);

    fireEvent.click(screen.getByRole('button', { name: 'Signaler un souci' }));
    expect(locationRef.current).toBe('/visit/issue');
  });
});

describe('Subscriber visit · X-15 Feedback', () => {
  it('renders the positive confirmation and returns to the hub', () => {
    const { locationRef } = renderAt('/visit/feedback', <VisitFeedbackX15 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-15');
    expect(screen.getByRole('heading', { name: 'Merci.' })).toBeVisible();
    expect(screen.getByText('33 visites')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: "Retour à l'accueil" }));
    expect(locationRef.current).toBe('/hub');
  });
});

describe('Subscriber visit · X-15.S Issue', () => {
  it('selects an issue and submits to the confirmation route', () => {
    const { locationRef } = renderAt('/visit/issue', <VisitIssueX15S />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-15.S');
    expect(
      screen.getByText(
        'Le bureau vous rappelle dans la journée. Akouvi ne voit pas ce signalement.',
      ),
    ).toBeVisible();

    const option = screen.getByLabelText('Linge mal lavé') as HTMLInputElement;
    fireEvent.click(option);
    expect(option.checked).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Suivant · ajouter photos' }));
    expect(locationRef.current).toBe('/visit/issue/submitted');
  });

  it('renders submitted confirmation and returns to the hub', () => {
    const { locationRef } = renderAt('/visit/issue/submitted', <VisitIssueSubmittedX15S />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-15.S');
    expect(screen.getByRole('heading', { name: 'Signalement reçu.' })).toBeVisible();
    expect(screen.getByText('Ticket #0421 créé. Le bureau vous répond sous 4 h.')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: "Retour à l'accueil" }));
    expect(locationRef.current).toBe('/hub');
  });
});
