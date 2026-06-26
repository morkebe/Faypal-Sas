import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';
try { mkdirSync('./test-shots'); } catch {}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto('http://localhost:5173');
await page.waitForTimeout(1500);
await page.fill('input[type="email"]', 'mamadou.sy@msas.gouv.sn');
await page.fill('input[type="password"]', 'Faypal2025!');
await page.click('button[type="submit"]');
await page.waitForTimeout(2500);

await page.click('button:has-text("Scores de risque")');
await page.waitForTimeout(3000);
await page.screenshot({ path: './test-shots/scores-real.png', fullPage: false });

const rows = await page.locator('.sm\\:grid-cols-12').allTextContents();
console.log('\n=== Scores réels ===');
rows.slice(0, 14).forEach(r => {
  const match = r.match(/([A-ZÀ-Ö][a-zA-ZÀ-ö\-]+)\s+(\d+)%/);
  if (match) console.log(`  ${match[1].padEnd(14)} ${match[2]}%`);
});

// Check KPIs
const kpis = await page.locator('.grid-cols-4 .font-bold, .grid-cols-2 .font-bold').allTextContents();
console.log('\nKPIs:', kpis.slice(0, 4).join(' | '));

await browser.close();
