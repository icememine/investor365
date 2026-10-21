// Automated drives (R0.5): headless Chromium from /opt/pw-browsers via require('playwright') (NODE_PATH).
// Viewports 1280x800 (mouse/keyboard) and 390x844 (hasTouch, isMobile). Results: evidence/drive-results.json,
// screenshots: evidence/shots/, browser-recorded traces: evidence/traces/. Machine checks only: G01/G06 human
// acceptance stays pending whatever these report.
// Usage: node drives/drive.cjs [baseUrl]   (server: node serve.mjs)
const {chromium} = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.argv[2] || 'http://127.0.0.1:8102/';
const OUT = path.resolve(__dirname, '../evidence');
fs.mkdirSync(path.join(OUT, 'shots'), {recursive: true});
fs.mkdirSync(path.join(OUT, 'traces'), {recursive: true});
const results = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));
function rec(id, obligation, viewport, pass, observed, note = '') {
  results.push({id, obligation, viewport, result: pass ? 'PASS' : 'FAIL', observed, note});
  console.log((pass ? 'PASS ' : 'FAIL ') + id + ' ' + JSON.stringify(observed).slice(0, 300));
}
async function attempt(id, obligation, viewport, fn) {
  try { await fn(); } catch (e) { rec(id, obligation, viewport, false, {error: String(e.stack || e).slice(0, 600)}); }
}
const st = p => p.evaluate(() => __bk.state());
const S = (p, fn, arg) => p.evaluate(fn, arg);
async function ready(p, url) {
  await p.goto(url);
  await p.waitForFunction(() => window.__bk && 'ready' in window.__bk, null, {timeout: 30000});
  await sleep(300);
}
async function waitFor(p, pred, arg, timeout = 5000) { await p.waitForFunction(pred, arg, {timeout}); }
const scrollInfo = p => S(p, () => ({scrollX, scrollY, docH: document.documentElement.scrollHeight, docW: document.documentElement.scrollWidth,
  innerH: innerHeight, innerW: innerWidth, vvScale: visualViewport ? visualViewport.scale : 1}));
const noScroll = s => s.scrollX === 0 && s.scrollY === 0 && s.docH <= s.innerH && s.docW <= s.innerW && s.vvScale === 1;
const gp = s => ({pc: s.pc, bx: s.bx, by: s.by, vx: s.vx, vy: s.vy, bricks: s.bricks, score: s.score, lives: s.lives, resume: s.resume});
async function saveTrace(p, name) {
  const t = await S(p, () => __bk.exportTrace());
  fs.writeFileSync(path.join(OUT, 'traces', name + '.json'), JSON.stringify(t));
  return t;
}
async function fieldPoint(p, lx, ly) { // logical -> CSS viewport point
  return S(p, ([lx, ly]) => { const r = __bk.fieldRect(), k = __bk.scale(); return {x: r.left + lx * k, y: r.top + ly * k}; }, [lx, ly]);
}

// ---------------------------------------------------------------------------------------------- desktop
async function desktop(browser) {
  const VP = '1280x800';
  const ctx = await browser.newContext({viewport: {width: 1280, height: 800}});
  const p = await ctx.newPage();
  const errors = []; p.on('pageerror', e => errors.push(e.message));

  await attempt('D-G01-observable', 'G01', VP, async () => {
    await ready(p, BASE);
    await p.screenshot({path: path.join(OUT, 'shots/desktop-1280-title.png')});
    const o = await S(p, () => {
      const pb = document.querySelector('#pause').getBoundingClientRect(), f = __bk.fieldRect();
      return {overlay: document.querySelector('#overlay').innerText, pause: [pb.width, pb.height],
        fieldInView: f.left >= 0 && f.top >= 0 && f.right <= innerWidth && f.bottom <= innerHeight, field: [Math.round(f.width), Math.round(f.height)],
        hud: document.querySelector('#score').innerText + ' / lives ' + document.querySelector('#lives .num').innerText, phase: __bk.state().phase};
    });
    const pass = /BREAKOUT/.test(o.overlay) && /mouse to move/.test(o.overlay) && /Space or click to launch/.test(o.overlay) &&
      o.pause[0] >= 48 && o.pause[1] >= 48 && o.fieldInView && o.phase === 'serve';
    rec('D-G01-observable', 'G01', VP, pass, o, 'Visible controls/instructions only. First-time-player comprehension is a human check (pending).');
  });

  await attempt('D-G02-keyboard-full-range', 'G02', VP, async () => {
    await p.mouse.move(5, 5);
    await p.keyboard.down('ArrowLeft'); await sleep(900);
    const left = (await st(p)).pc; const sL = await scrollInfo(p);
    await p.keyboard.up('ArrowLeft');
    await p.keyboard.down('ArrowRight'); await sleep(1300);
    const right = (await st(p)).pc; const sR = await scrollInfo(p);
    await p.keyboard.up('ArrowRight');
    await p.keyboard.press('Space'); await sleep(200);           // launches; must not scroll
    const sS = await scrollInfo(p); const ph = (await st(p)).phase;
    await p.keyboard.press('KeyP'); await sleep(100);
    rec('D-G02-keyboard-full-range', 'G02', VP, left === 500 && right === 4300 && noScroll(sL) && noScroll(sR) && noScroll(sS) && ph === 'play',
      {pcAfterHoldLeft: left, pcAfterHoldRight: right, phaseAfterSpace: ph, scroll: [sL, sR, sS]});
    await p.keyboard.press('KeyP'); await sleep(50);
  });

  await attempt('D-G02-mouse-full-range', 'G02', VP, async () => {
    await p.keyboard.press('KeyP'); await waitFor(p, () => __bk.state().phase === 'paused');
    await p.click('#restart'); await waitFor(p, () => __bk.stateCanon() === __bk.initialCanon);
    const a = await fieldPoint(p, 0, 6000), b = await fieldPoint(p, 4800, 6000);
    await p.mouse.move(a.x + 2, a.y); await sleep(700); const left = (await st(p)).pc;
    await p.mouse.move(b.x - 2, b.y, {steps: 5}); await sleep(900); const right = (await st(p)).pc;
    await p.mouse.wheel(0, 600); await sleep(100); const s = await scrollInfo(p);
    rec('D-G02-mouse-full-range', 'G02', VP, left === 500 && right === 4300 && noScroll(s), {pcAtLeftEdge: left, pcAtRightEdge: right, scrollAfterWheel: s});
  });

  // G03 play-through: an external driver steers the mouse toward the ball (it only reads state and moves the mouse).
  await attempt('D-G03-playthrough', 'G03', VP, async () => {
    const seen = {phases: new Set(), scores: [], lives: [], launches: 0};
    const t0 = Date.now(); let offset = 0, lastScore = 0, s = await st(p);
    while (Date.now() - t0 < 170000) {
      s = await st(p); seen.phases.add(s.phase);
      if (s.phase === 'won' || s.phase === 'lost') break;
      if (s.phase === 'serve') { await p.keyboard.press('Space'); seen.launches++; await sleep(60); continue; }
      if (s.score !== lastScore) { lastScore = s.score; seen.scores.push(s.score); offset = [-420, -220, -60, 60, 220, 420][s.score % 6]; }
      const target = Math.max(0, Math.min(4800, s.bx - (s.vy > 0 && s.by > 3500 ? offset : 0)));
      const pt = await fieldPoint(p, target, 6000);
      await p.mouse.move(pt.x, pt.y);
      if (s.score === 12 && !seen.midShot) { seen.midShot = true; await p.screenshot({path: path.join(OUT, 'shots/desktop-1280-play.png')}); }
      await sleep(15);
    }
    s = await st(p);
    await p.screenshot({path: path.join(OUT, `shots/desktop-1280-end-${s.phase}.png`)});
    const t = await saveTrace(p, 'desktop-playthrough');
    const pass = (s.phase === 'won' && s.score === 30) || (s.phase === 'lost' && s.lives === 0);
    rec('D-G03-playthrough', 'G03', VP, pass, {endPhase: s.phase, score: s.score, lives: s.lives, phasesSeen: [...seen.phases], launches: seen.launches,
      scoreSteps: seen.scores.length, traceTicks: t.ticks, wallSeconds: Math.round((Date.now() - t0) / 1000)},
      'End state must satisfy the declared transitions; every tick is re-checked against the oracle offline (oracle-compare-browser.json).');
  });

  await attempt('D-G03-lose-three-lives', 'G03', VP, async () => {
    // From won/lost: Play again -> exact initial; then launch and keep the mouse away from the ball 3 times.
    await p.click('#again'); await waitFor(p, () => __bk.stateCanon() === __bk.initialCanon);
    const livesSeen = []; const t0 = Date.now();
    while (Date.now() - t0 < 60000) {
      const s = await st(p);
      if (s.phase === 'lost') break;
      if (s.phase === 'serve') { if (!livesSeen.length || livesSeen[livesSeen.length - 1] !== s.lives) livesSeen.push(s.lives);
        if (s.lives === 2 && !livesSeen.shot) { livesSeen.shot = true; await p.screenshot({path: path.join(OUT, 'shots/desktop-1280-ball-lost.png')}); }
        await p.keyboard.press('Space'); await sleep(80); continue; }
      const away = await fieldPoint(p, s.bx < 2400 ? 4800 : 0, 6000); await p.mouse.move(away.x, away.y); await sleep(30);
    }
    const s = await st(p); livesSeen.push(s.lives);
    await p.screenshot({path: path.join(OUT, 'shots/desktop-1280-lost.png')});
    rec('D-G03-lose-three-lives', 'G03', VP, s.phase === 'lost' && s.lives === 0 && JSON.stringify(livesSeen) === '[3,2,1,0]',
      {livesSequence: livesSeen, endPhase: s.phase, overlay: await S(p, () => document.querySelector('#overlay').innerText)});
  });

  await attempt('D-G04-restart-exact-initial-and-input-cleared', 'G04', VP, async () => {
    await p.keyboard.down('ArrowRight');                 // held across the restart
    await p.click('#again'); await sleep(500);
    const afterRestart = await S(p, () => ({exact: __bk.stateCanon() === __bk.initialCanon, pc: __bk.state().pc}));
    await p.keyboard.up('ArrowRight'); await p.keyboard.down('ArrowRight'); await sleep(300);
    const pcAfterRepress = (await st(p)).pc; await p.keyboard.up('ArrowRight');
    rec('D-G04-restart-exact-initial-and-input-cleared', 'G04', VP, afterRestart.exact && afterRestart.pc === 2400 && pcAfterRepress > 2400,
      {restartExactInitial: afterRestart.exact, pcWhileKeyStillHeld: afterRestart.pc, pcAfterRepress});
  });

  await attempt('D-G04-pause-30s-injected-and-real', 'G04', VP, async () => {
    await p.keyboard.press('Space'); await sleep(700);
    await p.keyboard.press('KeyP'); await waitFor(p, () => __bk.state().phase === 'paused');
    const g0 = gp(await st(p)); const t0 = await S(p, () => __bk.stats().ticksTotal);
    await S(p, () => __bk.jumpClock(30000)); await sleep(400);
    const fr = await S(p, () => __bk.stats().frames.slice(-40));
    const jumpFrame = fr.find(f => f.discarded > 1000) || null;
    const g1 = gp(await st(p));
    await sleep(30000);                                    // and a real 30 s wall-clock pause
    const g2 = gp(await st(p)); const s2 = await st(p);
    const tPaused = await S(p, () => __bk.stats().ticksTotal);
    await p.screenshot({path: path.join(OUT, 'shots/desktop-1280-paused.png')});
    await p.keyboard.press('KeyP');
    await waitFor(p, () => __bk.state().phase === 'play');
    const tRes = await S(p, () => __bk.stats().ticksTotal); const r0 = await st(p);
    await sleep(250);
    const r1 = await st(p); const tAfter = await S(p, () => __bk.stats().ticksTotal);
    const framesAfter = (await S(p, () => __bk.stats().frames.slice(-12))).map(f => f.ticks);
    const same = JSON.stringify(g0) === JSON.stringify(g1) && JSON.stringify(g1) === JSON.stringify(g2);
    const moved = Math.abs(r1.by - g0.by) + Math.abs(r1.bx - g0.bx);
    const ticksSinceResume = tAfter - tRes + 1;
    const pass = same && s2.phase === 'paused' && !!jumpFrame && jumpFrame.ticks === 5 && moved <= ticksSinceResume * 72 && Math.max(...framesAfter) <= 2;
    rec('D-G04-pause-30s-injected-and-real', 'G04', VP, pass, {gameplayUnchangedAcrossPause: same, pausedTicksRun: tPaused - t0, injectedJumpFrame: jumpFrame,
      resumePhase: r0.phase, ballMovedAfterResume: moved, ticksSinceResume, ticksPerFrameAfterResume: framesAfter});
  });

  await attempt('D-G04-long-frame-delay', 'G04', VP, async () => {
    const s0 = await st(p); const t0 = await S(p, () => __bk.stats().ticksTotal);
    if (s0.phase !== 'play') throw new Error('expected play, got ' + s0.phase);
    await S(p, () => __bk.injectLongFrame(600)); await sleep(900);
    const fr = await S(p, () => __bk.stats().frames.slice(-90));
    const big = fr.find(f => f.discarded > 0);
    const t1 = await S(p, () => __bk.stats().ticksTotal);
    const maxTicks = await S(p, () => __bk.stats().maxTicksInFrame);
    rec('D-G04-long-frame-delay', 'G04', VP, !!big && big.ticks <= 5 && maxTicks <= 5, {frameAfterDelay: big, maxTicksInAnyFrame: maxTicks,
      ticksRunOver1500msWindow: t1 - t0, wallClockTicksWouldBe: Math.round(1.5 * 60)});
  });

  await attempt('D-G05-render-audio-fault-and-replay', 'G05', VP, async () => {
    const probe = await S(p, () => __bk.renderFaultProbe());
    await S(p, () => { __bk.setRenderFault(true); __bk.setAudioFault(true); });
    const t0 = await S(p, () => __bk.stats().ticksTotal);
    await sleep(1500);
    await p.screenshot({path: path.join(OUT, 'shots/desktop-1280-render-fault-notice.png')});
    await S(p, () => { __bk.setRenderFault(false); __bk.setAudioFault(false); });
    const st1 = await S(p, () => { const s = __bk.stats(); return {ticks: s.ticksTotal, renderFaults: s.renderFaults, audioFaults: s.audioFaults, halted: __bk.halted()}; });
    // keep playing a bit, then record -> replay from initial
    await p.keyboard.down('ArrowLeft'); await sleep(400); await p.keyboard.up('ArrowLeft');
    const replay = await S(p, async () => __bk.replayTrace(await __bk.exportTrace()));
    const trace = await saveTrace(p, 'desktop-session-with-faults');
    rec('D-G05-render-audio-fault-and-replay', 'G05', VP, probe.unchanged && st1.renderFaults > 0 && st1.audioFaults > 0 && !st1.halted &&
      st1.ticks > t0 && replay.result === 'IDENTICAL' && replay.liveStateMatchesReplay === true,
      {renderFaultProbe: probe, ticksDuringFaults: st1.ticks - t0, renderFaults: st1.renderFaults, audioFaults: st1.audioFaults, replay, traceTicks: trace.ticks});
  });
  rec('D-pageerrors', 'G05', VP, errors.length === 0, {pageErrors: errors});
  const timing = await S(p, () => { const t = [...__bk.stats().tickMs].sort((a, b) => a - b); const fr = __bk.stats().frames;
    return {n: t.length, mean: +(t.reduce((a, b) => a + b, 0) / t.length).toFixed(3), p50: t[Math.floor(t.length * .5)], p95: t[Math.floor(t.length * .95)], max: t[t.length - 1],
      maxFrameSimMs: Math.max(...fr.map(f => f.simMs)), framesWith5Ticks: fr.filter(f => f.ticks === 5).map(f => f.simMs)}; });
  await ctx.close();
  return timing;
}

// ---------------------------------------------------------------------------------------------- phone
async function touch(client, type, pts) { await client.send('Input.dispatchTouchEvent', {type, touchPoints: pts.map(([x, y], i) => ({x, y, id: i}))}); }
async function phone(browser) {
  const VP = '390x844 touch';
  const ctx = await browser.newContext({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true, deviceScaleFactor: 3});
  const p = await ctx.newPage();
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  const client = await ctx.newCDPSession(p);

  await attempt('P-G01-observable', 'G01', VP, async () => {
    await ready(p, BASE);
    await p.screenshot({path: path.join(OUT, 'shots/phone-390-title.png')});
    const o = await S(p, () => {
      const pb = document.querySelector('#pause').getBoundingClientRect(), f = __bk.fieldRect(), sp = document.querySelector('#strip').getBoundingClientRect();
      return {coarse: __bk.coarse, overlay: document.querySelector('#overlay').innerText, strip: document.querySelector('#striphint').innerText,
        stripHeight: Math.round(sp.height), pause: [pb.width, pb.height], field: [Math.round(f.width), Math.round(f.height)],
        fieldInView: f.left >= 0 && f.right <= innerWidth && f.bottom <= innerHeight};
    });
    rec('P-G01-observable', 'G01', VP, o.coarse && /Drag anywhere to move · Tap to launch/.test(o.overlay) && o.stripHeight >= 200 && o.pause[0] >= 48 && o.fieldInView, o,
      'Visible controls only; comprehension without coaching is a human check (pending).');
  });

  let stripY, cx;
  await attempt('P-G02-touch-drag-full-range', 'G02', VP, async () => {
    const sp = await S(p, () => { const r = document.querySelector('#strip').getBoundingClientRect(); return {y: r.top + r.height / 2, cx: innerWidth / 2}; });
    stripY = sp.y; cx = sp.cx;
    const pc0 = (await st(p)).pc;
    await touch(client, 'touchStart', [[cx, stripY]]); await sleep(150);
    const pcAfterDown = (await st(p)).pc;
    let minPc = 99999, maxPc = -1, x = cx;
    for (let k = 0; k < 40; k++) { x -= 4; await touch(client, 'touchMove', [[x, stripY]]); await sleep(20); }
    await sleep(100); minPc = (await st(p)).pc; const sMid = await scrollInfo(p);
    for (let k = 0; k < 80; k++) { x += 4; await touch(client, 'touchMove', [[x, stripY]]); await sleep(20); }
    await sleep(100); maxPc = (await st(p)).pc;
    // turn back from the wall: clamp-rebase means an immediate response, no dead zone
    await touch(client, 'touchMove', [[x - 10, stripY]]); await sleep(120); const pcBack = (await st(p)).pc;
    await touch(client, 'touchEnd', []); await sleep(100);
    const s = await scrollInfo(p); const ph = (await st(p)).phase;
    rec('P-G02-touch-drag-full-range', 'G02', VP, pcAfterDown === pc0 && minPc === 500 && maxPc === 4300 && pcBack < 4300 && noScroll(s) && noScroll(sMid) && ph === 'serve',
      {pcBefore: pc0, pcAfterTouchdown: pcAfterDown, pcMin: minPc, pcMax: maxPc, pcAfterTurningBack10px: pcBack, phaseAfterDragLift: ph, scroll: s,
        thumbTravelCssPxForFullRange: Math.round(3800 * (await S(p, () => __bk.scale())) / 1.5)});
  });

  await attempt('P-G02-drag-on-field-and-tap-launch', 'G02', VP, async () => {
    const f = await fieldPoint(p, 2400, 4000);
    await touch(client, 'touchStart', [[f.x, f.y]]); await sleep(80);
    const a = (await st(p)).pc;
    for (let k = 0; k < 10; k++) { await touch(client, 'touchMove', [[f.x + 3 * (k + 1), f.y]]); await sleep(20); }
    await touch(client, 'touchEnd', []); await sleep(120);
    const b = await st(p);
    await touch(client, 'touchStart', [[cx, stripY]]); await sleep(40); await touch(client, 'touchEnd', []); await sleep(150);
    const c = await st(p); const s = await scrollInfo(p);
    rec('P-G02-drag-on-field-and-tap-launch', 'G02', VP, b.pc > a && b.phase === 'serve' && c.phase === 'play' && noScroll(s),
      {pcBeforeFieldDrag: a, pcAfterFieldDrag: b.pc, phaseAfterDrag: b.phase, phaseAfterTap: c.phase, scroll: s});
  });

  await attempt('P-G02-pause-reanchor', 'G02', VP, async () => {
    // Precondition (repair, see log): bring the paddle off the clamp first so movement is observable.
    await touch(client, 'touchStart', [[cx, stripY]]); await sleep(60);
    for (let k = 0; k < 15; k++) { await touch(client, 'touchMove', [[cx - 6 * (k + 1), stripY]]); await sleep(20); }
    await sleep(60);
    await p.keyboard.press('KeyP'); await waitFor(p, () => __bk.state().phase === 'paused');
    const pcPaused = (await st(p)).pc;
    if (pcPaused <= 500 || pcPaused >= 4300) throw new Error('precondition: paddle at clamp ' + pcPaused);
    for (let k = 0; k < 10; k++) { await touch(client, 'touchMove', [[cx - 90 + 8 * (k + 1), stripY]]); await sleep(20); }   // finger moves while paused
    const pcWhilePaused = (await st(p)).pc;
    await p.screenshot({path: path.join(OUT, 'shots/phone-390-paused.png')});
    await p.keyboard.press('KeyP'); await waitFor(p, () => __bk.state().phase === 'play'); await sleep(80);
    const pcResumed = (await st(p)).pc;
    await touch(client, 'touchMove', [[cx - 10 - 20, stripY]]); await sleep(100);
    const pcAfterMove = (await st(p)).pc; const scale = await S(p, () => __bk.scale());
    await touch(client, 'touchEnd', []);
    const expectDelta = Math.floor(3 * -Math.round(20 / scale) / 2);
    rec('P-G02-pause-reanchor', 'G02', VP, pcWhilePaused === pcPaused && pcResumed === pcPaused && Math.abs((pcAfterMove - pcResumed) - expectDelta) <= 3,
      {pcPaused, pcWhilePausedAfterFingerMoved: pcWhilePaused, pcRightAfterResume: pcResumed, pcAfter20pxMove: pcAfterMove,
        observedDelta: pcAfterMove - pcResumed, expectedDeltaApprox: expectDelta},
      'Finger moved 80 CSS px while paused: no paddle jump on resume (re-anchor), then relative 1.5x gain.');
  });

  await attempt('P-G03-touch-playthrough', 'G03', VP, async () => {
    // Touch autopilot: keeps one finger down and drags so the relative rule follows the ball.
    let s = await st(p); const t0 = Date.now(); const k = await S(p, () => __bk.scale());
    let fingerX = cx, down = false, lastScore = s.score;
    while (Date.now() - t0 < 120000) {
      s = await st(p);
      if (s.phase === 'won' || s.phase === 'lost') break;
      if (s.phase === 'serve') { if (down) { await touch(client, 'touchEnd', []); down = false; await sleep(30); }
        await touch(client, 'touchStart', [[cx, stripY]]); await sleep(30); await touch(client, 'touchEnd', []); await sleep(80); continue; }
      if (!down) { fingerX = cx; await touch(client, 'touchStart', [[fingerX, stripY]]); down = true; await sleep(40); continue; }
      if (s.score >= 6 && !p._shot) { p._shot = true; await p.screenshot({path: path.join(OUT, 'shots/phone-390-play.png')}); }
      const want = Math.max(500, Math.min(4300, s.bx)) - s.pc;            // logical units the paddle should move
      fingerX = Math.max(2, Math.min(388, fingerX + (want * k) / 1.5));
      await touch(client, 'touchMove', [[fingerX, stripY]]);
      if (fingerX <= 2 || fingerX >= 388) { await touch(client, 'touchEnd', []); down = false; }
      lastScore = s.score; await sleep(16);
    }
    if (down) await touch(client, 'touchEnd', []);
    s = await st(p);
    await p.screenshot({path: path.join(OUT, `shots/phone-390-end-${s.phase}.png`)});
    const t = await saveTrace(p, 'phone-touch-playthrough');
    const s2 = await scrollInfo(p);
    rec('P-G03-touch-playthrough', 'G03', VP, ['won', 'lost', 'play', 'serve'].includes(s.phase) && noScroll(s2) && t.ticks > 0,
      {endPhase: s.phase, score: s.score, lives: s.lives, traceTicks: t.ticks, wallSeconds: Math.round((Date.now() - t0) / 1000), scroll: s2},
      'Time-boxed; every recorded tick is re-checked against the oracle offline.');
  });

  await attempt('P-G05-replay', 'G05', VP, async () => {
    const replay = await S(p, async () => __bk.replayTrace(await __bk.exportTrace()));
    rec('P-G05-replay', 'G05', VP, replay.result === 'IDENTICAL' && replay.liveStateMatchesReplay === true, replay);
  });
  rec('P-pageerrors', 'G05', VP, errors.length === 0, {pageErrors: errors});
  const timing = await S(p, () => { const t = [...__bk.stats().tickMs].sort((a, b) => a - b);
    return {n: t.length, mean: +(t.reduce((a, b) => a + b, 0) / t.length).toFixed(3), p50: t[Math.floor(t.length * .5)], p95: t[Math.floor(t.length * .95)], max: t[t.length - 1]}; });
  await ctx.close();
  return timing;
}

// ---------------------------------------------------------------------------------------------- admission refusal
async function admissionRefusal(browser) {
  for (const [id, pattern] of [['A-kit-tampered', '**/kit/runtime/engine.js'], ['A-app-root-tampered', '**/dnode/breakout.physics.node'],
    ['A-trust-key-swapped', '**/kit/generated/trust-key.json']]) {
    await attempt(id, 'R0.2', '1280x800', async () => {
      const ctx = await browser.newContext({viewport: {width: 1280, height: 800}});
      const p = await ctx.newPage();
      await p.route(pattern, async route => {
        const r = await route.fetch(); let body = await r.text();
        if (pattern.endsWith('trust-key.json')) { const k = JSON.parse(body); k.x = k.y; body = JSON.stringify(k); }
        else body += pattern.endsWith('.js') ? '\n// tampered (comment only: still valid JS)\n' : '\n; tampered (comment only)\n';
        await route.fulfill({response: r, body});
      });
      await p.goto(BASE);
      await p.waitForFunction(() => window.__bk && 'ready' in window.__bk, null, {timeout: 20000});
      const o = await S(p, () => ({ready: __bk.ready, admission: __bk.admission, error: __bk.error, boot: document.querySelector('#boot').innerText,
        appHidden: document.querySelector('#app').hidden}));
      await p.screenshot({path: path.join(OUT, `shots/${id}.png`)});
      rec(id, 'R0.2', '1280x800', o.ready === false && o.admission === 'failed' && o.appHidden, o);
      await ctx.close();
    });
  }
}

async function visibility(browser) {
  await attempt('D-G04-hidden-tab-force-pause', 'G04', '1280x800', async () => {
    const ctx = await browser.newContext({viewport: {width: 1280, height: 800}});
    const p = await ctx.newPage();
    await ready(p, BASE);
    await p.keyboard.press('Space'); await sleep(500);
    const before = await st(p);
    const other = await ctx.newPage(); await other.goto('about:blank'); await other.bringToFront(); await sleep(1500);
    const hiddenSeen = await S(p, () => document.visibilityState);
    await p.bringToFront(); await sleep(600);
    const after = await st(p); const fr = await S(p, () => __bk.stats().frames.slice(-30).map(f => f.ticks));
    if (hiddenSeen !== 'hidden') {
      results.push({id: 'D-G04-hidden-tab-force-pause', obligation: 'G04', viewport: '1280x800', result: 'NOT-EXERCISED',
        observed: {visibilityWhileOtherTabFront: hiddenSeen, phaseAfterReturn: after.phase}, note: 'Headless Chromium keeps visibilityState visible; the visibilitychange force-pause path needs a real-device check.'});
      console.log('NOT-EXERCISED D-G04-hidden-tab-force-pause'); await ctx.close(); return;
    }
    rec('D-G04-hidden-tab-force-pause', 'G04', '1280x800', before.phase === 'play' && after.phase === 'paused' && Math.max(...fr) <= 5,
      {phaseBefore: before.phase, visibilityWhileOtherTabFront: hiddenSeen, phaseAfterReturn: after.phase, resume: after.resume, ticksPerFrameAfterReturn: fr});
    await ctx.close();
  });
}

(async () => {
  const browser = await chromium.launch();
  const version = browser.version();
  const t0 = Date.now();
  const which = process.env.ONLY || 'all';
  const timing = {};
  if (which === 'all' || which === 'admission') await admissionRefusal(browser);
  if (which === 'all' || which === 'visibility') await visibility(browser);
  if (which === 'all' || which === 'phone') timing.phone390 = await phone(browser);
  if (which === 'all' || which === 'desktop') timing.desktop1280 = await desktop(browser);
  await browser.close();
  const summary = {pass: results.filter(r => r.result === 'PASS').length, fail: results.filter(r => r.result === 'FAIL').length, notExercised: results.filter(r => r.result === 'NOT-EXERCISED').length};
  const out = {when: new Date().toISOString(), chromium: version, base: BASE, wallSeconds: Math.round((Date.now() - t0) / 1000), summary, results,
    browserTickTiming: timing, note: 'Machine checks of observable facts only. Human acceptance (G01, G06, human part of G02) is pending.'};
  fs.writeFileSync(path.join(OUT, `drive-results${which === 'all' ? '' : '-' + which}.json`), JSON.stringify(out, null, 1));
  console.log(JSON.stringify(summary), 'timing', JSON.stringify(timing));
})();
