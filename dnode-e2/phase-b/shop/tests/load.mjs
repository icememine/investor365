// Node-side loader: verify the frozen kit exactly as tools/run.mjs does, then
// compile kit roots + the shop roots under the browser profile.
// Used by tests only; the browser host does the same in app.js.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

export const SHOP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const KIT = path.resolve(SHOP, '../kit/dnode-e1-kit');
export const DIST = path.join(KIT, 'dist');
export const APP_ROOTS = ['shop.core.node', 'shop.view.node'];

const imp = p => import(pathToFileURL(path.join(DIST, p)).href);
export const engine = await imp('runtime/engine.js');
export const admission = await imp('runtime/admission.js');
export const host = await imp('runtime/host.js');

export async function load({roots = APP_ROOTS} = {}) {
  const key = JSON.parse(fs.readFileSync(path.join(DIST, 'generated/trust-key.json'), 'utf8'));
  const {release, texts} = await admission.verifyBundle(p => fs.promises.readFile(path.join(DIST, p), 'utf8'), key);
  const kitRoots = Object.entries(texts).filter(([p]) => p.startsWith('roots/') && p.endsWith('.node')).map(([, s]) => s);
  const dir = process.env.SHOP_ROOTS_DIR ?? SHOP; // mutation testing loads altered copies from elsewhere
  const appTexts = Object.fromEntries(roots.filter(f => fs.existsSync(path.join(dir, f))).map(f => [f, fs.readFileSync(path.join(dir, f), 'utf8')]));
  const graph = engine.compile([...kitRoots, ...Object.values(appTexts)]);
  const profile = JSON.parse(texts['profiles/browser.json']);
  const runtime = new engine.Runtime(graph, profile);
  const fingerprint = await admission.sha(engine.json(key));
  return {release, texts, graph, runtime, profile, appTexts, fingerprint};
}

// Outcome of one call as a plain record: {out,effects} | {refuse} | {fault}
export function outcome(runtime, name, args) {
  try { const r = runtime.run(name, args); return {out: r.out, effects: r.effects}; }
  catch (e) { return e.kind === 'refused' ? {refuse: e.code} : {fault: e.code ?? String(e.message)}; }
}
