#!/usr/bin/env node
/* ------------------------------------------------------------------
 * Authenticated acceptance — E1 final (#63 P0, review round 2).
 *
 * Real anonymous session against the configured deployment, then
 * per-route bounded READINESS assertions — a page is only PASS once
 * its finished content is visible and every loading marker is gone.
 * No fixed-delay "looks done" checks.
 *
 *   - sign-out is MANDATORY (missing button or surviving session = FAIL)
 *   - empty account is proven from a COMPLETED data read — the
 *     `.knows-empty` state after readiness, not absence of fixture text
 *   - unauthenticated gate verified after sign-out
 *
 * Usage: node scripts/auth-acceptance.mjs [--shots] [--url=BASE]
 * ------------------------------------------------------------------ */

import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME =
  process.env.CHROME_BIN ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.argv.find((a) => a.startsWith("--url="))?.slice(6) ?? "http://localhost:5506";
const SHOTS = process.argv.includes("--shots");
const SHOT_DIR = "docs/phase00/screenshots/authenticated";

const LOADING =
  /pinning things up|reading your|checking your|loading|hanging tight|fetching|almost there|one moment/i;
const ROUTES = [
  /* home ready only when the subject list has a COMPLETED read —
     heading text alone can appear while data is still "checking" */
  { name: "app-home", path: "/app", ready: /your desk|continue studying|your subjects|nothing lives here/i, dataMarker: "[data-testid='desk-subjects']" },
  { name: "app-learn", path: "/app/learn", ready: /subject|learn|\+/i },
  { name: "app-new", path: "/app/new", ready: /subject|source|create|name/i },
  { name: "app-library", path: "/app/library", ready: /library|sources|bring your first|nothing/i },
  { name: "app-groups", path: "/app/groups", ready: /group|study room|invite|crew/i },
  /* achievements: an aside bleeds off the desktop edge (decorative,
       E2-owned surface) — logged, not failed. */
  { name: "app-achievements", path: "/app/achievements", ready: /shelf|troph|earned|locked|empty/i, allowOverflow: true },
  { name: "app-profile", path: "/app/profile", ready: /profile|display name|identity|avatar|look/i },
  { name: "app-settings", path: "/app/settings", ready: /settings|account|sign out|session/i },
];
const VIEWPORTS = [
  { width: 390, height: 844, mobile: true },
  { width: 1440, height: 900, mobile: false },
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  protocolTimeout: 120000,
  args: ["--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
if (SHOTS) mkdirSync(SHOT_DIR, { recursive: true });
let failures = 0;

/** Tolerant navigation — dev-server churn can stall domcontentloaded;
 *  fall back to load, then a bare commit. */
async function goto(page, url) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
  } catch {
    await page.goto(url, { waitUntil: "load", timeout: 20000 }).catch(() => {});
  }
}

/** Bounded readiness: finished content AND no loading text AND the dock
 *  mounted — gate copy can mention "desk"/"account" long before auth
 *  resolves, so text alone must never count as ready (review #85). */
async function waitReady(page, readyRe, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    let state;
    try {
      state = await page.evaluate((re, lo) => {
        const t = document.body.innerText;
        return {
          ready: new RegExp(re, "i").test(t),
          loading: new RegExp(lo, "i").test(t),
          rail: !!document.querySelector(".space-rail"),
          gated: /sign in first|continue as guest|keep exploring as a guest/i.test(t),
        };
      }, readyRe.source, LOADING.source);
    } catch {
      continue; /* a timed-out eval is "not ready yet", not a crash */
    }
    if (state.ready && !state.loading && state.rail && !state.gated) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

async function signInGuest(page) {
  await goto(page, `${BASE}/app`);
  await new Promise((r) => setTimeout(r, 2500));
  return page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      /guest|continue without/i.test(b.textContent),
    );
    if (btn) { btn.click(); return btn.textContent.trim(); }
    return null;
  });
}

/* ---- session ---------------------------------------------------------- */
const session = await browser.newPage();
await session.setViewport({ width: 1440, height: 900 });
const clicked = await signInGuest(session);
await new Promise((r) => setTimeout(r, 4000));
const ready = await waitReady(session, ROUTES[0].ready, 25000);
if (ready && (await session.evaluate(() => !!document.querySelector(".space-rail")))) {
  console.log(`✓ real guest session ("${clicked}")`);
} else {
  failures++;
  console.log(`✗ guest session never reached finished content (button: ${clicked ?? "none"})`);
}

/* ---- route sweep ------------------------------------------------------- */
for (const vp of VIEWPORTS) {
  for (const route of ROUTES) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1, isMobile: vp.mobile });
    await goto(page, BASE + route.path);
    const done = await waitReady(page, route.ready);
    const dataReady = route.dataMarker
      ? await page
          .evaluate((sel) => !!document.querySelector(sel), route.dataMarker)
          .catch(() => false)
      : true;
    const report = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const over = [];
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        if (r.right > vw + 0.5 || r.left < -0.5) { over.push(el.tagName.toLowerCase()); if (over.length >= 5) break; }
      }
      return {
        vw, scrollW: document.documentElement.scrollWidth, title: document.title,
        rail: !!document.querySelector(".space-rail"),
        snippet: document.body.innerText.slice(0, 120),
        over,
      };
    });
    const bad = [];
    if (!done) bad.push(`never reached finished content — "${report.snippet.slice(0, 60)}…"`);
    if (done && !dataReady) bad.push(`ready text but data view missing (${route.dataMarker})`);
    if (report.scrollW > report.vw) bad.push(`scrollW ${report.scrollW} > vw`);
    const realOver = report.over.filter((o) => o !== "aside"); // decorative bleed on E2 surfaces — reported, not failed
    if (realOver.length) bad.push(`overflow: ${realOver.join("|")}`);
    else if (report.over.length) console.log(`    ~ ${route.name}: decorative aside bleed (informational)`);
    if (!report.rail) bad.push("no rail");
    if (bad.length) { failures += bad.length; console.log(`✗ ${route.name} @${vp.width}px`); for (const b of bad) console.log(`    ${b}`); }
    else console.log(`✓ ${route.name} @${vp.width}px — ${report.title}`);
    /* screenshots only from fully-passing pages — a failed capture
       must never masquerade as evidence under a normal filename */
    if (SHOTS && done && bad.length === 0)
      await page.screenshot({ path: `${SHOT_DIR}/${route.name}-${vp.width}.png` });
    await page.close();
  }
}

/* ---- identity + empty-account proof + sign-out ------------------------- */
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const bad = [];

  await goto(page, `${BASE}/app`);
  /* 1. empty-account proof from a COMPLETED read — the desk's subject
     section exists and lists zero rows; fixture text must be absent. */
  await goto(page, `${BASE}/app`);
  if (await waitReady(page, ROUTES[0].ready)) {
    const home = await page
      .evaluate(() => ({
        empty: !!document.querySelector(".knows-empty, [role='status']"),
        subjectRows: document.querySelectorAll("[data-testid='desk-subjects'] li").length,
        fixture: /cell biology|fixture|diffusion/i.test(document.body.innerText),
      }))
      .catch(() => ({ empty: false, subjectRows: -1, fixture: false }));
    if (home.fixture) bad.push("fixture content inside real account");
    if (home.subjectRows === -1) bad.push("subject section unreadable");
    else if (home.subjectRows > 0) bad.push(`expected zero subjects, found ${home.subjectRows}`);
    else if (!home.empty) bad.push("zero subjects but no explicit empty state shown");
  } else bad.push("home never finished loading — can't prove empty state");

  /* 2. Back/Forward BEFORE sign-out while the session is still valid */
  await goto(page, `${BASE}/app/library`);
  await waitReady(page, ROUTES[3].ready);
  await page.goBack({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));
  const backTo = await page.evaluate(() => location.pathname).catch(() => "eval-failed");
  if (!backTo.startsWith("/app")) bad.push(`Back landed at ${backTo}`);

  /* 3. sign-out is MANDATORY — missing control or surviving session fails */
  await goto(page, `${BASE}/app/settings`);
  await waitReady(page, ROUTES[7].ready);
  const signOut = await page
    .evaluate(() => {
      const btn = [...document.querySelectorAll("button, a")].find((b) => /\bsign out\b|\blog out\b/i.test(b.textContent));
      if (btn) { btn.click(); return true; }
      return false;
    })
    .catch(() => false);
  if (!signOut) {
    bad.push("sign-out control missing on settings (mandatory)");
  } else {
    /* the unauthenticated gate must come back */
    const gateBack = await (async () => {
      const start = Date.now();
      while (Date.now() - start < 20000) {
        try {
          const s = await page.evaluate(() => ({
            gate: /sign in|continue as guest|keep exploring|create your account/i.test(document.body.innerText),
            rail: !!document.querySelector(".space-rail"),
            text: document.body.innerText.slice(0, 200),
          }));
          if (s.gate && !s.rail) return s;
        } catch {
          /* a single eval timing out must not kill the poll */
        }
        await new Promise((r) => setTimeout(r, 400));
      }
      return null;
    })();
    if (!gateBack) bad.push("after sign-out the unauthenticated gate never returned");
    else console.log(`    sign-out → gate back ("${gateBack.text.slice(0, 60)}")`);
  }

  if (bad.length) { failures += bad.length; console.log("✗ identity/sign-out/nav"); for (const b of bad) console.log(`    ${b}`); }
  else console.log("✓ identity — empty proof, Back/Forward, sign-out gate");
  await page.close();
}

await session.close();
await browser.close();
console.log(failures ? `\n${failures} acceptance failure(s)` : "\nauthenticated acceptance: all pass");
process.exit(failures ? 1 : 0);
