"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowsClockwise,
  Eye,
  EyeSlash,
  PencilSimple,
  Trash,
} from "@phosphor-icons/react/dist/ssr";
import { buttonStyles } from "@/components/button";
import { AdminDialog } from "@/components/admin/admin-dialog";
import { ReplacePhotoDialog } from "@/components/admin/photo-replace";
import {
  BookingServicesField,
  BookingServicesUnavailable,
  CollectionsField,
  FeaturedField,
  InstallTypeField,
  LaceDetailsField,
  PublishField,
  collectionTitle,
  installTypeLabel,
} from "@/components/admin/photo-fields";
import { EmptyState, LoadingPanel, Notice, Spinner } from "@/components/ui/feedback";
import { TextAreaField, TextField, focusFirstError } from "@/components/ui/form";
import {
  occupantOf,
  placementsOf,
  resolveSite,
  type GalleryItem,
  type Placement,
  type SiteView,
} from "@/lib/gallery";
import {
  MAX_ALT,
  MAX_TITLE,
  MIN_ALT,
  deletePhoto,
  detailsOf,
  reorderPhotos,
  setPublished,
  updatePhoto,
  type AdminPhoto,
  type PhotoDetails,
} from "@/lib/photo-admin";
import type { PhotoSet } from "@/lib/site-photos";

/**
 * Every photograph on the website, shown or hidden, in the order the
 * galleries show them: the eighteen the site launched with and everything Nat
 * has added since, managed exactly the same way.
 *
 * Each card says the things that decide where a photograph appears
 * (collections, install type, the places on the site it fills, shown or
 * hidden) in words, so nothing depends on reading a colour or an icon.
 * Moving a photograph earlier or later, and hiding or showing it, saves at
 * once; there is no separate save step to forget.
 *
 * Removing always goes through a confirmation, whose default button is
 * Cancel. The dialog says what will happen in plain words, including which
 * photograph will take over each place this one fills, and offers Hide as
 * the way to take it off the website without losing it.
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

/*
  The card's six actions share one row shape: centred in an equal third of
  the card, 44px tall, label always visible. Tight side padding because a
  third of a 320px card is about 80px and "Replace" has to fit in it.
*/
const actionButton =
  "inline-flex min-h-11 min-w-0 cursor-pointer items-center justify-center gap-1 rounded-full px-1 text-sm font-medium text-ink transition-colors hover:bg-surface-2 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50";

const moveButton =
  "inline-flex min-h-11 min-w-0 cursor-pointer items-center justify-center gap-1 rounded-full px-1 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-accent disabled:cursor-not-allowed disabled:opacity-35";

const removeButton =
  "inline-flex min-h-11 min-w-0 cursor-pointer items-center justify-center gap-1 rounded-full px-1 text-sm font-medium text-danger transition-colors hover:bg-danger/5 disabled:cursor-not-allowed disabled:opacity-50";

/** The words Nat sees for a photograph that has no title. */
function nameOf(photo: { title: string }): string {
  return photo.title || "this photo";
}

/**
 * Whether Nat has chosen this photograph for one of the site's fixed places,
 * shown or not. Such a photograph may be in no gallery at all, as the
 * homepage's opening photograph is; any other must be in at least one, or it
 * would appear nowhere.
 */
function isChosenForAPlace(set: PhotoSet, id: string): boolean {
  return [set.slots, set.covers, set.seconds].some((places) =>
    Object.values(places).includes(id),
  );
}

export function PhotoLibrary({
  set,
  status,
  loadError,
  deployed,
  onRetry,
  onChange,
}: {
  set: PhotoSet | null;
  status: "loading" | "ready" | "error";
  loadError: string;
  /** Storage keys the deployed pages were built with; see lib/photo-admin.ts. */
  deployed: ReadonlySet<string>;
  onRetry: () => void;
  onChange: (photos: AdminPhoto[]) => void;
}) {
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  /** Set when a removal succeeds; read once the dialog has closed. */
  const focusHeadingNext = useRef(false);
  const [flash, setFlash] = useState<Flash>(null);
  const [editing, setEditing] = useState<AdminPhoto | null>(null);
  const [replacing, setReplacing] = useState<AdminPhoto | null>(null);
  const [removing, setRemoving] = useState<AdminPhoto | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const photos = useMemo(() => set?.photos ?? [], [set]);
  // What the public site shows from this set: the same function it uses.
  const view = useMemo(() => (set ? resolveSite(set) : null), [set]);

  const replaceWith = (next: AdminPhoto) =>
    onChange(photos.map((photo) => (photo.id === next.id ? next : photo)));

  async function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= photos.length) return;

    const previous = photos;
    const next = [...photos];
    [next[index], next[target]] = [next[target], next[index]];
    const renumbered = next.map((photo, position) => ({ ...photo, order: position + 1 }));

    setFlash(null);
    setWorkingId(photos[index].id);
    onChange(renumbered);

    const { error } = await reorderPhotos(renumbered.map((photo) => photo.id));
    setWorkingId(null);
    if (error) {
      onChange(previous);
      setFlash({ tone: "error", text: error });
    }
  }

  async function toggleShown(photo: AdminPhoto) {
    setFlash(null);
    setWorkingId(photo.id);
    const filled = view ? placementsOf(view, photo.id).some((place) => place.single) : false;
    const { photo: saved, error } = await setPublished(photo, !photo.published);
    setWorkingId(null);
    if (!saved) {
      setFlash({ tone: "error", text: error });
      return;
    }
    replaceWith(saved);
    setFlash({
      tone: "success",
      text: saved.published
        ? `${photo.title || "The photo"} is showing on the website again.`
        : `${photo.title || "The photo"} is hidden from the website. It stays here, ready to show again.${
            filled ? " The places it filled now show other photos." : ""
          }`,
    });
  }

  const shownCount = photos.filter((photo) => photo.published).length;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-8">
      <div>
        {/* Focusable from script only: where focus goes after a removal, since
            the button that opened the dialog no longer exists. */}
        <h3
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-xl tracking-tight text-ink"
        >
          All photos
        </h3>
        <p className="mt-1.5 max-w-[62ch] text-sm leading-relaxed text-muted">
          {status === "ready" && photos.length > 0
            ? `${photos.length} photos, ${shownCount} showing on the website. Every gallery shows them in this order.`
            : "Every photo on the website appears here, shown or hidden."}
        </p>
      </div>

      {flash ? <Notice tone={flash.tone}>{flash.text}</Notice> : null}

      {status === "loading" ? <LoadingPanel label="Loading the website's photos" /> : null}

      {status === "error" ? (
        <div className="flex flex-col items-start gap-4">
          <Notice tone="error" title="The photos could not be loaded.">
            {loadError}
          </Notice>
          <button type="button" onClick={onRetry} className={buttonStyles.secondary}>
            Try again
          </button>
        </div>
      ) : null}

      {status === "ready" && photos.length === 0 ? (
        <EmptyState
          title="No photos yet"
          body="Photos you add above will be listed here, where you can replace, edit, reorder, hide or remove them."
        />
      ) : null}

      {status === "ready" && view && photos.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {photos.map((photo, index) => {
            const name = nameOf(photo);
            const places = placementsOf(view, photo.id);
            const busy = workingId !== null;
            return (
              <li
                key={photo.id}
                className="flex flex-col rounded-3xl border border-line bg-surface p-3 sm:p-0"
              >
                <div className="flex gap-4 sm:flex-1 sm:flex-col sm:gap-0">
                  <div className="relative aspect-[3/4] w-28 shrink-0 self-start overflow-hidden rounded-2xl bg-surface-3 sm:w-full sm:rounded-b-none sm:rounded-t-3xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.image.small}
                      alt={photo.alt}
                      width={photo.image.width}
                      height={photo.image.height}
                      loading="lazy"
                      decoding="async"
                      style={{ objectPosition: photo.focal ?? undefined }}
                      className={`absolute inset-0 h-full w-full object-cover ${photo.published ? "" : "opacity-60"}`}
                    />
                    {photo.published ? null : (
                      <span className="absolute left-2 top-2 rounded-full bg-ink/80 px-2.5 py-1 text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-on-accent">
                        Hidden
                      </span>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-2 py-1 pr-1 sm:p-5 sm:pb-3 sm:pt-4">
                    <p className="font-display text-lg leading-tight tracking-tight text-ink">
                      {photo.title || <span className="text-muted">Untitled</span>}
                    </p>
                    <p className="text-sm leading-snug text-muted">
                      {photo.collections.length > 0
                        ? photo.collections.map(collectionTitle).join(", ")
                        : "Not in a gallery"}
                    </p>
                    {photo.installType ? (
                      <p className="text-[0.6875rem] font-medium uppercase leading-none tracking-[0.14em] text-accent">
                        {installTypeLabel(photo.installType)}
                      </p>
                    ) : null}
                    {places.length > 0 ? (
                      <p className="text-xs leading-relaxed text-ink">
                        <span className="text-muted">Also on: </span>
                        {places.map((place) => place.label).join(" · ")}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted">
                      {photo.published ? "Showing on the website" : "Hidden from the website"}
                    </p>
                  </div>
                </div>

                {/*
                  The actions run the full width of the card, three to a row,
                  under the photograph and its words rather than squeezed in
                  beside the picture. Beside it, a 320px phone left them about
                  130px, and the six wrapped into a ragged stack five rows
                  tall. The two arrows carry their words too: on a phone there
                  is room for "Earlier" and "Later", and an arrow alone asks
                  Nat to know which way the order runs.
                */}
                <div className="mt-3 grid grid-cols-3 gap-1 border-t border-line pt-2 sm:mx-5 sm:mb-3 sm:mt-0">
                  <button
                    type="button"
                    onClick={() => {
                      setFlash(null);
                      setReplacing(photo);
                    }}
                    disabled={busy}
                    className={actionButton}
                  >
                    <ArrowsClockwise size={16} weight="regular" aria-hidden="true" />
                    Replace
                    <span className="sr-only"> {name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFlash(null);
                      setEditing(photo);
                    }}
                    disabled={busy}
                    className={actionButton}
                  >
                    <PencilSimple size={16} weight="regular" aria-hidden="true" />
                    Edit
                    <span className="sr-only"> {name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleShown(photo)}
                    disabled={busy}
                    className={actionButton}
                  >
                    {workingId === photo.id ? (
                      <Spinner size={16} />
                    ) : photo.published ? (
                      <EyeSlash size={16} weight="regular" aria-hidden="true" />
                    ) : (
                      <Eye size={16} weight="regular" aria-hidden="true" />
                    )}
                    {photo.published ? "Hide" : "Show"}
                    <span className="sr-only"> {name}</span>
                  </button>
                  {/* The accessible name ("Move Soft Lob earlier") still
                      contains the visible word, as WCAG 2.5.3 asks. */}
                  <button
                    type="button"
                    onClick={() => void move(index, -1)}
                    disabled={index === 0 || busy}
                    aria-label={`Move ${name} earlier`}
                    className={moveButton}
                  >
                    <ArrowUp size={16} weight="regular" aria-hidden="true" />
                    Earlier
                  </button>
                  <button
                    type="button"
                    onClick={() => void move(index, 1)}
                    disabled={index === photos.length - 1 || busy}
                    aria-label={`Move ${name} later`}
                    className={moveButton}
                  >
                    <ArrowDown size={16} weight="regular" aria-hidden="true" />
                    Later
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFlash(null);
                      setRemoving(photo);
                    }}
                    disabled={busy}
                    className={removeButton}
                  >
                    <Trash size={16} weight="regular" aria-hidden="true" />
                    Remove
                    <span className="sr-only"> {name}</span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      <ReplacePhotoDialog
        photo={replacing}
        places={replacing && view ? placementsOf(view, replacing.id).map((place) => place.label) : []}
        deployed={deployed}
        onClose={() => setReplacing(null)}
        onReplaced={(saved) => {
          replaceWith(saved);
          setReplacing(null);
          setFlash({
            tone: "success",
            text: "Replaced. The website shows the new photo now, everywhere the old one appeared.",
          });
        }}
      />

      <EditPhotoDialog
        photo={editing}
        fillsPlaces={editing && set ? isChosenForAPlace(set, editing.id) : false}
        onClose={() => setEditing(null)}
        onSaved={(saved) => {
          replaceWith(saved);
          setEditing(null);
          setFlash({ tone: "success", text: "Saved. The website shows the change straight away." });
        }}
      />

      <RemovePhotoDialog
        photo={removing}
        set={set}
        view={view}
        deployed={deployed}
        onClose={() => setRemoving(null)}
        onHide={(photo) => {
          setRemoving(null);
          void toggleShown(photo);
        }}
        afterClose={() => {
          if (!focusHeadingNext.current) return;
          focusHeadingNext.current = false;
          headingRef.current?.focus();
        }}
        onRemoved={(removed) => {
          focusHeadingNext.current = true;
          onChange(photos.filter((photo) => photo.id !== removed.id));
          setRemoving(null);
          setFlash({ tone: "success", text: "Photo removed from the website." });
        }}
      />
    </section>
  );
}

// ------------------------------------------------------------------- edit ---

function EditPhotoDialog({
  photo,
  fillsPlaces,
  onClose,
  onSaved,
}: {
  photo: AdminPhoto | null;
  /** True when it is chosen for a place on the site, so it may be in no gallery. */
  fillsPlaces: boolean;
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
          collectionsRequired={!fillsPlaces}
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
  collectionsRequired,
  busy,
  setBusy,
  onCancel,
  onSaved,
}: {
  baseId: string;
  photo: AdminPhoto;
  collectionsRequired: boolean;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  onCancel: () => void;
  onSaved: (photo: AdminPhoto) => void;
}) {
  const [details, setDetails] = useState<PhotoDetails>(() => detailsOf(photo));
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
    if (collectionsRequired && details.collections.length === 0) {
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
          src={photo.image.small}
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
        required={collectionsRequired}
      />
      <InstallTypeField
        id={`${baseId}-install`}
        value={details.installType}
        onChange={(next) => set("installType", next)}
        disabled={busy}
      />
      {details.bookingServices ? (
        <BookingServicesField
          id={`${baseId}-booking`}
          value={details.bookingServices}
          onChange={(next) => set("bookingServices", next)}
          disabled={busy}
        />
      ) : (
        <BookingServicesUnavailable />
      )}
      <LaceDetailsField
        id={`${baseId}-lace`}
        value={details.laceDetails}
        onChange={(next) => set("laceDetails", next)}
        disabled={busy}
      />
      <FeaturedField
        id={`${baseId}-featured`}
        checked={details.featured}
        onChange={(next) => set("featured", next)}
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

/**
 * What happens to each place a photograph fills once it is gone, in words:
 * the same resolveSite() the public site uses, run without it.
 */
function afterRemoval(
  placement: Placement,
  next: GalleryItem | null,
): string {
  const title = next ? next.title || "another photo" : "";
  const kind = placement.key.split(":")[0];
  if (next) return `${placement.label}: shows ${title} instead`;
  switch (kind) {
    case "slide":
      return `${placement.label}: left out of the slideshow`;
    case "second":
      return `${placement.label}: the card shows its cover only`;
    case "finish":
      return `${placement.label}: a plain swatch`;
    default:
      return `${placement.label}: no photo`;
  }
}

function RemovePhotoDialog({
  photo,
  set,
  view,
  deployed,
  onClose,
  onHide,
  afterClose,
  onRemoved,
}: {
  photo: AdminPhoto | null;
  set: PhotoSet | null;
  view: SiteView | null;
  deployed: ReadonlySet<string>;
  onClose: () => void;
  onHide: (photo: AdminPhoto) => void;
  afterClose: () => void;
  onRemoved: (photo: AdminPhoto) => void;
}) {
  const baseId = useId();
  const [busyId, setBusyId] = useState<string | null>(null);
  // Tied to the photograph it is about, so reopening the dialog for another
  // one never shows a stale error.
  const [failure, setFailure] = useState<{ id: string; text: string } | null>(null);
  const busy = busyId !== null;
  const error = photo && failure?.id === photo.id ? failure.text : "";

  const consequences = useMemo(() => {
    if (!photo || !set || !view) return [];
    const without = resolveSite({ ...set, photos: set.photos.filter((other) => other.id !== photo.id) });
    return placementsOf(view, photo.id).map((placement) =>
      placement.single
        ? afterRemoval(placement, occupantOf(without, placement.key))
        : `${placement.label}: no longer included`,
    );
  }, [photo, set, view]);

  async function confirm() {
    if (!photo) return;
    setBusyId(photo.id);
    setFailure(null);
    const result = await deletePhoto(photo, deployed);
    setBusyId(null);
    if (!result.removed) {
      setFailure({ id: photo.id, text: result.error });
      return;
    }
    onRemoved(photo);
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
              src={photo.image.small}
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
                It cannot be undone. To take it off the website but keep it
                here, hide it instead.
              </p>
            </div>
          </div>

          {consequences.length > 0 ? (
            <div className="rounded-2xl border border-line bg-surface-2/60 p-4">
              <p className="text-sm font-medium text-ink">
                It also appears in other places. Once it is gone:
              </p>
              <ul className="mt-2 flex flex-col gap-1.5 text-sm leading-snug text-muted">
                {consequences.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span aria-hidden="true" className="text-accent">
                      &middot;
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

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
            {photo.published ? (
              <button
                type="button"
                onClick={() => onHide(photo)}
                disabled={busy}
                className={buttonStyles.secondary}
              >
                Hide instead
              </button>
            ) : null}
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
