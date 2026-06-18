const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(__dirname, 'static-demo.html'), { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__REPORT_READY__ === true || document.readyState === 'complete');
  await page.pdf({
    path: path.resolve(__dirname, 'currenc-7pm-daily-closing-digest-demo.pdf'),
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' }
  });
  await browser.close();
})();
