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
await page.waitForTimeout(5000); // wait for map + fitBounds
await page.screenshot({ path: './test-shots/map-1280.png' });

// Count markers on screen (not cut off)
const visible = await page.evaluate(() => {
  const results = [];
  document.querySelectorAll('div').forEach(el => {
    const text = el.innerText?.trim();
    if (/^\d+%$/.test(text) && el.style.borderRadius === '50%') {
      const rect = el.getBoundingClientRect();
      const onScreen = rect.x > 0 && rect.y > 0 && rect.right < window.innerWidth && rect.bottom < window.innerHeight;
      results.push({ text, x: Math.round(rect.x), y: Math.round(rect.y), onScreen });
    }
  });
  return results;
});

const onScreen = visible.filter(m => m.onScreen);
const offScreen = visible.filter(m => !m.onScreen);
console.log(`Marqueurs visibles : ${onScreen.length}/14`);
if (offScreen.length) {
  console.log('Hors écran :');
  offScreen.forEach(m => console.log(`  ${m.text} à (${m.x}, ${m.y})`));
}

await browser.close();
