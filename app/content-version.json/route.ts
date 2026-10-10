import { PUBLISHED } from "@/lib/cms/published";

/**
 * /content-version.json: which release of the website's words this
 * deployment was built with.
 *
 * The dashboard reads it after Nat publishes (components/admin/cms), so it
 * can say "live on the website" only once the deployed site really carries
 * her release, rather than taking a successful save for a successful update.
 * A static file like every other page (the static export renders a
 * force-static GET once, at build time); public/_headers stops it being
 * cached, so the dashboard always sees the deployment that is live.
 *
 * Holds nothing that is not already public: a release number and two times.
 */
export const dynamic = "force-static";

const BUILT_AT = new Date().toISOString();

export function GET() {
  return Response.json({
    release: PUBLISHED?.release ?? null,
    publishedAt: PUBLISHED?.publishedAt ?? null,
    builtAt: BUILT_AT,
  });
}
