import { useEffect, useMemo, useState } from "react";
import { PearNotesHome } from "../HomeShell";
import { SubjectPicker } from "../SubjectPicker";
import { LearningPathDrawer } from "../LearningPathDrawer";
import { LessonShell } from "../LessonShell";
import {
  FIXTURE_LESSON,
  FIXTURE_PATH,
  FIXTURE_RESUME,
  FIXTURE_SUBJECTS,
  PROTOTYPE_FIXTURE_LABEL,
} from "../fixtures";
import type { LearningPath, LessonMode } from "../types";
import { JourneyAssetGallery } from "./JourneyAssetGallery";

/* ------------------------------------------------------------------
 * Isolated prototype harness (Issue #5, P00.3).
 *
 * Run `npm run dev`, then open
 *   /src/pearnotes/ui/preview/index.html?scene=<id>
 *
 * It renders the real components with every state the contract
 * supports — genuinely empty scenes pass `subjects={[]}` (what a real
 * new account sees), populated scenes use the labelled PROTOTYPE
 * fixtures and show the fixture ribbon. Callbacks are logged into the
 * harness bar instead of routing, so nothing here touches App.tsx,
 * Convex or storage.
 * ------------------------------------------------------------------ */

const SCENES = [
  { id: "home-empty", label: "home · first run" },
  { id: "home-populated", label: "home · fixture shelf" },
  { id: "picker-empty", label: "picker · empty" },
  { id: "picker-populated", label: "picker · fixture" },
  { id: "picker-loading", label: "picker · loading" },
  { id: "picker-error", label: "picker · error" },
  { id: "drawer-ready", label: "drawer · path" },
  { id: "drawer-review", label: "drawer · needs review" },
  { id: "drawer-generating", label: "drawer · generating" },
  { id: "drawer-empty", label: "drawer · no material" },
  { id: "drawer-loading", label: "drawer · loading" },
  { id: "drawer-error", label: "drawer · error" },
  { id: "lesson-guided", label: "lesson · guided" },
  { id: "lesson-explore", label: "lesson · explore" },
  { id: "journey-assets", label: "journey asset pack" },
] as const;

type SceneId = (typeof SCENES)[number]["id"];

const MANUAL_SUBJECT = {
  id: "fixture-manual",
  name: "My quiet notes",
  avatar: "general" as const,
  color: "var(--pn-subject-general)",
  status: "needs_material" as const,
};

const DRAWER_PATHS: Record<string, LearningPath | null> = {
  "drawer-ready": FIXTURE_PATH,
  "drawer-review": { ...FIXTURE_PATH, status: "needs_review" },
  "drawer-generating": { subjectId: "fixture-bio", status: "generating", sections: [] },
  "drawer-empty": { subjectId: "fixture-manual", status: "needs_material", sections: [] },
  "drawer-loading": null,
  "drawer-error": {
    subjectId: "fixture-bio",
    status: "error",
    sections: [],
    error: { message: "the connection dropped mid-sketch.", retryable: true },
  },
};

/** Decorative lesson board standing in for the real canvas slot — zones
 *  and cards only, clearly prototype furniture. */
function DemoBoard() {
  return (
    <div className="pnh-board" aria-hidden="true">
      <span className="pnh-zone" style={{ top: "10%", left: "7%", width: "38%", height: "36%" }}>
        orientation
      </span>
      <span className="pnh-zone" style={{ top: "52%", left: "7%", width: "38%", height: "38%" }}>
        practice
      </span>
      <span className="pnh-zone" style={{ top: "10%", left: "52%", width: "40%", height: "36%" }}>
        sources &amp; teach-back
      </span>
      <span className="pnh-zone" style={{ top: "52%", left: "52%", width: "40%", height: "38%" }}>
        your notes
      </span>
      <article className="pnh-card" style={{ top: "17%", left: "11%", rotate: "-1.6deg" }}>
        <span className="pnh-card-kicker">lesson card</span>
        <strong>gradients in one page</strong>
        <p>molecules drift from crowded to roomy until things even out…</p>
      </article>
      <article className="pnh-card" style={{ top: "18%", left: "56%", rotate: "1.2deg" }}>
        <span className="pnh-card-kicker">source excerpt · p.4</span>
        <strong>"water moves across the membrane…"</strong>
        <p>pinned from your uploaded chapter — tap to open the page.</p>
      </article>
      <article className="pnh-card pnh-card-ink" style={{ top: "60%", left: "12%", rotate: "1.4deg" }}>
        <span className="pnh-card-kicker">challenge</span>
        <strong>which way does the water move?</strong>
        <p>hypotonic outside — pick the direction.</p>
      </article>
      <article className="pnh-card" style={{ top: "32%", left: "70%", rotate: "-2deg" }}>
        <span className="pnh-card-kicker">teach-back</span>
        <strong>explain osmosis out loud</strong>
        <p>say it to the room — the pin listens, your sources back you up.</p>
      </article>
      <article className="pnh-card pnh-card-note" style={{ top: "64%", left: "60%", rotate: "2.2deg" }}>
        <span className="pnh-card-kicker">your margin note</span>
        <strong>empty page</strong>
        <p>double-tap anywhere here to pin a thought.</p>
      </article>
    </div>
  );
}

export function PearNotesPrototypeApp() {
  const [scene, setScene] = useState<SceneId>(() => {
    const requested = new URLSearchParams(window.location.search).get("scene");
    return SCENES.some((s) => s.id === requested) ? (requested as SceneId) : "home-empty";
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get("sel"),
  );
  const [selectedLesson, setSelectedLesson] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get("sel"),
  );
  const [mode, setMode] = useState<LessonMode>(() =>
    new URLSearchParams(window.location.search).get("mode") === "explore"
      ? "explore"
      : "guided",
  );
  const [lastAction, setLastAction] = useState("—");

  /* `?list=open` opens the lesson's linear activities list — lets the
     non-spatial alternative be deep-linked for review/screenshots. */
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("list") !== "open")
      return;
    const timer = window.setTimeout(() => {
      document.querySelector<HTMLButtonElement>(".pn-list-toggle")?.click();
    }, 60);
    return () => window.clearTimeout(timer);
  }, [scene]);

  const go = (next: SceneId) => {
    setScene(next);
    const url = new URL(window.location.href);
    url.searchParams.set("scene", next);
    window.history.replaceState(null, "", url);
  };

  const action = (label: string) => setLastAction(label);

  const isPicker = scene.startsWith("picker");
  const isDrawer = scene.startsWith("drawer");
  const isLesson = scene.startsWith("lesson");
  const isAssets = scene === "journey-assets";
  const emptyAccount = scene === "home-empty" || scene === "picker-empty" || scene === "picker-loading";
  const homeSubjects = emptyAccount ? [] : FIXTURE_SUBJECTS;
  const homeFixture = emptyAccount ? undefined : PROTOTYPE_FIXTURE_LABEL;

  const drawerPath = useMemo(() => DRAWER_PATHS[scene] ?? null, [scene]);
  const drawerSubject =
    scene === "drawer-empty" ? MANUAL_SUBJECT : isDrawer ? FIXTURE_SUBJECTS[0] : null;

  return (
    <>
      {(isPicker || isDrawer || scene.startsWith("home")) && (
        <PearNotesHome
          learnerName="alex"
          subjects={homeSubjects}
          resume={scene === "home-populated" ? FIXTURE_RESUME : null}
          fixtureLabel={homeFixture}
          onLearn={() => go(homeSubjects.length ? "picker-populated" : "picker-empty")}
          onCreateSubject={() => action("→ create subject wizard")}
          onOpenSubject={(id) => action(`open subject → ${id}`)}
          onResume={(id) => action(`resume lesson → ${id}`)}
          onOpenLibrary={() => action("→ library")}
          onOpenGroups={() => action("→ groups")}
          onOpenShelf={() => action("→ trophy shelf")}
          onOpenProfile={() => action("→ profile / settings")}
        />
      )}

      <SubjectPicker
        open={isPicker}
        subjects={homeSubjects}
        status={scene === "picker-loading" ? "loading" : scene === "picker-error" ? "error" : "ready"}
        errorMessage="the connection dropped while fetching."
        selectedId={selected}
        fixtureLabel={homeFixture}
        onSelect={setSelected}
        onEnter={(id) => {
          setSelected(id);
          go("drawer-ready");
        }}
        onCreate={() => action("→ create subject wizard")}
        onClose={() => go(homeSubjects.length ? "home-populated" : "home-empty")}
        onRetry={() => action("retry subjects.listMine")}
      />

      <LearningPathDrawer
        open={isDrawer}
        subject={drawerSubject}
        path={drawerPath}
        selectedLessonId={selectedLesson}
        fixtureLabel={isDrawer ? PROTOTYPE_FIXTURE_LABEL : undefined}
        onSelectLesson={setSelectedLesson}
        onStartLesson={() => go("lesson-guided")}
        onBack={() => go("picker-populated")}
        onClose={() => go("home-populated")}
        onAddMaterials={() => action("→ add resources wizard")}
        onBrowseSources={() => action("→ subject sources")}
        onRetry={() => action("retry curricula.getPath")}
      />

      {isAssets && <JourneyAssetGallery />}

      {isLesson && (
        <LessonShell
          lesson={FIXTURE_LESSON}
          mode={mode}
          onModeChange={setMode}
          onExit={() => go("drawer-ready")}
          onReturnToNext={() => action("camera → next activity anchor")}
          onOpenObject={(id) => action(`focus object → ${id}`)}
          syncState="saved"
          fixtureLabel={PROTOTYPE_FIXTURE_LABEL}
        >
          <DemoBoard />
        </LessonShell>
      )}

      {!isLesson && (
      <div className="pnh-bar">
        <button
          type="button"
          className="pnh-toggle"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          scenes · {scene}
        </button>
        {menuOpen && (
          <div className="pnh-menu" role="menu">
            {SCENES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`pnh-menu-item${s.id === scene ? " is-active" : ""}`}
                onClick={() => {
                  go(s.id);
                  setMenuOpen(false);
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
        <span className="pnh-note">ui prototype · last action: {lastAction}</span>
      </div>
      )}
    </>
  );
}
