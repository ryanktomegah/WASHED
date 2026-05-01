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

  it('syncs offline actions and advances the visit lifecycle', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Synchroniser maintenant' }));

    expect(screen.getByText('Synchronisation prête')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pointage arrivée' }));

    expect(screen.getByRole('button', { name: '2Pointage arrivée' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('navigates to planning, earnings, and profile', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Planning' }));
    expect(screen.getByRole('heading', { name: 'Planning' })).toBeInTheDocument();
    expect(screen.getByText('Semaine du 4 mai')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Gains' }));
    expect(screen.getByRole('heading', { name: 'Gains' })).toBeInTheDocument();
    expect(screen.getByText('Plancher mensuel garanti: 40 000 FCFA')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Profil' }));
    expect(screen.getByRole('heading', { name: 'Profil' })).toBeInTheDocument();
    expect(screen.getByLabelText('Worker app surfaces').children).toHaveLength(12);
  });
});
