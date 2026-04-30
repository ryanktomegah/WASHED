import { access } from 'node:fs/promises';

const requiredFiles = [
  'public/index.html',
  'public/styles.css',
  'public/app.js',
  'public/service-worker.js',
  'src/dev-server.mjs',
];

await Promise.all(requiredFiles.map((file) => access(new URL(`../${file}`, import.meta.url))));
console.log('ops-web static assets ok');
