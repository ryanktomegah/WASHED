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
  it('renders the locked visit detail and routes the report action', () => {
    const { locationRef } = renderAt('/visit/detail', <VisitDetailX11 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-11');
    expect(screen.getByText('Prochaine visite')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Mardi 7 mai · 9:00' })).toBeVisible();
    expect(screen.getByText('Akouvi K. vient pour votre visite mensuelle.')).toBeVisible();
    expect(screen.getByText('Tokoin Casablanca')).toBeVisible();
    expect(screen.getByText('1 h 15')).toBeVisible();
    expect(screen.getByText('1 visite / mois')).toBeVisible();
    expect(screen.getByText("Vous pouvez reporter jusqu'à 18 h la veille.")).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Reporter la visite' }));
    expect(locationRef.current).toBe('/visit/reschedule');
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
  it('selects an issue, requires a photo, then submits to the confirmation route', () => {
    const { locationRef } = renderAt('/visit/issue', <VisitIssueX15S />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-15.S');
    expect(
      screen.getByText(
        'Le bureau vous rappelle dans la journée. Akouvi ne voit pas ce signalement.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Suivant · ajouter photos' })).toBeDisabled();

    const option = screen.getByLabelText('Linge mal lavé') as HTMLInputElement;
    fireEvent.click(option);
    expect(option.checked).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Suivant · ajouter photos' }));
    expect(locationRef.current).toBe('/visit/issue');
    expect(screen.getByRole('heading', { name: 'Ajoutez des photos du souci.' })).toBeVisible();
    expect(screen.getByText('Aucune photo ajoutée')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Envoyer le signalement' })).toBeDisabled();

    const photoInput = screen.getByLabelText(/Ajouter des photos/u) as HTMLInputElement;
    const photo = new File(['photo'], 'linge-endommage.jpg', { type: 'image/jpeg' });
    fireEvent.change(photoInput, { target: { files: [photo] } });

    expect(screen.getByText('1 photo ajoutée')).toBeVisible();
    expect(screen.getByText('linge-endommage.jpg')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le signalement' }));
    expect(locationRef.current).toBe('/visit/issue/submitted');
  });

  it('renders submitted confirmation and routes to the created ticket or home', () => {
    const { locationRef } = renderAt('/visit/issue/submitted', <VisitIssueSubmittedX15S />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-15.S');
    expect(screen.getByRole('heading', { name: 'Signalement reçu.' })).toBeVisible();
    expect(screen.getByText('Ticket #0421 créé. Le bureau vous répond sous 4 h.')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Voir mon ticket' }));
    expect(locationRef.current).toBe('/support/tickets/0421');

    const h = renderAt('/visit/issue/submitted', <VisitIssueSubmittedX15S />);
    fireEvent.click(screen.getByRole('button', { name: "Retour à l'accueil" }));
    expect(h.locationRef.current).toBe('/hub');
  });
});
