import { CONTENT_RULES, DEFAULT_CONTENT } from "@/lib/cms/defaults";
import { readPublished, resolveContent } from "@/lib/cms/model";

/**
 * THE WORDS THIS DEPLOYMENT WAS BUILT WITH.
 *
 * next.config.ts asks Supabase for the current release once, when `next
 * build` starts, and hands it to the compiler as CBN_SITE_CONTENT. Next
 * writes that value into every bundle that reads it, server and browser
 * alike, so the prerendered HTML and the JavaScript that hydrates it hold
 * the same words: nothing on a page swaps after it loads, and nothing waits
 * on the database while a visitor is looking at it.
 *
 * The cost of that is the one Nat sees in the dashboard: a published change
 * reaches the site when the site is next built. Publishing asks Cloudflare
 * for that build (supabase/migrations/0011_website_content.sql), and the
 * dashboard watches /content-version.json for it to go live.
 *
 * With nothing published, or no Supabase at all (a clean clone), the site is
 * built from DEFAULT_CONTENT, which is exactly what it said before the
 * content manager existed.
 */
export const PUBLISHED = readPublished(process.env.CBN_SITE_CONTENT);

const resolved = resolveContent(PUBLISHED?.content, DEFAULT_CONTENT, CONTENT_RULES);

/** Every editable word on the site, as published (or as shipped). */
export const SITE = resolved.content;

/** Where Nat is working: the current location first, then the others. */
export const PLACES = resolved.places;
