#!/usr/bin/env node
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '../../..');
const tokensPath = resolve(repoRoot, 'design/shared/tokens.css');
const iconPath = resolve(
  scriptDir,
  '../ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',
);
const splashDir = resolve(scriptDir, '../ios/App/App/Assets.xcassets/Splash.imageset');

const tokensCss = await readFile(tokensPath, 'utf8');
const subscriberTheme = tokensCss.match(/\[data-theme='subscriber'\]\s*\{(?<body>[^}]+)\}/u);

if (subscriberTheme?.groups?.body === undefined) {
  throw new Error(`Could not read subscriber design tokens from ${tokensPath}`);
}

function token(name) {
  const match = subscriberTheme.groups.body.match(
    new RegExp(`--${name}\\s*:\\s*(?<value>#[0-9a-fA-F]{3,8})`, 'u'),
  );

  if (match?.groups?.value === undefined) {
    throw new Error(`Missing subscriber token --${name}`);
  }

  return match.groups.value;
}

const colors = {
  bg: token('bg'),
  ink: token('ink'),
  primary: token('primary'),
  primaryOn: token('primary-on'),
};

const browser = await chromium.launch();

try {
  await renderPng({
    path: iconPath,
    height: 1024,
    width: 1024,
    html: wordmarkDocument({
      background: colors.primary,
      color: colors.primaryOn,
      dotColor: colors.primaryOn,
      fontSize: 198,
    }),
  });

  await mkdir(splashDir, { recursive: true });

  const splashHtml = wordmarkDocument({
    background: colors.bg,
    color: colors.ink,
    dotColor: colors.primary,
    fontSize: 236,
  });

  for (const filename of [
    'splash-2732x2732.png',
    'splash-2732x2732-1.png',
    'splash-2732x2732-2.png',
  ]) {
    await renderPng({
      path: resolve(splashDir, filename),
      height: 2732,
      width: 2732,
      html: splashHtml,
    });
  }
} finally {
  await browser.close();
}

function wordmarkDocument({ background, color, dotColor, fontSize }) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Geist:wght@500&display=swap');

      html,
      body,
      #root {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
      }

      body {
        background: ${background};
      }

      #root {
        display: grid;
        place-items: center;
      }

      .wordmark {
        color: ${color};
        font-family: 'Geist', system-ui, -apple-system, 'Segoe UI', sans-serif;
        font-size: ${fontSize}px;
        font-weight: 500;
        letter-spacing: -0.025em;
        line-height: 1;
        transform: translateY(-0.015em);
        white-space: nowrap;
      }

      .dot {
        color: ${dotColor};
      }
    </style>
  </head>
  <body>
    <div id="root">
      <div class="wordmark">washed<span class="dot">.</span></div>
    </div>
  </body>
</html>`;
}

async function renderPng({ path, height, width, html }) {
  const page = await browser.newPage({
    deviceScaleFactor: 1,
    viewport: { width, height },
  });

  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ animations: 'disabled', path });
  await page.close();
}
