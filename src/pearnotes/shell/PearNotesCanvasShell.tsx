/**
 * PearNotesCanvasShell — the Phase 00 feature boundary for the PearNotes
 * experience. Mounted by App.tsx only when `pearnotesShellRequested()` is
 * true (flag on + `#/learn*`); everything else still renders the legacy app.
 *
 * What this shell is: route parsing for the `#/learn` namespace, the honest
 * empty data seam (+ an explicitly-requested labelled fixture harness), the
 * four Engineer 3 component slots, and the lesson route proving the
 * inherited `Canvas` engine runs under new chrome.
 *
 * What this shell is NOT: a new canvas, a new auth flow, or a data source.
 * Guest/auth continuity stays with `main.tsx` + `AuthIdentityBridge`; the
 * legacy canvas/presence/voice systems are untouched.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Canvas } from "../../components/Canvas";
import { getIdentity } from "../../live/identity";
import {
  lastSpaceSlug,
  normalSpaceHash,
  pearnotesHomeHash,
  pearnotesLessonHash,
  pearnotesPathHash,
} from "../../lib/routes";
import {
  usePearNotesData,
  usePearNotesFixtures,
} from "./data";
import { usePearNotesRoute } from "./navigation";
import { loadPearNotesUiStyles, pearnotesSlots } from "./slots";
import type { LessonMode } from "./types";
import "./shell.css";

const { Home, SubjectPicker, LearningPathDrawer, LessonShell } = pearnotesSlots;

export function PearNotesCanvasShell() {
  /* Subscribed to `hashchange` — App's route state doesn't change between
     `#/learn` sub-routes, so this component owns its own route store. */
  const route = usePearNotesRoute();
  const live = usePearNotesData();
  const fixtures = usePearNotesFixtures();
  const data = fixtures ?? live;
  const fixtureLabel = fixtures?.label;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [lessonMode, setLessonMode] = useState<LessonMode>("guided");
  const [notice, setNotice] = useState<string | null>(null);
  /* Local-only ids for the empty lesson canvas — real gestures arrive with
     wired lesson data in Phase 01; these keep required Canvas props honest. */
  const [selectedWidgetId, setSelectedWidgetId] = useState("");
  const [managedWidgetId, setManagedWidgetId] = useState("");

  /* Real components carry their own stylesheet — loaded once, by glob, so
     the shell never hardcodes the file name or fails when it isn't there. */
  useEffect(() => {
    loadPearNotesUiStyles();
  }, []);

  /* The tab's real persona/account name — the same identity the entry gate
     and cursors use, never a mock learner. */
  const learnerName = useMemo(() => getIdentity().name, []);

  const goHome = useCallback(() => {
    window.location.hash = pearnotesHomeHash();
  }, []);
  const exitToSpaces = useCallback(() => {
    window.location.hash = normalSpaceHash(lastSpaceSlug());
  }, []);
  const openSubject = useCallback((subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setPickerOpen(false);
    window.location.hash = pearnotesPathHash(subjectId);
  }, []);
  const openLesson = useCallback((lessonId: string) => {
    window.location.hash = pearnotesLessonHash(lessonId);
  }, []);
  const pending = useCallback((what: string) => {
    setNotice(`${what} arrives with the learning backend (Phase 01)`);
  }, []);

  /* The lesson IS the existing canvas engine (src/components/Canvas.tsx):
     empty board, no cursors, no fixture widgets — a real clickable canvas
     under the new shell, per Phase 00.2's exit condition. */
  const lessonCanvas = (
    <div className="space-scroll pns-board-viewport">
      <div className="canvas-stage" style={{ width: 1600, height: 1200 }}>
        <div
          className="canvas-scale-layer"
          style={{ width: 1600, height: 1200, transform: "scale(1)" }}
        >
          <Canvas
            spaceId="pearnotes-lesson"
            widgets={[]}
            cursors={[]}
            entrance={false}
            selectedWidgetId={selectedWidgetId}
            onWidgetSelect={(widget) => setSelectedWidgetId(widget.id)}
            managedWidgetId={managedWidgetId}
            onWidgetManage={setManagedWidgetId}
            onWidgetDelete={() => {}}
            onWidgetEdit={() => {}}
            promoted={false}
            onPromote={() => {}}
          />
        </div>
      </div>
    </div>
  );

  return (
    <main className="pns-shell" data-route={route.kind}>
      <header className="pns-chrome">
        <button type="button" className="pns-brand" onClick={goHome}>
          PearNotes
        </button>
        <button type="button" className="pns-exit" onClick={exitToSpaces}>
          spaces ↗
        </button>
      </header>

      {route.kind === "lesson" ? (
        <LessonShell
          lesson={data.lessonFor(route.lessonId)}
          mode={lessonMode}
          onModeChange={setLessonMode}
          /* Exit → back to this lesson's subject path when known (their
             contract: drawer restores scroll + selection), else home. */
          onExit={() => {
            const subjectId = data.lessonFor(route.lessonId)?.subjectId;
            window.location.hash = subjectId
              ? pearnotesPathHash(subjectId)
              : pearnotesHomeHash();
          }}
          status={data.lessonFor(route.lessonId) ? "ready" : "loading"}
          fixtureLabel={fixtureLabel}
        >
          {lessonCanvas}
        </LessonShell>
      ) : (
        <>
          <Home
            learnerName={learnerName}
            subjects={data.subjects}
            resume={data.resume}
            fixtureLabel={fixtureLabel}
            onLearn={() => setPickerOpen(true)}
            onCreateSubject={() => pending("subject creation")}
            onOpenSubject={openSubject}
            onResume={openLesson}
            onOpenLibrary={() => pending("the library")}
            onOpenGroups={exitToSpaces}
            onOpenShelf={() => pending("the trophy shelf")}
            onOpenProfile={() => pending("profile & settings")}
          />
          <SubjectPicker
            open={pickerOpen}
            subjects={data.subjects}
            status={data.status}
            selectedId={selectedSubjectId}
            onSelect={setSelectedSubjectId}
            onEnter={openSubject}
            /* F01: the creator wizard lands with the domain backend (Phase
               01). The + tile stays wired; the shell reports it honestly. */
            onCreate={() => pending("subject creation")}
            onClose={() => setPickerOpen(false)}
            fixtureLabel={fixtureLabel}
          />
          <LearningPathDrawer
            open={route.kind === "path"}
            subject={
              route.kind === "path" ? data.subjectFor(route.subjectId) : null
            }
            path={route.kind === "path" ? data.pathFor(route.subjectId) : null}
            selectedLessonId={selectedLessonId}
            onSelectLesson={setSelectedLessonId}
            onStartLesson={openLesson}
            onBack={() => setPickerOpen(true)}
            onClose={goHome}
            onAddMaterials={() => pending("adding materials")}
            onBrowseSources={() => pending("the source library")}
            fixtureLabel={fixtureLabel}
          />
        </>
      )}

      {notice && (
        <p className="pns-notice" role="status">
          {notice}
          <button
            type="button"
            className="pns-notice-dismiss"
            onClick={() => setNotice(null)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </p>
      )}
    </main>
  );
}
