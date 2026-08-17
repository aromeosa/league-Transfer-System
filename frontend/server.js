// Minimal static file server for the built SPA (frontend/dist), with client-side-route
// fallback to index.html. Exists because GoDaddy Node.js Hosting requires every app to
// have a "start" script that runs a real process listening on process.env.PORT — a
// static build alone doesn't satisfy that. Uses only Node built-ins, no extra dependency.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(fileURLToPath(new URL('.', import.meta.url)), 'dist');
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

async function readIndex() {
  return readFile(join(DIST, 'index.html'));
}

createServer(async (req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const safePath = normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(DIST, safePath === '/' ? 'index.html' : safePath);

  if (!filePath.startsWith(DIST)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    // Unknown path — likely a client-side route (React Router), so serve index.html.
    const data = await readIndex();
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  }
}).listen(PORT, () => {
  console.log(`Serving frontend/dist on port ${PORT}`);
});
