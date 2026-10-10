"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, ArrowSquareOut, Images } from "@phosphor-icons/react/dist/ssr";
import { buttonStyles } from "@/components/button";
import { EmptyState, LoadingPanel, Notice } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/admin/cms/fields";
import { StateBadge, type SectionState } from "@/components/admin/cms/section-editor";
import { listReleases, restoreRelease, type ReleaseRow } from "@/lib/cms/admin";
import { SECTION_SPECS, type PanelId } from "@/lib/cms/admin-schema";
import type { SectionKey } from "@/lib/cms/defaults";
import { studioTime, type Item } from "@/lib/cms/editor";
import type { Places } from "@/lib/cms/model";
import { formatLocationList } from "@/lib/catalog";
import { ADMIN_PHOTOS_PATH } from "@/lib/auth/redirect";

/** Nat's own Square dashboard, where bookings, availability and payments live. */
const SQUARE_DASHBOARD = "https://squareup.com/dashboard/";

export const PANEL_INFO: Record<PanelId, { title: string; blurb: string }> = {
  overview: { title: "Overview", blurb: "Where the website is, and what is waiting." },
  business: { title: "Business information", blurb: "Name, email, phone, address and hours." },
  locations: { title: "Locations", blurb: "Your current location and the others you serve." },
  services: { title: "Services & pricing", blurb: "Names, prices, descriptions and order." },
  home: { title: "Homepage", blurb: "Slideshow words and the blocks under it." },
  content: { title: "Website content", blurb: "Every page's headings, text and buttons." },
  faq: { title: "FAQs & policies", blurb: "Questions and answers, and the draft notice." },
  reviews: { title: "Reviews", blurb: "Client reviews and the sample notice." },
  photos: { title: "Photos & gallery", blurb: "Upload, replace, hide and place photos." },
  seo: { title: "SEO & social links", blurb: "Search results, link previews, Instagram." },
  history: { title: "Publishing history", blurb: "Every release, and how to bring one back." },
};

// ---------------------------------------------------------------- overview ---

export function OverviewPanel({
  published,
  states,
  panelSections,
  setup,
  onGoTo,
}: {
  /** The published words, section by section (placeholders still in place). */
  published: Partial<Record<SectionKey, Item>>;
  /** Each section's state. */
  states: Partial<Record<SectionKey, SectionState>>;
  panelSections: Record<PanelId, SectionKey[]>;
  /** The one-time database setup is still to be done. */
  setup: boolean;
  onGoTo: (panel: PanelId) => void;
}) {
  const locations = (published.locations?.items ?? []) as { id: string; name: string; region: string; active: boolean }[];
  const primaryId = published.locations?.primary;
  const active = locations.filter((item) => item.active);
  const primary = active.find((item) => item.id === primaryId) ?? active[0];
  const others = active.filter((item) => item !== primary);
  const services = (published.services?.items ?? []) as { active: boolean }[];
  const faqs = (published.faq?.items ?? []) as unknown[];
  const reviews = (published.reviews?.items ?? []) as unknown[];

  const panels = (Object.keys(PANEL_INFO) as PanelId[]).filter((id) => id !== "overview");

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h2 className="font-display text-2xl tracking-tight text-ink lg:text-3xl">Overview</h2>
        <p className="mt-2 max-w-[66ch] text-base leading-relaxed text-muted">
          Change the website&rsquo;s words here, save, then publish when you are ready. Nothing you save is seen by visitors
          until you publish it, and the Website card tells you when it is live.
        </p>
      </div>

      {setup ? <SetupNotice /> : null}

      <section aria-labelledby="published-heading" className="rounded-3xl border border-accent/25 bg-accent-soft p-5 sm:p-7">
        <h3 id="published-heading" className="label text-muted">
          Published now
        </h3>
        <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <Fact label="Current location">{primary ? `${primary.name}, ${primary.region}` : "None: every location is off"}</Fact>
          <Fact label="Also serving">
            {others.length > 0
              ? formatLocationList(others.map((item) => ({ name: item.name, state: item.region })))
              : "No other locations"}
          </Fact>
          <Fact label="Services on the menu">{`${services.filter((item) => item.active).length} of ${services.length}`}</Fact>
          <Fact label="Questions on Before you book">{String(faqs.length)}</Fact>
          <Fact label="Reviews">
            {`${reviews.length}${published.reviews?.placeholder ? ", with the sample notice showing" : ""}`}
          </Fact>
          <Fact label="Policy answers">{published.faq?.draft ? "Marked as drafts on the page" : "Confirmed"}</Fact>
        </dl>
      </section>

      <section aria-labelledby="sections-heading">
        <h3 id="sections-heading" className="font-display text-xl tracking-tight text-ink">
          What you can change
        </h3>
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {panels.map((id) => {
            const keys = panelSections[id];
            const state: SectionState | null = keys.some((key) => states[key] === "unsaved")
              ? "unsaved"
              : keys.some((key) => states[key] === "draft")
                ? "draft"
                : null;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onGoTo(id)}
                  className="flex h-full w-full cursor-pointer flex-col items-start gap-2 rounded-3xl border border-line-strong bg-surface p-5 text-left transition-colors hover:border-accent"
                >
                  <span className="flex w-full items-start justify-between gap-3">
                    <span className="font-display text-lg leading-snug tracking-tight text-ink">{PANEL_INFO[id].title}</span>
                    <ArrowRight size={16} weight="regular" aria-hidden="true" className="mt-1.5 shrink-0 text-accent" />
                  </span>
                  <span className="text-sm leading-relaxed text-muted">{PANEL_INFO[id].blurb}</span>
                  {state ? <StateBadge state={state} /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <section aria-labelledby="square-heading" className="rounded-3xl border border-line-strong bg-surface p-5 sm:p-7">
          <h3 id="square-heading" className="font-display text-xl tracking-tight text-ink">
            Bookings stay in Square
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Appointments, availability, add-ons and payments are managed in Square Appointments, which the booking pages
            embed. The prices and names here are what the website shows. Changing them here does not change Square, so make
            the same change there.
          </p>
          <a
            href={SQUARE_DASHBOARD}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent"
          >
            Open Square
            <ArrowSquareOut size={15} weight="regular" aria-hidden="true" />
          </a>
        </section>

        <PhotosCard />
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: string }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-0.5 text-base font-medium text-ink">{children}</dd>
    </div>
  );
}

export function SetupNotice() {
  return (
    <Notice tone="info" title="One setup step is still to be done.">
      The content manager needs a one-time update to the website&rsquo;s database before it can save anything. Your developer
      has the steps in docs/content-manager.md (One-time setup). Until then the website keeps its current words, and the photo
      manager works as usual.
    </Notice>
  );
}

// ------------------------------------------------------------------ photos ---

function PhotosCard() {
  return (
    <section aria-labelledby="photos-card-heading" className="rounded-3xl border border-line-strong bg-surface p-5 sm:p-7">
      <h3 id="photos-card-heading" className="flex items-center gap-2 font-display text-xl tracking-tight text-ink">
        <Images size={20} weight="regular" aria-hidden="true" className="text-accent" />
        Photos
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Photos are managed in the photo manager, and photo changes show on the website straight away, without publishing.
      </p>
      <a href={ADMIN_PHOTOS_PATH} className={`${buttonStyles.secondary} mt-4`}>
        Open the photo manager
      </a>
    </section>
  );
}

export function PhotosPanel() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl tracking-tight text-ink lg:text-3xl">Photos &amp; gallery</h2>
        <p className="mt-2 max-w-[66ch] text-base leading-relaxed text-muted">
          Every photo on the website is managed in the photo manager. It is a page of its own because photos work a little
          differently from words: a photo change shows on the website straight away, with no publishing step.
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          ["Add, replace and remove photos", "Upload from your phone or computer; replace a photo and it keeps its place everywhere."],
          ["Hide, show and reorder", "Take a photo off the website without deleting it, and choose the gallery order."],
          ["Descriptions and collections", "Each photo's description for screen readers, its title, and its collections."],
          ["Where photos appear", "Choose the photo for each slideshow slide, collection cover, install page and finish."],
          ["Booking pages", "Tick which services' booking pages each photo appears on."],
        ].map(([title, body]) => (
          <li key={title} className="rounded-3xl border border-line bg-surface p-5">
            <p className="font-display text-lg tracking-tight text-ink">{title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
          </li>
        ))}
      </ul>
      <div>
        <a href={ADMIN_PHOTOS_PATH} className={buttonStyles.primary}>
          <Images size={17} weight="regular" aria-hidden="true" />
          Open the photo manager
        </a>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- history ---

type ReleaseSummary = Omit<ReleaseRow, "content">;

export function HistoryPanel({
  liveRelease,
  setup,
  onRestored,
}: {
  /** The release the deployed website says it carries, if known. */
  liveRelease: number | null;
  setup: boolean;
  /** Called after a release has been copied into drafts, to reload them. */
  onRestored: (sections: string[]) => Promise<void>;
}) {
  const [releases, setReleases] = useState<ReleaseSummary[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(setup ? "ready" : "loading");
  const [error, setError] = useState("");
  const [restoring, setRestoring] = useState<ReleaseSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  /* `.then()` rather than awaits, so every setState lands in a promise callback. */
  const load = useCallback(
    () =>
      listReleases().then(({ releases: found, error: failed }) => {
        setReleases(found);
        setError(failed);
        setStatus(failed ? "error" : "ready");
      }),
    [],
  );

  useEffect(() => {
    if (!setup) void load();
  }, [load, setup]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl tracking-tight text-ink lg:text-3xl">Publishing history</h2>
        <p className="mt-2 max-w-[66ch] text-base leading-relaxed text-muted">
          Every time you publish, the website&rsquo;s words are kept as a release. To go back to an earlier version, copy it
          into your changes, look it over, and publish it again. Nothing on the website changes until you do.
        </p>
      </div>

      {setup ? <SetupNotice /> : null}
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      {status === "loading" ? (
        <LoadingPanel label="Loading your releases" />
      ) : status === "error" ? (
        <Notice tone="error" title="The history would not load.">
          {error}{" "}
          <button type="button" onClick={() => void load()} className="font-medium text-accent underline underline-offset-4">
            Try again
          </button>
        </Notice>
      ) : releases.length === 0 && !setup ? (
        <EmptyState title="Nothing published yet." body="Your first release appears here once you publish." />
      ) : (
        <ol className="flex flex-col gap-3">
          {releases.map((release) => (
            <li
              key={release.id}
              className="flex flex-col gap-3 rounded-3xl border border-line-strong bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-display text-lg tracking-tight text-ink">
                  Release {release.id}
                  {release.is_current ? (
                    <span className="rounded-full bg-accent px-2.5 py-0.5 font-sans text-xs font-medium text-on-accent">
                      Current
                    </span>
                  ) : null}
                  {liveRelease === release.id ? (
                    <span className="rounded-full border border-accent/30 bg-accent-soft px-2.5 py-0.5 font-sans text-xs font-medium text-accent">
                      Live on the website
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-sm text-muted">Published {studioTime(release.published_at)}</p>
                <p className="mt-1 text-sm text-muted">
                  Changed:{" "}
                  {release.sections
                    .map((key) => SECTION_SPECS.find((spec) => spec.key === key)?.title ?? key)
                    .join(", ") || "nothing"}
                </p>
              </div>
              {release.is_current ? null : (
                <button
                  type="button"
                  className={`${buttonStyles.secondary} shrink-0`}
                  onClick={() => {
                    setMessage(null);
                    setRestoring(release);
                  }}
                >
                  Copy into my changes
                </button>
              )}
            </li>
          ))}
        </ol>
      )}

      <ConfirmDialog
        open={restoring !== null}
        busy={busy}
        title={`Bring back release ${restoring?.id ?? ""}?`}
        body={
          <>
            Its words are copied into your saved changes, section by section, replacing any saved changes you have not
            published yet. The website does not change until you review and publish.
          </>
        }
        confirmLabel="Copy into my changes"
        onCancel={() => setRestoring(null)}
        onConfirm={() => {
          const target = restoring;
          if (!target) return;
          setBusy(true);
          void restoreRelease(target.id).then(async ({ sections, error: failed }) => {
            setBusy(false);
            setRestoring(null);
            if (failed) {
              setMessage({ tone: "error", text: failed });
              return;
            }
            await onRestored(sections);
            setMessage({
              tone: "success",
              text: `Release ${target.id} is copied into your saved changes. Review and publish it to put it back on the website.`,
            });
          });
        }}
      />
    </div>
  );
}

// --------------------------------------------------------------- locations ---

/**
 * How the website will name the locations being edited, before they are
 * saved: the announcement bar's sentence (the same words the stripe's
 * accessible sentence uses) and the two values copy can borrow.
 */
export function LocationPreview({ places, lead }: { places: Places; lead: string }) {
  const towns = places.active.map((place) => ({ name: place.name, state: place.region }));
  const [first, ...rest] = towns;
  const sentence = first
    ? rest.length > 0
      ? `${lead} in ${first.name}, ${first.state}. Also serving ${formatLocationList(rest)}.`
      : `${lead} in ${formatLocationList(towns)}.`
    : "No location is switched on, so the announcement bar says you are between studios and names no town.";

  return (
    <section aria-labelledby="location-preview-heading" className="rounded-3xl border border-accent/25 bg-accent-soft p-5 sm:p-7">
      <h3 id="location-preview-heading" className="label text-muted">
        How the website will read
      </h3>
      <dl className="mt-4 flex flex-col gap-4">
        <div>
          <dt className="text-sm text-muted">Announcement bar</dt>
          <dd className="mt-0.5 text-base text-ink">{sentence}</dd>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted">{"{current location}"} reads as</dt>
            <dd className="mt-0.5 text-base font-medium text-ink">{places.current || "(nothing)"}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">{"{other locations}"} reads as</dt>
            <dd className="mt-0.5 text-base font-medium text-ink">{places.other || "(nothing)"}</dd>
          </div>
        </div>
      </dl>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        Not on the website until you save and publish.
      </p>
    </section>
  );
}
