// Node harness: verify the frozen kit (verifyBundle + in-kit trust key), then compile kit roots + Breakout roots
// with the kit's own compile()/Runtime and the browser-e1 profile. Nothing here implements game logic.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';

export const GAME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const KIT = path.resolve(GAME, '../kit/dnode-e1-kit');
export const DIST = path.join(KIT, 'dist');
export const ROOT_FILES = ['breakout.geometry.node', 'breakout.physics.node', 'breakout.control.node', 'breakout.game.node'];
export const EXPECTED_TRUST_FINGERPRINT = '4c7716c7b528dfcdba2190c27516a09e057334309f1fb0b9a8785991cfca0244';

const engine = await import(pathToFileURL(path.join(DIST, 'runtime/engine.js')).href);
const admission = await import(pathToFileURL(path.join(DIST, 'runtime/admission.js')).href);
export const {compile, Runtime, canon, json} = engine;
export const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');

export async function loadKit() {
  const key = JSON.parse(fs.readFileSync(path.join(DIST, 'generated/trust-key.json'), 'utf8'));
  const fingerprint = await admission.sha(json(key));
  if (fingerprint !== EXPECTED_TRUST_FINGERPRINT) throw new Error('AdmissionDenied: trust fingerprint ' + fingerprint);
  const {release, texts} = await admission.verifyBundle(p => fs.promises.readFile(path.join(DIST, p), 'utf8'), key);
  return {release, texts, fingerprint};
}

export function appSources() {
  return ROOT_FILES.map(f => ({file: f, text: fs.readFileSync(path.join(GAME, 'dnode', f), 'utf8')}));
}

export async function loadGame({observe} = {}) {
  const kit = await loadKit();
  const kitRoots = Object.entries(kit.texts).filter(([p]) => p.startsWith('roots/') && p.endsWith('.node')).map(([, s]) => s);
  const app = appSources();
  const graph = compile([...kitRoots, ...app.map(a => a.text)]);
  const profile = JSON.parse(kit.texts['profiles/browser.json']);
  const runtime = new Runtime(graph, profile, {observe});
  const identities = {
    kitZipNote: 'see PHASE_B identities',
    runtimeIdentity: kit.release.attestation.runtimeIdentity,
    preludeRoot: kit.release.attestation.rootHashes.prelude,
    preludeFile: sha256(kit.texts['roots/prelude.node']),
    browserProfile: sha256(kit.texts['profiles/browser.json']),
    trustFingerprint: kit.fingerprint,
    appRoots: Object.fromEntries(app.map(a => [a.file, sha256(a.text)])),
  };
  identities.app = sha256(json({roots: identities.appRoots, runtime: identities.runtimeIdentity, prelude: identities.preludeRoot}));
  return {kit, graph, runtime, profile, identities, app};
}
