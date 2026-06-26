import { chromium } from '@playwright/test';
import { writeFileSync } from 'fs';

const BASE = 'http://localhost:5174';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

const shot = async (name) => {
  await page.screenshot({ path: `./test-shots/${name}.png` });
  console.log(`📸 ${name}`);
};

// Crée le dossier screenshots
import { mkdirSync } from 'fs';
try { mkdirSync('./test-shots'); } catch {}

// ── 1. Page d'auth ──────────────────────────────────────────────────────────
await page.goto(BASE);
await page.waitForTimeout(1500);
await shot('1-auth');
console.log('✅ Page auth chargée');

// ── 2. Login admin ──────────────────────────────────────────────────────────
await page.fill('input[type="email"]', 'mamadou.sy@msas.gouv.sn');
await page.fill('input[type="password"]', 'Faypal2025!');
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);
await shot('2-dashboard');
const isLoggedIn = await page.locator('text=Tableau de bord').count() > 0;
console.log(isLoggedIn ? '✅ Connexion admin OK' : '❌ Connexion échouée');

// ── 3. Page Utilisateurs ────────────────────────────────────────────────────
await page.click('button:has-text("Utilisateurs")');
await page.waitForTimeout(2500);
await shot('3-users');
const userHeader = await page.locator('h2:has-text("Utilisateurs")').count();
console.log(userHeader > 0 ? '✅ Page Utilisateurs chargée' : '❌ Page Utilisateurs non trouvée');

// ── 4. Page Alertes ─────────────────────────────────────────────────────────
await page.click('button:has-text("Alertes")');
await page.waitForTimeout(1500);
await shot('4-alerts');
const alertHeader = await page.locator('h2:has-text("Alertes")').count();
console.log(alertHeader > 0 ? '✅ Page Alertes chargée' : '❌ Page Alertes non trouvée');

// ── 5. Acquitter une alerte ─────────────────────────────────────────────────
const acquitBtns = page.locator('button:has-text("Acquitter")');
const acquitCount = await acquitBtns.count();
if (acquitCount > 0) {
  await acquitBtns.first().click();
  await page.waitForTimeout(800);
  await shot('5-alert-acquittee');
  console.log('✅ Acquittement alerte OK');
}

// ── 6. MoustiBox ────────────────────────────────────────────────────────────
await page.click('button:has-text("MoustiBox")');
await page.waitForTimeout(1000);
await shot('6-moustibox');
console.log('✅ Page MoustiBox chargée');

// ── 7. Scores de risque ─────────────────────────────────────────────────────
await page.click('button:has-text("Scores de risque")');
await page.waitForTimeout(1000);
await shot('7-scores');
console.log('✅ Page Scores chargée');

// ── 8. Carte des risques ────────────────────────────────────────────────────
await page.click('button:has-text("Carte des risques")');
await page.waitForTimeout(2000);
await shot('8-map');
console.log('✅ Page Carte chargée');

// ── 9. Déconnexion ──────────────────────────────────────────────────────────
// Bouton direct dans la sidebar (title="Se déconnecter")
const decoBtn = page.locator('button[title="Se déconnecter"]');
if (await decoBtn.count() > 0) {
  await decoBtn.click();
  await page.waitForTimeout(1200);
  await shot('9-logout');
  console.log('✅ Déconnexion OK');
} else {
  // Fallback : profil menu header
  const profileBtn = page.locator('button:has-text("Dr.")');
  if (await profileBtn.count() > 0) await profileBtn.click();
  await page.waitForTimeout(400);
  const dropDeco = page.locator('button:has-text("Déconnexion")');
  if (await dropDeco.count() > 0) {
    await dropDeco.click();
    await page.waitForTimeout(1200);
    await shot('9-logout');
    console.log('✅ Déconnexion (menu) OK');
  }
}

// ── 10. Test rôle Lecteur (pages limitées) ──────────────────────────────────
await page.fill('input[type="email"]', 'm.sarr@msas.gouv.sn');
await page.fill('input[type="password"]', 'Faypal2025!');
await page.click('button[type="submit"]');
await page.waitForTimeout(2500);
await shot('10-reader');
const navItems = await page.locator('nav button').allTextContents();
console.log('📋 Nav Lecteur :', navItems.filter(t => t.trim()).join(' | '));
const hasAdmin = navItems.some(t => t.includes('Utilisateurs') || t.includes('Paramètres') || t.includes('MoustiBox'));
console.log(hasAdmin ? '❌ Lecteur voit des pages admin' : '✅ RBAC lecteur OK');

await browser.close();
console.log('\n✅ Tests terminés — screenshots dans ./test-shots/');
