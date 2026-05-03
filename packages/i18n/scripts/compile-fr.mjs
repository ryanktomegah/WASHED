#!/usr/bin/env node
// Compile the FR locale from design/09-copy-deck/copy.html into src/fr.json.
// The copy deck is the locked source of truth: every production string must
// have a key in the deck before the code that renders it.
//
// Usage:  node scripts/compile-fr.mjs
//         (also wired as `pnpm i18n:sync` and the package's build step)
//
// Parse strategy: walk every <tbody>...</tbody> block, then within each tbody
// extract sequential pairs of <span class="key">…</span> followed by
// <span class="fr">…</span> (or <span class="fr body">…</span>). Anything
// outside <tbody> is documentation and must be ignored.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const deckPath = resolve(here, '..', '..', '..', 'design', '09-copy-deck', 'copy.html');
const outPath = resolve(here, '..', 'src', 'fr.json');

const html = readFileSync(deckPath, 'utf8');

const tbodyPattern = /<tbody>([\s\S]*?)<\/tbody>/g;
const pairPattern =
  /<span class="key">([^<]+)<\/span>[\s\S]*?<span class="fr(?:\s+body)?"\s*>([\s\S]*?)<\/span>/g;

const messages = {};
const duplicates = [];

for (const tbody of html.matchAll(tbodyPattern)) {
  const block = tbody[1];
  for (const pair of block.matchAll(pairPattern)) {
    const key = pair[1].trim();
    const rawValue = pair[2];
    const value = decodeFrValue(rawValue);

    if (Object.hasOwn(messages, key)) {
      duplicates.push(key);
      continue;
    }

    messages[key] = value;
  }
}

if (duplicates.length > 0) {
  console.error(`i18n · duplicate keys in copy deck: ${duplicates.join(', ')}`);
  process.exit(1);
}

const sortedKeys = Object.keys(messages).sort();
const sorted = {};
for (const key of sortedKeys) {
  sorted[key] = messages[key];
}

writeFileSync(outPath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');

console.log(`i18n · compiled ${sortedKeys.length} FR strings → ${outPath}`);

function decodeFrValue(raw) {
  // Drop <sup> wrappers (typography is the consumer's concern; i18n stores text).
  // Strip remaining tags. Decode the handful of HTML entities the deck uses.
  return raw
    .replace(/<sup>([\s\S]*?)<\/sup>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/\s+/g, ' ')
    .trim();
}
