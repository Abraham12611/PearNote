#!/usr/bin/env node
/* ------------------------------------------------------------------
 * Responsive overflow audit — Issue #63 review.
 *
 * Drives REAL device-viewport emulation (not --window-size, whose
 * headless layout width can exceed the screenshot width) and checks:
 *
 *   1. No horizontal overflow: document scrollWidth ≤ viewport width.
 *   2. Every element stays inside the viewport horizontally.
 *   3. Primary controls (CTAs, dialog buttons, form submits) are fully
 *      inside the viewport — a clipped primary action fails the run.
 *
 * Usage:
 *   node scripts/responsive-check.mjs             # checks only
 *   node scripts/responsive-check.mjs --shots     # + screenshot set
 *   node scripts/responsive-check.mjs --url http://localhost:5173
 * ------------------------------------------------------------------ */

import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME =
  process.env.CHROME_BIN ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.argv.find((a) => a.startsWith("--url="))?.slice(6) ?? "http://localhost:5501";
const SHOTS = process.argv.includes("--shots");
const SHOT_DIR = "docs/phase00/screenshots/issue-63";

const SURFACES = [
  { name: "landing", url: "/?mock=1", controls: ["get started", "see the demo", "explore the demo"] },
  { name: "getstarted", url: "/?mock=1&getstarted=1", controls: ["create your account", "sign in", "explore the demo"] },
  { name: "sign-in", url: "/auth/sign-in?mock=1", controls: ["← pearnotes"] },
  { name: "sign-up", url: "/auth/sign-up?mock=1", controls: ["← pearnotes"] },
];
const VIEWPORTS = [320, 360, 390, 768];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1"],
});

let failures = 0;
if (SHOTS) mkdirSync(SHOT_DIR, { recursive: true });

for (const surface of SURFACES) {
  for (const width of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 844, deviceScaleFactor: 1, isMobile: width < 768 });
    await page.goto(BASE + surface.url, { waitUntil: "networkidle0", timeout: 20000 });
    await new Promise((r) => setTimeout(r, 700));

    const report = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const over = [];
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right > vw + 0.5 || r.left < -0.5) {
          const cls = typeof el.className === "string" ? el.className.split(" ")[0] : "";
          over.push(`${el.tagName.toLowerCase()}.${cls} [${Math.round(r.left)}..${Math.round(r.right)}]`);
          if (over.length >= 8) break;
        }
      }
      return {
        vw,
        scrollW: document.documentElement.scrollWidth,
        over,
        controls: [...document.querySelectorAll("button, a")]
          .filter((b) => {
            const t = b.textContent.trim().toLowerCase();
            return t.length > 0 && t.length < 40;
          })
          .map((b) => {
            const r = b.getBoundingClientRect();
            return { text: b.textContent.trim().toLowerCase().slice(0, 32), left: r.left, right: r.right, top: r.top, bottom: r.bottom };
          })
          .filter((c) => c.bottom > 0 && c.top < window.innerHeight),
      };
    });

    const bad = [];
    if (report.scrollW > report.vw) bad.push(`scrollWidth ${report.scrollW} > vw ${report.vw}`);
    if (report.over.length) bad.push(`overflow: ${report.over.join(" | ")}`);
    for (const want of surface.controls) {
      const hit = report.controls.find((c) => c.text.includes(want));
      /* a missing control is a failure too — before, absence simply
         skipped the bounds check and silently passed (review #70). */
      if (!hit) {
        bad.push(`required control "${want}" missing`);
      } else if (hit.left < -0.5 || hit.right > report.vw + 0.5) {
        bad.push(`control "${want}" clipped [${Math.round(hit.left)}..${Math.round(hit.right)}]`);
      }
    }

    if (bad.length) {
      failures += bad.length;
      console.log(`✗ ${surface.name} @${width}px`);
      for (const b of bad) console.log(`    ${b}`);
    } else {
      console.log(`✓ ${surface.name} @${width}px`);
    }

    if (SHOTS) {
      await page.screenshot({
        path: `${SHOT_DIR}/${surface.name}-${width}.png`,
      });
    }
    await page.close();
  }
}

await browser.close();
console.log(failures ? `\n${failures} responsive failure(s)` : "\nall surfaces clean");
process.exit(failures ? 1 : 0);
