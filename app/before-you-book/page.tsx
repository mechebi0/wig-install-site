import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Process } from "@/components/process";
import { Questions } from "@/components/questions";
import { BookingCta } from "@/components/booking-cta";
import { PAGES } from "@/lib/content";

export const metadata: Metadata = {
  title: "Before you book",
  description: PAGES.beforeYouBook.lede,
};

/**
 * The detail that used to sit at the bottom of the homepage: what the
 * appointment actually involves, then the seven questions people ask before
 * they commit.
 *
 * Order matters here. The process comes first because it answers the question
 * behind most of the others, which is simply "what happens to me for two
 * hours". The accordion then holds the specifics without making anyone scroll
 * past seven open answers to reach the booking CTA.
 */
export default function BeforeYouBookPage() {
  return (
    <>
      <PageHeader {...PAGES.beforeYouBook} />
      <Process />
      <Questions />
      <BookingCta />
    </>
  );
}
