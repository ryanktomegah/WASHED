import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import {
  ContactBureauX30,
  ContactSubmittedX30S,
  HelpCenterX29,
  MaintenanceX34,
  OfflineX33,
  TicketDetailX32,
  TicketsX31,
  UpdateRequiredX35,
} from './SupportScreens.js';

function renderAt(
  path: string,
  element: ReactElement,
  routePath = path,
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
          path={routePath}
        />
        <Route element={<Spy />} path="*" />
      </Routes>
    </MemoryRouter>,
  );

  return { locationRef };
}

describe('Subscriber support · X-29 Help center', () => {
  it('renders phone-first help, FAQ, and support CTAs', () => {
    const { locationRef } = renderAt('/support', <HelpCenterX29 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-29');
    expect(screen.getByRole('heading', { name: 'On vous écoute.' })).toBeVisible();
    expect(screen.getByRole('link', { name: /Appeler le bureau/u })).toHaveAttribute(
      'href',
      'tel:+22890000000',
    );
    expect(screen.getByText('Questions fréquentes')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Comment annuler une visite ?' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Comment annuler une visite ?' }));
    expect(screen.getByText(/Depuis le détail de visite/u)).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: /Mes tickets/u }));
    expect(locationRef.current).toBe('/support/tickets');
  });

  it('routes écrire au bureau to X-30 contact', () => {
    const { locationRef } = renderAt('/support', <HelpCenterX29 />);

    fireEvent.click(screen.getByRole('button', { name: 'Écrire au bureau' }));
    expect(locationRef.current).toBe('/support/contact');
  });
});

describe('Subscriber support · X-30 Contact bureau', () => {
  it('renders categories and submits a message to X-30.S', () => {
    const { locationRef } = renderAt('/support/contact', <ContactBureauX30 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-30');
    expect(screen.getByRole('heading', { name: 'De quoi voulez-vous parler ?' })).toBeVisible();
    expect(screen.getByLabelText('Une visite · annulation, report, problème')).toBeChecked();
    expect(screen.getByLabelText('Paiement Mobile Money')).toBeVisible();

    const message = screen.getByLabelText('VOTRE MESSAGE') as HTMLTextAreaElement;
    expect(screen.getByRole('button', { name: 'Envoyer au bureau' })).toBeDisabled();
    fireEvent.change(message, { target: { value: 'Mon pull rouge a déteint.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer au bureau' }));

    expect(locationRef.current).toBe('/support/contact/submitted');
  });

  it('returns to X-29 from the header control when opened directly', () => {
    const { locationRef } = renderAt('/support/contact', <ContactBureauX30 />);

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(locationRef.current).toBe('/support');
  });
});

describe('Subscriber support · X-30.S Contact submitted', () => {
  it('renders ticket confirmation and routes to tickets or home', () => {
    const { locationRef } = renderAt('/support/contact/submitted', <ContactSubmittedX30S />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-30.S');
    expect(screen.getByRole('heading', { name: 'Message envoyé.' })).toBeVisible();
    expect(screen.getByText('Ticket #0422 créé. Le bureau vous répond sous 4 h.')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Voir mes tickets' }));
    expect(locationRef.current).toBe('/support/tickets');

    const h = renderAt('/support/contact/submitted', <ContactSubmittedX30S />);
    fireEvent.click(screen.getByRole('button', { name: /Retour à l.accueil/u }));
    expect(h.locationRef.current).toBe('/hub');
  });
});

describe('Subscriber support · X-31 Tickets', () => {
  it('renders open and resolved tickets and routes to detail/contact', () => {
    const { locationRef } = renderAt('/support/tickets', <TicketsX31 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-31');
    expect(screen.getByRole('heading', { name: 'Vos demandes.' })).toBeVisible();
    expect(screen.getByText('#0421 · OUVERT')).toBeVisible();
    expect(screen.getByText('Linge endommagé — pull rouge décoloré')).toBeVisible();
    expect(screen.getByText('#0388 · RÉSOLU')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: /#0421/u }));
    expect(locationRef.current).toBe('/support/tickets/0421');

    const c = renderAt('/support/tickets', <TicketsX31 />);
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir une demande' }));
    expect(c.locationRef.current).toBe('/support/contact');
  });
});

describe('Subscriber support · X-32 Ticket detail', () => {
  it('renders the ticket conversation and reply composer', () => {
    const { locationRef } = renderAt(
      '/support/tickets/0421',
      <TicketDetailX32 />,
      '/support/tickets/:ticketId',
    );

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-32');
    expect(screen.getByRole('heading', { name: /Linge endommagé/u })).toBeVisible();
    expect(screen.getByText('EN COURS')).toBeVisible();
    expect(screen.getByText(/Mon pull rouge a déteint/u)).toBeVisible();
    expect(screen.getByText(/Bonjour Yawa/u)).toBeVisible();

    const reply = screen.getByLabelText('Répondre') as HTMLInputElement;
    expect(screen.getByRole('button', { name: 'Envoyer' })).toBeDisabled();
    fireEvent.change(reply, { target: { value: 'Merci Ama.' } });
    expect(screen.getByRole('button', { name: 'Envoyer' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(locationRef.current).toBe('/support/tickets');
  });

  it('renders a safe not-found state for stale ticket links', () => {
    renderAt('/support/tickets/9999', <TicketDetailX32 />, '/support/tickets/:ticketId');

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-32');
    expect(screen.getByRole('heading', { name: 'Ticket introuvable.' })).toBeVisible();
    expect(screen.getByText(/Cette demande n.est pas liée à votre compte/u)).toBeVisible();
  });
});

describe('Subscriber system states · X-33 through X-35', () => {
  it('renders offline cache and retries to the hub', () => {
    const { locationRef } = renderAt('/offline', <OfflineX33 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-33');
    expect(screen.getByText('HORS LIGNE · DERNIÈRE MAJ 9 H 38')).toBeVisible();
    expect(screen.getByText('On vérifie le réseau toutes les 30 secondes.')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(locationRef.current).toBe('/hub');
  });

  it('renders planned maintenance with an emergency phone link', () => {
    renderAt('/maintenance', <MaintenanceX34 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-34');
    expect(screen.getByRole('heading', { name: 'Maintenance en cours.' })).toBeVisible();
    expect(screen.getByText(/Maintenue · pas d.impact/u)).toBeVisible();
    expect(screen.getByRole('link', { name: /90 00 00 00/u })).toHaveAttribute(
      'href',
      'tel:+22890000000',
    );
  });

  it('renders required update with a blocking update action', () => {
    renderAt('/update-required', <UpdateRequiredX35 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-35');
    expect(
      screen.getByRole('heading', { name: /Une nouvelle version est disponible\./u }),
    ).toBeVisible();
    expect(screen.getByText('Correctifs de sécurité')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Mettre à jour' })).toHaveAttribute(
      'href',
      'https://washed.app/update',
    );
  });
});
