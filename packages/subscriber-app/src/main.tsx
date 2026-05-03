import { createRoot } from 'react-dom/client';

import '@washed/design-tokens/styles.css';

import { App } from './App.js';
import './styles.css';

const root = document.getElementById('root');

if (root === null) {
  throw new Error('Missing root element.');
}

document.body.setAttribute('data-theme', 'subscriber');

createRoot(root).render(<App />);
