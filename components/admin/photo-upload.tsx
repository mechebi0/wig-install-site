"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { DragEvent, FormEvent } from "react";
import { ImageSquare, X } from "@phosphor-icons/react/dist/ssr";
import { buttonStyles } from "@/components/button";
import { Notice, Spinner } from "@/components/ui/feedback";
import { TextAreaField, TextField, focusFirstError } from "@/components/ui/form";
import {
  CollectionsField,
  InstallTypeField,
  PublishField,
} from "@/components/admin/photo-fields";
import {
  MAX_BATCH,
  PhotoProblem,
  checkFile,
  preparePhoto,
  type PreparedPhoto,
} from "@/lib/photo-processing";
import {
  MAX_ALT,
  MAX_TITLE,
  MIN_ALT,
  uploadPhoto,
  type AdminPhoto,
} from "@/lib/photo-admin";
import type { InstallTypeId } from "@/lib/taxonomy";

/**
 * "Add photos": pick, preview, describe, upload.
 *
 * ---------------------------------------------------------------------------
 * SHAPED FOR A PHONE
 * ---------------------------------------------------------------------------
 * Nat is most likely doing this from her phone straight after an appointment,
 * so the whole block is one column of large targets, and "Add photos" opens
 * the phone's own photo picker (accept="image/*", which is also what makes
 * iOS hand over a JPEG rather than a HEIC). Dragging files in works on a
 * computer as a bonus, never as the only way.
 *
 * Each photograph is resized the moment it is picked (lib/photo-processing),
 * so the preview is the real file that will be uploaded and a photo that
 * cannot be used says so before anything is sent.
 *
 * Where the photographs go - collections, install type, shown or hidden, and
 * whether they join the start or the end of each gallery - is chosen once for
 * the whole batch, because a batch from one appointment is usually one look.
 * The title and the description are per photograph, and any one can be
 * changed afterwards from the list below.
 */

type Status = "preparing" | "ready" | "invalid" | "uploading" | "done" | "failed";

type Draft = {
  key: string;
  name: string;
  status: Status;
  prepared: PreparedPhoto | null;
  preview: string;
  title: string;
  alt: string;
  /** Why the file cannot be used, or why its upload failed. */
  problem: string;
  altError: string;
};

const STATUS_TEXT: Record<Status, string> = {
  preparing: "Preparing",
  ready: "Ready",
  invalid: "Cannot be used",
  uploading: "Uploading",
  done: "Uploaded",
  failed: "Not uploaded",
};

let draftCounter = 0;

export function PhotoUpload({
  orders,
  onUploaded,
}: {
  /** The current first and last display_order, so a batch can go either side. */
  orders: { first: number; last: number };
  onUploaded: (photos: AdminPhoto[]) => void;
}) {
  const baseId = useId();
  const inputId = `${baseId}-input`;
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [collections, setCollections] = useState<string[]>([]);
  const [collectionsError, setCollectionsError] = useState("");
  const [installType, setInstallType] = useState<InstallTypeId | null>(null);
  const [published, setPublished] = useState(true);
  const [position, setPosition] = useState<"end" | "start">("end");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [dragging, setDragging] = useState(false);
  const [summary, setSummary] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);

  /*
    Files waiting to be prepared, one at a time: a phone decoding six 12MP
    photographs at once runs out of memory. `alive` tracks which drafts still
    exist, so a photo removed while it was being prepared is thrown away
    rather than resurrected, and `previews` lets every object URL be released.
  */
  const queue = useRef<{ key: string; file: File }[]>([]);
  const working = useRef(false);
  const alive = useRef(new Set<string>());
  const previews = useRef(new Map<string, string>());

  useEffect(() => {
    const urls = previews.current;
    return () => {
      for (const url of urls.values()) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  const patch = (key: string, change: Partial<Draft>) =>
    setDrafts((current) =>
      current.map((draft) => (draft.key === key ? { ...draft, ...change } : draft)),
    );

  async function pump() {
    if (working.current) return;
    working.current = true;
    while (queue.current.length > 0) {
      const next = queue.current.shift()!;
      if (!alive.current.has(next.key)) continue;
      try {
        const prepared = await preparePhoto(next.file);
        if (!alive.current.has(next.key)) continue;
        const preview = URL.createObjectURL(prepared.small);
        previews.current.set(next.key, preview);
        patch(next.key, { status: "ready", prepared, preview });
      } catch (error) {
        patch(next.key, {
          status: "invalid",
          problem:
            error instanceof PhotoProblem
              ? error.message
              : "This photo could not be prepared. Try again, or try another photo.",
        });
      }
    }
    working.current = false;
  }

  function addFiles(files: File[]) {
    if (files.length === 0) return;
    setSummary(null);

    const room = Math.max(0, MAX_BATCH - drafts.length);
    const taken = files.slice(0, room);
    if (taken.length < files.length) {
      setSummary({
        tone: "info",
        text: `Up to ${MAX_BATCH} photos at a time. ${taken.length === 0 ? "Upload these first, then add more." : `The first ${taken.length} were added.`}`,
      });
    }

    const fresh: Draft[] = taken.map((file) => {
      const problem = checkFile(file);
      draftCounter += 1;
      const key = `draft-${draftCounter}`;
      alive.current.add(key);
      if (!problem) queue.current.push({ key, file });
      return {
        key,
        name: file.name,
        status: problem ? "invalid" : "preparing",
        prepared: null,
        preview: "",
        title: "",
        alt: "",
        problem: problem ?? "",
        altError: "",
      };
    });

    setDrafts((current) => [...current, ...fresh]);
    void pump();
  }

  function removeDraft(key: string) {
    alive.current.delete(key);
    const url = previews.current.get(key);
    if (url) {
      URL.revokeObjectURL(url);
      previews.current.delete(key);
    }
    setDrafts((current) => current.filter((draft) => draft.key !== key));
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (busy) return;
    addFiles(Array.from(event.dataTransfer.files));
  }

  const uploadable = drafts.filter(
    (draft) => draft.prepared && (draft.status === "ready" || draft.status === "failed"),
  );
  const preparing = drafts.some((draft) => draft.status === "preparing");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSummary(null);

    const errors: Record<string, string> = {};
    const nextCollectionsError =
      collections.length === 0
        ? "Choose at least one collection, so the photo has somewhere to appear."
        : "";
    if (nextCollectionsError) errors[`${baseId}-collections`] = nextCollectionsError;
    setCollectionsError(nextCollectionsError);

    const altErrors = new Map<string, string>();
    for (const draft of uploadable) {
      const alt = draft.alt.trim();
      const message =
        alt.length < MIN_ALT
          ? `Describe the photo in a few words (at least ${MIN_ALT} characters).`
          : "";
      altErrors.set(draft.key, message);
      if (message) errors[`${draft.key}-alt`] = message;
    }
    setDrafts((current) =>
      current.map((draft) =>
        altErrors.has(draft.key) ? { ...draft, altError: altErrors.get(draft.key) ?? "" } : draft,
      ),
    );

    if (Object.keys(errors).length > 0) {
      focusFirstError(errors);
      return;
    }

    setBusy(true);
    setProgress({ done: 0, total: uploadable.length });

    /*
      The batch keeps the order the photos were picked in, at the end of
      every gallery (where it moves nothing already on the page) or at the
      start, as Nat chose.
    */
    let order = position === "end" ? orders.last + 1 : orders.first - uploadable.length;
    const finished: AdminPhoto[] = [];
    const finishedKeys: string[] = [];

    for (const draft of uploadable) {
      patch(draft.key, { status: "uploading", problem: "" });
      const { photo, error } = await uploadPhoto(
        draft.prepared!,
        {
          title: draft.title,
          alt: draft.alt,
          collections,
          installType,
          published,
          featured: false,
          laceDetails: [],
        },
        order,
      );
      order += 1;
      if (photo) {
        finished.push(photo);
        finishedKeys.push(draft.key);
        patch(draft.key, { status: "done" });
      } else {
        patch(draft.key, { status: "failed", problem: error });
      }
      setProgress((current) => ({ ...current, done: current.done + 1 }));
    }

    setBusy(false);
    if (finished.length > 0) onUploaded(finished);

    // What uploaded leaves the list; what failed stays, with its reason, to retry.
    for (const key of finishedKeys) removeDraft(key);

    const failed = uploadable.length - finished.length;
    const count = (n: number) => `${n} photo${n === 1 ? "" : "s"}`;
    if (failed === 0) {
      setSummary({
        tone: "success",
        text: published
          ? `${count(finished.length)} uploaded and showing on the website now.`
          : `${count(finished.length)} uploaded and kept hidden. Show them from the list below when you are ready.`,
      });
    } else if (finished.length > 0) {
      setSummary({
        tone: "error",
        text: `${count(finished.length)} uploaded, ${count(failed)} not. The ones that did not are still below with the reason; try them again.`,
      });
    } else {
      setSummary({
        tone: "error",
        text: "None of the photos were uploaded. The reason is under each one.",
      });
    }
  }

  return (
    <section aria-labelledby={`${baseId}-heading`} className="flex flex-col gap-6">
      {/* ------------------------------------------------------ the picker --- */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-start gap-5 rounded-3xl border-2 border-dashed px-6 py-7 transition-colors duration-200 sm:flex-row sm:items-center sm:justify-between sm:px-8 ${
          dragging ? "border-accent bg-accent-soft" : "border-line-strong bg-surface/60"
        }`}
      >
        <div className="flex items-start gap-4">
          <ImageSquare size={32} weight="light" aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
          <div>
            <h3
              id={`${baseId}-heading`}
              className="font-display text-xl tracking-tight text-ink"
            >
              Add photos
            </h3>
            <p className="mt-1.5 max-w-[52ch] text-sm leading-relaxed text-muted">
              JPEG, PNG, WebP or HEIC, up to {MAX_BATCH} at a time. Big photos
              are resized for the web automatically. Tall (portrait) photos fit
              the gallery best.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          {/*
            The input is visually hidden but stays in the tab order, and the
            label is styled as the button. peer-focus-visible draws the site's
            focus ring on the label, since the input itself has no visible box.
          */}
          <input
            id={inputId}
            type="file"
            accept="image/*"
            multiple
            disabled={busy || drafts.length >= MAX_BATCH}
            onChange={(event) => {
              addFiles(Array.from(event.target.files ?? []));
              // Lets the same file be picked again after it was removed.
              event.target.value = "";
            }}
            className="peer sr-only"
          />
          <label
            htmlFor={inputId}
            className={`${buttonStyles.primary} peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent peer-disabled:pointer-events-none peer-disabled:opacity-55`}
          >
            Add photos
          </label>
          <p className="hidden text-xs text-muted lg:block">or drag them here</p>
        </div>
      </div>

      {summary ? (
        <Notice tone={summary.tone}>{summary.text}</Notice>
      ) : null}

      {/* ------------------------------------------------- the batch form --- */}
      {drafts.length > 0 ? (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8">
          <ul className="flex flex-col gap-4">
            {drafts.map((draft) => (
              /*
                Two rows on a phone: the picture beside its file name and
                status, then the title and description at the card's full
                width. Beside a picture, a 320px card left the fields about
                110px and wrapped their help text a word or two a line. From
                `sm` the picture spans both rows and the fields sit beside
                it, as before.
              */
              <li
                key={draft.key}
                className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 rounded-3xl border border-line bg-surface p-4 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-x-6 sm:p-5"
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-surface-3 sm:row-span-2">
                  {draft.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={draft.preview}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-muted">
                      {draft.status === "preparing" ? <Spinner size={20} label="Preparing" /> : null}
                    </span>
                  )}
                </div>

                <div className="flex min-w-0 flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink" title={draft.name}>
                        {draft.name}
                      </p>
                      <p
                        className={`mt-1 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] ${
                          draft.status === "invalid" || draft.status === "failed"
                            ? "text-danger"
                            : draft.status === "done"
                              ? "text-accent"
                              : "text-muted"
                        }`}
                      >
                        {draft.status === "uploading" ? <Spinner size={14} /> : null}
                        {STATUS_TEXT[draft.status]}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDraft(draft.key)}
                      disabled={busy}
                      aria-label={`Remove ${draft.name} from this upload`}
                      className="tap -mr-2 -mt-2 inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <X size={18} weight="regular" aria-hidden="true" />
                    </button>
                  </div>

                  {draft.problem ? (
                    <p role="alert" className="text-sm text-danger">
                      {draft.problem}
                    </p>
                  ) : null}
                </div>

                {draft.prepared ? (
                  <div className="col-span-2 flex min-w-0 flex-col gap-4 sm:col-span-1 sm:col-start-2">
                    <TextField
                      id={`${draft.key}-title`}
                      label="Title (optional)"
                      value={draft.title}
                      maxLength={MAX_TITLE}
                      disabled={busy}
                      onChange={(event) => patch(draft.key, { title: event.target.value })}
                      help="Shown over the photo in the gallery. For example: Soft Body Wave."
                    />
                    <TextAreaField
                      id={`${draft.key}-alt`}
                      label="Description for screen readers"
                      rows={2}
                      required
                      value={draft.alt}
                      maxLength={MAX_ALT}
                      disabled={busy}
                      error={draft.altError}
                      onChange={(event) =>
                        patch(draft.key, { alt: event.target.value, altError: "" })
                      }
                      help="What the hair looks like, for visitors who cannot see the photo. For example: A long body-wave install with a side part and laid edges."
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          {/* Where they go: once for the whole batch. */}
          <div className="flex flex-col gap-6 rounded-3xl border border-line bg-surface p-5 sm:p-7">
            <CollectionsField
              id={`${baseId}-collections`}
              value={collections}
              onChange={(next) => {
                setCollections(next);
                if (next.length > 0) setCollectionsError("");
              }}
              error={collectionsError}
              disabled={busy}
            />
            <InstallTypeField
              id={`${baseId}-install`}
              value={installType}
              onChange={setInstallType}
              disabled={busy}
            />
            <fieldset>
              <legend className="text-sm font-medium text-ink">Where they go in each gallery</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {(
                  [
                    ["end", "After the photos already there"],
                    ["start", "Before them, first in line"],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className={`inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-full border px-4 text-sm transition-colors duration-200 ${
                      position === value
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-line-strong bg-bg text-ink hover:border-accent"
                    } ${busy ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <input
                      type="radio"
                      name={`${baseId}-position`}
                      value={value}
                      checked={position === value}
                      disabled={busy}
                      onChange={() => setPosition(value)}
                      className="h-4 w-4 shrink-0 cursor-pointer accent-accent"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <PublishField
              id={`${baseId}-publish`}
              checked={published}
              onChange={setPublished}
              disabled={busy}
            />
          </div>

          {busy ? (
            <div role="status" aria-live="polite" className="flex flex-col gap-3">
              <p className="text-sm text-ink">
                Uploading {Math.min(progress.done + 1, progress.total)} of {progress.total}. Keep this page open.
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-300 motion-reduce:transition-none"
                  style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={busy || preparing || uploadable.length === 0}
              className={`${buttonStyles.primary} w-full sm:w-auto`}
            >
              {busy ? (
                <>
                  <Spinner size={17} />
                  Uploading
                </>
              ) : preparing ? (
                <>
                  <Spinner size={17} />
                  Preparing photos
                </>
              ) : (
                `Upload ${uploadable.length} photo${uploadable.length === 1 ? "" : "s"}`
              )}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                for (const draft of drafts) removeDraft(draft.key);
                setSummary(null);
                setCollectionsError("");
              }}
              className={`${buttonStyles.secondary} w-full sm:w-auto`}
            >
              Clear
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
