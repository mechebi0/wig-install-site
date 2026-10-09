"use client";

import { requireSupabase } from "@/lib/supabase/client";
import type { FinishAttribute } from "@/lib/collections";
import type { ServiceId } from "@/lib/content";
import type { InstallTypeId } from "@/lib/taxonomy";
import type { PreparedPhoto } from "@/lib/photo-processing";
import {
  PHOTO_BUCKET,
  PHOTO_FOLDER,
  PHOTO_SELECT,
  photoFromRow,
  photoSetFromRows,
  photoUrl,
  variantKeys,
  type PhotoRow,
  type PhotoSet,
  type SitePhoto,
  type SlotId,
} from "@/lib/site-photos";

/**
 * Everything the photo manager reads and writes.
 *
 * ---------------------------------------------------------------------------
 * EVERY PHOTOGRAPH ON THE SITE, NOT ONLY UPLOADS
 * ---------------------------------------------------------------------------
 * Since migration 0007 the eighteen photographs the site launched with are
 * rows like any upload, so every function here works on all of them: the
 * homepage slideshow, the collection covers and the install pages are as
 * editable as a photograph added yesterday. The only difference between the
 * two is where the file is (a site path for a launch photograph, a Storage
 * key for an upload), and the functions below handle both.
 *
 * ---------------------------------------------------------------------------
 * NONE OF THIS CHECKS WHETHER THE CALLER IS NAT
 * ---------------------------------------------------------------------------
 * Same rule as lib/admin.ts. Every function below is an ordinary request,
 * and Postgres and Storage answer it according to is_admin(). A customer
 * importing this file would get permission errors and nothing else: the
 * table policies from 0002 and 0007 and the Storage policies from 0006 are
 * the control, and a check in here would only be a second, weaker copy.
 *
 * ---------------------------------------------------------------------------
 * NO HALF-FINISHED PHOTOGRAPHS, AND NO BROKEN ONES
 * ---------------------------------------------------------------------------
 * An upload is three files, a row and its collections, and any step can fail
 * on a phone signal. The row is written hidden, published only once
 * everything else is in place, and every failure removes what came before it.
 *
 * A replacement uploads the new files and checks the website can load them
 * BEFORE the row is pointed at them, so if anything fails the old photograph
 * is still there, untouched.
 *
 * Files a photograph no longer uses (after a removal or a replacement) are
 * not deleted while the deployed website might still show them. The static
 * pages are rebuilt from the database at each deployment, and until the next
 * one, a page already built with the old photograph would show a broken
 * image if its file vanished. So a file is deleted straight away only when
 * the deployment Nat is looking at never used it, and otherwise by
 * sweepOrphanFiles() once a deployment that no longer uses it is live.
 */

/** One photograph as the manager lists it: published or hidden. */
export type AdminPhoto = SitePhoto;

/** The fields Nat fills in, for a new photograph or an existing one. */
export type PhotoDetails = {
  title: string;
  alt: string;
  collections: string[];
  installType: InstallTypeId | null;
  published: boolean;
  /** In the homepage's recent-work rail. */
  featured: boolean;
  /** Melted Hairline, HD Lace, Custom Hairline. */
  laceDetails: FinishAttribute[];
  /**
   * The services whose own booking page shows it. Null where the database
   * cannot store them yet (it does not have migration 0010): the photo
   * manager then does not offer the choice, and nothing is written.
   */
  bookingServices: ServiceId[] | null;
};

/** The booking pages, as a column to write, or nothing where there is no column yet. */
function bookingServicesColumn(details: PhotoDetails): { booking_services?: ServiceId[] } {
  return details.bookingServices ? { booking_services: details.bookingServices } : {};
}

/** gallery_items.alt has a CHECK for this in 0002. */
export const MIN_ALT = 10;
export const MAX_ALT = 300;
export const MAX_TITLE = 80;

export function detailsOf(photo: AdminPhoto): PhotoDetails {
  return {
    title: photo.title,
    alt: photo.alt,
    collections: photo.collections,
    installType: photo.installType,
    published: photo.published,
    featured: photo.featured,
    laceDetails: photo.laceDetails,
    bookingServices: photo.bookingServicesStored ? photo.bookingServices : null,
  };
}

// ------------------------------------------------------------------ errors ---

type ServiceError = {
  message?: string;
  code?: string;
  status?: number;
  statusCode?: string;
} | null | undefined;

const MESSAGES = {
  network: "Could not reach the photo service. Check your connection and try again.",
  expired: "Your sign-in has ended. Sign in again to carry on.",
  denied: "This account is not allowed to change the website's photos.",
  tooLarge: "That photo is too large to upload. Try a different photo.",
  type: "That kind of file cannot be uploaded. Use a JPEG, PNG, WebP or HEIC photo.",
  invalid: `Some details were not accepted. Check the description is at least ${MIN_ALT} characters and try again.`,
  setup:
    "The photo manager needs a one-time update to the website's database before it can manage every photo. Your developer has the steps in docs/photo-manager.md (One-time setup, step 1).",
  unknown: "Something went wrong, and nothing was changed. Try again in a moment.",
} as const;

function classify(error: ServiceError): keyof typeof MESSAGES {
  const raw = `${error?.message ?? ""} ${error?.code ?? ""}`.toLowerCase();
  const status = Number(error?.statusCode ?? error?.status ?? 0);

  // What the API says while migration 0007's tables and columns are missing.
  if (/pgrst20[045]|42703|42p01/.test(raw)) return "setup";
  if (/failed to fetch|load failed|networkerror|network request/.test(raw)) return "network";
  if (/jwt|pgrst30[0-9]|session/.test(raw) || status === 401) return "expired";
  if (/row-level security|42501|not authori[sz]ed|unauthorized|accessdenied/.test(raw) || status === 403) {
    return "denied";
  }
  if (/maximum allowed size|entitytoolarge|too large/.test(raw) || status === 413) return "tooLarge";
  if (/mime|invalidmimetype/.test(raw)) return "type";
  if (/23514|23502|23503|22023|check constraint|unknown collection/.test(raw)) return "invalid";
  return "unknown";
}

/**
 * Turns any Supabase failure into a sentence, never the raw database error.
 *
 * A refusal is checked once more before it is reported, because the usual
 * reason a write is refused here is not that someone is impersonating Nat but
 * that her session ended (she logged out in another tab, or the account's
 * sessions were revoked). If the session really is gone, it is cleared in
 * this tab too, which sends the photo manager back to the sign-in page rather
 * than leaving controls on screen that can no longer do anything.
 */
async function explain(error: ServiceError): Promise<string> {
  const kind = classify(error);
  if (kind === "expired" || kind === "denied") {
    const supabase = requireSupabase();
    const { error: userError } = await supabase.auth.getUser();
    if (userError) {
      await supabase.auth.signOut({ scope: "local" });
      return MESSAGES.expired;
    }
    return kind === "expired" ? MESSAGES.expired : MESSAGES.denied;
  }
  return MESSAGES[kind];
}

/** A write that touched no rows was refused by a policy, or found nothing. */
async function explainNoRows(): Promise<string> {
  return explain({ message: "row-level security" });
}

// ------------------------------------------------------------------- reads ---

export async function fetchAdminPhotos(): Promise<{
  set: PhotoSet | null;
  /** True when the list may be incomplete, so nothing should be swept. */
  truncated: boolean;
  error: string;
}> {
  const supabase = requireSupabase();

  /*
    Asked first, of the same function every policy uses. Without it, a
    session that has been revoked (or never promoted) would still read the
    PUBLISHED rows, which the public can see, and the list would quietly be
    missing every hidden photograph instead of saying the sign-in has ended.
  */
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError) return { set: null, truncated: true, error: await explain(adminError) };
  if (isAdmin !== true) return { set: null, truncated: true, error: await explainNoRows() };

  const limit = 1000;
  const { data, error } = await supabase
    .from("gallery_items")
    .select(PHOTO_SELECT)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { set: null, truncated: true, error: await explain(error) };
  const rows = (data as unknown as PhotoRow[] | null) ?? [];
  return { set: photoSetFromRows(rows), truncated: rows.length >= limit, error: "" };
}

// ------------------------------------------------------------------- files ---

async function removeFiles(keys: string[]): Promise<boolean> {
  if (keys.length === 0) return true;
  const supabase = requireSupabase();
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove(keys);
  return !error;
}

/** Stores the three widths under a fresh random name. */
async function storeFiles(prepared: PreparedPhoto): Promise<{ src: string; stored: string[]; error: ServiceError }> {
  const storage = requireSupabase().storage.from(PHOTO_BUCKET);

  // A fresh random name per photograph. Never reused, so each file can be
  // cached for a year and nothing ever has to be overwritten.
  const keys = variantKeys(`${PHOTO_FOLDER}/${crypto.randomUUID()}.${prepared.ext}`);
  const files: [string, Blob][] = [
    [keys.large, prepared.large],
    [keys.src, prepared.src],
    [keys.small, prepared.small],
  ];

  const stored: string[] = [];
  for (const [key, blob] of files) {
    const { error } = await storage.upload(key, blob, {
      contentType: prepared.type,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) {
      await removeFiles(stored);
      return { src: "", stored: [], error };
    }
    stored.push(key);
  }
  return { src: keys.src, stored, error: null };
}

/**
 * Whether the website can actually load a stored file: the same public URL a
 * visitor's browser will ask for, fetched past every cache.
 */
async function readable(key: string): Promise<boolean> {
  try {
    const response = await fetch(photoUrl(key), { cache: "no-store" });
    return response.ok && (response.headers.get("content-type") ?? "").startsWith("image/");
  } catch {
    return false;
  }
}

/**
 * Deletes a photograph's files now if the website as deployed never showed
 * them; otherwise leaves them for sweepOrphanFiles(). See the note at the top.
 *
 * `deployed` is every Storage key the deployment Nat is using was built with
 * (useBuiltPhotoSet in components/site-photos.tsx). Launch photographs live
 * in public/images/work/ and have nothing in Storage to delete.
 */
async function releaseFiles(src: string, deployed: ReadonlySet<string>): Promise<boolean> {
  if (src.startsWith("/")) return true;
  const keys = Object.values(variantKeys(src));
  if (keys.some((key) => deployed.has(key))) return true;
  return removeFiles(keys);
}

// ------------------------------------------------------------------ upload ---

/**
 * Stores one prepared photograph and its details.
 *
 * `order` is its display_order. The photo manager passes one more than the
 * current last photograph, so new photographs join the end of each gallery
 * and move nothing that is already there.
 */
export async function uploadPhoto(
  prepared: PreparedPhoto,
  details: PhotoDetails,
  order: number,
): Promise<{ photo: AdminPhoto | null; error: string }> {
  const supabase = requireSupabase();

  const files = await storeFiles(prepared);
  if (files.error) return { photo: null, error: await explain(files.error) };

  const { data, error } = await supabase
    .from("gallery_items")
    .insert({
      src: files.src,
      alt: details.alt.trim(),
      title: details.title.trim() || null,
      width: prepared.width,
      height: prepared.height,
      install_type: details.installType,
      featured: details.featured,
      finish_attributes: details.laceDetails,
      ...bookingServicesColumn(details),
      active: false,
      display_order: order,
    })
    .select(PHOTO_SELECT)
    .single();

  if (error || !data) {
    await removeFiles(files.stored);
    return { photo: null, error: await explain(error) };
  }
  const row = data as unknown as PhotoRow;

  const undo = async () => {
    await supabase.from("gallery_items").delete().eq("id", row.id);
    await removeFiles(files.stored);
  };

  const linked = await supabase.rpc("set_gallery_item_categories", {
    p_item_id: row.id,
    p_slugs: details.collections,
  });
  if (linked.error) {
    await undo();
    return { photo: null, error: await explain(linked.error) };
  }

  if (details.published) {
    const shown = await supabase
      .from("gallery_items")
      .update({ active: true })
      .eq("id", row.id)
      .select("id");
    if (shown.error || !shown.data?.length) {
      await undo();
      return {
        photo: null,
        error: shown.error ? await explain(shown.error) : await explainNoRows(),
      };
    }
  }

  return {
    photo: {
      ...photoFromRow(row),
      collections: [...details.collections],
      published: details.published,
    },
    error: "",
  };
}

// -------------------------------------------------------------------- edit ---

/**
 * The collection a photograph is filed under, kept through an edit where it
 * can be. The launch photographs were each filed under one style on purpose
 * (a copper body wave is filed under Body Wave though it is also Color &
 * Custom), so an edit that still includes that collection keeps it; anything
 * else falls back to "the first of its collections".
 */
function primaryAfter(photo: AdminPhoto, collections: string[]): string | null {
  return photo.primaryCollection && collections.includes(photo.primaryCollection)
    ? photo.primaryCollection
    : null;
}

export async function updatePhoto(
  photo: AdminPhoto,
  details: PhotoDetails,
): Promise<{ photo: AdminPhoto | null; error: string }> {
  const supabase = requireSupabase();

  const sameCollections =
    photo.collections.length === details.collections.length &&
    photo.collections.every((slug) => details.collections.includes(slug));

  if (!sameCollections) {
    const linked = await supabase.rpc("set_gallery_item_categories", {
      p_item_id: photo.id,
      p_slugs: details.collections,
    });
    if (linked.error) return { photo: null, error: await explain(linked.error) };
  }

  const { data, error } = await supabase
    .from("gallery_items")
    .update({
      title: details.title.trim() || null,
      alt: details.alt.trim(),
      install_type: details.installType,
      active: details.published,
      featured: details.featured,
      finish_attributes: details.laceDetails,
      ...bookingServicesColumn(details),
      primary_collection: primaryAfter(photo, details.collections),
    })
    .eq("id", photo.id)
    .select(PHOTO_SELECT);

  if (error) return { photo: null, error: await explain(error) };
  const row = (data as unknown as PhotoRow[] | null)?.[0];
  if (!row) return { photo: null, error: await explainNoRows() };
  return { photo: photoFromRow(row), error: "" };
}

/** Shows or hides a photograph without touching anything else about it. */
export async function setPublished(
  photo: AdminPhoto,
  published: boolean,
): Promise<{ photo: AdminPhoto | null; error: string }> {
  const { data, error } = await requireSupabase()
    .from("gallery_items")
    .update({ active: published })
    .eq("id", photo.id)
    .select(PHOTO_SELECT);

  if (error) return { photo: null, error: await explain(error) };
  const row = (data as unknown as PhotoRow[] | null)?.[0];
  if (!row) return { photo: null, error: await explainNoRows() };
  return { photo: photoFromRow(row), error: "" };
}

/** Saves a new order. `ids` first to last, as the gallery should show them. */
export async function reorderPhotos(ids: string[]): Promise<{ error: string }> {
  const supabase = requireSupabase();
  const { error } = await supabase.rpc("reorder_gallery_items", { p_ids: ids });
  return { error: error ? await explain(error) : "" };
}

// ----------------------------------------------------------------- replace ---

/**
 * Puts a new picture in place of an existing photograph, keeping everything
 * else about it: its collections, tags, order, visibility, and every place on
 * the site it fills. Only the picture, its size and its crop change, plus the
 * title and description if Nat edited them in the same step (a description
 * of the old picture may not fit the new one).
 *
 * The order is what makes it safe:
 *   1. upload the new files                  fails: nothing has changed
 *   2. load the new picture from its public  fails: new files removed,
 *      address, as a visitor would                   nothing has changed
 *   3. point the row at the new files, but   fails: new files removed, the
 *      only if it still holds the old ones          old photograph is intact
 *   4. release the old files (see releaseFiles)
 *
 * The condition in step 3 means two tabs replacing the same photograph at
 * once cannot leave it holding a picture neither of them chose.
 */
export async function replacePhoto(
  photo: AdminPhoto,
  prepared: PreparedPhoto,
  words: { title: string; alt: string },
  deployed: ReadonlySet<string>,
): Promise<{ photo: AdminPhoto | null; error: string; oldFilesRemoved: boolean }> {
  const supabase = requireSupabase();

  const files = await storeFiles(prepared);
  if (files.error) return { photo: null, error: await explain(files.error), oldFilesRemoved: false };

  // The smallest of the three: Storage has already confirmed each upload,
  // so this is checking the public address works, not re-downloading it all.
  if (!(await readable(variantKeys(files.src).small))) {
    await removeFiles(files.stored);
    return {
      photo: null,
      error: "The new photo was uploaded but the website could not load it, so nothing was changed. Try again in a moment.",
      oldFilesRemoved: false,
    };
  }

  const { data, error } = await supabase
    .from("gallery_items")
    .update({
      src: files.src,
      width: prepared.width,
      height: prepared.height,
      // The measured crop belonged to the old picture.
      focal_position: null,
      title: words.title.trim() || null,
      alt: words.alt.trim(),
    })
    .eq("id", photo.id)
    .eq("src", photo.src)
    .select(PHOTO_SELECT);

  const row = (data as unknown as PhotoRow[] | null)?.[0];
  if (error || !row) {
    await removeFiles(files.stored);
    if (error) return { photo: null, error: await explain(error), oldFilesRemoved: false };
    const { data: isAdmin } = await supabase.rpc("is_admin");
    return {
      photo: null,
      error:
        isAdmin === true
          ? "This photo was changed somewhere else in the meantime, so nothing was replaced. Reload the page and try again."
          : await explainNoRows(),
      oldFilesRemoved: false,
    };
  }

  const oldFilesRemoved = await releaseFiles(photo.src, deployed);
  return { photo: photoFromRow(row), error: "", oldFilesRemoved };
}

// ------------------------------------------------------------------ places ---

/**
 * Chooses the photograph for one fixed place on the site, or none (a finish
 * swatch with no photograph renders a plain swatch). The site falls back by
 * itself when the chosen photograph is hidden, so this never has to be
 * undone to keep the site whole.
 */
export async function setSlot(slot: SlotId, photoId: string | null): Promise<{ error: string }> {
  const { data, error } = await requireSupabase()
    .from("site_photo_slots")
    .upsert({ slot, item_id: photoId }, { onConflict: "slot" })
    .select("slot");
  if (error) return { error: await explain(error) };
  if (!data?.length) return { error: await explainNoRows() };
  return { error: "" };
}

/** Chooses a collection's cover or its second photograph. */
export async function setCollectionPhoto(
  slug: string,
  which: "cover" | "second",
  photoId: string,
): Promise<{ error: string }> {
  const { data, error } = await requireSupabase()
    .from("gallery_categories")
    .update(which === "cover" ? { hero_item_id: photoId } : { hover_item_id: photoId })
    .eq("slug", slug)
    .select("slug");
  if (error) return { error: await explain(error) };
  if (!data?.length) return { error: await explainNoRows() };
  return { error: "" };
}

// ------------------------------------------------------------------ remove ---

export async function deletePhoto(
  photo: AdminPhoto,
  deployed: ReadonlySet<string>,
): Promise<{
  removed: boolean;
  /** False while the deployed website may still show the file; it goes later. */
  filesRemoved: boolean;
  error: string;
}> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("gallery_items")
    .delete()
    .eq("id", photo.id)
    .select("id");

  if (error) return { removed: false, filesRemoved: false, error: await explain(error) };

  if (!data?.length) {
    /*
      Nothing was deleted. Either it was already gone (removed in another
      tab), which is the outcome Nat wanted, or a policy refused, which is
      not. Asking the database whether this caller is an admin tells the two
      apart without guessing.
    */
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (isAdmin !== true) {
      return { removed: false, filesRemoved: false, error: await explainNoRows() };
    }
  }

  const filesRemoved = await releaseFiles(photo.src, deployed);
  return { removed: true, filesRemoved, error: "" };
}

/**
 * Deletes files in the bucket that nothing uses any more: no photograph
 * points at them, and the deployment Nat is looking at was not built with
 * them. That covers an upload that died between its files and its row, a
 * removal or replacement whose files were held back for the live site, and
 * one whose delete failed.
 *
 * Only files more than a day old are touched, so an upload still in progress
 * in another tab, or on a device whose clock is wrong, is never mistaken for
 * one.
 *
 * Returns how many files were removed. Never throws and never reports: it is
 * housekeeping, and a failure here changes nothing a visitor can see.
 */
const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;

function stemOf(key: string): string {
  return key.replace(/\.[a-z0-9]+$/i, "").replace(/-(600|1600)$/, "");
}

export async function sweepOrphanFiles(
  photos: AdminPhoto[],
  deployed: ReadonlySet<string>,
): Promise<number> {
  try {
    const supabase = requireSupabase();
    const storage = supabase.storage.from(PHOTO_BUCKET);
    const known = new Set(photos.map((photo) => stemOf(photo.src)));
    for (const key of deployed) known.add(stemOf(key));
    const cutoff = Date.now() - ORPHAN_AGE_MS;
    const orphans: string[] = [];

    for (let offset = 0; offset < 10_000; offset += 1000) {
      const { data, error } = await storage.list(PHOTO_FOLDER, { limit: 1000, offset });
      if (error || !data) return 0;
      for (const object of data) {
        const key = `${PHOTO_FOLDER}/${object.name}`;
        // Folders come back with a null id; only files are candidates.
        if (!object.id || known.has(stemOf(key))) continue;
        const created = Date.parse(object.created_at ?? "");
        if (Number.isFinite(created) && created < cutoff) orphans.push(key);
      }
      if (data.length < 1000) break;
    }

    if (orphans.length === 0) return 0;
    return (await removeFiles(orphans)) ? orphans.length : 0;
  } catch {
    return 0;
  }
}
