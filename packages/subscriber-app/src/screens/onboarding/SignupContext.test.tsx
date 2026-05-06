import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { SignupProvider, useSignup } from './SignupContext.js';

const STORAGE_KEY = 'washed.test.signup-state';

function SignupProbe(): ReactElement {
  const signup = useSignup();

  return (
    <button
      onClick={() => {
        signup.setMode('existing');
        signup.setPhone('+228 90 12 34 56');
        signup.setIdentity({
          email: 'afi@email.com',
          firstName: 'Afi',
          isAdult: true,
          lastName: 'Mensah',
        });
        signup.setAddress({
          gpsLatitude: null,
          gpsLongitude: null,
          landmark: '',
          neighborhood: 'Tokoin Casablanca',
          street: 'rue 254',
        });
      }}
      type="button"
    >
      {signup.phone === '' ? 'empty' : signup.phone}
    </button>
  );
}

describe('Signup context persistence', () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
  });

  it('persists subscriber signup state between app launches', () => {
    const firstRender = render(
      <SignupProvider storageKey={STORAGE_KEY}>
        <SignupProbe />
      </SignupProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'empty' }));
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain('+228 90 12 34 56');

    firstRender.unmount();

    render(
      <SignupProvider storageKey={STORAGE_KEY}>
        <SignupProbe />
      </SignupProvider>,
    );

    expect(screen.getByRole('button', { name: '+228 90 12 34 56' })).toBeVisible();
  });
});
