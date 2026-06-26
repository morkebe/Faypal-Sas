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

const camera = await page.evaluate(() => {
  const m = window._mapInstance;
  if (!m) return "no _mapInstance";
  return {
    center: m.getCenter(),
    zoom: m.getZoom(),
    bearing: m.getBearing(),
    pitch: m.getPitch(),
  };
});
console.log("Camera state:", JSON.stringify(camera, null, 2));

// Also check specific marker positions by their text
const markerInfo = await page.evaluate(() => {
  const res = [];
  document.querySelectorAll('div').forEach(el => {
    const t = el.innerText?.trim();
    if (t === '24%' || t === '53%' || t === '62%' || t === '26%') {
      const r = el.getBoundingClientRect();
      res.push({ v: t, x: Math.round(r.x), y: Math.round(r.y), cx: Math.round(r.x + r.width/2), cy: Math.round(r.y + r.height/2) });
    }
  });
  return res.sort((a,b)=>a.x-b.x);
});
console.log("\nKey markers (24%=Matam, 53%=Tambacounda, 62%=Kédougou, 26%=Ziguinchor):");
markerInfo.forEach(m => console.log(`  ${m.v}: center x=${m.cx}, y=${m.cy}`));

await browser.close();
