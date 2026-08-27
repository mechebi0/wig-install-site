"use client";

/**
 * Where to send someone after they sign in, and how to be sure it is somewhere
 * on this site.
 *
 * ---------------------------------------------------------------------------
 * THE OPEN REDIRECT THIS PREVENTS
 * ---------------------------------------------------------------------------
 * The gated routes bounce a signed-out visitor to /login/?next=/admin/ so that
 * logging in returns them where they were going. That parameter is in the URL,
 * which means it is attacker-controlled, and the naive implementation is
 * `location.assign(params.get("next"))`.
 *
 * That one line is an open redirect. A link to
 *
 *     crownbynat.com/login/?next=https://crownbynat.evil.example/
 *
 * shows the real domain in the address bar, shows a real Crown by Nat login
 * form, and hands the visitor to a copy of it the moment they authenticate.
 * The phish borrows the site's own credibility, and the site did the
 * redirecting itself.
 *
 * So `next` is never trusted as a destination. It is validated to be a
 * same-origin path and discarded otherwise, silently, falling back to the
 * account page. Four things are rejected, and the last two are the ones people
 * forget:
 *
 *   "https://evil.example"  absolute URL, not a path
 *   "//evil.example"        protocol-relative; browsers treat it as absolute
 *   "/\evil.example"        Chrome and Safari have historically read a
 *                           backslash here as a second slash
 *   "javascript:..."        does not start with "/", so it is out already, but
 *                           it is worth knowing that is why
 *
 * The allowlist below then narrows it further: even a valid same-origin path
 * only counts if it is one of the pages that actually gates. There is no
 * reason for a login to bounce anywhere else, and an allowlist cannot be
 * out-thought the way a denylist can.
 */

export const ACCOUNT_PATH = "/account/";
export const ADMIN_PATH = "/admin/";
export const LOGIN_PATH = "/login/";

/** The only destinations a `next` parameter may name. */
const ALLOWED_NEXT = [ACCOUNT_PATH, ADMIN_PATH, "/book/"] as const;

export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  if (raw.includes("\\")) return null;

  const normalised = raw.endsWith("/") ? raw : `${raw}/`;
  return ALLOWED_NEXT.includes(normalised as (typeof ALLOWED_NEXT)[number])
    ? normalised
    : null;
}

/**
 * Reads `?next=` from the live URL.
 *
 * `window.location.search` rather than Next's useSearchParams, and that is not
 * a style preference. Under `output: "export"`, a component calling
 * useSearchParams has to be wrapped in a Suspense boundary or the build fails
 * with a prerender error, and the value it returns on a static page is empty
 * on first render anyway. Reading the URL directly inside an effect is both
 * simpler and the only version that actually works here.
 */
export function readNextParam(): string | null {
  if (typeof window === "undefined") return null;
  return safeNextPath(new URLSearchParams(window.location.search).get("next"));
}

/** Builds the login URL that will come back to `path` afterwards. */
export function loginUrlFor(path: string): string {
  return `${LOGIN_PATH}?next=${encodeURIComponent(path)}`;
}

/**
 * Leaves for `path`.
 *
 * A full navigation rather than a router push, for the reason recorded in
 * components/button.tsx: client side routing is switched off across this site
 * because the static export writes RSC payloads to paths the client never asks
 * for. Using the router here would be the one inconsistent navigation on the
 * site and would 404 its prefetch on the way.
 *
 * `replace` is used after signing in so the back button does not return the
 * visitor to a login form they have already completed.
 */
export function leaveTo(path: string, replace = false): void {
  if (replace) window.location.replace(path);
  else window.location.assign(path);
}

/** Account or admin, whichever this profile should land on. */
export function homeForRole(role: string | null | undefined): string {
  return role === "admin" ? ADMIN_PATH : ACCOUNT_PATH;
}
