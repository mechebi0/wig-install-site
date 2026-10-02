import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Owner } from "@/components/owner";
import { Assurances } from "@/components/assurances";
import { BookingCta } from "@/components/booking-cta";
import { PAGES } from "@/lib/content";

export const metadata: Metadata = {
  title: "Meet Nat",
  description: PAGES.meetNat.lede,
};

/**
 * The About page.
 *
 * Biography and photograph first, then the three assurances. That order is
 * deliberate: the assurances are claims about how Nat works, and they land
 * differently once you have read who she is than they do as a trust strip
 * bolted under a hero.
 *
 * The whole page is built to take Nat's real words and her own photograph with
 * no layout change. The copy lives in OWNER (lib/content.ts); the portrait
 * lives in components/owner.tsx, which holds her own photograph now that it
 * has arrived.
 */
export default function MeetNatPage() {
  return (
    <>
      <PageHeader {...PAGES.meetNat} />
      <Owner />
      <Assurances />
      <BookingCta />
    </>
  );
}
