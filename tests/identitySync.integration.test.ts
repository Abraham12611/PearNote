/**
 * Issue #76 — INTEGRATION test: drives the real `createIdentitySync` state
 * machine with delayed user emissions (query in-flight), A → logout → B,
 * a manually-flushed debounce queue, and intercepted profile pushes.
 * This is the orchestration the hook adapts — not just the pure helpers.
 */
import { describe, expect, test } from "vitest";
import {
  createIdentitySync,
  type LocalIdentity,
  type SyncServerUser,
} from "../src/live/identitySync";

type FullIdentity = LocalIdentity & { userId: string };

/** Fake tab-identity store + mutation/timer interception. */
function harness() {
  let identity: FullIdentity = {
    userId: "local-uuid-1",
    name: "juno",
    color: "#7C5CFF",
    emoji: "🍒",
    avatarUrl: "/avatars/juno.png",
  };
  const pushes: { name: string; color?: string; emoji?: string; image?: string }[] = [];
  const releases: FullIdentity[] = [];
  const adopted: string[] = [];
  const scheduled: { fn: () => void; cancelled: boolean }[] = [];

  const ports = {
    getIdentity: () => identity,
    setIdentity: (patch: Partial<LocalIdentity>) => { identity = { ...identity, ...patch }; },
    adoptUserId: (id: string) => { adopted.push(id); identity = { ...identity, userId: id }; },
    releaseAuthUserId: () => {
      const mint: FullIdentity = { userId: `local-uuid-${releases.length + 2}`, name: "kiwi", color: "#FF3B5C", emoji: "🦋", avatarUrl: "/avatars/kiwi.png" };
      identity = mint;
      releases.push(mint);
      return mint;
    },
    pushProfile: (f: (typeof pushes)[number]) => pushes.push(f),
    schedule: (fn: () => void) => {
      const entry = { fn, cancelled: false };
      scheduled.push(entry);
      return () => { entry.cancelled = true; };
    },
  };
  const base: LocalIdentity = { name: "juno", color: "#7C5CFF", emoji: "🍒", avatarUrl: "/avatars/juno.png" };
  const sync = createIdentitySync(base, ports);
  const flush = () => scheduled.forEach((s) => !s.cancelled && s.fn());
  const mut = (patch: Partial<LocalIdentity>) => { identity = { ...identity, ...patch }; };
  return { sync, ports, pushes, releases, adopted, scheduled, flush, mut, get identity() { return identity; } };
}

const A: SyncServerUser = { userId: "acct-a", name: "Ada", color: "#AAAAAA", emoji: "🦉", image: "/avatars/wren.png", personaId: "wren" };
const B: SyncServerUser = { userId: "acct-b", name: "Bea", color: "#BBBBBB", emoji: "🦊", image: "/avatars/pico.png", personaId: "pico" };

describe("account-switch integration — A → logout → B", () => {
  test("a queued A-edit is cancelled on sign-out and never lands in B's row", () => {
    const h = harness();
    h.sync.onUser(undefined);         // query in-flight: neutral, no-op base
    h.sync.onUser(A);                 // A signs in → adopt + hydrate
    expect(h.adopted).toEqual(["acct-a"]);
    expect(h.identity.name).toBe("Ada");
    expect(h.identity.userId).toBe("acct-a");

    // A edits their name → debounced push queued, then signs OUT before 400ms.
    h.mut({ name: "Ada Renamed" });
    h.sync.onLocalEdit();
    expect(h.scheduled).toHaveLength(1);

    h.sync.onUser(null);              // sign-out → release A's auth id, fresh mint
    expect(h.releases).toHaveLength(1);
    expect(h.identity.userId).not.toBe("acct-a");  // THE review defect: id must go
    expect(h.identity.name).toBe("kiwi");          // fresh neutral base, not "Ada"

    h.sync.onUser(B);                 // B signs in (delayed) → adopt + hydrate B
    expect(h.identity.name).toBe("Bea");
    expect(h.identity.userId).toBe("acct-b");

    h.flush();                        // fire every queued timer
    expect(h.pushes).toHaveLength(0); // A's queued edit NEVER reached the server
  });

  test("post-hydration B edit pushes B's fields — never A's adopted values", () => {
    const h = harness();
    h.sync.onUser(A);
    h.sync.onUser(null);
    h.sync.onUser(B);
    h.mut({ name: "Beatrix" });   // B edits
    h.sync.onLocalEdit();
    h.flush();
    expect(h.pushes).toHaveLength(1);
    expect(h.pushes[0]).toEqual({ name: "Beatrix", color: "#BBBBBB", emoji: "🦊", image: "/avatars/pico.png" });
  });

  test("direct A→B swap (no null gap): no A fields in any push, no A id left adopted", () => {
    const h = harness();
    h.sync.onUser(A);
    h.mut({ name: "Ada X" });
    h.sync.onLocalEdit();             // queue A push
    h.sync.onUser(B);                 // swap straight to B — cancels + hydrates
    h.mut({ name: "Bea Y" });
    h.sync.onLocalEdit();
    h.flush();
    expect(h.adopted).toContain("acct-b");
    expect(h.pushes).toHaveLength(1);
    expect(h.pushes[0].name).toBe("Bea Y");           // only B's edit ever pushed
    for (const p of h.pushes) expect(p.name).not.toContain("Ada");
  });

  test("guest emission preserves minted identity; reload keeps adopted user", () => {
    const h = harness();
    h.sync.onUser({ userId: "anon-1", isAnonymous: true });
    expect(h.identity.name).toBe("juno");       // minted guest persona stands
    expect(h.identity.userId).toBe("anon-1");   // but bound to the real anon row
    // Returning user re-emitting the same joined id: NO reset/re-hydrate churn.
    h.sync.onUser(A);
    const nameAfter = h.identity.name;
    h.sync.onUser(A);
    expect(h.identity.name).toBe(nameAfter);
  });
});
