import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';
try { mkdirSync('./test-shots'); } catch {}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1400, height: 900 });

// Intercept API calls to see what data arrives
const apiData = {};
page.on('response', async res => {
  if (res.url().includes('/scores/')) {
    try { apiData.scores = await res.json(); } catch {}
  }
  if (res.url().includes('/zones/')) {
    try { apiData.zones = await res.json(); } catch {}
  }
});

await page.goto('http://localhost:5173');
await page.waitForTimeout(1500);
await page.fill('input[type="email"]', 'mamadou.sy@msas.gouv.sn');
await page.fill('input[type="password"]', 'Faypal2025!');
await page.click('button[type="submit"]');
await page.waitForTimeout(2500);

await page.click('button:has-text("Carte des risques")');
await page.waitForTimeout(5000);
await page.screenshot({ path: './test-shots/map-debug.png' });

// Count marker divs with % text
const markerCount = await page.evaluate(() => {
  const all = document.querySelectorAll('div');
  let count = 0;
  all.forEach(el => {
    if (/^\d+%$/.test(el.innerText?.trim()) && el.style.borderRadius === '50%') count++;
  });
  return count;
});
console.log('Marqueurs visibles dans DOM:', markerCount);
console.log('Scores reçus de l\'API:', apiData.scores?.length ?? 'non intercepté');
console.log('Zones reçues de l\'API:', apiData.zones?.length ?? 'non intercepté');

await browser.close();
