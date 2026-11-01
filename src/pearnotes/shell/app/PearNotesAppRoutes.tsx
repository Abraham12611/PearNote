/* ------------------------------------------------------------------
 * PearNotesAppRoutes — the production authenticated app shell (Issue #54).
 *
 * Integration contract with Engineer 1's public router:
 *
 *   <PearNotesAppRoutes pathname={pathname} navigate={navigate} />
 *
 *   - `pathname` — the current location path (+ optional query), e.g.
 *     "/app", "/app/library", "/app/subjects/<id>/lessons/<lid>".
 *   - `navigate(to)` — called ONLY with absolute paths under the `/app`
 *     hierarchy (see app/routes.ts builders); the root router owns the
 *     URL and feeds the new pathname back down.
 *   - `onNavigateExternal?(href)` — optional escape hatch for links that
 *     leave `/app` entirely (today: the legacy `#/space/<slug>` OurSpaces
 *     rooms). Without it we fall back to assigning `window.location.hash`,
 *     which the current hash router already understands.
 *   - `demoMode?` — explicit demo context (E1's `/demo/*` mount). When
 *     true, every personal Convex read AND write is suppressed: no
 *     subject/source/curriculum queries, no creation or intake
 *     mutations — only local fixtures and local interactions run.
 *     It is a prop, NEVER inferred from `?fixtures=1` (see app/policy.ts).
 *   - A pathname outside `/app` renders `null` — the public root owns
 *     every other route.
 *
 * What lives here: the left rail, the Home/desk entry, the subject picker
 * (modal over Home), the path drawer, the full lesson canvas, real intake
 * review, and the honest deferred pages. What does NOT: auth entry
 * (Engineer 1), public routing, Convex functions.
 * ------------------------------------------------------------------ */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useConvexAuth } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Canvas } from "../../../components/Canvas";
import { getDataMode } from "../../../live/dataMode";
import { getIdentity } from "../../../live/identity";
import {
  lastSpaceSlug,
  normalSpaceHash,
} from "../../../lib/routes";
import {
  CONVEX_ID,
  LiveDataBridge,
  LiveLessonBridge,
  LivePathBridge,
  pearnotesLiveBackend,
  usePearNotesData,
  usePearNotesFixtures,
  type LiveLessonState,
} from "../data";
import { IntakeReview } from "../../ingestion/IntakeReview";
import type { JobId } from "../../ingestion/api";
import { CreateSubjectSheet } from "../../ingestion/CreateSubjectSheet";
import { LiveLessonBoard } from "../../learning-widgets";
import { loadPearNotesUiStyles, pearnotesSlots } from "../slots";
import type { LearningPath, LessonMode, PearNotesData } from "../types";
import { AppRail } from "./AppRail";
import { Boundary } from "./Boundary";
import {
  AchievementsPage,
  GroupsPage,
  LibraryPage,
  LoadingSlip,
  NotFoundPage,
  ProfilePage,
  SettingsPage,
  UnauthorizedPage,
} from "./pages";
import {
  appHomePath,
  appLearnPath,
  appLessonPath,
  appNavKeyFor,
  appNewPath,
  appRouteFromPathname,
  appSourcesPath,
  appSubjectPath,
  type AppRoute,
} from "./routes";
import { accountStateKey, appAccessPolicy, displayNameFor } from "./policy";
import "./app.css";

const { Home, SubjectPicker, LearningPathDrawer, LessonShell } = pearnotesSlots;

export interface PearNotesAppRoutesProps {
  /** current location path — "/app…"; anything else renders null. */
  pathname: string;
  /** root-router navigation — always called with absolute `/app…` paths. */
  navigate: (to: string) => void;
  /** links that leave `/app` (legacy `#/space/<slug>` rooms, for now). */
  onNavigateExternal?: (href: string) => void;
  /** Explicit demo context from the router (E1's `/demo/*`). Suppresses
   *  every personal Convex read/write — fixtures and local interactions
   *  only. Never inferred from URL flags. */
  demoMode?: boolean;
}

export function PearNotesAppRoutes({
  pathname,
  navigate,
  onNavigateExternal,
  demoMode = false,
}: PearNotesAppRoutesProps) {
  const route = useMemo(() => appRouteFromPathname(pathname), [pathname]);
  if (route.kind === "outside") return null;
  /* Demo is a public, zero-write surface: no auth gate, no live reads —
     regardless of whether a Convex provider happens to be mounted. */
  if (demoMode) {
    return (
      <PearNotesApp
        route={route}
        navigate={navigate}
        onNavigateExternal={onNavigateExternal}
        authState="ready"
        demoMode
      />
    );
  }
  /* The auth gate needs the Convex provider, which only exists in live
     mode — `?mock=1` with a configured URL would otherwise crash the
     live hooks (useConvexAuth/useQuery without a provider). */
  return getDataMode() === "live" && pearnotesLiveBackend() ? (
    <LiveGate route={route} navigate={navigate} onNavigateExternal={onNavigateExternal} />
  ) : (
    <PearNotesApp
      route={route}
      navigate={navigate}
      onNavigateExternal={onNavigateExternal}
      authState="ready"
    />
  );
}

/** Authenticated gate — real sign-in state, never assumed. Guests signed
 *  silently by AuthIdentityBridge read as authenticated here too.
 *
 *  Account-switch privacy (#54 review): `currentUser.userId` keys the
 *  whole app subtree — sign-out/sign-in remounts it, wiping liveData/
 *  livePath/liveLesson, selection state and the displayed identity, so
 *  account B can never see a flash of account A's rows. `currentUser`
 *  must resolve before the app mounts, so a stale session can't open
 *  with yesterday's identity. */
function LiveGate(props: {
  route: AppRoute;
  navigate: (to: string) => void;
  onNavigateExternal?: (href: string) => void;
}) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const me = useQuery(api.auth.currentUser, isAuthenticated ? {} : "skip");
  if (isLoading || (isAuthenticated && me === undefined)) {
    return <PearNotesApp {...props} authState="loading" />;
  }
  if (!isAuthenticated) {
    return <PearNotesApp {...props} authState="unauthorized" />;
  }
  return (
    <PearNotesApp
      {...props}
      key={accountStateKey(me?.userId)}
      authState="ready"
    />
  );
}

function PearNotesApp({
  route,
  navigate,
  onNavigateExternal,
  authState,
  demoMode = false,
}: {
  route: AppRoute;
  navigate: (to: string) => void;
  onNavigateExternal?: (href: string) => void;
  authState: "loading" | "ready" | "unauthorized";
  demoMode?: boolean;
}) {
  const staticData = usePearNotesData();
  /* Provider-backed reads — mirrors main.tsx's mount condition exactly. */
  const liveBackend = getDataMode() === "live" && pearnotesLiveBackend();
  /* Review: `demoMode` fails closed — zero personal reads/writes mount
     below; `?fixtures=1` only counts inside demo/dev contexts. */
  const policy = appAccessPolicy({
    demoMode,
    liveBackend,
    dev: import.meta.env.DEV,
  });
  const fixtures = usePearNotesFixtures(policy.fixturesAllowed);
  const [liveData, setLiveData] = useState<PearNotesData | null>(null);
  const [livePath, setLivePath] = useState<{
    subjectId: string;
    path: LearningPath;
  } | null>(null);
  const [liveLesson, setLiveLesson] = useState<LiveLessonState | null>(null);

  /* Drop the previous lesson's chrome the moment the route id changes —
     the bridge re-reports the fresh lesson immediately after. */
  useEffect(() => {
    setLiveLesson(null);
  }, [route.kind === "lesson" ? route.lessonId : null]);

  const data = fixtures ?? liveData ?? staticData;
  const fixtureLabel = fixtures?.label;

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [lessonMode, setLessonMode] = useState<LessonMode>("guided");
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedWidgetId, setSelectedWidgetId] = useState("");
  const [managedWidgetId, setManagedWidgetId] = useState("");

  useEffect(() => {
    loadPearNotesUiStyles();
  }, []);

  /* Demo surfaces show a fixed nonpersonal identity — `getIdentity()`
     isn't even read in demo mode, so a real name/avatar can never
     appear, transiently or otherwise (coordinator review). */
  const learnerName = useMemo(
    () =>
      displayNameFor({
        demoMode,
        identityName: demoMode ? undefined : getIdentity().name,
      }),
    [demoMode],
  );

  /* Route-driven navigation — the picker/create-sheet are routes, not
     local state, so browser back unwinds them naturally. */
  const goHome = useCallback(() => navigate(appHomePath()), [navigate]);
  const openSubject = useCallback(
    (subjectId: string) => navigate(appSubjectPath(subjectId)),
    [navigate],
  );
  const openLesson = useCallback(
    (lessonId: string) =>
      navigate(
        appLessonPath(
          lessonId,
          route.kind === "path" ? route.subjectId : undefined,
        ),
      ),
    [navigate, route],
  );
  const goExternal = useCallback(
    (href: string) => {
      if (onNavigateExternal) onNavigateExternal(href);
      else window.location.hash = href;
    },
    [onNavigateExternal],
  );
  const openSpaces = useCallback(
    () => goExternal(normalSpaceHash(lastSpaceSlug())),
    [goExternal],
  );
  const pending = useCallback((what: string) => {
    setNotice(`${what} arrives with the learning backend (Phase 01)`);
  }, []);
  /* Demo-disabled actions: an honest "off here", not a silent dead end
     and never a real mutation behind a demo-looking button. */
  const demoNote = useCallback((what: string) => {
    setNotice(`${what} is off in the demo — it runs for real on your own account`);
  }, []);

  /* The lesson IS the inherited canvas engine — empty board, no cursors,
     no fixture widgets. Same mount the hash shell proved out. */
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

  const navKey = appNavKeyFor(route);
  const showRail = route.kind !== "lesson";

  const homeView = (
    <Home
      learnerName={learnerName}
      subjects={data.subjects}
      resume={data.resume}
      fixtureLabel={fixtureLabel}
      onLearn={() => navigate(appLearnPath())}
      onCreateSubject={() =>
        demoMode
          ? demoNote("subject creation")
          : liveBackend
            ? navigate(appNewPath())
            : pending("subject creation")
      }
      onOpenSubject={openSubject}
      onResume={openLesson}
      onOpenLibrary={() => navigate("/app/library")}
      onOpenGroups={() => navigate("/app/groups")}
      onOpenShelf={() => navigate("/app/achievements")}
      onOpenProfile={() => navigate("/app/profile")}
    />
  );

  const view = (() => {
    if (authState === "loading") return <LoadingSlip label="signing in" />;
    if (authState === "unauthorized") return <UnauthorizedPage />;
    switch (route.kind) {
      case "library":
        return (
          <LibraryPage
            live={policy.liveReads && !fixtureLabel}
            onAddMaterial={() => navigate(appLearnPath())}
          />
        );
      case "groups":
        return <GroupsPage onOpenSpaces={openSpaces} />;
      case "achievements":
        return <AchievementsPage />;
      case "profile":
        return (
          <ProfilePage
            learnerName={learnerName}
            live={policy.liveReads && !fixtureLabel}
          />
        );
      case "settings":
        return <SettingsPage />;
      case "notfound":
        return <NotFoundPage path={route.path} onHome={goHome} />;
      /* home, learn, new, path, sources — the desk with modal overlays;
         lesson is handled outside `view` below. */
      default:
        return homeView;
    }
  })();

  return (
    <main className="pna-app" data-route={route.kind}>
      {showRail && (
        <AppRail active={navKey} learnerName={learnerName} onNavigate={navigate} />
      )}

      <div className="pna-main">
        {route.kind === "lesson" ? (
          authState !== "ready" ? (
            authState === "loading" ? (
              <LoadingSlip label="signing in" />
            ) : (
              <UnauthorizedPage />
            )
          ) : liveLesson?.status === "notfound" ||
            (!policy.liveReads &&
              data.lessonFor(route.lessonId) === null) ? (
            /* Malformed/foreign id — real error frame, not a guessed
               lesson. Demo/mock also lands here: with live reads off,
               "not in this data" is honest, an endless loading slip
               isn't. */
            <div className="pns-lesson-error" role="alert">
              <p className="pn-kicker">lesson · unavailable</p>
              <strong>this lesson isn't on your shelf</strong>
              <p className="pns-lesson-error-sub">
                it may belong to another learner, have been removed, or be
                outside this demo — no lesson content is shown rather
                than a guessed one.
              </p>
              <button
                type="button"
                className="pn-cta"
                onClick={() =>
                  navigate(
                    route.subjectId
                      ? appSubjectPath(route.subjectId)
                      : appHomePath(),
                  )
                }
              >
                {route.subjectId ? "back to path" : "back to desk"}
              </button>
            </div>
          ) : (
            <LessonShell
              lesson={
                liveLesson?.status === "ready" &&
                liveLesson.lesson.id === route.lessonId
                  ? liveLesson.lesson
                  : data.lessonFor(route.lessonId)
              }
              mode={lessonMode}
              onModeChange={setLessonMode}
              onExit={() => {
                const subjectId =
                  route.subjectId ??
                  data.lessonFor(route.lessonId)?.subjectId;
                navigate(
                  subjectId ? appSubjectPath(subjectId) : appHomePath(),
                );
              }}
              status={
                liveLesson?.status === "ready" ||
                data.lessonFor(route.lessonId)
                  ? "ready"
                  : "loading"
              }
              fixtureLabel={fixtureLabel}
            >
              {lessonCanvas}
              {policy.liveMutations &&
                !fixtureLabel &&
                CONVEX_ID.test(route.lessonId) && (
                  <LiveLessonBoard lessonId={route.lessonId} />
                )}
            </LessonShell>
          )
        ) : (
          view
        )}
      </div>

      {/* ---- modal overlays (home stays legible underneath) ---- */}

      {authState === "ready" && route.kind !== "lesson" && (
        <>
          <SubjectPicker
            /* `/app/new` where creation is off (demo/mock) falls back to
               the picker — its `+` tile explains instead of writing. */
            open={
              route.kind === "learn" ||
              (route.kind === "new" && !policy.liveMutations)
            }
            subjects={data.subjects}
            status={data.status}
            selectedId={selectedSubjectId}
            onSelect={setSelectedSubjectId}
            onEnter={openSubject}
            onCreate={() =>
              demoMode
                ? demoNote("subject creation")
                : liveBackend
                  ? navigate(appNewPath())
                  : pending("subject creation")
            }
            onClose={goHome}
            fixtureLabel={fixtureLabel}
          />
          <LearningPathDrawer
            open={route.kind === "path"}
            subject={
              route.kind === "path" ? data.subjectFor(route.subjectId) : null
            }
            path={
              route.kind === "path"
                ? livePath?.subjectId === route.subjectId
                  ? livePath.path
                  : data.pathFor(route.subjectId)
                : null
            }
            selectedLessonId={selectedLessonId}
            onSelectLesson={setSelectedLessonId}
            onStartLesson={openLesson}
            onBack={() => navigate(appLearnPath())}
            onClose={goHome}
            onAddMaterials={() =>
              route.kind === "path" && policy.liveMutations
                ? navigate(appSourcesPath(route.subjectId))
                : demoMode
                  ? demoNote("adding material")
                  : pending("adding materials")
            }
            onBrowseSources={() =>
              route.kind === "path" && policy.liveMutations
                ? navigate(appSourcesPath(route.subjectId))
                : demoMode
                  ? demoNote("the source library")
                  : pending("the source library")
            }
            fixtureLabel={fixtureLabel}
          />
        </>
      )}

      {/* ---- live bridges + real surfaces (Convex provider only) ---- */}

      {policy.liveReads && authState === "ready" && (
        /* A failed owner read must degrade to the honest empty desk —
           never crash the shell or fabricate subjects. */
        <Boundary fallback={null}>
          <LiveDataBridge onData={setLiveData} />
        </Boundary>
      )}
      {policy.liveMutations && authState === "ready" && (
        <CreateSubjectSheet
          open={route.kind === "new"}
          onClose={goHome}
          onCreated={(subjectId) => navigate(appSourcesPath(subjectId))}
        />
      )}
      {policy.liveReads && authState === "ready" && route.kind === "path" && (
        /* getPath throws UNAUTHORIZED for a foreign/guessed subject id —
           the boundary turns that into an honest "not yours" note. */
        <Boundary
          key={route.subjectId}
          fallback={
            <p className="pns-live-note" role="alert">
              this subject isn't on your shelf — it may belong to another
              learner or have been removed.
            </p>
          }
        >
          <LivePathBridge subjectId={route.subjectId} onPath={setLivePath} />
        </Boundary>
      )}
      {policy.liveReads &&
        authState === "ready" &&
        route.kind === "lesson" &&
        !fixtureLabel && (
          <Boundary
            key={route.lessonId}
            fallback={
              <p className="pns-live-note" role="alert">
                this lesson couldn't be opened — it may not belong to your
                account.
              </p>
            }
          >
            <LiveLessonBridge
              lessonId={route.lessonId}
              subjectId={route.subjectId}
              onLesson={setLiveLesson}
            />
          </Boundary>
        )}
      {/* Honest empty: an owned subject with no eligible curriculum yet —
         never a fabricated path. */}
      {policy.liveReads &&
        authState === "ready" &&
        !fixtureLabel &&
        route.kind === "path" &&
        !livePath && (
          <p className="pns-live-note" role="status">
            no approved curriculum on this subject yet — upload a source and
            approve its proposal to build the real path.
          </p>
        )}
      {policy.liveMutations && authState === "ready" && route.kind === "sources" && (
        <Boundary
          key={route.subjectId}
          fallback={
            <p className="pns-live-note" role="alert">
              this subject's sources couldn't be opened — it may not belong
              to your account.
            </p>
          }
        >
        <IntakeReview
          subject={data.subjectFor(route.subjectId)}
          jobId={(route.jobId as JobId | undefined) ?? null}
          onJobRoute={(jobId) =>
            navigate(appSourcesPath(route.subjectId, jobId))
          }
          onClose={() => navigate(appSubjectPath(route.subjectId))}
        />
        </Boundary>
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
