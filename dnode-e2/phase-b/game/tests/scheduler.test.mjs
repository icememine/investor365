// Timestamp -> tick-count fixture for host/scheduler.js (D-G3.1, G04). Expected values are written from the
// D-G3 rule (60 Hz, cap 5, discard excess, re-epoch), not from running the scheduler.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Scheduler} from '../host/scheduler.js';

const fixtures = [
  {name: 'steady 60 Hz', start: 0, frames: [1000 / 60, 2000 / 60, 3000 / 60, 4000 / 60], expect: [[1, 0], [1, 0], [1, 0], [1, 0]]},
  {name: '120 Hz display alternates 0/1', start: 0, frames: [8.4, 16.8, 25.2, 33.6], expect: [[0, 0], [1, 0], [0, 0], [1, 0]]},
  {name: '30 Hz display runs 2 per frame', start: 0, frames: [33.4, 66.8, 100.1], expect: [[2, 0], [2, 0], [2, 0]]},
  {name: 'exactly 5 due runs 5, no discard', start: 0, frames: [5000 / 60 + 0.01, 5000 / 60 + 1000 / 60 + 0.01], expect: [[5, 0], [1, 0]]},
  {name: '100 ms stall: 6 due -> 5 run, 1 discarded, re-epoch', start: 0, frames: [100.01, 100.01 + 1000 / 60 + 0.01], expect: [[5, 1], [1, 0]]},
  {name: '250 ms stall: 15 due -> 5 run, 10 discarded', start: 0, frames: [250, 250 + 17], expect: [[5, 10], [1, 0]]},
  {name: '30 s gap: 1800 due -> 5 run, 1795 discarded', start: 0, frames: [30000, 30017], expect: [[5, 1795], [1, 0]]},
  {name: 'phase A deltas 16.7, 100, 250, 30000', start: 0, frames: [16.7, 116.7, 366.7, 30366.7], expect: [[1, 0], [5, 1], [5, 10], [5, 1795]]},
  {name: 'clock going backwards runs nothing', start: 1000, frames: [990, 1000 + 1000 / 60 + 0.01], expect: [[0, 0], [1, 0]]},
  {name: 'non-zero epoch', start: 123456.7, frames: [123456.7 + 50.1], expect: [[3, 0]]},
];
let pass = 0, fail = 0; const results = [];
for (const f of fixtures) {
  const s = new Scheduler(f.start, 60, 5);
  const got = f.frames.map(t => { const r = s.frame(t); return [r.ticks, r.discarded]; });
  const ok = JSON.stringify(got) === JSON.stringify(f.expect);
  ok ? pass++ : fail++;
  results.push({name: f.name, frames: f.frames, expect: f.expect, got, ok});
  console.log(ok ? 'PASS' : 'FAIL', f.name, JSON.stringify(got));
}
// reset() discards paused/hidden time
const s = new Scheduler(0); s.frame(1000 / 60); s.reset(60000);
const afterReset = s.frame(60000 + 1000 / 60 + 0.01);
const resetOk = afterReset.ticks === 1 && afterReset.discarded === 0;
resetOk ? pass++ : fail++;
results.push({name: 'reset(now) on visibility return', got: afterReset, ok: resetOk});
console.log(resetOk ? 'PASS' : 'FAIL', 'reset(now) on visibility return', JSON.stringify(afterReset));
console.log(`scheduler fixtures: ${pass} passed, ${fail} failed`);
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../evidence/scheduler-fixture.json');
fs.writeFileSync(out, JSON.stringify({pass, fail, results}, null, 1));
process.exitCode = fail ? 1 : 0;
