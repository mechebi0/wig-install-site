"use client";

import { useId, useMemo, useState } from "react";
import { Spiral } from "@phosphor-icons/react/dist/ssr";
import { buttonStyles } from "@/components/button";
import { AdminDialog } from "@/components/admin/admin-dialog";
import { Notice, Spinner } from "@/components/ui/feedback";
import { HERO_SLIDES } from "@/lib/images";
import { resolveSite, type GalleryItem } from "@/lib/gallery";
import { setCollectionPhoto, setSlot } from "@/lib/photo-admin";
import type { PhotoSet, SitePhoto, SlotId } from "@/lib/site-photos";
import { FINISHES, INSTALL_TYPES } from "@/lib/taxonomy";

/**
 * "Where photos appear": which photograph fills each fixed place on the
 * website, and a way to choose another.
 *
 * Every place lists what it shows NOW, worked out by the same resolveSite()
 * the public site uses, so this can never disagree with what a visitor sees.
 * Where that is a stand-in (Nat's choice is hidden or was removed, and the
 * site picked another), it says so in words.
 *
 * The choices are saved straight away. None of them can break the site:
 * every place falls back on its own (lib/gallery.ts), so there is no wrong
 * answer to protect Nat from here, only her preference.
 */

type Target = { slot: SlotId } | { slug: string; which: "cover" | "second" };

type Place = {
  key: string;
  label: string;
  /** Under the label: what the place is about. */
  detail?: string;
  target: Target;
  /** What the website shows there now. */
  showing: GalleryItem | null;
  /** What Nat chose, if anything. */
  chosen: string | undefined;
  /** Whether that choice is published, to say why a stand-in is showing. */
  chosenShown: boolean;
  /** The photographs that may fill it. */
  pool: SitePhoto[];
  /** A finish may have no photograph: a plain swatch. */
  allowNone?: boolean;
};

type Group = { title: string; note: string; places: Place[] };

export function PhotoPlaces({
  set,
  onChange,
}: {
  set: PhotoSet;
  onChange: (next: PhotoSet) => void;
}) {
  const headingId = useId();
  const [picking, setPicking] = useState<Place | null>(null);
  const [flash, setFlash] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const groups = useMemo((): Group[] => {
    const view = resolveSite(set);
    const published = set.photos.filter((photo) => photo.published);
    const shown = (id: string | undefined) => published.some((photo) => photo.id === id);
    const inCollection = (slug: string) =>
      published.filter((photo) => photo.collections.includes(slug));

    return [
      {
        title: "Homepage slideshow",
        note: "The large photos at the top of the homepage, in this order. Slide 1 is also the picture shown when someone shares the website.",
        places: HERO_SLIDES.map((slide, index) => ({
          key: slide.slot,
          label: `Slide ${index + 1}`,
          detail: slide.label,
          target: { slot: slide.slot },
          showing: view.slides.find((shown) => shown.slot === slide.slot)?.item ?? null,
          chosen: set.slots[slide.slot],

          chosenShown: shown(set.slots[slide.slot]),
          pool: published,
        })),
      },
      {
        title: "Collection covers",
        note: "Each collection's card, the photo at the top of its page and its link preview. The second photo fades in when someone points at the card on a computer.",
        places: view.collections.flatMap((collection) => [
          {
            key: `cover:${collection.slug}`,
            label: `${collection.title} cover`,
            target: { slug: collection.slug, which: "cover" as const },
            showing: collection.cover,
            chosen: set.covers[collection.slug],

            chosenShown: shown(set.covers[collection.slug]),
            pool: inCollection(collection.slug),
          },
          {
            key: `second:${collection.slug}`,
            label: `${collection.title} second photo`,
            target: { slug: collection.slug, which: "second" as const },
            showing: collection.second,
            chosen: set.seconds[collection.slug],

            chosenShown: shown(set.seconds[collection.slug]),
            pool: inCollection(collection.slug).filter((photo) => photo.id !== collection.cover?.id),
          },
        ]),
      },
      {
        title: "Install pages",
        note: "The photo at the top of each install's page, which is also its link preview and its card on the other install pages.",
        places: INSTALL_TYPES.map((type) => {
          const slot = `install-${type.id}` as SlotId;
          return {
            key: slot,
            label: type.label,
            target: { slot },
            showing: view.installs[type.id]?.item ?? null,
            chosen: set.slots[slot],

            chosenShown: shown(set.slots[slot]),
            pool: published,
          };
        }),
      },
      {
        title: "Finish swatches",
        note: "The pictures beside Curls, Wand Curls and Crimps on the install pages. A finish with no photo shows a plain swatch.",
        places: FINISHES.map((finish) => {
          const slot = `finish-${finish.id}` as SlotId;
          return {
            key: slot,
            label: finish.label,
            target: { slot },
            showing: view.finishes[finish.id]?.item ?? null,
            chosen: set.slots[slot],

            chosenShown: shown(set.slots[slot]),
            pool: published,
            allowNone: true,
          };
        }),
      },
      {
        title: "Booking and sign-in pages",
        note: "The photo in the services menu on the booking page, and the one beside the sign-in forms.",
        places: [
          {
            key: "book",
            label: "Booking page menu",
            target: { slot: "book" },
            showing: view.book?.item ?? null,
            chosen: set.slots.book,

            chosenShown: shown(set.slots.book),
            pool: published,
          },
          {
            key: "sign-in",
            label: "Sign-in page",
            target: { slot: "sign-in" },
            showing: view.signIn?.item ?? null,
            chosen: set.slots["sign-in"],

            chosenShown: shown(set.slots["sign-in"]),
            pool: published,
          },
        ],
      },
    ];
  }, [set]);

  function saved(target: Target, id: string | null) {
    if ("slot" in target) {
      const slots = { ...set.slots };
      if (id) slots[target.slot] = id;
      else delete slots[target.slot];
      onChange({ ...set, slots });
    } else if (id) {
      const field = target.which === "cover" ? "covers" : "seconds";
      onChange({ ...set, [field]: { ...set[field], [target.slug]: id } });
    }
    setPicking(null);
    setFlash({ tone: "success", text: "Saved. The website shows it now." });
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-8">
      <div>
        <h2 id={headingId} className="font-display text-2xl tracking-tight text-ink lg:text-3xl">
          Where photos appear
        </h2>
        <p className="mt-2 max-w-[62ch] text-base leading-relaxed text-muted">
          Choose the photo for each spot on the website. If a chosen photo is
          hidden or removed, the spot shows another one by itself, so nothing
          on the site is ever left broken.
        </p>
      </div>

      {flash ? <Notice tone={flash.tone}>{flash.text}</Notice> : null}

      {groups.map((group) => (
        <div key={group.title} className="rounded-3xl border border-line bg-surface/60 p-5 sm:p-7">
          <h3 className="font-display text-xl tracking-tight text-ink">{group.title}</h3>
          <p className="mt-1.5 max-w-[62ch] text-sm leading-relaxed text-muted">{group.note}</p>
          <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.places.map((place) => (
              <li
                key={place.key}
                className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-3"
              >
                <div className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                  {place.showing ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={place.showing.image.small}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      style={{ objectPosition: place.showing.focalPosition }}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-accent/60">
                      <Spiral size={22} weight="thin" />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug text-ink">
                    {place.label}
                    {place.detail ? <span className="font-normal text-muted"> &middot; {place.detail}</span> : null}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-muted">
                    {place.showing
                      ? place.showing.title || "Untitled photo"
                      : place.allowNone
                        ? "Plain swatch"
                        : "No photo to show"}
                  </p>
                  {standInNote(place) ? (
                    <p className="mt-0.5 text-xs leading-snug text-accent">{standInNote(place)}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFlash(null);
                    setPicking(place);
                  }}
                  disabled={place.pool.length === 0 && !place.allowNone}
                  className="inline-flex min-h-11 shrink-0 cursor-pointer items-center rounded-full px-3 text-sm font-medium text-ink transition-colors hover:bg-surface-2 hover:text-accent disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Change
                  <span className="sr-only"> the photo for {place.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <PickPhotoDialog
        place={picking}
        onClose={() => setPicking(null)}
        onSaved={saved}
      />
    </section>
  );
}

/** Says so when the website is not showing what Nat chose, and why. */
function standInNote(place: Place): string {
  if (!place.chosen) return place.showing && !place.allowNone ? "Chosen automatically" : "";
  if (place.showing?.id === place.chosen) return "";
  // Published but elsewhere: a collection's second photo whose choice has
  // moved up to stand in for a hidden cover.
  if (place.chosenShown) return "Your choice is standing in as the cover, so this one stands in here";
  return place.showing
    ? "Your choice is hidden or removed, so this one stands in"
    : "Your choice is hidden or removed";
}

// ------------------------------------------------------------------ picker ---

function PickPhotoDialog({
  place,
  onClose,
  onSaved,
}: {
  place: Place | null;
  onClose: () => void;
  onSaved: (target: Target, id: string | null) => void;
}) {
  const baseId = useId();
  const [busy, setBusy] = useState(false);

  return (
    <AdminDialog
      open={place !== null}
      onClose={() => {
        if (!busy) onClose();
      }}
      titleId={`${baseId}-heading`}
      initialFocusId={`${baseId}-cancel`}
    >
      {place ? (
        <PickForm
          key={place.key}
          baseId={baseId}
          place={place}
          busy={busy}
          setBusy={setBusy}
          onCancel={onClose}
          onSaved={onSaved}
        />
      ) : null}
    </AdminDialog>
  );
}

const NONE = "none";

function PickForm({
  baseId,
  place,
  busy,
  setBusy,
  onCancel,
  onSaved,
}: {
  baseId: string;
  place: Place;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  onCancel: () => void;
  onSaved: (target: Target, id: string | null) => void;
}) {
  const [choice, setChoice] = useState<string>(
    place.showing?.id ?? (place.allowNone ? NONE : (place.pool[0]?.id ?? NONE)),
  );
  const [error, setError] = useState("");

  async function save() {
    setError("");
    setBusy(true);
    const id = choice === NONE ? null : choice;
    const { error: failed } =
      "slot" in place.target
        ? await setSlot(place.target.slot, id)
        : id
          ? await setCollectionPhoto(place.target.slug, place.target.which, id)
          : { error: "Choose a photo for this spot." };
    setBusy(false);
    if (failed) {
      setError(failed);
      return;
    }
    onSaved(place.target, id);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 id={`${baseId}-heading`} className="font-display text-2xl leading-tight tracking-tight text-ink">
          {place.label}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Choose the photo for this spot. Only photos showing on the website are listed.
        </p>
      </div>

      <fieldset>
        <legend className="sr-only">Photos</legend>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {place.allowNone ? (
            <ChoiceTile
              name={`${baseId}-photo`}
              value={NONE}
              checked={choice === NONE}
              disabled={busy}
              onChoose={setChoice}
              label="No photo, a plain swatch"
            >
              <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center bg-surface-2 text-accent/60">
                <Spiral size={28} weight="thin" />
              </span>
            </ChoiceTile>
          ) : null}
          {place.pool.map((photo) => (
            <ChoiceTile
              key={photo.id}
              name={`${baseId}-photo`}
              value={photo.id}
              checked={choice === photo.id}
              disabled={busy}
              onChoose={setChoice}
              label={photo.title || photo.alt}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.image.small}
                alt=""
                loading="lazy"
                decoding="async"
                style={{ objectPosition: photo.focal ?? undefined }}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </ChoiceTile>
          ))}
        </div>
      </fieldset>

      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          id={`${baseId}-cancel`}
          type="button"
          onClick={onCancel}
          disabled={busy}
          className={buttonStyles.secondary}
        >
          Cancel
        </button>
        <button type="button" onClick={() => void save()} disabled={busy} className={buttonStyles.primary}>
          {busy ? (
            <>
              <Spinner size={17} />
              Saving
            </>
          ) : (
            "Use this photo"
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * One photograph to choose, as a radio button the size of a thumbnail. The
 * ring is drawn from the label with `has-[:checked]`, so it follows the real
 * input whatever order the markup is in.
 */
function ChoiceTile({
  name,
  value,
  checked,
  disabled,
  onChoose,
  label,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  disabled: boolean;
  onChoose: (value: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="group cursor-pointer">
      <span className="relative block aspect-[3/4] overflow-hidden rounded-2xl bg-surface-3 outline-offset-2 group-has-[:checked]:outline group-has-[:checked]:outline-[3px] group-has-[:checked]:outline-accent group-has-[:focus-visible]:outline group-has-[:focus-visible]:outline-2 group-has-[:focus-visible]:outline-accent">
        {children}
      </span>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChoose(value)}
        className="sr-only"
      />
      <span className="mt-1.5 line-clamp-2 block text-xs leading-snug text-ink">{label}</span>
    </label>
  );
}
