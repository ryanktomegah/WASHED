import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App.js';

describe('worker app', () => {
  it('renders route, offline, and safety surfaces', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: "3 visites aujourd'hui" })).toBeInTheDocument();
    expect(screen.getByText('Kofi Mensah')).toBeInTheDocument();
    expect(screen.getAllByText('Ama Dossou').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Yao Agbeko')).toBeInTheDocument();
    expect(screen.getByText('Salaire · Avril 2026')).toBeInTheDocument();
    expect(screen.queryByLabelText('Offline action ledger')).not.toBeInTheDocument();
    expect(screen.queryByText(/actions en attente de synchronisation/u)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Ouvrir visite/u }));

    expect(screen.getByRole('button', { name: 'SOS' })).toBeInTheDocument();
    expect(screen.getByLabelText('Worker route lifecycle').children).toHaveLength(6);
    expect(screen.getByLabelText('Guided visit workflow')).toBeInTheDocument();
    expect(screen.getByText('En route vers Ama K.')).toBeInTheDocument();
  });

  it('opens and closes the SOS sheet', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Ouvrir visite/u }));
    fireEvent.click(screen.getByRole('button', { name: 'SOS' }));

    expect(screen.getByRole('dialog', { name: 'Aide immédiate' })).toBeInTheDocument();
    expect(screen.getByText("Prévenir l'opérateur")).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));

    expect(screen.queryByRole('dialog', { name: 'Aide immédiate' })).not.toBeInTheDocument();
  });

  it('records SOS confirmation through worker state', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Ouvrir visite/u }));
    fireEvent.click(screen.getByRole('button', { name: 'SOS' }));
    fireEvent.click(screen.getByRole('button', { name: "Prévenir l'opérateur" }));

    expect(screen.queryByRole('dialog', { name: 'Aide immédiate' })).not.toBeInTheDocument();
    expect(screen.getByText("Alerte SOS envoyée à l'opérateur.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: "Aujourd'hui" }));
    expect(screen.getByText('1 actions en attente de synchronisation')).toBeInTheDocument();
  });

  it('syncs offline actions and advances the visit lifecycle', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Ouvrir visite/u }));

    fireEvent.click(screen.getByRole('button', { name: "Pointer l'arrivée" }));

    expect(
      await screen.findByText("Pointage d'arrivée ajouté à la file hors ligne."),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pointage arrivée' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('Arrivée pointée')).toBeInTheDocument();
    expect(screen.getByLabelText('Last GPS proof')).toHaveTextContent('GPS arrivée capturé');

    fireEvent.click(screen.getByRole('button', { name: 'Prendre photo avant' }));
    expect(
      await screen.findByText('Photo avant ajoutée à la file hors ligne.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Preuve avant capturée')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Démarrer la visite' }));
    expect(screen.getByText('Visite marquée en cours.')).toBeInTheDocument();
    expect(
      within(screen.getByLabelText('Guided visit workflow')).getByText('Visite en cours'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Prendre photo après' }));
    expect(
      await screen.findByText('Photo après ajoutée à la file hors ligne.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Photo après enregistrée')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pointer la sortie' }));
    expect(
      await screen.findByText('Pointage de sortie ajouté à la file hors ligne.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Sortie pointée')).toBeInTheDocument();
    expect(screen.getByLabelText('Last GPS proof')).toHaveTextContent('GPS sortie capturé');

    fireEvent.click(screen.getByRole('button', { name: 'Signaler un problème' }));
    expect(screen.getByText('Signalement ajouté à la file hors ligne.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Déclarer absence foyer' }));
    expect(
      screen.getByText('Absence foyer déclarée et ajoutée à la file hors ligne.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: "Aujourd'hui" }));
    expect(screen.getByText('6 actions en attente de synchronisation')).toBeInTheDocument();
    expect(screen.getByLabelText('Offline action ledger')).toHaveTextContent('checkOutVisit');
  });

  it('navigates to planning, earnings, and profile and records worker actions', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Planning' }));
    expect(screen.getByRole('heading', { name: 'Planning' })).toBeInTheDocument();
    expect(screen.getByText('Semaine du 4 mai')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Marquer indisponible' }));
    expect(screen.getByText('Indisponibilité envoyée à la planification.')).toBeInTheDocument();
    expect(screen.getAllByText('Indisponible')).toHaveLength(4);

    fireEvent.click(screen.getByRole('button', { name: 'Gains' }));
    expect(screen.getByRole('heading', { name: 'Gains' })).toBeInTheDocument();
    expect(screen.getByText('TOTAL DU MOIS')).toBeInTheDocument();
    expect(screen.getByText('Fixe garanti')).toBeInTheDocument();
    expect(screen.getByText('Paiement dimanche 4 mai')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Demander une avance' }));
    expect(screen.getByText("Demande d'avance envoyée à l'opérateur.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Demander une avance' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Profil' }));
    expect(screen.getByRole('heading', { name: 'Profil' })).toBeInTheDocument();
    expect(screen.getByLabelText('Worker app surfaces').children).toHaveLength(14);
    fireEvent.click(screen.getByRole('button', { name: 'Exporter mes données' }));
    expect(screen.getByText("Demande d'export des données enregistrée.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: "Demander l'effacement" }));
    expect(
      screen.getByText("Demande d'effacement envoyée pour revue opérateur."),
    ).toBeInTheDocument();
  });

  it('handles activation, inbox, photo retry, and day summary surfaces', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Profil' }));
    fireEvent.click(screen.getByRole('button', { name: 'Activation' }));
    expect(screen.getByRole('heading', { name: 'Activation du profil' })).toBeInTheDocument();
    expect(screen.getByText('Accord travailleuse')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: "Terminer l'activation" }));
    expect(screen.getByText('Profil activé pour les routes terrain.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Profil' }));
    fireEvent.click(screen.getByRole('button', { name: 'Inbox' }));
    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByText('Route de demain confirmée')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: "Aujourd'hui" }));
    fireEvent.click(screen.getByRole('button', { name: /Ouvrir visite/u }));
    fireEvent.click(screen.getByRole('button', { name: 'Photos' }));
    expect(screen.getByRole('heading', { name: 'Contrôle photo' })).toBeInTheDocument();
    expect(screen.getByLabelText('Photo quality preview')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre la photo' }));
    expect(
      await screen.findByText('Photo avant ajoutée à la file hors ligne.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Profil' }));
    fireEvent.click(screen.getByRole('button', { name: 'Résumé' }));
    expect(screen.getByRole('heading', { name: 'Résumé de fin de journée' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clôturer la journée' }));
    expect(screen.getByText('Résumé de fin de journée enregistré.')).toBeInTheDocument();
    expect(screen.getByText('Clôturée')).toBeInTheDocument();
  });

  it('restores queued worker state after an app restart', async () => {
    const { unmount } = render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Ouvrir visite/u }));
    fireEvent.click(screen.getByRole('button', { name: "Pointer l'arrivée" }));
    await screen.findByText("Pointage d'arrivée ajouté à la file hors ligne.");
    fireEvent.click(screen.getByRole('button', { name: 'Prendre photo avant' }));
    await screen.findByText('Photo avant ajoutée à la file hors ligne.');

    await waitFor(() => {
      expect(localStorage.getItem('washed.worker.local-state.v1')).toContain('visit.before_photo');
    });

    unmount();
    render(<App />);

    expect(await screen.findByText('2 actions en attente de synchronisation')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ouvrir visite/u }));
    expect(await screen.findByText('Preuve avant capturée')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Aide immédiate' })).not.toBeInTheDocument();
  });
});
