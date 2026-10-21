// BP-SHOP host (E2.1 Phase B).
// Host responsibilities only: kit admission, rendering DNode screen blocks,
// input capture, SessionStore persistence, file bytes, and dispatching DNode
// effect intents to the kit's simulatedBank. Every business decision (cart,
// prices, intent, reservation, payment transitions, supplier meaning, which
// action comes next, all customer wording) is made by shop.core / shop.view.
import {compile, Runtime, json} from '/kit/runtime/engine.js';
import {verifyBundle, sha} from '/kit/runtime/admission.js';
import {SessionStore, simulatedBank, dispatch} from '/kit/runtime/host.js';

const TRUST_FINGERPRINT = '4c7716c7b528dfcdba2190c27516a09e057334309f1fb0b9a8785991cfca0244'; // in-kit, self-referential (R0.2)
const APP_ROOTS = ['shop.core.node', 'shop.view.node'];
const STORE_KEY = 'bp-shop-e2';
const MAX_FILE = 1048576;

const app = document.getElementById('app');
const store = new SessionStore(STORE_KEY);
const pageId = Math.random().toString(36).slice(2, 8);
const mem = {review: null, notice: '', desk: {}};
const events = [];
let rt = null, admission = null, busy = false;

// ------------------------------------------------------------------ admission
const fetchText = async url => { const r = await fetch(url, {cache: 'no-store'}); if (!r.ok) throw Error('Missing ' + url); return r.text(); };

async function admit() {
  if (!window.isSecureContext || !navigator.locks) throw Error('HostUnsupported: Web Locks need a secure context (use http://127.0.0.1)');
  const key = JSON.parse(await fetchText('/kit/generated/trust-key.json'));
  const fingerprint = await sha(json(key));
  if (fingerprint !== TRUST_FINGERPRINT) throw Error('AdmissionDenied: trust key fingerprint ' + fingerprint);
  const {release, texts} = await verifyBundle(p => fetchText('/kit/' + p), key);
  const lock = JSON.parse(await fetchText('app-lock.json'));
  const appTexts = [], appHashes = {};
  for (const f of APP_ROOTS) {
    const t = await fetchText(f);
    appHashes[f] = await sha(t);
    if (appHashes[f] !== lock[f]) throw Error('AdmissionDenied: ' + f + ' does not match app-lock.json');
    appTexts.push(t);
  }
  const kitRoots = Object.entries(texts).filter(([p]) => p.startsWith('roots/') && p.endsWith('.node')).map(([, s]) => s);
  rt = new Runtime(compile([...kitRoots, ...appTexts]), JSON.parse(texts['profiles/browser.json']));
  admission = {release: release.attestation, fingerprint, appHashes};
}

// ------------------------------------------------------------------ DNode calls
const call = (name, ...args) => rt.run(name, args);
const out = (name, ...args) => call(name, ...args).out;

// One serialized read/check/write of the session record (Web Locks + localStorage).
function tx(label, fn) {
  return store.transaction(async rec => {
    const t0 = performance.timeOrigin + performance.now();
    let ok = false;
    try {
      if (rec.state === null) rec.state = out('shop.initial');
      const result = await fn(rec);
      ok = true;
      return result;
    } finally {
      window.__shop.trace.push({page: pageId, label, ok, t0, t1: performance.timeOrigin + performance.now()});
    }
  });
}

// Effect step as one transaction (C-S1/R-S4): DNode node -> dispatch -> DNode apply.
async function effectful(rec, node, key) {
  const first = call(node, rec.state, key);
  let state = first.out;
  const replies = await dispatch(rt, first.effects, e => simulatedBank(e, rec));
  for (const reply of replies) state = out('shop.payment_apply', state, key, reply);
  rec.state = state;
  return replies;
}

// ------------------------------------------------------------------ actions (wiring only)
const actions = {
  'go': async route => { location.hash = route; },
  'cart.inc': sku => tx('cart.inc', r => { r.state = out('shop.cart_inc', r.state, sku); }),
  'cart.dec': sku => tx('cart.dec', r => { r.state = out('shop.cart_dec', r.state, sku); }),
  'review': async () => { await enterReview(); location.hash = '#/review'; },
  'place': async () => {
    const {key, intent} = mem.review ?? {key: '', intent: null};
    const placed = await tx('place', r => { const p = out('shop.order_place', r.state, key, intent); r.state = p.state; return p.order.key; });
    mem.review = null;
    location.hash = '#/order/' + placed;
  },
  'pay': key => tx('pay', r => effectful(r, 'shop.payment_submit', key)),
  'check': key => tx('check', r => effectful(r, 'shop.payment_reconcile', key)),
  'cancel': key => tx('cancel', r => { r.state = out('shop.order_cancel', r.state, key); }),
  'reorder': async key => { await tx('reorder', r => { r.state = out('shop.cart_from_order', r.state, key); }); location.hash = '#/cart'; },
};

async function enterReview() {
  mem.review = await tx('review', r => {
    const p = out('shop.checkout_enter', r.state, mem.review?.key ?? '');
    r.state = p.state;
    return {key: p.key, intent: p.intent};
  });
}

async function act(name, arg = '', button = null) {
  if (busy || !actions[name]) return {ok: false, code: 'Busy'};
  busy = true;
  mem.notice = '';
  for (const b of app.querySelectorAll('button')) b.disabled = true;
  if (button?.dataset.busy) button.textContent = button.dataset.busy;
  let result;
  try { await actions[name](arg); result = {ok: true}; }
  catch (e) {
    const code = e.kind === 'refused' ? e.code : 'Fault';
    mem.notice = out('shop.v.refusal_text', code);
    result = {ok: false, code: e.code ?? 'Error', kind: e.kind ?? 'error', message: String(e.message)};
  }
  events.unshift({t: new Date().toISOString(), page: pageId, action: name, arg, ...result});
  events.length = Math.min(events.length, 30);
  busy = false;
  window.__shop.last = {action: name, ...result};
  await render();
  window.__shop.acts++;
  return result;
}

// ------------------------------------------------------------------ rendering
function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null && v !== false) n.setAttribute(k, v === true ? '' : v);
  for (const k of kids.flat()) if (k !== null && k !== undefined && k !== '') n.append(k instanceof Node ? k : String(k));
  return n;
}
const button = (label, action, arg, cls, busyLabel, extra = {}) =>
  el('button', {class: 'btn ' + cls, 'data-action': action || undefined, 'data-arg': arg, 'data-busy': busyLabel || undefined, disabled: !action, ...extra}, label);

// D-S5 icon shapes (tone -> shape; colour comes from CSS; text carries meaning too).
const ICONS = {
  confirmed: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#1E6B3A"/><path d="M11 21l6 6 12-13" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  declined: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M13 2h14l11 11v14L27 38H13L2 27V13z" fill="#A1281E"/><path d="M14 14l12 12M26 14L14 26" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>',
  unknown: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M10 3h20M10 37h20M12 3c0 10 16 10 16 17S12 27 12 37M28 3c0 10-16 10-16 17s16 7 16 17" fill="none" stroke="#33547A" stroke-width="3" stroke-linecap="round"/><path d="M15 33h10l-5-5z" fill="#33547A"/></svg>',
  ready: '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="7" y="3" width="26" height="34" rx="3" fill="none" stroke="#1F4E79" stroke-width="3"/><path d="M13 13h14M13 20h14M13 27h8" stroke="#1F4E79" stroke-width="3" stroke-linecap="round"/></svg>',
  cancelled: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="none" stroke="#5B5B5B" stroke-width="3"/><path d="M8 32L32 8" stroke="#5B5B5B" stroke-width="3"/></svg>',
};
ICONS.pending = ICONS.unknown;

function block(b) {
  switch (b.kind) {
    case 'title': return el('h1', {}, b.text);
    case 'heading': return el('h2', {}, b.text);
    case 'para': return el('p', {}, b.text);
    case 'note': return el('p', {class: 'note'}, b.text);
    case 'ref': return el('p', {class: 'ref', 'data-testid': 'order-ref'}, b.text);
    case 'total': return el('div', {class: 'total', 'data-testid': 'total'}, el('span', {}, b.text), el('span', {class: 'amt'}, b.note));
    case 'line': return el('div', {class: 'card'}, el('div', {class: 'row'}, el('strong', {}, b.text), el('span', {class: 'amt'}, b.note)), el('div', {class: 'note'}, b.extra));
    case 'product': return el('div', {class: 'card product' + (b.tone ? ' ' + b.tone : ''), 'data-sku': b.arg},
      el('div', {class: 'row'}, el('h3', {}, b.text), el('span', {class: 'price'}, b.note)),
      el('p', {class: 'note'}, b.extra), button(b.label, b.action, b.arg, 'secondary'));
    case 'stepper': return el('div', {class: 'card', 'data-sku': b.arg},
      el('div', {class: 'row'}, el('strong', {}, b.text), el('span', {class: 'amt'}, b.note)),
      el('div', {class: b.tone === 'warn' ? 'note warn' : 'note'}, b.extra),
      el('div', {class: 'stepper'},
        el('button', {'data-action': b.action2 || undefined, 'data-arg': b.arg, disabled: !b.action2, 'aria-label': 'Giảm ' + b.text}, '−'),
        el('span', {class: 'qty', 'aria-label': 'Số lượng'}, b.label),
        el('button', {'data-action': b.action || undefined, 'data-arg': b.arg, disabled: !b.action, 'aria-label': 'Tăng ' + b.text}, '+')));
    case 'status': {
      const card = el('div', {class: 'status ' + b.tone, role: 'status', 'data-testid': 'status', 'data-phase': b.tone},
        el('div', {}, el('h2', {}, b.text), el('p', {}, b.note), b.extra ? el('p', {}, b.extra) : ''));
      card.insertAdjacentHTML('afterbegin', ICONS[b.tone] ?? '');
      return card;
    }
    case 'order': return el('a', {class: 'card order', href: b.arg},
      el('div', {class: 'row'}, el('strong', {}, b.text), el('span', {class: 'amt'}, b.note)),
      el('div', {class: 'row'}, el('span', {class: 'pill ' + b.tone}, b.extra), el('span', {class: 'note'}, b.label + ' ›')));
    case 'button': return button(b.text, b.action, b.arg, b.tone, b.note, b.tone === 'primary' ? {'data-testid': 'primary'} : {});
    default: return el('p', {}, b.text);
  }
}

function screen(s, notice) {
  document.title = s.title;
  document.getElementById('cartlink').textContent = s.cart_count > 0 ? `Giỏ hàng (${s.cart_count})` : 'Giỏ hàng';
  app.replaceChildren(...(notice ? [el('div', {class: 'notice', role: 'alert', 'data-testid': 'notice'}, notice)] : []), ...s.blocks.map(block));
}

async function render() {
  const route = location.hash || '#/';
  const notice = mem.notice;
  mem.notice = '';
  if (route === '#/test-desk') return renderDesk();
  try {
    if (route === '#/review') await enterReview();
    const s = await tx('render', r =>
      route === '#/cart' ? out('shop.v.cart', r.state)
      : route === '#/review' ? out('shop.v.review', r.state, mem.review.intent)
      : route.startsWith('#/order/') ? out('shop.v.order', r.state, decodeURIComponent(route.slice(8)))
      : out('shop.v.browse', r.state));
    screen(s, notice);
  } catch (e) {
    // Refusal while rendering (e.g. review of an empty cart, unknown order): show the
    // DNode message on the browse or cart screen. Faults go to the test desk log.
    events.unshift({t: new Date().toISOString(), page: pageId, action: 'render ' + route, ok: false, code: e.code ?? 'Error', kind: e.kind ?? 'error', message: String(e.message)});
    const msg = out('shop.v.refusal_text', e.kind === 'refused' ? e.code : 'Fault');
    // Keep the message of the action that just failed (e.g. OutOfStock) rather than the follow-up one.
    if (route === '#/review') { mem.notice = notice || msg; location.hash = '#/cart'; return; }
    const s = await tx('render', r => out('shop.v.browse', r.state)).catch(() => null);
    if (s) screen(s, notice || msg); else app.replaceChildren(el('div', {class: 'notice', role: 'alert', 'data-testid': 'notice'}, msg));
  }
}

// ------------------------------------------------------------------ test desk (English, diagnostics)
const table = t => el('div', {class: 'scroll'}, el('table', {}, el('thead', {}, el('tr', {}, t.head.map(h => el('th', {}, h)))),
  el('tbody', {}, t.rows.map(r => el('tr', {}, r.map(c => el('td', {}, c)))))));
const small = (label, onclick, attrs = {}) => { const b = el('button', {class: 'small', ...attrs}, label); b.onclick = onclick; return b; };

async function renderDesk() {
  document.title = 'Test desk — BP-SHOP';
  const d = mem.desk;
  const rec = await tx('desk', r => JSON.parse(JSON.stringify(r)));
  const st = rec.state;
  const A = admission;
  const ledger = Object.entries(rec.bank ?? {});
  const modes = ['accept', 'decline', 'lost', 'unavailable'].map(m => {
    const input = el('input', {type: 'radio', name: 'mode', value: m, checked: rec.mode === m, 'data-testid': 'mode-' + m});
    input.onchange = () => setMode(m);
    return el('label', {}, input, m);
  });
  const fileInput = el('input', {type: 'file', accept: '.csv,text/csv', 'data-testid': 'supplier-file'});
  fileInput.onchange = async () => { const f = fileInput.files[0]; if (f) { await chooseFile(f.name, await f.arrayBuffer()); } };
  // A corrupt stored state faults every DNode view; the desk must still offer the reset.
  const safe = f => { try { return f(); } catch (e) { return {fault: (e.code ?? 'Error') + ': ' + e.message}; } };
  const tables = [safe(() => out('shop.v.desk_inventory', st)), safe(() => out('shop.v.desk_orders', st))];
  const preview = d.preview ? safe(() => out('shop.v.desk_preview', st, d.preview)) : null;
  document.getElementById('cartlink').textContent = 'Giỏ hàng';
  app.replaceChildren(el('div', {class: 'desk'},
    el('h1', {}, 'Test desk'),
    el('p', {class: 'note'}, 'Diagnostics for testers and the shop operator. Not part of the customer checkout.'),
    el('h2', {}, 'Kit admission'),
    el('p', {class: 'ok'}, 'VERIFIED with verifyBundle before any node ran.'),
    table({head: ['Item', 'Identity (SHA-256)'], rows: [
      ['distribution', A.release.distribution + ' / spec ' + A.release.specification],
      ['runtime identity', A.release.runtimeIdentity],
      ['trust key fingerprint (in-kit, self-referential)', A.fingerprint],
      ...Object.entries(A.release.rootHashes).map(([k, v]) => ['root ' + k, v]),
      ...Object.entries(A.appHashes).map(([k, v]) => ['app file ' + k, v])]}),
    el('h2', {}, 'Payment simulator'),
    el('div', {}, modes),
    el('p', {class: 'note'}, 'accept: charge confirmed. decline: charge declined. lost: bank records confirmed but the reply is lost (unknown). unavailable: inquiries answer unknown.'),
    el('h2', {}, 'Charge ledger (test inspection only; application code never reads it)'),
    table({head: ['Instruction id', 'Amount VND', 'Status'], rows: ledger.length ? ledger.map(([k, v]) => [k, String(v.amount), v.status]) : [['(none)', '', '']]}),
    el('h2', {}, 'State'),
    tables.map(t => t.fault ? el('p', {class: 'bad', 'data-testid': 'state-fault'}, 'Stored state rejected by shop.core (' + t.fault + '). Use "Reset test session" below.') : table(t)),
    el('h2', {}, 'Supplier stock import (operator)'),
    el('p', {}, 'Choose a supplier CSV (SKU,NAME,PRICE_VND,QTY_ON_HAND). It is checked by the shared supplier.from_csv definition, then by the shop. Nothing changes until you confirm.'),
    fileInput,
    el('div', {}, small('Kit fixture: supplier-valid.csv', () => loadFixture('/kit/fixtures/supplier-valid.csv')),
      small('Kit fixture: supplier-invalid.csv', () => loadFixture('/kit/fixtures/supplier-invalid.csv'))),
    d.error ? el('p', {class: 'bad', 'data-testid': 'import-error'}, d.error) : '',
    d.file ? el('p', {class: 'note'}, `File ${d.file.name}: ${d.file.size} bytes, SHA-256 ${d.file.hash}`) : '',
    preview?.fault ? el('p', {class: 'bad'}, preview.fault) : preview ? el('div', {'data-testid': 'import-preview'},
      el('p', {class: preview.ok ? 'ok' : 'bad', 'data-testid': 'import-verdict'}, preview.verdict),
      el('p', {'data-testid': 'import-meaning'}, el('strong', {}, 'Meaning: '), preview.meaning),
      preview.problems.length ? el('ul', {}, preview.problems.map(p => el('li', {}, p))) : '',
      table(preview.table),
      preview.ok ? small('Confirm whole snapshot', confirmImport, {'data-testid': 'import-confirm'}) : '',
      small('Discard', () => { mem.desk = {}; renderDesk(); })) : '',
    d.result ? el('p', {class: 'ok', 'data-testid': 'import-result'}, d.result) : '',
    el('h2', {}, 'Session'),
    small('Reset test session', resetSession, {'data-testid': 'reset'}),
    el('p', {class: 'note'}, 'Reset clears the stored shop state, the simulator ledger and the mode (explicit session reset).'),
    el('details', {}, el('summary', {}, 'Raw session record'), el('pre', {}, JSON.stringify(rec, null, 1))),
    el('h2', {}, 'Event log (this page)'),
    table({head: ['Time', 'Page', 'Action', 'Arg', 'Outcome'], rows: events.map(e => [e.t.slice(11, 19), e.page, e.action, e.arg ?? '', e.ok ? 'ok' : `${e.kind} ${e.code}: ${e.message ?? ''}`])}),
  ));
}

async function setMode(mode) { await tx('mode', r => { r.mode = mode; }); await renderDesk(); }

async function resetSession() {
  await tx('reset', r => { r.state = out('shop.initial'); r.bank = {}; r.mode = 'accept'; });
  mem.review = null; mem.desk = {};
  await renderDesk();
}

async function loadFixture(url) { const r = await fetch(url, {cache: 'no-store'}); await chooseFile(url.split('/').pop(), await r.arrayBuffer()); }

// Host file-bytes responsibility (R-S1): size limit before decoding, strict UTF-8.
async function chooseFile(name, bytes) {
  mem.desk = {};
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2, '0')).join('');
  mem.desk.file = {name, size: bytes.byteLength, hash};
  if (bytes.byteLength > MAX_FILE) { mem.desk.error = 'FileTooLarge: over 1 MiB (checked by the host before decoding). Nothing was changed.'; return renderDesk(); }
  let text;
  try { text = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(bytes); }
  catch { mem.desk.error = 'The file is not valid UTF-8 (strict decoder). Nothing was changed.'; return renderDesk(); }
  try { mem.desk.preview = await tx('preview', r => out('shop.stock_preview', r.state, text)); mem.desk.text = text; }
  catch (e) { mem.desk.error = e.kind === 'refused' ? out('shop.v.desk_refusal', e.code) : 'Fault ' + e.code + ': ' + e.message + '. Nothing was changed.'; }
  events.unshift({t: new Date().toISOString(), page: pageId, action: 'import.preview', arg: name, ok: !mem.desk.error, code: mem.desk.error ? 'see desk' : ''});
  return renderDesk();
}

async function confirmImport() {
  const d = mem.desk;
  try {
    await tx('import', r => { r.state = out('shop.stock_import', r.state, d.text, d.preview); });
    mem.desk = {result: `Snapshot ${d.file.name} applied (SHA-256 ${d.file.hash.slice(0, 16)}…). Available quantities are updated in the inventory table above.`};
    events.unshift({t: new Date().toISOString(), page: pageId, action: 'import.confirm', arg: d.file.name, ok: true});
  } catch (e) {
    mem.desk = {error: e.kind === 'refused' ? out('shop.v.desk_refusal', e.code) : 'Fault ' + e.code + ': ' + e.message + '. Nothing was changed.'};
    events.unshift({t: new Date().toISOString(), page: pageId, action: 'import.confirm', arg: d.file?.name, ok: false, code: e.code});
  }
  return renderDesk();
}

// ------------------------------------------------------------------ boot
app.addEventListener('click', e => {
  const b = e.target.closest('button[data-action]');
  if (b && !b.disabled) act(b.dataset.action, b.dataset.arg ?? '', b);
});
window.addEventListener('hashchange', () => { window.scrollTo(0, 0); if (!busy) render(); });
window.addEventListener('storage', e => { if (e.key === STORE_KEY && !busy && rt) render(); });

window.__shop = {trace: [], events, act, mem, acts: 0, pageId, storeKey: STORE_KEY, ready: null}; // test observability handle (read by drives; app logic never uses it)
window.__shop.ready = admit().then(render).then(() => 'ready', e => {
  document.body.replaceChildren(el('div', {class: 'fatal', role: 'alert', 'data-testid': 'admission-failed'},
    el('h1', {}, 'Không thể mở cửa hàng'),
    el('p', {}, 'Bộ chạy DNode không vượt qua kiểm tra toàn vẹn, nên cửa hàng không chạy và không có dữ liệu nào bị thay đổi.'),
    el('p', {class: 'note', lang: 'en'}, 'Admission failed; nothing was executed. ' + e.message)));
  return 'refused: ' + e.message;
});
