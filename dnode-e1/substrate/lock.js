/* lock.js — (re)issue natives.lock.json. Run deliberately, after a substrate change, never by the checker. */
const fs = require('fs'); const path = require('path');
const E = require('./engine.js');
(async () => {
  const dir = path.join(__dirname, '..');
  const prev = fs.existsSync(path.join(dir, 'natives.lock.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'natives.lock.json'), 'utf8')) : null;
  const natives = {}; for (const op of Object.keys(E.NATIVES).sort()) natives[op] = await E.hashNative(op);
  const identity = (await E.sha256(E.canon(natives))).slice(0, 16);
  const changed = prev ? Object.keys(natives).filter(k => prev.natives[k] !== natives[k]) : Object.keys(natives);
  const removed = prev ? Object.keys(prev.natives).filter(k => !natives[k]) : [];
  const lock = { schema: 'dnode-natives-lock/0.4', identity, at: new Date().toISOString(), count: Object.keys(natives).length, previous: prev ? prev.identity : null, changed, removed, note: process.argv[2] || '', natives };
  fs.writeFileSync(path.join(dir, 'natives.lock.json'), JSON.stringify(lock, null, 2));
  console.log(`natives.lock.json ${identity} (was ${prev ? prev.identity : 'none'}); changed: ${changed.join(', ') || 'none'}; removed: ${removed.join(', ') || 'none'}`);
})();
