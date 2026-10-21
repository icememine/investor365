// Minimal reproducers for distribution gaps, run against the frozen kit (read-only; kit CLI outputs go to
// evidence/tmp-gaps, removed afterwards). Writes evidence/gaps.json.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadNodeKit, BATCH_DIR, KIT_DIR } from '../lib/node-kit.mjs';

const kit = await loadNodeKit();
const rt = kit.runtime;
const TMP = path.join(BATCH_DIR, 'evidence/tmp-gaps');
fs.rmSync(TMP, { recursive: true, force: true }); fs.mkdirSync(TMP, { recursive: true });
const H = 'SKU,NAME,PRICE_VND,QTY_ON_HAND\n';
const call = (name, args) => { try { return { out: rt.run(name, args).out }; } catch (e) { return { [e.kind === 'refused' ? 'refused' : 'fault']: e.code, message: e.message, origin: e.origin }; } };
const kitCli = (args) => { const r = spawnSync(process.execPath, ['tools/run.mjs', ...args], { cwd: KIT_DIR, encoding: 'utf8' }); return { status: r.status, stdout: r.stdout.trim(), stderr: r.stderr.trim() }; };
const gaps = {};

gaps['G-1 MalformedCSV has no location'] = { input: H + 'PEN,"Pen,1,1\n', observed: call('supplier.from_csv', [H + 'PEN,"Pen,1,1\n']) };

const dbl = path.join(TMP, 'double-bom.csv'); fs.writeFileSync(dbl, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf, 0xef, 0xbb, 0xbf]), Buffer.from(H + 'PEN,Pen,1,1\n')]));
gaps['G-2 kit CLI accepts a double BOM (its decoder strips one, csv strips another)'] = {
  kitCli: kitCli(['batch', dbl, path.join(TMP, 'dbl-out.json')]),
  thisHost: 'rejected with header issue + BOM hint (fixture bom-double, agree)' };

const timing = [];
for (const n of [250, 500, 1000]) {
  const text = H + Array.from({ length: n }, () => 'dup,Item,x,1\n').join('');
  const t0 = performance.now(); const r = call('supplier.from_csv', [text]); const ms = Math.round(performance.now() - t0);
  timing.push({ invalidRows: n, ms, issues: r.out.errors.length, operations: rt.operations });
}
gaps['G-3 rejection time grows quadratically with issue count (supplier.join fold)'] = { timing };

const bad = path.join(TMP, 'malformed.csv'); fs.writeFileSync(bad, H + 'PEN,"Pen,1,1\n');
const big = path.join(TMP, 'big.csv'); fs.writeFileSync(big, Buffer.alloc(1048577, 0x41));
gaps['G-4 kit CLI writes no report on file-level failures; report lacks run/input/output identity'] = {
  malformed: { ...kitCli(['batch', bad, path.join(TMP, 'm.json')]), reportWritten: fs.existsSync(path.join(TMP, 'm.json.report.json')) },
  oversize: { ...kitCli(['batch', big, path.join(TMP, 'b.json')]), reportWritten: fs.existsSync(path.join(TMP, 'b.json.report.json')) } };

gaps['G-6 kit `check`/`run-file` compile application roots under the BROWSER profile'] = {
  source: (fs.readFileSync(path.join(KIT_DIR, 'tools/run.mjs'), 'utf8').match(/new Runtime\(g,JSON\.parse\(texts\['profiles\/[a-z]+\.json'\]\)\)/) || [''])[0],
  thisBuild: 'tests/check-node.mjs runs batch.node examples under profiles/batch.json' };

const cells = n => H + ','.repeat(n - 1) + '\n';
gaps['G-7 a record with more than 50000 fields faults (runtime list-length limit) instead of a located row rejection'] = {
  at50000fields: call('supplier.from_csv', [cells(50000)]).out?.errors,
  at50001fields: call('supplier.from_csv', [cells(50001)]),
  kitCli: kitCli(['call', 'supplier.from_csv', JSON.stringify([cells(50001)])]) };

gaps['U-4 wrong-shape rows count toward duplicate detection but are not flagged as duplicates'] = {
  input: H + 'PEN,Pen,1\nPEN,Pen,1,1\n', observed: call('supplier.from_csv', [H + 'PEN,Pen,1\nPEN,Pen,1,1\n']).out.errors };

gaps['P-1 prelude text.parse_decimal_nat faults on out-of-range digits (not used as a validator here)'] = {
  observed: call('text.parse_decimal_nat', ['9007199254740992']) };

fs.rmSync(TMP, { recursive: true, force: true });
fs.writeFileSync(path.join(BATCH_DIR, 'evidence/gaps.json'), JSON.stringify(gaps, null, 1));
console.log(JSON.stringify(gaps, null, 1).slice(0, 6000));
