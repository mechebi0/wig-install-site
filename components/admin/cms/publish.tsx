"use client";

import { useId } from "react";
import { ArrowsClockwise, CheckCircle, CircleNotch, Clock, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { AdminDialog } from "@/components/admin/admin-dialog";
import { buttonStyles } from "@/components/button";
import { Notice, Spinner } from "@/components/ui/feedback";
import { sectionSpec } from "@/lib/cms/admin-schema";
import type { SectionKey } from "@/lib/cms/defaults";
import type { Change } from "@/lib/cms/diff";
import { studioTime } from "@/lib/cms/editor";
import type { PublishPhase } from "@/lib/cms/phase";

/**
 * The Website card: where the website is with Nat's words, and the way to
 * publish what she has saved.
 *
 * Five plain answers, never one for another: saved (a draft, nobody sees
 * it), published (a release exists), publication pending (the website has
 * not been rebuilt with it yet), live on the website (the deployed site says
 * it carries it, checked, not assumed), publication failed (and what to do).
 */

export type CardMessage = { tone: "info" | "success" | "error"; title?: string; body: string };

const PHASE_COPY: Record<PublishPhase["kind"], { title: string; Icon: typeof CheckCircle; tone: string }> = {
  never: { title: "Showing the original words", Icon: Clock, tone: "text-muted" },
  live: { title: "Live on the website", Icon: CheckCircle, tone: "text-accent" },
  publishing: { title: "Publishing…", Icon: CircleNotch, tone: "text-accent" },
  waiting: { title: "Publication pending", Icon: Clock, tone: "text-accent" },
  failed: { title: "Publication failed", Icon: WarningCircle, tone: "text-danger" },
};

function phaseDetail(phase: PublishPhase): string {
  switch (phase.kind) {
    case "never":
      return "Nothing has been published from this dashboard yet. The website shows the words it launched with.";
    case "live":
      return `The website shows release ${phase.release}. It was last updated ${studioTime(phase.builtAt)}.`;
    case "publishing":
      return `The website is being updated with release ${phase.release}. This usually takes 2 to 5 minutes, and this card changes by itself when it is live. You can keep working.`;
    case "waiting":
      return phase.canAsk
        ? `Release ${phase.release} is published, but the website has not been updated with it yet.`
        : `Release ${phase.release} is published. Automatic updates are not switched on yet, so the website shows it after its next update. Your developer can switch them on (docs/content-manager.md, step 3).`;
    case "failed":
      return `${phase.reason} Your words are safe: they are published as release ${phase.release}, and the website still shows the version before it.`;
  }
}

export function PublishCard({
  phase,
  pending,
  unsaved,
  busy,
  message,
  onReview,
  onRetry,
}: {
  /** Null while the dashboard is still asking. */
  phase: PublishPhase | null;
  /** Sections with saved, unpublished changes. */
  pending: SectionKey[];
  /** Sections with unsaved changes. */
  unsaved: SectionKey[];
  busy: boolean;
  message: CardMessage | null;
  onReview: () => void;
  onRetry: () => void;
}) {
  const copy = phase ? PHASE_COPY[phase.kind] : null;
  const canRetry = phase?.kind === "failed" || (phase?.kind === "waiting" && phase.canAsk);

  return (
    <div className="rounded-3xl border border-line-strong bg-surface p-5">
      <p className="label text-muted">Website</p>

      <div aria-live="polite" className="mt-3">
        {phase && copy ? (
          <>
            <p className={`flex items-center gap-2 font-display text-lg leading-snug tracking-tight ${copy.tone}`}>
              <copy.Icon
                size={20}
                weight={phase.kind === "live" ? "fill" : "regular"}
                aria-hidden="true"
                className={phase.kind === "publishing" ? "animate-spin motion-reduce:animate-none" : ""}
              />
              {copy.title}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{phaseDetail(phase)}</p>
          </>
        ) : (
          <p className="inline-flex items-center gap-2 text-sm text-muted">
            <Spinner size={16} /> Checking the website…
          </p>
        )}
      </div>

      {canRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={busy}
          className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-accent underline decoration-accent/30 underline-offset-4 transition-colors hover:decoration-accent disabled:cursor-wait disabled:opacity-60"
        >
          <ArrowsClockwise size={16} weight="regular" aria-hidden="true" />
          {phase?.kind === "failed" ? "Try updating the website again" : "Update the website now"}
        </button>
      ) : null}

      <div className="mt-4 border-t border-line pt-4">
        {unsaved.length > 0 ? (
          <p className="text-sm leading-relaxed text-ink">
            <span className="font-medium">Unsaved changes</span> in {unsaved.map((key) => sectionSpec(key).title).join(", ")}. Save
            them before publishing.
          </p>
        ) : null}
        <p className={`text-sm leading-relaxed ${unsaved.length > 0 ? "mt-2" : ""} text-muted`}>
          {pending.length === 0
            ? "No saved changes are waiting to be published."
            : `${pending.length} ${pending.length === 1 ? "section has" : "sections have"} saved changes waiting to be published.`}
        </p>
        <button
          type="button"
          onClick={onReview}
          disabled={pending.length === 0 || busy}
          className={`${buttonStyles.primary} mt-4 w-full`}
        >
          Review &amp; publish
        </button>
      </div>

      {message ? (
        <div className="mt-4">
          <Notice tone={message.tone} title={message.title}>
            {message.body}
          </Notice>
        </div>
      ) : null}
    </div>
  );
}

/** A long value, cut to what fits in a review line. */
function clip(text: string, max = 280): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

export function ReviewDialog({
  open,
  changes,
  unsaved,
  busy,
  error,
  onPublish,
  onClose,
}: {
  open: boolean;
  /** Every section with a saved draft, and what it changes. */
  changes: { key: SectionKey; changes: Change[] }[];
  unsaved: SectionKey[];
  busy: boolean;
  error: string;
  onPublish: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const bodyId = useId();
  const cancelId = useId();
  const square = changes.flatMap(({ changes: list }) => list.filter((change) => change.square));
  const total = changes.reduce((sum, { changes: list }) => sum + list.length, 0);

  return (
    <AdminDialog open={open} onClose={busy ? () => undefined : onClose} titleId={titleId} descriptionId={bodyId} initialFocusId={cancelId}>
      <h2 id={titleId} className="font-display text-2xl leading-tight tracking-tight text-ink">
        Review and publish
      </h2>
      <p id={bodyId} className="mt-3 text-base leading-relaxed text-muted">
        {total === 0
          ? "Your saved changes match what is already published, so publishing changes nothing visitors see."
          : "These changes go on the website when you publish. The website takes a few minutes to update after that."}
      </p>

      {unsaved.length > 0 ? (
        <div className="mt-5">
          <Notice tone="error" title="You have unsaved changes.">
            Save or cancel your changes in {unsaved.map((key) => sectionSpec(key).title).join(", ")} first. Unsaved changes are
            never published.
          </Notice>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-6">
        {changes.map(({ key, changes: list }) => (
          <section key={key} aria-label={sectionSpec(key).title}>
            <h3 className="font-display text-lg tracking-tight text-ink">{sectionSpec(key).title}</h3>
            {list.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No visible change.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {list.map((change, index) => (
                  <li key={index} className="rounded-3xl border border-line bg-bg px-4 py-3">
                    <p className="text-sm font-medium text-ink">{change.label}</p>
                    <dl className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
                      <dt className="text-muted">Was</dt>
                      <dd className="whitespace-pre-line break-words text-muted line-through decoration-muted/50">
                        {change.before ? clip(change.before) : "(empty)"}
                      </dd>
                      <dt className="text-muted">Now</dt>
                      <dd className="whitespace-pre-line break-words text-ink">{change.after ? clip(change.after) : "(empty)"}</dd>
                    </dl>
                    {change.square ? (
                      <p className="mt-1.5 text-sm font-medium text-accent">Change this in Square Appointments too.</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {square.length > 0 ? (
        <div className="mt-6">
          <Notice tone="info" title="Update Square to match">
            Square Appointments takes the booking and shows its own names, prices and lengths. This dashboard does not change
            Square. After publishing, make the {square.length === 1 ? "change" : `${square.length} changes`} marked above in your
            Square dashboard, so clients see the same thing in both places.
          </Notice>
        </div>
      ) : null}

      {error ? (
        <div className="mt-5">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}

      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button id={cancelId} type="button" onClick={onClose} disabled={busy} className={buttonStyles.secondary}>
          Not yet
        </button>
        <button
          type="button"
          onClick={onPublish}
          disabled={busy || unsaved.length > 0 || changes.length === 0}
          className={buttonStyles.primary}
        >
          {busy ? (
            <>
              <Spinner size={16} /> Publishing…
            </>
          ) : (
            "Publish to the website"
          )}
        </button>
      </div>
    </AdminDialog>
  );
}
