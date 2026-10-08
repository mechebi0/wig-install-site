import {
  COLLECTIONS_IN_ORDER,
  LAUNCH_COVERS,
  LAUNCH_ITEMS,
  LAUNCH_SLOTS,
  type FinishAttribute,
  type Photo,
} from "@/lib/collections";
import { SUPABASE_URL } from "@/lib/supabase/client";
import { parseInstallType, type InstallTypeId } from "@/lib/taxonomy";

/**
 * The website's photographs as data: what one is, which photograph each
 * fixed place on the site shows, and how a database row (or the launch set)
 * becomes one.
 *
 * Three readers share this file so that a photograph means the same thing to
 * all of them: the build, which bakes the published photographs into the
 * static pages (lib/site-photos-server.ts); the visitor's browser, which
 * checks for anything newer once a page has loaded
 * (components/site-photos.tsx); and Nat's photo manager (lib/photo-admin.ts).
 * What the site then does with the set (which photograph is a collection's
 * cover, what stands in when one is hidden) is lib/gallery.ts.
 *
 * ---------------------------------------------------------------------------
 * WHERE THE FILES ARE
 * ---------------------------------------------------------------------------
 * `src` is either a site path under public/images/work/ (the eighteen
 * photographs the site launched with, which migration 0007 turned into rows
 * without moving the files) or a key in the public `website-photos` bucket,
 * e.g. gallery/<uuid>.webp. Either way the other two widths sit beside it,
 * <stem>-600 and <stem>-1600, so a Photo built from either is
 * indistinguishable to every component that renders it.
 */

export const PHOTO_BUCKET = "website-photos";
/** Every upload lands under this prefix; the Storage policy refuses others. */
export const PHOTO_FOLDER = "gallery";

/**
 * Every fixed place on the site that shows one particular photograph,
 * besides the collection covers (which live on gallery_categories). The same
 * list as the CHECK on site_photo_slots in migration 0007.
 */
export const SLOT_IDS = [
  "home-1",
  "home-2",
  "home-3",
  "home-4",
  "home-5",
  "home-6",
  "install-frontal",
  "install-closure",
  "install-wig-touch-up",
  "finish-curls",
  "finish-wand-curls",
  "finish-crimps",
  "book",
  "sign-in",
] as const;

export type SlotId = (typeof SLOT_IDS)[number];

/**
 * The crop for a photograph nobody has measured: an upload, or a launch
 * photograph Nat has replaced. Phone portraits put the hairline in the upper
 * third, so a cell that has to crop a tall frame keeps the top of it.
 */
export const DEFAULT_FOCAL = "center 30%";

const LACE_DETAILS: readonly FinishAttribute[] = ["melted-hairline", "hd-lace", "custom-hairline"];

/** One photograph, published or not, as the site and the manager read it. */
export type SitePhoto = {
  /** The row's uuid; for the launch set, the file stem. */
  id: string;
  /** Storage key or site path of the 1200w file. */
  src: string;
  image: Photo;
  alt: string;
  title: string;
  /** One sentence about the frame. Kept with the photograph, not shown. */
  caption: string;
  installType: InstallTypeId | null;
  /** Collection slugs, in the site's reading order. Natural Lace included. */
  collections: string[];
  /** Where one collection has to be named. Null: the first of `collections`. */
  primaryCollection: string | null;
  /** Melted Hairline, HD Lace, Custom Hairline. Never Natural Lace. */
  laceDetails: FinishAttribute[];
  /** In the homepage's recent-work rail. */
  featured: boolean;
  /** Measured object-position, or null for DEFAULT_FOCAL. */
  focal: string | null;
  published: boolean;
  order: number;
  createdAt: string;
};

/**
 * Every photograph plus which one each place on the site was given. The
 * places hold ids; whether that photograph is still published, and what
 * stands in if not, is decided when the set is read (lib/gallery.ts).
 */
export type PhotoSet = {
  /** In website order. */
  photos: SitePhoto[];
  slots: Partial<Record<SlotId, string>>;
  /** Collection slug -> photograph id, for the card, page photo and preview. */
  covers: Record<string, string>;
  /** Collection slug -> photograph id, for the card's hover photograph. */
  seconds: Record<string, string>;
  /** "launch" when there was no database to ask; see lib/collections.ts. */
  source: "database" | "launch";
};

// -------------------------------------------------------------------- urls ---

/** The three widths of one photograph, from the key of the 1200w file. */
export function variantKeys(src: string): { small: string; src: string; large: string } {
  const dot = src.lastIndexOf(".");
  const stem = dot > src.lastIndexOf("/") ? src.slice(0, dot) : src;
  const extension = src.slice(stem.length);
  return {
    small: `${stem}-600${extension}`,
    src,
    large: `${stem}-1600${extension}`,
  };
}

/**
 * A Storage key as its public URL; a site path is returned untouched.
 *
 * Built by hand rather than through the Supabase client so the build can do
 * it too, and built exactly the way storage-js's getPublicUrl() builds it, so
 * the URL in the static HTML and the one the browser computes are the same
 * string and the image is fetched once.
 */
export function photoUrl(key: string): string {
  if (key.startsWith("/")) return key;
  if (!SUPABASE_URL) return "";
  const base = SUPABASE_URL.replace(/\/+$/, "");
  return encodeURI(`${base}/storage/v1/object/public/${PHOTO_BUCKET}/${key.replace(/^\/+/, "")}`);
}

export function photoFromSrc(src: string, width: number, height: number, alt: string): Photo {
  const keys = variantKeys(src);
  return {
    src: photoUrl(keys.src),
    small: photoUrl(keys.small),
    large: photoUrl(keys.large),
    width,
    height,
    alt,
  };
}

/** Every Storage key a set's photographs use, all three widths. */
export function storageKeys(set: PhotoSet): Set<string> {
  const keys = new Set<string>();
  for (const photo of set.photos) {
    if (photo.src.startsWith("/")) continue;
    const variants = variantKeys(photo.src);
    keys.add(variants.src).add(variants.small).add(variants.large);
  }
  return keys;
}

// -------------------------------------------------------------------- rows ---

/**
 * One request for everything: each photograph, its collections, the places
 * it fills and the collections it is the cover or second photograph of. The
 * `!hero_item_id` hints name which of gallery_categories' two links to a
 * photograph each embed follows.
 */
export const PHOTO_SELECT = [
  "id, src, alt, title, caption, width, height, install_type, active,",
  "display_order, created_at, focal_position, featured, finish_attributes,",
  "primary_collection, gallery_item_categories(gallery_categories(slug)),",
  "site_photo_slots(slot), cover_of:gallery_categories!hero_item_id(slug),",
  "second_of:gallery_categories!hover_item_id(slug)",
].join(" ");

export type PhotoRow = {
  id: string;
  src: string;
  alt: string;
  title: string | null;
  caption: string | null;
  width: number;
  height: number;
  install_type: string | null;
  active: boolean;
  display_order: number;
  created_at: string;
  focal_position: string | null;
  featured: boolean | null;
  finish_attributes: string[] | null;
  primary_collection: string | null;
  gallery_item_categories: { gallery_categories: { slug: string } | null }[] | null;
  site_photo_slots: { slot: string }[] | null;
  cover_of: { slug: string }[] | null;
  second_of: { slug: string }[] | null;
};

const READING_ORDER = COLLECTIONS_IN_ORDER.map((collection) => collection.slug);

/** Known collection slugs only, in the order the site lists collections. */
export function inReadingOrder(slugs: readonly string[]): string[] {
  return READING_ORDER.filter((slug) => slugs.includes(slug));
}

const FOCAL = /^(left|center|right|[0-9]{1,3}%) [0-9]{1,3}%$/;

function isSlotId(value: string): value is SlotId {
  return (SLOT_IDS as readonly string[]).includes(value);
}

function isLaceDetail(value: string): value is FinishAttribute {
  return (LACE_DETAILS as readonly string[]).includes(value);
}

export function photoFromRow(row: PhotoRow): SitePhoto {
  const collections = inReadingOrder(
    (row.gallery_item_categories ?? []).flatMap((link) =>
      link.gallery_categories?.slug ? [link.gallery_categories.slug] : [],
    ),
  );
  return {
    id: row.id,
    src: row.src,
    image: photoFromSrc(row.src, row.width, row.height, row.alt),
    alt: row.alt,
    title: row.title ?? "",
    caption: row.caption ?? "",
    installType: parseInstallType(row.install_type),
    collections,
    primaryCollection: row.primary_collection,
    laceDetails: LACE_DETAILS.filter((detail) => (row.finish_attributes ?? []).includes(detail)),
    featured: row.featured === true,
    focal: row.focal_position && FOCAL.test(row.focal_position) ? row.focal_position : null,
    published: row.active,
    order: row.display_order,
    createdAt: row.created_at,
  };
}

/** Website order: display_order, then newest first, as every query sorts. */
export function byWebsiteOrder(a: { order: number; createdAt: string }, b: { order: number; createdAt: string }) {
  return a.order - b.order || b.createdAt.localeCompare(a.createdAt);
}

export function photoSetFromRows(rows: PhotoRow[]): PhotoSet {
  const set: PhotoSet = { photos: [], slots: {}, covers: {}, seconds: {}, source: "database" };
  for (const row of rows) {
    for (const { slot } of row.site_photo_slots ?? []) {
      if (isSlotId(slot)) set.slots[slot] = row.id;
    }
    for (const { slug } of row.cover_of ?? []) set.covers[slug] = row.id;
    for (const { slug } of row.second_of ?? []) set.seconds[slug] = row.id;
  }
  set.photos = rows.map(photoFromRow).sort(byWebsiteOrder);
  return set;
}

// ------------------------------------------------------------------ launch ---

/**
 * The launch set from lib/collections.ts, in the same shape. What the site is
 * built with when there is no database to ask, and identical, photograph for
 * photograph, to what migration 0007 put in the database.
 */
export function launchPhotoSet(): PhotoSet {
  const photos = LAUNCH_ITEMS.map(
    (item, index): SitePhoto => ({
      id: item.id,
      src: item.image.src,
      image: item.image,
      alt: item.alt,
      title: item.title,
      caption: item.description,
      installType: item.installType,
      collections: inReadingOrder([
        ...item.styleCategories,
        ...(item.finishAttributes.includes("natural-lace") ? ["natural-lace"] : []),
      ]),
      primaryCollection: item.primaryStyle,
      laceDetails: item.finishAttributes.filter(isLaceDetail),
      featured: item.featured,
      focal: item.focalPosition,
      published: true,
      order: index + 1,
      createdAt: "",
    }),
  );

  const idOf = (photo: Photo) => photos.find((candidate) => candidate.src === photo.src)?.id;
  const set: PhotoSet = { photos, slots: {}, covers: {}, seconds: {}, source: "launch" };
  for (const [slot, photo] of Object.entries(LAUNCH_SLOTS)) {
    const id = photo ? idOf(photo) : undefined;
    if (id && isSlotId(slot)) set.slots[slot] = id;
  }
  for (const [slug, { cover, second }] of Object.entries(LAUNCH_COVERS)) {
    const coverId = idOf(cover);
    const secondId = idOf(second);
    if (coverId) set.covers[slug] = coverId;
    if (secondId) set.seconds[slug] = secondId;
  }
  return set;
}

/**
 * What a visitor would see from a set, as one string, so two sets can be
 * compared without caring where they came from. Places are recorded by the
 * file they show rather than by id: the launch set and the rows 0007 seeded
 * from it describe the same photographs under different ids, and the browser
 * should not redraw a page that would come out identical.
 */
export function photoSetKey(set: PhotoSet): string {
  const srcOf = new Map(set.photos.map((photo) => [photo.id, photo.src]));
  const places = (map: Record<string, string | undefined>) =>
    Object.entries(map)
      .map(([place, id]) => [place, id ? srcOf.get(id) ?? "" : ""])
      .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify([
    set.photos.map((photo) => [
      photo.src,
      photo.image.width,
      photo.image.height,
      photo.alt,
      photo.title,
      photo.installType,
      photo.collections,
      photo.primaryCollection,
      photo.laceDetails,
      photo.featured,
      photo.focal,
      photo.published,
    ]),
    places(set.slots),
    places(set.covers),
    places(set.seconds),
  ]);
}
