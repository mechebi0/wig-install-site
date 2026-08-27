import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Services } from "@/components/services";
import { Booking } from "@/components/booking";
import { ButtonLink } from "@/components/button";
import { Reveal } from "@/components/reveal";
import {
  bookingTarget,
  CTA,
  PAGES,
  STUDIO,
  usesOnPageBooking,
} from "@/lib/content";

export const metadata: Metadata = {
  title: "Book your chair",
  description: PAGES.book.lede,
};

/**
 * Everything needed to actually book, in the order it is needed: what the
 * services are and what they cost, then the request itself.
 *
 * This page carries no closing BookingCta band. It IS the booking CTA, and a
 * "book now" panel under a booking form is the kind of thing that makes a
 * site feel like it is nagging rather than helping.
 *
 * The two paths through STUDIO.bookingUrl both terminate here. With no URL
 * set, the on-page request form renders. With one set, the form would be a
 * dead end, so the page hands off to the real booking tool instead and still
 * shows the services and the studio details that got the visitor this far.
 */
export default function BookPage() {
  return (
    <>
      <PageHeader {...PAGES.book} />
      <Services />
      {usesOnPageBooking ? <Booking /> : <ExternalBooking />}
    </>
  );
}

/** Rendered only when STUDIO.bookingUrl points at a real booking tool. */
function ExternalBooking() {
  return (
    <section
      id="request"
      aria-labelledby="external-booking-heading"
      className="mx-auto max-w-[1400px] scroll-mt-24 px-5 pb-20 sm:px-8 lg:pb-28"
    >
      <Reveal>
        <div className="rounded-3xl border border-accent/20 bg-accent-soft p-8 lg:p-12">
          <h2
            id="external-booking-heading"
            className="max-w-[16ch] font-display text-3xl leading-[1.08] tracking-tight text-ink md:text-4xl"
          >
            Pick a time that suits you.
          </h2>
          <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-muted">
            The live calendar opens in a new tab. If nothing there works, text
            the studio on {STUDIO.phone} and Nat will find you something.
          </p>
          <div className="mt-8">
            <ButtonLink {...bookingTarget()}>{CTA.book}</ButtonLink>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
