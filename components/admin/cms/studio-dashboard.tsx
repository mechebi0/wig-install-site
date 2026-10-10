"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowSquareOut,
  ClockCounterClockwise,
  Gauge,
  House,
  Images,
  MagnifyingGlass,
  MapPin,
  Question,
  Quotes,
  Scissors,
  SignOut,
  Storefront,
  TextAa,
} from "@phosphor-icons/react/dist/ssr";
import { Guarded } from "@/components/auth/guarded";
import { Wordmark } from "@/components/wordmark";
import { LoadingPanel, Notice } from "@/components/ui/feedback";
import { buttonStyles } from "@/components/button";
import { SectionEditor, type SectionMessage, type SectionState } from "@/components/admin/cms/section-editor";
import { PublishCard, ReviewDialog, type CardMessage } from "@/components/admin/cms/publish";
import {
  HistoryPanel,
  LocationPreview,
  OverviewPanel,
  PANEL_INFO,
  PhotosPanel,
  SetupNotice,
} from "@/components/admin/cms/panels";
import { signOut } from "@/lib/auth/session";
import { ADMIN_LOGIN_PATH, ADMIN_PATH, ADMIN_PHOTOS_PATH, leaveTo } from "@/lib/auth/redirect";
import { CONTENT_TABS, PANEL_SECTIONS, sectionSpec, type PanelId } from "@/lib/cms/admin-schema";
import {
  discardDraft,
  fetchLiveVersion,
  fetchStatus,
  loadContent,
  publishContent,
  retryRebuild,
  saveDraft,
  type ContentStatus,
  type DraftRow,
  type LiveVersion,
  type ReleaseRow,
} from "@/lib/cms/admin";
import { SECTION_KEYS, type SectionKey } from "@/lib/cms/defaults";
import { diffSection } from "@/lib/cms/diff";
import { placesFor, same, sectionFrom, tidy, type Item } from "@/lib/cms/editor";
import { publishPhase } from "@/lib/cms/phase";
import { fieldId, validateSection } from "@/lib/cms/validate";

/**
 * /admin/ - Nat's studio dashboard: the website's words, business details,
 * locations, services and prices, FAQs, reviews and search settings, and the
 * way into the photo manager.
 *
 * ---------------------------------------------------------------------------
 * SAVE, THEN PUBLISH
 * ---------------------------------------------------------------------------
 * Each section saves on its own, as a draft only Nat can see
 * (site_content_drafts). Publishing takes every draft into one release
 * (site_content_releases) and asks Cloudflare to rebuild the site, because
 * the site is a static export: its words are written into the pages when it
 * is built (lib/cms/published.ts). The Website card then asks the deployed
 * site which release it carries, and only says "Live on the website" when
 * the answer is this one (lib/cms/phase.ts).
 *
 * ---------------------------------------------------------------------------
 * WHO GETS IN, AND WHAT DECIDES IT
 * ---------------------------------------------------------------------------
 * Guarded sends a signed-out visitor to the owner's sign-in and shows anyone
 * else a dead end. That is routing. Every read and write here is answered by
 * Postgres according to is_admin(), so the same requests from anybody else
 * are refused however they are sent (supabase/migrations/0011).
 *
 * ---------------------------------------------------------------------------
 * WHY THE PANEL LIVES IN THE URL HASH
 * ---------------------------------------------------------------------------
 * So a refresh or a bookmark lands back on the right panel, without a
 * Suspense boundary for useSearchParams under the static export, and without
 * eleven prerendered copies of a page that renders nothing until it has a
 * session. The hash is only ever matched against the known panel names.
 */
export function StudioDashboard() {
  return (
    <Guarded
      requireAdmin
      returnTo={ADMIN_PATH}
      heading="Crowned by Nat"
      offline={
        <Notice tone="info" title="The studio dashboard is not connected yet.">
          It needs the site&rsquo;s Supabase project, which has not been set up on this deployment. The steps are in
          docs/content-manager.md.
        </Notice>
      }
    >
      {({ user }) => <Studio email={user.email ?? ""} />}
    </Guarded>
  );
}

const NAV: { id: PanelId; Icon: typeof Gauge }[] = [
  { id: "overview", Icon: Gauge },
  { id: "business", Icon: Storefront },
  { id: "locations", Icon: MapPin },
  { id: "services", Icon: Scissors },
  { id: "home", Icon: House },
  { id: "content", Icon: TextAa },
  { id: "faq", Icon: Question },
  { id: "reviews", Icon: Quotes },
  { id: "photos", Icon: Images },
  { id: "seo", Icon: MagnifyingGlass },
  { id: "history", Icon: ClockCounterClockwise },
];

/** "#content/book" -> the panel and, for Website content, the tab. Anything else is ignored. */
function readHash(): { panel: PanelId; tab: SectionKey | null } {
  if (typeof window === "undefined") return { panel: "overview", tab: null };
  const [panel, tab] = window.location.hash.replace(/^#/, "").split("/");
  return {
    panel: NAV.some((item) => item.id === panel) ? (panel as PanelId) : "overview",
    tab: CONTENT_TABS.includes(tab as SectionKey) ? (tab as SectionKey) : null,
  };
}

function without<T>(record: Partial<Record<SectionKey, T>>, key: SectionKey): Partial<Record<SectionKey, T>> {
  const next = { ...record };
  delete next[key];
  return next;
}

/** Opens any folded part of the form around a field, then puts focus on it. */
function focusField(id: string, fallbackId: string) {
  requestAnimationFrame(() => {
    const element = document.getElementById(id) ?? document.getElementById(fallbackId);
    if (!element) return;
    for (let fold = element.closest("details"); fold; fold = fold.parentElement?.closest("details") ?? null) {
      fold.open = true;
    }
    element.focus({ preventScroll: true });
    element.scrollIntoView({ block: "center" });
  });
}

type Loaded = {
  release: ReleaseRow | null;
  drafts: Partial<Record<SectionKey, DraftRow>>;
  status: ContentStatus | null;
};

type LoadState = "loading" | "ready" | "setup" | "error";

function Studio({ email }: { email: string }) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState("");
  const [data, setData] = useState<Loaded>({ release: null, drafts: {}, status: null });
  const [edits, setEdits] = useState<Partial<Record<SectionKey, Item>>>({});
  const [showErrors, setShowErrors] = useState<Partial<Record<SectionKey, boolean>>>({});
  const [messages, setMessages] = useState<Partial<Record<SectionKey, SectionMessage>>>({});
  const [busySection, setBusySection] = useState<SectionKey | null>(null);
  const [{ panel, tab }, setPlace] = useState(() => {
    const { panel: fromHash, tab: tabFromHash } = readHash();
    return { panel: fromHash, tab: tabFromHash ?? CONTENT_TABS[0] };
  });
  const [live, setLive] = useState<LiveVersion | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [reviewing, setReviewing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [cardMessage, setCardMessage] = useState<CardMessage | null>(null);
  const [retrying, setRetrying] = useState(false);

  /*
    `.then()` rather than awaits, so every setState lands in a promise
    callback and none in the body of the effect that starts it (the same
    pattern as the photo manager).
  */
  const load = useCallback(
    () =>
      loadContent().then((result) => {
        if (result.error) {
          setLoadError(result.error);
          setLoadState(result.kind === "setup" ? "setup" : "error");
          return;
        }
        setData({ release: result.release, drafts: result.drafts, status: result.status });
        setLoadState("ready");
      }),
    [],
  );

  /** Asks the deployed site which release it carries, and the database what it last asked Cloudflare. */
  const refreshLive = useCallback(
    () =>
      Promise.all([fetchLiveVersion(), fetchStatus()]).then(([version, result]) => {
        setLive(version);
        if (result.status) {
          const status = result.status;
          setData((current) => ({ ...current, status }));
        }
        setNow(Date.now());
      }),
    [],
  );

  useEffect(() => {
    void load();
    void fetchLiveVersion().then((version) => {
      setLive(version);
      setNow(Date.now());
    });
  }, [load]);

  /* On a phone the menu is a sideways-scrolling rail, and the open panel's
     pill can be off its edge: bring it into view. Sideways only, so the page
     itself never jumps. */
  const railRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const rail = railRef.current;
    const item = rail?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!rail || !item || rail.scrollWidth <= rail.clientWidth) return;
    const railBox = rail.getBoundingClientRect();
    const itemBox = item.getBoundingClientRect();
    rail.scrollLeft += itemBox.left - railBox.left - (railBox.width - itemBox.width) / 2;
  }, [panel, loadState]);

  /* The panel follows the address bar when the hash changes by itself: a
     bookmark opened in this tab, or the hash typed. (goTo uses
     replaceState, which fires no hashchange, so this never doubles up.) */
  useEffect(() => {
    const onHash = () => {
      const next = readHash();
      setPlace((current) => ({ panel: next.panel, tab: next.tab ?? current.tab }));
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // ------------------------------------------------------------ derived ---

  const published = useMemo(() => {
    const content = (data.release?.content ?? {}) as Record<string, unknown>;
    return Object.fromEntries(SECTION_KEYS.map((key) => [key, sectionFrom(key, content[key])])) as Record<SectionKey, Item>;
  }, [data.release]);

  const saved = useMemo(
    () =>
      Object.fromEntries(
        SECTION_KEYS.map((key) => {
          const draft = data.drafts[key];
          return [key, draft ? sectionFrom(key, draft.content) : published[key]];
        }),
      ) as Record<SectionKey, Item>,
    [data.drafts, published],
  );

  const valueOf = (key: SectionKey): Item => edits[key] ?? saved[key];

  const states = Object.fromEntries(
    SECTION_KEYS.map((key) => {
      const edited = edits[key];
      const state: SectionState =
        edited !== undefined && !same(edited, saved[key]) ? "unsaved" : data.drafts[key] ? "draft" : "published";
      return [key, state];
    }),
  ) as Record<SectionKey, SectionState>;

  const unsaved = SECTION_KEYS.filter((key) => states[key] === "unsaved");
  const pending = SECTION_KEYS.filter((key) => data.drafts[key]);
  const places = placesFor(valueOf("locations"));
  const setup = loadState === "setup";
  const phase = data.status ? publishPhase(data.status, live, now) : null;

  // ---------------------------------------------------------- watchers ---

  /* While the website is catching up, ask it again: often while a build is
     expected, now and then while one is not. */
  const phaseKind = phase?.kind;
  useEffect(() => {
    if (phaseKind !== "publishing" && phaseKind !== "waiting" && phaseKind !== "failed") return;
    const timer = window.setInterval(() => void refreshLive(), phaseKind === "publishing" ? 15_000 : 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshLive();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [phaseKind, refreshLive]);

  /* Leaving the page with unsaved changes asks first. */
  const hasUnsaved = unsaved.length > 0;
  useEffect(() => {
    if (!hasUnsaved) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsaved]);

  // ----------------------------------------------------------- actions ---

  function goTo(next: PanelId, nextTab: SectionKey = tab) {
    setPlace({ panel: next, tab: nextTab });
    // replaceState: switching panels should not stack history entries.
    window.history.replaceState(null, "", next === "content" ? `#content/${nextTab}` : `#${next}`);
    requestAnimationFrame(() => document.getElementById("studio-panel")?.focus());
  }

  function edit(key: SectionKey, next: Item) {
    setEdits((current) => ({ ...current, [key]: next }));
    setMessages((current) => without(current, key));
  }

  function cancel(key: SectionKey) {
    setEdits((current) => without(current, key));
    setShowErrors((current) => without(current, key));
    setMessages((current) => without(current, key));
  }

  /** After "changed somewhere else": the latest from the database, this section's typing dropped. */
  function reloadSection(key: SectionKey) {
    cancel(key);
    void load();
  }

  function conflictBody(key: SectionKey, error: string): ReactNode {
    return (
      <>
        {error}{" "}
        <button
          type="button"
          onClick={() => reloadSection(key)}
          className="cursor-pointer font-medium text-accent underline underline-offset-4"
        >
          Load the latest version
        </button>
      </>
    );
  }

  async function save(key: SectionKey) {
    const spec = sectionSpec(key);
    const value = tidy(valueOf(key));
    const { errors } = validateSection(spec, value, { places: key === "locations" ? placesFor(value) : places });
    const first = Object.keys(errors)[0];
    if (first) {
      setShowErrors((current) => ({ ...current, [key]: true }));
      setMessages((current) => without(current, key));
      focusField(fieldId(key, first), `${key}-heading`);
      return;
    }

    setBusySection(key);
    const draft = data.drafts[key];

    // Back to exactly what is published: there is nothing to keep.
    if (same(value, published[key])) {
      const result = draft ? await discardDraft(key, draft.updated_at) : { error: "", kind: undefined };
      setBusySection(null);
      if (result.error) {
        setMessages((current) => ({
          ...current,
          [key]: {
            tone: "error",
            title: "Not saved.",
            body: result.kind === "conflict" ? conflictBody(key, result.error) : result.error,
          },
        }));
        return;
      }
      setData((current) => ({ ...current, drafts: without(current.drafts, key) }));
      setEdits((current) => without(current, key));
      setShowErrors((current) => without(current, key));
      setMessages((current) => ({
        ...current,
        [key]: { tone: "info", body: "This matches what is on the website, so there is nothing to publish here." },
      }));
      return;
    }

    const result = await saveDraft(key, value, draft?.updated_at ?? null);
    setBusySection(null);
    if (!result.row) {
      setMessages((current) => ({
        ...current,
        [key]: {
          tone: "error",
          title: "Not saved.",
          body: result.kind === "conflict" ? conflictBody(key, result.error) : result.error,
        },
      }));
      return;
    }
    const row = result.row;
    setData((current) => ({ ...current, drafts: { ...current.drafts, [key]: row } }));
    setEdits((current) => without(current, key));
    setShowErrors((current) => without(current, key));
    setMessages((current) => ({
      ...current,
      [key]: {
        tone: "success",
        title: "Saved.",
        body: "Visitors do not see it yet. Publish from the Website card when you are ready.",
      },
    }));
  }

  async function discard(key: SectionKey) {
    const draft = data.drafts[key];
    if (!draft) return;
    setBusySection(key);
    const { error, kind } = await discardDraft(key, draft.updated_at);
    setBusySection(null);
    if (error) {
      setMessages((current) => ({
        ...current,
        [key]: { tone: "error", title: "Not undone.", body: kind === "conflict" ? conflictBody(key, error) : error },
      }));
      return;
    }
    setData((current) => ({ ...current, drafts: without(current.drafts, key) }));
    setEdits((current) => without(current, key));
    setShowErrors((current) => without(current, key));
    setMessages((current) => ({
      ...current,
      [key]: { tone: "info", body: "Back to exactly what is on the website." },
    }));
  }

  async function publish() {
    setPublishing(true);
    setPublishError("");
    const { result, error, kind } = await publishContent(data.release?.id ?? null);
    if (!result) {
      setPublishing(false);
      setPublishError(error);
      if (kind === "conflict" || kind === "nothing") void load();
      return;
    }
    await load();
    await refreshLive();
    setPublishing(false);
    setReviewing(false);
    setCardMessage({
      tone: result.rebuild === "unavailable" ? "error" : "success",
      title: `Published as release ${result.release}.`,
      body:
        result.rebuild === "requested"
          ? "The website is being updated with it now."
          : result.rebuild === "not_configured"
            ? "Automatic updates are not switched on yet, so the website shows it after its next update."
            : "The request to update the website could not be sent. Try again from this card.",
    });
  }

  async function retry() {
    setRetrying(true);
    const { outcome, error } = await retryRebuild();
    setRetrying(false);
    if (error) {
      setCardMessage({ tone: "error", body: error });
      return;
    }
    setCardMessage(
      outcome === "too_soon"
        ? { tone: "info", body: "The website was asked to update less than a minute ago. Give it a few minutes." }
        : outcome === "not_configured"
          ? { tone: "info", body: "Automatic updates are not switched on, so the website cannot be asked from here yet." }
          : outcome === "unavailable"
            ? { tone: "error", body: "The request could not be sent from the database. Try again later." }
            : { tone: "success", body: "Asked again. The website usually updates within a few minutes." },
    );
    void refreshLive();
  }

  // ------------------------------------------------------------ render ---

  function editorFor(key: SectionKey) {
    const spec = sectionSpec(key);
    const value = valueOf(key);
    const sectionPlaces = key === "locations" ? placesFor(value) : places;
    const { errors, warnings } = validateSection(spec, value, { places: sectionPlaces });
    const announcement = (valueOf("header").announcement ?? {}) as { lead?: string };

    return (
      <SectionEditor
        key={key}
        spec={spec}
        value={value}
        state={states[key]}
        errors={showErrors[key] ? errors : {}}
        warnings={warnings}
        places={sectionPlaces}
        busy={busySection === key}
        message={messages[key] ?? null}
        locked={setup}
        onChange={(next) => edit(key, next)}
        onSave={() => void save(key)}
        onCancel={() => cancel(key)}
        onDiscardDraft={() => void discard(key)}
      >
        {key === "locations" ? <LocationPreview places={sectionPlaces} lead={announcement.lead ?? ""} /> : null}
      </SectionEditor>
    );
  }

  function renderPanel() {
    switch (panel) {
      case "overview":
        return <OverviewPanel published={published} states={states} panelSections={PANEL_SECTIONS} setup={setup} onGoTo={goTo} />;
      case "photos":
        return <PhotosPanel />;
      case "history":
        return <HistoryPanel liveRelease={live?.release ?? null} setup={setup} onRestored={() => load()} />;
      case "content":
        return (
          <div className="flex flex-col gap-6">
            {setup ? <SetupNotice /> : null}
            <div>
              <h2 className="font-display text-2xl tracking-tight text-ink lg:text-3xl">Website content</h2>
              <p className="mt-2 max-w-[66ch] text-base leading-relaxed text-muted">
                The headings, text and buttons on each page. Choose a part of the website to edit.
              </p>
            </div>
            <ul aria-label="Parts of the website" className="flex flex-wrap gap-2">
              {CONTENT_TABS.map((key) => {
                const current = key === tab;
                const state = states[key];
                return (
                  <li key={key}>
                    <button
                      type="button"
                      aria-current={current ? "true" : undefined}
                      onClick={() => goTo("content", key)}
                      className={`relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm transition-colors ${
                        current
                          ? "border-accent bg-accent text-on-accent"
                          : "border-line-strong bg-surface text-ink hover:border-accent hover:text-accent"
                      }`}
                    >
                      {sectionSpec(key).title}
                      <StatusDot state={state} onAccent={current} />
                    </button>
                  </li>
                );
              })}
            </ul>
            {editorFor(tab)}
          </div>
        );
      default:
        return (
          <div className="flex flex-col gap-10">
            {setup ? <SetupNotice /> : null}
            {PANEL_SECTIONS[panel].map((key) => editorFor(key))}
          </div>
        );
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-24 pt-10 sm:px-8 lg:pb-28 lg:pt-14">
      {/* ------------------------------------------------------- header --- */}
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-8">
        {/* One h1 for the brand and the tool, as in the photo manager. */}
        <h1>
          <Wordmark className="text-2xl text-ink" />
          <span className="label mt-3 block text-accent">Studio dashboard</span>
        </h1>

        <div className="flex min-w-0 flex-col gap-3 sm:items-end">
          <p className="text-sm text-muted">
            Owner account: <span className="block break-all font-medium text-ink sm:inline">{email}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/"
              target="_blank"
              rel="noopener"
              className="relative inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-surface px-5 text-sm text-ink transition-colors hover:border-accent hover:text-accent"
            >
              View the website
              <ArrowSquareOut size={15} weight="regular" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <button
              type="button"
              onClick={() => {
                void signOut().then(() => leaveTo(ADMIN_LOGIN_PATH, true));
              }}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm text-muted transition-colors hover:text-accent"
            >
              <SignOut size={17} weight="regular" aria-hidden="true" />
              Log out
            </button>
          </div>
        </div>
      </header>

      {loadState === "loading" ? (
        <div className="mt-10">
          <LoadingPanel label="Opening your dashboard" />
        </div>
      ) : loadState === "error" ? (
        <div className="mt-10 flex max-w-[46rem] flex-col gap-5">
          <Notice tone="error" title="Your dashboard would not open.">
            {loadError}
          </Notice>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setLoadState("loading");
                void load();
              }}
              className={buttonStyles.primary}
            >
              Try again
            </button>
            <a href={ADMIN_PHOTOS_PATH} className={buttonStyles.secondary}>
              Open the photo manager
            </a>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 pt-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12 lg:pt-10">
          {/* -------------------------------------------------- sidebar --- */}
          {/*
            min-w-0 is load bearing on a phone: a grid track sized by its
            content takes the width of the nowrap nav rail inside it, and
            the rail pushed the old dashboard past a 375px screen.
          */}
          <div className="min-w-0 lg:sticky lg:top-[calc(72px+1.5rem)] lg:max-h-[calc(100svh-72px-3rem)] lg:self-start lg:overflow-y-auto lg:pb-2">
            <nav aria-label="Dashboard">
              {/* A scrolling rail below lg, a column from lg. */}
              <ul
                ref={railRef}
                className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0"
              >
                {NAV.map(({ id, Icon }) => {
                  const current = panel === id;
                  const keys = PANEL_SECTIONS[id];
                  const state: SectionState = keys.some((key) => states[key] === "unsaved")
                    ? "unsaved"
                    : keys.some((key) => states[key] === "draft")
                      ? "draft"
                      : "published";
                  return (
                    <li key={id} className="shrink-0">
                      {/*
                        `relative` is load bearing: the status dot's
                        screen-reader words are absolutely positioned, and
                        without a positioned ancestor inside the scrolling
                        rail they escaped its clipping and widened the whole
                        page on a 320px phone (measured: 510px).
                      */}
                      <button
                        type="button"
                        onClick={() => goTo(id)}
                        aria-current={current ? "page" : undefined}
                        className={`relative flex min-h-11 w-full cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-full px-4 text-left text-sm transition-colors duration-200 ${
                          current ? "bg-accent text-on-accent" : "text-muted hover:bg-surface-2 hover:text-ink"
                        }`}
                      >
                        <Icon size={17} weight="regular" aria-hidden="true" />
                        {PANEL_INFO[id].title}
                        <StatusDot state={state} onAccent={current} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="mt-6">
              {setup ? (
                <div className="rounded-3xl border border-line-strong bg-surface p-5">
                  <p className="label text-muted">Website</p>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    Publishing switches on once the one-time setup is done. The website keeps its current words until then.
                  </p>
                </div>
              ) : (
                <PublishCard
                  phase={phase}
                  pending={pending}
                  unsaved={unsaved}
                  busy={publishing || retrying}
                  message={cardMessage}
                  onReview={() => {
                    setPublishError("");
                    setCardMessage(null);
                    setReviewing(true);
                  }}
                  onRetry={() => void retry()}
                />
              )}
            </div>
          </div>

          {/* ---------------------------------------------------- panel --- */}
          <div id="studio-panel" tabIndex={-1} className="min-w-0 scroll-mt-28 outline-none">
            {renderPanel()}
          </div>
        </div>
      )}

      <ReviewDialog
        open={reviewing}
        changes={pending.map((key) => ({ key, changes: diffSection(sectionSpec(key), published[key], saved[key]) }))}
        unsaved={unsaved}
        busy={publishing}
        error={publishError}
        onPublish={() => void publish()}
        onClose={() => setReviewing(false)}
      />
    </div>
  );
}

/**
 * A rose dot for unsaved changes, a ring for saved ones waiting to be
 * published, and the same words for a screen reader.
 */
const DOT_STYLES: Record<"unsaved" | "draft", [string, string]> = {
  unsaved: ["bg-accent", "bg-on-accent"],
  draft: ["border border-accent", "border border-on-accent"],
};

function StatusDot({ state, onAccent }: { state: SectionState; onAccent: boolean }) {
  if (state === "published") return null;
  return (
    <>
      <span
        aria-hidden="true"
        className={`ml-auto inline-block h-2 w-2 shrink-0 rounded-full ${DOT_STYLES[state][onAccent ? 1 : 0]}`}
      />
      <span className="sr-only">{state === "unsaved" ? ", unsaved changes" : ", saved changes waiting to be published"}</span>
    </>
  );
}
