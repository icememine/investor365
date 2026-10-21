// Structural compile of kit roots + all four Breakout roots (same compile()/Runtime as tools/run.mjs check),
// then executes every inline `ex` case through the runtime. Not certification.
import {loadGame, canon} from './lib.mjs';

const {graph, runtime, identities} = await loadGame();
console.log('STRUCTURAL: compiled', Object.keys(graph.nodes).length, 'nodes (kit + app) with browser-e1 profile');
let pass = 0, fail = 0;
const failures = [];
for (const [name, node] of Object.entries(graph.nodes)) {
  if (!name.match(/^(geo|phys|ctl|game)\./)) continue;
  for (const [k, ex] of node.examples.entries()) {
    let got;
    try { got = {out: runtime.run(name, ex.args).out}; }
    catch (e) { got = e.kind === 'refused' ? {refuse: e.code} : {fault: e.code ?? e.message}; }
    let ok;
    if ('out' in ex) ok = 'out' in got && canon(got.out) === canon(ex.out);
    else if ('refuse' in ex) ok = got.refuse === ex.refuse;
    else if ('fault' in ex) ok = got.fault === ex.fault;
    if (ok) pass++; else { fail++; failures.push({node: name, example: k, expected: ex, got}); }
  }
}
// Property: game.removed_count equals the per-element filter count (all Bool lists of length 0..12, plus
// 2000 deterministic pseudo-random length-30 lists). Both sides run in the DNode runtime.
let propChecked = 0, propFailed = 0;
const lists = [];
for (let n = 0; n <= 12; n++) for (let m = 0; m < (1 << n); m++) lists.push(Array.from({length: n}, (_, i) => !((m >> i) & 1)));
let seed = 12345;
for (let k = 0; k < 2000; k++) lists.push(Array.from({length: 30}, () => ((seed = (1103515245 * seed + 12345) % 2147483648) >> 16) % 3 !== 0));
for (const b of lists) {
  const fast = runtime.run('game.removed_count', [b]).out;
  const slow = b.filter(x => runtime.run('game.is_removed', [x]).out).length;
  propChecked++; if (fast !== slow) propFailed++;
}
if (propFailed) fail++;
console.log(JSON.stringify({exPassed: pass, exFailed: fail, removedCountProperty: {checked: propChecked, failed: propFailed}, identities}, null, 1));
for (const f of failures) console.log('EX FAIL', JSON.stringify(f));
process.exitCode = fail ? 1 : 0;
