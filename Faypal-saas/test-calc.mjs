import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';
try { mkdirSync('./test-shots'); } catch {}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });

// Intercept console errors
page.on('console', msg => { if (msg.type() === 'error') console.log('Console error:', msg.text()); });

await page.goto('http://localhost:5173');
await page.waitForTimeout(1500);
await page.fill('input[type="email"]', 'mamadou.sy@msas.gouv.sn');
await page.fill('input[type="password"]', 'Faypal2025!');
await page.click('button[type="submit"]');
await page.waitForTimeout(2500);

await page.click('button:has-text("Scores de risque")');
await page.waitForTimeout(2500);
await page.screenshot({ path: './test-shots/calc-before.png' });

// Click ↻ on Dakar (last in default sort by score — it has low static risk 22%)
// Better: find by row containing "Dakar"
const dakarRow = page.locator('.sm\\:grid-cols-12').filter({ hasText: 'Dakar' });
const dakarBtn = dakarRow.locator('button[title="Recalculer le score"]');
const hasDakar = await dakarBtn.isVisible();
console.log('Bouton Calculer Dakar:', hasDakar ? '✅' : '❌');

if (hasDakar) {
  await dakarBtn.click();
  console.log('Calcul Dakar lancé (attente météo Open-Meteo)...');
  await page.waitForTimeout(7000);
  await page.screenshot({ path: './test-shots/calc-dakar-result.png' });

  // Read Dakar score
  const dakarScore = await dakarRow.locator('span').filter({ hasText: '%' }).first().textContent();
  console.log('Score Dakar après calcul:', dakarScore);
}

// Now try Kédougou
const kedRow = page.locator('.sm\\:grid-cols-12').filter({ hasText: 'Kédougou' });
const kedBtn = kedRow.locator('button[title="Recalculer le score"]');
if (await kedBtn.isVisible()) {
  await kedBtn.click();
  console.log('Calcul Kédougou lancé...');
  await page.waitForTimeout(7000);
  await page.screenshot({ path: './test-shots/calc-ked-result.png' });
  const kedScore = await kedRow.locator('span').filter({ hasText: '%' }).first().textContent();
  console.log('Score Kédougou après calcul:', kedScore);
}

await browser.close();
