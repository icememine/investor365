// Plain Node static server, no dependencies. Serves this directory at / and the frozen kit's dist/
// (reached through the relative path ../kit/dnode-e1-kit/dist) at /kit/. Read-only; GET/HEAD only.
// Usage: node serve.mjs [--port N]   (default 8103, or $PORT)   → http://127.0.0.1:8103/
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BATCH = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.resolve(BATCH, '../kit/dnode-e1-kit/dist');
const argPort = process.argv.includes('--port') ? process.argv[process.argv.indexOf('--port') + 1] : undefined;
const PORT = Number(argPort ?? process.env.PORT ?? 8103);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/plain; charset=utf-8',
  '.node': 'text/plain; charset=utf-8', '.csv': 'text/csv; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };

http.createServer((req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; return res.end('Method not allowed'); }
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let base = BATCH, rel = pathname.slice(1);
    if (pathname === '/kit' || pathname.startsWith('/kit/')) { base = KIT; rel = pathname.slice(5); }
    if (rel === '' || rel.endsWith('/')) rel += 'index.html';
    const file = path.resolve(base, rel);
    if (file !== base && !file.startsWith(base + path.sep)) throw new Error('outside root');
    const data = fs.readFileSync(file);
    res.setHeader('Content-Type', TYPES[path.extname(file)] ?? 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
  }
}).listen(PORT, '127.0.0.1', () => console.log('BP-BATCH: http://127.0.0.1:' + PORT + '/  (kit at /kit/ from ' + KIT + ')'));
