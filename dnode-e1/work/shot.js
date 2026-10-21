const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await p.goto('file://' + path.resolve(__dirname, '../host/shop.html')); await p.waitForFunction(() => window.__dnode && window.__dnode.state);
  await p.evaluate(() => window.__dnode.showTab('desk')); await p.click('button:has-text("Clear session")'); await p.evaluate(() => window.__dnode.showTab('shop'));
  await p.click('button:has-text("Add to bag")'); await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(100);
  await p.screenshot({ path: path.resolve(__dirname, '../docs/shots/shop-00-home.png') });
  const p2 = await b.newPage({ viewport: { width: 1200, height: 800 } }); await p2.goto('file://' + path.resolve(__dirname, '../host/shop.html')); await p2.waitForFunction(() => window.__dnode && window.__dnode.state);
  await p2.click('button:has-text("Add to bag")'); await p2.click('.card:nth-child(3) button'); await p2.waitForTimeout(100); await p2.screenshot({ path: path.resolve(__dirname, '../docs/shots/shop-00-desktop.png') });
  await b.close(); })();
