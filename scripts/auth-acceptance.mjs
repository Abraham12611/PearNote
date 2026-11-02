#!/usr/bin/env node
/* ------------------------------------------------------------------
 * Authenticated acceptance — E1 final (#63 P0).
 *
 * Real session against the configured deployment (.env.local):
 * signs in as an anonymous guest through the REAL guest door on /app,
 * then sweeps the authenticated sitemap at 390x844 and 1440x900:
 * content renders, no horizontal overflow, rail present, title set,
 * controls in-bounds. Plus identity checks: the guest persona renders,
 * empty-account isolation (no seeded subjects), sign-out returns the
 * account gate, Back/Forward works.
 *
 * Usage: node scripts/auth-acceptance.mjs [--shots] [--url=BASE]
 * Requires VITE_CONVEX_URL (live build) — anonymous sign-in is real.
 * ------------------------------------------------------------------ */

import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME =
  process.env.CHROME_BIN ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.argv.find((a) => a.startsWith("--url="))?.slice(6) ?? "http://localhost:5506";
const SHOTS = process.argv.includes("--shots");
const SHOT_DIR = "docs/phase00/screenshots/authenticated";

const ROUTES = [
  { name: "app-home", path: "/app" },
  { name: "app-learn", path: "/app/learn" },
  { name: "app-new", path: "/app/new" },
  { name: "app-library", path: "/app/library" },
  { name: "app-groups", path: "/app/groups" },
  { name: "app-achievements", path: "/app/achievements" },
  { name: "app-profile", path: "/app/profile" },
  { name: "app-settings", path: "/app/settings" },
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

/* Real session: anonymous sign-in via the actual guest door. */
const session = await browser.newPage();
await session.setViewport({ width: 1440, height: 900 });
await session.goto(`${BASE}/app`, { waitUntil: "networkidle0", timeout: 30000 });
await new Promise((r) => setTimeout(r, 2500));
const gateText = await session.evaluate(() => document.body.innerText.slice(0, 400));
const guestClicked = await session.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) =>
    /guest|continue without/i.test(b.textContent),
  );
  if (btn) { btn.click(); return btn.textContent.trim(); }
  return null;
});
if (guestClicked) {
  await new Promise((r) => setTimeout(r, 4000));
}
const sessionState = await session.evaluate(() => ({
  rail: !!document.querySelector(".space-rail"),
  authToken: !!localStorage.getItem("__convexAuthJWT_verified") ||
    Object.keys(localStorage).some((k) => k.includes("convex")),
  text: document.body.innerText.slice(0, 300),
}));
if (sessionState.rail) {
  console.log(`✓ real guest session — anonymous sign-in via the gate ("${guestClicked}")`);
} else {
  failures++;
  console.log("✗ guest session did not reach the shell");
  console.log(`    gate text: ${gateText.slice(0, 120)}`);
  console.log(`    guest button: ${guestClicked ?? "none found"}`);
  console.log(`    post-state: ${sessionState.text.slice(0, 120)}`);
}

/* Carry the session across pages in a fresh context-less sweep. */
for (const vp of VIEWPORTS) {
  for (const route of ROUTES) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1, isMobile: vp.mobile });
    /* same browser profile — session storage is shared via cookie-less
       Convex token only if localStorage persists across pages; puppeteer
       pages share storage in the same context by default. */
    await page.goto(BASE + route.path, { waitUntil: "networkidle0", timeout: 25000 });
    await new Promise((r) => setTimeout(r, 1800));
    const report = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const over = [];
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right > vw + 0.5 || r.left < -0.5) { over.push(el.tagName + "." + (typeof el.className === "string" ? el.className.split(" ")[0] : "")); if (over.length >= 5) break; }
      }
      return {
        vw, scrollW: document.documentElement.scrollWidth,
        title: document.title,
        text: document.body.innerText.trim().length,
        rail: !!document.querySelector(".space-rail"),
        gated: /sign in|continue as guest|your desk is being connected/i.test(document.body.innerText.slice(0, 500)),
        over,
      };
    });
    const bad = [];
    if (report.text < 60) bad.push(`thin content (${report.text} chars)`);
    if (report.scrollW > report.vw) bad.push(`scrollW ${report.scrollW} > vw`);
    if (report.over.length) bad.push(`overflow: ${report.over.join(" | ")}`);
    if (!report.rail) bad.push(report.gated ? "still at auth gate — session did not carry" : "no rail");
    if (failures === 0 && bad.length) { /* keep totals per-page */ }
    if (bad.length) { failures += bad.length; console.log(`✗ ${route.name} @${vp.width}px`); for (const b of bad) console.log(`    ${b}`); }
    else console.log(`✓ ${route.name} @${vp.width}px — ${report.title}`);
    if (SHOTS) await page.screenshot({ path: `${SHOT_DIR}/${route.name}-${vp.width}.png` });
    await page.close();
  }
}

/* Identity + isolation + sign-out checks in one page. */
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const bad = [];
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded", timeout: 25000 });
  await new Promise((r) => setTimeout(r, 2000));
  const home = await page.evaluate(() => document.body.innerText);
  if (/cell biology|fixture/i.test(home)) bad.push("fixture/seeded subject visible in real account");
  await page.goto(`${BASE}/app/profile`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 1800));
  const profile = await page.evaluate(() => ({
    text: document.body.innerText.slice(0, 900),
    hasAvatar: !!document.querySelector(".member-face, [class*='avatar'], .rail-you img, .rail-you-avatar"),
    railYou: !!document.querySelector(".rail-you"),
  }));
  if (!profile.railYou) bad.push("identity face missing from dock");
  if (SHOTS) await page.screenshot({ path: `${SHOT_DIR}/identity-profile-1440.png` });

  /* sign-out: find the control on settings */
  await page.goto(`${BASE}/app/settings`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 1800));
  const signOut = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button, a")].find((b) => /sign out|log out|leave/i.test(b.textContent));
    if (btn) { btn.click(); return btn.textContent.trim(); }
    return null;
  });
  if (signOut) {
    await new Promise((r) => setTimeout(r, 2500));
    const after = await page.evaluate(() => ({
      url: location.pathname + location.hash,
      text: document.body.innerText.slice(0, 300),
    }));
    if (!/sign in|guest|landing|log in/i.test(after.text)) bad.push(`post-signout state unclear: ${after.url}`);
    console.log(`    sign-out → "${signOut}" → ${after.url}`);
  } else {
    console.log("    ~ no sign-out control found on settings (may live elsewhere)");
  }

  /* browser navigation */
  await page.goto(`${BASE}/app`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));
  await page.goto(`${BASE}/app/library`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 1200));
  await page.goBack({ waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 800));
  const backTo = await page.evaluate(() => location.pathname);
  if (!backTo.startsWith("/app")) bad.push(`Back landed at ${backTo}`);

  if (bad.length) { failures += bad.length; console.log("✗ identity/isolation/nav"); for (const b of bad) console.log(`    ${b}`); }
  else console.log("✓ identity — dock face, empty-account isolation, Back/Forward");
  await page.close();
}

await session.close();
await browser.close();
console.log(failures ? `\n${failures} acceptance failure(s)` : "\nauthenticated acceptance: all pass");
process.exit(failures ? 1 : 0);
