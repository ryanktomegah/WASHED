import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App.js';

describe('subscriber app shell', () => {
  it('renders the production subscriber surface inventory', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Washed' })).toBeInTheDocument();
    expect(screen.getByText('Bounded tracking')).toBeInTheDocument();
    expect(screen.getByLabelText('Subscriber screen inventory').children).toHaveLength(16);
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
  });
});
