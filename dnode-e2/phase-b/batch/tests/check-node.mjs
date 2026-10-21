// Structural check + inline `ex` cases for batch.node, run through the actual kit runtime under
// profiles/batch.json (the kit's `tools/run.mjs check` compiles under the BROWSER profile and runs no
// examples). Not certification: finite examples only.
import fs from 'node:fs';
import path from 'node:path';
import { loadNodeKit, BATCH_DIR } from '../lib/node-kit.mjs';

const kit = await loadNodeKit();
const { runtime, engine, graph } = kit;
const appNodes = Object.values(graph.nodes).filter(n => n.root === 'batch');
const results = [];
for (const n of appNodes) {
  for (const [i, c] of n.examples.entries()) {
    let observed, pass;
    try {
      const out = runtime.run(n.name, c.args).out;
      observed = { out };
      pass = Object.hasOwn(c, 'out') && engine.canon(out) === engine.canon(c.out);
    } catch (e) {
      observed = { [e.kind === 'refused' ? 'refuse' : 'fault']: e.code ?? String(e) };
      pass = (c.refuse && observed.refuse === c.refuse) || (c.fault && observed.fault === c.fault) || false;
    }
    results.push({ node: n.name, example: i, pass, expected: c, observed: pass ? undefined : observed });
  }
}
const nodes = appNodes.map(n => ({ name: n.name, examples: n.examples.length, dependencies: n.dependencies }));
const summary = {
  profile: kit.profile.id, runtime: kit.transformer.runtime, app: kit.transformer.app,
  nodes: nodes.length, nodesWithExamples: nodes.filter(n => n.examples).length,
  examples: results.length, passed: results.filter(r => r.pass).length,
  failed: results.filter(r => !r.pass).length,
  scope: 'structural compile under batch profile + inline examples; not certification',
};
fs.writeFileSync(path.join(BATCH_DIR, 'evidence/node-check.json'), JSON.stringify({ summary, nodes, results }, null, 1));
console.log(JSON.stringify(summary));
for (const r of results.filter(r => !r.pass)) console.log('FAIL', r.node, '#' + r.example, JSON.stringify(r.observed));
process.exitCode = summary.failed ? 1 : 0;
