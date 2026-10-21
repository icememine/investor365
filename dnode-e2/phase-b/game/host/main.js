// Breakout host (BP-GAME, Phase B). Owns: admission, fixed-tick scheduling (D-G3.1), event capture, rendering,
// optional audio, trace record/replay and the test desk. DNode (game.tick) owns every game decision; the host
// replaces its state ONLY with game.tick's return value and never repairs it (D-G2, D-G7).
import {bootKit} from './kit.js';
import {Scheduler} from './scheduler.js';
import {InputBridge} from './input.js';
import {Renderer, Feedback, deepFreeze} from './render.js';
import {Audio} from './audio.js';
import {TraceRecorder, replay} from './trace.js';
import {buildDesk} from './desk.js';

const $ = s => document.querySelector(s);
const params = new URLSearchParams(location.search);
const coarse = matchMedia('(pointer: coarse)').matches;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let kit;
try {
  kit = await bootKit();
} catch (e) {
  const b = $('#boot');
  b.classList.add('failed');
  b.textContent = 'Refusing to run: the DNode kit or app roots failed admission. ' + (e.message || e);
  window.__bk = {ready: false, admission: 'failed', error: String(e.message || e)};
  throw e;
}
const {engine, admission} = kit;
const canon = engine.canon;
const sha = admission.sha;
const runtime = kit.makeRuntime();
const layout = runtime.run('geo.layout', []).out;
const INITIAL = runtime.run('game.initial', []).out;
const initialCanon = canon(INITIAL);

// ---------------------------------------------------------------- clock (desk can inject a jump)
const clock = {offset: 0, now() { return performance.now() + this.offset; }};

// ---------------------------------------------------------------- DOM / layout
$('#boot').hidden = true;
$('#app').hidden = false;
const deskOn = params.get('desk') === '1';
const canvas = $('#field');
const renderer = new Renderer(canvas, layout);
const feedback = new Feedback(reducedMotion);
const audio = new Audio();
let scale = 1; // CSS px per logical unit

function doLayout() {
  const vw = innerWidth, vh = innerHeight;
  const deskSide = deskOn && vw >= 1000;
  const desk = $('#desk');
  if (deskOn) { desk.hidden = false; desk.classList.toggle('narrow', !deskSide); }
  const availW = vw - 32 - (deskSide ? 370 : 0);
  const availH = vh - 56 - 12 - (deskOn && !deskSide ? Math.round(vh * 0.46) : 0);
  const fw = Math.max(120, Math.floor(Math.min(availW, availH * layout.field_w / layout.field_h)));
  const fh = Math.round(fw * layout.field_h / layout.field_w);
  renderer.resize(fw, fh);
  scale = fw / layout.field_w;
  $('#app').style.width = (deskSide ? vw - 370 : vw) + 'px';
  const leftover = availH - fh;
  $('#strip').classList.toggle('on', leftover >= 90);
  $('#track').style.width = fw + 'px';
  $('#hud').style.width = fw + 'px';
}
addEventListener('resize', doLayout);
doLayout();

const input = new InputBridge({
  surface: $('#surface'),
  toLogicalX: clientX => Math.floor((clientX - canvas.getBoundingClientRect().left) / scale),
  now: () => clock.now(),
  getPhase: () => state.phase,
});

// ---------------------------------------------------------------- authoritative state + trace
let state = INITIAL;
let halted = null;
let recorder = new TraceRecorder({identities: kit.identities, canon, initialCanon});
const sched = new Scheduler(clock.now(), kit.profile.host.tickHz, kit.profile.host.maxCatchUpTicks);
const stats = {tickMs: [], frames: [], ticksTotal: 0, catchUpFrames: 0, discardedTotal: 0, renderFaults: 0, audioFaults: 0, maxTicksInFrame: 0};
let pendingDelayMs = 0;

function notice(msg) {
  const n = $('#notice'); n.textContent = msg; n.classList.add('on');
  clearTimeout(notice.t); notice.t = setTimeout(() => n.classList.remove('on'), 2500);
}

function halt(e, input) {
  halted = {code: e.code ?? 'Error', kind: e.kind ?? 'fault', message: String(e.message), input};
  renderOverlay(true);
}

function runTicks(inputs) {
  const events = [];
  for (let k = 0; k < inputs.length && !halted; k++) {
    const i = inputs[k];
    const prev = state;
    const t0 = performance.now();
    let out;
    try { out = runtime.run('game.tick', [state, i]).out; }
    catch (e) { halt(e, i); break; }
    const dt = performance.now() - t0;
    stats.tickMs.push(dt); if (stats.tickMs.length > 1200) stats.tickMs.shift();
    stats.ticksTotal++;
    recorder.record(i, out);
    state = out;                                  // the only assignment of authoritative state
    for (const e of out.events) events.push(e);
    if ((i.restart || i.action) && canon(prev) !== initialCanon && canon(out) === initialCanon) {
      input.clearSession(); feedback.reset();
      // input queued from the previous session must not reach the new one: neutral levels for the rest of the batch
      for (let r = k + 1; r < inputs.length; r++) inputs[r] = {...inputs[r], left: false, right: false, pointer: {active: false, x: 0}, touch: {down: false, x: 0}};
    }
  }
  return events;
}

function frame() {
  if (pendingDelayMs > 0) { const until = performance.now() + pendingDelayMs; pendingDelayMs = 0; while (performance.now() < until) { /* injected long frame */ } }
  const now = clock.now();
  const {ticks, discarded} = sched.frame(now);
  const s0 = performance.now();
  const events = runTicks(input.sample(halted ? 0 : ticks));
  const simMs = performance.now() - s0;
  if (ticks === kit.profile.host.maxCatchUpTicks) stats.catchUpFrames++;
  stats.discardedTotal += discarded; stats.maxTicksInFrame = Math.max(stats.maxTicksInFrame, ticks);
  stats.frames.push({t: Math.round(now), ticks, discarded, simMs: +simMs.toFixed(2)}); if (stats.frames.length > 600) stats.frames.shift();
  const view = deepFreeze(structuredClone(state));
  try { feedback.ingest(events, now); renderer.draw(view, feedback, now); }
  catch (e) { stats.renderFaults++; notice('Display error (game state unaffected): ' + e.message); }
  try { audio.play(events); }
  catch (e) { stats.audioFaults++; notice('Sound error (game state unaffected): ' + e.message); }
  if (events.includes('life')) { const l = $('#lives'); l.classList.remove('pulse'); void l.offsetWidth; l.classList.add('pulse'); }
  renderHud(view);
  renderOverlay();
  desk?.tick();
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- HUD and overlays (read-only views of state)
let hudKey = '';
function renderHud(v) {
  const key = v.score + '|' + v.lives + '|' + v.phase + '|' + v.pc;
  if (key === hudKey) return; hudKey = key;
  $('#score').textContent = `Bricks ${v.score}/30`;
  const lives = $('#lives');
  lives.setAttribute('aria-label', 'Lives ' + v.lives);
  lives.querySelector('.dots').innerHTML = [0, 1, 2].map(k => `<i class="${k < v.lives ? '' : 'gone'}"></i>`).join('');
  lives.querySelector('.num').textContent = v.lives;
  const p = $('#pause'); const paused = v.phase === 'paused';
  p.classList.toggle('paused', paused); p.setAttribute('aria-label', paused ? 'Resume' : 'Pause');
  p.disabled = v.phase === 'won' || v.phase === 'lost';
  $('#marker').style.left = (v.pc / layout.field_w * 100) + '%';
}
let overlayKey = '';
function renderOverlay(force) {
  const o = $('#overlay');
  const fresh = state.score === 0 && state.lives === 3;
  const key = halted ? 'error' : state.phase + (state.phase === 'serve' ? (fresh ? 'fresh' : 'again' + state.lives) : '');
  if (key === overlayKey && !force) return; overlayKey = key;
  o.className = '';
  const moveHint = coarse ? 'Drag anywhere to move · Tap to launch' : '← → or mouse to move · Space or click to launch';
  if (halted) {
    o.innerHTML = `<div class="card"><h2>Game error</h2><p>The game stopped on its last good state (${halted.kind} ${halted.code}).</p>
      <div class="row"><button id="dlerr">Download trace</button></div></div>`;
    $('#dlerr').onclick = downloadTrace;
  } else if (state.phase === 'serve') {
    o.className = 'serve';
    o.innerHTML = fresh
      ? `<div class="card"><h1>BREAKOUT</h1><p>Clear all 30 bricks. You have 3 lives.</p><p class="hint">${moveHint}</p><p class="keys">P or Esc pauses</p></div>`
      : `<div class="card"><h2>Ball lost</h2><p>${state.lives} ${state.lives === 1 ? 'life' : 'lives'} left</p><p class="hint">${coarse ? 'Tap to launch' : 'Space or click to launch'}</p></div>`;
  } else if (state.phase === 'paused') {
    o.innerHTML = `<div class="card"><h2>Paused</h2><div class="row"><button id="resume">Resume</button><button id="restart">Restart</button></div></div>`;
    $('#resume').onclick = () => input.requestPause('toggle');
    $('#restart').onclick = () => input.requestRestart();
  } else if (state.phase === 'won') {
    o.innerHTML = `<div class="card"><h2>You cleared all 30 bricks!</h2><div class="row"><button id="again">Play again</button></div></div>`;
    $('#again').onclick = () => input.requestRestart();
  } else if (state.phase === 'lost') {
    o.innerHTML = `<div class="card"><h2>Out of lives</h2><p>Bricks cleared: ${state.score}/30</p><div class="row"><button id="again">Play again</button></div></div>`;
    $('#again').onclick = () => input.requestRestart();
  } else {
    o.innerHTML = '';
  }
}

$('#pause').onclick = () => input.requestPause('toggle');
const muteBtn = $('#mute');
const syncMute = () => { muteBtn.classList.toggle('muted', audio.muted); muteBtn.setAttribute('aria-label', audio.muted ? 'Sound off' : 'Sound on'); };
muteBtn.onclick = () => { audio.setMuted(!audio.muted); syncMute(); };
syncMute();
const unlock = () => { try { audio.unlock(); } catch (e) { stats.audioFaults++; } };
addEventListener('pointerdown', unlock, {once: true});
addEventListener('keydown', unlock, {once: true});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (state.phase === 'serve' || state.phase === 'play') input.requestPause('force'); }
  else sched.reset(clock.now());
});

// ---------------------------------------------------------------- trace export / replay
async function exportTrace() { return recorder.export(sha); }
async function downloadTrace() {
  const t = await exportTrace();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(t)], {type: 'application/json'}));
  a.download = `breakout-trace-${t.ticks}-ticks.json`; a.click();
}
async function replayTrace(trace, onProgress) {
  const res = await replay(trace, {runtime: kit.makeRuntime(), canon, sha, identities: kit.identities, onProgress});
  // For a trace exported from this session, also compare the replayed state with the live state at export time.
  const liveMatches = res.state && trace.liveCanon ? canon(res.state) === trace.liveCanon : null;
  delete res.state;
  return {...res, liveStateMatchesReplay: liveMatches};
}
// Render-fault probe: hash the state, call the renderer with the injected fault, hash again.
async function renderFaultProbe() {
  const before = await sha(canon(state));
  const was = renderer.fault; renderer.fault = true;
  let threw = null;
  try { renderer.draw(deepFreeze(structuredClone(state)), feedback, clock.now()); } catch (e) { threw = e.message; }
  renderer.fault = was;
  const after = await sha(canon(state));
  return {before, after, unchanged: before === after, rendererThrew: threw};
}

const api = {
  injectLongFrame(ms) { pendingDelayMs = ms; },
  jumpClock(ms) { clock.offset += ms; },
  setRenderFault(on) { renderer.fault = !!on; },
  setAudioFault(on) { audio.fault = !!on; },
  exportTrace, downloadTrace, replayTrace, renderFaultProbe,
  recorderTicks: () => recorder.ticks,
};
const desk = deskOn ? buildDesk($('#desk'), {api, stats, identities: kit.identities, getState: () => state, sha, canon}) : null;

// Read-only hooks for automated drives (no setter for game state exists).
window.__bk = {
  ready: true, admission: 'verified', identities: kit.identities, layout, coarse,
  state: () => structuredClone(state), stateCanon: () => canon(state), initialCanon, halted: () => halted,
  stats: () => ({...stats, tickMs: [...stats.tickMs], frames: [...stats.frames]}),
  scale: () => scale, fieldRect: () => canvas.getBoundingClientRect(), ...api,
};
requestAnimationFrame(frame);
