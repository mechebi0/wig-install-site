import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Testimonials } from "@/components/testimonials";
import { BookingCta } from "@/components/booking-cta";
import { PAGES } from "@/lib/content";

export const metadata: Metadata = {
  title: "Reviews",
  description: PAGES.reviews.lede,
};

/**
 * Client reviews on their own page.
 *
 * Short by design, and it stays short until there are real ones. The visible
 * "sample wording" notice ships with the quotes and is removed by flipping
 * testimonialsArePlaceholder in lib/content.ts once genuine reviews replace
 * them. Do not flip that flag while the words are still invented: presenting
 * written stand-ins as real reviews is deceptive, and in the US it is squarely
 * what the FTC endorsement rules prohibit.
 */
export default function ReviewsPage() {
  return (
    <>
      <PageHeader {...PAGES.reviews} />
      <Testimonials />
      <BookingCta />
    </>
  );
}
