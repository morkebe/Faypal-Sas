import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';
try { mkdirSync('./test-shots'); } catch {}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

// Login
await page.goto('http://localhost:5173');
await page.waitForTimeout(1000);
await page.fill('input[type="email"]', 'mamadou.sy@msas.gouv.sn');
await page.fill('input[type="password"]', 'Faypal2025!');
await page.click('button[type="submit"]');
await page.waitForTimeout(2500);

// Paramètres → Sécurité
await page.click('button:has-text("Paramètres")');
await page.waitForTimeout(600);
await page.click('button:has-text("Sécurité")');
await page.waitForTimeout(400);
await page.screenshot({ path: './test-shots/pw-form.png' });
console.log('📸 pw-form');

// Test 1 — mauvais mot de passe actuel
const inputs = page.locator('input[type="password"]');
await inputs.nth(0).fill('MauvaisMotDePasse');
await inputs.nth(1).fill('NouveauPass123!');
await inputs.nth(2).fill('NouveauPass123!');
await page.click('button:has-text("Changer le mot de passe")');
await page.waitForTimeout(1500);
await page.screenshot({ path: './test-shots/pw-wrong.png' });
const errText = await page.locator('p[style*="#EF4444"]').textContent().catch(() => '');
console.log('❌ Erreur attendue :', errText);

// Test 2 — confirmation différente
await inputs.nth(0).fill('Faypal2025!');
await inputs.nth(1).fill('NouveauPass123!');
await inputs.nth(2).fill('AutrePass456!');
await page.click('button:has-text("Changer le mot de passe")');
await page.waitForTimeout(500);
const errConfirm = await page.locator('p[style*="#EF4444"]').textContent().catch(() => '');
console.log('❌ Erreur confirmation :', errConfirm);

// Test 3 — changement valide (temporaire, on remet l'ancien après)
await inputs.nth(0).fill('Faypal2025!');
await inputs.nth(1).fill('Faypal2025Test!');
await inputs.nth(2).fill('Faypal2025Test!');
await page.click('button:has-text("Changer le mot de passe")');
await page.waitForTimeout(2000);
await page.screenshot({ path: './test-shots/pw-success.png' });
const success = await page.locator('p[style*="#16A34A"]').textContent().catch(() => '');
console.log('✅ Succès :', success);

await browser.close();
