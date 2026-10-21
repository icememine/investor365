// Compare DNode game.tick against the independent Python oracle, tick by tick (full canonical state incl. events).
// Usage: node tools/compare.mjs [oracle/cases.json oracle/expected.json evidence/oracle-compare.json]
import fs from 'node:fs';
import path from 'node:path';
import {loadGame, canon, GAME} from './lib.mjs';

const [casesPath = 'oracle/cases.json', expPath = 'oracle/expected.json', outPath = 'evidence/oracle-compare.json'] = process.argv.slice(2);
const cases = JSON.parse(fs.readFileSync(path.resolve(GAME, casesPath), 'utf8'));
const expected = JSON.parse(fs.readFileSync(path.resolve(GAME, expPath), 'utf8'));
const {runtime, identities} = await loadGame();

let tickAgree = 0, tickDisagree = 0, caseAgree = 0, caseDisagree = 0;
const perCase = [], disagreements = [];
const t0 = performance.now();
for (const c of cases) {
  const exp = expected[c.name];
  let s = c.initial, firstDiff = null, ticks = 0, agree = 0;
  for (let k = 0; k < c.inputs.length; k++) {
    let got;
    try { s = runtime.run('game.tick', [s, c.inputs[k]]).out; got = {ok: s}; }
    catch (e) { got = e.kind === 'refused' ? {refuse: e.code} : {fault: e.code ?? e.message}; }
    ticks++;
    const want = exp[k];
    const same = want && canon(got) === canon(want);
    if (same) { agree++; tickAgree++; } else {
      tickDisagree++;
      if (!firstDiff) firstDiff = {tick: k, input: c.inputs[k], dnode: got, oracle: want};
    }
    if (!('ok' in got)) break;
  }
  if (ticks !== exp.length) { tickDisagree++; firstDiff ??= {lengthMismatch: [ticks, exp.length]}; }
  const ok = !firstDiff;
  ok ? caseAgree++ : caseDisagree++;
  perCase.push({name: c.name, category: c.category, ticks, agree, result: ok ? 'AGREE' : 'DISAGREE', note: c.note});
  if (firstDiff) disagreements.push({name: c.name, ...firstDiff});
}
const ms = performance.now() - t0;
const report = {identities, cases: cases.length, caseAgree, caseDisagree, tickAgree, tickDisagree,
  wallMs: Math.round(ms), perCase, disagreements};
fs.writeFileSync(path.resolve(GAME, outPath), JSON.stringify(report, null, 1));
console.log(`cases ${cases.length}: agree ${caseAgree}, disagree ${caseDisagree}; ticks agree ${tickAgree}, disagree ${tickDisagree}; ${Math.round(ms)} ms`);
for (const d of disagreements) console.log('DISAGREE', JSON.stringify(d).slice(0, 1500));
process.exitCode = caseDisagree ? 1 : 0;
