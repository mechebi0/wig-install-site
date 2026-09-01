import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { CollectionGrid } from "@/components/collection-grid";
import { BookingCta } from "@/components/booking-cta";
import { PAGES } from "@/lib/content";

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

      <section aria-label="Style collections" className="bg-bg">
        <div className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8 lg:py-24">
          <CollectionGrid variant="editorial" />
        </div>
      </section>

      <BookingCta />
    </>
  );
}
