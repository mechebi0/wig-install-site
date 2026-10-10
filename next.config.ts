import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

const nextConfig: NextConfig = {
  /*
    PRESERVED: static export for Cloudflare Pages.

    Pages project settings this must stay compatible with:
      production branch : main
      framework         : Next.js (Static HTML Export)
      build command     : npx next build
      output directory  : out
      root directory    : /

    Do not remove either setting below, and do not introduce API routes,
    server actions, middleware, or ISR: the optimizer and the Node server do
    not exist on a static host, and any of those would break the deployment.
  */
  output: "export",

  /*
    Emits every route as `<route>/index.html` rather than `<route>.html`.

    With the site split across /work, /book, /before-you-book, /reviews and
    /meet-nat, this is what makes the export portable: a directory with an
    index file resolves on any static host, including plain file servers,
    whereas extension-less `/book` only works where the host is configured to
    try `book.html`. Cloudflare Pages handles either, so this costs nothing
    there and removes a class of "works locally, 404s somewhere else".
  */
  trailingSlash: true,
  images: {
    // Required by `output: "export"`. All photography is committed under
    // public/images/ and pre-sized there, so no remote hosts are needed and
    // no third-party CDN can break the deployed site.
    unoptimized: true,
  },
};

/*
  THE WEBSITE'S WORDS, READ ONCE PER BUILD.

  Nat edits the site's text in the dashboard at /admin/ and publishes it as a
  release (supabase/migrations/0011_website_content.sql). This asks Supabase
  for the current release before anything is compiled and hands it to every
  page as CBN_SITE_CONTENT (read in lib/cms/published.ts). It runs here, not
  in a page, because the build command is plain `npx next build` (above): no
  step before it, and every page and both halves of every page, server and
  browser, must hold the same release. One read at the start guarantees
  that; the answer is kept in this process's environment so a build worker
  that loads this file again reuses it rather than asking a second time.

  Node's own HTTP client, not fetch(): Next's fetch cache can serve an older
  answer to a later build (see lib/site-photos-server.ts).

    no Supabase configured   ""  and the site is built from the defaults
    nothing published yet    ""  likewise
    0011 not applied yet     ""  with a warning in the build log
    anything else            THE BUILD FAILS, as the photographs do: falling
                             back would republish words Nat has replaced.
                             Cloudflare keeps the last deployment live; retry
                             once Supabase answers. `next dev` warns instead.
*/
const SNAPSHOT_KEY = "CBN_SITE_CONTENT_SNAPSHOT";

async function readSiteContent(failHard: boolean): Promise<string> {
  const cached = process.env[SNAPSHOT_KEY];
  if (cached !== undefined) return cached;

  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  let snapshot = "";

  if (base && key) {
    const url = new URL(`${base}/rest/v1/site_content_releases`);
    url.searchParams.set("select", "id,content,published_at");
    url.searchParams.set("is_current", "eq.true");
    url.searchParams.set("limit", "1");

    try {
      const { status, body } = await getJson(url, {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      });
      const rows = Array.isArray(body) ? (body as { id: number; content: unknown; published_at: string }[]) : null;
      const error = body as { code?: string; message?: string } | null;

      if (status === 200 && rows) {
        const row = rows[0];
        if (row) {
          snapshot = JSON.stringify({ release: row.id, publishedAt: row.published_at, content: row.content });
          console.log(`[site-content] Building with release ${row.id}, published ${row.published_at}.`);
        } else {
          console.log("[site-content] Nothing published yet. Building with the built-in words.");
        }
      } else if (["42P01", "PGRST200", "PGRST205", "42703"].includes(error?.code ?? "")) {
        console.warn(
          "[site-content] Supabase does not have migration 0011 yet " +
            `(${error?.code}: ${error?.message}). Building with the built-in words; ` +
            "run supabase/migrations/0011_website_content.sql, then redeploy.",
        );
      } else {
        throw new Error(
          `Supabase refused the website's words (HTTP ${status}${error?.code ? `, ${error.code}` : ""}: ` +
            `${error?.message ?? "no message"}).`,
        );
      }
    } catch (error) {
      const message =
        `Could not read the website's published words from Supabase (${String(error)}). ` +
        "The build stops rather than publish words Nat may have replaced; retry the deployment once Supabase answers.";
      if (failHard) throw new Error(message);
      console.warn(`[site-content] ${message} Using the built-in words for this dev server.`);
    }
  }

  process.env[SNAPSHOT_KEY] = snapshot;
  return snapshot;
}

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

export default async function config(phase: string): Promise<NextConfig> {
  return {
    ...nextConfig,
    env: { CBN_SITE_CONTENT: await readSiteContent(phase === PHASE_PRODUCTION_BUILD) },
  };
}
