// BP-BATCH host pipeline shared by the CLI host, the browser Web Worker and the test runners.
// Host responsibilities only (D-B6, D-B7, R0.2): kit admission, byte limit, SHA-256 identities,
// strict UTF-8 decoding, one DNode call, and report assembly with the kit's pinned encoder.
// It makes no acceptance decision: status comes from batch.run's `ok`, which is supplier.from_csv's.
// Kit modules are injected (engine, admission) so the same file runs in Node and in the browser.

export const PINNED_TRUST_FINGERPRINT = '4c7716c7b528dfcdba2190c27516a09e057334309f1fb0b9a8785991cfca0244';
const LEXICAL_REFUSALS = new Set(['MalformedCSV', 'TooManyRows', 'FileTooLarge']);

const hex = buf => [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');
export async function sha256Bytes(bytes) { return hex(await crypto.subtle.digest('SHA-256', bytes)); }

export class AdmissionError extends Error {
  constructor(detail) { super('Kit verification failed: ' + detail); this.code = 'AdmissionDenied'; }
}

// R0.2: verify the kit (signature + every attested file digest) before compiling or running anything.
export async function loadKit({ engine, admission, read, trustKey, appSource }) {
  let verified;
  try { verified = await admission.verifyBundle(read, trustKey); }
  catch (e) { throw new AdmissionError((e && (e.code ? e.code + ' ' : '') + e.message) || String(e)); }
  const { release, texts } = verified;
  const trustFingerprint = await admission.sha(engine.json(trustKey));
  if (trustFingerprint !== release.attestation.trustKeyFingerprint)
    throw new AdmissionError('trust key fingerprint ' + trustFingerprint + ' differs from the release attestation');
  if (trustFingerprint !== PINNED_TRUST_FINGERPRINT)
    throw new AdmissionError('trust key fingerprint ' + trustFingerprint + ' differs from the fingerprint pinned in this host');
  const roots = Object.entries(texts).filter(([p]) => p.startsWith('roots/') && p.endsWith('.node')).map(([, s]) => s);
  const graph = engine.compile([...roots, appSource]);
  const profile = JSON.parse(texts['profiles/batch.json']);
  const runtime = new engine.Runtime(graph, profile);
  const appSha = await admission.sha(appSource);
  const transformer = {
    app: appSha,
    profile: release.attestation.files['profiles/batch.json'],
    runtime: release.attestation.runtimeIdentity,
    supplier: release.attestation.rootHashes.supplier,
  };
  return { engine, admission, release, texts, graph, runtime, profile, transformer, trustFingerprint, appSha,
    maxBytes: profile.host.maxBytes };
}

// D-B6: runId = SHA-256(encode({input: SHA-256(raw bytes), transformer})).
export async function runIdentity(kit, inputSha) {
  return kit.admission.sha(kit.engine.json({ input: inputSha, transformer: kit.transformer }));
}

// One run. input = {bytes: Uint8Array} or, for an oversize file whose bytes were not loaded,
// {size, sha256}. Returns {report, reportText, snapshotText?, result?, exitCode, status}.
// D-B7 order: 1 byte limit, 2 strict UTF-8 (ignoreBOM:true), 3 batch.run, 4 faults.
export async function runBatch(kit, input, { observe } = {}) {
  const { engine, runtime } = kit;
  const size = input.size ?? input.bytes.length;
  const inputSha = input.sha256 ?? await sha256Bytes(input.bytes);
  const runId = await runIdentity(kit, inputSha);
  const base = { input: { bytes: size, sha256: inputSha }, runId, transformer: kit.transformer };
  const finish = async (report, extra = {}) => {
    const reportText = engine.json(report);
    const exitCode = report.status === 'accepted' ? 0 : report.status === 'rejected' ? 2 : 1;
    return { report, reportText, exitCode, status: report.status, ...extra };
  };
  const fault = (e, stage) => finish({ ...base, status: 'fault',
    fault: { code: String(e?.code ?? 'HostError'), detail: stage + ': ' + String(e?.message ?? e) },
    issues: [], snapshot: { published: false } });
  const fileLevel = async code => {
    let fe;
    try { fe = runtime.run('batch.file_error', [code]).out; } catch (e) { return fault(e, 'batch.file_error'); }
    return finish({ ...base, status: 'rejected', fileError: { code: fe.code, message: fe.message },
      issues: [], snapshot: { published: false } }, { stage: 'file' });
  };

  if (size > kit.maxBytes) return fileLevel('FileTooLarge');              // before any decoding or parsing
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(input.bytes); }
  catch { return fileLevel('InvalidUTF8'); }

  let result;
  runtime.observe = observe;
  try { result = runtime.run('batch.run', [text]).out; }
  catch (e) {
    if (e && e.kind === 'refused' && LEXICAL_REFUSALS.has(e.code)) return fileLevel(e.code);
    return fault(e, 'batch.run');
  } finally { runtime.observe = undefined; }

  const operations = runtime.operations;
  if (result.ok) {
    const snapshotText = result.snapshot;
    const snapshotSha = await kit.admission.sha(snapshotText);
    return finish({ ...base, status: 'accepted', counts: result.counts, issues: [],
      snapshot: { published: true, records: result.rows.length, sha256: snapshotSha } },
      { snapshotText, snapshotSha, result, operations, stage: 'records' });
  }
  const issues = result.issues.map(({ record, field, message, hint }) => ({ record, field, message, hint }));
  const stage = result.issues.some(i => i.record >= 1) ? 'records' : 'file';
  return finish({ ...base, status: 'rejected', counts: result.counts, issues, snapshot: { published: false } },
    { result, operations, stage });
}

// D-B7 usability rule: a snapshot is "verified current" only if the adjacent report says accepted
// and its snapshot.sha256 equals the digest of the snapshot bytes on disk.
export function usability(reportText, snapshotSha) {
  let report;
  try { report = JSON.parse(reportText); } catch { return { verified: false, reason: 'report is missing or unreadable' }; }
  if (report.status !== 'accepted') return { verified: false, reason: 'latest report status is ' + report.status + ' (run ' + report.runId + ')', report };
  if (!snapshotSha) return { verified: false, reason: 'snapshot file is missing', report };
  if (report.snapshot?.sha256 !== snapshotSha) return { verified: false, reason: 'snapshot sha256 ' + snapshotSha + ' does not match the accepted report (' + report.snapshot?.sha256 + ', run ' + report.runId + ')', report };
  return { verified: true, reason: 'snapshot matches accepted report of run ' + report.runId, report };
}

// D-B5a rev 2 banners (presentation; derived only from the report). kind ∈ accepted | records | file | fault.
// First word fixed: Accepted / Rejected / Tool fault.
export function banner(report) {
  const id12 = report.runId.slice(0, 12), c = report.counts;
  if (report.status === 'accepted') return { kind: 'accepted',
    text: `Accepted — ${c.acceptedRecords} records ready. This snapshot (run ${id12}) can replace the supplier stock in the shop.` };
  if (report.status === 'fault') return { kind: 'fault',
    text: `Tool fault (${report.fault.code}) — this is a defect in the tool or distribution, not a judgement about your file. No snapshot was produced.` };
  if (report.issues.some(i => i.record >= 1)) return { kind: 'records',
    text: `Rejected — no snapshot was produced. ${c.recordsWithIssues} of ${c.dataRecords} records need correction (${c.issues} problems). Nothing in the shop or in any earlier export was changed. Partial acceptance is not available: correct the listed records and validate the whole file again.` };
  if (!report.fileError && report.issues[0]?.field === 'file') return { kind: 'file',
    text: 'Rejected — the file contains no product records (empty snapshot). No snapshot was produced. Nothing in the shop or in any earlier export was changed.' };
  const code = report.fileError ? report.fileError.code : 'header';
  return { kind: 'file',
    text: `Rejected — the file could not be read as the declared CSV (${code}). No records were checked and no snapshot was produced. Nothing in the shop or in any earlier export was changed.` };
}

// Host grouping over already-flagged duplicate issues (no new involvement is inferred, D-B5b).
export function duplicateGroups(issues) {
  const g = new Map();
  for (const i of issues) if (i.field === 'SKU' && /^Duplicate SKU/.test(i.message)) {
    if (!g.has(i.sku)) g.set(i.sku, []);
    g.get(i.sku).push(i.record);
  }
  // A single flagged record means the other occurrence(s) sit in records with a wrong field count, which
  // the shared root lists only as "row" problems (known limit U-4). Say so instead of naming them.
  return [...g].map(([sku, records]) => ({ sku, records, text: records.length > 1
    ? `SKU ${sku} appears in records ${records.join(', ')}. Keep one record per SKU.`
    : `SKU ${sku} in record ${records[0]} is also used by a record listed with a wrong number of fields. Keep one record per SKU.` }));
}

// Presentation helper shared by CLI and browser: visible whitespace (display only, D-B5a).
export function visible(s) {
  return s.replace(/ /g, '·').replace(/\t/g, '→').replace(/\r/g, '␍').replace(/\n/g, '␊');
}
