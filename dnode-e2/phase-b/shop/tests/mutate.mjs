// Mutation check of the oracle comparison: seed one known bug at a time into a copy of
// the shop roots and confirm tests/compare.mjs reports mismatches. Writes evidence/mutation.json.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {SHOP} from './load.mjs';

const tmp = path.join(SHOP, 'evidence/tmp-mutants');
const mutants = [
  ['release keeps reservation', 'shop.core.node', 'out (shop.item_mk item item.h (- item.r (shop.qty_in lines item.sku)))', 'out (shop.item_mk item item.h (- item.r (* 0 (shop.qty_in lines item.sku))))'],
  ['reserve without stock check', 'shop.core.node', ' pre (shop.fresh_stock_ok state key intent) OutOfStock\n', ''],
  ['unknown reply treated as decline', 'shop.core.node', '(shop.order_set state (shop.order_mk o "unknown" o.inquiries))))', '(shop.settle_decline state o)))'],
  ['import adds instead of replacing', 'shop.core.node', 'out (shop.item_mk item c.h_new item.r)', 'out (shop.item_mk item (+ item.h c.h_new) item.r)'],
  ['import ignores below-reserved', 'shop.core.node', ' pre (== (len p.below) 0) BelowReserved\n', ''],
  ['confirm consumes twice', 'shop.core.node', 'out (if (contains o.phase SHOP_INFLIGHT) (shop.settle state o reply) state)', 'out (if (== reply "confirmed") (shop.settle state o reply) state)'],
  ['submit charges every time', 'shop.core.node', 'let sent (if fresh (emit "payment.charge" {id o.instr amount o.intent.total}) false)', 'let sent (emit "payment.charge" {id o.instr amount o.intent.total})'],
  ['total ignores quantity', 'shop.core.node', 'out (* l.unit_price l.qty)\n ex', 'out l.unit_price\n ex'],
  ['money without grouping dots', 'shop.view.node', '(cat acc (cat "." (shop.v.pad3 g)))', '(cat acc (shop.v.pad3 g))'],
];
const results = [];
for (const [label, file, from, to] of mutants) {
  fs.rmSync(tmp, {recursive: true, force: true}); fs.mkdirSync(tmp, {recursive: true});
  for (const f of ['shop.core.node', 'shop.view.node']) fs.copyFileSync(path.join(SHOP, f), path.join(tmp, f));
  const src = fs.readFileSync(path.join(tmp, file), 'utf8');
  if (!src.includes(from)) { results.push({label, applied: false}); continue; }
  fs.writeFileSync(path.join(tmp, file), src.replace(from, to));
  let output;
  try { output = execFileSync('node', ['tests/compare.mjs'], {cwd: SHOP, env: {...process.env, SHOP_ROOTS_DIR: tmp, COMPARE_OUT: path.join(tmp, 'out.json')}, encoding: 'utf8'}); }
  catch (e) { output = (e.stdout ?? '') + (e.stderr ?? ''); }
  const line = output.split('\n')[0];
  const killed = !/step mismatches 0; money \d+ cases, 0 mismatches; totals \d+ cases, 0 mismatches/.test(line);
  results.push({label, applied: true, killed, summary: line.slice(0, 200)});
  console.log((killed ? 'KILLED  ' : 'SURVIVED') + ' ' + label + ' | ' + line.slice(0, 140));
}
fs.rmSync(tmp, {recursive: true, force: true});
fs.writeFileSync(path.join(SHOP, 'evidence/mutation.json'), JSON.stringify({kind: 'mutation-check-of-oracle-comparison', results}, null, 1));
