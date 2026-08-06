import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

const pages = [
  { url: 'http://localhost:3000/', name: 'home' },
  { url: 'http://localhost:3000/services', name: 'services' },
  { url: 'http://localhost:3000/request-service', name: 'request-service' },
  { url: 'http://localhost:3000/rehearsal-booking', name: 'rehearsal-booking' },
  { url: 'http://localhost:3000/auth/login', name: 'login' },
];

for (const p of pages) {
  try {
    await page.goto(p.url, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const screenshotPath = `C:/claude/seven-lions/screenshots/sl_${p.name}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: false });
    const title = await page.title();
    const hasDark = await page.evaluate(() => {
      const bg = window.getComputedStyle(document.body).backgroundColor;
      return bg;
    });
    console.log(`✅ ${p.name}: "${title}" | bg: ${hasDark}`);
  } catch (e) {
    console.log(`❌ ${p.name}: ${e.message.slice(0, 120)}`);
  }
}

await browser.close();
console.log('Done');
