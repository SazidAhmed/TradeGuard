const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Mobile
  await page.setViewport({ width: 375, height: 812 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: 'mobile.png' });
  
  // Desktop
  await page.setViewport({ width: 1200, height: 800 });
  await page.screenshot({ path: 'desktop.png' });
  
  await browser.close();
})();
