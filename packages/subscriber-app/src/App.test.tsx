import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App.js';

describe('subscriber app', () => {
  it('renders the product subscriber home surface', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Essi Agbodzan', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /mardi 5 mai/u, level: 2 })).toBeInTheDocument();
    expect(screen.getByText('PROCHAINE VISITE')).toBeInTheDocument();
    expect(screen.getByText('Visites à venir')).toBeInTheDocument();
    expect(screen.getByText('Tout est prêt')).toBeInTheDocument();
    expect(screen.getByText('Dernier message')).toBeInTheDocument();
    expect(screen.queryByText('35 surfaces')).not.toBeInTheDocument();
    expect(screen.queryByText('Inventaire des écrans production')).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
  });

  it('shows bounded tracking only after the en-route action starts it', () => {
    render(<App />);

    expect(screen.queryByLabelText('Bounded live map')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'En route' }));

    expect(screen.getByLabelText('Bounded live map')).toBeInTheDocument();
    expect(screen.getByText('Akouvi · 12 min')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: "Confirmer l'arrivée" }));

    expect(screen.queryByLabelText('Bounded live map')).not.toBeInTheDocument();
    expect(screen.getByText('Tout est prêt')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'En cours' }));

    expect(screen.getByText('Visite marquée en cours.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'En cours', pressed: true })).toBeInTheDocument();
  });

  it('navigates to subscription controls from the bottom nav', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Abonnement' }));

    expect(screen.getByRole('heading', { name: "Gestion de l'abonnement" })).toBeInTheDocument();
    expect(screen.getByText('Demander un remplacement')).toBeInTheDocument();
    expect(screen.getAllByText('2 / 2')).toHaveLength(2);
    expect(screen.getByText(/en retard/u)).toBeInTheDocument();
  });

  it('applies subscription and payment actions through the reducer', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Abonnement' }));
    fireEvent.click(screen.getByRole('button', { name: /Demander un remplacement/u }));

    expect(
      screen.getByText('Demande de remplacement envoyée pour validation opérateur.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Demander un remplacement 1 \/ 2/u }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Sauter la visite/u }));

    expect(
      screen.getByText('Crédit de saut utilisé pour la prochaine visite.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sauter la visite 1 \/ 2/u })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Changer la formule' }));

    expect(screen.getByText(/T3/u)).toBeInTheDocument();
    expect(screen.getByText('Changement de formule prévisualisé.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Régulariser le paiement' }));

    expect(screen.getByText('Paiement marqué comme régularisé.')).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes('Mai 2026') && content.includes('régularisé')),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: "Annuler l'abonnement" }));

    expect(
      screen.getByText("Demande d'annulation enregistrée. Le support confirmera la date finale."),
    ).toBeInTheDocument();
  });

  it('renders onboarding and support flows from primary actions', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Profil' }));
    fireEvent.click(screen.getByRole('button', { name: 'Départ' }));

    expect(screen.getByRole('heading', { name: 'Inscription abonnée' })).toBeInTheDocument();
    expect(within(screen.getByLabelText('Onboarding steps')).getAllByText(/./u)).not.toHaveLength(
      0,
    );
    expect(screen.getByRole('heading', { name: 'Langue', level: 2 })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(screen.getByRole('textbox', { name: 'Téléphone' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(screen.getByRole('textbox', { name: 'OTP' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(screen.getByRole('textbox', { name: 'Quartier' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    fireEvent.click(screen.getByRole('button', { name: /T3/u }));
    expect(screen.getByRole('button', { name: /T3/u, pressed: true })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    fireEvent.click(screen.getByRole('button', { name: /Jeudi/u }));
    expect(screen.getByRole('button', { name: /Jeudi/u, pressed: true })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(screen.getByRole('textbox', { name: 'Mobile Money' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(screen.getByText(/Le foyer est prêt pour validation Washed/u)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Terminé' }));
    fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('button', {
        name: 'Messages',
      }),
    );

    expect(screen.getByRole('heading', { name: 'Support' })).toBeInTheDocument();
    expect(screen.getByText('Messages relayés par opérateur')).toBeInTheDocument();
  });

  it('switches the subscriber interface to English', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Switch language' }));

    expect(screen.getByText('Everything is ready')).toBeInTheDocument();
    expect(screen.getByText('Latest message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Plan' })).toBeInTheDocument();
  });

  it('records subscriber privacy requests from the profile surface', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Profil' }));
    fireEvent.click(screen.getByRole('button', { name: 'Exporter mes données' }));

    expect(screen.getByText("Demande d'export confidentialité mise en file.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: "Demander l'effacement" }));

    expect(
      screen.getByText("Demande d'effacement mise en file pour revue opérateur."),
    ).toBeInTheDocument();
  });

  it('opens first-class subscriber visit, inbox, and billing surfaces', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Voir la visite' }));
    expect(screen.getByRole('heading', { name: 'Détail de visite' })).toBeInTheDocument();
    expect(screen.getByText('Photos avant/après et preuve de visite')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Démarrer le suivi' }));
    expect(screen.getByLabelText('Bounded live map')).toBeInTheDocument();

    fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('button', {
        name: 'Messages',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Inbox' }));
    expect(
      screen.getByRole('heading', { name: 'Boîte de réception et notifications' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Rappel visite mardi')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Abonnement' }));
    fireEvent.click(screen.getByRole('button', { name: 'Paiements' }));
    expect(screen.getByRole('heading', { name: 'Historique de paiement' })).toBeInTheDocument();
    expect(screen.getByText('Crédits support')).toBeInTheDocument();
  });

  it('opens payment recovery, legal, and account recovery surfaces', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Abonnement' }));
    fireEvent.click(screen.getByRole('button', { name: 'Paiement' }));
    expect(screen.getByRole('heading', { name: 'Régularisation du paiement' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Régulariser le paiement' }));
    expect(screen.getByText('Paiement marqué comme régularisé.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Profil' }));
    fireEvent.click(screen.getByRole('button', { name: 'Legal' }));
    expect(
      screen.getByRole('heading', { name: 'Conditions et confidentialité' }),
    ).toBeInTheDocument();
    expect(screen.getByText("Conditions d'utilisation")).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Profil' }));
    fireEvent.click(screen.getByRole('button', { name: 'Récupération' }));
    expect(screen.getByRole('heading', { name: 'Récupération du compte' })).toBeInTheDocument();
    expect(screen.getByText("Contrôles d'identité")).toBeInTheDocument();
  });
});
