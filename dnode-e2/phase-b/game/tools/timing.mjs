// Measure ms per game.tick in the kit interpreter (R0.5: measure only, no threshold).
// Usage: node tools/timing.mjs [out.json]
import fs from 'node:fs';
import path from 'node:path';
import {loadGame, GAME} from './lib.mjs';

const counts = {};
const {runtime} = await loadGame();
const {runtime: counting} = await loadGame({observe: n => { counts[n] = (counts[n] ?? 0) + 1; }});
const neutral = {left: false, right: false, action: false, pause: 'none', restart: false, pointer: {active: false, x: 0}, touch: {down: false, x: 0}};
const init = runtime.run('game.initial', []).out;
const play = (bx, by, vx, vy) => ({...init, phase: 'play', bx, by, vx, vy});
const scenarios = {
  serve_idle: init,
  play_open_field: play(2400, 4000, 24, -32),       // below the brick zone: no brick candidates scanned
  play_brick_zone: play(3000, 1500, 32, -24),       // inside the brick zone: 30 candidates per microstep
  paused: {...play(2400, 4000, 24, -32), phase: 'paused', resume: 'play'},
};
function measure(rt, s0, n) {
  let s = s0; const times = [];
  for (let k = 0; k < n; k++) {
    const t = performance.now();
    const r = rt.run('game.tick', [s, neutral]).out;
    times.push(performance.now() - t);
    // stay inside the scenario: restart from s0 when the phase or zone changes
    s = (r.phase === s0.phase && Math.abs(r.by - s0.by) < 300) ? r : s0;
  }
  times.sort((a, b) => a - b);
  const q = p => +times[Math.min(times.length - 1, Math.floor(p * times.length))].toFixed(3);
  return {n, mean: +(times.reduce((a, b) => a + b, 0) / n).toFixed(3), p50: q(0.5), p95: q(0.95), max: q(1)};
}
for (const s of Object.values(scenarios)) measure(runtime, s, 200); // warm-up
const results = {};
for (const [k, s] of Object.entries(scenarios)) results[k] = measure(runtime, s, 1000);
for (const k of Object.keys(counts)) delete counts[k];
const callsPerTick = {};
for (const [k, s] of Object.entries(scenarios)) {
  for (const n of Object.keys(counts)) delete counts[n];
  counting.run('game.tick', [s, neutral]);
  callsPerTick[k] = Object.values(counts).reduce((a, b) => a + b, 0);
}
const out = {env: {node: process.version, platform: process.platform, arch: process.arch}, msPerTick: results, nodeCallsPerTick: callsPerTick,
  fiveTickBatchMs_worst_p95: +(5 * Math.max(...Object.values(results).map(r => r.p95))).toFixed(3)};
console.log(JSON.stringify(out, null, 1));
if (process.argv[2]) fs.writeFileSync(path.resolve(GAME, process.argv[2]), JSON.stringify(out, null, 1));
