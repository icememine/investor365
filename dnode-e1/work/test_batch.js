// test_batch.js — drives host/batch_transform.html through B01–B06 in headless Chromium.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const results = []; const ok = (id, cond, note) => { results.push({ id, pass: !!cond, note }); console.log((cond ? 'PASS ' : 'FAIL ') + id + ' — ' + note); };
const shots = path.resolve(__dirname, '../docs/shots'); const expected = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../fixtures/expected.json'), 'utf8'));
const canon = (v) => Array.isArray(v) ? '[' + v.map(canon).join(',') + ']' : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}' : JSON.stringify(v);
const fx = (n) => fs.readFileSync(path.resolve(__dirname, '../fixtures/' + n), 'utf8');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const p = await ctx.newPage();
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../host/batch_transform.html'), { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.__dnode && window.__dnode.run);
  ok('A0', (await p.textContent('#admission')).startsWith('admitted'), 'page admitted');
  const run = (t) => p.evaluate((t) => window.__dnode.run(t), t);
  // B01 valid file → exact independently expected records
  let r = await run(fx('f01_valid.csv')); const exp = expected['f01_valid.csv'] || expected['f01_valid'];
  const snap = r.files.find(f => f.name === 'snapshot.normalized.json');
  ok('B01', r.out.outcome === 'Accepted' && snap && canon(JSON.parse(snap.text)) === canon(exp.records), `f01: ${r.out.records.length} records equal the Python expectation; export ${snap && snap.bytes} bytes`);
  await p.screenshot({ path: shots + '/batch-01-accepted.png', fullPage: true });
  // B02 dialect
  r = await run(fx('f02_quoted.csv')); const r3 = await run(fx('f03_crlf_bom.csv')); const r4 = await run(fx('f04_leading_zeros.csv'));
  ok('B02', r.out.outcome === 'Accepted' && r3.out.outcome === 'Accepted' && r4.out.outcome === 'Accepted' && canon(r4.out.records) === canon(expected['f04_leading_zeros.csv'].records), `quoted commas/newlines/doubled quotes, CRLF+BOM, leading zeros all accepted as expected`);
  // B03 diagnostics, no snapshot published
  r = await run(fx('f07_bad_numbers.csv'));
  const hasSnap = r.files.some(f => f.name === 'snapshot.normalized.json'); const tbl = await p.$$eval('#panel table', ts => ts.length);
  ok('B03a', r.out.outcome === 'Rejected' && !hasSnap && r.out.problems.length > 0 && tbl >= 2 && (await p.textContent('#panel')).includes('What to do'), `bad numbers: ${r.out.problems.length} located problems with advice, ${tbl} tables, no snapshot export`);
  await p.screenshot({ path: shots + '/batch-02-rejected.png', fullPage: true });
  r = await run(fx('f05_duplicate.csv')); ok('B03b', r.out.outcome === 'Rejected' && r.out.duplicates.length >= 2 && !r.files.some(f => f.name === 'snapshot.normalized.json'), `duplicates at records ${r.out.duplicates.join(',')}; no snapshot`);
  r = await run(fx('f11_header_only.csv')); ok('B03c', r.out.outcome === 'Rejected' && r.out.count === 0 && (await p.textContent('#panel')).includes('header only'), 'header-only file is an empty-snapshot refusal');
  r = await run(fx('f12_broken_quote.csv')); ok('B03d', r === null && (await p.textContent('#notice')).includes('never closed'), 'broken quote refuses the whole file with a readable reason');
  // B04 same input → same bytes and run id
  await p.fill('#text', fx('f01_valid.csv')); await p.click('#twice'); await p.waitForFunction(() => document.getElementById('deskout').textContent.includes('run id')); const twice = await p.textContent('#deskout');
  ok('B04', twice.includes('identical') && !twice.includes('DIFFERENT'), twice);
  // B05 interruption leaves nothing partial; oversized input stops before parsing
  const before = await p.evaluate(() => window.__dnode.lastPublished && window.__dnode.lastPublished.runId);
  await p.click('#interrupt'); r = await run(fx('f02_quoted.csv')); const after = await p.evaluate(() => window.__dnode.lastPublished && window.__dnode.lastPublished.runId);
  ok('B05a', r === null && before === after && (await p.textContent('#exports')).includes('Publish interrupted'), 'interrupted publish: nothing published, previous exports unchanged');
  await p.click('#big'); await p.waitForFunction(() => document.getElementById('deskout').textContent.includes('byte limit') || document.getElementById('deskout').textContent.includes('unexpectedly'), null, { timeout: 30000 });
  ok('B05b', (await p.textContent('#deskout')).includes('stopped at the byte limit'), await p.textContent('#deskout'));
  // row limit (10001 rows, under 1 MiB)
  let big = 'SKU,NAME,PRICE_VND,QTY_ON_HAND\n'; for (let i = 0; i < 10001; i++) big += `S${i},n,1,1\n`;
  r = await run(big); ok('B05c', r && r.out.outcome === 'TooManyRows' && !r.files.some(f => f.name === 'snapshot.normalized.json'), `10001 rows → ${r && r.out.outcome}`);
  // B06 correct a rejected record in place and re-run
  await p.fill('#text', fx('f06_bad_sku.csv')); await p.click('#run'); await p.waitForTimeout(200); const txt = await p.textContent('#panel');
  const fixed = fx('f06_bad_sku.csv').split('\n').map(l => l.replace(/^([a-z0-9_-]+),/, (m, s) => s.toUpperCase() + ',')).join('\n');
  await p.fill('#text', fixed); await p.click('#run'); await p.waitForTimeout(200); const txt2 = await p.textContent('#panel');
  ok('B06', txt.includes('BadSku') && txt.includes('no case folding') && txt2.includes('Accepted'), 'the rejected record is named with its text and the fix; corrected in place, the file is accepted');
  await p.screenshot({ path: shots + '/batch-03-corrected.png', fullPage: true });
  ok('ERR', errors.filter(e => !e.includes('ERR_TUNNEL')).length === 0, 'no page errors (font fetch excluded)');
  fs.writeFileSync(path.resolve(__dirname, '../docs/evidence.batch.json'), JSON.stringify({ page: 'host/batch_transform.html', at: new Date().toISOString(), results }, null, 1));
  console.log(results.filter(r => r.pass).length + '/' + results.length + ' passed'); await b.close();
})();
