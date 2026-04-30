import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../public', import.meta.url));
const port = Number(process.env.PORT ?? 5173);
const coreApiUrl = process.env.WASHED_CORE_API_URL ?? 'http://127.0.0.1:3000';

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
]);

const server = createServer(async (request, response) => {
  try {
    if (request.url?.startsWith('/api/')) {
      await proxyApi(request, response);
      return;
    }

    await serveStatic(request.url ?? '/', response);
  } catch (error) {
    response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(error instanceof Error ? error.message : 'Internal server error');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`subscriber-web listening on http://127.0.0.1:${port}`);
  console.log(`proxying /api to ${coreApiUrl}`);
});

async function proxyApi(request, response) {
  const target = new URL(request.url.replace(/^\/api/u, ''), coreApiUrl);
  const headers = new Headers();

  for (const [key, value] of Object.entries(request.headers)) {
    if (value !== undefined && key !== 'host' && key !== 'connection') {
      headers.set(key, Array.isArray(value) ? value.join(',') : value);
    }
  }

  const proxied = await fetch(target, {
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request,
    duplex: 'half',
    headers,
    method: request.method,
  });

  response.writeHead(proxied.status, Object.fromEntries(proxied.headers.entries()));
  if (proxied.body === null) {
    response.end();
    return;
  }

  const reader = proxied.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    response.write(Buffer.from(value));
  }
  response.end();
}

async function serveStatic(url, response) {
  const pathname = new URL(url, 'http://127.0.0.1').pathname;
  const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
  const safePath = normalize(relativePath).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(root, safePath);

  const fileStat = await stat(filePath).catch(() => null);
  if (fileStat?.isFile() !== true) {
    const index = await readFile(join(root, 'index.html'));
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(index);
    return;
  }

  response.writeHead(200, {
    'cache-control': 'no-store',
    'content-type': contentTypes.get(extname(filePath)) ?? 'application/octet-stream',
  });
  createReadStream(filePath).pipe(response);
}
