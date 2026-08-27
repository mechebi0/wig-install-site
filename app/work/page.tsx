import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { InstallCarousel } from "@/components/install-carousel";
import { StyleGalleries } from "@/components/style-galleries";
import { BookingCta } from "@/components/booking-cta";
import { PAGES } from "@/lib/content";

export const metadata: Metadata = {
  title: "Work",
  description: PAGES.work.lede,
};

/**
 * The full gallery, which the homepage previews with three photographs.
 *
 * Two mechanisms, deliberately: the rail for recent finished installs, where
 * the point is the sequence, and the tabbed galleries for browsing by the look
 * a client actually asks for, where the point is finding your own hair. They
 * do different jobs, so they do not read as the same component twice.
 */
export default function WorkPage() {
  return (
    <>
      <PageHeader {...PAGES.work} />
      <InstallCarousel />
      <StyleGalleries />
      <BookingCta />
    </>
  );
}
