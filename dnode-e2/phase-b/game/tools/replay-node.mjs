// Cross-environment replay: re-run browser-recorded traces in Node through the same verified runtime and compare
// the trace's checkpoint/final SHA-256 hashes. Usage: node tools/replay-node.mjs trace.json [...]
import fs from 'node:fs';
import path from 'node:path';
import {loadGame, canon, sha256, GAME} from './lib.mjs';
import {expand} from '../host/trace.js';

const {runtime, identities} = await loadGame();
const results = [];
for (const f of process.argv.slice(2)) {
  const t = JSON.parse(fs.readFileSync(path.resolve(GAME, f), 'utf8'));
  let s = runtime.run('game.initial', []).out;
  const okInit = sha256(canon(s)) === t.initialHash;
  const cps = new Map(t.checkpoints); let cpOk = 0, cpBad = 0, n = 0;
  for (const i of expand(t.inputs)) { s = runtime.run('game.tick', [s, i]).out; n++; if (cps.has(n)) (sha256(canon(s)) === cps.get(n) ? cpOk++ : cpBad++); }
  const finalOk = sha256(canon(s)) === t.finalHash;
  const idOk = t.identities.runtimeIdentity === identities.runtimeIdentity && JSON.stringify(t.identities.appRoots) === JSON.stringify(identities.appRoots);
  const r = {trace: path.basename(f), ticks: n, identitiesMatch: idOk, initialOk: okInit, checkpointsOk: cpOk, checkpointsBad: cpBad, finalOk,
    result: okInit && finalOk && !cpBad && idOk ? 'IDENTICAL' : 'DIFFERENT', finalPhase: s.phase, score: s.score, lives: s.lives};
  results.push(r); console.log(JSON.stringify(r));
}
fs.writeFileSync(path.join(GAME, 'evidence/replay-node.json'), JSON.stringify(results, null, 1));
