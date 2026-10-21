// Node loader: reaches the frozen kit through the relative path ../kit/dnode-e1-kit (relocatable),
// imports its runtime, and admits it with verifyBundle + trust key before anything runs (R0.2).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadKit } from './core.mjs';

export const BATCH_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const KIT_DIR = path.resolve(BATCH_DIR, '../kit/dnode-e1-kit');
export const KIT_DIST = path.join(KIT_DIR, 'dist');
export const APP_PATH = path.join(BATCH_DIR, 'batch.node');

export async function loadNodeKit({ appPath = APP_PATH } = {}) {
  const engine = await import(pathToFileURL(path.join(KIT_DIST, 'runtime/engine.js')).href);
  const admission = await import(pathToFileURL(path.join(KIT_DIST, 'runtime/admission.js')).href);
  const trustAt = process.env.DNODE_TRUST_KEY ?? path.join(KIT_DIST, 'generated/trust-key.json');
  const trustKey = JSON.parse(fs.readFileSync(trustAt, 'utf8'));
  const read = p => fs.promises.readFile(path.join(KIT_DIST, p), 'utf8');
  const appSource = fs.readFileSync(appPath, 'utf8');
  return loadKit({ engine, admission, read, trustKey, appSource });
}
