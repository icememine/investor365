// Writes app-lock.json: SHA-256 of the exact bytes of each shop root. The page
// refuses to run roots that do not match (detects stale or mixed deployments;
// it is not a signature: the lock is served by the same origin).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {SHOP, APP_ROOTS} from './load.mjs';
const lock = Object.fromEntries(APP_ROOTS.map(f => [f, crypto.createHash('sha256').update(fs.readFileSync(path.join(SHOP, f))).digest('hex')]));
fs.writeFileSync(path.join(SHOP, 'app-lock.json'), JSON.stringify(lock, null, 1) + '\n');
console.log(lock);
