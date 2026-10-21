// Runs every fixture through the built pipeline (lib/core.mjs → batch.run under profiles/batch.json)
// and compares with fixtures/expected.json produced by the independent Python oracle.
// Also checks the D-B5b invariant per case: batch.run's ok/issue set/rows equal a direct
// supplier.from_csv call. Usage: node fixtures/run-fixtures.mjs [--slow] [--only name,name]
import fs from 'node:fs';
import path from 'node:path';
import { loadNodeKit, BATCH_DIR } from '../lib/node-kit.mjs';
import { runBatch } from '../lib/core.mjs';

const argv = process.argv.slice(2);
const slow = argv.includes('--slow');
const only = argv.includes('--only') ? new Set(argv[argv.indexOf('--only') + 1].split(',')) : null;
const out = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : 'evidence/fixtures.json';
const expected = JSON.parse(fs.readFileSync(path.join(BATCH_DIR, 'fixtures/expected.json'), 'utf8'));
const kit = await loadNodeKit();
const { engine } = kit;
const results = [];
for (const e of expected.cases) {
  if (only && !only.has(e.name)) continue;
  if (e.slow && !slow && !only) { results.push({ name: e.name, verdict: 'skipped', reason: 'slow case (G-3); run with --slow' }); continue; }
  const bytes = new Uint8Array(fs.readFileSync(path.resolve(BATCH_DIR, 'fixtures', e.file)));
  const t0 = performance.now();
  const r = await runBatch(kit, { bytes });
  const ms = Math.round(performance.now() - t0);
  const rep = r.report;
  const diffs = [];
  const cmp = (what, a, b) => { if (JSON.stringify(a) !== JSON.stringify(b)) diffs.push({ what, observed: a, expected: b }); };
  cmp('status', rep.status, e.status);
  cmp('fileError', rep.fileError?.code ?? null, e.fileError);
  cmp('counts', rep.counts ?? null, e.counts);
  cmp('issues', rep.issues.map(i => ({ record: i.record, field: i.field, message: i.message, hint: i.hint })),
    e.issues.map(i => ({ record: i.record, field: i.field, message: i.message, hint: i.hint })));
  cmp('runId', rep.runId, e.runId);
  cmp('snapshotSha256', r.snapshotSha ?? null, e.snapshotSha256);
  if (e.snapshotText !== undefined) cmp('snapshotText', r.snapshotText, e.snapshotText);
  const reportSha = await kit.admission.sha(r.reportText);
  cmp('reportSha256', reportSha, e.reportSha256);
  if (e.reportText !== undefined && r.reportText !== e.reportText) diffs.push({ what: 'reportText', observed: r.reportText.slice(0, 400), expected: e.reportText.slice(0, 400) });
  if (rep.status === 'fault') diffs.push({ what: 'fault', observed: rep.fault });

  // D-B5b invariant: hints refine, never decide.
  let invariant = 'n/a (no batch.run result)';
  if (r.result) {
    const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    const direct = kit.runtime.run('supplier.from_csv', [text]).out;
    const same = direct.ok === r.result.ok
      && engine.canon(direct.rows) === engine.canon(r.result.rows)
      && engine.canon(direct.errors) === engine.canon(r.result.issues.map(({ record, field, message }) => ({ record, field, message })))
      && r.result.issues.length === direct.errors.length;
    invariant = same ? 'holds' : 'VIOLATED';
    if (!same) diffs.push({ what: 'hint-invariant' });
  }
  results.push({ name: e.name, verdict: diffs.length ? 'disagree' : 'agree', status: rep.status, ms,
    operations: r.operations ?? null, invariant, diffs });
  console.log((diffs.length ? 'DISAGREE ' : 'agree    ') + e.name + ' ' + rep.status + (rep.fileError ? ' ' + rep.fileError.code : '') + (rep.fault ? ' ' + rep.fault.code : '') + ' ' + ms + 'ms');
  for (const d of diffs) console.log('   ', d.what, JSON.stringify(d.observed)?.slice(0, 300), '| expected', JSON.stringify(d.expected)?.slice(0, 300));
}
const summary = {
  total: results.length, agree: results.filter(r => r.verdict === 'agree').length,
  disagree: results.filter(r => r.verdict === 'disagree').length,
  skipped: results.filter(r => r.verdict === 'skipped').length,
  invariantHolds: results.filter(r => r.invariant === 'holds').length,
  oracle: expected.oracle, transformer: kit.transformer,
};
fs.writeFileSync(path.join(BATCH_DIR, out), JSON.stringify({ summary, results }, null, 1));
console.log(JSON.stringify(summary));
process.exitCode = summary.disagree ? 1 : 0;
