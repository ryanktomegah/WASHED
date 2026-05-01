import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App.js';

describe('worker app shell', () => {
  it('renders route, offline, and safety surfaces', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: "Route d'aujourd'hui" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SOS' })).toBeInTheDocument();
    expect(screen.getByText('Actions en attente de synchronisation')).toBeInTheDocument();
    expect(screen.getByLabelText('Worker route lifecycle').children).toHaveLength(6);
    expect(screen.getByLabelText('Worker app surfaces').children).toHaveLength(8);
  });
});
