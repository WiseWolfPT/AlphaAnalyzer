#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'https://128.140.45.28.sslip.io';
const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;
const OUT_DIR = path.resolve('.playwright-mcp');

if (!EMAIL || !PASSWORD) {
  console.error(JSON.stringify({ ok: false, error: 'Missing TEST_EMAIL or TEST_PASSWORD env' }));
  process.exit(1);
}

async function typeIfExists(page, selectors, value) {
  for (const sel of selectors) {
    const el = await page.$(sel).catch(() => null);
    if (el) { await el.fill(value); return true; }
  }
  return false;
}

async function clickIfExists(page, selectors) {
  for (const sel of selectors) {
    const el = await page.$(sel).catch(() => null);
    if (el) { await el.click(); return true; }
  }
  return false;
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const logs = [];
  const errors = [];

  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    logs.push({ type, text });
    if (type === 'error') errors.push(text);
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // Go to login page
  const loginUrl = `${BASE_URL}/auth/login`;
  const resp = await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const httpStatus = resp?.status();

  // Try to fill email/password by multiple common selectors
  await typeIfExists(page, [
    'input[type="email"]', 'input[name="email"]', 'input[autocomplete="email"]',
    'input[placeholder*="Email" i]', 'input[placeholder*="E-mail" i]'
  ], EMAIL);

  await typeIfExists(page, [
    'input[type="password"]', 'input[name="password"]', 'input[autocomplete="current-password"]',
    'input[placeholder*="Password" i]'
  ], PASSWORD);

  await clickIfExists(page, [
    'button[type="submit"]', 'button:has-text("Login")', 'button:has-text("Sign In")',
    'button:has-text("Entrar")'
  ]);

  // Wait for navigation or visible app shell
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

  // Heuristics: check if we are logged in (profile/portfolios links visible)
  const maybeLogged = await page.locator('text=Portfolios, text=My Portfolios, text=Watchlists').first().isVisible().catch(()=>false);

  // Navigate to portfolios page to confirm auth-protected route
  const portfoliosUrl = `${BASE_URL}/portfolios`;
  await page.goto(portfoliosUrl, { waitUntil: 'domcontentloaded' }).catch(()=>{});
  const pageContent = await page.content();

  const shotPath = path.join(OUT_DIR, `login-${EMAIL.replace(/[^a-zA-Z0-9]/g,'_')}-${timestamp}.png`);
  await page.screenshot({ path: shotPath, fullPage: true }).catch(()=>{});

  console.log(JSON.stringify({
    ok: true,
    baseUrl: BASE_URL,
    loginUrl,
    httpStatus,
    loggedHeuristic: maybeLogged,
    containsPortfolios: /Portfolio/i.test(pageContent),
    screenshot: shotPath,
    errors: errors.slice(0, 10),
    logs: logs.slice(0, 10),
  }, null, 2));

  await context.close();
  await browser.close();
}

main().catch(err => {
  console.error(JSON.stringify({ ok: false, error: err?.message || String(err) }));
  process.exit(1);
});

