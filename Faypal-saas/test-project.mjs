import { chromium } from '@playwright/test';

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

const result = await page.evaluate(() => {
  const m = window._mapInstance;
  if (!m) return "no map";

  // Project specific lat/lngs using MapLibre's own calculation
  const coords = [
    { name: "Ziguinchor",  lng: -16.273, lat: 12.566 },
    { name: "Kédougou",    lng: -12.183, lat: 12.556 },
    { name: "Sédhiou",     lng: -15.557, lat: 12.708 },
    { name: "Kolda",       lng: -14.941, lat: 12.896 },
    { name: "Tambacounda", lng: -13.667, lat: 13.771 },
    { name: "Matam",       lng: -13.255, lat: 15.656 },
    { name: "Saint-Louis", lng: -16.490, lat: 16.018 },
    { name: "Dakar",       lng: -17.447, lat: 14.693 },
  ];

  return coords.map(c => {
    const pt = m.project([c.lng, c.lat]);
    return { name: c.name, lat: c.lat, lng: c.lng, px: Math.round(pt.x), py: Math.round(pt.y) };
  });
});

console.log("\nMapLibre.project() results (CSS pixels within container):");
result.forEach(r => {
  const winX = 224 + r.px;
  const winY = 68 + r.py;
  console.log(`  ${r.name.padEnd(13)} lat=${r.lat} lng=${r.lng} → container(${r.px}, ${r.py}) window(${winX}, ${winY})`);
});

await browser.close();
