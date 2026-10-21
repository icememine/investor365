// headless smoke of the batch host page: admission, fixture run, broken-quote refusal, export staging
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto('file://' + require('path').resolve(__dirname, '../host/batch_transform.html'));
  await p.waitForFunction(() => document.getElementById('admission').textContent.length > 0);
  console.log('admission:', await p.textContent('#admission'));
  const buttons = await p.$$eval('button[data-ev]', bs => bs.map(b => b.textContent));
  console.log('buttons:', buttons.join(' | '));
  // run first fixture
  await p.click('button:has-text("Fixture f01")');
  await p.waitForTimeout(100);
  console.log('right:', (await p.textContent('#right')).replace(/\s+/g, ' ').slice(0, 300));
  console.log('export textarea:', (await p.$$eval('textarea[readonly]', t => t.map(x => x.value))).join(' / '));
  // paste a broken-quote file and run
  await p.fill('#ta_text', 'SKU,NAME,PRICE_VND,QTY_ON_HAND\nA,"x,1,1\n');
  await p.click('button[data-ta="text"]');
  await p.waitForTimeout(100);
  console.log('notice after broken quote:', await p.textContent('.notice'));
  // bad header
  await p.fill('#ta_text', 'SKU,NAME\nA,x\n');
  await p.click('button[data-ta="text"]');
  await p.waitForTimeout(100);
  console.log('right after bad header:', (await p.textContent('#right')).replace(/\s+/g, ' ').slice(0, 200));
  console.log('page errors:', errors.length ? errors : 'none');
  await b.close();
})();
