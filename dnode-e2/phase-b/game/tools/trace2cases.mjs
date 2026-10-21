// Convert browser-recorded traces (evidence/traces/*.json) into oracle case format (initial = game.initial,
// expanded per-tick inputs), so the Python oracle and the Node DNode runtime can both re-run real sessions.
// Usage: node tools/trace2cases.mjs out-cases.json trace1.json [trace2.json ...]
import fs from 'node:fs';
import path from 'node:path';
import {loadGame, GAME} from './lib.mjs';
import {expand} from '../host/trace.js';

const [out, ...files] = process.argv.slice(2);
const {runtime} = await loadGame();
const initial = runtime.run('game.initial', []).out;
const cases = files.map(f => {
  const t = JSON.parse(fs.readFileSync(path.resolve(GAME, f), 'utf8'));
  return {name: path.basename(f, '.json'), category: 'browser-trace', note: `recorded in browser, ${t.ticks} ticks`, initial, inputs: expand(t.inputs)};
});
fs.writeFileSync(path.resolve(GAME, out), JSON.stringify(cases));
console.log('wrote', cases.length, 'cases', cases.map(c => c.name + ':' + c.inputs.length).join(' '));
