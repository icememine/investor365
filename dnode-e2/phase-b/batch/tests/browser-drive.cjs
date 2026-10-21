// Playwright drive of the browser host at 390×844 and 1280×800 (headless Chromium from /opt/pw-browsers).
// Run: NODE_PATH=/usr/local/lib/node_modules_global node tests/browser-drive.cjs
// Checks observable facts only. It is NOT human acceptance (B06 human task stays pending).
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BATCH = path.resolve(__dirname, '..');
const SHOTS = path.join(BATCH, 'evidence/shots');
const TMP = path.join(BATCH, 'evidence/tmp-browser');
const PORT = Number(process.env.DRIVE_PORT || 8123);
const URL = `http://127.0.0.1:${PORT}/`;
const FX = n => path.join(BATCH, 'fixtures/cases', n + '.csv');
const KITFX = n => path.join(BATCH, '../kit/dnode-e1-kit/dist/fixtures', n);
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
fs.mkdirSync(SHOTS, { recursive: true });
fs.rmSync(TMP, { recursive: true, force: true }); fs.mkdirSync(TMP, { recursive: true });

const checks = [];
const check = (vp, name, pass, observed) => { checks.push({ viewport: vp, name, pass: !!pass, observed }); console.log((pass ? 'PASS ' : 'FAIL ') + vp + ' ' + name + (pass ? '' : ' :: ' + JSON.stringify(observed).slice(0, 300))); };

async function main() {
  const server = spawn(process.execPath, [path.join(BATCH, 'serve.mjs'), '--port', String(PORT)], { stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise(r => server.stdout.once('data', r));
  const browser = await chromium.launch();
  const env = { browser: 'chromium (Playwright ' + require('playwright/package.json').version + ')', version: browser.version(), headless: true };
  const timings = [];
  try {
    for (const vp of [{ name: '390x844', width: 390, height: 844, mobile: true }, { name: '1280x800', width: 1280, height: 800, mobile: false }]) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.mobile, hasTouch: vp.mobile, deviceScaleFactor: vp.mobile ? 2 : 1, acceptDownloads: true });
      await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: URL.slice(0, -1) });
      const page = await ctx.newPage();
      const consoleErrors = [];
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', e => consoleErrors.push(String(e)));
      const V = vp.name;
      const shot = async (n) => page.screenshot({ path: path.join(SHOTS, `${V}-${n}.png`), fullPage: true });
      const noHScroll = async (label) => { const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth })); check(V, `no horizontal page scroll (${label})`, o.sw <= o.iw, o); };
      const choose = async f => { await page.setInputFiles('#file', f); };
      const validate = async () => { await page.click('#validate'); await page.waitForSelector('#banner-text', { timeout: 120000 }); return page.textContent('#banner-text'); };

      await page.goto(URL);
      await page.waitForSelector('#kit.ok', { timeout: 30000 });
      check(V, 'kit verified before anything runs (pill ok)', true, await page.textContent('#kit'));
      check(V, 'meaning panel visible before Validate', await page.isVisible('#meaning-text'), await page.textContent('#meaning-text'));
      check(V, 'Validate disabled until a file is chosen', await page.isDisabled('#validate'));
      await shot('01-start'); await noHScroll('start');

      // B06 observable journey: rejected file → see record/field/value/hint → correct → re-run → Accepted.
      await choose(KITFX('supplier-invalid.csv'));
      let t = await validate();
      check(V, 'invalid kit fixture → Rejected (record level) banner', /^Rejected — no snapshot was produced\. 4 of 4 records need correction \(6 problems\)\./.test(t) && (await page.getAttribute('.banner', 'data-kind')) === 'records', t);
      check(V, 'banner says partial acceptance unavailable', /Partial acceptance is not available/.test(t));
      check(V, 'browser old-vs-current line shown', /Any snapshot you downloaded earlier came from a different run/.test(await page.textContent('.banner')));
      const recs = await page.$$eval('article.rec', as => as.map(a => ({ head: a.querySelector('h3').textContent, rows: [...a.querySelectorAll('tbody tr')].map(tr => [...tr.querySelectorAll('td')].map(td => td.innerText.replace(/\s+/g, ' ').trim())) })));
      check(V, 'one card per rejected record (4), in record order', recs.map(r => r.head.match(/Record (\d+)/)[1]).join() === '1,2,3,4', recs.map(r => r.head));
      const r3 = recs.find(r => /Record 3 · spreadsheet row 4 · SKU notebook/.test(r.head));
      check(V, 'record 3 shows field, value, hint (PRICE_VND 50.5)', r3 && r3.rows.some(c => /PRICE_VND/.test(c[0]) && /50\.5/.test(c[1]) && /Use digits 0–9 only/.test(c[2])), r3);
      check(V, 'record 4 shows range hint for 9007199254740992', recs[3].rows.some(c => /9007199254740992/.test(c[1]) && /larger than 9007199254740991/.test(c[2])), recs[3]);
      check(V, 'duplicate group line shown', /SKU PEN appears in records 1, 2\. Keep one record per SKU\./.test(await page.textContent('.dups')));
      check(V, 'counts shown (4/0/4/6)', (await page.$$eval('#counts dd', d => d.map(x => x.textContent))).join() === '4,0,4,6');
      const exportsRejected = await page.$$eval('[data-export]', b => b.map(x => x.getAttribute('data-export')));
      const id12a = (await page.textContent('.runline')).match(/Run ([0-9a-f]{12})/)[1];
      check(V, 'rejected run exports only report-<runId12>.json', exportsRejected.join() === `report-${id12a}.json`, exportsRejected);
      await shot('02-rejected'); await noHScroll('rejected');
      // Corrected file: operator fixes every listed record.
      const corrected = path.join(TMP, 'supplier-corrected.csv');
      fs.writeFileSync(corrected, 'SKU,NAME,PRICE_VND,QTY_ON_HAND\nPEN,Blue pen,20000,8\nPEN-DUP,Duplicate pen,25000,2\nNOTEBOOK,Notebook,50500,5\nTOTE,Tote bag,90000,2\n');
      await choose(corrected);
      check(V, 'choosing a new file clears the old result', !(await page.$('#banner-text')));
      t = await validate();
      check(V, 'corrected file → Accepted banner', /^Accepted — 4 records ready\. This snapshot \(run [0-9a-f]{12}\) can replace the supplier stock in the shop\.$/.test(t), t);
      const id12b = (await page.textContent('.runline')).match(/Run ([0-9a-f]{12})/)[1];
      check(V, 'new run ID differs from the rejected run', id12b !== id12a, [id12a, id12b]);
      const exportsAcc = await page.$$eval('[data-export]', b => b.map(x => x.getAttribute('data-export')));
      check(V, 'accepted exports are new run-ID-named files', exportsAcc.join() === `snapshot-${id12b}.json,report-${id12b}.json`, exportsAcc);
      const preview = await page.$$eval('table.preview tbody tr td:first-child', t => t.map(x => x.textContent));
      check(V, 'preview sorted by SKU', preview.join() === 'NOTEBOOK,PEN,PEN-DUP,TOTE', preview);
      const [dl] = await Promise.all([page.waitForEvent('download'), page.click(`[data-export="snapshot-${id12b}.json"]`)]);
      const dlPath = path.join(TMP, V + '-' + dl.suggestedFilename()); await dl.saveAs(dlPath);
      const dlBytes = fs.readFileSync(dlPath);
      const runDetails = await page.$$eval('details.card dl.ident dd', d => d.map(x => x.textContent));
      const snapLine = runDetails.find(x => /^sha256 [0-9a-f]{64} · 4 records$/.test(x)) || '';
      check(V, 'downloaded snapshot filename + bytes match the report sha256', dl.suggestedFilename() === `snapshot-${id12b}.json` && snapLine.includes(sha(dlBytes)), { file: dl.suggestedFilename(), sha: sha(dlBytes), snapLine });
      await page.click('.export:first-child button.secondary');
      const clip = await page.evaluate(() => navigator.clipboard.readText());
      check(V, 'Copy JSON puts the identical snapshot bytes on the clipboard', clip === dlBytes.toString('utf8'), clip.slice(0, 80));
      check(V, 'history lists both runs', (await page.$$('#history li')).length === 2);
      check(V, 'progress row hidden once the result is shown', !(await page.isVisible('#progress')));
      const radius = await page.$eval('table.preview tbody td.n', e => getComputedStyle(e).borderRadius);
      check(V, 'preview numeric cells are plain cells (not step badges)', radius === '0px', radius);
      await shot('03-accepted'); await noHScroll('accepted');

      // Visible whitespace and other banners.
      await choose(FX('bt2-space')); t = await validate();
      const valText = await page.$eval('article.rec tbody .val', e => e.textContent);
      check(V, 'leading space shown as · (" 20000" → "·20000")', valText === '·20000', valText);
      await choose(FX('bt4-quoted-newline-dupes')); t = await validate();
      check(V, 'B-T4: duplicates at records 2 and 4 despite quoted newlines', /SKU PEN appears in records 2, 4\./.test(await page.textContent('.dups')), await page.textContent('.dups'));
      await choose(FX('malformed-unclosed')); t = await validate();
      check(V, 'MalformedCSV → file-level Rejected banner', /^Rejected — the file could not be read as the declared CSV \(MalformedCSV\)/.test(t) && (await page.getAttribute('.banner', 'data-kind')) === 'file', t);
      await shot('04-file-malformed'); await noHScroll('file-level');
      await choose(FX('utf8-invalid-ff')); t = await validate();
      check(V, 'invalid UTF-8 → InvalidUTF8 banner', /\(InvalidUTF8\)/.test(t), t);
      await choose(FX('bom-double')); t = await validate();
      check(V, 'double BOM → header rejection with BOM hint', /\(header\)/.test(t) && /extra byte-order mark/.test(await page.textContent('#result')), t);
      await choose(FX('header-only')); t = await validate();
      check(V, 'header-only → empty snapshot banner', /^Rejected — the file contains no product records \(empty snapshot\)/.test(t), t);
      await choose(FX('size-1048577')); t = await validate();
      check(V, '1048577 bytes → FileTooLarge banner', /\(FileTooLarge\)/.test(t), t);
      await choose(FX('row-60000-fields')); t = await validate();
      check(V, '60001-field row → Tool fault banner (gap G-7)', /^Tool fault \(ResourceLimit\)/.test(t) && (await page.getAttribute('.banner', 'data-kind')) === 'fault', t);
      await shot('05-fault'); await noHScroll('fault');
      await choose(FX('size-1048576')); t = await validate();
      check(V, '1048576 bytes → Accepted 9000 records', /^Accepted — 9000 records ready/.test(t), t);
      await noHScroll('large accepted');

      // R-B4: main thread stays responsive during a slow rejection; progress is shown; Stop works.
      const slow = path.join(TMP, 'slow-1500.csv');
      fs.writeFileSync(slow, 'SKU,NAME,PRICE_VND,QTY_ON_HAND\n' + Array.from({ length: 1500 }, () => 'dup,Item,x,1\n').join(''));
      await choose(slow);
      await page.evaluate(() => { window.__gaps = []; let last = performance.now(); window.__iv = setInterval(() => { const n = performance.now(); window.__gaps.push(n - last); last = n; }, 50); });
      const t0 = Date.now();
      await page.click('#validate');
      const seen = new Set();
      while (!(await page.$('#banner-text'))) { const s = await page.textContent('#progress-text'); if (s) seen.add(s.replace(/[\d,]+/g, 'N')); await page.waitForTimeout(150); if (Date.now() - t0 > 180000) break; }
      const gaps = await page.evaluate(() => { clearInterval(window.__iv); return window.__gaps; });
      const maxGap = Math.round(Math.max(...gaps));
      const slowMs = Date.now() - t0;
      timings.push({ viewport: V, case: '1500 invalid duplicate rows', wallMs: slowMs, maxMainThreadTimerGapMs: maxGap });
      check(V, 'progress phases shown during slow run', seen.size >= 2, [...seen]);
      check(V, 'main thread responsive (max 50 ms-timer gap < 500 ms)', maxGap < 500, { maxGap, slowMs });
      check(V, 'slow run result: Rejected 1500 of 1500 records', /1500 of 1500 records need correction/.test(await page.textContent('#banner-text')));
      await noHScroll('1500 issues');
      await choose(slow); await page.click('#validate'); await page.waitForTimeout(800);
      await page.click('#stop');
      await page.waitForSelector('text=Stopped. ');
      await page.waitForSelector('#kit.ok', { timeout: 30000 });
      check(V, 'Stop terminates the run, re-verifies the kit, no result shown', !(await page.$('#banner-text')) && await page.isEnabled('#validate'));

      // File edited on disk after choosing: re-validate reads again (observe behaviour).
      const edited = path.join(TMP, V + '-edited.csv');
      fs.writeFileSync(edited, 'SKU,NAME,PRICE_VND,QTY_ON_HAND\npen,Pen,1,1\n');
      await choose(edited); t = await validate();
      fs.writeFileSync(edited, 'SKU,NAME,PRICE_VND,QTY_ON_HAND\nPEN,Pen,1,1\n');
      await page.click('#validate');
      await page.waitForFunction(() => document.querySelector('#banner-text') || /could not be read/.test(document.querySelector('#result')?.textContent || ''), null, { timeout: 30000 });
      const reread = (await page.textContent('#result')).slice(0, 160);
      checks.push({ viewport: V, name: 'observation: re-validate after editing the chosen file on disk', pass: true, observed: reread, note: 'recorded, not asserted' });
      console.log('OBS  ' + V + ' re-validate after edit: ' + reread.replace(/\s+/g, ' ').slice(0, 120));
      check(V, 'no console errors', consoleErrors.length === 0, consoleErrors);
      await ctx.close();
    }
  } finally {
    await browser.close();
    server.kill();
  }
  const failed = checks.filter(c => !c.pass);
  fs.writeFileSync(path.join(BATCH, 'evidence/browser.json'), JSON.stringify({ environment: env, scope: 'automated observable checks; not human acceptance (B06 pending)', timings, summary: { checks: checks.length, passed: checks.length - failed.length, failed: failed.length }, checks }, null, 1));
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(JSON.stringify({ checks: checks.length, passed: checks.length - failed.length, failed: failed.length, env }));
  process.exitCode = failed.length ? 1 : 0;
}
main().catch(e => { console.error(e); process.exitCode = 1; });
