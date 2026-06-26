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

await page.click('button:has-text("Carte des risques")');
await page.waitForTimeout(4000);
await page.screenshot({ path: './test-shots/map-real.png' });

// Read header subtitle
const subtitle = await page.locator('p.text-white\\/80').first().textContent();
console.log('Header:', subtitle);

// Click a marker
const markers = page.locator('div').filter({ hasText: /^\d+%$/ }).locator('nth=0');
await markers.click().catch(() => {});
await page.waitForTimeout(1200);
await page.screenshot({ path: './test-shots/map-panel.png' });

await browser.close();
console.log('Done');
