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
await page.screenshot({ path: './test-shots/map-visual.png' });

const markers = await page.evaluate(() => {
  const res = [];
  document.querySelectorAll('div').forEach(el => {
    if (/^\d+%$/.test(el.innerText?.trim()) && el.style.borderRadius === '50%') {
      const r = el.getBoundingClientRect();
      res.push({ v: el.innerText.trim(), x: Math.round(r.x), y: Math.round(r.y), visible: r.x>0 && r.y>0 && r.right<1280 && r.bottom<900 });
    }
  });
  return res.sort((a,b)=>a.x-b.x);
});

const n = markers.filter(m=>m.visible).length;
console.log(`\nMarqueurs dans viewport: ${n}/14`);
markers.forEach(m => console.log(`  ${m.visible?'✓':'✗'} ${m.v.padStart(4)}  x=${m.x}  y=${m.y}`));
await browser.close();
