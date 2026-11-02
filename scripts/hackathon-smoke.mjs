#!/usr/bin/env node
/* ------------------------------------------------------------------
 * Hackathon sitemap smoke — P0 (#63 follow-up).
 *
 * Drives real device-viewport emulation across the COMPLETE sitemap:
 *   public   / /demo /auth/sign-in /auth/sign-up ?getstarted
 *   app      /app + learn/new/library/groups/achievements/profile/settings
 *   learning /app/subjects/:id[ /sources | /lessons/:id ] /app/lessons/:id
 *   legacy   /#/about /#/space/crew /#/learn/* /#/join/*
 *
 * Per surface × viewport (390 mobile, 1440 desktop):
 *   1. the route renders real content (not a blank/error root),
 *   2. zero horizontal overflow, no element off the viewport edges,
 *   3. every required control exists AND is fully inside the viewport,
 *   4. document.title is set for the route.
 * Plus behavioural checks: Back/Forward navigation, dialog open/close,
 * demo namespace translation, legacy learn→app canonicalization.
 *
 * Usage:  node scripts/hackathon-smoke.mjs [--shots] [--url=BASE]
 * Exit 1 on any failure. Evidence PNGs under docs/.../hackathon-smoke/.
 * ------------------------------------------------------------------ */

import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME =
  process.env.CHROME_BIN ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.argv.find((a) => a.startsWith("--url="))?.slice(6) ?? "http://localhost:5505";
const SHOTS = process.argv.includes("--shots");
const SHOT_DIR = "docs/phase00/screenshots/hackathon-smoke";
const M = "?mock=1";

/* name → path, required controls (substring match), content signal */
const SITEMAP = [
  { name: "landing", path: `/${M}`, controls: ["get started", "see the demo"], shot: true },
  { name: "getstarted", path: `/${M}&getstarted=1`, controls: ["create your account", "sign in", "explore the demo"], shot: true },
  { name: "sign-in", path: `/auth/sign-in${M}`, controls: ["← pearnotes"], shot: true },
  { name: "sign-up", path: `/auth/sign-up${M}`, controls: ["← pearnotes"], shot: true },
  { name: "demo", path: `/demo${M}`, controls: ["create an account"], mustHave: [".entry-demo-ribbon"], shot: true },
  { name: "demo-path", path: `/demo/subjects/fixture-bio${M}`, controls: ["create an account"], mustHave: [".entry-demo-ribbon"], shot: true },
  { name: "app-home", path: `/app${M}`, controls: [], mustHave: [".space-rail"], shot: true },
  { name: "app-learn", path: `/app/learn${M}`, controls: [], mustHave: [".space-rail"], shot: true },
  { name: "app-new", path: `/app/new${M}`, controls: [], mustHave: [".space-rail"], shot: true },
  { name: "app-library", path: `/app/library${M}`, controls: [], mustHave: [".space-rail"], shot: true },
  { name: "app-groups", path: `/app/groups${M}`, controls: [], mustHave: [".space-rail"], shot: true },
  { name: "app-achievements", path: `/app/achievements${M}`, controls: [], mustHave: [".space-rail"], shot: true },
  { name: "app-profile", path: `/app/profile${M}`, controls: [], mustHave: [".space-rail"], shot: true },
  { name: "app-settings", path: `/app/settings${M}`, controls: [], mustHave: [".space-rail"], shot: true },
  { name: "app-subject", path: `/app/subjects/fixture-bio${M}`, controls: [], shot: true },
  { name: "app-sources", path: `/app/subjects/fixture-bio/sources${M}`, controls: [], shot: true },
  { name: "app-lesson", path: `/app/subjects/fixture-bio/lessons/fixture-l1${M}`, controls: [], shot: true },
  { name: "app-lesson-query", path: `/app/lessons/fixture-l1?subject=fixture-bio&mock=1`, controls: [], shot: true },
  { name: "app-notfound", path: `/app/nope${M}`, controls: [] },
  { name: "notfound", path: `/nope${M}`, controls: ["back home"], shot: true },
  /* legacy surfaces: the About page and the pannable room canvas are
     inherited code — element-offscreen checks are informational there,
     not failures (the canvas is INTENTIONALLY larger than the viewport). */
  { name: "legacy-about", path: `/${M}#/about`, controls: ["back to the space"], allowOverflow: true, shot: true },
  { name: "legacy-space", path: `/${M}#/space/crew`, controls: [], allowOverflow: true },
  { name: "legacy-learn", path: `/${M}#/learn/path/fixture-s1`, controls: [] },
];

const VIEWPORTS = [
  { width: 390, height: 844, mobile: true },
  { width: 1440, height: 900, mobile: false },
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1"],
});

if (SHOTS) mkdirSync(SHOT_DIR, { recursive: true });
let failures = 0;
const fail = (n, w, msgs) => {
  failures += msgs.length;
  console.log(`✗ ${n} @${w}px`);
  for (const m of msgs) console.log(`    ${m}`);
};

for (const vp of VIEWPORTS) {
  for (const surface of SITEMAP) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1, isMobile: vp.mobile });
    await page.goto(BASE + surface.path, { waitUntil: "networkidle0", timeout: 25000 });
    await new Promise((r) => setTimeout(r, 900));

    const report = await page.evaluate((wanted) => {
      const vw = document.documentElement.clientWidth;
      const over = [];
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right > vw + 0.5 || r.left < -0.5) {
          const cls = typeof el.className === "string" ? el.className.split(" ")[0] : "";
          over.push(`${el.tagName.toLowerCase()}.${cls}`);
          if (over.length >= 6) break;
        }
      }
      return {
        vw,
        scrollW: document.documentElement.scrollWidth,
        title: document.title,
        text: document.body.innerText.trim().length,
        url: location.pathname + location.search + location.hash,
        missing: (wanted.mustHave ?? []).filter((s) => !document.querySelector(s)),
        over,
        controls: [...document.querySelectorAll("button, a")]
          .map((b) => {
            const r = b.getBoundingClientRect();
            return { text: b.textContent.trim().toLowerCase().slice(0, 32), left: r.left, right: r.right, top: r.top, bottom: r.bottom };
          })
          .filter((c) => c.text && c.bottom > 0 && c.top < window.innerHeight),
      };
    }, surface);

    const bad = [];
    if (report.text < 40) bad.push(`page looks empty (${report.text} chars)`);
    if (report.scrollW > report.vw) bad.push(`scrollWidth ${report.scrollW} > vw ${report.vw}`);
    if (report.over.length && !surface.allowOverflow) bad.push(`overflow: ${report.over.join(" | ")}`);
    else if (report.over.length) console.log(`    ~ ${surface.name}: offscreen elements (pannable/inherited) ${report.over.slice(0,3).join(" | ")}`);
    if (report.missing.length) bad.push(`missing elements: ${report.missing.join(", ")}`);
    for (const want of surface.controls) {
      const hit = report.controls.find((c) => c.text.includes(want));
      if (!hit) bad.push(`required control "${want}" missing`);
      else if (hit.left < -0.5 || hit.right > report.vw + 0.5) bad.push(`control "${want}" clipped`);
    }
    if (!report.title || report.title === "PearNotes") bad.push("route title unset");

    if (bad.length) fail(`${surface.name} (${report.url})`, vp.width, bad);
    else console.log(`✓ ${surface.name} @${vp.width}px — ${report.title}`);

    if (SHOTS && (surface.shot || bad.length)) {
      await page.screenshot({ path: `${SHOT_DIR}/${surface.name}-${vp.width}.png` });
    }
    await page.close();
  }
}

/* --- behavioural ----------------------------------------------------- */
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/${M}`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 800));
  const bad = [];

  /* modal open → Escape close */
  await page.evaluate(() =>
    [...document.querySelectorAll("button")].find((b) => b.textContent.includes("get started"))?.click(),
  );
  await new Promise((r) => setTimeout(r, 400));
  if (!(await page.evaluate(() => document.querySelector("dialog.demo-waitlist")?.open)))
    bad.push("get-started dialog did not open");
  await page.keyboard.press("Escape");
  await new Promise((r) => setTimeout(r, 300));
  if (await page.evaluate(() => document.querySelector("dialog.demo-waitlist")?.open))
    bad.push("Escape did not close the dialog");

  /* forward navigation + browser Back */
  await page.evaluate(() =>
    [...document.querySelectorAll("button")].find((b) => b.textContent.includes("see the demo"))?.click(),
  );
  await new Promise((r) => setTimeout(r, 900));
  const demoUrl = await page.evaluate(() => location.pathname + location.search);
  if (!demoUrl.startsWith("/demo")) bad.push(`demo nav landed at ${demoUrl}`);
  if (!demoUrl.includes("fixtures=1")) bad.push(`demo URL lacks fixtures flag: ${demoUrl}`);
  await page.goBack({ waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 600));
  const backUrl = await page.evaluate(() => location.pathname);
  if (backUrl !== "/") bad.push(`Back landed at ${backUrl}, expected /`);

  /* legacy learn canonicalizes into the app namespace */
  await page.goto(`${BASE}/${M}#/learn/path/fixture-s1`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));
  const canon = await page.evaluate(() => location.pathname + location.search + location.hash);
  if (!canon.startsWith("/app/subjects/fixture-s1") || canon.includes("#/learn"))
    bad.push(`#/learn canonicalization broken: ${canon}`);
  if (!canon.includes("mock=1")) bad.push(`mode param dropped: ${canon}`);

  if (bad.length) fail("behaviour", 1440, bad);
  else console.log("✓ behaviour — modal, Back/Forward, demo nav, learn canonicalization");
  await page.close();
}

await browser.close();
console.log(failures ? `\n${failures} smoke failure(s)` : "\nsitemap smoke: all surfaces pass");
process.exit(failures ? 1 : 0);
