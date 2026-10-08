import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { cache } from "react";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  PHOTO_SELECT,
  launchPhotoSet,
  photoSetFromRows,
  type PhotoRow,
  type PhotoSet,
} from "@/lib/site-photos";

/**
 * The photographs the static pages are built with. BUILD-TIME ONLY: called
 * from server components and generateMetadata during `next build`, never from
 * the browser (which uses the Supabase client in components/site-photos.tsx).
 *
 * ---------------------------------------------------------------------------
 * WHY THE BUILD ASKS THE DATABASE AT ALL
 * ---------------------------------------------------------------------------
 * This is a static export, so whatever is in the HTML is what a search engine
 * indexes, what a link preview shows and what a visitor sees before the
 * page's JavaScript runs. Reading the published photographs here puts Nat's
 * current choices in all three. The browser still checks for anything newer
 * once the page has loaded, which covers the minutes between a change in the
 * photo manager and the next deployment.
 *
 * ---------------------------------------------------------------------------
 * NOT THROUGH NEXT'S fetch(), ON PURPOSE
 * ---------------------------------------------------------------------------
 * Every deployment must read the database as it is at that moment, or a
 * photograph Nat removed could be rebuilt into the pages. Next's patched
 * fetch() does not guarantee that during a static build: verified on Next
 * 16.3.3, a plain fetch() here was written to .next/cache/fetch-cache and
 * served from it by every later build, so the pages never changed again.
 * Cloudflare Pages can restore that folder between builds. So this asks
 * Supabase with Node's own HTTP client, which nothing caches, and React's
 * cache() shares the one answer across the layout, the page and its
 * metadata within a single page's render.
 *
 * ---------------------------------------------------------------------------
 * WHEN THE ANSWER IS NOT A LIST OF PHOTOGRAPHS
 * ---------------------------------------------------------------------------
 *   no Supabase project      the launch set (lib/collections.ts), exactly as
 *                            the site has always built on a clean clone
 *   0007 not applied yet     the launch set, with a warning in the build log.
 *                            The database has no website photographs to
 *                            give, and the launch set is what it will be
 *                            seeded with.
 *   anything else            THE BUILD FAILS. Falling back to the launch set
 *                            here would quietly republish photographs Nat may
 *                            have removed, because a client asked her to.
 *                            A failed build leaves the last deployment live,
 *                            which is the safe outcome; retry it once
 *                            Supabase answers.
 */
/** Once per build worker is enough to say 0007 is missing. */
let warnedMissingSchema = false;

export const loadPhotoSet = cache(async (): Promise<PhotoSet> => {
  if (!isSupabaseConfigured) return launchPhotoSet();

  const url = new URL(`${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/gallery_items`);
  url.searchParams.set("select", PHOTO_SELECT);
  url.searchParams.set("active", "eq.true");
  url.searchParams.set("order", "display_order.asc,created_at.desc");
  url.searchParams.set("limit", "500");

  let response: { status: number; body: unknown };
  try {
    response = await getJson(url, {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: "application/json",
    });
  } catch (error) {
    throw new Error(
      `Could not reach Supabase to read the website's photographs (${String(error)}). ` +
        "The build stops rather than publish an out-of-date set; retry the deployment once Supabase answers.",
    );
  }

  if (response.status === 200 && Array.isArray(response.body)) {
    return photoSetFromRows(response.body as PhotoRow[]);
  }

  const body = response.body as { code?: string; message?: string } | null;
  if (isMissingSchema(body?.code)) {
    if (warnedMissingSchema) return launchPhotoSet();
    warnedMissingSchema = true;
    console.warn(
      "[site-photos] Supabase does not have migration 0007 yet (" +
        `${body?.code}: ${body?.message}). Building with the launch photographs; ` +
        "run supabase/migrations/0007_website_photos.sql, then redeploy.",
    );
    return launchPhotoSet();
  }

  throw new Error(
    `Supabase refused the website photographs (HTTP ${response.status}${body?.code ? `, ${body.code}` : ""}: ` +
      `${body?.message ?? "no message"}). The build stops rather than publish an out-of-date set.`,
  );
});

/** One GET, parsed as JSON where it is JSON. Gives up after 30 seconds. */
function getJson(url: URL, headers: Record<string, string>): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const send = url.protocol === "http:" ? httpRequest : httpsRequest;
    const request = send(url, { method: "GET", headers, timeout: 30_000 }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.on("error", reject);
      response.on("end", () => {
        let body: unknown = null;
        try {
          body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        } catch {
          // Not JSON (a proxy's error page): reported by status alone.
        }
        resolve({ status: response.statusCode ?? 0, body });
      });
    });
    request.on("timeout", () => request.destroy(new Error("no answer within 30 seconds")));
    request.on("error", reject);
    request.end();
  });
}

/*
  What PostgREST answers when the tables or columns 0007 adds are not there:
  an unknown column, an unknown relationship (site_photo_slots), or an
  unknown table. Nothing else counts, so an outage, a paused project or a
  revoked key still fails loudly. (A misspelt column would also read as
  "not migrated"; the warning in the build log is how to tell.)
*/
function isMissingSchema(code: string | undefined): boolean {
  return code === "42703" || code === "42P01" || code === "PGRST200" || code === "PGRST204" || code === "PGRST205";
}
