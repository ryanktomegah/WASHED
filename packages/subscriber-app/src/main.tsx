import { Capacitor } from '@capacitor/core';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { createRoot } from 'react-dom/client';

import '@washed/design-tokens/styles.css';

import { AppShell } from './AppShell.js';
import './styles.css';

const root = document.getElementById('root');

if (root === null) {
  throw new Error('Missing root element.');
}

document.body.setAttribute('data-theme', 'subscriber');

if (Capacitor.isNativePlatform()) {
  // Hide the iOS keyboard accessory toolbar (the prev/next/done arrows that
  // sit above the keyboard). It interferes with the design — the input is
  // already labeled and the CTA is reachable directly.
  void Keyboard.setAccessoryBarVisible({ isVisible: false });
  // Resize the body when the keyboard opens so the CTA stays reachable.
  void Keyboard.setResizeMode({ mode: KeyboardResize.Body });
}

createRoot(root).render(<AppShell />);
