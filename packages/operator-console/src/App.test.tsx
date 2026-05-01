import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App.js';

describe('operator console', () => {
  it('renders dashboard navigation, metrics, and surface inventory', () => {
    render(<App />);

    expect(screen.getByRole('navigation', { name: 'Operator navigation' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Operations dashboard' })).toBeInTheDocument();
    expect(screen.getByLabelText('Operator queue metrics').children).toHaveLength(4);
    expect(screen.getByLabelText('Operator console surfaces').children).toHaveLength(18);
  });

  it('accepts a matching candidate and keeps an audit-ready state visible', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Attribution' }));
    expect(screen.getByRole('heading', { name: 'Matching command center' })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Accept' })[0]!);

    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(screen.getByText('Decision logging')).toBeInTheDocument();
  });

  it('renders the live ops map and active visits', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Opérations' }));

    expect(screen.getByRole('heading', { name: 'Live Ops board' })).toBeInTheDocument();
    expect(screen.getByLabelText('Live operations map')).toBeInTheDocument();
    expect(screen.getByText('Akouvi A. · ETA 09:12')).toBeInTheDocument();
  });

  it('navigates to payments, audit, and settings surfaces', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Paiements' }));
    expect(screen.getByRole('heading', { name: 'Payments and payouts' })).toBeInTheDocument();
    expect(screen.getByText('Manual payment retry')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Audit' }));
    expect(screen.getByRole('heading', { name: 'Audit and governance' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('heading', { name: 'Settings and readiness' })).toBeInTheDocument();
    expect(screen.getByText('Readiness checks')).toBeInTheDocument();
  });
});
