import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });

// Intercept console.log
const logs = [];
page.on('console', msg => { if (msg.type() === 'log') logs.push(msg.text()); });

await page.goto('http://localhost:5173');
await page.waitForTimeout(1200);
await page.fill('input[type="email"]', 'mamadou.sy@msas.gouv.sn');
await page.fill('input[type="password"]', 'Faypal2025!');
await page.click('button[type="submit"]');
await page.waitForTimeout(2000);
await page.click('button:has-text("Carte des risques")');
await page.waitForTimeout(5000);

// Read actual marker lat/lng via maplibre DOM inspection
const markerData = await page.evaluate(() => {
  const results = [];
  document.querySelectorAll('div').forEach(el => {
    if (/^\d+%$/.test(el.innerText?.trim()) && el.style.borderRadius === '50%') {
      const rect = el.getBoundingClientRect();
      results.push({
        score: el.innerText.trim(),
        x: Math.round(rect.x),
        y: Math.round(rect.y),
      });
    }
  });
  return results.sort((a,b) => a.x - b.x);
});

// Get the map's current center and zoom
const mapState = await page.evaluate(() => {
  // Try to find maplibre map instance via the canvas element
  const canvas = document.querySelector('.maplibregl-canvas');
  if (!canvas) return { error: 'no canvas' };
  
  // Get all map-related info from canvas parent
  const container = canvas.closest('.maplibregl-map');
  if (!container) return { error: 'no map container' };
  
  return {
    containerRect: {
      x: Math.round(container.getBoundingClientRect().x),
      y: Math.round(container.getBoundingClientRect().y),
      width: Math.round(container.getBoundingClientRect().width),
      height: Math.round(container.getBoundingClientRect().height),
    },
    canvasRect: {
      x: Math.round(canvas.getBoundingClientRect().x),
      y: Math.round(canvas.getBoundingClientRect().y),
      width: Math.round(canvas.getBoundingClientRect().width),
      height: Math.round(canvas.getBoundingClientRect().height),
    }
  };
});

console.log('Map container/canvas:', JSON.stringify(mapState, null, 2));
console.log('\nMarkers (west->east):');
markerData.forEach(m => console.log(`  ${m.score.padStart(4)} x=${m.x} y=${m.y}`));

await browser.close();
