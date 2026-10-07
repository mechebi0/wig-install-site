"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { FinishAttribute, GalleryItem, Photo } from "@/lib/collections";
import type { GalleryItem as GalleryItemRow } from "@/lib/supabase/types";
import type { InstallTypeId } from "@/lib/taxonomy";

/**
 * The photographs Nat uploads from /admin/photos/, read back for the public
 * site.
 *
 * ---------------------------------------------------------------------------
 * ADDED AFTER THE BUILT-IN SET, NEVER INSTEAD OF IT
 * ---------------------------------------------------------------------------
 * The photographs in lib/collections.ts are still the first frame of every
 * gallery: they are in the HTML, they cannot fail, and the site looks
 * exactly as it did before uploads existed (see the note at the top of
 * lib/gallery.ts for why that matters on a static export). Uploads arrive
 * after hydration and are appended to the end of the grid.
 *
 * The end, not the start, and on purpose. Appending moves nothing that is
 * already on screen, so the layout-shift score stays at zero; putting new
 * photographs first would shove the whole grid down a second after it
 * painted. Within the uploads, Nat's own order from the photo manager is
 * kept.
 *
 * If Supabase is not configured, or the request fails, the uploads are simply
 * absent. A visitor never sees an error for this.
 *
 * ---------------------------------------------------------------------------
 * HOW A ROW BECOMES A PHOTOGRAPH
 * ---------------------------------------------------------------------------
 * `src` is a key in the public `website-photos` bucket, e.g.
 * gallery/<uuid>.webp, and the other two widths sit beside it as
 * gallery/<uuid>-600.webp and gallery/<uuid>-1600.webp: the same three-width
 * naming as public/images/work/, so a Photo built from a row is
 * indistinguishable from a built-in one to every component that renders it.
 *
 * Which rows come back is decided by row level security, not by this file:
 * the public can read published rows and nothing else. The `active` filter
 * below only matters when Nat herself is browsing the site signed in, since
 * she can read her hidden photographs too.
 */

export const PHOTO_BUCKET = "website-photos";
/** Every upload lands under this prefix; the Storage policy refuses others. */
export const PHOTO_FOLDER = "gallery";

/** What a gallery cell, its hover caption and the lightbox actually read. */
export type GalleryCell = Pick<
  GalleryItem,
  "id" | "image" | "alt" | "title" | "installType" | "finishAttributes" | "focalPosition"
>;

/** One gallery_items row as PHOTO_COLUMNS selects it, collections embedded. */
export type PhotoRow = Pick<
  GalleryItemRow,
  "id" | "src" | "alt" | "title" | "width" | "height" | "active" | "display_order" | "created_at"
> & {
  install_type: InstallTypeId | null;
  gallery_item_categories:
    | { gallery_categories: { slug: string } | null }[]
    | null;
};

export const PHOTO_COLUMNS =
  "id, src, alt, title, width, height, install_type, active, display_order, created_at, gallery_item_categories(gallery_categories(slug))";

/**
 * Uploads are not measured frame by frame the way the built-in set is. Phone
 * portraits put the hairline in the upper third, so a cell that has to crop
 * a tall frame keeps the top of it.
 */
const UPLOAD_FOCAL = "center 30%";

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

/** A Storage key as a public URL. A site path is returned untouched. */
export function publicUrl(key: string): string {
  if (key.startsWith("/")) return key;
  const supabase = getSupabase();
  return supabase ? supabase.storage.from(PHOTO_BUCKET).getPublicUrl(key).data.publicUrl : "";
}

/** The collection slugs a row belongs to, in no particular order. */
export function rowCollections(row: PhotoRow): string[] {
  return (row.gallery_item_categories ?? []).flatMap((link) =>
    link.gallery_categories?.slug ? [link.gallery_categories.slug] : [],
  );
}

export function rowPhoto(row: PhotoRow): Photo {
  const keys = variantKeys(row.src);
  return {
    src: publicUrl(keys.src),
    small: publicUrl(keys.small),
    large: publicUrl(keys.large),
    width: row.width,
    height: row.height,
    alt: row.alt,
  };
}

function rowCell(row: PhotoRow): GalleryCell {
  // Natural Lace is a finish, not a style (see lib/collections.ts), and the
  // gallery caption lists finishes, so membership of that collection is what
  // a built-in item would carry as its finish attribute.
  const finishes: FinishAttribute[] = rowCollections(row).includes("natural-lace")
    ? ["natural-lace"]
    : [];
  return {
    id: `upload-${row.id}`,
    image: rowPhoto(row),
    alt: row.alt,
    title: row.title ?? "",
    installType: row.install_type,
    finishAttributes: finishes,
    focalPosition: UPLOAD_FOCAL,
  };
}

/*
  One request per page, however many components ask. The homepage renders six
  collection cards that each want a count; they share this promise rather than
  sending six identical queries. A failure clears it so the next page load
  tries again.
*/
let published: Promise<PhotoRow[]> | null = null;

function fetchPublished(): Promise<PhotoRow[]> {
  const supabase = getSupabase();
  if (!supabase) return Promise.resolve([]);

  if (!published) {
    published = Promise.resolve(
      supabase
        .from("gallery_items")
        .select(PHOTO_COLUMNS)
        .eq("active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(500),
    ).then(
      ({ data, error }) => {
        if (error) {
          published = null;
          return [];
        }
        return ((data as unknown as PhotoRow[] | null) ?? []).filter(
          (row) => !row.src.startsWith("/"),
        );
      },
      () => {
        published = null;
        return [];
      },
    );
  }
  return published;
}

function usePublishedRows(enabled: boolean): PhotoRow[] {
  const [rows, setRows] = useState<PhotoRow[]>([]);

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured) return;
    let live = true;
    void fetchPublished().then((found) => {
      if (live) setRows(found);
    });
    return () => {
      live = false;
    };
  }, [enabled]);

  return rows;
}

export type UploadedFilter =
  | { collection: string }
  | { installType: InstallTypeId };

/**
 * Published uploads for one collection or one install type, as gallery cells.
 * Pass nothing to opt out; the hook still has to be called, but sends no
 * request.
 */
export function useUploadedPhotos(filter?: UploadedFilter): GalleryCell[] {
  const collection = filter && "collection" in filter ? filter.collection : null;
  const installType = filter && "installType" in filter ? filter.installType : null;
  const rows = usePublishedRows(collection !== null || installType !== null);

  return useMemo(
    () =>
      rows
        .filter((row) =>
          collection !== null
            ? rowCollections(row).includes(collection)
            : row.install_type === installType,
        )
        .map(rowCell),
    [rows, collection, installType],
  );
}
