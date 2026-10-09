import type { Metadata } from "next";
import { ButtonLink } from "@/components/button";
import { PageHeader } from "@/components/page-header";
import { Reveal } from "@/components/reveal";
import { CTA, PAGES, bookingTarget } from "@/lib/content";

export const metadata: Metadata = {
  title: "Page not found",
};

/**
 * The 404, in the site's own clothes.
 *
 * Without this file the export shipped Next's built-in page: black system
 * type on a white box, centred inside the blush layout, which on a phone read
 * as the site having broken rather than as a link having gone stale. It is
 * what anyone following an old Instagram link or a mistyped address lands on,
 * so it opens like every other inner page and gives them the two places they
 * most likely meant: the gallery and the booking page.
 *
 * The export writes this as out/404.html, which Cloudflare Pages serves, with
 * a 404 status, for any path it has no file for.
 */
export default function NotFound() {
  return (
    <>
      <PageHeader {...PAGES.notFound} />
      <section aria-label="Where to go instead" className="bg-bg">
        <div className="mx-auto max-w-[1400px] px-5 py-14 sm:px-8 sm:py-20">
          <Reveal className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink {...bookingTarget()}>{CTA.book}</ButtonLink>
            <ButtonLink href="/gallery/" variant="secondary">
              {CTA.gallery}
            </ButtonLink>
          </Reveal>
        </div>
      </section>
    </>
  );
}
