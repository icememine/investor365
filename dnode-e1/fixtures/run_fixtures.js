/* run_fixtures.js — every fixture through the certified batch root, compared with expected.json (computed in Python). */
const fs = require('fs'); const path = require('path');
const E = require('../engine.js');
const graph = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'graph.batch_transform.json'), 'utf8'));
const certs = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'certs.batch_transform.json'), 'utf8'));
const profile = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'profiles', 'batch.json'), 'utf8'));
const view = E.resolve(graph, 'batch_transform'); view.profile = profile;
const certified = new Set(Object.keys(certs.certified));
const expected = JSON.parse(fs.readFileSync(path.join(__dirname, 'expected.json'), 'utf8'));
let ok = 0, bad = [];
for (const [name, exp] of Object.entries(expected)) {
  const text = fs.readFileSync(path.join(__dirname, name), 'utf8');
  let got;
  try { got = E.callNode('run', [text], { view, effects: [], certified, profile }); }
  catch (e) { got = e instanceof E.Refusal ? { outcome: e.err } : { outcome: 'FAULT ' + e.message }; }
  const problems = [];
  if (exp.lexical) { if (got.outcome !== exp.lexical) problems.push(`outcome ${got.outcome} ≠ ${exp.lexical}`); }
  else {
    const want = exp.accepted ? 'Accepted' : 'Rejected';
    if (got.outcome !== want) problems.push(`outcome ${got.outcome} ≠ ${want}`);
    if (E.canon(got.problems || []) !== E.canon(exp.problems)) problems.push(`problems ${JSON.stringify(got.problems)} ≠ ${JSON.stringify(exp.problems)}`);
    if (E.canon(got.duplicates || []) !== E.canon(exp.duplicates)) problems.push(`duplicates ${JSON.stringify(got.duplicates)} ≠ ${JSON.stringify(exp.duplicates)}`);
    if (E.canon(got.records || []) !== E.canon(exp.records)) problems.push(`records differ: ${JSON.stringify(got.records)} vs ${JSON.stringify(exp.records)}`);
  }
  if (problems.length) bad.push(name + ': ' + problems.join('; ')); else ok++;
}
console.log(`fixtures: ${ok} agree, ${bad.length} disagree`); bad.forEach(b => console.log('  ' + b));
process.exit(bad.length ? 1 : 0);
