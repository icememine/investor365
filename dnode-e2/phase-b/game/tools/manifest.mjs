// Writes app-manifest.json: full SHA-256 of each Breakout root (checked by the host before compiling), the app
// identity (hash of root hashes + runtime identity + prelude root), and host/tool file hashes for the record.
// An integrity inventory, not a signature: it is generated next to the code it describes.
import fs from 'node:fs';
import path from 'node:path';
import {loadGame, sha256, GAME} from './lib.mjs';

const {identities} = await loadGame();
const fileHashes = dir => Object.fromEntries(fs.readdirSync(path.join(GAME, dir)).filter(f => /\.(js|mjs|css|py|cjs)$/.test(f)).sort()
  .map(f => [dir + '/' + f, sha256(fs.readFileSync(path.join(GAME, dir, f)))]));
const manifest = {
  app: 'BP-GAME Breakout (DNode E2.1 Phase B)',
  roots: identities.appRoots,
  appIdentity: identities.app,
  runtimeIdentity: identities.runtimeIdentity,
  preludeRoot: identities.preludeRoot,
  browserProfileFile: identities.browserProfile,
  trustFingerprint: identities.trustFingerprint,
  files: {'index.html': sha256(fs.readFileSync(path.join(GAME, 'index.html'))), 'serve.mjs': sha256(fs.readFileSync(path.join(GAME, 'serve.mjs'))),
    ...fileHashes('host'), ...fileHashes('tools'), ...fileHashes('oracle'), ...fileHashes('tests'), ...fileHashes('drives')},
  note: 'Integrity inventory generated beside the code; not a signature or certificate.',
};
fs.writeFileSync(path.join(GAME, 'app-manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log('app-manifest.json written; appIdentity', manifest.appIdentity);
