import { cp, rm } from 'node:fs/promises';

await rm(new URL('../dist', import.meta.url), { force: true, recursive: true });
await cp(new URL('../public', import.meta.url), new URL('../dist', import.meta.url), {
  recursive: true,
});

console.log('subscriber-web static assets built');
