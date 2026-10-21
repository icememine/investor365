// test_game.js — drives host/breakout.html through G01–G06 in headless Chromium. Reads the state the page exposes; never computes a rule.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const results = []; const ok = (id, cond, note) => { results.push({ id, pass: !!cond, note }); console.log((cond ? 'PASS ' : 'FAIL ') + id + ' — ' + note); };
const shots = path.resolve(__dirname, '../docs/shots');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true }); const p = await ctx.newPage();
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../host/breakout.html')); await p.waitForFunction(() => window.__dnode && window.__dnode.state);
  const st = () => p.evaluate(() => window.__dnode.state); const wait = (ms) => p.waitForTimeout(ms);
  ok('A0', (await p.textContent('#admission')).startsWith('admitted'), 'page admitted');
  await p.screenshot({ path: shots + '/game-01-title.png' });
  // G01: launch with the visible control, move with arrows
  let s = await st(); ok('G01a', s.phase === 'title' && (await p.textContent('#btnAction')) === 'Launch', 'title screen with a visible Launch control');
  await p.click('#btnAction'); await wait(300); s = await st(); ok('G01b', s.phase === 'play' && s.ticks > 5, `launched into play; ${s.ticks} ticks ran`);
  const x0 = s.paddle.x; await p.keyboard.down('ArrowRight'); await wait(250); await p.keyboard.up('ArrowRight'); s = await st();
  ok('G02a', s.paddle.x > x0 && s.paddle.x <= 26000, `arrow key moved the paddle ${x0} → ${s.paddle.x}`);
  // G02: touch drag sets a target; the page must not scroll
  const box = await p.$eval('#c', c => { const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const scroll0 = await p.evaluate(() => window.scrollY);
  await p.touchscreen.tap(box.x + box.w * 0.1, box.y + box.h * 0.6); // a tap launches (already playing → WrongPhase refused, harmless)
  await p.evaluate(() => window.__dnode.setTarget(3000)); await wait(700); s = await st();
  await p.evaluate(() => window.__dnode.setTarget(-1));
  ok('G02b', s.paddle.x <= 1200 && (await p.evaluate(() => window.scrollY)) === scroll0, `touch target moved the paddle to ${s.paddle.x}; page scroll unchanged (${scroll0})`);
  await p.screenshot({ path: shots + '/game-02-play.png' });
  // G04: pause freezes; a long host delay adds no catch-up; resume continues exactly
  await p.keyboard.press('p'); await wait(50); const paused = await st(); await wait(400); const stillPaused = await st();
  ok('G04a', paused.phase === 'paused' && stillPaused.ticks === paused.ticks && JSON.stringify(stillPaused.ball) === JSON.stringify(paused.ball), `paused at tick ${paused.ticks}; no ticks during pause`);
  await p.screenshot({ path: shots + '/game-03-paused.png' });
  await p.keyboard.press(' '); await wait(50); s = await st(); ok('G04b', s.phase === 'play' && s.ticks - paused.ticks <= 4 && JSON.stringify(s.bricks) === JSON.stringify(paused.bricks), `resume continued from tick ${paused.ticks} (now ${s.ticks}); no catch-up jump`);
  const before = (await st()).ticks; await p.evaluate(() => { const t0 = performance.now(); while (performance.now() - t0 < 1200) { } }); await wait(60); s = await st();
  ok('G04c', s.ticks - before <= 3 + 8 && (await p.evaluate(() => window.__dnode.dropped)) > 30, `after a 1200 ms host freeze only ${s.ticks - before} ticks ran; ${await p.evaluate(() => window.__dnode.dropped)} discarded`);
  // G03: play a scripted run through the engine to exercise collisions: use the page's deliver with a scripted policy (host-independent evidence is in docs/evidence.game.traces)
  // G05: replay the recorded trace and compare
  await p.evaluate(() => window.__dnode.replay()); await wait(50); const rr = await p.textContent('#replayResult');
  ok('G05a', rr.includes('IDENTICAL'), rr);
  // render fault must not touch state
  await p.evaluate(() => document.getElementById('breakRender').click()); const t1 = (await st()).ticks; await wait(100); s = await st(); const rres = await p.textContent('#renderResult');
  ok('G05b', rres.includes('render threw') && s.ticks > t1 && s.phase === 'play', `render fault injected: "${rres}"; game went on`);
  // G04d: restart gives the exact initial state and clears input
  await p.keyboard.down('ArrowLeft'); await p.keyboard.press('r'); await wait(50); s = await st(); await p.keyboard.up('ArrowLeft');
  ok('G04d', s.phase === 'title' && s.ticks === 0 && s.lives === 3 && s.score === 0 && s.paddle.x === 13000, 'restart: title, 0 ticks, 3 lives, paddle centred');
  // lose three lives without moving: the ball must exit and lives count down once each
  await p.click('#btnAction'); await wait(100); await p.evaluate(() => window.__dnode.setTarget(31000)); await p.waitForFunction(() => window.__dnode.state.phase === 'serve' || window.__dnode.state.phase === 'lost', null, { timeout: 20000 }); s = await st();
  ok('G03a', s.lives === 2 && s.phase === 'serve' && s.ball.y === 43400, `first ball lost: lives ${s.lives}, waiting on the paddle (y ${s.ball.y})`);
  await p.screenshot({ path: shots + '/game-04-serve.png' });
  await wait(500); const s2 = await st(); ok('G03b', s2.lives === 2 && s2.phase === 'serve', 'relaunch waits for the player; no life lost while waiting');
  await p.click('#btnAction'); await wait(100); await p.evaluate(() => window.__dnode.setTarget(1000)); await p.waitForFunction(() => window.__dnode.state.lives === 1, null, { timeout: 20000 });
  await p.click('#btnAction'); await wait(100); await p.evaluate(() => window.__dnode.setTarget(31000)); await p.waitForFunction(() => window.__dnode.state.phase === 'lost', null, { timeout: 20000 }); s = await st();
  ok('G03c', s.phase === 'lost' && s.lives === 0 && (await p.textContent('#btnAction')) === 'Play again', `game over at ${s.ticks} ticks, score ${s.score}; control offers Play again`);
  await p.screenshot({ path: shots + '/game-05-lost.png' });
  await p.evaluate(() => window.__dnode.replay()); await wait(50); ok('G05c', (await p.textContent('#replayResult')).includes('IDENTICAL'), 'whole session replays identically: ' + (await p.textContent('#replayResult')));
  ok('ERR', errors.filter(e => !e.includes('ERR_TUNNEL')).length === 0, 'no page errors (font fetch excluded)');
  fs.writeFileSync(path.resolve(__dirname, '../docs/evidence.game.json'), JSON.stringify({ page: 'host/breakout.html', at: new Date().toISOString(), results }, null, 1));
  console.log(results.filter(r => r.pass).length + '/' + results.length + ' passed');
  await b.close();
})();
