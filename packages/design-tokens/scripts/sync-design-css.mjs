#!/usr/bin/env node
// Copy the canonical CSS token file from the package into the design/ folder
// so the static design HTML pages keep rendering with the live token contract.
// Source of truth: packages/design-tokens/styles.css

import { copyFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, '..', 'styles.css');
const target = resolve(here, '..', '..', '..', 'design', 'shared', 'tokens.css');

copyFileSync(source, target);

const sourceBytes = readFileSync(source);
const targetBytes = readFileSync(target);

if (!sourceBytes.equals(targetBytes)) {
  console.error('design-tokens · styles.css and design/shared/tokens.css diverged after copy');
  process.exit(1);
}

console.log(`design-tokens · synced ${source} → ${target}`);
