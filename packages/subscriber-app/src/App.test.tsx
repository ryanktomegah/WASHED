import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App.js';

describe('subscriber app', () => {
  it('renders the production subscriber home surface inventory', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: 'WashedBeta Lomé' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'mardi 5 mai', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Suivi encadré')).toBeInTheDocument();
    expect(screen.getByText('35 surfaces')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
  });

  it('shows bounded tracking only after the en-route action starts it', () => {
    render(<App />);

    expect(screen.queryByLabelText('Bounded live map')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Démarrer le suivi' }));

    expect(screen.getByLabelText('Bounded live map')).toBeInTheDocument();
    expect(screen.getByText('Akouvi · 12 min')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Arrivée' }));

    expect(screen.queryByLabelText('Bounded live map')).not.toBeInTheDocument();
    expect(screen.getByText('Suivi encadré')).toBeInTheDocument();
  });

  it('navigates to subscription controls from the bottom nav', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Abonnement' }));

    expect(screen.getByRole('heading', { name: "Gestion de l'abonnement" })).toBeInTheDocument();
    expect(screen.getByText('Demander un remplacement')).toBeInTheDocument();
    expect(screen.getByText('2 remplacements restants ce trimestre')).toBeInTheDocument();
  });

  it('renders onboarding and support flows from primary actions', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: "Démarrer l'inscription" }));

    expect(screen.getByRole('heading', { name: 'Inscription abonnée' })).toBeInTheDocument();
    expect(within(screen.getByLabelText('Onboarding steps')).getAllByText(/./u)).not.toHaveLength(
      0,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Terminé' }));
    fireEvent.click(screen.getByRole('button', { name: 'Support' }));

    expect(screen.getByRole('heading', { name: 'Support' })).toBeInTheDocument();
    expect(screen.getByText('Messages relayés par opérateur')).toBeInTheDocument();
  });

  it('switches the subscriber interface to English', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Switch language' }));

    expect(screen.getByText('Bounded tracking')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start setup' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Plan' })).toBeInTheDocument();
  });
});
