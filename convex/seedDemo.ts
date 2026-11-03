/**
 * Demo persona seed — "sam", an undergrad medical student who has been
 * using PearNotes for months (session plan W3).
 *
 * INTERNAL ONLY. `run` is an internalAction (needs storage.store for the
 * three sample text sources); `apply`/`purge` are internalMutations. None
 * of this is reachable from a client. Every row is ordinary learning/desk
 * data owned by flagged demo accounts (`users.demoTag`), so the public
 * /demo surface reads exactly what a real account's backend would return.
 *
 * Idempotent: re-run with `force` wipes and reseeds; without it, a
 * seeded deployment is left untouched.
 */
import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const DEMO_TAG = "pearnotes-demo";
const DEMO_CREW_TAG = "pearnotes-demo-crew";

/* ---- sample source text (stored as real blobs; content is authored
   sample material, honest and source-citable like a real upload) ------ */

const CELL_BIO_TEXT = `Cell membranes are selective barriers built from a phospholipid bilayer. Each phospholipid has a hydrophilic head and two hydrophobic tails, so the molecules arrange themselves tail-to-tail and keep water-soluble substances from crossing freely.

Diffusion is the net movement of particles from a region of higher concentration to a region of lower concentration. It requires no energy because it follows the gradient. Oxygen and carbon dioxide cross the membrane this way.

Osmosis is the diffusion of water across a selectively permeable membrane. Water moves toward the side with the higher solute concentration. In a hypotonic solution a cell gains water; in a hypertonic solution it loses water.

Active transport moves substances against their concentration gradient and therefore requires energy, usually supplied as ATP. The sodium-potassium pump exports three sodium ions and imports two potassium ions per cycle.

Facilitated diffusion uses channel or carrier proteins to move substances down their gradient without ATP. Glucose enters most cells through carrier proteins this way. Endocytosis and exocytosis move bulk material in vesicles.

The fluid mosaic model describes the membrane as a flexible sheet with proteins floating in or spanning the bilayer. Cholesterol sits between the tails and buffers the membrane against temperature changes.`;

const LINEAR_ALGEBRA_TEXT = `A linear equation in one variable has the form ax + b = c with a not equal to zero. Solving means isolating the variable: subtract b from both sides, then divide by a. The solution is the single value that makes the statement true.

The slope of a line measures its steepness: rise over run, the change in y divided by the change in x between two points. A positive slope rises left to right; a negative slope falls; a horizontal line has slope zero.

The slope-intercept form y = mx + b names the slope m and the y-intercept b directly. Given two points, compute m first, then substitute one point to solve for b.

A system of two linear equations asks for the point where the lines meet. Substitution solves one equation for a variable and plugs it into the other; elimination adds the equations to cancel a variable.

When lines are parallel their slopes are equal and the system has no solution. When the equations describe the same line, every point is a solution and the system is dependent.`;

const ORGANIC_CHEM_TEXT = `A functional group is a specific cluster of atoms that behaves predictably wherever it appears. Alcohols carry a hydroxyl group, -OH, which makes them polar and able to hydrogen-bond with water.

The carbonyl group, C=O, appears in aldehydes, ketones, carboxylic acids and esters. Aldehydes have the carbonyl at the end of the chain; ketones have it between two carbons.

IUPAC naming follows three steps: find the longest carbon chain, number it so the principal functional group gets the lowest locant, then name substituents as prefixes. Propan-1-ol and propan-2-ol differ only in where the -OH sits.

Isomers share a molecular formula but differ in structure. Chain isomers branch differently, positional isomers move the functional group, and functional isomers change the group itself.

A carboxylic acid, -COOH, donates a proton and is weakly acidic in water. An ester forms when a carboxylic acid reacts with an alcohol, and esters give many fruits their smell.`;

/* ------------------------------------------------------------------ */

export const demoOwnerId = internalQuery({
  args: {},
  returns: v.union(v.id("users"), v.null()),
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("demoTag"), DEMO_TAG))
      .take(1);
    return rows[0]?._id ?? null;
  },
});

export const run = internalAction({
  args: { force: v.optional(v.boolean()) },
  returns: v.object({ ok: v.boolean(), reseeded: v.boolean() }),
  handler: async (ctx, { force }) => {
    const existing = await ctx.runQuery(internal.seedDemo.demoOwnerId, {});
    if (existing !== null && !force) return { ok: true, reseeded: false };
    if (existing !== null) await ctx.runMutation(internal.seedDemo.purge, {});
    const storageIds = await Promise.all(
      [CELL_BIO_TEXT, LINEAR_ALGEBRA_TEXT, ORGANIC_CHEM_TEXT].map((t) =>
        ctx.storage.store(new Blob([t], { type: "text/plain" })),
      ),
    );
    await ctx.runMutation(internal.seedDemo.apply, { storageIds });
    return { ok: true, reseeded: true };
  },
});

/* ------------------------------------------------------------------ */

const HOUR = 3_600_000;
const DAY = 86_400_000;

export const apply = internalMutation({
  args: { storageIds: v.array(v.id("_storage")) },
  returns: v.null(),
  handler: async (ctx, { storageIds }) => {
    const now = Date.now();
    const todayStart = Date.parse(new Date(now).toISOString().slice(0, 10));
    const ago = (days: number) => now - days * DAY;

    /* ---- the people: sam + a small consented crew ------------------ */
    const sam = await ctx.db.insert("users", {
      name: "sam",
      image: "/avatars/pico.png",
      color: "#FF7A3D",
      personaId: "pico",
      demoTag: DEMO_TAG,
    });
    const crewIds: Record<string, Id<"users">> = {};
    for (const [key, name, persona, color] of [
      ["maya", "Maya", "juno", "#7C5CFF"],
      ["jules", "Jules", "momo", "#E63DA8"],
      ["rio", "Rio", "clover", "#C6F750"],
      ["kenji", "Kenji", "ziggy", "#13B8A6"],
    ] as const) {
      crewIds[key] = await ctx.db.insert("users", {
        name,
        image: `/avatars/${persona}.png`,
        color,
        personaId: persona,
        demoTag: DEMO_CREW_TAG,
      });
    }
    for (const key of ["maya", "jules", "rio", "kenji"] as const) {
      await ctx.db.insert("friendships", {
        userId: sam,
        friendUserId: crewIds[key],
        state: "accepted",
        shareActivity: true,
        createdAt: ago(40),
      });
    }

    /* ---- sources + segments ---------------------------------------- */
    const mkSource = async (
      title: string,
      storageId: Id<"_storage">,
      segments: string[],
    ) => {
      const sourceId = await ctx.db.insert("sources", {
        ownerId: sam,
        storageId,
        title,
        mime: "text/plain",
        sizeBytes: segments.join("\n\n").length,
        sha256: `sample-${title}`,
        status: "indexed",
        createdAt: ago(50),
        updatedAt: ago(50),
      });
      const segmentIds: Id<"sourceSegments">[] = [];
      for (let i = 0; i < segments.length; i++) {
        segmentIds.push(
          await ctx.db.insert("sourceSegments", {
            sourceId,
            segmentNo: i + 1,
            page: i + 1,
            text: segments[i],
            kind: "paragraph",
            createdAt: ago(50),
          }),
        );
      }
      return { sourceId, segmentIds };
    };
    const cellSrc = await mkSource("cell-biology-unit-notes.txt", storageIds[0], CELL_BIO_TEXT.split("\n\n"));
    const algSrc = await mkSource("linear-algebra-notes.txt", storageIds[1], LINEAR_ALGEBRA_TEXT.split("\n\n"));
    const chemSrc = await mkSource("organic-chemistry-notes.txt", storageIds[2], ORGANIC_CHEM_TEXT.split("\n\n"));

    /* ---- one curriculum builder ------------------------------------ */
    const mkSubject = async (cfg: {
      name: string;
      avatarId: string;
      theme: string;
      goal: string;
      src: { sourceId: Id<"sources">; segmentIds: Id<"sourceSegments">[] };
      units: {
        title: string;
        lessons: {
          title: string;
          objectives: string[];
          segIdx: number[];
          activities: (
            | { kind: "lessonCard"; heading: string; body: string }
            | { kind: "multipleChoice"; prompt: string; options: string[]; correct: number }
            | { kind: "shortAnswer"; prompt: string; expected: string }
            | {
                kind: "classify";
                prompt: string;
                items: { label: string; bucket: string }[];
                buckets: string[];
              }
            | { kind: "teachBack"; prompt: string; rubric: string[] }
          )[];
        }[];
      }[];
    }) => {
      const subjectId = await ctx.db.insert("subjects", {
        ownerId: sam,
        name: cfg.name,
        avatarId: cfg.avatarId,
        theme: cfg.theme,
        goal: cfg.goal,
        status: "active",
        createdAt: ago(45),
        updatedAt: ago(2),
      });
      await ctx.db.insert("subjectSources", {
        subjectId,
        sourceId: cfg.src.sourceId,
        segmentIds: cfg.src.segmentIds,
        origin: "ai_proposal",
        createdAt: ago(45),
      });
      const versionId = await ctx.db.insert("curriculumVersions", {
        subjectId,
        version: 1,
        state: "published",
        createdAt: ago(44),
        publishedAt: ago(44),
      });
      const sectionId = await ctx.db.insert("sections", {
        versionId,
        order: 0,
        title: `${cfg.name} — core path`,
      });
      const lessonRefs: { lessonId: Id<"lessons">; objectiveIds: Id<"objectives">[]; activityIds: Id<"activities">[]; title: string; unitTitle: string }[] = [];
      for (let ui = 0; ui < cfg.units.length; ui++) {
        const unit = cfg.units[ui];
        const unitId = await ctx.db.insert("units", { sectionId, order: ui, title: unit.title });
        for (let li = 0; li < unit.lessons.length; li++) {
          const l = unit.lessons[li];
          const objectiveIds: Id<"objectives">[] = [];
          for (const statement of l.objectives) {
            objectiveIds.push(
              await ctx.db.insert("objectives", {
                subjectId,
                conceptIds: [],
                statement,
                createdAt: ago(44),
              }),
            );
          }
          const sourceRefs = l.segIdx.map((i) => ({
            sourceId: cfg.src.sourceId,
            segmentId: cfg.src.segmentIds[i],
            page: i + 1,
          }));
          const lessonId = await ctx.db.insert("lessons", {
            unitId,
            order: li,
            title: l.title,
            objectiveIds,
            specVersion: 1,
            sourceRefs,
          });
          const activityIds: Id<"activities">[] = [];
          for (const a of l.activities) {
            const spec =
              a.kind === "lessonCard"
                ? { kind: "lessonCard" as const, heading: a.heading, body: a.body }
                : a.kind === "multipleChoice"
                  ? {
                      kind: "multipleChoice" as const,
                      prompt: a.prompt,
                      options: a.options.map((label, i) => ({ id: `o${i}`, label })),
                      correctOptionId: `o${a.correct}`,
                    }
                  : a.kind === "shortAnswer"
                    ? { kind: "shortAnswer" as const, prompt: a.prompt, expectedAnswer: a.expected }
                    : a.kind === "classify"
                      ? {
                          kind: "classify" as const,
                          prompt: a.prompt,
                          items: a.items.map((it, i) => ({ id: `i${i}`, label: it.label })),
                          buckets: a.buckets.map((label, i) => ({ id: `b${i}`, label })),
                          correctAssignments: a.items.map((it, i) => ({
                            itemId: `i${i}`,
                            bucketId: `b${a.buckets.indexOf(it.bucket)}`,
                          })),
                        }
                      : { kind: "teachBack" as const, prompt: a.prompt, rubricCriteria: a.rubric };
            activityIds.push(
              await ctx.db.insert("activities", {
                lessonId,
                spec,
                objectiveIds,
                sourceRefs,
                revision: 1,
                createdAt: ago(43),
              }),
            );
          }
          lessonRefs.push({ lessonId, objectiveIds, activityIds, title: l.title, unitTitle: unit.title });
        }
      }
      return { subjectId, lessonRefs };
    };

    const cell = await mkSubject({
      name: "Cell biology",
      avatarId: "biology",
      theme: "var(--pn-subject-biology)",
      goal: "pre-med foundations — actually understand cells",
      src: cellSrc,
      units: [
        {
          title: "Membranes and transport basics",
          lessons: [
            {
              title: "Membrane structure",
              objectives: ["Describe the phospholipid bilayer and why it is selectively permeable"],
              segIdx: [0, 5],
              activities: [
                {
                  kind: "lessonCard",
                  heading: "the bilayer, in one picture",
                  body: "Phospholipids self-assemble tail-to-tail: hydrophilic heads face the water, hydrophobic tails hide inside. That arrangement is why the membrane blocks most water-soluble molecules.",
                },
                {
                  kind: "multipleChoice",
                  prompt: "Why does the bilayer form with tails pointing inward?",
                  options: [
                    "Tails repel water",
                    "Heads repel proteins",
                    "Cholesterol pulls them in",
                    "ATP drives them inward",
                  ],
                  correct: 0,
                },
                {
                  kind: "teachBack",
                  prompt: "Explain the fluid mosaic model to a classmate in your own words.",
                  rubric: ["mentions the bilayer", "proteins floating or spanning", "flexible/dynamic sheet"],
                },
              ],
            },
            {
              title: "Diffusion",
              objectives: ["Define diffusion and identify whether a process needs energy"],
              segIdx: [1],
              activities: [
                {
                  kind: "lessonCard",
                  heading: "down the gradient",
                  body: "Diffusion moves particles from high to low concentration. It follows the gradient, so it needs no ATP — which is exactly how O2 and CO2 cross.",
                },
                {
                  kind: "shortAnswer",
                  prompt: "Diffusion moves particles from high concentration to ___ concentration.",
                  expected: "low",
                },
                {
                  kind: "multipleChoice",
                  prompt: "Which molecule crosses the membrane by simple diffusion?",
                  options: ["Oxygen", "Glucose", "Sodium ions", "A protein"],
                  correct: 0,
                },
              ],
            },
          ],
        },
        {
          title: "Transport in action",
          lessons: [
            {
              title: "Diffusion and osmosis",
              objectives: [
                "Distinguish diffusion from osmosis and predict water movement across a membrane",
                "Use hypotonic/hypertonic to describe what happens to a cell",
              ],
              segIdx: [2, 1],
              activities: [
                {
                  kind: "lessonCard",
                  heading: "osmosis is just water's diffusion",
                  body: "Water diffuses toward the side with more solute. A cell in a hypotonic solution gains water; in a hypertonic solution it shrivels.",
                },
                {
                  kind: "classify",
                  prompt: "Sort each case by what the cell does",
                  items: [
                    { label: "cell in pure water", bucket: "gains water" },
                    { label: "cell in salty solution", bucket: "loses water" },
                    { label: "cell in isotonic solution", bucket: "stays balanced" },
                    { label: "plant cell in hypotonic solution", bucket: "gains water" },
                  ],
                  buckets: ["gains water", "loses water", "stays balanced"],
                },
                {
                  kind: "multipleChoice",
                  prompt: "Osmosis moves which substance?",
                  options: ["Water", "Solute", "ATP", "Proteins"],
                  correct: 0,
                },
                {
                  kind: "teachBack",
                  prompt: "A red blood cell is dropped into distilled water. Explain what happens and why.",
                  rubric: ["hypotonic", "water enters", "lysis/burst risk"],
                },
              ],
            },
            {
              title: "Active transport and ATP",
              objectives: ["Explain why active transport needs energy and name one pump"],
              segIdx: [3],
              activities: [
                {
                  kind: "lessonCard",
                  heading: "against the current",
                  body: "Pumps push solutes against their gradient — that costs ATP. The sodium-potassium pump trades 3 Na+ out for 2 K+ in every cycle.",
                },
                {
                  kind: "multipleChoice",
                  prompt: "The sodium-potassium pump moves…",
                  options: [
                    "3 Na+ out, 2 K+ in",
                    "2 Na+ out, 3 K+ in",
                    "3 K+ out, 2 Na+ in",
                    "equal ions both ways",
                  ],
                  correct: 0,
                },
                {
                  kind: "classify",
                  prompt: "Passive or active?",
                  items: [
                    { label: "O2 diffusing in", bucket: "passive" },
                    { label: "Na+/K+ pump", bucket: "active" },
                    { label: "glucose via a carrier protein", bucket: "passive" },
                    { label: "endocytosis of a large particle", bucket: "active" },
                  ],
                  buckets: ["passive", "active"],
                },
              ],
            },
          ],
        },
      ],
    });

    const alg = await mkSubject({
      name: "Linear algebra",
      avatarId: "math",
      theme: "var(--pn-subject-math)",
      goal: "stop plugging numbers in — see the structure",
      src: algSrc,
      units: [
        {
          title: "Linear equations",
          lessons: [
            {
              title: "Solving one-variable equations",
              objectives: ["Isolate the variable in ax + b = c"],
              segIdx: [0],
              activities: [
                {
                  kind: "lessonCard",
                  heading: "undo, in reverse order",
                  body: "ax + b = c: subtract b first, then divide by a. You're undoing the operations in the reverse order they were applied.",
                },
                {
                  kind: "shortAnswer",
                  prompt: "Solve for x: 3x + 4 = 19",
                  expected: "5",
                },
              ],
            },
            {
              title: "Slope and graphs",
              objectives: ["Compute slope from two points and read y = mx + b"],
              segIdx: [1, 2],
              activities: [
                {
                  kind: "lessonCard",
                  heading: "rise over run",
                  body: "Slope is Δy / Δx between any two points. Positive climbs, negative falls, zero is flat.",
                },
                {
                  kind: "multipleChoice",
                  prompt: "Slope of the line through (1, 2) and (3, 8)?",
                  options: ["3", "2", "6", "1/3"],
                  correct: 0,
                },
              ],
            },
            {
              title: "Systems of equations",
              objectives: ["Solve a 2×2 system by substitution or elimination"],
              segIdx: [3, 4],
              activities: [
                {
                  kind: "lessonCard",
                  heading: "where lines meet",
                  body: "A system's solution is the intersection point. Parallel slopes mean no meeting — no solution.",
                },
                {
                  kind: "multipleChoice",
                  prompt: "Two lines with equal slopes and different intercepts have…",
                  options: ["no solution", "one solution", "infinitely many", "two solutions"],
                  correct: 0,
                },
              ],
            },
          ],
        },
      ],
    });

    await mkSubject({
      name: "Organic chemistry",
      avatarId: "chemistry",
      theme: "var(--pn-subject-chemistry)",
      goal: "read a molecule like a sentence",
      src: chemSrc,
      units: [
        {
          title: "Molecules",
          lessons: [
            {
              title: "Functional groups",
              objectives: ["Recognize hydroxyl and carbonyl groups and their behavior"],
              segIdx: [0, 1],
              activities: [
                {
                  kind: "lessonCard",
                  heading: "the group makes the behavior",
                  body: "-OH makes an alcohol polar and hydrogen-bonding. C=O defines aldehydes, ketones, acids and esters depending on where it sits.",
                },
                {
                  kind: "classify",
                  prompt: "Match the group to the family",
                  items: [
                    { label: "-OH", bucket: "alcohol" },
                    { label: "terminal C=O", bucket: "aldehyde" },
                    { label: "mid-chain C=O", bucket: "ketone" },
                    { label: "-COOH", bucket: "carboxylic acid" },
                  ],
                  buckets: ["alcohol", "aldehyde", "ketone", "carboxylic acid"],
                },
              ],
            },
            {
              title: "Naming molecules",
              objectives: ["Apply IUPAC naming to simple organic molecules"],
              segIdx: [2],
              activities: [
                {
                  kind: "lessonCard",
                  heading: "chain → locant → prefix",
                  body: "Longest chain first, number so the main group gets the lowest number, then bolt on substituents. Propan-1-ol vs propan-2-ol is just a different locant.",
                },
                {
                  kind: "shortAnswer",
                  prompt: "In IUPAC naming, what gets the lowest locant?",
                  expected: "the principal functional group",
                },
              ],
            },
            {
              title: "Isomerism",
              objectives: ["Tell chain, positional and functional isomers apart"],
              segIdx: [3, 4],
              activities: [
                {
                  kind: "lessonCard",
                  heading: "same formula, different molecule",
                  body: "Chain isomers re-branch the skeleton, positional isomers move the group along it, functional isomers swap the group entirely.",
                },
                {
                  kind: "multipleChoice",
                  prompt: "Propan-1-ol and propan-2-ol are…",
                  options: [
                    "positional isomers",
                    "chain isomers",
                    "functional isomers",
                    "not isomers",
                  ],
                  correct: 0,
                },
              ],
            },
          ],
        },
      ],
    });

    /* ---- months of evidence ---------------------------------------- */
    // Unit 1 cell objectives: demonstrated. Unit 2: mid-flight.
    const attempt = async (cfg: {
      lessonIdx: number;
      actIdx: number;
      at: number;
      verdict: "correct" | "incorrect" | "partial" | "needs_review";
      response: { kind: "choice"; optionId: string } | { kind: "text"; text: string };
      xp?: number;
    }) => {
      const ref = cell.lessonRefs[cfg.lessonIdx];
      const activityId = ref.activityIds[cfg.actIdx];
      const attemptId = await ctx.db.insert("attempts", {
        userId: sam,
        activityId,
        activityRevision: 1,
        state: "evaluated",
        response: cfg.response,
        evaluation: { verdict: cfg.verdict, score: cfg.verdict === "correct" ? 1 : 0, evaluatedAt: cfg.at },
        createdAt: cfg.at,
      });
      if (cfg.xp) {
        await ctx.db.insert("xpLedger", {
          userId: sam,
          points: cfg.xp,
          reason: "challenge_correct",
          refId: attemptId,
          day: new Date(cfg.at).toISOString().slice(0, 10),
          createdAt: cfg.at,
        });
      }
      return attemptId;
    };

    // lesson 0 (membrane structure) — demonstrated weeks ago
    await attempt({ lessonIdx: 0, actIdx: 1, at: ago(21), verdict: "correct", response: { kind: "choice", optionId: "o0" }, xp: 40 });
    // lesson 1 (diffusion) — demonstrated
    await attempt({ lessonIdx: 1, actIdx: 1, at: ago(14), verdict: "correct", response: { kind: "text", text: "low" }, xp: 30 });
    await attempt({ lessonIdx: 1, actIdx: 2, at: ago(14), verdict: "correct", response: { kind: "choice", optionId: "o0" }, xp: 30 });
    // lesson 2 (diffusion and osmosis) — the live thread: one wrong, one right
    await attempt({ lessonIdx: 2, actIdx: 2, at: ago(2), verdict: "incorrect", response: { kind: "choice", optionId: "o1" } });
    await attempt({ lessonIdx: 2, actIdx: 2, at: ago(1), verdict: "correct", response: { kind: "choice", optionId: "o0" }, xp: 35 });
    // algebra lesson — dipping a toe
    const algAttempt = await ctx.db.insert("attempts", {
      userId: sam,
      activityId: alg.lessonRefs[0].activityIds[1],
      activityRevision: 1,
      state: "evaluated",
      response: { kind: "text", text: "5" },
      evaluation: { verdict: "correct", score: 1, evaluatedAt: ago(4) },
      createdAt: ago(4),
    });
    await ctx.db.insert("xpLedger", {
      userId: sam, points: 30, reason: "challenge_correct", refId: algAttempt,
      day: new Date(ago(4)).toISOString().slice(0, 10), createdAt: ago(4),
    });

    // mastery rows matching that history
    const mkMastery = async (objectiveId: Id<"objectives">, state: "demonstrated" | "learning" | "practicing" | "not_started", at: number) => {
      await ctx.db.insert("mastery", {
        userId: sam,
        objectiveId,
        state,
        scoreBand: state === "demonstrated" ? "high" : "medium",
        evidence: [],
        updatedAt: at,
      });
    };
    for (const oid of cell.lessonRefs[0].objectiveIds) await mkMastery(oid, "demonstrated", ago(20));
    for (const oid of cell.lessonRefs[1].objectiveIds) await mkMastery(oid, "demonstrated", ago(13));
    for (const oid of cell.lessonRefs[2].objectiveIds) await mkMastery(oid, "practicing", ago(1));
    for (const oid of alg.lessonRefs[0].objectiveIds) await mkMastery(oid, "learning", ago(4));

    /* ---- desk systems ----------------------------------------------- */
    // today's session checklist
    const sessionItems: [string, number, boolean, string | undefined, string | undefined][] = [
      ["Cell biology", 30, true, "Cell biology", "var(--pn-subject-biology)"],
      ["Linear algebra", 20, false, "Linear algebra", "var(--pn-subject-math)"],
      ["Review notes", 15, false, undefined, "var(--pn-subject-general)"],
    ];
    for (let i = 0; i < sessionItems.length; i++) {
      const [title, minutes, done, subjectName, color] = sessionItems[i];
      await ctx.db.insert("studyEvents", {
        userId: sam, kind: "session_item", title, subjectName,
        startTs: todayStart + 9 * HOUR, minutes, done, order: i, color,
      });
    }
    // coming up
    const upcoming: [string, string, number, string | undefined, string | undefined][] = [
      ["quiz", "Unit 2 quiz", 2, "Cell biology", "#7c5cff"],
      ["group", "Group study · with Maya, Sam + 2", 3, undefined, "#e63da8"],
      ["review", "Review session", 5, "Linear algebra", "#3d6eff"],
    ];
    for (const [kind, title, inDays, subjectName, color] of upcoming) {
      await ctx.db.insert("studyEvents", {
        userId: sam, kind: kind as "quiz" | "group" | "review",
        title, subjectName, startTs: todayStart + inDays * DAY + 16 * HOUR,
        done: false, color,
      });
    }
    // this week's focus
    const focusItems: [string, boolean][] = [
      ["Finish Diffusion and osmosis", true],
      ["Practice transport problems", false],
      ["Review Unit 2 key concepts", false],
    ];
    const weekKey = (() => {
      const d = new Date(now);
      const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      const day = (date.getUTCDay() + 6) % 7;
      date.setUTCDate(date.getUTCDate() - day + 3);
      const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
      const fDay = (firstThursday.getUTCDay() + 6) % 7;
      firstThursday.setUTCDate(firstThursday.getUTCDate() - fDay + 3);
      const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * DAY));
      return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
    })();
    for (let i = 0; i < focusItems.length; i++) {
      await ctx.db.insert("weeklyFocus", {
        userId: sam, weekKey, text: focusItems[i][0], done: focusItems[i][1], order: i,
      });
    }
    // achievements — the shelf's "3 new"
    const ach: [string, string, string, "sprout" | "star" | "bolt", string][] = [
      ["study_streak_3", "study streak", "3 days", "sprout", "#a8e05f"],
      ["unit_complete_cell", "unit complete", "Unit 1", "star", "#ffd23f"],
      ["focus_sessions_5", "focus session", "5 sessions", "bolt", "#b985ff"],
    ];
    for (const [key, title, detail, icon, tint] of ach) {
      await ctx.db.insert("achievements", {
        userId: sam, key, title, detail, icon, tint, seen: false, issuedAt: ago(1),
      });
    }
    // the feed
    const feed: [string, Id<"users"> | undefined, string, string | undefined, number][] = [
      ["Maya", crewIds.maya, "completed Cell biology — Unit 1", "Cell biology", ago(0.09)],
      ["sam", sam, "added notes to Linear algebra", "Linear algebra", ago(0.17)],
      ["Rio", crewIds.rio, "started Organic chemistry", "Organic chemistry", ago(0.25)],
      ["Kenji", crewIds.kenji, "solved a practice set in Cell biology", "Cell biology", ago(0.34)],
    ];
    for (const [actorName, actorUserId, text, subjectName, at] of feed) {
      await ctx.db.insert("activityEvents", {
        ownerId: sam, actorName, actorUserId, kind: "lesson",
        text, subjectName, happenedAt: at,
      });
    }
    await ctx.db.insert("activityEvents", {
      ownerId: sam, actorName: "Maya", actorUserId: crewIds.maya,
      kind: "crew_message", text: "anyone up for a study session later?",
      happenedAt: ago(0.05),
    });
    // evidence days for the calendar/streak — sam studied the last 3 days
    // plus a scattered recent history (streak computes to 3).
    for (const d of [0, 1, 2, 5, 6, 9, 11, 14, 17, 20, 23, 27]) {
      await ctx.db.insert("xpLedger", {
        userId: sam, points: 20, reason: "lesson_completed",
        day: new Date(todayStart - d * DAY).toISOString().slice(0, 10),
        createdAt: todayStart - d * DAY + 19 * HOUR,
      });
    }
    return null;
  },
});

/* ------------------------------------------------------------------ */

/** Wipe every demo-owned row so `run` can reseed cleanly. */
export const purge = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const demoUsers = await ctx.db
      .query("users")
      .filter((q) =>
        q.or(
          q.eq(q.field("demoTag"), DEMO_TAG),
          q.eq(q.field("demoTag"), DEMO_CREW_TAG),
        ),
      )
      .collect();
    const ids = new Set(demoUsers.map((u) => u._id));
    const sam = demoUsers.find((u) => u.demoTag === DEMO_TAG);

    if (sam !== undefined) {
      const subjects = await ctx.db
        .query("subjects")
        .withIndex("by_owner", (q) => q.eq("ownerId", sam._id))
        .collect();
      for (const s of subjects) {
        for (const t of ["concepts", "objectives", "subjectSources"] as const) {
          for (const r of await ctx.db
            .query(t)
            .withIndex("by_subject", (q) => q.eq("subjectId", s._id))
            .collect()) {
            await ctx.db.delete(r._id);
          }
        }
        for (const ver of await ctx.db
          .query("curriculumVersions")
          .withIndex("by_subject", (q) => q.eq("subjectId", s._id))
          .collect()) {
          for (const sec of await ctx.db
            .query("sections")
            .withIndex("by_version_order", (q) => q.eq("versionId", ver._id))
            .collect()) {
            for (const unit of await ctx.db
              .query("units")
              .withIndex("by_section_order", (q) => q.eq("sectionId", sec._id))
              .collect()) {
              for (const lesson of await ctx.db
                .query("lessons")
                .withIndex("by_unit_order", (q) => q.eq("unitId", unit._id))
                .collect()) {
                for (const act of await ctx.db
                  .query("activities")
                  .withIndex("by_lesson", (q) => q.eq("lessonId", lesson._id))
                  .collect()) {
                  await ctx.db.delete(act._id);
                }
                await ctx.db.delete(lesson._id);
              }
              await ctx.db.delete(unit._id);
            }
            await ctx.db.delete(sec._id);
          }
          await ctx.db.delete(ver._id);
        }
        await ctx.db.delete(s._id);
      }
      const sources = await ctx.db
        .query("sources")
        .withIndex("by_owner", (q) => q.eq("ownerId", sam._id))
        .collect();
      for (const src of sources) {
        for (const seg of await ctx.db
          .query("sourceSegments")
          .withIndex("by_source", (q) => q.eq("sourceId", src._id))
          .collect()) {
          await ctx.db.delete(seg._id);
        }
        await ctx.db.delete(src._id);
      }
    }

    for (const uid of ids) {
      for (const r of await ctx.db
        .query("attempts")
        .withIndex("by_user_time", (q) => q.eq("userId", uid))
        .take(1000)) {
        await ctx.db.delete(r._id);
      }
      for (const r of await ctx.db
        .query("mastery")
        .withIndex("by_user", (q) => q.eq("userId", uid))
        .take(1000)) {
        await ctx.db.delete(r._id);
      }
      for (const r of await ctx.db
        .query("xpLedger")
        .withIndex("by_user", (q) => q.eq("userId", uid))
        .take(1000)) {
        await ctx.db.delete(r._id);
      }
      for (const r of await ctx.db
        .query("achievements")
        .withIndex("by_user", (q) => q.eq("userId", uid))
        .take(1000)) {
        await ctx.db.delete(r._id);
      }
      for (const r of await ctx.db
        .query("activityEvents")
        .withIndex("by_owner_time", (q) => q.eq("ownerId", uid))
        .take(1000)) {
        await ctx.db.delete(r._id);
      }
      for (const r of await ctx.db
        .query("studyEvents")
        .withIndex("by_user_start", (q) => q.eq("userId", uid))
        .take(1000)) {
        await ctx.db.delete(r._id);
      }
      for (const r of await ctx.db
        .query("weeklyFocus")
        .withIndex("by_user_week", (q) => q.eq("userId", uid))
        .take(1000)) {
        await ctx.db.delete(r._id);
      }
      for (const r of await ctx.db
        .query("friendships")
        .withIndex("by_user", (q) => q.eq("userId", uid))
        .take(1000)) {
        await ctx.db.delete(r._id);
      }
      await ctx.db.delete(uid);
    }
    return null;
  },
});

/** W5 — backfill rooms for every seeded demo lesson (run once after seed). */
export const ensureRooms = internalAction({
  args: {},
  returns: v.object({ ok: v.boolean(), rooms: v.number() }),
  handler: async (ctx): Promise<{ ok: boolean; rooms: number }> => {
    const owner = await ctx.runQuery(internal.seedDemo.demoOwnerId, {});
    if (owner === null) return { ok: false, rooms: 0 };
    const lessons = await ctx.runQuery(internal.seedDemo.demoLessonIds, { ownerId: owner });
    for (const lessonId of lessons) {
      await ctx.runMutation(internal.learningRuntime.ensureLessonSpace, { lessonId });
    }
    return { ok: true, rooms: lessons.length };
  },
});

export const demoLessonIds = internalQuery({
  args: { ownerId: v.id("users") },
  returns: v.array(v.id("lessons")),
  handler: async (ctx, { ownerId }) => {
    const subjects = await ctx.db
      .query("subjects")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect();
    const out: Id<"lessons">[] = [];
    for (const s of subjects) {
      for (const ver of await ctx.db
        .query("curriculumVersions")
        .withIndex("by_subject", (q) => q.eq("subjectId", s._id))
        .collect()) {
        for (const sec of await ctx.db
          .query("sections")
          .withIndex("by_version_order", (q) => q.eq("versionId", ver._id))
          .collect()) {
          for (const unit of await ctx.db
            .query("units")
            .withIndex("by_section_order", (q) => q.eq("sectionId", sec._id))
            .collect()) {
            for (const l of await ctx.db
              .query("lessons")
              .withIndex("by_unit_order", (q) => q.eq("unitId", unit._id))
              .collect()) {
              out.push(l._id);
            }
          }
        }
      }
    }
    return out;
  },
});
