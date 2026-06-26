import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';
try { mkdirSync('./test-shots'); } catch {}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1400, height: 900 });

await page.goto('http://localhost:5173');
await page.waitForTimeout(1500);
await page.fill('input[type="email"]', 'mamadou.sy@msas.gouv.sn');
await page.fill('input[type="password"]', 'Faypal2025!');
await page.click('button[type="submit"]');
await page.waitForTimeout(2000);
await page.click('button:has-text("Carte des risques")');
await page.waitForTimeout(6000);
await page.screenshot({ path: './test-shots/map-positions.png' });

const markers = await page.evaluate(() => {
  const results = [];
  document.querySelectorAll('div').forEach(el => {
    if (/^\d+%$/.test(el.innerText?.trim()) && el.style.borderRadius === '50%') {
      const rect = el.getBoundingClientRect();
      results.push({ score: el.innerText.trim(), x: Math.round(rect.x), y: Math.round(rect.y) });
    }
  });
  return results.sort((a,b) => a.x - b.x);
});

console.log('\nPositions (triees ouest->est):');
markers.forEach(m => console.log(`  ${m.score.padStart(4)}  x=${m.x}  y=${m.y}`));
console.log(`\nTotal: ${markers.length} marqueurs`);
