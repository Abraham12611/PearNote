/* Issue #64 — device-emulated mobile dock verification.
 * REAL emulation via Playwright (isMobile + touch + viewport), not
 * --window-size screenshots: asserts innerWidth, measures every
 * control's bounding rect, and proves clickability by scrolling the
 * strip and hit-testing with elementFromPoint.
 *
 *   NODE_PATH=$(npm root -g) node scripts/check-dock-mobile.mjs \
 *     [--url http://localhost:5173] [--shots /tmp/dock-shots]
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.argv.includes("--url")
  ? process.argv[process.argv.indexOf("--url") + 1]
  : "http://localhost:5173";
const SHOTS = process.argv.includes("--shots")
  ? process.argv[process.argv.indexOf("--shots") + 1]
  : "/tmp/dock-shots";
const WIDTHS = [320, 360, 390, 768];
const URL = `${BASE}/demo?mock=1&fixtures=1`;
const CONTROLS = [
  "nav-link-home", "nav-link-learn", "nav-link-library",
  "nav-link-groups", "nav-link-achievements", "nav-link-profile",
  "nav-create", "nav-settings",
];

mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch();
let failures = 0;

for (const width of WIDTHS) {
  const page = await browser.newPage({
    viewport: { width, height: 844 },
    isMobile: true, hasTouch: true,
  });
  await page.goto(URL, { waitUntil: "networkidle" });

  const iw = await page.evaluate(() => window.innerWidth);
  if (iw !== width) { console.error(`✗ ${width}px: innerWidth=${iw}`); failures++; }

  const report = await page.evaluate((controls) => {
    const rail = document.querySelector(".space-rail");
    const list = document.querySelector(".space-list");
    const out = { controls: {}, rail: null, list: null };
    if (rail) {
      const r = rail.getBoundingClientRect();
      out.rail = { x: r.x, w: r.width, bottom: window.innerHeight - r.bottom };
    }
    if (list) {
      out.list = {
        clientW: list.clientWidth,
        scrollW: list.scrollWidth,
        scrollable: list.scrollWidth > list.clientWidth,
      };
    }
    for (const id of controls) {
      const el = document.querySelector(`[data-testid="${id}"]`);
      if (!el) { out.controls[id] = { missing: true }; continue; }
      /* clickability = scroll into view inside the strip, then hit-test */
      el.scrollIntoView({ block: "nearest", inline: "center" });
      const r = el.getBoundingClientRect();
      const cx = Math.min(Math.max(r.x + r.width / 2, 1), window.innerWidth - 1);
      const cy = Math.min(Math.max(r.y + r.height / 2, 1), window.innerHeight - 1);
      const hit = document.elementFromPoint(cx, cy);
      out.controls[id] = {
        w: Math.round(r.width), h: Math.round(r.height),
        inViewport: r.right > 0 && r.left < window.innerWidth,
        clickable: hit === el || el.contains(hit) || hit?.closest(`[data-testid="${id}"]`) === el,
        railCovered: hit?.closest(".space-rail") === rail,
      };
    }
    return out;
  }, CONTROLS);

  const bad = Object.entries(report.controls).filter(
    ([, c]) => c.missing || !c.clickable,
  );
  if (bad.length) {
    failures += bad.length;
    console.error(`✗ ${width}px: unclickable/missing → ${bad.map(([k]) => k).join(", ")}`);
  }
  console.log(
    `${iw}px ${bad.length ? "✗" : "✓"} rail bottom=${report.rail?.bottom}px ` +
    `list ${report.list?.scrollable ? `scrollable ${report.list.clientW}/${report.list.scrollW}px` : `${report.list?.clientW}px fits`} ` +
    `controls=${Object.keys(report.controls).length}/8 clickable=${8 - bad.length}`,
  );
  await page.screenshot({ path: `${SHOTS}/dock-emu-${width}.png` });
  await page.close();
}

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : "\nall widths PASS");
process.exit(failures ? 1 : 0);
