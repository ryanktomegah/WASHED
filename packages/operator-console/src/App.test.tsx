import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App.js';

describe('operator console shell', () => {
  it('renders console navigation, metrics, and surface inventory', () => {
    render(<App />);

    expect(screen.getByRole('navigation', { name: 'Operator navigation' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Matching command center' })).toBeInTheDocument();
    expect(screen.getByLabelText('Operator queue metrics').children).toHaveLength(4);
    expect(screen.getByLabelText('Operator console surfaces').children).toHaveLength(12);
  });
});
