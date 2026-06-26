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

await page.click('button:has-text("Alertes")');
await page.waitForTimeout(2000);
await page.screenshot({ path: './test-shots/alerts-list.png' });

const btnCreate = await page.locator('button:has-text("Nouvelle alerte")').isVisible();
console.log('Bouton Nouvelle alerte:', btnCreate ? '✅ visible' : '❌ absent');

// Count stat badges (critical / high / medium / resolved)
const statValues = await page.locator('.text-2xl, .font-bold').allTextContents();
console.log('Stats visibles:', statValues.slice(0, 8).join(' | '));

// Open create modal
if (btnCreate) {
  await page.click('button:has-text("Nouvelle alerte")');
  await page.waitForTimeout(800);
  await page.screenshot({ path: './test-shots/alerts-modal.png' });

  // Check zone dropdown has options
  const zoneOptions = await page.locator('select option').count();
  console.log('Options dans select zone:', zoneOptions);

  // Create an alert
  await page.selectOption('select', { index: 1 });
  await page.fill('textarea', 'Test alerte Playwright — surveillance active');
  await page.screenshot({ path: './test-shots/alerts-modal-filled.png' });
  await page.click('button:has-text("Créer")');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: './test-shots/alerts-after-create.png' });
  const successModal = await page.locator('text=Nouvelle alerte').isVisible();
  console.log('Modal fermée après création:', !successModal ? '✅' : '❌ encore ouverte');
}

// Try acknowledge on first alert
const ackBtn = page.locator('button:has-text("Acquitter")').first();
const hasAck = await ackBtn.isVisible();
console.log('Bouton Acquitter visible:', hasAck ? '✅' : '❌');
if (hasAck) {
  await ackBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: './test-shots/alerts-acknowledged.png' });
  console.log('Acquitter cliqué ✅');
}

await browser.close();
console.log('Test terminé.');
