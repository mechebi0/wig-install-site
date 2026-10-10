import type { ContentStatus, LiveVersion } from "@/lib/cms/admin";

/**
 * WHERE THE WEBSITE IS WITH NAT'S LATEST RELEASE.
 *
 * Publishing creates a release in the database; the website only shows it
 * once Cloudflare has rebuilt the site with it. The two are told apart by
 * asking the deployed site itself (/content-version.json says which release
 * it was built with), so "Live on the website" is never claimed on the
 * strength of a successful save.
 *
 *   never        nothing published yet: the site shows its launch words
 *   live         the deployed site carries the current release
 *   publishing   a rebuild was asked for and is still within its usual time
 *   waiting      published, but nothing has asked Cloudflare to rebuild:
 *                automatic updates are off (`canAsk` false), or were
 *                switched on after this release was published
 *   failed       the rebuild request could not be sent, Cloudflare refused
 *                it, or the site has not caught up within REBUILD_PATIENCE
 */
export type PublishPhase =
  | { kind: "never" }
  | { kind: "live"; release: number; builtAt: string }
  | { kind: "publishing"; release: number; since: string }
  | { kind: "waiting"; release: number; canAsk: boolean }
  | { kind: "failed"; release: number; reason: string };

/** A Cloudflare Pages build of this site takes a few minutes; past this, something went wrong. */
export const REBUILD_PATIENCE_MS = 20 * 60 * 1000;

export function publishPhase(status: ContentStatus, live: LiveVersion | null, now: number): PublishPhase {
  const release = status.release;
  if (release === null) return { kind: "never" };
  if (live && live.release !== null && live.release >= release) {
    return { kind: "live", release, builtAt: live.builtAt };
  }

  const failed = (reason: string): PublishPhase => ({ kind: "failed", release, reason });
  const last = status.last_rebuild;

  if (last && last.release === release) {
    if (last.outcome === "unavailable") {
      return failed("The request to update the website could not be sent from the database.");
    }
    if (last.outcome === "requested") {
      const response = last.response;
      if (response?.timed_out) return failed("Cloudflare did not answer the request to update the website.");
      if (response?.error) return failed("The request to update the website did not reach Cloudflare.");
      if (response && response.status_code !== null && (response.status_code < 200 || response.status_code >= 300)) {
        return failed(
          `Cloudflare refused the request to update the website (HTTP ${response.status_code}). Its deploy hook may have been removed.`,
        );
      }
      if (now - Date.parse(last.requested_at) > REBUILD_PATIENCE_MS) {
        return failed("The website has not updated within 20 minutes of the request. The build may have failed in Cloudflare.");
      }
      return { kind: "publishing", release, since: last.requested_at };
    }
  }

  return { kind: "waiting", release, canAsk: status.auto_publish };
}
