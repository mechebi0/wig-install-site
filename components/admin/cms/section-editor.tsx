"use client";

import { useState, type ReactNode } from "react";
import { buttonStyles } from "@/components/button";
import { Notice, Spinner } from "@/components/ui/feedback";
import { ConfirmDialog, Field, type FieldContext } from "@/components/admin/cms/fields";
import type { SectionSpec } from "@/lib/cms/admin-schema";
import type { Item } from "@/lib/cms/editor";
import type { Places } from "@/lib/cms/model";
import type { Issues } from "@/lib/cms/validate";

/**
 * One section of the website's words, as a form: its groups of fields, and
 * the bar that saves them.
 *
 * ---------------------------------------------------------------------------
 * THREE STATES, SAID IN WORDS
 * ---------------------------------------------------------------------------
 *   On the website         nothing here differs from what is published
 *   Saved, not published   a draft is stored; visitors do not see it yet
 *   Unsaved changes        typed here, not stored anywhere yet
 *
 * Saving stores a draft and nothing more. Publishing (the Website card) is
 * what puts drafts on the website, so a save can never be mistaken for a
 * change visitors can see.
 */
export type SectionState = "published" | "draft" | "unsaved";

export type SectionMessage = {
  tone: "info" | "success" | "error";
  title?: string;
  body: ReactNode;
};

const STATE_LABELS: Record<SectionState, { text: string; style: string }> = {
  published: { text: "On the website", style: "border-line-strong bg-surface-2 text-muted" },
  draft: { text: "Saved, not published", style: "border-accent/30 bg-accent-soft text-accent" },
  unsaved: { text: "Unsaved changes", style: "border-transparent bg-accent text-on-accent" },
};

export function StateBadge({ state }: { state: SectionState }) {
  const { text, style } = STATE_LABELS[state];
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${style}`}>{text}</span>;
}

export function SectionEditor({
  spec,
  value,
  state,
  errors,
  warnings,
  places,
  busy,
  message,
  locked,
  onChange,
  onSave,
  onCancel,
  onDiscardDraft,
  children,
}: {
  spec: SectionSpec;
  value: Item;
  state: SectionState;
  errors: Issues;
  warnings: Issues;
  places: Places;
  /** A save or discard is in flight. */
  busy: boolean;
  message: SectionMessage | null;
  /** Nothing can be saved (the database is not set up): fields are shown, read only. */
  locked: boolean;
  onChange: (next: Item) => void;
  onSave: () => void;
  onCancel: () => void;
  onDiscardDraft: () => void;
  /** Anything shown under the fields, such as the location preview. */
  children?: ReactNode;
}) {
  const [confirming, setConfirming] = useState<"cancel" | "discard" | null>(null);
  const ctx: FieldContext = {
    section: spec.key,
    errors,
    warnings,
    places,
    sectionValue: value,
    disabled: busy || locked,
  };
  const errorCount = Object.keys(errors).length;

  return (
    <section aria-labelledby={`${spec.key}-heading`} className="flex flex-col gap-6">
      <div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 id={`${spec.key}-heading`} className="font-display text-2xl tracking-tight text-ink lg:text-3xl">
            {spec.title}
          </h2>
          <StateBadge state={state} />
        </div>
        <p className="mt-2 max-w-[66ch] text-base leading-relaxed text-muted">{spec.intro}</p>
      </div>

      {errorCount > 0 ? (
        <Notice tone="error" title={errorCount === 1 ? "One field needs attention." : `${errorCount} fields need attention.`}>
          Nothing was saved. The fields are marked below.
        </Notice>
      ) : null}

      {spec.groups.map((group) => (
        <div key={group.title} className="rounded-3xl border border-line-strong bg-surface p-5 sm:p-7">
          <h3 className="font-display text-xl tracking-tight text-ink">{group.title}</h3>
          {group.help ? <p className="mt-1.5 max-w-[66ch] text-sm leading-relaxed text-muted">{group.help}</p> : null}
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {group.fields.map((field) => (
              <Field
                key={field.key}
                field={field}
                value={value[field.key]}
                onChange={(next) => onChange({ ...value, [field.key]: next })}
                path={field.key}
                ctx={ctx}
              />
            ))}
          </div>
        </div>
      ))}

      {children}

      {/*
        The bar that saves, at the foot of the section and stuck to the
        bottom of the screen while there is anything to save, so Save is in
        reach from the middle of a long form on a phone.
      */}
      <div
        className={`z-[5] -mx-1 rounded-3xl border bg-surface/95 px-4 py-3 backdrop-blur-md sm:px-5 ${
          state === "unsaved" ? "sticky bottom-3 border-accent/40 shadow-lifted" : "border-line"
        }`}
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        {message ? (
          <div className="mb-3">
            <Notice tone={message.tone} title={message.title}>
              {message.body}
            </Notice>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted" aria-live="polite">
            {busy ? (
              <span className="inline-flex items-center gap-2 text-accent">
                <Spinner size={16} /> Saving…
              </span>
            ) : locked ? (
              "Saving is switched off until the one-time setup is done."
            ) : state === "unsaved" ? (
              "You have unsaved changes in this section."
            ) : state === "draft" ? (
              "Saved. Visitors see it once you publish."
            ) : (
              "Everything here is on the website."
            )}
          </p>

          {state === "unsaved" ? (
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button
                type="button"
                className={buttonStyles.secondary}
                disabled={busy}
                onClick={() => setConfirming("cancel")}
              >
                Cancel
              </button>
              <button type="button" className={buttonStyles.primary} disabled={busy || locked} onClick={onSave}>
                Save changes
              </button>
            </div>
          ) : state === "draft" ? (
            <button
              type="button"
              className={buttonStyles.secondary}
              disabled={busy || locked}
              onClick={() => setConfirming("discard")}
            >
              Undo saved changes
            </button>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={confirming === "cancel"}
        title="Throw away your unsaved changes?"
        body={`Everything you typed in ${spec.title} since you last saved goes back to how it was.`}
        confirmLabel="Throw them away"
        cancelLabel="Keep editing"
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          setConfirming(null);
          onCancel();
        }}
      />
      <ConfirmDialog
        open={confirming === "discard"}
        title="Undo your saved changes?"
        body={`${spec.title} goes back to exactly what is on the website now. Your saved, unpublished changes to it are deleted.`}
        confirmLabel="Undo saved changes"
        cancelLabel="Keep them"
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          setConfirming(null);
          onDiscardDraft();
        }}
      />
    </section>
  );
}
