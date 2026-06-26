import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';
try { mkdirSync('./test-shots'); } catch {}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

// Login admin
await page.goto('http://localhost:5173');
await page.waitForTimeout(1000);
await page.fill('input[type="email"]', 'mamadou.sy@msas.gouv.sn');
await page.fill('input[type="password"]', 'Faypal2025!');
await page.click('button[type="submit"]');
await page.waitForTimeout(2500);

// Aller sur Paramètres
await page.click('button:has-text("Paramètres")');
await page.waitForTimeout(800);

// Cliquer sur Zones
await page.click('button:has-text("Zones")');
await page.waitForTimeout(2000);
await page.screenshot({ path: './test-shots/zones-list.png' });
console.log('📸 zones-list');

// Ouvrir le modal Nouvelle zone
await page.click('button:has-text("Nouvelle zone")');
await page.waitForTimeout(400);
await page.screenshot({ path: './test-shots/zones-modal.png' });
console.log('📸 zones-modal');

// Créer un district → sélectionner District
await page.click('button:has-text("District")');
await page.waitForTimeout(200);
await page.screenshot({ path: './test-shots/zones-modal-district.png' });
console.log('📸 zones-modal-district');

await browser.close();
console.log('✅ done');
