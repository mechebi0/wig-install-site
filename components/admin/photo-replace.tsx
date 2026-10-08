"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, ImageSquare } from "@phosphor-icons/react/dist/ssr";
import { buttonStyles } from "@/components/button";
import { AdminDialog } from "@/components/admin/admin-dialog";
import { Notice, Spinner } from "@/components/ui/feedback";
import { TextAreaField, TextField, focusFirstError } from "@/components/ui/form";
import {
  PhotoProblem,
  checkFile,
  preparePhoto,
  type PreparedPhoto,
} from "@/lib/photo-processing";
import {
  MAX_ALT,
  MAX_TITLE,
  MIN_ALT,
  replacePhoto,
  type AdminPhoto,
} from "@/lib/photo-admin";

/**
 * Replace: a new picture in an existing photograph's place.
 *
 * Choose, compare, confirm. The new file is prepared the moment it is picked
 * (lib/photo-processing), so the "New" preview is the exact file that will be
 * uploaded, and nothing is sent until Nat presses Replace photo. Everything
 * else about the photograph stays: its collections, tags, order, whether it
 * is shown, and every place on the site it fills, which the dialog lists so
 * she knows where the change will appear.
 *
 * The title and description come pre-filled and are saved with the new
 * picture, because a description written for the old one may not fit it.
 * Left alone, they are kept exactly as they were.
 *
 * Safe by construction (replacePhoto in lib/photo-admin.ts): the current
 * photograph is not touched until the new one is uploaded and loads from the
 * website, so a failure at any point leaves it exactly as it was.
 */
export function ReplacePhotoDialog({
  photo,
  places,
  deployed,
  onClose,
  onReplaced,
}: {
  photo: AdminPhoto | null;
  /** Where it appears, in words, so Nat knows where the new picture will show. */
  places: string[];
  deployed: ReadonlySet<string>;
  onClose: () => void;
  onReplaced: (photo: AdminPhoto, oldFilesRemoved: boolean) => void;
}) {
  const baseId = useId();
  const [busy, setBusy] = useState(false);

  return (
    <AdminDialog
      open={photo !== null}
      onClose={() => {
        if (!busy) onClose();
      }}
      titleId={`${baseId}-heading`}
      descriptionId={`${baseId}-body`}
      initialFocusId={`${baseId}-choose`}
    >
      {photo ? (
        // Keyed, so opening it for a different photograph starts afresh.
        <ReplaceForm
          key={photo.id}
          baseId={baseId}
          photo={photo}
          places={places}
          deployed={deployed}
          busy={busy}
          setBusy={setBusy}
          onCancel={onClose}
          onReplaced={onReplaced}
        />
      ) : null}
    </AdminDialog>
  );
}

type Pick =
  | { status: "empty" }
  | { status: "preparing"; name: string }
  | { status: "ready"; name: string; prepared: PreparedPhoto; preview: string }
  | { status: "invalid"; name: string; problem: string };

function ReplaceForm({
  baseId,
  photo,
  places,
  deployed,
  busy,
  setBusy,
  onCancel,
  onReplaced,
}: {
  baseId: string;
  photo: AdminPhoto;
  places: string[];
  deployed: ReadonlySet<string>;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  onCancel: () => void;
  onReplaced: (photo: AdminPhoto, oldFilesRemoved: boolean) => void;
}) {
  const inputId = `${baseId}-choose`;
  const [pick, setPick] = useState<Pick>({ status: "empty" });
  const [title, setTitle] = useState(photo.title);
  const [alt, setAlt] = useState(photo.alt);
  const [altError, setAltError] = useState("");
  const [formError, setFormError] = useState("");
  /** The pick the latest choice belongs to, so a slow earlier one is dropped. */
  const latest = useRef(0);
  const preview = pick.status === "ready" ? pick.preview : "";

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  async function choose(file: File | undefined) {
    if (!file) return;
    setFormError("");
    const problem = checkFile(file);
    if (problem) {
      setPick({ status: "invalid", name: file.name, problem });
      return;
    }
    const ticket = ++latest.current;
    setPick({ status: "preparing", name: file.name });
    try {
      const prepared = await preparePhoto(file);
      if (ticket !== latest.current) return;
      setPick({
        status: "ready",
        name: file.name,
        prepared,
        preview: URL.createObjectURL(prepared.small),
      });
    } catch (error) {
      if (ticket !== latest.current) return;
      setPick({
        status: "invalid",
        name: file.name,
        problem:
          error instanceof PhotoProblem
            ? error.message
            : "This photo could not be prepared. Try again, or try another photo.",
      });
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (pick.status !== "ready") {
      setFormError("Choose the new photo first.");
      return;
    }
    if (alt.trim().length < MIN_ALT) {
      const message = `Describe the photo in a few words (at least ${MIN_ALT} characters).`;
      setAltError(message);
      focusFirstError({ [`${baseId}-alt`]: message });
      return;
    }

    setBusy(true);
    const result = await replacePhoto(photo, pick.prepared, { title, alt }, deployed);
    setBusy(false);
    if (!result.photo) {
      setFormError(result.error);
      return;
    }
    onReplaced(result.photo, result.oldFilesRemoved);
  }

  const name = photo.title || "this photo";

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div>
        <h2
          id={`${baseId}-heading`}
          className="font-display text-2xl leading-tight tracking-tight text-ink"
        >
          Replace photo
        </h2>
        <p id={`${baseId}-body`} className="mt-2 text-base leading-relaxed text-muted">
          The new photo takes the place of {photo.title ? <>&ldquo;{name}&rdquo;</> : name}{" "}
          everywhere it appears. Its collections, tags and place in the order
          stay as they are.
        </p>
        {places.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-1 text-sm text-ink">
            {places.map((place) => (
              <li key={place} className="flex gap-2">
                <span aria-hidden="true" className="text-accent">
                  &middot;
                </span>
                {place}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Now and New, side by side, the same crop as a gallery cell. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-4">
        <figure>
          <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-surface-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.image.small}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          <figcaption className="label mt-2 text-muted">Now</figcaption>
        </figure>
        <ArrowRight size={20} weight="light" aria-hidden="true" className="text-muted" />
        <figure>
          <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border-2 border-dashed border-line-strong bg-surface/60">
            {pick.status === "ready" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pick.preview}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-accent">
                {pick.status === "preparing" ? (
                  <Spinner size={22} label="Preparing the new photo" />
                ) : (
                  <ImageSquare size={30} weight="light" aria-hidden="true" />
                )}
              </span>
            )}
          </div>
          <figcaption className="label mt-2 text-accent">New</figcaption>
        </figure>
      </div>

      <div className="flex flex-col items-start gap-2">
        {/* Same pattern as Add photos: a hidden input with its label styled as
            the button, keeping the input in the tab order. */}
        <input
          id={inputId}
          type="file"
          accept="image/*"
          disabled={busy}
          onChange={(event) => {
            void choose(event.target.files?.[0]);
            event.target.value = "";
          }}
          className="peer sr-only"
        />
        <label
          htmlFor={inputId}
          className={`${buttonStyles.secondary} peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent peer-disabled:pointer-events-none peer-disabled:opacity-55`}
        >
          {pick.status === "empty" ? "Choose the new photo" : "Choose a different photo"}
        </label>
        {pick.status === "invalid" ? (
          <p role="alert" className="text-sm text-danger">
            {pick.problem}
          </p>
        ) : null}
        {pick.status === "ready" ? (
          <p className="truncate text-xs text-muted" title={pick.name}>
            {pick.name}
          </p>
        ) : null}
      </div>

      <TextField
        id={`${baseId}-title`}
        label="Title (optional)"
        value={title}
        maxLength={MAX_TITLE}
        disabled={busy}
        onChange={(event) => setTitle(event.target.value)}
      />
      <TextAreaField
        id={`${baseId}-alt`}
        label="Description for screen readers"
        rows={3}
        required
        value={alt}
        maxLength={MAX_ALT}
        disabled={busy}
        error={altError}
        onChange={(event) => {
          setAlt(event.target.value);
          setAltError("");
        }}
        help="Kept from the current photo. Check it still describes the new one."
      />

      {formError ? <Notice tone="error">{formError}</Notice> : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={busy} className={buttonStyles.secondary}>
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy || pick.status !== "ready"}
          className={buttonStyles.primary}
        >
          {busy ? (
            <>
              <Spinner size={17} />
              Replacing
            </>
          ) : (
            "Replace photo"
          )}
        </button>
      </div>
    </form>
  );
}
