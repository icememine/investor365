const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + require('path').resolve(__dirname, 'tampered.html'));
  await p.waitForFunction(() => document.getElementById('admission').textContent.length > 0);
  console.log(await p.textContent('#admission')); console.log('buttons:', (await p.$$('button[data-ev]')).length); await b.close(); })();
