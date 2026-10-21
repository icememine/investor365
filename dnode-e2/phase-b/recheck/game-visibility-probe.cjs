// Coordinating-session probe for the one G04 path the game drive could not exercise:
// tab hidden during play → host force-pause; visible again → no catch-up jump.
// Headless Chromium never reports a hidden page, so visibility is simulated by overriding
// document.hidden/visibilityState and dispatching the real event the host listens to.
const { chromium } = require('playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8142/';
const gp = s => JSON.stringify({ pc: s.pc, bx: s.bx, by: s.by, vx: s.vx, vy: s.vy, bricks: s.bricks, score: s.score, lives: s.lives });
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const results = []; const check = (name, ok, detail) => { results.push({ name, ok, detail }); console.log(ok ? 'PASS' : 'FAIL', name, detail ?? ''); };
  await p.goto(URL); await p.waitForFunction(() => window.__bk && window.__bk.ready);
  await p.keyboard.press('Space'); await p.waitForTimeout(500);
  let s = await p.evaluate(() => window.__bk.state());
  check('playing before hide', s.phase === 'play', s.phase);
  await p.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await p.waitForTimeout(300);
  const hidden1 = await p.evaluate(() => window.__bk.state());
  check('hidden → force-paused', hidden1.phase === 'paused', hidden1.phase);
  await p.waitForTimeout(3000);
  const hidden2 = await p.evaluate(() => window.__bk.state());
  check('gameplay frozen while hidden (3 s)', gp(hidden1) === gp(hidden2));
  await p.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await p.waitForTimeout(300);
  const vis = await p.evaluate(() => window.__bk.state());
  check('visible again stays paused (needs player resume)', vis.phase === 'paused' && gp(vis) === gp(hidden1), vis.phase);
  const t0 = await p.evaluate(() => window.__bk.recorderTicks());
  await p.keyboard.press('KeyP'); await p.waitForTimeout(100);
  const after = await p.evaluate(() => window.__bk.state());
  const t1 = await p.evaluate(() => window.__bk.recorderTicks());
  const dy = Math.abs(after.by - vis.by);
  check('resume continues with no catch-up jump', after.phase === 'play' && t1 - t0 <= 12 && dy <= 12 * 36, `ticks ${t1 - t0} in ~100 ms, |dy| ${dy}`);
  await b.close();
  console.log(JSON.stringify({ checks: results.length, passed: results.filter(r => r.ok).length }));
  process.exitCode = results.every(r => r.ok) ? 0 : 1;
})();
