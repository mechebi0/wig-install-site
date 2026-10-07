"use client";

import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowDown, ArrowUp, PencilSimple, Trash } from "@phosphor-icons/react/dist/ssr";
import { buttonStyles } from "@/components/button";
import { AdminDialog } from "@/components/admin/admin-dialog";
import {
  CollectionsField,
  InstallTypeField,
  PublishField,
  collectionTitle,
  installTypeLabel,
} from "@/components/admin/photo-fields";
import { EmptyState, LoadingPanel, Notice, Spinner } from "@/components/ui/feedback";
import { TextAreaField, TextField, focusFirstError } from "@/components/ui/form";
import {
  MAX_ALT,
  MAX_TITLE,
  MIN_ALT,
  deletePhoto,
  reorderPhotos,
  updatePhoto,
  type AdminPhoto,
  type PhotoDetails,
} from "@/lib/photo-admin";

/**
 * "Your photos": every photograph Nat has uploaded, shown or hidden, in the
 * order the gallery shows them.
 *
 * Each card says the three things that decide where a photograph appears
 * (collections, install type, shown or hidden) in words, so nothing depends
 * on reading a colour or an icon. Moving a photograph earlier or later saves
 * at once; there is no separate "save order" step to forget.
 *
 * Removing always goes through a confirmation, whose default button is
 * Cancel. A removed photograph is gone from the website and from Storage, and
 * there is no undo, so the dialog says what will happen in plain words.
 */

type Flash = { tone: "success" | "error"; text: string } | null;

/*
  The site's danger red with the primary button's shape and contrast. The
  pair is #a71123 behind #fff7fa, 7.3:1. Written out rather than layered on
  buttonStyles.primary, because two background utilities on one element are
  resolved by stylesheet order, not by the order of the class names.
*/
const dangerButton =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full bg-danger px-7 py-3.5 text-sm font-medium text-on-accent shadow-soft transition-[background-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[#8e0e1e] hover:shadow-lifted active:translate-y-px active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55";

export function PhotoLibrary({
  photos,
  status,
  loadError,
  onRetry,
  onChange,
}: {
  photos: AdminPhoto[];
  status: "loading" | "ready" | "error";
  loadError: string;
  onRetry: () => void;
  onChange: (next: AdminPhoto[]) => void;
}) {
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  /** Set when a removal succeeds; read once the dialog has closed. */
  const focusHeadingNext = useRef(false);
  const [flash, setFlash] = useState<Flash>(null);
  const [editing, setEditing] = useState<AdminPhoto | null>(null);
  const [removing, setRemoving] = useState<AdminPhoto | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  async function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= photos.length) return;

    const previous = photos;
    const next = [...photos];
    [next[index], next[target]] = [next[target], next[index]];
    const renumbered = next.map((photo, position) => ({ ...photo, order: position + 1 }));

    setFlash(null);
    setMovingId(photos[index].id);
    onChange(renumbered);

    const { error } = await reorderPhotos(renumbered.map((photo) => photo.id));
    setMovingId(null);
    if (error) {
      onChange(previous);
      setFlash({ tone: "error", text: error });
    }
  }

  const shownCount = photos.filter((photo) => photo.published).length;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-8">
      <div>
        {/* Focusable from script only: where focus goes after a removal, since
            the button that opened the dialog no longer exists. */}
        <h2
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-2xl tracking-tight text-ink lg:text-3xl"
        >
          Your photos
        </h2>
        <p className="mt-2 max-w-[62ch] text-base leading-relaxed text-muted">
          {status === "ready" && photos.length > 0
            ? `${photos.length} uploaded, ${shownCount} showing on the website. They appear in this order, after the photos built into each gallery.`
            : "Everything you upload appears here, shown or hidden."}
        </p>
      </div>

      {flash ? <Notice tone={flash.tone}>{flash.text}</Notice> : null}

      {status === "loading" ? <LoadingPanel label="Loading your photos" /> : null}

      {status === "error" ? (
        <div className="flex flex-col items-start gap-4">
          <Notice tone="error" title="Your photos could not be loaded.">
            {loadError}
          </Notice>
          <button type="button" onClick={onRetry} className={buttonStyles.secondary}>
            Try again
          </button>
        </div>
      ) : null}

      {status === "ready" && photos.length === 0 ? (
        <EmptyState
          title="No uploaded photos yet"
          body="Photos you add above will be listed here, where you can edit, reorder, hide or remove them."
        />
      ) : null}

      {status === "ready" && photos.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {photos.map((photo, index) => {
            const name = photo.title || "this photo";
            return (
              <li
                key={photo.id}
                className="flex gap-4 rounded-3xl border border-line bg-surface p-3 sm:flex-col sm:gap-0 sm:p-0"
              >
                <div className="relative aspect-[3/4] w-28 shrink-0 overflow-hidden rounded-2xl bg-surface-3 sm:w-full sm:rounded-b-none sm:rounded-t-3xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.photo.small}
                    alt={photo.alt}
                    width={photo.photo.width}
                    height={photo.photo.height}
                    loading="lazy"
                    decoding="async"
                    className={`absolute inset-0 h-full w-full object-cover ${photo.published ? "" : "opacity-60"}`}
                  />
                  {photo.published ? null : (
                    <span className="absolute left-2 top-2 rounded-full bg-ink/80 px-2.5 py-1 text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-on-accent">
                      Hidden
                    </span>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-2 py-1 pr-1 sm:p-5 sm:pt-4">
                  <p className="font-display text-lg leading-tight tracking-tight text-ink">
                    {photo.title || <span className="text-muted">Untitled</span>}
                  </p>
                  <p className="text-sm leading-snug text-muted">
                    {photo.collections.length > 0
                      ? photo.collections.map(collectionTitle).join(", ")
                      : "In no collection"}
                  </p>
                  {photo.installType ? (
                    <p className="text-[0.6875rem] font-medium uppercase leading-none tracking-[0.14em] text-accent">
                      {installTypeLabel(photo.installType)}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted">
                    {photo.published ? "Showing on the website" : "Hidden from the website"}
                  </p>

                  <div className="mt-auto flex flex-wrap items-center gap-1 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFlash(null);
                        setEditing(photo);
                      }}
                      className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink transition-colors hover:bg-surface-2 hover:text-accent"
                    >
                      <PencilSimple size={16} weight="regular" aria-hidden="true" />
                      Edit
                      <span className="sr-only"> {name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void move(index, -1)}
                      disabled={index === 0 || movingId !== null}
                      aria-label={`Move ${name} earlier`}
                      className="tap inline-flex cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-accent disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <ArrowUp size={17} weight="regular" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void move(index, 1)}
                      disabled={index === photos.length - 1 || movingId !== null}
                      aria-label={`Move ${name} later`}
                      className="tap inline-flex cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-accent disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <ArrowDown size={17} weight="regular" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFlash(null);
                        setRemoving(photo);
                      }}
                      className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-medium text-danger transition-colors hover:bg-danger/5"
                    >
                      <Trash size={16} weight="regular" aria-hidden="true" />
                      Remove
                      <span className="sr-only"> {name}</span>
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      <EditPhotoDialog
        photo={editing}
        onClose={() => setEditing(null)}
        onSaved={(saved) => {
          onChange(photos.map((photo) => (photo.id === saved.id ? saved : photo)));
          setEditing(null);
          setFlash({ tone: "success", text: "Saved. The website shows the change straight away." });
        }}
      />

      <RemovePhotoDialog
        photo={removing}
        onClose={() => setRemoving(null)}
        afterClose={() => {
          if (!focusHeadingNext.current) return;
          focusHeadingNext.current = false;
          headingRef.current?.focus();
        }}
        onRemoved={(removed, filesRemoved) => {
          focusHeadingNext.current = true;
          onChange(photos.filter((photo) => photo.id !== removed.id));
          setRemoving(null);
          setFlash({
            tone: "success",
            text: filesRemoved
              ? "Photo removed from the website."
              : "Photo removed from the website. Its file could not be deleted just now; it will be tidied up automatically.",
          });
        }}
      />
    </section>
  );
}

// ------------------------------------------------------------------- edit ---

function EditPhotoDialog({
  photo,
  onClose,
  onSaved,
}: {
  photo: AdminPhoto | null;
  onClose: () => void;
  onSaved: (photo: AdminPhoto) => void;
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
      initialFocusId={`${baseId}-title`}
    >
      {photo ? (
        // Keyed, so opening a different photograph starts from its own values.
        <EditPhotoForm
          key={photo.id}
          baseId={baseId}
          photo={photo}
          busy={busy}
          setBusy={setBusy}
          onCancel={onClose}
          onSaved={onSaved}
        />
      ) : null}
    </AdminDialog>
  );
}

function EditPhotoForm({
  baseId,
  photo,
  busy,
  setBusy,
  onCancel,
  onSaved,
}: {
  baseId: string;
  photo: AdminPhoto;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  onCancel: () => void;
  onSaved: (photo: AdminPhoto) => void;
}) {
  const [details, setDetails] = useState<PhotoDetails>(() => ({
    title: photo.title,
    alt: photo.alt,
    collections: photo.collections,
    installType: photo.installType,
    published: photo.published,
  }));
  const [errors, setErrors] = useState<{ alt?: string; collections?: string }>({});
  const [formError, setFormError] = useState("");

  const set = <K extends keyof PhotoDetails>(key: K, value: PhotoDetails[K]) =>
    setDetails((current) => ({ ...current, [key]: value }));

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const found: { alt?: string; collections?: string } = {};
    if (details.alt.trim().length < MIN_ALT) {
      found.alt = `Describe the photo in a few words (at least ${MIN_ALT} characters).`;
    }
    if (details.collections.length === 0) {
      found.collections = "Choose at least one collection, so the photo has somewhere to appear.";
    }
    setErrors(found);
    if (found.alt || found.collections) {
      focusFirstError({
        [`${baseId}-alt`]: found.alt,
        [`${baseId}-collections`]: found.collections,
      });
      return;
    }

    setBusy(true);
    const { photo: saved, error } = await updatePhoto(photo, details);
    setBusy(false);
    if (!saved) {
      setFormError(error);
      return;
    }
    onSaved(saved);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.photo.small}
          alt=""
          className="aspect-[3/4] w-16 shrink-0 rounded-2xl bg-surface-3 object-cover"
        />
        <div>
          <h2
            id={`${baseId}-heading`}
            className="font-display text-2xl leading-tight tracking-tight text-ink"
          >
            Edit photo
          </h2>
          <p className="mt-1 text-sm text-muted">Changes show on the website as soon as you save.</p>
        </div>
      </div>

      <TextField
        id={`${baseId}-title`}
        label="Title (optional)"
        value={details.title}
        maxLength={MAX_TITLE}
        disabled={busy}
        onChange={(event) => set("title", event.target.value)}
      />
      <TextAreaField
        id={`${baseId}-alt`}
        label="Description for screen readers"
        rows={3}
        required
        value={details.alt}
        maxLength={MAX_ALT}
        disabled={busy}
        error={errors.alt}
        onChange={(event) => set("alt", event.target.value)}
        help="What the hair looks like, for visitors who cannot see the photo."
      />
      <CollectionsField
        id={`${baseId}-collections`}
        value={details.collections}
        onChange={(next) => set("collections", next)}
        error={errors.collections}
        disabled={busy}
      />
      <InstallTypeField
        id={`${baseId}-install`}
        value={details.installType}
        onChange={(next) => set("installType", next)}
        disabled={busy}
      />
      <PublishField
        id={`${baseId}-publish`}
        checked={details.published}
        onChange={(next) => set("published", next)}
        disabled={busy}
      />

      {formError ? <Notice tone="error">{formError}</Notice> : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={busy} className={buttonStyles.secondary}>
          Cancel
        </button>
        <button type="submit" disabled={busy} className={buttonStyles.primary}>
          {busy ? (
            <>
              <Spinner size={17} />
              Saving
            </>
          ) : (
            "Save changes"
          )}
        </button>
      </div>
    </form>
  );
}

// ----------------------------------------------------------------- remove ---

function RemovePhotoDialog({
  photo,
  onClose,
  afterClose,
  onRemoved,
}: {
  photo: AdminPhoto | null;
  onClose: () => void;
  afterClose: () => void;
  onRemoved: (photo: AdminPhoto, filesRemoved: boolean) => void;
}) {
  const baseId = useId();
  const [busyId, setBusyId] = useState<string | null>(null);
  // Tied to the photograph it is about, so reopening the dialog for another
  // one never shows a stale error.
  const [failure, setFailure] = useState<{ id: string; text: string } | null>(null);
  const busy = busyId !== null;
  const error = photo && failure?.id === photo.id ? failure.text : "";

  async function confirm() {
    if (!photo) return;
    setBusyId(photo.id);
    setFailure(null);
    const result = await deletePhoto(photo);
    setBusyId(null);
    if (!result.removed) {
      setFailure({ id: photo.id, text: result.error });
      return;
    }
    onRemoved(photo, result.filesRemoved);
  }

  return (
    <AdminDialog
      open={photo !== null}
      onClose={() => {
        if (!busy) onClose();
      }}
      titleId={`${baseId}-heading`}
      descriptionId={`${baseId}-body`}
      initialFocusId={`${baseId}-cancel`}
      afterClose={afterClose}
      closeOnBackdrop
    >
      {photo ? (
        <div className="flex flex-col gap-6">
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.photo.small}
              alt=""
              className="aspect-[3/4] w-16 shrink-0 rounded-2xl bg-surface-3 object-cover"
            />
            <div>
              <h2
                id={`${baseId}-heading`}
                className="font-display text-2xl leading-tight tracking-tight text-ink"
              >
                Remove this photo?
              </h2>
              <p id={`${baseId}-body`} className="mt-2 text-base leading-relaxed text-muted">
                This will remove the photo from Crowned by Nat&rsquo;s website.
              </p>
            </div>
          </div>

          {error ? <Notice tone="error">{error}</Notice> : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              id={`${baseId}-cancel`}
              type="button"
              onClick={onClose}
              disabled={busy}
              className={buttonStyles.secondary}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirm()}
              disabled={busy}
              className={dangerButton}
            >
              {busy ? (
                <>
                  <Spinner size={17} />
                  Removing
                </>
              ) : (
                "Remove Photo"
              )}
            </button>
          </div>
        </div>
      ) : null}
    </AdminDialog>
  );
}
