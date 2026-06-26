import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';
try { mkdirSync('./test-shots'); } catch {}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

// Login
await page.goto('http://localhost:5173');
await page.waitForTimeout(1500);
await page.fill('input[type="email"]', 'mamadou.sy@msas.gouv.sn');
await page.fill('input[type="password"]', 'Faypal2025!');
await page.click('button[type="submit"]');
await page.waitForTimeout(2500);

// Paramètres → Sécurité
await page.click('button:has-text("Paramètres")');
await page.waitForTimeout(600);
await page.click('button:has-text("Sécurité")');
await page.waitForTimeout(400);

// Test 1 — mauvais mot de passe actuel
const inputs = page.locator('section input, div input[type="password"], input[type="password"]');
await page.locator('input[type="password"]').nth(0).fill('MauvaisMotDePasse');
await page.locator('input[type="password"]').nth(1).fill('NouveauPass123!');
await page.locator('input[type="password"]').nth(2).fill('NouveauPass123!');
await page.click('button:has-text("Changer le mot de passe")');
await page.waitForTimeout(2000);
await page.screenshot({ path: './test-shots/pw2-wrong.png' });
const allText = await page.locator('p').allTextContents();
const errText = allText.find(t => t.includes('incorrect') || t.includes('Erreur') || t.includes('invalide') || t.includes('correspond'));
console.log('Test 1 — Mauvais mdp actuel :', errText ? `✅ "${errText}"` : '❌ Pas de message');

// Test 2 — confirmation différente
await page.locator('input[type="password"]').nth(0).fill('Faypal2025!');
await page.locator('input[type="password"]').nth(1).fill('NouveauPass123!');
await page.locator('input[type="password"]').nth(2).fill('AutrePass456!');
await page.click('button:has-text("Changer le mot de passe")');
await page.waitForTimeout(500);
const allText2 = await page.locator('p').allTextContents();
const errConfirm = allText2.find(t => t.includes('correspond'));
console.log('Test 2 — Confirmation :', errConfirm ? `✅ "${errConfirm}"` : '❌ Pas de message');

// Test 3 — changement valide
await page.locator('input[type="password"]').nth(0).fill('Faypal2025!');
await page.locator('input[type="password"]').nth(1).fill('Faypal2025Test!');
await page.locator('input[type="password"]').nth(2).fill('Faypal2025Test!');
await page.click('button:has-text("Changer le mot de passe")');
await page.waitForTimeout(2500);
await page.screenshot({ path: './test-shots/pw2-success.png' });
const allText3 = await page.locator('p').allTextContents();
const successText = allText3.find(t => t.includes('succès') || t.includes('Modifié'));
console.log('Test 3 — Changement valide :', successText ? `✅ "${successText}"` : '❌ Pas de message succès');

// Test 4 — remettre l'ancien mot de passe
await page.locator('input[type="password"]').nth(0).fill('Faypal2025Test!');
await page.locator('input[type="password"]').nth(1).fill('Faypal2025!');
await page.locator('input[type="password"]').nth(2).fill('Faypal2025!');
await page.click('button:has-text("Changer le mot de passe")');
await page.waitForTimeout(2500);
const allText4 = await page.locator('p').allTextContents();
const restored = allText4.find(t => t.includes('succès') || t.includes('Modifié'));
console.log('Test 4 — Restauration mdp original :', restored ? `✅ "${restored}"` : '❌');

await browser.close();
