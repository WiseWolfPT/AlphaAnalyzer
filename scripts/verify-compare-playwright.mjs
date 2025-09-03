#!/usr/bin/env node
import { chromium, firefox, webkit, request as pwrequest } from 'playwright';
import fs from 'fs';
import path from 'path';

const TARGET_URL = process.env.TARGET_URL || 'https://128.140.45.28.sslip.io/compare';
const OUT_DIR = path.resolve('.playwright-mcp');

async function main() {
  const errors = [];
  const warnings = [];
  const logs = [];

  // Allow selecting browser via env and fallback across engines locally
  const which = (process.env.BROWSER || 'chromium').toLowerCase();
  if (which === 'none' || which === 'request') {
    // Headless-less fallback: use Playwright APIRequestContext to check page reachability
    const ctx = await pwrequest.newContext({ ignoreHTTPSErrors: true });
    const resp = await ctx.get(TARGET_URL);
    const status = resp.status();
    const body = await resp.text();
    const ok = status === 200;
    const result = {
      ok,
      url: TARGET_URL,
      httpStatus: status,
      mode: 'request',
      bodyBytes: body.length,
      containsWaitFor: !!(process.env.WAIT_FOR && body.includes(process.env.WAIT_FOR.replace('h1:has-text("','').replace('")',''))),
    };
    console.log(JSON.stringify(result, null, 2));
    await ctx.dispose();
    return;
  }
  const launch = async (engine) => engine.launch({ headless: true, args: ['--no-sandbox'] });
  let browser;
  try {
    if (which === 'firefox') browser = await launch(firefox);
    else if (which === 'webkit') browser = await launch(webkit);
    else browser = await launch(chromium);
  } catch (e) {
    // Fallbacks if the preferred engine fails to launch (useful for local seatbelt issues)
    try { browser = await launch(webkit); } catch {}
    if (!browser) {
      try { browser = await launch(firefox); } catch {}
    }
    if (!browser) throw e;
  }
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') errors.push(text);
    else if (type === 'warning') warnings.push(text);
    logs.push({ type, text });
  });

  // Capture 404/500 responses
  const failedResources = [];
  page.on('response', (resp) => {
    const status = resp.status();
    if (status >= 400) {
      failedResources.push({ status, url: resp.url() });
    }
  });

  try {
    const resp = await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
    const status = resp?.status();

    // Espera por algo que só exista na Compare
    const sel = process.env.WAIT_FOR || 'h1:has-text("Compare Stocks")';
    await page.waitForSelector(sel, { timeout: 30000 }).catch(() => {});

    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = path.join(OUT_DIR, `production-compare-check-${ts}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const result = {
      ok: true,
      url: TARGET_URL,
      httpStatus: status ?? null,
      errors: errors.slice(0, 10),
      warnings: warnings.slice(0, 10),
      failedResources: failedResources.slice(0, 10),
      screenshot: screenshotPath,
    };
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    const result = {
      ok: false,
      url: TARGET_URL,
      error: e?.message || String(e),
      errors,
      warnings,
    };
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = 1;
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

main();
