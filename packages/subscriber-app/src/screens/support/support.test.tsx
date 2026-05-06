import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { SubscriberApiProvider } from '../../api/SubscriberApiContext.js';
import {
  DEFAULT_SUBSCRIBER_SUBSCRIPTION_STATE,
  SubscriberSubscriptionProvider,
} from '../../subscription/SubscriberSubscriptionContext.js';
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
  apiOptions: { readonly baseUrl?: string | null; readonly fetch?: typeof fetch } = {
    baseUrl: null,
  },
): { locationRef: { current: string } } {
  const locationRef = { current: initialEntries.at(-1) ?? path };

  function Spy(): ReactElement {
    const location = useLocation();
    locationRef.current = `${location.pathname}${location.search}${location.hash}`;
    return null as unknown as ReactElement;
  }

  render(
    <SubscriberApiProvider
      {...(apiOptions.baseUrl === undefined ? {} : { baseUrl: apiOptions.baseUrl })}
      {...(apiOptions.fetch === undefined ? {} : { fetch: apiOptions.fetch })}
    >
      <SubscriberSubscriptionProvider
        initialState={DEFAULT_SUBSCRIBER_SUBSCRIPTION_STATE}
        storageKey={null}
      >
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
        </MemoryRouter>
      </SubscriberSubscriptionProvider>
    </SubscriberApiProvider>,
  );

  return { locationRef };
}

function supportContact(input: {
  readonly body?: string;
  readonly contactId: string;
  readonly createdAt?: string;
  readonly resolutionNote?: string | null;
  readonly resolvedAt?: string | null;
  readonly status?: 'open' | 'resolved';
  readonly subject?: string;
}): Record<string, unknown> {
  return {
    body: input.body ?? 'La visite de ce matin doit être vérifiée.',
    category: 'visit',
    contactId: input.contactId,
    countryCode: 'TG',
    createdAt: input.createdAt ?? '2026-05-05T09:00:00.000Z',
    openedByUserId: '77777777-7777-4777-8777-777777777777',
    resolutionNote: input.resolutionNote ?? null,
    resolvedAt: input.resolvedAt ?? null,
    resolvedByOperatorUserId: null,
    status: input.status ?? 'open',
    subject: input.subject ?? 'Une visite · annulation, report, problème',
    subscriptionId: '33333333-3333-4333-8333-333333333333',
    messages: [],
  };
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

  it('uses live open ticket count when the subscriber API is configured', async () => {
    const fetchStub: typeof fetch = async () =>
      Response.json({
        items: [
          supportContact({ contactId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }),
          supportContact({ contactId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }),
        ],
        limit: 20,
        status: 'open',
        subscriptionId: '33333333-3333-4333-8333-333333333333',
      });

    renderAt('/support', <HelpCenterX29 />, '/support', ['/support'], {
      baseUrl: 'http://api.test',
      fetch: fetchStub,
    });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Mes tickets · 2 ouvert' })).toBeVisible(),
    );
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

  it('creates a live support contact without sending subscription identity in the body', async () => {
    const requests: Request[] = [];
    const fetchStub: typeof fetch = async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      return Response.json(
        supportContact({
          body: 'Je ne reconnais pas le montant prélevé.',
          contactId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          subject: 'Paiement Mobile Money',
        }),
        { status: 201 },
      );
    };
    const { locationRef } = renderAt(
      '/support/contact',
      <ContactBureauX30 />,
      '/support/contact',
      ['/support/contact'],
      { baseUrl: 'http://api.test', fetch: fetchStub },
    );

    fireEvent.click(screen.getByLabelText('Paiement Mobile Money'));
    fireEvent.change(screen.getByLabelText('VOTRE MESSAGE'), {
      target: { value: 'Je ne reconnais pas le montant prélevé.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer au bureau' }));

    await waitFor(() => expect(locationRef.current).toBe('/support/contact/submitted'));
    expect(requests[0]?.method).toBe('POST');
    expect(requests[0]?.url).toBe('http://api.test/v1/subscriber/subscription/support-contacts');
    await expect(requests[0]?.json()).resolves.toMatchObject({
      body: 'Je ne reconnais pas le montant prélevé.',
      category: 'payment',
      subject: 'Paiement Mobile Money',
    });
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

  it('renders live support contacts instead of demo tickets when configured', async () => {
    const requests: Request[] = [];
    const fetchStub: typeof fetch = async (input, init) => {
      requests.push(new Request(input, init));
      return Response.json({
        items: [
          supportContact({
            body: 'Le bureau doit vérifier la visite de mardi.',
            contactId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            subject: 'Question sur la visite',
          }),
        ],
        limit: 20,
        status: null,
        subscriptionId: '33333333-3333-4333-8333-333333333333',
      });
    };
    const { locationRef } = renderAt(
      '/support/tickets',
      <TicketsX31 />,
      '/support/tickets',
      ['/support/tickets'],
      { baseUrl: 'http://api.test', fetch: fetchStub },
    );

    await waitFor(() => expect(screen.getByText('Question sur la visite')).toBeVisible());
    expect(screen.queryByText('Linge endommagé — pull rouge décoloré')).not.toBeInTheDocument();
    expect(requests[0]?.url).toBe(
      'http://api.test/v1/subscriber/subscription/support-contacts?limit=20',
    );

    fireEvent.click(screen.getByRole('button', { name: /Question sur la visite/u }));
    expect(locationRef.current).toBe('/support/tickets/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
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

    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(screen.getByText("Vous · à l'instant")).toBeVisible();
    expect(screen.getByText('Merci Ama.')).toBeVisible();
    expect(reply.value).toBe('');
    expect(screen.getByRole('button', { name: 'Envoyer' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(locationRef.current).toBe('/support/tickets');
  });

  it('renders a safe not-found state for stale ticket links', () => {
    renderAt('/support/tickets/9999', <TicketDetailX32 />, '/support/tickets/:ticketId');

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-32');
    expect(screen.getByRole('heading', { name: 'Ticket introuvable.' })).toBeVisible();
    expect(screen.getByText(/Cette demande n.est pas liée à votre compte/u)).toBeVisible();
  });

  it('loads a live support contact detail and keeps reply sending usable', async () => {
    const fetchStub: typeof fetch = async (input) => {
      if (String(input).endsWith('/messages')) {
        return Response.json(
          {
            authorRole: 'subscriber',
            authorUserId: '77777777-7777-4777-8777-777777777777',
            body: 'Merci, je reste disponible.',
            contactId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            countryCode: 'TG',
            createdAt: '2026-05-06T10:00:00.000Z',
            messageId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            subscriptionId: '33333333-3333-4333-8333-333333333333',
          },
          { status: 201 },
        );
      }

      return Response.json(
        supportContact({
          body: 'La laveuse est arrivée très en retard.',
          contactId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          subject: 'Retard sur la visite',
        }),
      );
    };

    renderAt(
      '/support/tickets/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      <TicketDetailX32 />,
      '/support/tickets/:ticketId',
      ['/support/tickets/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
      { baseUrl: 'http://api.test', fetch: fetchStub },
    );

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Retard sur la visite' })).toBeVisible(),
    );
    expect(screen.getByText('La laveuse est arrivée très en retard.')).toBeVisible();

    const reply = screen.getByLabelText('Répondre') as HTMLInputElement;
    fireEvent.change(reply, { target: { value: 'Merci, je reste disponible.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));

    await waitFor(() => expect(screen.getByText('Merci, je reste disponible.')).toBeVisible());
    expect(reply.value).toBe('');
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
