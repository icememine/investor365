// Runs every inline `ex` case of the shop roots through the verified runtime.
// Writes evidence/examples.json. Exit 1 on any mismatch.
import fs from 'node:fs';
import path from 'node:path';
import {load, outcome, engine, SHOP} from './load.mjs';

const {graph, runtime} = await load();
const results = [];
for (const [name, node] of Object.entries(graph.nodes)) {
  if (!node.root.startsWith('shop.')) continue;
  for (const ex of node.examples) {
    const got = outcome(runtime, name, ex.args);
    let pass;
    if ('out' in ex) pass = 'out' in got && engine.canon(got.out) === engine.canon(ex.out);
    else if ('refuse' in ex) pass = got.refuse === ex.refuse;
    else if ('fault' in ex) pass = got.fault !== undefined && got.fault.split(':')[0] === ex.fault;
    else pass = false;
    results.push({node: name, root: node.root, expected: ex.out !== undefined ? 'out' : ex.refuse ? 'refuse:' + ex.refuse : 'fault:' + ex.fault, got: got.out !== undefined ? 'out' : got.refuse ? 'refuse:' + got.refuse : 'fault:' + got.fault, pass});
  }
}
const failed = results.filter(r => !r.pass);
const nodes = Object.values(graph.nodes).filter(n => n.root.startsWith('shop.'));
const summary = {kind: 'inline-ex-cases', note: 'Author-written inline cases; structural + example evidence, not certification.', nodes: nodes.length, nodesWithExamples: new Set(results.map(r => r.node)).size, cases: results.length, passed: results.length - failed.length, failed: failed.length, results};
fs.writeFileSync(path.join(SHOP, 'evidence/examples.json'), JSON.stringify(summary, null, 1));
console.log(`shop roots: ${nodes.length} nodes; ${results.length} inline cases; ${summary.passed} passed; ${failed.length} failed`);
for (const f of failed) console.log('FAIL', f.node, 'expected', f.expected, 'got', f.got);
process.exitCode = failed.length ? 1 : 0;
