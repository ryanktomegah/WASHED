import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App.js';

describe('worker app', () => {
  it('renders route, offline, and safety surfaces', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: "Route d'aujourd'hui" })).toBeInTheDocument();
    const [sosButton] = screen.getAllByRole('button', { name: 'SOS' });
    expect(sosButton).toBeInTheDocument();
    expect(screen.getByText('3 actions en attente de synchronisation')).toBeInTheDocument();
    expect(screen.getByLabelText('Worker route lifecycle').children).toHaveLength(6);
    expect(screen.getByText('Activation du profil')).toBeInTheDocument();
  });

  it('opens and closes the SOS sheet', () => {
    render(<App />);

    const [sosButton] = screen.getAllByRole('button', { name: 'SOS' });
    expect(sosButton).toBeDefined();
    fireEvent.click(sosButton!);

    expect(screen.getByRole('dialog', { name: 'Aide immédiate' })).toBeInTheDocument();
    expect(screen.getByText("Prévenir l'opérateur")).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));

    expect(screen.queryByRole('dialog', { name: 'Aide immédiate' })).not.toBeInTheDocument();
  });

  it('records SOS confirmation through worker state', () => {
    render(<App />);

    const [sosButton] = screen.getAllByRole('button', { name: 'SOS' });
    expect(sosButton).toBeDefined();
    fireEvent.click(sosButton!);
    fireEvent.click(screen.getByRole('button', { name: "Prévenir l'opérateur" }));

    expect(screen.queryByRole('dialog', { name: 'Aide immédiate' })).not.toBeInTheDocument();
    expect(screen.getByText("Alerte SOS envoyée à l'opérateur.")).toBeInTheDocument();
    expect(screen.getByText('4 actions en attente de synchronisation')).toBeInTheDocument();
  });

  it('syncs offline actions and advances the visit lifecycle', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Synchroniser maintenant' }));

    expect(screen.getByText('Synchronisation prête')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: "Pointer l'arrivée" }));

    expect(screen.getByText("Pointage d'arrivée ajouté à la file hors ligne.")).toBeInTheDocument();
    expect(screen.getByText('1 actions en attente de synchronisation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pointage arrivée' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Photo avant' }));
    expect(screen.getByText('Photo avant ajoutée à la file hors ligne.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Signaler un problème' }));
    expect(screen.getByText('Signalement ajouté à la file hors ligne.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Déclarer absence foyer' }));
    expect(
      screen.getByText('Absence foyer déclarée et ajoutée à la file hors ligne.'),
    ).toBeInTheDocument();
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
    expect(screen.getByText('Plancher mensuel garanti: 40 000 FCFA')).toBeInTheDocument();
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

  it('handles activation, inbox, photo retry, and day summary surfaces', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Activation' }));
    expect(screen.getByRole('heading', { name: 'Activation du profil' })).toBeInTheDocument();
    expect(screen.getByText('Accord travailleuse')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: "Terminer l'activation" }));
    expect(screen.getByText('Profil activé pour les routes terrain.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: "Aujourd'hui" }));
    fireEvent.click(screen.getByRole('button', { name: 'Inbox' }));
    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByText('Route de demain confirmée')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: "Aujourd'hui" }));
    fireEvent.click(screen.getByRole('button', { name: 'Photos' }));
    expect(screen.getByRole('heading', { name: 'Contrôle photo' })).toBeInTheDocument();
    expect(screen.getByLabelText('Photo quality preview')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre la photo' }));
    expect(screen.getByText('Photo avant ajoutée à la file hors ligne.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: "Aujourd'hui" }));
    fireEvent.click(screen.getByRole('button', { name: 'Résumé' }));
    expect(screen.getByRole('heading', { name: 'Résumé de fin de journée' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clôturer la journée' }));
    expect(screen.getByText('Résumé de fin de journée enregistré.')).toBeInTheDocument();
    expect(screen.getByText('Clôturée')).toBeInTheDocument();
  });
});
