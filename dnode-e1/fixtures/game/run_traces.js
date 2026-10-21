// run_traces.js — plays each independently written trace through the certified graph and compares with policy.py's expectations.
const fs = require('fs'); const path = require('path'); const E = require('../../engine.js');
const graph = JSON.parse(fs.readFileSync(path.join(__dirname, '../../graph.breakout.json'), 'utf8')); const certs = JSON.parse(fs.readFileSync(path.join(__dirname, '../../certs.breakout.json'), 'utf8'));
const view = E.resolve(graph, 'breakout'); view.profile = JSON.parse(fs.readFileSync(path.join(__dirname, '../../profiles/canvas.json'), 'utf8'));
const certified = new Set(Object.keys(certs.certified)); const traces = JSON.parse(fs.readFileSync(path.join(__dirname, 'traces.json'), 'utf8'));
let agree = 0, disagree = 0; const report = {};
for (const [name, t] of Object.entries(traces)) {
  const ctx = () => ({ view, effects: [], certified, profile: view.profile });
  let s = t.start || E.callNode('initial', [], ctx()); let refused = 0;
  for (const e of t.events) { try { s = E.callNode('frame', [s, e], ctx()); } catch (err) { if (err instanceof E.Refusal) refused++; else throw err; } }
  const got = { phase: s.phase, score: s.score, lives: s.lives, ticks: s.ticks, ball: s.ball, paddle: s.paddle, intact: s.bricks.filter(c => c.alive).length, refused };
  const same = E.canon(got) === E.canon(t.expected); if (same) agree++; else disagree++;
  report[name] = { same, got, expected: t.expected };
  console.log((same ? 'agree    ' : 'DISAGREE ') + name + ' → ' + JSON.stringify(got));
}
fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify({ at: new Date().toISOString(), checker: certs.checker, agree, disagree, report }, null, 1));
console.log(`game traces: ${agree} agree, ${disagree} disagree`);
process.exit(disagree ? 1 : 0);
