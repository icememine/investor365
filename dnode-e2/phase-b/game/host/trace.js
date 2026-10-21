// D-G7 trace record / replay. A trace is: identities, canon(initial) hash, the ordered per-tick input records
// actually passed to game.tick (run-length encoded), a canon(state) checkpoint hash every 60 ticks and the final
// canon(state) hash. Replay re-runs game.tick from the initial state in a fresh Runtime and compares hashes.
export const CHECKPOINT_EVERY = 60;

export class TraceRecorder {
  constructor({identities, canon, initialCanon}) {
    this.identities = identities; this.canon = canon; this.initialCanon = initialCanon;
    this.runs = []; this.ticks = 0; this.checkpoints = []; this.lastKey = null; this.lastCanon = initialCanon;
  }
  record(input, stateAfter) {
    const key = JSON.stringify(input);
    if (key === this.lastKey) this.runs[this.runs.length - 1][0]++;
    else { this.runs.push([1, JSON.parse(key)]); this.lastKey = key; }
    this.ticks++;
    if (this.ticks % CHECKPOINT_EVERY === 0) this.checkpoints.push([this.ticks, this.canon(stateAfter)]);
    this.lastStateAfter = stateAfter;
  }
  // Snapshot everything synchronously first: ticks keep running while the hashes are awaited.
  async export(sha) {
    const ticks = this.ticks;
    const finalCanon = ticks ? this.canon(this.lastStateAfter) : this.initialCanon;
    const inputs = this.runs.map(([n, i]) => [n, i]);
    const checkpoints = this.checkpoints.slice();
    const cps = [];
    for (const [t, c] of checkpoints) cps.push([t, await sha(c)]);
    const trace = {format: 'dnode-breakout-trace/1', identities: this.identities, initialHash: await sha(this.initialCanon),
      ticks, inputs, checkpointEvery: CHECKPOINT_EVERY, checkpoints: cps, finalHash: await sha(finalCanon)};
    Object.defineProperty(trace, 'liveCanon', {value: finalCanon, enumerable: false});
    return trace;
  }
}

export function expand(runs) {
  const out = [];
  for (const [n, i] of runs) for (let k = 0; k < n; k++) out.push(i);
  return out;
}

// Replays in chunks so the page stays responsive. Returns IDENTICAL or DIFFERENT with the first divergence.
export async function replay(trace, {runtime, canon, sha, identities, onProgress}) {
  const mism = [];
  for (const k of ['runtimeIdentity', 'preludeRoot', 'appIdentity']) {
    if (trace.identities?.[k] !== identities[k]) mism.push(k);
  }
  if (mism.length) return {result: 'DIFFERENT', reason: 'identity mismatch: ' + mism.join(', ')};
  let state = runtime.run('game.initial', []).out;
  if (await sha(canon(state)) !== trace.initialHash) return {result: 'DIFFERENT', reason: 'initial state hash differs'};
  const inputs = expand(trace.inputs);
  const cps = new Map(trace.checkpoints);
  const t0 = performance.now();
  for (let t = 0; t < inputs.length; t++) {
    try { state = runtime.run('game.tick', [state, inputs[t]]).out; }
    catch (e) { return {result: 'DIFFERENT', reason: `tick ${t + 1} failed: ${e.code ?? e.message}`}; }
    const n = t + 1;
    if (cps.has(n)) {
      const h = await sha(canon(state));
      if (h !== cps.get(n)) return {result: 'DIFFERENT', reason: `checkpoint at tick ${n} differs`, expected: cps.get(n), got: h};
    }
    if (n % 600 === 0) { onProgress?.(n, inputs.length); await new Promise(r => setTimeout(r, 0)); }
  }
  const finalHash = await sha(canon(state));
  const ok = finalHash === trace.finalHash && inputs.length === trace.ticks;
  return {result: ok ? 'IDENTICAL' : 'DIFFERENT', reason: ok ? '' : 'final state hash differs', ticks: inputs.length,
    checkpoints: cps.size, finalHash, expectedFinalHash: trace.finalHash, ms: Math.round(performance.now() - t0), state};
}
