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
await page.waitForTimeout(4000); // map + API load
await page.screenshot({ path: './test-shots/map-real.png' });

// Check header text for "temps réel"
const header = await page.locator('text=temps réel').isVisible();
console.log('Données temps réel affichées :', header ? '✅' : '❌ (statiques)');

// Click on Kédougou marker (highest score)
const markers = page.locator('div[style*="border-radius: 50%"]');
const count = await markers.count();
console.log('Marqueurs visibles :', count);

// Click first marker (highest risk)
if (count > 0) {
  await markers.first().click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: './test-shots/map-panel.png' });
  const panel = await page.locator('text=Anopheles').isVisible();
  console.log('Panel info avec Anopheles :', panel ? '✅' : '❌');
}

await browser.close();
