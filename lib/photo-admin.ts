"use client";

import { requireSupabase } from "@/lib/supabase/client";
import type { Photo } from "@/lib/collections";
import type { InstallTypeId } from "@/lib/taxonomy";
import type { PreparedPhoto } from "@/lib/photo-processing";
import {
  PHOTO_BUCKET,
  PHOTO_COLUMNS,
  PHOTO_FOLDER,
  rowCollections,
  rowPhoto,
  variantKeys,
  type PhotoRow,
} from "@/lib/uploaded-photos";

/**
 * Everything the photo manager reads and writes.
 *
 * ---------------------------------------------------------------------------
 * NONE OF THIS CHECKS WHETHER THE CALLER IS NAT
 * ---------------------------------------------------------------------------
 * Same rule as lib/admin.ts. Every function below is an ordinary request,
 * and Postgres and Storage answer it according to is_admin(). A customer
 * importing this file would get permission errors and nothing else: the
 * table policies from 0002 and the Storage policies from 0006 are the
 * control, and a check in here would only be a second, weaker copy of them.
 *
 * ---------------------------------------------------------------------------
 * NO HALF-FINISHED PHOTOGRAPHS
 * ---------------------------------------------------------------------------
 * An upload is three files, a row and its collections, and any step can fail
 * on a phone signal. The row is written hidden, published only once
 * everything else is in place, and every failure removes what came before it.
 * A visitor therefore sees a photograph completely or not at all.
 *
 * Deleting removes the row first and the files second. If the files cannot
 * be removed the photograph is already off the site, which is what Nat asked
 * for; the leftover files are swept up by sweepOrphanFiles() the next time
 * the photo manager opens.
 */

export type AdminPhoto = {
  id: string;
  /** Storage key of the 1200w file; the other two widths sit beside it. */
  src: string;
  title: string;
  alt: string;
  installType: InstallTypeId | null;
  /** Collection slugs, matching lib/collections.ts. */
  collections: string[];
  published: boolean;
  order: number;
  createdAt: string;
  photo: Photo;
};

/** The fields Nat fills in, for a new photograph or an existing one. */
export type PhotoDetails = {
  title: string;
  alt: string;
  collections: string[];
  installType: InstallTypeId | null;
  published: boolean;
};

/** gallery_items.alt has a CHECK for this in 0002. */
export const MIN_ALT = 10;
export const MAX_ALT = 300;
export const MAX_TITLE = 80;

function toAdminPhoto(row: PhotoRow): AdminPhoto {
  return {
    id: row.id,
    src: row.src,
    title: row.title ?? "",
    alt: row.alt,
    installType: row.install_type,
    collections: rowCollections(row),
    published: row.active,
    order: row.display_order,
    createdAt: row.created_at,
    photo: rowPhoto(row),
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
  unknown: "Something went wrong, and nothing was changed. Try again in a moment.",
} as const;

function classify(error: ServiceError): keyof typeof MESSAGES {
  const raw = `${error?.message ?? ""} ${error?.code ?? ""}`.toLowerCase();
  const status = Number(error?.statusCode ?? error?.status ?? 0);

  if (/failed to fetch|load failed|networkerror|network request/.test(raw)) return "network";
  if (/jwt|pgrst30[0-9]|session/.test(raw) || status === 401) return "expired";
  if (/row-level security|42501|not authori[sz]ed|unauthorized|accessdenied/.test(raw) || status === 403) {
    return "denied";
  }
  if (/maximum allowed size|entitytoolarge|too large/.test(raw) || status === 413) return "tooLarge";
  if (/mime|invalidmimetype/.test(raw)) return "type";
  if (/23514|23502|22023|check constraint|unknown collection/.test(raw)) return "invalid";
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
  photos: AdminPhoto[];
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
  if (adminError) return { photos: [], truncated: true, error: await explain(adminError) };
  if (isAdmin !== true) return { photos: [], truncated: true, error: await explainNoRows() };

  const limit = 1000;
  const { data, error } = await supabase
    .from("gallery_items")
    .select(PHOTO_COLUMNS)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { photos: [], truncated: true, error: await explain(error) };
  const rows = (data as unknown as PhotoRow[] | null) ?? [];
  return { photos: rows.map(toAdminPhoto), truncated: rows.length >= limit, error: "" };
}

// ------------------------------------------------------------------ upload ---

async function removeFiles(keys: string[]): Promise<boolean> {
  if (keys.length === 0) return true;
  const supabase = requireSupabase();
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove(keys);
  return !error;
}

/**
 * Stores one prepared photograph and its details.
 *
 * `order` is its display_order. The photo manager passes one less than the
 * current first photograph, so a new upload leads the uploads.
 */
export async function uploadPhoto(
  prepared: PreparedPhoto,
  details: PhotoDetails,
  order: number,
): Promise<{ photo: AdminPhoto | null; error: string }> {
  const supabase = requireSupabase();
  const storage = supabase.storage.from(PHOTO_BUCKET);

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
      return { photo: null, error: await explain(error) };
    }
    stored.push(key);
  }

  const { data, error } = await supabase
    .from("gallery_items")
    .insert({
      src: keys.src,
      alt: details.alt.trim(),
      title: details.title.trim() || null,
      width: prepared.width,
      height: prepared.height,
      install_type: details.installType,
      active: false,
      display_order: order,
    })
    .select(PHOTO_COLUMNS)
    .single();

  if (error || !data) {
    await removeFiles(stored);
    return { photo: null, error: await explain(error) };
  }
  const row = data as unknown as PhotoRow;

  const undo = async () => {
    await supabase.from("gallery_items").delete().eq("id", row.id);
    await removeFiles(stored);
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
      ...toAdminPhoto(row),
      collections: [...details.collections],
      published: details.published,
    },
    error: "",
  };
}

// -------------------------------------------------------------------- edit ---

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
    })
    .eq("id", photo.id)
    .select(PHOTO_COLUMNS);

  if (error) return { photo: null, error: await explain(error) };
  const row = (data as unknown as PhotoRow[] | null)?.[0];
  if (!row) return { photo: null, error: await explainNoRows() };
  return { photo: toAdminPhoto(row), error: "" };
}

/** Saves a new order. `ids` first to last, as the gallery should show them. */
export async function reorderPhotos(ids: string[]): Promise<{ error: string }> {
  const supabase = requireSupabase();
  const { error } = await supabase.rpc("reorder_gallery_items", { p_ids: ids });
  return { error: error ? await explain(error) : "" };
}

// ------------------------------------------------------------------ remove ---

export async function deletePhoto(photo: AdminPhoto): Promise<{
  removed: boolean;
  /** False when the row is gone but its files could not be deleted yet. */
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

  if (photo.src.startsWith("/")) return { removed: true, filesRemoved: true, error: "" };

  const keys = variantKeys(photo.src);
  const filesRemoved = await removeFiles([keys.src, keys.small, keys.large]);
  return { removed: true, filesRemoved, error: "" };
}

/**
 * Deletes files in the bucket that no row points at: what is left when an
 * upload dies between its files and its row, or a removal could not delete
 * the files. Only files more than a day old are touched, so an upload still
 * in progress in another tab, or on a device whose clock is wrong, is never
 * mistaken for one.
 *
 * Returns how many files were removed. Never throws and never reports: it is
 * housekeeping, and a failure here changes nothing a visitor can see.
 */
const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;

function stemOf(key: string): string {
  return key.replace(/\.[a-z0-9]+$/i, "").replace(/-(600|1600)$/, "");
}

export async function sweepOrphanFiles(photos: AdminPhoto[]): Promise<number> {
  try {
    const supabase = requireSupabase();
    const storage = supabase.storage.from(PHOTO_BUCKET);
    const known = new Set(photos.map((photo) => stemOf(photo.src)));
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
