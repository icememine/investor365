// test_shop.js — drives host/shop.html through the BP-SHOP obligations S01–S08 in headless Chromium.
// Independent of the graph's own examples: it reads what the customer sees and what the simulator ledger holds.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const url = 'file://' + path.resolve(__dirname, '../host/shop.html');
const results = []; const ok = (id, cond, note) => { results.push({ id, pass: !!cond, note }); console.log((cond ? 'PASS ' : 'FAIL ') + id + ' — ' + note); };
const shots = path.resolve(__dirname, '../docs/shots'); fs.mkdirSync(shots, { recursive: true });
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const p = await ctx.newPage();
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  const st = () => p.evaluate(() => window.__dnode.state); const ledger = () => p.evaluate(() => window.__dnode.sim.ledger);
  const send = (e) => p.evaluate((e) => window.__dnode.send(e), e); const lastErr = () => p.evaluate(() => window.__dnode.lastError);
  const text = (sel) => p.textContent(sel); const wait = (ms) => p.waitForTimeout(ms);
  const click = async (label) => { await p.click(`button:has-text("${label}")`); await wait(60); };
  const mode = (m) => p.selectOption('#simmode', m);
  const reset = async () => { await p.evaluate(() => window.__dnode.showTab('desk')); await click('Clear session'); await p.evaluate(() => window.__dnode.showTab('shop')); };
  await p.goto(url); await p.waitForFunction(() => window.__dnode && window.__dnode.state); await reset();
  ok('A0', (await text('#admission')).startsWith('admitted'), 'page admitted: ' + (await text('#admission')).split('\n')[0]);

  // S01 normal order without coaching: the buttons are the journey
  await click('Add to bag'); // first card: Notebook
  await p.click('.card:nth-child(2) button'); await wait(60); // Pen
  await p.screenshot({ path: shots + '/shop-01-bag.png' });
  await click('Review order'); await p.screenshot({ path: shots + '/shop-02-review.png' });
  const reviewTotal = await text('.total .m');
  await click('Place order'); await p.screenshot({ path: shots + '/shop-03-placed.png' });
  await click('Pay '); await wait(700); await p.screenshot({ path: shots + '/shop-04-paid.png' });
  let s = await st(); let l = await ledger();
  ok('S01', s.orders[0].status === 'confirmed' && (await text('.status b')).includes('Paid') && reviewTotal === '70.000 ₫' && (await text('.total .m')) === '70.000 ₫', `paid; amount shown ${await text('.total .m')}; status line "${await text('.status b')}"`);
  // S02 relationships: 2×50000 + 1×20000 = 120000; malformed data fails before business logic
  await click('Back to the shop'); await click('Add to bag'); await click('Add to bag'); await p.click('.card:nth-child(2) button'); await wait(60);
  s = await st(); const shown = await text('.total .m');
  ok('S02a', shown === '120.000 ₫' && s.cart.length === 2, `cart total ${shown} for NOTEBOOK×2 + PEN×1`);
  await send({ kind: 'add', sku: 'PEN', qty: 'x' }); const e1 = await lastErr();
  await send({ kind: 'set', sku: 'PEN', qty: 'x' }); const e2 = await lastErr();
  await send({ kind: 'set', sku: 'PEN', qty: 12 }); const e3 = await lastErr();
  ok('S02b', e1 === '' && e2.length > 0 && e3 === 'BadQty' && (await st()).cart.length === 2, `malformed set refused (${e2}); qty 12 refused ${e3}; cart unchanged`);
  // S03 same instruction twice: one charge, one stock consumption; changed intent refuses
  await click('Review order'); await click('Place order'); s = await st(); const id = s.current; const stockAfterPlace = JSON.stringify(s.stock);
  await send({ kind: 'place', id }); ok('S03a', (await st()).orders.length === 2 && JSON.stringify((await st()).stock) === stockAfterPlace, 'place delivered twice: still one order, stock reserved once');
  await click('Pay '); await wait(700); await p.evaluate(() => window.__dnode.showTab('desk')); await click('Deliver the last instruction again'); await wait(700);
  l = await ledger(); s = await st();
  ok('S03b', l.length === 2 && (await lastErr()) === 'AlreadySubmitted' && s.stock.find(x => x.sku === 'NOTEBOOK').on_hand === 2, `pay delivered twice: ledger has ${l.length} charges for 2 orders, second delivery refused ${await lastErr()}, NOTEBOOK on hand ${s.stock.find(x => x.sku === 'NOTEBOOK').on_hand}`);
  await p.evaluate(() => window.__dnode.showTab('shop')); await click('Back to the shop'); await p.click('.card:nth-child(2) button'); await wait(60); await click('Review order');
  await send({ kind: 'place', id }); ok('S03c', (await lastErr()) === 'ChangedIntent' && (await st()).orders.length === 2, `same identity with a different bag refused ${await lastErr()}`);
  await p.screenshot({ path: shots + '/shop-05-changed-intent.png' });
  // S04 the last unit: TOTE has 2; one order takes both; nothing else can reserve them
  await click('Back to the shop'); await send({ kind: 'remove', sku: 'PEN' }); await p.click('.card:nth-child(3) button'); await p.click('.card:nth-child(3) button'); await wait(60);
  await click('Review order'); await click('Place order'); s = await st(); const toteOrder = s.current;
  await click('Back to the shop'); const toteNote = await text('.card:nth-child(3) .note'); const toteDisabled = await p.$eval('.card:nth-child(3) button', b => b.disabled);
  await send({ kind: 'add', sku: 'TOTE' }); const e4 = await lastErr();
  ok('S04', toteNote === 'Sold out' && toteDisabled && e4 === 'ExceedsStock' && s.stock.find(x => x.sku === 'TOTE').reserved === 2, `after order #${toteOrder} reserved both totes: card says "${toteNote}", add refused ${e4}`);
  await send({ kind: 'show', id: toteOrder }); await click('Cancel order'); s = await st();
  ok('S06a', s.orders.find(o => o.id === toteOrder).status === 'cancelled' && s.stock.find(x => x.sku === 'TOTE').reserved === 0, 'cancel before payment released the reservation');
  // S05 accepted with the reply lost
  await click('Add to bag'); await click('Review order'); await click('Place order'); s = await st(); const lostId = s.current;
  await p.evaluate(() => window.__dnode.showTab('desk')); await mode('accept-lost'); await p.evaluate(() => window.__dnode.showTab('shop'));
  await click('Pay '); await wait(700); await p.screenshot({ path: shots + '/shop-06-unknown.png' });
  s = await st(); l = await ledger(); const unknownTitle = await text('.status b');
  ok('S05a', s.orders.find(o => o.id === lostId).status === 'unknown' && s.stock.find(x => x.sku === 'NOTEBOOK').reserved === 1 && l.length === 3 && unknownTitle.includes('unconfirmed'), `reply lost: status "${unknownTitle}", reservation kept, ledger ${l.length} charges`);
  // S07 reload during uncertainty
  await p.reload(); await p.waitForFunction(() => window.__dnode && window.__dnode.state); await wait(200);
  s = await st(); const offersCheck = await p.$('button:has-text("Check payment status")');
  ok('S07', s.current === lostId && s.orders.find(o => o.id === lostId).status === 'unknown' && !!offersCheck && (await ledger()).length === 3, 'after reload the same order and instruction are back and recovery is offered; ledger intact');
  await p.screenshot({ path: shots + '/shop-07-after-reload.png' });
  // S05b reconcile with the same instruction, no fresh charge; first inquiry unavailable
  await p.evaluate(() => window.__dnode.showTab('desk')); await mode('inquiry-unavailable'); await p.evaluate(() => window.__dnode.showTab('shop'));
  await click('Check payment status'); await wait(700); const stillUnknown = (await st()).orders.find(o => o.id === lostId).status;
  await click('Check payment status'); await wait(700); s = await st(); l = await ledger();
  ok('S05b', stillUnknown === 'unknown' && s.orders.find(o => o.id === lostId).status === 'confirmed' && l.length === 3 && s.stock.find(x => x.sku === 'NOTEBOOK').reserved === 0, `inquiry unavailable once then confirmed; ledger still ${l.length}; stock consumed once`);
  await p.screenshot({ path: shots + '/shop-08-reconciled.png' });
  // S06 definite decline releases once; supplier stock below reserved rejected unchanged
  await click('Back to the shop'); await p.click('.card:nth-child(2) button'); await wait(60); await click('Review order'); await click('Place order'); s = await st(); const decId = s.current;
  await p.evaluate(() => window.__dnode.showTab('desk')); await mode('decline'); await p.evaluate(() => window.__dnode.showTab('shop'));
  await click('Pay '); await wait(700); await p.screenshot({ path: shots + '/shop-09-declined.png' }); s = await st();
  ok('S06b', s.orders.find(o => o.id === decId).status === 'declined' && s.stock.find(x => x.sku === 'PEN').reserved === 0 && (await text('.status b')).includes('Declined'), 'declined: reservation released, nothing consumed');
  await send({ kind: 'inquiry_result', id: decId, result: 'declined' }); ok('S06c', (await lastErr()) === 'NotUncertain', 'a second release attempt refused ' + (await lastErr()));
  await click('Back to the shop'); await click('Add to bag'); await click('Review order'); await click('Place order'); s = await st(); const held = s.current;
  await p.evaluate(() => window.__dnode.showTab('desk')); const before = JSON.stringify((await st()).stock);
  await p.click('button[data-seed="supplier_below_reserved"]'); await wait(100); await p.screenshot({ path: shots + '/shop-10-import-conflict.png' });
  s = await st(); const confirmBtn = await p.$('button:has-text("Confirm import")');
  ok('S06d', s.pending.outcome === 'Conflict' && !confirmBtn && JSON.stringify(s.stock) === before, `snapshot below reserved: outcome ${s.pending.outcome}, no confirm offered, stock unchanged`);
  await click('Discard'); await p.click('button[data-seed="supplier_ok"]'); await wait(100); await p.screenshot({ path: shots + '/shop-11-import-preview.png' });
  await click('Confirm import'); s = await st();
  ok('OP1', s.stock.find(x => x.sku === 'RULER') && s.stock.find(x => x.sku === 'NOTEBOOK').on_hand === 12 && s.stock.find(x => x.sku === 'NOTEBOOK').reserved === 1 && s.orders.find(o => o.id === held).status === 'ready', 'operator import applied whole: new SKU added, counts replaced, reservation and open order kept');
  await p.click('button[data-seed="supplier_broken_quote"]'); await wait(100); ok('S02c', (await lastErr()) === 'BrokenQuote' && (await st()).pending.outcome === 'none', 'broken quote refused before any business logic');
  await p.click('button[data-seed="supplier_bad_row"]'); await wait(100); s = await st(); await p.screenshot({ path: shots + '/shop-12-import-rejected.png' });
  ok('B-op', s.pending.outcome === 'Rejected' && s.pending.problems.length === 2, `bad rows located: ${JSON.stringify(s.pending.problems)}`);
  // S08 phone viewport: status and next action visible without scrolling on the order page
  await p.evaluate(() => window.__dnode.showTab('shop')); await send({ kind: 'show', id: lostId });
  const box = await p.$eval('.status', el => el.getBoundingClientRect().top); const btn = await p.$eval('.bag button', el => el.getBoundingClientRect().bottom);
  ok('S08', box >= 0 && btn <= 844, `on a 390×844 viewport the status sits at ${Math.round(box)}px and the next action ends at ${Math.round(btn)}px`);
  await p.screenshot({ path: shots + '/shop-13-orders.png' });
  ok('ERR', errors.filter(e => !e.includes('ERR_TUNNEL')).length === 0, 'no page errors (font fetch excluded)');
  fs.writeFileSync(path.resolve(__dirname, '../docs/evidence.shop.json'), JSON.stringify({ page: 'host/shop.html', at: new Date().toISOString(), results, ledger: await ledger() }, null, 1));
  console.log(results.filter(r => r.pass).length + '/' + results.length + ' passed');
  await b.close();
})();
