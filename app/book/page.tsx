import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Services } from "@/components/services";
import { Booking } from "@/components/booking";
import { BookingFlow } from "@/components/booking/booking-flow";
import { ButtonLink } from "@/components/button";
import { Reveal } from "@/components/reveal";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  BOOKING_FLOW,
  CTA,
  PAGES,
  REACH,
  bookingTarget,
  usesOnPageBooking,
} from "@/lib/content";

export const metadata: Metadata = {
  title: "Book your chair",
  description: PAGES.book.lede,
};

/**
 * Everything needed to actually book, in the order it is needed: what the
 * services are and what they cost, then the booking itself.
 *
 * ---------------------------------------------------------------------------
 * THREE PATHS, AND WHY ALL THREE STILL EXIST
 * ---------------------------------------------------------------------------
 * 1. STUDIO.bookingUrl is set     Nat has moved to Square or Fresha. The page
 *                                 hands off to it and keeps the services and
 *                                 the studio details that got the visitor
 *                                 here. Unchanged from before.
 *
 * 2. Supabase is configured       The real five step flow, writing a real
 *                                 appointment to a real database. This is the
 *                                 path once the environment variables are in.
 *
 * 3. Supabase is NOT configured   The original email request form. Not a
 *                                 stub and not a dead end: it opens a
 *                                 prefilled mail to the studio, which is a
 *                                 working way to get an appointment on a
 *                                 static host, and it is exactly what this
 *                                 page did before the booking system existed.
 *
 * The third path is the one worth defending. Deleting it would mean that a
 * deployment missing an environment variable takes the entire booking page
 * down, and a hairdresser's website that cannot take a booking is not a
 * website. Keeping it means the worst case is a slightly older experience.
 *
 * `isSupabaseConfigured` is a build-time constant, so the branch is resolved
 * during the static export and only one of the two is in the bundle.
 *
 * This page still carries no closing BookingCta band. It IS the booking CTA.
 */
export default function BookPage() {
  return (
    <>
      <PageHeader {...PAGES.book} />
      <Services />
      {!usesOnPageBooking ? (
        <ExternalBooking />
      ) : isSupabaseConfigured ? (
        <BookingSection />
      ) : (
        <Booking />
      )}
    </>
  );
}

/** The live five step flow. */
function BookingSection() {
  return (
    <section
      id="request"
      aria-labelledby="booking-heading"
      className="border-t border-line bg-surface-2/40"
    >
      <div className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28">
        <Reveal>
          <h2
            id="booking-heading"
            className="font-display text-3xl font-semibold leading-[1.1] tracking-tight text-ink md:text-4xl lg:text-5xl"
          >
            {BOOKING_FLOW.title}
          </h2>
          <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-muted">
            Five short steps. No account needed, no card taken, and nothing is
            charged until you are in the chair.
          </p>
        </Reveal>

        <div className="mt-12 lg:mt-16">
          <BookingFlow />
        </div>
      </div>
    </section>
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
            the studio ({REACH.phrase}) and Nat will find you something.
          </p>
          <div className="mt-8">
            <ButtonLink {...bookingTarget()}>{CTA.book}</ButtonLink>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
