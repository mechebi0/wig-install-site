/**
 * The one Supabase client, and the one place that decides whether Supabase is
 * configured at all.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS CAN RETURN null
 * ---------------------------------------------------------------------------
 * `npx next build` has to succeed on a clean clone, in CI, and on a Cloudflare
 * Pages preview branch where nobody has pasted the environment variables in
 * yet. If this module threw when the keys were missing, the static export
 * would fail at prerender and the whole site would be down because the booking
 * database was not wired up.
 *
 * So a missing configuration is a first-class state rather than a crash.
 * `isSupabaseConfigured` is false, `getSupabase()` returns null, and every
 * caller renders something honest: /book falls back to the original email
 * request form, and the account and admin routes say plainly that the booking
 * system is not connected. The site degrades to exactly what it was before
 * this feature existed, which is a working website.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS AND IS NOT SAFE TO PUT HERE
 * ---------------------------------------------------------------------------
 * NEXT_PUBLIC_* variables are inlined into the JavaScript bundle by the
 * compiler. Anyone can read them out of the deployed site. That is fine and
 * intended for these two:
 *
 *   NEXT_PUBLIC_SUPABASE_URL       a public hostname
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY  a public identifier, designed to be shipped
 *
 * The anon key is not a password. It identifies the project and carries the
 * `anon` Postgres role, and every single thing it can do is bounded by the
 * row level security policies in supabase/migrations/. Publishing it is the
 * documented design of the product.
 *
 * SUPABASE_SERVICE_ROLE_KEY IS A DIFFERENT ANIMAL. It bypasses RLS entirely.
 * It must never appear in this file, in any file under app/ or components/,
 * in .env.local with a NEXT_PUBLIC_ prefix, or in the Cloudflare Pages build
 * environment. There is no server runtime in this deployment for it to live
 * in, so there is no legitimate use for it here at all.
 *
 * ---------------------------------------------------------------------------
 * WHY THE VARIABLES ARE READ AS TWO LITERAL EXPRESSIONS
 * ---------------------------------------------------------------------------
 * Next replaces `process.env.NEXT_PUBLIC_FOO` by matching that exact text
 * during the build. A helper like `read("NEXT_PUBLIC_SUPABASE_URL")` compiles
 * to a lookup on an object that does not exist in the browser, and the value
 * silently comes back undefined in production while working perfectly in dev.
 * Hence the two plain, un-refactorable references below.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

let client: SupabaseClient | null = null;

/**
 * Returns the browser client, or null when the project is not configured.
 *
 * Created lazily and memoised. Two clients in one tab means two copies of the
 * session in memory and two token-refresh timers racing each other, which
 * shows up as a user being signed out at random.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (client) return client;

  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      // The session lives in localStorage and is refreshed in the background.
      // It holds a short-lived access token and a refresh token, NOT a
      // password, and it is scoped to this origin.
      persistSession: true,
      autoRefreshToken: true,
      /*
        Password reset and email confirmation both land back on this site with
        credentials in the URL. This is what reads them, establishes the
        session and then strips them out of the address bar so the link cannot
        be shoulder-surfed or pasted into a chat window afterwards.
      */
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });

  return client;
}

/**
 * For the handful of call sites that have already checked
 * `isSupabaseConfigured` and would otherwise need a null branch purely to
 * satisfy the compiler. It throws rather than returning a fake client, so a
 * mistake here is a loud error in development and never a silent no-op.
 */
export function requireSupabase(): SupabaseClient {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return supabase;
}

/**
 * Where Supabase should send someone back to after they click a link in an
 * email. Read from the live origin rather than a build-time constant, so the
 * same bundle works on localhost, on a Cloudflare preview deployment and on
 * the production domain without being rebuilt.
 *
 * Every origin used has to be listed under Authentication -> URL Configuration
 * -> Redirect URLs in the Supabase dashboard. Supabase rejects anything not on
 * that list, which is what stops this being an open redirect.
 */
export function authRedirectTo(path: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  return new URL(path, window.location.origin).toString();
}
