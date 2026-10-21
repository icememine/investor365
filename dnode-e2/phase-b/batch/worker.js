// BP-BATCH browser worker (R-B4: the DNode call runs off the main thread).
// Admits the kit (verifyBundle + trust key) before anything runs (R0.2), then runs one batch per message.
import { loadKit, runBatch } from './lib/core.mjs';

const read = async p => {
  const r = await fetch('./kit/' + p, { cache: 'no-store' });
  if (!r.ok) throw new Error('Missing kit file ' + p);
  return r.text();
};

const kitReady = (async () => {
  const engine = await import('./kit/runtime/engine.js');
  const admission = await import('./kit/runtime/admission.js');
  const trustKey = JSON.parse(await read('generated/trust-key.json'));
  const app = await fetch('./batch.node', { cache: 'no-store' });
  if (!app.ok) throw new Error('Missing batch.node');
  return loadKit({ engine, admission, read, trustKey, appSource: await app.text() });
})();

kitReady.then(kit => postMessage({ type: 'ready', identity: {
  transformer: kit.transformer, trustFingerprint: kit.trustFingerprint, profile: kit.profile.id,
  maxBytes: kit.maxBytes, maxRows: kit.profile.host.maxRows, publication: kit.profile.host.publication,
  csvNative: JSON.parse(kit.texts['generated/lock.json']).nativePins.csv,
  distribution: kit.release.attestation.distribution, specification: kit.release.attestation.specification } }),
  e => postMessage({ type: 'refused', message: (e && e.message) || String(e) }));

// Progress from the runtime's observe hook (node returns). Display only; it does not affect the run.
function progressReporter(t0) {
  let skus = 0, n = 0, k = 0, joins = 0, m = -1, hints = 0, last = 0;
  return (name, args, out) => {
    if (name === 'supplier.sku') skus++;
    else if (name === 'supplier.issues') { if (!n) n = skus; k++; }
    else if (name === 'supplier.join') joins++;
    else if (name === 'supplier.from_csv') m = out.errors.length;
    else if (name === 'batch.hint') hints++;
    else return;
    const now = performance.now();
    if (now - last > 120) { last = now; postMessage({ type: 'progress', n, k, joins, m, hints, ms: Math.round(now - t0) }); }
  };
}

onmessage = async ({ data }) => {
  if (data.type !== 'run') return;
  let kit;
  try { kit = await kitReady; } catch (e) { postMessage({ type: 'refused', message: e.message }); return; }
  let bytes;
  try { bytes = new Uint8Array(await data.file.arrayBuffer()); }
  catch (e) { postMessage({ type: 'readError', message: e.name + ': ' + e.message }); return; }
  const t0 = performance.now();
  postMessage({ type: 'progress', n: 0, k: 0, joins: 0, m: -1, hints: 0, ms: 0 });
  const run = await runBatch(kit, { bytes }, { observe: progressReporter(t0) });
  postMessage({ type: 'done', ms: Math.round(performance.now() - t0), fileName: data.file.name,
    report: run.report, reportText: run.reportText, snapshotText: run.snapshotText ?? null,
    issues: run.result ? run.result.issues : [], rows: run.result && run.result.ok ? run.result.rows : [],
    operations: run.operations ?? null });
};
