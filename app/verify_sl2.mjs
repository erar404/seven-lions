import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

// Check services page for all 5 services
await page.goto('http://localhost:3000/services', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const h2s = await page.$$eval('h2', els => els.map(e => e.textContent?.trim()));
console.log('Service headings found:', h2s.filter(t => t && t.length < 60));

// Take full-page screenshot of services
await page.screenshot({ path: 'C:/claude/seven-lions/screenshots/sl_services_full.png', fullPage: true });
console.log('✅ Services full page screenshot saved');

// Test nav - click Request Service from home
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
const navLink = await page.$('a[href="/request-service"]');
if (navLink) {
  await navLink.click();
  await page.waitForTimeout(1500);
  const url = page.url();
  console.log(`✅ Nav click → ${url}`);
} else {
  console.log('❌ Nav link not found');
}

// Check request service form has all service types
const serviceBtns = await page.$$eval('button[type="button"]', els => els.map(e => e.textContent?.trim().split('\n').join(' ')));
console.log('Service options:', serviceBtns.slice(0, 10));

// Test rehearsal booking - check calendar renders
await page.goto('http://localhost:3000/rehearsal-booking', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const calendarTitle = await page.$eval('.fc-toolbar-title', el => el.textContent).catch(() => 'Calendar title not found');
console.log(`Calendar title: ${calendarTitle}`);

// Check admin redirects unauthenticated users
await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
const adminUrl = page.url();
console.log(`Admin URL (unauthenticated): ${adminUrl}`);

await browser.close();
console.log('All checks complete');
