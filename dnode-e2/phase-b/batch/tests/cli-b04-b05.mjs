// B04 determinism and B05 interruption/limits against the real CLI host (child processes).
// Also: B-T5 (old output vs rejected run), kit-refusal (R0.2), relocatable layout.
// Writes evidence/b04.json and evidence/b05.json. Uses a scratch dir under evidence/tmp-cli (removed after).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { BATCH_DIR, KIT_DIR } from '../lib/node-kit.mjs';
import { loadNodeKit } from '../lib/node-kit.mjs';
import { runBatch } from '../lib/core.mjs';

const HOST = path.join(BATCH_DIR, 'batch-host.mjs');
const FX = n => path.join(BATCH_DIR, 'fixtures/cases', n + '.csv');
const WORK = path.join(BATCH_DIR, 'evidence/tmp-cli');
fs.rmSync(WORK, { recursive: true, force: true });
fs.mkdirSync(WORK, { recursive: true });
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const read = f => fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
const dir = name => { const d = path.join(WORK, name); fs.mkdirSync(d, { recursive: true }); return d; };
function cli(args, env = {}, host = HOST) {
  const r = spawnSync(process.execPath, [host, ...args], { encoding: 'utf8', env: { ...process.env, ...env } });
  return { status: r.status, signal: r.signal, stdout: r.stdout, stderr: r.stderr };
}
const checks = [];
const check = (group, name, pass, observed) => { checks.push({ group, name, pass: !!pass, observed }); console.log((pass ? 'PASS ' : 'FAIL ') + group + ' ' + name); };

// ---------------- B04 determinism ----------------
{
  const d1 = dir('b04-1'), d2 = dir('b04-2'), d3 = dir('b04-crlf'), d4 = dir('b04-rej-1'), d5 = dir('b04-rej-2');
  const r1 = cli([FX('bt1-lf'), d1]), r2 = cli([FX('bt1-lf'), d2]), r3 = cli([FX('bt1-crlf'), d3]);
  const s = d => path.join(d, 'snapshot.json'), rp = d => path.join(d, 'snapshot.json.report.json');
  check('B04', 'repeat run: exit 0 both', r1.status === 0 && r2.status === 0, [r1.status, r2.status]);
  check('B04', 'repeat run: snapshot bytes identical', sha(s(d1)) === sha(s(d2)), [sha(s(d1)), sha(s(d2))]);
  check('B04', 'repeat run: report bytes identical', sha(rp(d1)) === sha(rp(d2)), [sha(rp(d1)), sha(rp(d2))]);
  check('B04', 'LF vs CRLF: snapshot bytes identical', sha(s(d1)) === sha(s(d3)), [sha(s(d1)), sha(s(d3))]);
  const a = JSON.parse(read(rp(d1))), b = JSON.parse(read(rp(d3)));
  const strip = x => { const y = { ...x }; delete y.runId; delete y.input; return JSON.stringify(y); };
  check('B04', 'LF vs CRLF: reports differ only in runId and input', strip(a) === strip(b) && a.runId !== b.runId, { lf: a.runId, crlf: b.runId });
  const q1 = cli([path.join(KIT_DIR, 'dist/fixtures/supplier-invalid.csv'), d4]);
  const q2 = cli([path.join(KIT_DIR, 'dist/fixtures/supplier-invalid.csv'), d5]);
  check('B04', 'rejected repeat: exit 2 both, report bytes identical', q1.status === 2 && q2.status === 2 && sha(rp(d4)) === sha(rp(d5)), [q1.status, q2.status, sha(rp(d4))]);
  const report = read(rp(d1));
  check('B04', 'no timestamp in semantic report', !/\d{4}-\d{2}-\d{2}T/.test(report) && !/"(time|timestamp|date)"\s*:/i.test(report), report.length);
  const log = read(path.join(d1, 'batch-runs.log'));
  check('B04', 'volatile time is in batch-runs.log only', /"time":"\d{4}-/.test(log), log.trim().split('\n').length + ' line(s)');
  fs.writeFileSync(path.join(BATCH_DIR, 'evidence/b04.json'), JSON.stringify({
    checks: checks.filter(c => c.group === 'B04'),
    snapshotSha: sha(s(d1)), snapshotText: read(s(d1)), reportSha: sha(rp(d1)), crlfReportSha: sha(rp(d3)),
    runIds: { lf: a.runId, crlf: b.runId }, stdout: { lf: r1.stdout, crlf: r3.stdout } }, null, 1));
}

// ---------------- B05 interruption, B-T5, limits ----------------
const b05 = {};
const prime = (d) => { const r = cli([FX('bt5-previous-valid'), d]); return { r, snap: sha(path.join(d, 'snapshot.json')), rep: sha(path.join(d, 'snapshot.json.report.json')) }; };
{ // (a) killed after the snapshot temp write, before rename
  const d = dir('b05-a'); const p = prime(d);
  const k = cli([FX('bt1-lf'), d], { BATCH_HOST_FAULT: 'after-temp-write' });
  const files = fs.readdirSync(d);
  const v = cli(['--verify', d]);
  check('B05', '(a) process killed by SIGKILL', k.signal === 'SIGKILL', { signal: k.signal, stderr: k.stderr.trim() });
  check('B05', '(a) destination snapshot is the OLD complete bytes', sha(path.join(d, 'snapshot.json')) === p.snap, sha(path.join(d, 'snapshot.json')));
  check('B05', '(a) report is the OLD report', sha(path.join(d, 'snapshot.json.report.json')) === p.rep);
  check('B05', '(a) staged temp file left beside it (never a published name)', files.some(f => f.endsWith('.tmp')), files);
  check('B05', '(a) --verify: old pair still VERIFIED CURRENT (old, not new)', v.status === 0 && /VERIFIED CURRENT/.test(v.stdout), v.stdout.trim());
  const again = cli([FX('bt1-lf'), d]); const v2 = cli(['--verify', d]);
  check('B05', '(a) re-run publishes new snapshot and reports leftover temp', again.status === 0 && /leftover temp/.test(again.stdout) && v2.status === 0, again.stdout.split('\n')[0]);
  b05.a = { files, kill: k, verify: v.stdout.trim(), rerun: again.stdout, verifyAfter: v2.stdout.trim() };
}
{ // (b) killed between snapshot rename and report rename
  const d = dir('b05-b'); const p = prime(d);
  const expectedNew = JSON.parse(fs.readFileSync(path.join(BATCH_DIR, 'fixtures/expected.json'), 'utf8')).cases.find(c => c.name === 'bt1-lf');
  const k = cli([FX('bt1-lf'), d], { BATCH_HOST_FAULT: 'between-renames' });
  const v = cli(['--verify', d]);
  check('B05', '(b) process killed by SIGKILL', k.signal === 'SIGKILL', { signal: k.signal, stderr: k.stderr.trim() });
  check('B05', '(b) destination snapshot is the COMPLETE NEW bytes', sha(path.join(d, 'snapshot.json')) === expectedNew.snapshotSha256, sha(path.join(d, 'snapshot.json')));
  check('B05', '(b) report is still the OLD report', sha(path.join(d, 'snapshot.json.report.json')) === p.rep);
  check('B05', '(b) --verify detects UNVERIFIED (exit 2)', v.status === 2 && /UNVERIFIED/.test(v.stdout), v.stdout.trim());
  const again = cli([FX('bt1-lf'), d]); const v2 = cli(['--verify', d]);
  check('B05', '(b) deterministic re-run repairs: same snapshot bytes, VERIFIED', again.status === 0 && sha(path.join(d, 'snapshot.json')) === expectedNew.snapshotSha256 && v2.status === 0, v2.stdout.trim());
  b05.b = { kill: k, verify: v.stdout.trim(), verifyAfter: v2.stdout.trim() };
}
{ // B-T5: valid previous export, then a file with one invalid record
  const d = dir('bt5'); const p = prime(d);
  const r = cli([FX('bt5-new-invalid'), d]);
  const rep = JSON.parse(read(path.join(d, 'snapshot.json.report.json')));
  const v = cli(['--verify', d]);
  check('B-T5', 'rejected run exits 2', r.status === 2, r.status);
  check('B-T5', 'previous snapshot byte-unchanged', sha(path.join(d, 'snapshot.json')) === p.snap);
  check('B-T5', 'new report: status rejected, snapshot.published false, new runId', rep.status === 'rejected' && rep.snapshot.published === false && rep.runId.length === 64, rep.runId);
  check('B-T5', 'CLI states the old file is NOT the result of this run', /was not changed and still holds sha256 [0-9a-f]{64} from an earlier run; it is NOT the result of this run\./.test(r.stdout), r.stdout);
  check('B-T5', '--verify: UNVERIFIED (latest report rejected)', v.status === 2, v.stdout.trim());
  b05.bt5 = { stdout: r.stdout, verify: v.stdout.trim() };
}
{ // oversize stops at the boundary, before decoding or parsing
  const d = dir('b05-size');
  const r1 = cli([FX('size-1048576'), d]);
  const before = sha(path.join(d, 'snapshot.json'));
  const r2 = cli([FX('size-1048577'), d]);
  const big = path.join(WORK, 'sparse-64MiB.csv'); fs.writeFileSync(big, ''); fs.truncateSync(big, 64 * 1048576);
  const t0 = Date.now(); const r3 = cli([big, dir('b05-big')]); const ms = Date.now() - t0;
  const rep3 = JSON.parse(read(path.join(WORK, 'b05-big/snapshot.json.report.json')));
  check('B05', '1048576 bytes accepted (exit 0)', r1.status === 0, r1.stdout.split('\n')[0]);
  check('B05', '1048577 bytes rejected FileTooLarge (exit 2), snapshot untouched', r2.status === 2 && /FileTooLarge/.test(r2.stdout) && sha(path.join(d, 'snapshot.json')) === before, r2.stdout.split('\n')[0]);
  check('B05', '64 MiB file: FileTooLarge, hashed by streaming, report written', r3.status === 2 && rep3.fileError.code === 'FileTooLarge' && rep3.input.bytes === 64 * 1048576, { ms, runId: rep3.runId });
  // In-process spy: on oversize input no decoding and no DNode call other than batch.file_error.
  const kit = await loadNodeKit(); const calls = []; const orig = kit.runtime.run.bind(kit.runtime);
  kit.runtime.run = (n, a) => { calls.push(n); return orig(n, a); };
  const RealTD = globalThis.TextDecoder; let decodes = 0;
  globalThis.TextDecoder = class extends RealTD { decode(...x) { decodes++; return super.decode(...x); } };
  const res = await runBatch(kit, { bytes: new Uint8Array(fs.readFileSync(FX('size-1048577'))) });
  globalThis.TextDecoder = RealTD;
  check('B05', 'oversize: zero decodes, only batch.file_error called', decodes === 0 && calls.join() === 'batch.file_error' && res.report.fileError.code === 'FileTooLarge', { decodes, calls });
  const r4 = cli([FX('rows-10000'), dir('b05-rows')]); const r5 = cli([FX('rows-10001'), dir('b05-rows')]);
  check('B05', '10000 records accepted; 10001 → TooManyRows exit 2', r4.status === 0 && r5.status === 2 && /TooManyRows/.test(r5.stdout), [r4.stdout.split('\n')[0], r5.stdout.split('\n')[0]]);
  b05.size = { at1048576: r1.stdout, at1048577: r2.stdout, sparse64MiB: { ms, stdout: r3.stdout }, spy: { decodes, calls }, rows10000: r4.stdout.split('\n')[0], rows10001: r5.stdout };
}
{ // R0.2 kit refusal + relocatable layout: copy batch/ and kit/ to a fresh place, tamper with the COPY.
  const root = dir('relocated');
  fs.cpSync(KIT_DIR, path.join(root, 'kit/dnode-e1-kit'), { recursive: true });
  fs.mkdirSync(path.join(root, 'batch'));
  for (const f of ['batch-host.mjs', 'batch.node', 'lib']) fs.cpSync(path.join(BATCH_DIR, f), path.join(root, 'batch', f), { recursive: true });
  const host = path.join(root, 'batch/batch-host.mjs');
  const ok = cli([FX('bt1-lf'), dir('reloc-ok')], {}, host);
  check('R0.2', 'relocated copy runs (relative ../kit path)', ok.status === 0, ok.stdout.split('\n')[0]);
  const sup = path.join(root, 'kit/dnode-e1-kit/dist/roots/supplier.node');
  fs.chmodSync(path.dirname(sup), 0o755); fs.chmodSync(sup, 0o644);
  fs.appendFileSync(sup, '\n; tampered\n');
  const out = dir('reloc-tampered');
  const bad = cli([FX('bt1-lf'), out], {}, host);
  check('R0.2', 'tampered kit copy: REFUSED, exit 1, nothing written', bad.status === 1 && /REFUSED/.test(bad.stderr) && fs.readdirSync(out).length === 0, bad.stderr.trim());
  const keyPath = path.join(WORK, 'other-key.json');
  const { publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  fs.writeFileSync(keyPath, JSON.stringify({ ...publicKey.export({ format: 'jwk' }), key_ops: ['verify'], ext: true }));
  const out2 = dir('wrong-key');
  const wk = cli([FX('bt1-lf'), out2], { DNODE_TRUST_KEY: keyPath });
  check('R0.2', 'different trust key: REFUSED, exit 1, nothing written', wk.status === 1 && /REFUSED/.test(wk.stderr) && fs.readdirSync(out2).length === 0, wk.stderr.trim());
  b05.admission = { tampered: bad.stderr.trim(), wrongKey: wk.stderr.trim() };
}
fs.writeFileSync(path.join(BATCH_DIR, 'evidence/b05.json'), JSON.stringify({ checks: checks.filter(c => c.group !== 'B04'), detail: b05 }, null, 1));
fs.rmSync(WORK, { recursive: true, force: true });
const failed = checks.filter(c => !c.pass);
console.log(JSON.stringify({ checks: checks.length, passed: checks.length - failed.length, failed: failed.length }));
process.exitCode = failed.length ? 1 : 0;
