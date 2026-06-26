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
await page.waitForTimeout(2500);
await page.click('button:has-text("Carte des risques")');
await page.waitForTimeout(4000);

// Expose the map instance via window to control zoom/center
// Use maplibre's flyTo via page.evaluate

// Screenshot 1 — tout le Sénégal, zoom 6.5
await page.evaluate(() => {
  const maps = Object.values(window).filter(v => v && typeof v === 'object' && v._map);
  // Try to access maplibre map
});

// Take a wider shot — increase viewport
await page.setViewportSize({ width: 1600, height: 1000 });
await page.screenshot({ path: './test-shots/map-full.png', fullPage: false });

// Check each marker position by reading DOM elements
const markerPositions = await page.evaluate(() => {
  const results = [];
  document.querySelectorAll('div').forEach(el => {
    const text = el.innerText?.trim();
    if (/^\d+%$/.test(text) && el.style.borderRadius === '50%') {
      const rect = el.getBoundingClientRect();
      results.push({ text, x: Math.round(rect.x), y: Math.round(rect.y) });
    }
  });
  return results.sort((a,b) => a.x - b.x);
});

console.log('\nPositions pixel des marqueurs (triées par X = ouest→est):');
markerPositions.forEach(m => console.log(`  ${m.text.padStart(4)} → écran (${m.x}, ${m.y})`));
console.log(`\nTotal: ${markerPositions.length} marqueurs`);

await browser.close();
