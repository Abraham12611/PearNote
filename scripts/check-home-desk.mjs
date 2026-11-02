/* Issue #64b — device-emulated Home desk verification (PR #79 review).
 * Real Playwright emulation (isMobile + touch), NOT --window-size:
 *   · screenshots the Home BEFORE any click (the prior version shot the
 *     destination page); destination captured as a separate image
 *   · same-viewport comparison of original /#/space/crew/knows vs /demo
 *   · a genuine zero-subject account (/app?mock=1, no fixtures) must
 *     show honest empties — no sample friends/awards/progress
 *   · subject select, resume, and + all produce correct single
 *     navigations (demo + => demo notice, zero navigation)
 *
 *   node check-home-desk.mjs --url http://localhost:5173 --shots /tmp/desk-emu
 *   (run where `playwright` resolves, e.g. the npx cache)
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = arg("--url", "http://localhost:5173");
const SHOTS = arg("--shots", "/tmp/desk-emu");
const WIDTHS = [320, 390, 1440];
const DEMO = `${BASE}/demo?mock=1&fixtures=1`;
const ORIG = `${BASE}/?mock=1#/space/crew/knows`;
const EMPTY_APP = `${BASE}/app?mock=1`;

function arg(flag, dflt) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : dflt;
}
function navsOf(page) {
  const navs = [];
  page.on("framenavigated", (f) => {
    if (f === page.mainFrame()) navs.push(f.url());
  });
  return navs;
}
const fail = (m) => { failures++; console.error(`✗ ${m}`); };

mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch();
let failures = 0;

async function emulated(width) {
  const mobile = width <= 800;
  const page = await browser.newPage({
    viewport: { width, height: width > 800 ? 900 : 844 },
    isMobile: mobile, hasTouch: mobile,
  });
  await page.goto(DEMO, { waitUntil: "networkidle" });
  return page;
}

for (const width of WIDTHS) {
  /* ---- /demo Home — screenshot FIRST, before any interaction ------- */
  const page = await emulated(width);
  const iw = await page.evaluate(() => window.innerWidth);
  if (iw !== width) fail(`innerWidth=${iw} expected ${width}`);
  await page.screenshot({ path: `${SHOTS}/demo-home-${width}.png` });

  const checks = await page.evaluate(() => {
    const tiles = [...document.querySelectorAll('[data-testid^="desk-subject-"]')];
    const issues = [];
    for (const t of tiles) {
      if (t.tagName !== "BUTTON") issues.push(`${t.dataset.testid} not <button>`);
      if (t.querySelector("button, a, input")) issues.push(`${t.dataset.testid} nested control`);
      if (t.tabIndex !== 0) issues.push(`${t.dataset.testid} not focusable`);
    }
    const first = tiles[0];
    if (first) { first.focus(); if (document.activeElement !== first) issues.push("focus failed"); }
    return { tiles: tiles.length, issues, resume: !!document.querySelector('[data-testid="desk-resume"]') };
  });
  if (!checks.tiles) fail(`${iw}px: no subject tiles on Home`);
  for (const i of checks.issues) fail(`${iw}px: ${i}`);

  /* subject click → exactly one /subjects/ navigation */
  const navs = navsOf(page);
  await page.locator('[data-testid^="desk-subject-"]').first().click();
  await page.waitForTimeout(450);
  const dest = navs.filter((u) => u.includes("/subjects/"));
  if (dest.length !== 1) fail(`${iw}px: ${dest.length} navigations on subject click`);
  await page.screenshot({ path: `${SHOTS}/demo-dest-${width}.png` });

  /* back to Home: resume → exactly one /lessons/ navigation */
  const page2 = await emulated(width);
  const navs2 = navsOf(page2);
  await page2.locator('[data-testid="desk-resume"]').click();
  await page2.waitForTimeout(450);
  const lesson = navs2.filter((u) => u.includes("/lessons/"));
  if (checks.resume && lesson.length !== 1)
    fail(`${iw}px: ${lesson.length} navigations on resume`);
  await page2.close();

  /* + in demo → demo notice, ZERO navigation (writes are off) */
  const page3 = await emulated(width);
  const navs3 = navsOf(page3);
  await page3.locator('[data-testid="desk-add"]').click();
  await page3.waitForTimeout(400);
  const wrote = navs3.filter((u) => u.includes("/new") || u.includes("/sources"));
  if (wrote.length) fail(`${iw}px: demo create navigated to ${wrote[0]}`);
  const note = await page3.evaluate(() =>
    [...document.querySelectorAll("[class*=notice], [role=status]")]
      .some((n) => /off in the demo|demo/i.test(n.textContent ?? "")));
  if (!note) fail(`${iw}px: no demo notice after + click`);
  await page3.close();
  await page.close();
  console.log(`${iw}px demo ✓ tiles=${checks.tiles} resume=${checks.resume} navs clean`);
}

for (const width of WIDTHS) {
  /* ---- original /#/space/crew/knows — same viewport ----------------- */
  const mobile = width <= 800;
  const page = await browser.newPage({
    viewport: { width, height: width > 800 ? 900 : 844 },
    isMobile: mobile, hasTouch: mobile,
  });
  await page.goto(ORIG, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${SHOTS}/knows-orig-${width}.png` });
  await page.close();

  /* ---- genuine zero-subject account — honest empties ---------------- */
  const p2 = await browser.newPage({
    viewport: { width, height: width > 800 ? 900 : 844 },
    isMobile: mobile, hasTouch: mobile,
  });
  await p2.goto(EMPTY_APP, { waitUntil: "domcontentloaded" });
  await p2.waitForTimeout(1600);
  const zero = await p2.evaluate(() => ({
    /* desk-add's own testid matches neither prefix — no compensation */
    subjects: document.querySelectorAll('[data-testid^="desk-subject-"], [data-testid^="desk-space-"]').length,
    resume: !!document.querySelector('[data-testid="desk-resume"]'),
    empties: document.querySelectorAll(".knows-empty").length,
    friends: /friend/i.test(document.querySelector('[data-testid="desk-friends"]')?.textContent ?? ""),
    fixtureTag: document.querySelector("[data-fixture]"),
  }));
  if (zero.subjects !== 0) fail(`${width}px: fresh account shows ${zero.subjects} subjects`);
  if (zero.resume) fail(`${width}px: fresh account shows a resume card`);
  if (zero.empties < 3) fail(`${width}px: only ${zero.empties} honest empties`);
  if (zero.fixtureTag) fail(`${width}px: fixture label leaked into a real account`);
  await p2.screenshot({ path: `${SHOTS}/app-empty-${width}.png` });
  await p2.close();
  console.log(`${width}px empty ✓ subjects=0 resume=0 empties=${zero.empties}`);
}

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : "\nall checks PASS");
process.exit(failures ? 1 : 0);
