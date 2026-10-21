// Plain static server, no dependencies.
//   /        -> this directory (the shop)
//   /kit/... -> ../kit/dnode-e1-kit/dist/ (the frozen kit, served read-only)
// Usage: node serve.mjs   (PORT env overrides 8101). Binds 127.0.0.1 so the page
// is a secure context (Web Locks require one).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const mounts = [['/kit/', path.resolve(here, '../kit/dnode-e1-kit/dist')], ['/', here]];
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.node': 'text/plain; charset=utf-8', '.csv': 'text/csv; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml'};
const port = Number(process.env.PORT ?? 8101);

http.createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const [prefix, base] = mounts.find(([p]) => pathname.startsWith(p));
    let file = path.resolve(base, '.' + pathname.slice(prefix.length - 1));
    if (file !== base && !file.startsWith(base + path.sep)) throw Error('outside');
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    const data = fs.readFileSync(file);
    res.setHeader('Content-Type', types[path.extname(file)] ?? 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`BP-SHOP: http://127.0.0.1:${port}/  (kit at /kit/)`));
