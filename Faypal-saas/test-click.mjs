import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';
try { mkdirSync('./test-shots'); } catch {}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });

await page.goto('http://localhost:5173');
await page.waitForTimeout(1200);
await page.fill('input[type="email"]', 'mamadou.sy@msas.gouv.sn');
await page.fill('input[type="password"]', 'Faypal2025!');
await page.click('button[type="submit"]');
await page.waitForTimeout(2000);
await page.click('button:has-text("Carte des risques")');
await page.waitForTimeout(6000);

// Screenshot AVANT clic
await page.screenshot({ path: './test-shots/before-click.png' });

// Trouver et cliquer le marker 53% (Tambacounda - milieu carte)
const markers = await page.$$('div');
let target = null;
for (const el of markers) {
  const txt = await el.evaluate(e => e.innerText?.trim());
  const style = await el.evaluate(e => e.style.borderRadius);
  if (txt === '53%' && style === '50%') { target = el; break; }
}

if (target) {
  await target.click();
  console.log('Clicked 53% marker');
  await page.waitForTimeout(2000); // wait for flyTo + ML
  await page.screenshot({ path: './test-shots/after-click.png' });
}
await browser.close();
