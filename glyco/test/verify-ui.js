/* Headless UI verification for the GlycoOrder frontend.
 *
 * The README calls this the project's verification convention, but for a long time the
 * script only ever existed in throwaway scratch directories — so every session rewrote
 * it from scratch, and the rewrites drifted (one silently "failed" three checks because
 * it still stubbed window.Capacitor the pre-Capacitor way). It lives here now so it
 * stays correct and runs in CI.
 *
 * Serves glyco/ and drives the real UI in Chromium with glyco-server's endpoints mocked
 * via page.route — so it exercises DB matching, the order engine, the quota chip, and the
 * paywall without spending Anthropic tokens or needing Upstash/RevenueCat credentials.
 *
 * Run:  npm run test:ui           (from glyco/)
 * Browser resolution: set CHROMIUM_PATH to use a pre-installed binary, otherwise
 * Playwright's own managed download is used (`npx playwright install chromium`).
 */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const APP_DIR = path.join(__dirname, "..");
const PORT = Number(process.env.VERIFY_PORT || 8123);

const MIME = {
  ".html": "text/html", ".js": "application/javascript", ".css": "text/css",
  ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml"
};

function serve(root, port) {
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split("?")[0]);
    if (rel === "/") rel = "/index.html";
    // Contain path traversal — this serves a real directory to a real browser.
    const full = path.join(root, path.normalize(rel));
    if (!full.startsWith(root)) { res.writeHead(403); res.end(); return; }
    fs.readFile(full, (err, data) => {
      if (err) { res.writeHead(404); res.end("not found"); return; }
      res.writeHead(200, { "content-type": MIME[path.extname(full)] || "application/octet-stream" });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(port, "127.0.0.1", () => resolve(server)));
}

// Smallest valid JPEG — enough for the app's canvas downscale path to succeed.
const TINY_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
  "base64");

const RECOGNITION = {
  foods: [{ name: "White rice", grams: 150, portion_desc: "1 bowl", category: "starch", gi_fallback: 70, carbs100_fallback: 28 }],
  photo_note: ""
};
const resetAt = () => new Date(Date.now() + 86400000).toISOString();

function mockQuota(page, quota) {
  return page.route("**/api/quota**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(quota) }));
}

async function pickPhoto(page) {
  await page.locator("#photo-input").setInputFiles({ name: "meal.jpg", mimeType: "image/jpeg", buffer: TINY_JPEG });
  await page.waitForTimeout(200);
}

async function main() {
  let chromium;
  try {
    ({ chromium } = require("playwright"));
  } catch {
    try { ({ chromium } = require("playwright-core")); }
    catch {
      console.error("Playwright is not installed. Run `npm install` in glyco/, then `npx playwright install chromium`.");
      process.exit(1);
    }
  }

  const server = await serve(APP_DIR, PORT);
  const url = `http://127.0.0.1:${PORT}/index.html`;
  const launchOpts = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};
  const browser = await chromium.launch(launchOpts);

  const results = [];
  const check = (name, pass) => results.push({ name, pass: !!pass });

  // ── Normal free-tier flow ────────────────────────────────────────────────────
  {
    const page = await browser.newPage();
    let analyzeCalls = 0;
    await mockQuota(page, { unlimited: false, limit: 3, remaining: 3, resetAt: resetAt() });
    await page.route("**/api/analyze", route => {
      analyzeCalls++;
      route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ ...RECOGNITION, quota: { unlimited: false, limit: 3, remaining: 2, resetAt: resetAt() } })
      });
    });
    await page.goto(url);
    await page.waitForTimeout(300);

    check("analyze is disabled until a photo is chosen", await page.locator("#analyze-btn").isDisabled());
    check("quota chip shows the full weekly allowance", (await page.locator("#quota-chip").textContent()).includes("3"));

    await pickPhoto(page);
    check("analyze enables with a photo and no API key configured", await page.locator("#analyze-btn").isEnabled());

    await page.locator("#analyze-btn").click();
    await page.waitForTimeout(400);
    check("the proxy's /api/analyze was called", analyzeCalls === 1);
    check("recognized food is rendered", (await page.locator("#food-list").textContent()).includes("White rice"));
    check("GI came from the local database, not the AI fallback", (await page.locator("#food-list").textContent()).includes("📚"));
    check("eating-order steps are rendered", (await page.locator("#order-list").textContent()).trim().length > 0);
    check("quota chip decrements after analyzing", (await page.locator("#quota-chip").textContent()).includes("2"));

    await page.locator('.tab[data-tab="settings"]').click();
    await page.waitForTimeout(100);
    check("Settings no longer has an API-key field", await page.locator("#api-key-input").count() === 0);
    check("Settings no longer has a model picker", await page.locator("#model-select").count() === 0);
    check("subscription card is hidden on the plain web build", await page.locator("#subscription-card").isHidden());
    await page.close();
  }

  // ── Quota exhausted → paywall, not the generic error banner ──────────────────
  {
    const page = await browser.newPage();
    const spent = { unlimited: false, limit: 3, remaining: 0, resetAt: resetAt() };
    await mockQuota(page, spent);
    await page.route("**/api/analyze", route =>
      route.fulfill({ status: 402, contentType: "application/json", body: JSON.stringify({ error: "quota_exceeded", quota: spent }) }));
    await page.goto(url);
    await page.waitForTimeout(300);
    check("quota chip switches to its empty styling at 0 left", await page.locator("#quota-chip.quota-empty").count() === 1);

    await pickPhoto(page);
    await page.locator("#analyze-btn").click();
    await page.waitForTimeout(400);
    check("paywall opens when the weekly quota is spent", await page.locator("#paywall-modal").isVisible());
    check("the generic error banner stays hidden on a 402", await page.locator("#error-box").isHidden());
    check("no upgrade button on web, where no purchase can complete", await page.locator("#paywall-upgrade-btn").isHidden());
    check("web build explains where unlimited is available", await page.locator("#paywall-web-hint").isVisible());

    await page.locator("#paywall-close-btn").click();
    await page.waitForTimeout(100);
    check("paywall can be dismissed", await page.locator("#paywall-modal").isHidden());
    await page.close();
  }

  // ── Native (Capacitor) build surfaces the purchase UI ────────────────────────
  {
    const page = await browser.newPage();
    const spent = { unlimited: false, limit: 3, remaining: 0, resetAt: resetAt() };
    await mockQuota(page, spent);
    await page.route("**/api/analyze", route =>
      route.fulfill({ status: 402, contentType: "application/json", body: JSON.stringify({ error: "quota_exceeded", quota: spent }) }));
    await page.goto(url);
    await page.waitForTimeout(300);

    // The app bundles the real @capacitor/core, which installs its own Capacitor global
    // and reports isNativePlatform() === false in a browser. Stubbing before load gets
    // overwritten by it — so flip the method afterwards. isNative() is read lazily on
    // each UI update, so this takes effect on the next render.
    await page.evaluate(() => { window.Capacitor.isNativePlatform = () => true; });

    await page.locator('.tab[data-tab="settings"]').click();
    await page.waitForTimeout(100);
    check("subscription card appears on a native build", await page.locator("#subscription-card").isVisible());

    await page.locator('.tab[data-tab="analyze"]').click();
    await page.waitForTimeout(100);
    await pickPhoto(page);
    await page.locator("#analyze-btn").click();
    await page.waitForTimeout(400);
    check("upgrade button appears on a native build", await page.locator("#paywall-upgrade-btn").isVisible());
    check("web-only hint is suppressed on a native build", await page.locator("#paywall-web-hint").isHidden());
    await page.close();
  }

  // ── Language switch re-translates live ───────────────────────────────────────
  {
    const page = await browser.newPage();
    await mockQuota(page, { unlimited: false, limit: 3, remaining: 3, resetAt: resetAt() });
    await page.goto(url);
    await page.waitForTimeout(300);
    await page.locator("#lang-toggle").click();
    await page.waitForTimeout(200);
    const zh = await page.locator("#quota-chip").textContent();
    check("quota chip re-renders in the switched language", /本週|次分析/.test(zh));
    await page.close();
  }

  // ── A subscriber's status survives a language switch ─────────────────────────
  // Regression guard: #subscription-status used to carry a data-i18n attribute, so
  // I18n.apply() overwrote "unlimited active" with the free-plan string on every switch.
  {
    const page = await browser.newPage();
    await mockQuota(page, { unlimited: true, limit: null, remaining: null, resetAt: null });
    await page.goto(url);
    await page.waitForTimeout(300);
    await page.evaluate(() => { window.Capacitor.isNativePlatform = () => true; });
    await page.locator('.tab[data-tab="settings"]').click();
    await page.waitForTimeout(150);

    const before = await page.locator("#subscription-status").textContent();
    check("subscriber sees the unlimited status, not the free-plan line", before.includes("✅"));
    await page.locator("#lang-toggle").click();
    await page.waitForTimeout(200);
    const after = await page.locator("#subscription-status").textContent();
    check("unlimited status survives a language switch", after.includes("✅"));
    await page.close();
  }

  await browser.close();
  await new Promise(r => server.close(r));

  results.forEach(r => console.log(`${r.pass ? "PASS" : "FAIL"} - ${r.name}`));
  const failed = results.filter(r => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
