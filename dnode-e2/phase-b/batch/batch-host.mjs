#!/usr/bin/env node
// BP-BATCH CLI host (D-B7). Usage:
//   node batch-host.mjs <input.csv> <dest-dir-or-path>     run, publish, report
//   node batch-host.mjs --verify <dest-dir-or-path>        apply the usability rule to what is on disk
// Destination: an existing directory (or a path ending in "/") means <dir>/snapshot.json.
// Files: <dest> (snapshot), <dest>.report.json (semantic report), <dir>/batch-runs.log (volatile log).
// Exit codes: 0 accepted / verified current; 2 rejected (record or file level) / unverified; 1 fault,
// kit refusal or publication failure.
// Test-only fault hook (B05): BATCH_HOST_FAULT=after-temp-write | between-renames kills this process
// with SIGKILL (a) after the snapshot temp file is written, (b) after the snapshot rename and before
// the report is written. It exists only in this host, never in the kit.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { loadNodeKit } from './lib/node-kit.mjs';
import { runBatch, usability, visible, banner, duplicateGroups } from './lib/core.mjs';

const say = (...a) => console.log(...a);
const fileSha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const streamSha = file => new Promise((resolve, reject) => {
  const h = crypto.createHash('sha256');
  fs.createReadStream(file).on('data', d => h.update(d)).on('end', () => resolve(h.digest('hex'))).on('error', reject);
});

function resolveDest(arg) {
  let dest = path.resolve(arg);
  if (arg.endsWith('/') || arg.endsWith(path.sep) || (fs.existsSync(dest) && fs.statSync(dest).isDirectory()))
    dest = path.join(dest, 'snapshot.json');
  return { dest, report: dest + '.report.json', log: path.join(path.dirname(dest), 'batch-runs.log') };
}

function fault(point) {
  if (process.env.BATCH_HOST_FAULT === point) {
    process.stderr.write('FAULT HOOK ' + point + ': killing process ' + process.pid + '\n');
    process.kill(process.pid, 'SIGKILL');
  }
}

// Stage in the destination directory with an exclusive create, then rename over the target.
function publish(target, data, faultAfterTemp) {
  const temp = target + '.' + process.pid + '.tmp';
  try {
    fs.writeFileSync(temp, data, { flag: 'wx' });
    if (faultAfterTemp) fault('after-temp-write');
    fs.renameSync(temp, target);
  } finally {
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}

function verifyCommand(arg) {
  const { dest, report } = resolveDest(arg);
  const snapSha = fs.existsSync(dest) ? fileSha(dest) : null;
  const reportText = fs.existsSync(report) ? fs.readFileSync(report, 'utf8') : '';
  const u = usability(reportText, snapSha);
  if (u.verified) say('VERIFIED CURRENT: ' + dest + ' (sha256 ' + snapSha + ') — ' + u.reason + '.');
  else say('UNVERIFIED: ' + dest + (snapSha ? ' (sha256 ' + snapSha + ')' : '') + ' — ' + u.reason + '. Do not import it; re-run the batch on the source file.');
  return u.verified ? 0 : 2;
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--verify' && args[1]) return verifyCommand(args[1]);
  if (args.length !== 2) {
    say('Usage: node batch-host.mjs <input.csv> <dest-dir-or-path>\n       node batch-host.mjs --verify <dest-dir-or-path>');
    return 1;
  }
  const [inputPath, destArg] = args;
  const { dest, report: reportPath, log } = resolveDest(destArg);

  // R0.2: admit the kit before running anything.
  let kit;
  try { kit = await loadNodeKit(); }
  catch (e) { console.error('REFUSED: ' + (e.code ? e.code + ': ' : '') + e.message + '. Nothing was run and nothing was written.'); return 1; }

  if (!fs.existsSync(path.dirname(dest))) { console.error('Tool fault (DestinationMissing) — directory ' + path.dirname(dest) + ' does not exist. Nothing was run.'); return 1; }
  const leftovers = fs.readdirSync(path.dirname(dest)).filter(f => f.startsWith(path.basename(dest) + '.') && f.endsWith('.tmp'));
  if (leftovers.length) say('Note: leftover temp file(s) from an interrupted earlier run: ' + leftovers.join(', ') + ' (never imported; safe to delete).');

  // D-B7 step 1: byte limit before decoding; oversize bytes are hashed by streaming, never decoded.
  let input;
  try {
    const size = fs.statSync(inputPath).size;
    input = size > kit.maxBytes ? { size, sha256: await streamSha(inputPath) } : { bytes: new Uint8Array(fs.readFileSync(inputPath)) };
  } catch (e) { console.error('Tool fault (InputUnreadable) — ' + e.message + '. Nothing was written.'); return 1; }

  const previousSnapshotSha = fs.existsSync(dest) ? fileSha(dest) : null;
  const run = await runBatch(kit, input);
  const { report } = run;
  const id12 = report.runId.slice(0, 12);

  // Publication: accepted → snapshot (temp+rename) THEN report (temp+rename); otherwise report only.
  let exitCode = run.exitCode;
  try {
    if (report.status === 'accepted') {
      publish(dest, run.snapshotText, true);
      fault('between-renames');
    }
    publish(reportPath, run.reportText, false);
  } catch (e) {
    console.error('Tool fault (PublicationFailed) — ' + e.message);
    exitCode = 1;
  }

  // Operator output.
  const c = report.counts;
  const b = banner(report);
  if (exitCode === 1 && report.status !== 'fault') say('Tool fault (PublicationFailed) — the result below was computed but could not be written completely; see the error above.');
  say(b.text);
  if (b.kind === 'accepted') {
    say(`Snapshot: ${dest} sha256 ${report.snapshot.sha256}`);
  } else if (b.kind === 'records') {
    for (const g of duplicateGroups(run.result.issues)) say('  ' + g.text);
    const byRecord = new Map();
    for (const i of run.result.issues) { if (!byRecord.has(i.record)) byRecord.set(i.record, []); byRecord.get(i.record).push(i); }
    for (const [r, list] of [...byRecord].sort((a, b) => a[0] - b[0])) {
      say(`  Record ${r} · spreadsheet row ${r + 1} · SKU ${list[0].sku === '' ? '(empty)' : visible(list[0].sku)}`);
      for (const i of list) say(`    ${i.field}: value "${visible(i.value)}" — ${i.message}. ${i.hint}`);
    }
  } else if (b.kind === 'file') {
    if (report.fileError) say('  ' + report.fileError.message);
    else say('  ' + report.issues[0].message + '. ' + report.issues[0].hint);
  } else {
    say('  ' + report.fault.detail);
  }
  if (report.status !== 'accepted') {
    if (previousSnapshotSha) say(`${dest} was not changed and still holds sha256 ${previousSnapshotSha} from an earlier run; it is NOT the result of this run.`);
    else say(`No snapshot exists at ${dest}; this run did not produce one.`);
  }
  if (c) say(`Counts: dataRecords ${c.dataRecords}, acceptedRecords ${c.acceptedRecords}, recordsWithIssues ${c.recordsWithIssues}, issues ${c.issues}`);
  say(`Run ${report.runId} · input ${report.input.bytes} bytes sha256 ${report.input.sha256}`);
  say(`Report: ${reportPath}`);

  // Volatile data stays outside the semantic report (D-B6).
  try {
    fs.appendFileSync(log, JSON.stringify({ time: new Date().toISOString(), host: os.hostname(), pid: process.pid,
      input: path.resolve(inputPath), dest, runId: report.runId, status: report.status, exitCode,
      previousSnapshotSha, snapshotSha: report.snapshot.sha256 ?? null }) + '\n');
  } catch (e) { console.error('Warning: run log not written: ' + e.message); }
  return exitCode;
}

process.exitCode = await main();
