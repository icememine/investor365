// DNode-level S02/S03/S06 boundary cases through the verified runtime (browser profile).
// Malformed data must fault (InputShape) before business logic and before any effect;
// business refusals must leave state unchanged (pure transitions; the host writes nothing).
import fs from 'node:fs';
import path from 'node:path';
import {load, outcome, SHOP} from './load.mjs';

const {runtime} = await load();
const run = (n, a) => runtime.run(n, a).out;
const seed = run('shop.initial', []);
const withCart = (s, cart) => ({...s, cart});
const prep = run('shop.checkout_prepare', [withCart(seed, [{sku: 'PEN', qty: 2}])]);
const placed = run('shop.order_place', [prep.state, prep.key, prep.intent]).state;
const key = prep.key;
const cancelled = run('shop.order_cancel', [placed, key]);
const store = (state) => ({state});
const big = {...seed, catalogue: seed.catalogue.map(i => i.sku === 'PEN' ? {...i, price: 9007199254740991} : i)};
const corrupt = {...seed, catalogue: seed.catalogue.map(i => i.sku === 'TOTE' ? {...i, r: 3} : i)};
const csv = 'SKU,NAME,PRICE_VND,QTY_ON_HAND\nNOTEBOOK,Notebook,50000,5\nPEN,Pen,20000,8\nTOTE,Tote bag,120000,4\n';
const preview = run('shop.stock_preview', [placed, csv]);

const cases = [
  ['cart qty 10', 'shop.cart_set', [seed, 'PEN', 10], {refuse: 'QuantityOutOfRange'}],
  ['cart qty -1', 'shop.cart_set', [seed, 'PEN', -1], {refuse: 'QuantityOutOfRange'}],
  ['cart qty as text "2"', 'shop.cart_set', [seed, 'PEN', '2'], {fault: 'InputShape'}],
  ['cart unknown SKU', 'shop.cart_set', [seed, 'ERASER', 1], {refuse: 'UnknownSku'}],
  ['quantity text "2" via boundary', 'shop.cart_set_text', [seed, 'PEN', '2'], {ok: true}],
  ['quantity text " 2"', 'shop.cart_set_text', [seed, 'PEN', ' 2'], {refuse: 'InvalidInteger'}],
  ['quantity text "10"', 'shop.cart_set_text', [seed, 'PEN', '10'], {refuse: 'QuantityOutOfRange'}],
  ['intent line qty as text', 'shop.intent_of', [seed, [{sku: 'PEN', qty: '2'}]], {fault: 'InputShape'}],
  ['intent 4 lines', 'shop.intent_of', [seed, [{sku: 'PEN', qty: 1}, {sku: 'TOTE', qty: 1}, {sku: 'NOTEBOOK', qty: 1}, {sku: 'X', qty: 1}]], {refuse: 'InvalidLines'}],
  ['overflowing total faults (price MAX x2)', 'shop.intent_of', [big, [{sku: 'PEN', qty: 2}]], {fault: 'ArithmeticOverflow'}],
  ['place: intent total as text', 'shop.order_place', [prep.state, key, {...prep.intent, total: '40000'}], {fault: 'InputShape'}],
  ['place: intent extra field', 'shop.order_place', [prep.state, key, {...prep.intent, note: 'x'}], {fault: 'InputShape'}],
  ['place: currency USD', 'shop.order_place', [prep.state, key, {...prep.intent, currency: 'USD'}], {fault: 'InputShape'}],
  ['place: forged unit price on fresh key', 'shop.order_place', [prep.state, key, {currency: 'VND', lines: [{sku: 'PEN', qty: 2, unit_price: 1}], total: 2}], {refuse: 'IntentStale'}],
  ['place: unminted key', 'shop.order_place', [prep.state, 'ORD-9999', prep.intent], {refuse: 'UnknownKey'}],
  ['place: same key, changed intent after binding', 'shop.order_place', [placed, key, {currency: 'VND', lines: [{sku: 'PEN', qty: 3, unit_price: 20000}], total: 60000}], {refuse: 'IntentConflict'}],
  ['place: same key, same intent after binding (retrieve)', 'shop.order_place', [placed, key, prep.intent], {ok: true, sameState: placed, field: 'state'}],
  ['place: not enough stock', 'shop.order_place', [(() => { const p = run('shop.checkout_prepare', [withCart(seed, [{sku: 'TOTE', qty: 3}])]); return p.state; })(), 'ORD-0001', {currency: 'VND', lines: [{sku: 'TOTE', qty: 3, unit_price: 120000}], total: 360000}], {refuse: 'OutOfStock'}],
  ['submit: key as Int (no effect emitted)', 'shop.payment_submit', [placed, 5], {fault: 'InputShape'}],
  ['submit: cancelled order (no effect emitted)', 'shop.payment_submit', [cancelled, key], {refuse: 'Cancelled'}],
  ['submit: ready order emits exactly one charge', 'shop.payment_submit', [placed, key], {ok: true, effects: [{capability: 'payment.charge', payload: {id: key + '-P1', amount: 40000}}]}],
  ['apply: reply not in enum', 'shop.payment_apply', [placed, key, 'ok'], {fault: 'InputShape'}],
  ['apply: before submit', 'shop.payment_apply', [placed, key, 'confirmed'], {refuse: 'NotSubmitted'}],
  ['reconcile: before submit (no inquiry)', 'shop.payment_reconcile', [placed, key], {refuse: 'NotSubmitted'}],
  ['state with R > H faults by invariant', 'shop.cart_set', [corrupt, 'PEN', 1], {fault: 'ContractViolation'}],
  ['import: preview mismatch', 'shop.stock_import', [placed, csv, {...preview, ok: false}], {refuse: 'PreviewChanged'}],
  ['import: TOTE 4 accepted, R kept', 'shop.stock_import', [placed, csv, preview], {ok: true}],
];
// outcome contradiction: confirmed order then a declined reply
const sub = runtime.run('shop.payment_submit', [placed, key]).out;
const conf = run('shop.payment_apply', [sub, key, 'confirmed']);
cases.push(['apply: declined after confirmed', 'shop.payment_apply', [conf, key, 'declined'], {refuse: 'OutcomeContradiction'}]);
cases.push(['apply: confirmed twice consumes once', 'shop.payment_apply', [conf, key, 'confirmed'], {ok: true, sameState: conf}]);

const results = cases.map(([label, node, args, exp]) => {
  const got = outcome(runtime, node, args);
  let pass;
  if (exp.refuse) pass = got.refuse === exp.refuse && !got.effects;
  else if (exp.fault) pass = (got.fault ?? '').split(':')[0] === exp.fault;
  else {
    pass = got.out !== undefined;
    if (exp.effects) pass &&= JSON.stringify(got.effects) === JSON.stringify(exp.effects);
    else if (got.effects) pass &&= got.effects.length === 0;
    if (exp.sameState) pass &&= JSON.stringify(exp.field ? got.out[exp.field] : got.out) === JSON.stringify(exp.sameState);
  }
  return {label, node, expected: exp.refuse ? 'refuse ' + exp.refuse : exp.fault ? 'fault ' + exp.fault : 'return', got: got.refuse ? 'refuse ' + got.refuse : got.fault ? 'fault ' + got.fault : 'return', effects: got.effects?.length ?? 0, pass};
});
const failed = results.filter(r => !r.pass);
fs.writeFileSync(path.join(SHOP, 'evidence/s02-dnode.json'), JSON.stringify({kind: 'dnode-boundary-cases', note: 'Refusals and faults expose no effects (runtime discards the queue); the host writes nothing on throw.', cases: results.length, failed: failed.length, results}, null, 1));
console.log(`${results.length} DNode boundary cases, ${failed.length} failed`);
for (const f of failed) console.log('FAIL', f.label, 'expected', f.expected, 'got', f.got);
process.exitCode = failed.length ? 1 : 0;
