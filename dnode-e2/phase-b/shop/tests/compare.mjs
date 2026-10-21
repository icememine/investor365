// Replays the oracle's scenarios through the DNode shop roots with the kit's
// simulatedBank + dispatch (sequential; no Web Locks in Node), comparing every
// step's outcome and resulting H/R/phases/ledger. Writes evidence/oracle-compare.json.
import fs from 'node:fs';
import path from 'node:path';
import {load, outcome, engine, host, SHOP} from './load.mjs';

const {runtime} = await load();
const cases = JSON.parse(fs.readFileSync(path.join(SHOP, 'evidence/oracle-cases.json'), 'utf8'));
const NAMES = {NOTEBOOK: 'Notebook', PEN: 'Pen', TOTE: 'Tote bag', ERASER: 'Eraser'};
const PRICES = {NOTEBOOK: '50000', PEN: '20000', TOTE: '120000', ERASER: '5000'};
const run = (n, a) => runtime.run(n, a);

function view(store, keys) {
  const s = store.state;
  return {
    H: Object.fromEntries(s.catalogue.map(i => [i.sku, i.h])),
    R: Object.fromEntries(s.catalogue.map(i => [i.sku, i.r])),
    phases: keys.map(k => s.orders.find(o => o.key === k).phase),
    ledger: Object.fromEntries(Object.keys(store.bank).sort().map(k => [k, {amount: store.bank[k].amount, status: store.bank[k].status}])),
  };
}

// One effectful step exactly as app.js does it: node -> dispatch -> apply.
async function effectful(store, node, key) {
  const first = run(node, [store.state, key]);
  let st = first.out;
  const replies = await host.dispatch(runtime, first.effects, e => host.simulatedBank(e, store));
  for (const reply of replies) st = run('shop.payment_apply', [st, key, reply]).out;
  return {state: st, effects: first.effects.length, replies};
}

async function step(store, keys, op) {
  const s0 = store.state;
  try {
    if (op.op === 'place') {
      const withCart = {...s0, cart: op.lines};
      const prep = run('shop.checkout_prepare', [withCart]).out;
      store.state = prep.state;               // the minted key is kept even if placing fails
      const placed = run('shop.order_place', [prep.state, prep.key, prep.intent]).out;
      store.state = placed.state;
      keys.push(placed.order.key);
      return {ok: true, key: placed.order.key, total: placed.order.intent.total};
    }
    if (op.op === 'replay' || op.op === 'conflict') {
      const key = keys[op.order];
      const order = s0.orders.find(o => o.key === key);
      const intent = op.op === 'replay' ? order.intent : run('shop.intent_of', [s0, op.lines]).out;
      const placed = run('shop.order_place', [s0, key, intent]).out;
      if (engine.canon(placed.state) !== engine.canon(s0)) throw Error('replay changed state');
      return {ok: true, key: placed.order.key, created: placed.created};
    }
    if (op.op === 'pay' || op.op === 'check') {
      store.mode = op.mode;
      const r = await effectful(store, op.op === 'pay' ? 'shop.payment_submit' : 'shop.payment_reconcile', keys[op.order]);
      store.state = r.state;
      return op.op === 'pay' ? {ok: true, charges: r.effects, ...(r.replies.length ? {reply: r.replies[0]} : {})}
                             : {ok: true, inquiries: r.effects, ...(r.replies.length ? {reply: r.replies[0]} : {})};
    }
    if (op.op === 'cancel') { store.state = run('shop.order_cancel', [s0, keys[op.order]]).out; return {ok: true}; }
    if (op.op === 'import') {
      const csv = 'SKU,NAME,PRICE_VND,QTY_ON_HAND\n' + op.rows.map(r => `${r.sku},${NAMES[r.sku]},${PRICES[r.sku]},${r.qty}`).join('\n') + '\n';
      const preview = run('shop.stock_preview', [s0, csv]).out;
      store.state = run('shop.stock_import', [s0, csv, preview]).out;
      return {ok: true};
    }
  } catch (e) {
    if (e.kind === 'refused') return {refuse: e.code};
    return {fault: e.code ?? e.message};
  }
}

const mismatches = [];
let steps = 0;
for (const [i, sc] of cases.scenarios.entries()) {
  const store = {state: run('shop.initial', []).out, bank: {}, mode: 'accept'};
  const keys = [];
  for (const [j, op] of sc.ops.entries()) {
    const before = engine.canon(store.state);
    const got = await step(store, keys, op);
    steps++;
    const exp = sc.expect[j];
    if (got.refuse && op.op !== 'place' && engine.canon(store.state) !== before) mismatches.push({scenario: i, step: j, problem: 'refusal changed state'});
    const after = view(store, keys);
    if (engine.canon(got) !== engine.canon(exp.result) || engine.canon(after) !== engine.canon(exp.after))
      mismatches.push({scenario: i, step: j, op, expected: exp, got: {result: got, after}});
  }
}
let moneyBad = [];
for (const [n, text] of cases.money) { const o = outcome(runtime, 'shop.v.money', [n]); if (o.out !== text) moneyBad.push({n, expected: text, got: o}); }
let totalBad = [];
const seed = run('shop.initial', []).out;
for (const c of cases.totals) {
  const o = outcome(runtime, 'shop.intent_of', [seed, c.lines]);
  const got = o.out ? {total: o.out.total} : o;
  if (engine.canon(got) !== engine.canon(c.expect)) totalBad.push({lines: c.lines, expected: c.expect, got});
}
const report = {kind: 'independent-oracle-comparison', oracle: 'tests/oracle.py (python3 -I)', scenarios: cases.scenarios.length, steps, mismatches: mismatches.length,
  money: {cases: cases.money.length, mismatches: moneyBad.length}, totals: {cases: cases.totals.length, mismatches: totalBad.length},
  firstMismatches: mismatches.slice(0, 5), moneyBad: moneyBad.slice(0, 5), totalBad: totalBad.slice(0, 5)};
fs.writeFileSync(process.env.COMPARE_OUT ?? path.join(SHOP, 'evidence/oracle-compare.json'), JSON.stringify(report, null, 1));
console.log(`scenarios ${report.scenarios}, steps ${steps}, step mismatches ${mismatches.length}; money ${report.money.cases} cases, ${moneyBad.length} mismatches; totals ${report.totals.cases} cases, ${totalBad.length} mismatches`);
if (mismatches.length) console.log(JSON.stringify(mismatches[0], null, 1).slice(0, 3000));
process.exitCode = mismatches.length || moneyBad.length || totalBad.length ? 1 : 0;
