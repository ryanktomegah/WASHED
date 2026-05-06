import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App.js';

async function unlockWorkerApp() {
  await screen.findByRole('heading', { name: /Bonjour\.\s*Votre numéro \?/u });
  fireEvent.change(screen.getByLabelText('Numéro'), { target: { value: '99 87 65 43' } });
  fireEvent.change(screen.getByLabelText('Code PIN — 4 chiffres'), {
    target: { value: '2468' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Entrer' }));
  await screen.findByRole('heading', { name: 'Bonjour Akouvi.' });
}

function openVisitDetail() {
  fireEvent.click(screen.getByRole('button', { name: /Démarrer la route/u }));
  expect(screen.getByRole('heading', { name: 'Ama Dossou' })).toBeInTheDocument();
  expect(screen.getByText('Tournée · visite 2 / 5')).toBeInTheDocument();
}

function startActiveVisit() {
  openVisitDetail();
  fireEvent.click(screen.getByRole('button', { name: /Démarrer la route/u }));
  expect(screen.getByLabelText('Guided visit workflow')).toBeInTheDocument();
}

describe('worker app', () => {
  it('shows splash and requires a PIN before route surfaces', async () => {
    render(<App />);

    expect(screen.getByText("L'appli laveuse")).toBeInTheDocument();
    await screen.findByRole('heading', { name: /Bonjour\.\s*Votre numéro \?/u });
    expect(screen.getByText('Connexion')).toBeInTheDocument();
    expect(screen.getByText('Le numéro inscrit chez Washed.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrer' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Numéro'), { target: { value: '99 87 65 43' } });
    fireEvent.change(screen.getByLabelText('Code PIN — 4 chiffres'), {
      target: { value: '2468' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrer' }));

    expect(await screen.findByRole('heading', { name: 'Bonjour Akouvi.' })).toBeInTheDocument();
  });

  it('renders route, offline, and safety surfaces', async () => {
    render(<App />);

    await unlockWorkerApp();

    expect(screen.getByRole('heading', { name: 'Bonjour Akouvi.' })).toBeInTheDocument();
    expect(screen.getByText(/5 visites/u)).toBeInTheDocument();
    expect(screen.getByText('Kofi Mensah')).toBeInTheDocument();
    expect(screen.getAllByText('Ama Dossou').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Yao Agbeko')).toBeInTheDocument();
    expect(screen.queryByText('Salaire · Avril 2026')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Offline action ledger')).not.toBeInTheDocument();
    expect(screen.queryByText(/actions en attente de synchronisation/u)).not.toBeInTheDocument();

    openVisitDetail();

    expect(screen.getByText('Tarif T1')).toBeInTheDocument();
    expect(screen.getByText('8e mois')).toBeInTheDocument();
    expect(screen.getByText('Mardi 5 mai · 11h30')).toBeInTheDocument();
    expect(screen.getByText('Note de la cliente')).toBeInTheDocument();
    expect(screen.getByText('Appeler bureau')).toHaveAttribute('href', 'tel:+22890000000');

    fireEvent.click(screen.getByRole('button', { name: /Démarrer la route/u }));

    expect(screen.getByRole('button', { name: 'SOS' })).toBeInTheDocument();
    expect(screen.getByLabelText('Worker route lifecycle').children).toHaveLength(6);
    expect(screen.getByLabelText('Guided visit workflow')).toBeInTheDocument();
    expect(screen.getByText('En route · Ama Dossou')).toBeInTheDocument();
  });

  it('opens and closes the SOS sheet', async () => {
    render(<App />);

    await unlockWorkerApp();

    startActiveVisit();
    fireEvent.click(screen.getByRole('button', { name: 'SOS' }));

    expect(screen.getByRole('dialog', { name: 'Que se passe-t-il ?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Je suis en danger/u })).toBeInTheDocument();
    expect(screen.getByText('Le bureau vous appelle dans 30 secondes.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(screen.queryByRole('dialog', { name: 'Que se passe-t-il ?' })).not.toBeInTheDocument();
  });

  it('records SOS reason through worker state', async () => {
    render(<App />);

    await unlockWorkerApp();

    startActiveVisit();
    fireEvent.click(screen.getByRole('button', { name: 'SOS' }));
    fireEvent.click(screen.getByRole('button', { name: /Je suis en danger/u }));

    expect(screen.queryByRole('dialog', { name: 'Que se passe-t-il ?' })).not.toBeInTheDocument();
    expect(screen.getByText("Alerte SOS envoyée à l'opérateur.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: "Aujourd'hui" }));
    expect(screen.getByText('1 actions en attente de synchronisation')).toBeInTheDocument();
    expect(screen.getByLabelText('Offline action ledger')).toHaveTextContent(
      'SOS · Je suis en danger',
    );
  });

  it('syncs offline actions and advances the visit lifecycle', async () => {
    render(<App />);

    await unlockWorkerApp();

    startActiveVisit();

    fireEvent.click(screen.getByRole('button', { name: "J'arrive" }));

    expect(
      await screen.findByText("Pointage d'arrivée ajouté à la file hors ligne."),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pointage arrivée' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('Vous êtes arrivée')).toBeInTheDocument();
    expect(screen.getByLabelText('Last GPS proof')).toHaveTextContent('GPS arrivée capturé');

    fireEvent.click(screen.getByRole('button', { name: 'Prendre photo avant' }));
    expect(
      await screen.findByText('Photo avant ajoutée à la file hors ligne.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Photo « avant » capturée')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Démarrer la visite' }));
    expect(screen.getByText('Visite marquée en cours.')).toBeInTheDocument();
    expect(
      within(screen.getByLabelText('Guided visit workflow')).getByText('Lavage en cours.'),
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
    expect(screen.getByLabelText('Offline action ledger')).toHaveTextContent('Sortie GPS');
    expect(screen.getByLabelText('Offline action ledger')).not.toHaveTextContent('checkOutVisit');
  });

  it('navigates to planning, earnings, and profile and records worker actions', async () => {
    render(<App />);

    await unlockWorkerApp();

    fireEvent.click(screen.getAllByRole('button', { name: 'Planning' }).at(-1) as HTMLElement);
    expect(screen.getByRole('heading', { name: 'Planning' })).toBeInTheDocument();
    expect(screen.getByText('Semaine du 11 mai')).toBeInTheDocument();
    expect(screen.getByText('17')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Marquer indisponible' }));
    expect(screen.getByText('Indisponibilité envoyée à la planification.')).toBeInTheDocument();
    expect(screen.getByText('Congé confirmé.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Gains' }));
    expect(screen.getByRole('heading', { name: 'Gains' })).toBeInTheDocument();
    expect(screen.getByText('Cette semaine')).toBeInTheDocument();
    expect(screen.getByText('Solde disponible')).toBeInTheDocument();
    expect(screen.getByText('Mobile Money')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Demander une avance' }));
    expect(screen.getByText("Demande d'avance envoyée à l'opérateur.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Demander une avance' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Profil' }));
    expect(screen.getByRole('heading', { name: 'Profil' })).toBeInTheDocument();
    expect(screen.getByText('Bouton SOS')).toBeInTheDocument();
    expect(screen.queryByText('Surfaces')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Exporter mes données' }));
    expect(screen.getByText("Demande d'export des données enregistrée.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: "Demander l'effacement" }));
    expect(
      screen.getByText("Demande d'effacement envoyée pour revue opérateur."),
    ).toBeInTheDocument();
  });

  it('handles activation, inbox, photo retry, and day summary surfaces', async () => {
    render(<App />);

    await unlockWorkerApp();

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
    startActiveVisit();
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

    await unlockWorkerApp();

    startActiveVisit();
    fireEvent.click(screen.getByRole('button', { name: "J'arrive" }));
    await screen.findByText("Pointage d'arrivée ajouté à la file hors ligne.");
    fireEvent.click(screen.getByRole('button', { name: 'Prendre photo avant' }));
    await screen.findByText('Photo avant ajoutée à la file hors ligne.');

    await waitFor(() => {
      expect(localStorage.getItem('washed.worker.local-state.v1')).toContain('visit.before_photo');
    });

    unmount();
    render(<App />);

    expect(await screen.findByText('2 actions en attente de synchronisation')).toBeInTheDocument();
    startActiveVisit();
    expect(await screen.findByText('Photo « avant » capturée')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Aide immédiate' })).not.toBeInTheDocument();
  });
});
