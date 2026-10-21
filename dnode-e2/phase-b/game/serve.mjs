// Plain Node static server, no dependencies. Serves this directory at / and the frozen kit's dist/ at /kit/.
// The kit is located relatively (../kit/dnode-e1-kit), so the pair of directories can be moved together.
// Usage: node serve.mjs   (PORT env overrides 8102; HOST=0.0.0.0 opts in to LAN access for phone sessions)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const gameRoot = here;
const kitRoot = path.resolve(here, '../kit/dnode-e1-kit/dist');
const port = Number(process.env.PORT ?? 8102);
const host = process.env.HOST ?? '127.0.0.1';
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/plain; charset=utf-8',
  '.node': 'text/plain; charset=utf-8', '.py': 'text/plain; charset=utf-8', '.csv': 'text/csv; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml'};

if (!fs.existsSync(path.join(kitRoot, 'generated/release.json'))) {
  console.error('Kit not found at ' + kitRoot + ' (expected ../kit/dnode-e1-kit next to this directory)');
  process.exit(1);
}

function resolve(urlPath) {
  let base = gameRoot, rel = urlPath;
  if (urlPath === '/kit' || urlPath.startsWith('/kit/')) { base = kitRoot; rel = urlPath.slice(4); }
  const file = path.resolve(base, '.' + (rel || '/'));
  if (file !== base && !file.startsWith(base + path.sep)) return null;
  return file;
}

http.createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = resolve(urlPath);
    if (!file) throw new Error('outside root');
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    const data = fs.readFileSync(file);
    res.setHeader('Content-Type', types[path.extname(file)] ?? 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(data);
  } catch {
    res.statusCode = 404; res.end('Not found');
  }
}).listen(port, host, () => console.log('Breakout (DNode E1): http://' + host + ':' + port + '/   kit: ' + kitRoot));
