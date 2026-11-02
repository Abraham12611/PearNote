/* Issue #64b — device-emulated Home desk verification (PR #75 review).
 * Real Playwright emulation (isMobile + touch): asserts every subject
 * tile is ONE accessible button, keyboard focus reaches it, and a click
 * produces exactly one navigation. Also captures emulated screenshots.
 *
 *   node scripts/check-home-desk.mjs [--url http://localhost:5173] [--shots /tmp/desk-shots]
 *   (run from a dir where `playwright` resolves, e.g. the npx cache)
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.argv.includes("--url")
  ? process.argv[process.argv.indexOf("--url") + 1]
  : "http://localhost:5173";
const SHOTS = process.argv.includes("--shots")
  ? process.argv[process.argv.indexOf("--shots") + 1]
  : "/tmp/desk-shots";
const WIDTHS = [320, 390, 768, 1440];
const URL = `${BASE}/demo?mock=1&fixtures=1`;

mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch();
let failures = 0;

for (const width of WIDTHS) {
  const page = await browser.newPage({
    viewport: { width, height: width > 800 ? 900 : 844 },
    isMobile: width <= 800, hasTouch: width <= 800,
  });
  await page.goto(URL, { waitUntil: "networkidle" });

  const iw = await page.evaluate(() => window.innerWidth);
  if (iw !== width) { console.error(`✗ ${width}px: innerWidth=${iw}`); failures++; }

  const report = await page.evaluate(() => {
    const tiles = [...document.querySelectorAll('[data-testid^="desk-subject-"]')];
    const out = { tiles: tiles.length, issues: [] };
    for (const t of tiles) {
      /* exactly one accessible button — no nested interactive content */
      if (t.tagName !== "BUTTON") out.issues.push(`${t.dataset.testid} not a <button>`);
      if (t.querySelector("button, a, input")) out.issues.push(`${t.dataset.testid} nested control`);
      if (t.tabIndex !== 0) out.issues.push(`${t.dataset.testid} tabIndex=${t.tabIndex}`);
    }
    /* keyboard: first tile must accept real focus */
    const first = tiles[0];
    if (first) {
      first.focus();
      if (document.activeElement !== first) out.issues.push("first tile not focusable");
    }
    return out;
  });

  if (report.tiles === 0) { console.error(`✗ ${iw}px: no subject tiles`); failures++; }
  if (report.issues.length) {
    failures += report.issues.length;
    console.error(`✗ ${iw}px: ${report.issues.join("; ")}`);
  }

  /* one click → exactly one navigation */
  const navs = [];
  const firstTile = page.locator('[data-testid^="desk-subject-"]').first();
  if (await firstTile.count()) {
    page.on("framenavigated", (f) => { if (f === page.mainFrame()) navs.push(f.url()); });
    await firstTile.click();
    await page.waitForTimeout(400);
    const landed = navs.filter((u) => u.includes("/subjects/"));
    if (landed.length !== 1) {
      failures++;
      console.error(`✗ ${iw}px: click produced ${landed.length} navigations → ${navs.join(" | ")}`);
    }
  }

  console.log(`${iw}px ${report.issues.length ? "✗" : "✓"} tiles=${report.tiles} focusable navs=${navs.length}`);
  await page.screenshot({ path: `${SHOTS}/desk-emu-${width}.png` });
  await page.close();
}

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : "\nall widths PASS");
process.exit(failures ? 1 : 0);
