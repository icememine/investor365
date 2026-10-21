// Automated browser drives for BP-SHOP (headless Chromium from /opt/pw-browsers).
// Usage: node tests/drive.cjs [section ...]   sections: admission journey s02 s03 s04 s05s07 s06 import
// Needs the server running: node serve.mjs (BASE env overrides http://127.0.0.1:8101/).
// Writes evidence/drive-<section>.json and screenshots in evidence/shots/.
// These drives check computational facts and observable layout. They are NOT human acceptance.
const {chromium} = require('playwright');
const fs = require('fs');
const path = require('path');

const SHOP = path.resolve(__dirname, '..');
const BASE = process.env.BASE ?? 'http://127.0.0.1:8101/';
const SHOTS = path.join(SHOP, 'evidence/shots');
const KEY = 'bp-shop-e2';
const PHONE = {width: 390, height: 844};
const DESKTOP = {width: 1280, height: 800};
const RACE_N = Number(process.env.RACE_N ?? 30);

let checks = [];
const check = (id, obligation, pass, details = {}) => { checks.push({id, obligation, pass: !!pass, ...details}); console.log((pass ? 'PASS ' : 'FAIL ') + obligation + ' ' + id + (pass ? '' : ' ' + JSON.stringify(details).slice(0, 600))); };

async function open(ctx, route = '#/') {
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('pageerror', e.message));
  await page.goto(BASE + route);
  const ready = await page.evaluate(() => window.__shop?.ready);
  if (ready !== 'ready') throw Error('page not ready: ' + ready);
  return page;
}
const record = page => page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
const rawRecord = page => page.evaluate(k => localStorage.getItem(k), KEY);
const inv = rec => Object.fromEntries(rec.state.catalogue.map(i => [i.sku, {h: i.h, r: i.r, a: i.h - i.r}]));
async function resetStore(page) {
  await page.evaluate(k => navigator.locks.request(k, () => localStorage.removeItem(k)), KEY);
}
async function fresh(page, route = '#/') {
  await resetStore(page);
  await page.goto(BASE + route);
  await page.reload();
  await page.evaluate(() => window.__shop.ready);
}
// Run a host action the same way a button click does and wait until it has rendered.
async function act(page, name, arg = '') { return page.evaluate(([n, a]) => window.__shop.act(n, a), [name, arg]); }
async function click(page, selector) {
  const n = await page.evaluate(() => window.__shop.acts);
  await page.click(selector);
  await page.waitForFunction(n0 => window.__shop.acts > n0, n);
}
async function go(page, route) { await page.evaluate(r => { location.hash = r; }, route); await page.waitForTimeout(150); }
async function setMode(page, mode) { await page.evaluate(([k, m]) => navigator.locks.request(k, () => { const r = JSON.parse(localStorage.getItem(k)); r.mode = m; localStorage.setItem(k, JSON.stringify(r)); }), [KEY, mode]); }
async function shot(page, name, opts = {}) { const file = path.join(SHOTS, name + '.png'); await page.screenshot({path: file, ...opts}); return 'evidence/shots/' + name + '.png'; }
async function geometry(page) {
  return page.evaluate(() => {
    const box = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return {top: Math.round(r.top), bottom: Math.round(r.bottom)}; };
    return {status: box('[data-testid=status]'), total: box('[data-testid=total]'), primary: box('[data-testid=primary]'),
      innerHeight: innerHeight, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth,
      statusText: document.querySelector('[data-testid=status]')?.innerText ?? '', totalText: document.querySelector('[data-testid=total]')?.innerText ?? '',
      primaryText: document.querySelector('[data-testid=primary]')?.innerText ?? '', phase: document.querySelector('[data-testid=status]')?.dataset.phase ?? ''};
  });
}
const aboveFold = g => g.status && g.total && g.primary && g.status.bottom <= g.innerHeight && g.total.bottom <= g.innerHeight && g.primary.bottom <= g.innerHeight && g.scrollWidth <= g.clientWidth;
async function customerText(page) { return page.evaluate(() => document.querySelector('main').innerText + ' ' + document.title); }
const leaksDiagnostics = t => /[0-9a-f]{32,}/.test(t) || /-P1\b/.test(t) || /sha|hash|runtime|certificate/i.test(t);

// Add the BP-SHOP sample basket through the UI: NOTEBOOK x2, PEN x1, TOTE x1 = 240.000 ₫
async function sampleBasket(page) {
  await click(page, '[data-sku=NOTEBOOK] button[data-action]');
  await click(page, '[data-sku=NOTEBOOK] button[data-action]');
  await click(page, '[data-sku=PEN] button[data-action]');
  await click(page, '[data-sku=TOTE] button[data-action]');
}

// ------------------------------------------------------------------------- sections
const sections = {};

sections.admission = async browser => {
  const tamper = [
    ['kit root changed', '**/kit/roots/supplier.node', t => t + ' '],
    ['kit runtime file changed', '**/kit/runtime/host.js', t => t.replace('payment.inquire', 'payment.inquire ')],
    ['trust key replaced', '**/kit/generated/trust-key.json', t => t.replace(/"x": "[^"]+"/, '"x": "AAAA"')],
    ['app root changed (lock mismatch)', '**/shop.core.node', t => t.replace('const SHOP_MAX_DRAFTS 20', 'const SHOP_MAX_DRAFTS 21')],
  ];
  for (const [label, pattern, edit] of tamper) {
    const ctx = await browser.newContext({viewport: PHONE});
    await ctx.route(pattern, async route => { const r = await route.fetch(); route.fulfill({response: r, body: edit(await r.text())}); });
    const page = await ctx.newPage();
    await page.goto(BASE);
    const ready = await page.evaluate(() => window.__shop?.ready ?? 'no host');
    const shown = await page.isVisible('[data-testid=admission-failed]');
    const stored = await page.evaluate(k => localStorage.getItem(k), KEY);
    check('refuse on ' + label, 'R0.2', String(ready).startsWith('refused') && shown && stored === null, {ready, shown, storedState: stored !== null});
    if (label === 'kit root changed') await shot(page, 'admission-refused-390');
    await ctx.close();
  }
  const ctx = await browser.newContext({viewport: PHONE});
  const page = await open(ctx);
  check('untampered kit admitted', 'R0.2', true);
  await ctx.close();
};

sections.journey = async browser => {
  for (const [vp, size] of [['390', PHONE], ['1280', DESKTOP]]) {
    const ctx = await browser.newContext({viewport: size});
    const page = await open(ctx);
    await fresh(page);
    await shot(page, `j01-browse-${vp}`, {fullPage: true});
    await sampleBasket(page);
    await shot(page, `j02-browse-incart-${vp}`, {fullPage: true});
    await go(page, '#/cart');
    const cartTotal = await page.innerText('[data-testid=total]');
    check(`cart total 240.000 ₫ (${vp})`, 'S02', cartTotal.includes('240.000 ₫'), {cartTotal});
    await shot(page, `j03-cart-${vp}`, {fullPage: true});
    await click(page, 'button[data-action=review]');
    const reviewTotal = await page.innerText('[data-testid=total]');
    const reviewText = await customerText(page);
    check(`review shows lines and total (${vp})`, 'S02', reviewTotal.includes('240.000 ₫') && reviewText.includes('2 × 50.000 ₫') && reviewText.includes('1 × 120.000 ₫'), {reviewTotal});
    await shot(page, `j04-review-${vp}`, {fullPage: true});
    await click(page, 'button[data-action=place]');
    let g = await geometry(page);
    let rec = await record(page);
    check(`order placed: ready, reserved (${vp})`, 'S02', g.phase === 'ready' && g.primaryText === 'Thanh toán 240.000 ₫' && rec.state.orders.length === 1 && inv(rec).NOTEBOOK.r === 2 && inv(rec).TOTE.r === 1 && rec.state.cart.length === 0, {g, inv: inv(rec)});
    check(`ready: status, total, next action above fold (${vp})`, 'S08', aboveFold(g), {g});
    await shot(page, `j05-order-ready-${vp}`);
    await click(page, 'button[data-action=pay]');
    g = await geometry(page);
    rec = await record(page);
    const ledger = Object.entries(rec.bank);
    check(`paid: confirmed status, receipt total (${vp})`, 'S01-observable', g.phase === 'confirmed' && g.statusText.includes('Đã thanh toán') && g.totalText.includes('240.000 ₫') && g.primaryText === 'Tiếp tục mua sắm', {g});
    check(`paid: one charge 240000, stock consumed once (${vp})`, 'S02', ledger.length === 1 && ledger[0][1].amount === 240000 && ledger[0][1].status === 'confirmed' && inv(rec).NOTEBOOK.h === 3 && inv(rec).NOTEBOOK.r === 0 && inv(rec).PEN.h === 7 && inv(rec).TOTE.h === 1, {ledger, inv: inv(rec)});
    check(`confirmed: status, total, next action above fold (${vp})`, 'S08', aboveFold(g), {g});
    const text = await customerText(page);
    check(`no hashes/instruction ids in customer screen (${vp})`, 'D-S4', !leaksDiagnostics(text), {});
    await shot(page, `j06-order-confirmed-${vp}`);
    await shot(page, `j06-order-confirmed-full-${vp}`, {fullPage: true});

    // declined
    await setMode(page, 'decline');
    await go(page, '#/');
    await click(page, '[data-sku=PEN] button[data-action]');
    await go(page, '#/cart');
    await click(page, 'button[data-action=review]');
    await click(page, 'button[data-action=place]');
    rec = await record(page);
    const penReservedBefore = inv(rec).PEN.r;
    await click(page, 'button[data-action=pay]');
    g = await geometry(page);
    rec = await record(page);
    check(`declined: status text, reservation released (${vp})`, 'S06', g.phase === 'declined' && g.statusText.includes('Thanh toán bị từ chối') && g.statusText.includes('Bạn không bị trừ tiền') && penReservedBefore === 1 && inv(rec).PEN.r === 0 && inv(rec).PEN.h === 7, {g, inv: inv(rec)});
    check(`declined: status, total, next action above fold (${vp})`, 'S08', aboveFold(g) && g.primaryText === 'Đặt đơn mới với các sản phẩm này', {g});
    await shot(page, `j07-order-declined-${vp}`);
    await click(page, 'button[data-action=reorder]');
    rec = await record(page);
    check(`reorder cart (${vp})`, 'S06', rec.state.cart.length === 1 && rec.state.cart[0].sku === 'PEN' && page.url().endsWith('#/cart'), {cart: rec.state.cart});

    // unknown (lost reply)
    await setMode(page, 'lost');
    await click(page, 'button[data-action=review]');
    await click(page, 'button[data-action=place]');
    await click(page, 'button[data-action=pay]');
    g = await geometry(page);
    check(`unknown: uncertainty copy and recovery label (${vp})`, 'S05', g.phase === 'unknown' && g.statusText.includes('Đang xác nhận thanh toán') && g.statusText.includes('Vui lòng không thanh toán lại cho đơn này trước khi có kết quả.') && g.primaryText === 'Kiểm tra lại thanh toán', {g});
    check(`unknown: status, total, next action above fold (${vp})`, 'S08', aboveFold(g), {g});
    await shot(page, `j08-order-unknown-${vp}`);
    // grayscale versions for the human S08 grayscale task (phone only)
    if (vp === '390') {
      await page.addStyleTag({content: 'html{filter:grayscale(1)}'});
      await shot(page, 'gray-unknown-390');
      for (const [k, phase] of [['ORD-0001', 'confirmed'], ['ORD-0002', 'declined']]) { await go(page, '#/order/' + k); await shot(page, `gray-${phase}-390`); }
    }
    await go(page, '#/');
    const browseText = await customerText(page);
    check(`browse lists orders with status for recovery (${vp})`, 'S07', browseText.includes('Đang xác nhận thanh toán') && browseText.includes('Mã đơn ORD-0003'), {});
    await shot(page, `j09-browse-orders-${vp}`, {fullPage: true});
    await ctx.close();
  }
};

sections.s02 = async browser => {
  const ctx = await browser.newContext({viewport: PHONE});
  const page = await open(ctx);
  await fresh(page);
  // unknown SKU / over-quantity through the host action path
  let before = await rawRecord(page);
  let r = await act(page, 'cart.inc', 'ERASER');
  check('unknown SKU refused, state unchanged', 'S02', r.code === 'UnknownSku' && r.kind === 'refused' && await rawRecord(page) === before, {r});
  for (let i = 0; i < 2; i++) await act(page, 'cart.inc', 'TOTE');
  before = await rawRecord(page);
  r = await act(page, 'cart.inc', 'TOTE');
  check('cart cannot exceed availability (TOTE A=2)', 'S02', r.code === 'OutOfStock' && await rawRecord(page) === before, {r});
  for (let i = 0; i < 9; i++) await act(page, 'cart.inc', 'PEN');
  before = await rawRecord(page);
  r = await act(page, 'cart.inc', 'PEN');
  check('quantity beyond availability refused (PEN A=8); the 1..9 bound itself is checked at DNode level in tests/s02.mjs', 'S02', r.code === 'OutOfStock' && await rawRecord(page) === before, {r});
  // malformed stored state: quantity as text "5" in the catalogue -> fault before business logic, nothing written
  await page.evaluate(k => navigator.locks.request(k, () => { const x = JSON.parse(localStorage.getItem(k)); x.state.catalogue[0].h = '5'; localStorage.setItem(k, JSON.stringify(x)); }), KEY);
  before = await rawRecord(page);
  r = await act(page, 'cart.inc', 'NOTEBOOK');
  const after = await rawRecord(page);
  check('malformed stored state (H as text) faults InputShape before business logic; record unchanged', 'S02', r.kind === 'fault' && r.code === 'InputShape' && after === before, {r});
  await go(page, '#/');
  await page.reload(); await page.evaluate(() => window.__shop.ready);
  const notice = await page.textContent('[data-testid=notice]').catch(() => '');
  check('customer sees system-error message, no business screen', 'S02', notice.includes('Đã xảy ra lỗi hệ thống'), {notice});
  await shot(page, 's02-corrupt-state-390');
  await go(page, '#/test-desk');
  const deskFault = await page.isVisible('[data-testid=state-fault]');
  await page.click('[data-testid=reset]'); await page.waitForTimeout(300);
  const reset = await record(page);
  check('test desk still offers reset on corrupt state; reset restores the seed', 'S02', deskFault && reset.state.catalogue[0].h === 5 && Object.keys(reset.bank).length === 0, {deskFault});
  // effects: malformed state cannot produce a charge
  await page.evaluate(k => navigator.locks.request(k, () => { const x = JSON.parse(localStorage.getItem(k)); x.state.orders = [{key: 'ORD-0001', instr: 'ORD-0001-P1', intent: {currency: 'VND', lines: [{sku: 'PEN', qty: 1, unit_price: 20000}], total: '20000'}, phase: 'ready', inquiries: 0}]; x.state.catalogue[0].h = 5; localStorage.setItem(k, JSON.stringify(x)); }), KEY);
  r = await act(page, 'pay', 'ORD-0001');
  const rec = await record(page);
  check('order with text total cannot be paid: InputShape fault, no simulator charge', 'S02', r.kind === 'fault' && r.code === 'InputShape' && Object.keys(rec.bank).length === 0, {r, bank: rec.bank});
  await ctx.close();
};

sections.s03 = async browser => {
  const ctx = await browser.newContext({viewport: PHONE});
  const a = await open(ctx), b = await open(ctx);
  await fresh(a); await b.reload(); await b.evaluate(() => window.__shop.ready);
  await act(a, 'cart.inc', 'TOTE'); await act(a, 'review');
  // the same operation (key + intent) delivered from two pages at the state boundary
  const held = await a.evaluate(() => JSON.parse(JSON.stringify(window.__shop.mem.review)));
  await b.evaluate(h => { window.__shop.mem.review = h; location.hash = '#/review'; }, held);
  await b.waitForTimeout(200);
  await b.evaluate(h => { window.__shop.mem.review = h; }, held);
  const T = Date.now() + 300;
  const fire = (p) => p.evaluate(t => new Promise(res => setTimeout(async () => res(await window.__shop.act('place')), t - Date.now())), T);
  const [ra, rb] = await Promise.all([fire(a), fire(b)]);
  let rec = await record(a);
  check('same key + same intent from two pages: one order, one reservation', 'S03', ra.ok && rb.ok && rec.state.orders.length === 1 && rec.state.orders[0].key === held.key && inv(rec).TOTE.r === 1, {ra, rb, orders: rec.state.orders.map(o => o.key), inv: inv(rec)});
  // both pages pay the same order concurrently
  await go(a, '#/order/' + held.key); await go(b, '#/order/' + held.key);
  const T2 = Date.now() + 300;
  const pay = (p) => p.evaluate(([t, k]) => new Promise(res => setTimeout(async () => res(await window.__shop.act('pay', k)), t - Date.now())), [T2, held.key]);
  await Promise.all([pay(a), pay(b)]);
  rec = await record(a);
  check('two concurrent pay presses: one simulator charge, one stock consumption', 'S03', Object.keys(rec.bank).length === 1 && rec.bank[held.key + '-P1']?.amount === 120000 && inv(rec).TOTE.h === 1 && inv(rec).TOTE.r === 0 && rec.state.orders[0].phase === 'confirmed', {bank: rec.bank, inv: inv(rec)});
  // replay of the same place after payment: retrieves, does not reserve or charge again
  const before = await rawRecord(a);
  await a.evaluate(h => { window.__shop.mem.review = h; }, held);
  const replay = await act(a, 'place');
  check('replayed place after payment retrieves the paid order; state byte-identical', 'S03', replay.ok && await rawRecord(a) === before && a.url().endsWith('#/order/' + held.key), {replay});
  // changed intent under the same key refuses
  const changed = {key: held.key, intent: {currency: 'VND', lines: [{sku: 'TOTE', qty: 1, unit_price: 100000}], total: 100000}};
  await a.evaluate(h => { window.__shop.mem.review = h; location.hash = '#/'; }, changed);
  await a.waitForTimeout(150);
  await a.evaluate(h => { window.__shop.mem.review = h; }, changed);
  const r1 = await act(a, 'place');
  const notice = await a.textContent('[data-testid=notice]').catch(() => '');
  check('same key, different amount: IntentConflict, state byte-identical', 'S03', r1.code === 'IntentConflict' && await rawRecord(a) === before, {r1, notice});
  await shot(a, 's03-intent-conflict-390');
  // deliberate second identical purchase: new key, new reservation, new instruction
  await go(a, '#/');
  await act(a, 'cart.inc', 'TOTE'); await act(a, 'review'); const r2 = await act(a, 'place');
  rec = await record(a);
  const keys = rec.state.orders.map(o => o.key);
  await act(a, 'pay', keys[1]);
  rec = await record(a);
  check('deliberate identical second purchase gets a new identity and its own charge', 'S03', r2.ok && keys.length === 2 && keys[0] !== keys[1] && Object.keys(rec.bank).length === 2 && inv(rec).TOTE.h === 0, {keys, bank: rec.bank, inv: inv(rec)});
  await ctx.close();
};

// S04: two pages in one browser context race for the last unit at the state boundary.
async function raceArm(browser, arm) {
  const ctx = await browser.newContext({viewport: PHONE});
  await ctx.addInitScript(() => {
    // Test-only instrumentation, enabled per race by flags set just before the click.
    const getItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function (k) {
      const v = getItem.call(this, k);
      if (window.__widenMs && k === 'bp-shop-e2') { const t = performance.now(); while (performance.now() - t < window.__widenMs); }
      return v;
    };
    const request = LockManager.prototype.request;
    LockManager.prototype.request = function (name, a, b) {
      if (window.__noLock) { const cb = typeof a === 'function' ? a : b; return Promise.resolve().then(() => cb({name, mode: 'exclusive'})); }
      return b === undefined ? request.call(this, name, a) : request.call(this, name, a, b);
    };
  });
  const A = await open(ctx), B = await open(ctx);
  const results = [];
  for (let i = 0; i < RACE_N; i++) {
    await fresh(A); await B.goto(BASE + '#/'); await B.reload(); await B.evaluate(() => window.__shop.ready);
    // make TOTE's last unit the contested one: an earlier order holds 1 of H=2
    await act(A, 'cart.inc', 'TOTE'); await act(A, 'review'); await act(A, 'place');
    await act(A, 'cart.inc', 'TOTE'); await act(A, 'review');
    await go(B, '#/review');
    await B.waitForSelector('button[data-action=place]');
    const keys = [await A.evaluate(() => window.__shop.mem.review.key), await B.evaluate(() => window.__shop.mem.review.key)];
    const T = Date.now() + 250;
    const fire = p => p.evaluate(([t, widen, nolock]) => new Promise(res => setTimeout(() => {
      window.__widenMs = widen; window.__noLock = nolock;
      const n = window.__shop.acts; const clickedAt = Date.now();
      document.querySelector('button[data-action=place]').click();
      const iv = setInterval(() => { if (window.__shop.acts > n) { clearInterval(iv); window.__widenMs = 0; window.__noLock = false;
        const tr = window.__shop.trace.filter(x => x.label === 'place' && x.t0 >= clickedAt - 5).pop() ?? null;
        setTimeout(() => res({clickedAt, event: window.__shop.last, tx: tr, notice: document.querySelector('[data-testid=notice]')?.textContent ?? '', url: location.hash}), 300); } }, 2);
    }, t - Date.now())), [T, arm.widenMs, arm.noLock]);
    const [ra, rb] = await Promise.all([fire(A), fire(B)]);
    const rec = await record(A);
    const tote = inv(rec).TOTE;
    const okCount = [ra, rb].filter(r => r.event.ok).length;
    const holding = rec.state.orders.filter(o => ['ready', 'pending', 'unknown'].includes(o.phase)).reduce((s, o) => s + o.intent.lines.filter(l => l.sku === 'TOTE').reduce((x, l) => x + l.qty, 0), 0);
    const overlap = ra.tx && rb.tx ? Math.min(ra.tx.t1, rb.tx.t1) - Math.max(ra.tx.t0, rb.tx.t0) : null;
    const raceDetected = okCount > 1 || tote.r > tote.h || holding !== tote.r || rec.state.orders.length !== 1 + okCount;
    const loser = [ra, rb].find(r => !r.event.ok);
    const loserInformed = okCount === 1 && loser.event.code === 'OutOfStock' && loser.notice.includes('không còn đủ hàng');
    results.push({i, keys, okCount, loserInformed, loserNotice: loser?.notice ?? '', codes: [ra.event.code ?? 'ok', rb.event.code ?? 'ok'], tote, orders: rec.state.orders.length, clickSkewMs: Math.abs(ra.clickedAt - rb.clickedAt),
      txA: ra.tx && [Math.round(ra.tx.t0), Math.round(ra.tx.t1)], txB: rb.tx && [Math.round(rb.tx.t0), Math.round(rb.tx.t1)], txOverlapMs: overlap === null ? null : Math.round(overlap), raceDetected});
    if (i === 0) { await shot(A, `s04-${arm.name}-pageA`); await shot(B, `s04-${arm.name}-pageB`); }
  }
  await ctx.close();
  const detected = results.filter(r => r.raceDetected).length;
  const exactlyOne = results.filter(r => r.okCount === 1 && !r.raceDetected && r.loserInformed).length;
  return {arm: arm.name, lock: !arm.noLock, widenMs: arm.widenMs, iterations: results.length, exactlyOneWinner: exactlyOne, raceDetected: detected,
    maxClickSkewMs: Math.max(...results.map(r => r.clickSkewMs)), overlappingTransactions: results.filter(r => r.txOverlapMs > 0).length, results};
}

sections.s04 = async browser => {
  const arms = [
    {name: 'lock-natural', widenMs: 0, noLock: false},
    {name: 'lock-widened', widenMs: 40, noLock: false},
    {name: 'nolock-widened (negative control)', widenMs: 40, noLock: true},
    {name: 'nolock-natural (negative control)', widenMs: 0, noLock: true},
  ];
  const out = [];
  for (const arm of arms) {
    const r = await raceArm(browser, arm);
    out.push(r);
    if (arm.noLock) check(`negative control detects lost/duplicate reservation without the lock: ${arm.name}`, 'S04', r.raceDetected > 0, {iterations: r.iterations, detected: r.raceDetected, overlapping: r.overlappingTransactions});
    else check(`last unit never reserved twice with the kit lock: ${arm.name}`, 'S04', r.raceDetected === 0 && r.exactlyOneWinner === r.iterations, {iterations: r.iterations, exactlyOne: r.exactlyOneWinner, maxClickSkewMs: r.maxClickSkewMs, overlapping: r.overlappingTransactions});
  }
  return {arms: out};
};

sections.s05s07 = async browser => {
  const ctx = await browser.newContext({viewport: PHONE});
  const page = await open(ctx);
  await fresh(page);
  await setMode(page, 'lost');
  await click(page, '[data-sku=NOTEBOOK] button[data-action]');
  await go(page, '#/cart');
  await click(page, 'button[data-action=review]');
  await click(page, 'button[data-action=place]');
  const key = decodeURIComponent(page.url().split('#/order/')[1]);
  await click(page, 'button[data-action=pay]');
  let rec = await record(page);
  let g = await geometry(page);
  const ledger1 = JSON.stringify(rec.bank);
  check('lost reply: customer sees uncertainty, order and reservation preserved', 'S05', g.phase === 'unknown' && rec.state.orders[0].phase === 'unknown' && inv(rec).NOTEBOOK.r === 1 && inv(rec).NOTEBOOK.h === 5, {g, inv: inv(rec)});
  check('lost reply: simulator recorded exactly one charge (confirmed) for the single instruction', 'S05', Object.keys(rec.bank).length === 1 && rec.bank[key + '-P1']?.status === 'confirmed', {bank: rec.bank});
  await shot(page, 's05-unknown-390');
  // reload during uncertainty
  await page.reload(); await page.evaluate(() => window.__shop.ready);
  g = await geometry(page);
  const ref = await page.textContent('[data-testid=order-ref]');
  check('reload restores the same order and offers recovery', 'S07', g.phase === 'unknown' && ref.includes(key) && g.primaryText === 'Kiểm tra lại thanh toán' && aboveFold(g), {g, ref});
  await shot(page, 's07-after-reload-390');
  // a second reload from the browse page still leads back to the order
  await go(page, '#/'); await page.reload(); await page.evaluate(() => window.__shop.ready);
  const orderLink = await page.getAttribute('a.order', 'href');
  check('after reload on browse, the unknown order is listed with a link to recovery', 'S07', orderLink === '#/order/' + key, {orderLink});
  await page.click('a.order'); await page.waitForTimeout(200);
  // inquiry unavailable
  await setMode(page, 'unavailable');
  await click(page, 'button[data-action=check]');
  rec = await record(page);
  g = await geometry(page);
  check('inquiry unavailable: still unknown, follow-up copy, reservation held, no new charge', 'S05', g.phase === 'unknown' && g.statusText.includes('Hệ thống thanh toán chưa phản hồi') && inv(rec).NOTEBOOK.r === 1 && JSON.stringify(rec.bank) === ledger1 && rec.state.orders[0].inquiries === 1, {g, bank: rec.bank});
  await shot(page, 's05-still-unknown-390');
  await page.reload(); await page.evaluate(() => window.__shop.ready);
  // reconcile: two pages press the recovery action at the same moment
  await setMode(page, 'accept');
  const other = await open(ctx, '#/order/' + key);
  const T = Date.now() + 300;
  const press = p => p.evaluate(t => new Promise(res => setTimeout(() => { const n = window.__shop.acts; document.querySelector('button[data-action=check]').click(); const iv = setInterval(() => { if (window.__shop.acts > n) { clearInterval(iv); res(window.__shop.events[0]); } }, 2); }, t - Date.now())), T);
  const [r1, r2] = await Promise.all([press(page), press(other)]);
  rec = await record(page);
  g = await geometry(page);
  check('recovery reconciles to confirmed with the same instruction; no fresh charge; stock consumed once', 'S05', g.phase === 'confirmed' && JSON.stringify(rec.bank) === ledger1 && inv(rec).NOTEBOOK.h === 4 && inv(rec).NOTEBOOK.r === 0 && rec.state.orders.length === 1, {r1, r2, bank: rec.bank, inv: inv(rec), inquiries: rec.state.orders[0].inquiries});
  await shot(page, 's05-reconciled-390');
  // recovery pressed again after the outcome is known: nothing happens
  const before = await rawRecord(page);
  const again = await act(page, 'check', key);
  check('recovery pressed again after confirmation: no effect, state byte-identical', 'S05', again.ok && await rawRecord(page) === before, {again});
  await ctx.close();
};

sections.s06 = async browser => {
  const ctx = await browser.newContext({viewport: PHONE});
  const a = await open(ctx);
  await fresh(a);
  await setMode(a, 'decline');
  await act(a, 'cart.inc', 'TOTE'); await act(a, 'cart.inc', 'TOTE'); await act(a, 'review'); await act(a, 'place');
  let rec = await record(a);
  const key = rec.state.orders[0].key;
  check('reserved 2 TOTE', 'S06', inv(rec).TOTE.r === 2, {inv: inv(rec)});
  const b = await open(ctx, '#/order/' + key);
  await go(a, '#/order/' + key);
  const T = Date.now() + 300;
  const pay = p => p.evaluate(([t, k]) => new Promise(res => setTimeout(async () => res(await window.__shop.act('pay', k)), t - Date.now())), [T, key]);
  await Promise.all([pay(a), pay(b)]);
  rec = await record(a);
  check('definite decline from two concurrent pay presses releases the reservation once', 'S06', rec.state.orders[0].phase === 'declined' && inv(rec).TOTE.r === 0 && inv(rec).TOTE.h === 2 && Object.keys(rec.bank).length === 1 && rec.bank[key + '-P1'].status === 'declined', {inv: inv(rec), bank: rec.bank});
  let before = await rawRecord(a);
  for (const name of ['check', 'pay', 'cancel']) await act(a, name, key);
  check('repeating check/pay/cancel on a declined order changes nothing (no second release)', 'S06', await rawRecord(a) === before, {});
  await ctx.close();
};

async function importFile(page, file, viaChooser = true) {
  await go(page, '#/test-desk');
  await page.waitForSelector('[data-testid=supplier-file]');
  await page.setInputFiles('[data-testid=supplier-file]', file);
  await page.waitForFunction(() => document.querySelector('[data-testid=import-preview],[data-testid=import-error]'));
  return {verdict: await page.textContent('[data-testid=import-verdict]').catch(() => null), error: await page.textContent('[data-testid=import-error]').catch(() => null),
    meaning: await page.textContent('[data-testid=import-meaning]').catch(() => null), canConfirm: await page.isVisible('[data-testid=import-confirm]'),
    text: await page.innerText('.desk'), preview: await page.innerText('[data-testid=import-preview]').catch(() => '')};
}
const fx = n => path.join(SHOP, 'fixtures', n);

sections.import = async browser => {
  for (const [vp, size] of [['390', PHONE], ['1280', DESKTOP]]) {
    const ctx = await browser.newContext({viewport: size});
    const a = await open(ctx);
    await fresh(a);
    // S-T1: H=2, R=1, snapshot says 3
    await act(a, 'cart.inc', 'TOTE'); await act(a, 'review'); await act(a, 'place');
    let res = await importFile(a, fx('supplier-tote3.csv'));
    const row = res.preview.split('\n').find(l => l.startsWith('TOTE'));
    check(`S-T1 preview: TOTE H 2, R 1, H new 3, A new 2 with meaning sentence (${vp})`, 'S06', res.canConfirm && res.meaning.includes('physical unsold units, including units reserved') && /TOTE\s+2\s+1\s+1\s+3\s+2/.test(row), {row, verdict: res.verdict});
    await shot(a, `imp01-preview-tote3-${vp}`, {fullPage: true});
    await a.click('[data-testid=import-confirm]');
    await a.waitForSelector('[data-testid=import-result]');
    let rec = await record(a);
    check(`S-T1 confirmed: H=3, R=1, A=2 (${vp})`, 'S06', inv(rec).TOTE.h === 3 && inv(rec).TOTE.r === 1 && inv(rec).TOTE.a === 2 && inv(rec).NOTEBOOK.h === 5 && inv(rec).PEN.h === 8, {inv: inv(rec)});
    await shot(a, `imp02-applied-${vp}`, {fullPage: true});
    // below reserved: reserve 2 more TOTE (R=3), snapshot TOTE=1 -> reject unchanged
    await go(a, '#/'); await act(a, 'cart.inc', 'TOTE'); await act(a, 'cart.inc', 'TOTE'); await act(a, 'review'); await act(a, 'place');
    let before = await rawRecord(a);
    res = await importFile(a, fx('supplier-tote-below.csv'));
    check(`snapshot below reserved rejected, no confirm offered, state byte-identical (${vp})`, 'S06', !res.canConfirm && res.text.includes('TOTE: new on-hand 1 is below reserved 3') && await rawRecord(a) === before, {verdict: res.verdict});
    await shot(a, `imp03-below-reserved-${vp}`, {fullPage: true});
    if (vp !== '390') { await ctx.close(); continue; }
    // other rejections, all with the state unchanged
    for (const [file, expect, label] of [
      ['supplier-missing-tote.csv', 'Missing SKU TOTE', 'missing SKU (R-S2)'],
      ['supplier-extra-sku.csv', 'Unknown SKU ERASER', 'extra SKU (R-S2)'],
      ['supplier-malformed.csv', 'MalformedCSV', 'malformed CSV'],
      ['supplier-not-utf8.csv', 'not valid UTF-8', 'non-UTF-8 bytes'],
      [path.join(SHOP, '../kit/dnode-e1-kit/dist/fixtures/supplier-invalid.csv'), 'Record 2, QTY_ON_HAND', 'kit invalid fixture: located diagnostics'],
    ]) {
      res = await importFile(a, file.includes('/') ? file : fx(file));
      check(`rejected: ${label}; state unchanged`, 'S06', !res.canConfirm && res.text.includes(expect) && await rawRecord(a) === before, {verdict: res.verdict, error: res.error});
      await shot(a, `imp-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-390`, {fullPage: true});
    }
    const big = path.join(SHOP, 'evidence', 'tmp-big.csv');
    fs.writeFileSync(big, 'SKU,NAME,PRICE_VND,QTY_ON_HAND\n' + 'X'.repeat(1048576) + '\n');
    res = await importFile(a, big); fs.unlinkSync(big);
    check('rejected: over 1 MiB before decoding; state unchanged', 'S06', !res.canConfirm && res.error.includes('FileTooLarge') && await rawRecord(a) === before, {error: res.error});
    // valid kit fixture: R=3 for TOTE but file says 2 -> rejected; release by cancelling the open orders first
    rec = await record(a);
    for (const o of rec.state.orders) if (o.phase === 'ready') await act(a, 'cancel', o.key);
    before = await rawRecord(a);
    res = await importFile(a, path.join(SHOP, '../kit/dnode-e1-kit/dist/fixtures/supplier-valid.csv'));
    check('kit valid fixture: accepted; supplier name difference shown as not applied', 'S06', res.canConfirm && res.text.includes('supplier name/price differ: not applied in E1'), {verdict: res.verdict});
    // PreviewChanged: another page reserves after the preview but before confirmation
    const b = await open(ctx);
    await act(b, 'cart.inc', 'PEN'); await act(b, 'review'); await act(b, 'place');
    const mid = await rawRecord(a);
    await a.click('[data-testid=import-confirm]');
    await a.waitForSelector('[data-testid=import-error]');
    const err = await a.textContent('[data-testid=import-error]');
    check('stock changed between preview and confirm: PreviewChanged, state unchanged', 'S06', err.includes('PreviewChanged') && await rawRecord(a) === mid, {err});
    res = await importFile(a, path.join(SHOP, '../kit/dnode-e1-kit/dist/fixtures/supplier-valid.csv'));
    await a.click('[data-testid=import-confirm]');
    await a.waitForSelector('[data-testid=import-result]');
    rec = await record(a);
    check('kit valid fixture confirmed: H replaced, R kept, name and price not applied', 'S06', inv(rec).NOTEBOOK.h === 5 && inv(rec).PEN.h === 8 && inv(rec).PEN.r === 1 && inv(rec).TOTE.h === 2 && rec.state.catalogue[0].name === 'Notebook', {inv: inv(rec)});
    res = await importFile(a, fx('supplier-bom-crlf.csv'));
    check('BOM + CRLF + quoted/escaped name + leading zeros accepted by the shared definition', 'S06', res.canConfirm && res.text.includes('Pen, "fine"'), {verdict: res.verdict});
    await ctx.close();
  }
};

// Measure only (R0.5): no threshold is asserted. Latency from click to rendered result.
sections.timing = async browser => {
  const out = {};
  for (const [vp, size] of [['390', PHONE], ['1280', DESKTOP]]) {
    const ctx = await browser.newContext({viewport: size});
    const page = await open(ctx);
    const t = {admitAndFirstRenderMs: null, cartIncMs: [], placeMs: [], payMs: []};
    const p2 = await ctx.newPage(); const nav = Date.now(); await p2.goto(BASE + '#/'); await p2.evaluate(() => window.__shop.ready); t.admitAndFirstRenderMs = Date.now() - nav; await p2.close();
    for (let i = 0; i < 5; i++) {
      await fresh(page);
      const timed = async (sel, arr) => { const t0 = Date.now(); await click(page, sel); arr.push(Date.now() - t0); };
      await timed('[data-sku=PEN] button[data-action]', t.cartIncMs);
      await go(page, '#/cart'); await click(page, 'button[data-action=review]');
      await timed('button[data-action=place]', t.placeMs);
      await timed('button[data-action=pay]', t.payMs);
    }
    const med = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
    out[vp] = {...t, median: {cartIncMs: med(t.cartIncMs), placeMs: med(t.placeMs), payMs: med(t.payMs)}};
    await ctx.close();
  }
  check('timings recorded (measure only, no threshold)', 'R0.5', true, out);
  return {timing: out, device: process.platform + ' ' + require('os').cpus()[0].model + ' x' + require('os').cpus().length};
};

(async () => {
  fs.mkdirSync(SHOTS, {recursive: true});
  const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(sections);
  const browser = await chromium.launch();
  const version = browser.version();
  for (const name of wanted) {
    checks = [];
    const started = new Date().toISOString();
    let extra = {}, error = null;
    try { extra = (await sections[name](browser)) ?? {}; } catch (e) { error = String(e.stack ?? e); console.log('ERROR', name, error); }
    const result = {section: name, browser: 'Chromium ' + version + ' headless (Playwright)', started, finished: new Date().toISOString(), base: BASE,
      passed: checks.filter(c => c.pass).length, failed: checks.filter(c => !c.pass).length, error, checks, ...extra};
    fs.writeFileSync(path.join(SHOP, 'evidence', `drive-${name}.json`), JSON.stringify(result, null, 1));
    console.log(`== ${name}: ${result.passed} passed, ${result.failed} failed${error ? ', ERROR' : ''}`);
  }
  await browser.close();
})();
