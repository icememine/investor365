/* compare_oracle.js — every arithmetic example in kernel.node and every native example for + * div mod sum
 * must agree with oracle.json, which Python computed with arbitrary-precision integers.
 * Then the natives are run through the evaluator and compared with the oracle too. */
const fs = require('fs'); const path = require('path');
const E = require('../engine.js'); const L = require('../lang.js');
const oracle = JSON.parse(fs.readFileSync(path.join(__dirname, 'oracle.json'), 'utf8'));
const graph = { roots: {} }; const r = L.parse(fs.readFileSync(path.join(__dirname, 'kernel.node'), 'utf8'), 'kernel.node'); graph.roots.kernel = r;
const view = E.resolve(graph, 'kernel');
const opOf = { add: '+', mul: '*', div: 'div', mod: 'mod', sum: 'sum', neg: 'neg', abs: 'abs' };
let checked = 0, problems = [];
for (const [kind, cases] of Object.entries(oracle.cases)) {
  const op = opOf[kind];
  for (const c of cases) {
    const args = c.args.map(a => Array.isArray(a) ? ['list', ...a] : a);
    let got;
    try { got = E.ev([op, ...args], {}, { view, effects: [] }); } catch (e) { got = e instanceof E.Fault ? e.kind : 'crash:' + e.message; }
    checked++;
    if (E.canon(got) !== E.canon(c.expect)) problems.push(`${op}(${JSON.stringify(c.args)}) runtime=${JSON.stringify(got)} oracle=${JSON.stringify(c.expect)}`);
  }
}
// kernel.node examples for div/mod must match the oracle where the oracle has that case
const byKey = {}; for (const kind of ['div', 'mod']) for (const c of oracle.cases[kind]) byKey[kind + ':' + E.canon(c.args)] = c.expect;
for (const [name, kind] of [['k04_div', 'div'], ['k04_div_edge', 'div'], ['k04_mod', 'mod']]) {
  for (const ex of view.nodes[name].ex) {
    if (!('out' in ex)) continue;
    const key = kind + ':' + E.canon([ex.args.a, ex.args.b]);
    if (key in byKey) { checked++; if (byKey[key] !== ex.out) problems.push(`${name} example ${key} says ${ex.out}, oracle says ${byKey[key]}`); }
  }
}
// the quotient/remainder relation, checked with the oracle's own q and r (no runtime involved)
for (const x of oracle.relation) if (!x.relation_holds) problems.push(`oracle relation fails for ${x.a}, ${x.b}`);
console.log(`oracle comparison: ${checked} cases checked, ${problems.length} disagreements`);
problems.forEach(p => console.log('  ' + p));
process.exit(problems.length ? 1 : 0);
