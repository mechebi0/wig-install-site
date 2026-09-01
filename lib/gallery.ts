/**
 * THE DATA SEAM for the gallery.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS IS FOR
 * ---------------------------------------------------------------------------
 * Every component that shows a collection or a photograph reads it through one
 * of the functions below, and none of them imports lib/collections.ts
 * directly. Today those functions return the compiled-in constants. When Nat
 * has a Supabase project and an admin screen for the gallery, they return rows
 * instead, and not one component changes.
 *
 * That is the whole job: keep the read path in one file so the source of the
 * data is a detail rather than an assumption spread across eight components.
 *
 * ---------------------------------------------------------------------------
 * WHY THE DATA IS STILL COMPILED IN, AND WHY THAT IS NOT A STOPGAP
 * ---------------------------------------------------------------------------
 * This is a static export. There is no server render to fetch during, so a
 * database-backed gallery would ship an empty page and fill it in after
 * hydration: no photographs in the HTML, nothing for a search engine to index
 * on six collection pages whose entire purpose is photographs, and a layout
 * shift on every visit. A compiled-in constant renders in the first paint,
 * cannot fail, and is in git.
 *
 * So the constants are the right answer until there is a reason to move, and
 * the reason will be a specific one: Nat wanting to add a look without a
 * deploy. When that day comes the migration path is already written, in
 * supabase/migrations/0002_gallery_reviews_settings.sql, and the swap is
 * inside the four functions below.
 *
 * The pattern is the one lib/catalog.ts already uses for services: compiled-in
 * rows are the first frame, live rows replace them, and a `live` flag says
 * which you are looking at. It is deliberately the same pattern so there is
 * one idea in this codebase rather than two.
 *
 * ---------------------------------------------------------------------------
 * WHAT MUST NOT HAPPEN HERE
 * ---------------------------------------------------------------------------
 * These are server-safe reads: every function is synchronous and pure, and the
 * collection pages call them during the static export. Do not make them async
 * or add a browser-only client to this module without also giving the
 * collection pages a compiled-in first frame to render, or the export will
 * emit six pages of empty grids.
 */

import {
  COLLECTIONS_IN_ORDER,
  getCollection,
  relatedCollections,
  type Photo,
  type StyleCollection,
} from "@/lib/collections";

/**
 * Says where a collection came from, so a future admin screen can badge
 * anything still coming out of the bundle rather than out of the database.
 * Mirrors `CatalogService.live` in lib/catalog.ts.
 */
export const galleryIsLive = false;

/** Every collection, in reading order. */
export function listCollections(): StyleCollection[] {
  return COLLECTIONS_IN_ORDER;
}

/** One collection by slug, or undefined. */
export function findCollection(slug: string): StyleCollection | undefined {
  return getCollection(slug);
}

/** The rail at the foot of a collection page. Never returns the current one. */
export function suggestCollections(slug: string, count = 3): StyleCollection[] {
  return relatedCollections(slug, count);
}

/** Every photograph in a collection, in the order it should be read. */
export function collectionPhotos(collection: StyleCollection): Photo[] {
  return collection.gallery;
}
