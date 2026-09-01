import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { CollectionGrid } from "@/components/collection-grid";
import { Reveal } from "@/components/reveal";
import { BookingCta } from "@/components/booking-cta";
import { GALLERY_AXES, PAGES } from "@/lib/content";

export const metadata: Metadata = {
  title: "Styles",
  description:
    "Six collections of finished lace installs by Crowned by Nat: deep wave, sleek straight, bobs, body wave, custom colour, and natural lace.",
};

/**
 * The styles directory. Six large editorial cards and nothing else.
 *
 * This page is what lets the homepage stay short. The homepage carries the
 * same six collections at a smaller size as a directory; this is where they
 * are given room, a paragraph each, and no competition for the scroll.
 *
 * There is no filter, no sort and no tab bar. Six is a number a person can
 * hold in their head, and controls for six items are furniture rather than
 * navigation.
 */
export default function StylesPage() {
  return (
    <>
      <PageHeader {...PAGES.gallery} />

      <section aria-labelledby="axes-heading" className="bg-bg">
        <div className="mx-auto max-w-[1400px] px-5 pt-14 sm:px-8 lg:pt-20">
          <Reveal>
            <h2
              id="axes-heading"
              className="font-display text-2xl leading-tight tracking-tight text-ink md:text-3xl"
            >
              {GALLERY_AXES.heading}
            </h2>
            <p className="mt-3 max-w-[56ch] text-base leading-relaxed text-muted">
              {GALLERY_AXES.body}
            </p>
          </Reveal>

          <dl className="mt-8 grid grid-cols-1 gap-x-10 gap-y-7 sm:grid-cols-2 lg:mt-10">
            {GALLERY_AXES.axes.map((axis, index) => (
              <Reveal key={axis.label} index={index}>
                <dt className="label border-t border-line pt-5 text-accent">
                  {axis.label}
                </dt>
                <dd className="mt-3 max-w-[46ch] text-sm leading-relaxed text-muted">
                  {axis.body}
                </dd>
              </Reveal>
            ))}
          </dl>
        </div>
      </section>

      <section aria-label="Style collections" className="bg-bg">
        <div className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8 lg:py-24">
          <CollectionGrid variant="editorial" />
        </div>
      </section>

      <BookingCta />
    </>
  );
}
