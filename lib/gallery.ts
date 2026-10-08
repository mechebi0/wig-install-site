/**
 * THE DATA SEAM for every photograph on the site.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS IS FOR
 * ---------------------------------------------------------------------------
 * A PhotoSet (lib/site-photos.ts) says which photographs exist and which one
 * Nat chose for each place. This file turns it into what the site shows:
 * each collection's photographs and cover, the homepage slideshow, each
 * install page's photograph, the finish swatches, the /book menu, the sign-in
 * screens, the homepage's recent-work rail and the link-preview picture.
 *
 * Every component reads photographs through resolveSite(), and none of them
 * reads lib/collections.ts or the database directly. The build calls it once
 * per page with the set it fetched (lib/site-photos-server.ts); the browser
 * calls it again if the database has something newer
 * (components/site-photos.tsx). Same function, same set, same page.
 *
 * ---------------------------------------------------------------------------
 * NOTHING HERE CAN LEAVE A HOLE IN THE SITE
 * ---------------------------------------------------------------------------
 * Only published photographs are ever shown. When the photograph chosen for
 * a place is hidden or removed, the place shows a stand-in rather than a
 * broken image, and the rules for which one are written once, below, so the
 * photo manager can warn Nat about exactly what will happen before she
 * removes something:
 *
 *   collection cover    the first photograph in the collection
 *   collection second   the next one that is not the cover; none if there
 *                       is only one, and the card simply does not fade
 *   slideshow slide     the first photograph in that slide's collection that
 *                       no other slide is showing; the slide is left out if
 *                       there is none
 *   install page        the first photograph tagged with that install; none
 *                       if nothing is, and the page leads with its words
 *   finish swatch       none: a plain swatch, never a borrowed photograph
 *   /book menu          the first frontal, else the first photograph
 *   sign-in screens     the first photograph
 *   link previews       whatever the first slide shows
 *
 * ---------------------------------------------------------------------------
 * WHAT MUST NOT HAPPEN HERE
 * ---------------------------------------------------------------------------
 * These are pure functions of the set: no fetching, no browser APIs. The
 * static export calls them during the build, and a request in here would
 * either break the export or leave the pages without their photographs.
 */

import {
  COLLECTIONS_IN_ORDER,
  LAUNCH_SLOTS,
  collectionTitle,
  getCollection,
  relatedCollections,
  type FinishAttribute,
  type Photo,
  type StyleCollection,
} from "@/lib/collections";
import {
  BOOK_FOCAL,
  HERO_FOCAL_DEFAULT,
  HERO_SLIDES,
  SIGN_IN_FOCAL,
  type HeroSlide,
} from "@/lib/images";
import { DEFAULT_FOCAL, type PhotoSet, type SitePhoto, type SlotId } from "@/lib/site-photos";
import {
  FINISHES,
  INSTALL_TYPES,
  type FinishId,
  type InstallTypeId,
} from "@/lib/taxonomy";

/** One published photograph, as a gallery cell, the lightbox and the rails read it. */
export type GalleryItem = {
  id: string;
  image: Photo;
  alt: string;
  title: string;
  /** One sentence about the frame. */
  description: string;
  /**
   * How the unit was fitted, where the photograph establishes it, and null
   * where it does not. See the note on `installType` in lib/collections.ts.
   */
  installType: InstallTypeId | null;
  /** Collection slugs it appears in, in reading order. */
  collections: string[];
  /** The collection it is filed under where only one can be named. */
  primaryCollection: string | null;
  /** For the caption: Natural Lace first where it applies, then the details. */
  finishAttributes: FinishAttribute[];
  featured: boolean;
  /** `object-position` for a cropped cell. */
  focalPosition: string;
};

/** A collection with its photographs joined on. */
export type ResolvedCollection = StyleCollection & {
  /** Every published photograph in it, in website order. */
  items: GalleryItem[];
  /** The card image, the page photograph and the link preview. */
  cover: GalleryItem | null;
  /** The card's hover photograph. */
  second: GalleryItem | null;
};

/** A photograph in one of the site's fixed places. */
export type Placed = {
  item: GalleryItem;
  /** `object-position` for this place. */
  focal: string;
  /**
   * True while the place still shows the photograph it launched with, so the
   * words written about that exact frame (a caption, a measured crop) apply.
   */
  original: boolean;
};

/** A slideshow slide with its photograph. */
export type ShownSlide = Omit<HeroSlide, "focal"> & {
  item: GalleryItem;
  /** `object-position` for this photograph in the hero. */
  focal: string;
};

export type SiteView = {
  /** Every published photograph, in website order. */
  items: GalleryItem[];
  /** The six, in reading order. */
  collections: ResolvedCollection[];
  slides: ShownSlide[];
  installs: Record<InstallTypeId, Placed | null>;
  finishes: Record<FinishId, Placed | null>;
  book: Placed | null;
  signIn: Placed | null;
  /** The homepage's recent-work rail. */
  featured: GalleryItem[];
  /** The picture in the site's link previews. */
  share: GalleryItem | null;
};

function toItem(photo: SitePhoto): GalleryItem {
  const natural = photo.collections.includes("natural-lace");
  const primary =
    photo.primaryCollection && photo.collections.includes(photo.primaryCollection)
      ? photo.primaryCollection
      : (photo.collections[0] ?? null);
  return {
    id: photo.id,
    image: photo.image,
    alt: photo.alt,
    title: photo.title,
    description: photo.caption,
    installType: photo.installType,
    collections: photo.collections,
    primaryCollection: primary,
    finishAttributes: natural ? ["natural-lace", ...photo.laceDetails] : photo.laceDetails,
    featured: photo.featured,
    focalPosition: photo.focal ?? DEFAULT_FOCAL,
  };
}

/** Whether a place is still showing the photograph it launched with. */
function isOriginal(slot: SlotId, item: GalleryItem): boolean {
  return LAUNCH_SLOTS[slot]?.src === item.image.src;
}

function place(slot: SlotId, item: GalleryItem | undefined, launchFocal: string | undefined): Placed | null {
  if (!item) return null;
  const original = isOriginal(slot, item);
  return {
    item,
    focal: original && launchFocal ? launchFocal : item.focalPosition,
    original,
  };
}

export function resolveSite(set: PhotoSet): SiteView {
  const items = set.photos.filter((photo) => photo.published).map(toItem);
  const byId = new Map(items.map((item) => [item.id, item]));
  const pick = (id: string | undefined) => (id ? byId.get(id) : undefined);

  const collections = COLLECTIONS_IN_ORDER.map((meta): ResolvedCollection => {
    const members = items.filter((item) => item.collections.includes(meta.slug));
    const member = (item: GalleryItem | undefined) =>
      item && item.collections.includes(meta.slug) ? item : undefined;
    const cover = member(pick(set.covers[meta.slug])) ?? members[0] ?? null;
    const chosen = member(pick(set.seconds[meta.slug]));
    const second =
      (chosen && chosen !== cover ? chosen : undefined) ??
      members.find((item) => item !== cover) ??
      null;
    return { ...meta, items: members, cover, second };
  });

  /*
    The slides Nat chose first, then stand-ins for any that are hidden or
    gone. Two passes, so a stand-in can never be a photograph a later slide
    is about to show anyway.
  */
  const chosen = HERO_SLIDES.map((slide) => pick(set.slots[slide.slot]));
  const showing = new Set(chosen.flatMap((item) => (item ? [item.id] : [])));
  const slides = HERO_SLIDES.flatMap((slide, index): ShownSlide[] => {
    let item = chosen[index];
    if (!item) {
      item = items.find(
        (candidate) => candidate.collections.includes(slide.collection) && !showing.has(candidate.id),
      );
      if (item) showing.add(item.id);
    }
    if (!item) return [];
    const { focal, ...words } = slide;
    return [
      {
        ...words,
        item,
        focal: isOriginal(slide.slot, item) ? (focal ?? HERO_FOCAL_DEFAULT) : item.focalPosition,
      },
    ];
  });

  const installs = Object.fromEntries(
    INSTALL_TYPES.map((type) => {
      const slot = `install-${type.id}` as SlotId;
      const item = pick(set.slots[slot]) ?? items.find((candidate) => candidate.installType === type.id);
      return [type.id, place(slot, item, type.imageFocal)];
    }),
  ) as Record<InstallTypeId, Placed | null>;

  const finishes = Object.fromEntries(
    FINISHES.map((finish) => {
      const slot = `finish-${finish.id}` as SlotId;
      return [finish.id, place(slot, pick(set.slots[slot]), finish.imageFocal)];
    }),
  ) as Record<FinishId, Placed | null>;

  const book = place(
    "book",
    pick(set.slots.book) ?? items.find((item) => item.installType === "frontal") ?? items[0],
    BOOK_FOCAL,
  );
  const signIn = place("sign-in", pick(set.slots["sign-in"]) ?? items[0], SIGN_IN_FOCAL);

  return {
    items,
    collections,
    slides,
    installs,
    finishes,
    book,
    signIn,
    featured: items.filter((item) => item.featured),
    share: slides[0]?.item ?? items[0] ?? null,
  };
}

/** One collection, resolved, by slug. */
export function findResolved(view: SiteView, slug: string): ResolvedCollection | undefined {
  return view.collections.find((collection) => collection.slug === slug);
}

/** One collection's words, by slug. The photographs come from findResolved. */
export function findCollection(slug: string): StyleCollection | undefined {
  return getCollection(slug);
}

/** The rail at the foot of a collection page. Never returns the current one. */
export function suggestCollections(slug: string, count = 3): StyleCollection[] {
  return relatedCollections(slug, count);
}

/** Every collection's words, in reading order. */
export function listCollections(): StyleCollection[] {
  return COLLECTIONS_IN_ORDER;
}

/**
 * The examples on an install page: only photographs whose frame establishes
 * that install type (see `installType` in lib/collections.ts), so an untagged
 * look is never presented as either.
 *
 * Taken one collection at a time, in reading order, so six of them read as
 * the range of the work rather than as the first six deep waves. Within a
 * collection, Nat's order decides, so moving a photograph earlier in the
 * photo manager is how it gets picked. The page's own photograph and the
 * finish swatches are left out, so no photograph appears twice on one screen.
 *
 * Returns an empty list when nothing is established, and the page leaves the
 * section out rather than filling it.
 */
export function installExamples(view: SiteView, type: InstallTypeId, limit = 6): GalleryItem[] {
  const onPage = new Set(
    [view.installs[type], ...Object.values(view.finishes)].flatMap((placed) =>
      placed ? [placed.item.id] : [],
    ),
  );
  const pool = view.items.filter((item) => item.installType === type && !onPage.has(item.id));
  const order: (string | null)[] = [...COLLECTIONS_IN_ORDER.map((collection) => collection.slug), null];
  const queues = order.map((slug) => pool.filter((item) => item.primaryCollection === slug));

  const picked: GalleryItem[] = [];
  while (picked.length < limit && queues.some((queue) => queue.length > 0)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next && picked.length < limit) picked.push(next);
    }
  }
  return picked;
}

/**
 * One place on the site a photograph is showing in, for the photo manager.
 *
 * `key` names the place itself rather than the photograph, so the same key
 * read from a different view (occupantOf) says what would be there instead:
 * that is how the manager tells Nat what a removal will change before she
 * confirms it. `single` places show one photograph; the others (the recent
 * work rail, an install page's examples) are lists a photograph simply
 * leaves.
 */
export type Placement = { key: string; label: string; single: boolean };

function placesIn(view: SiteView): { key: string; label: string; ids: string[]; single: boolean }[] {
  const places: { key: string; label: string; ids: string[]; single: boolean }[] = [];
  const one = (key: string, label: string, item: GalleryItem | null | undefined) =>
    places.push({ key, label, ids: item ? [item.id] : [], single: true });

  HERO_SLIDES.forEach((slide, index) =>
    one(
      `slide:${slide.slot}`,
      `Homepage slideshow, slide ${index + 1}`,
      view.slides.find((shown) => shown.slot === slide.slot)?.item,
    ),
  );
  one("share", "The picture shown when the site is shared", view.share);
  places.push({ key: "featured", label: "Homepage recent work", ids: view.featured.map((item) => item.id), single: false });
  for (const collection of view.collections) {
    one(`cover:${collection.slug}`, `${collection.title} cover`, collection.cover);
    one(`second:${collection.slug}`, `${collection.title} card, second photo`, collection.second);
  }
  for (const type of INSTALL_TYPES) {
    one(`install:${type.id}`, `${type.label} page photo`, view.installs[type.id]?.item);
    places.push({
      key: `examples:${type.id}`,
      label: `${type.label} page examples`,
      ids: installExamples(view, type.id).map((item) => item.id),
      single: false,
    });
  }
  for (const finish of FINISHES) {
    one(`finish:${finish.id}`, `${finish.label} swatch`, view.finishes[finish.id]?.item);
  }
  one("book", "Booking page menu", view.book?.item);
  one("sign-in", "Sign-in page", view.signIn?.item);
  return places;
}

/**
 * Every place on the site a photograph is showing in, in words Nat uses.
 * Gallery membership is listed separately, from `collections`.
 */
export function placementsOf(view: SiteView, id: string): Placement[] {
  return placesIn(view)
    .filter((place) => place.ids.includes(id))
    .map(({ key, label, single }) => ({ key, label, single }));
}

/** What a single place shows in this view, or null if it shows nothing. */
export function occupantOf(view: SiteView, key: string): GalleryItem | null {
  const place = placesIn(view).find((candidate) => candidate.key === key);
  const id = place?.single ? place.ids[0] : undefined;
  return id ? (view.items.find((item) => item.id === id) ?? null) : null;
}

/** The collection a photograph is filed under, as a display name. */
export function primaryLabel(item: GalleryItem): string {
  return item.primaryCollection ? collectionTitle(item.primaryCollection) : "";
}
