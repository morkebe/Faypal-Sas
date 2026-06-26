import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const apiData = {};
page.on('response', async res => {
  if (res.url().includes('/scores')) {
    try { apiData.scores = await res.json(); } catch {}
  }
  if (res.url().includes('/zones')) {
    try { apiData.zones = await res.json(); } catch {}
  }
});

await page.goto('http://localhost:5173');
await page.waitForTimeout(1500);
await page.fill('input[type="email"]', 'mamadou.sy@msas.gouv.sn');
await page.fill('input[type="password"]', 'Faypal2025!');
await page.click('button[type="submit"]');
await page.waitForTimeout(2000);
await page.click('button:has-text("Carte des risques")');
await page.waitForTimeout(5000);

const regions = apiData.zones?.filter(z => z.niveau === 'region') ?? [];
console.log(`\nZones niveau=region : ${regions.length}`);
regions.forEach(z => {
  const score = apiData.scores?.filter(s => s.zone_id === z.id)
    .sort((a, b) => b.calcule_a.localeCompare(a.calcule_a))[0];
  console.log(`  ${z.nom.padEnd(15)} -> ${score ? Math.round(score.score * 100) + '%' : 'PAS DE SCORE'}`);
});

const markers = await page.evaluate(() => {
  const results = [];
  document.querySelectorAll('div').forEach(el => {
    if (/^\d+%$/.test(el.innerText?.trim()) && el.style.borderRadius === '50%') {
      results.push(el.innerText.trim());
    }
  });
  return results;
});
console.log('\nMarqueurs affiches :', markers.join(', '));

await browser.close();
