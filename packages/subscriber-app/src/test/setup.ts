import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

import { setActiveLocale } from '@washed/i18n';

beforeEach(() => {
  setActiveLocale('fr');
});

afterEach(() => {
  cleanup();
});
