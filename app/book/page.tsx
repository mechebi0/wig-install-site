import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Services } from "@/components/services";
import { SquareBooking } from "@/components/square-booking";
import { Reveal } from "@/components/reveal";
import {
  ADDITIONAL_LOCATIONS,
  BOOKING,
  PAGES,
  PRIMARY_LOCATION,
  REACH,
  SEO,
  STUDIO,
} from "@/lib/content";
import type { Place } from "@/lib/cms/model";

export const metadata: Metadata = {
  title: SEO.bookTitle,
  description: PAGES.book.lede,
};

/**
 * Everything needed to actually book, in the order it is needed: what the
 * services are and what they cost, then the scheduler itself.
 *
 * Square Appointments is the booking source of truth: it owns availability,
 * add-ons, date and time selection, and confirmation. This page's job is to
 * present that scheduler inside the Crowned by Nat brand, not to recreate it
 * (see components/square-booking.tsx for the embed and why it is loaded the
 * way it is).
 */
export default function BookPage() {
  return (
    <>
      <PageHeader {...PAGES.book} />
      <Services />
      <BookingPanel />
    </>
  );
}

function BookingPanel() {
  return (
    <section
      id="request"
      aria-labelledby="booking-heading"
      className="border-t border-line bg-surface-2/40"
    >
      <div className="mx-auto max-w-[1400px] px-5 py-14 sm:px-8 sm:py-20 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <Reveal>
              <h2
                id="booking-heading"
                className="font-display text-3xl font-semibold leading-[1.1] tracking-tight text-ink md:text-4xl lg:text-5xl"
              >
                {BOOKING.heading}
              </h2>
              {BOOKING.body ? (
                <p className="mt-5 max-w-[42ch] text-lg leading-relaxed text-muted">
                  {BOOKING.body}
                </p>
              ) : null}

              <dl className="mt-10 flex flex-col gap-5 border-t border-line pt-8">
                {PRIMARY_LOCATION ? (
                  <div>
                    <dt className="text-sm text-muted">{BOOKING.labels.currentLocation}</dt>
                    <dd className="mt-1 text-base font-medium text-ink">
                      <PlaceLine place={PRIMARY_LOCATION} />
                    </dd>
                  </div>
                ) : null}

                {ADDITIONAL_LOCATIONS.length > 0 ? (
                  <div>
                    <dt className="text-sm text-muted">{BOOKING.labels.alsoServing}</dt>
                    <dd className="mt-1 flex flex-col gap-0.5 text-base text-ink">
                      {ADDITIONAL_LOCATIONS.map((place) => (
                        <PlaceLine key={place.id} place={place} />
                      ))}
                    </dd>
                  </div>
                ) : null}

                {STUDIO.hours.length > 0 ? (
                  <div>
                    <dt className="text-sm text-muted">{BOOKING.labels.hours}</dt>
                    <dd className="mt-1 flex flex-col gap-0.5 text-base text-ink">
                      {STUDIO.hours.map((slot, index) => (
                        <span key={index}>
                          {slot.days}
                          {slot.time ? (
                            <>
                              ,{" "}
                              {/* One unit, so a 320px phone never strands "PM"
                                  on a line of its own. */}
                              <span className="whitespace-nowrap">{slot.time}</span>
                            </>
                          ) : null}
                        </span>
                      ))}
                    </dd>
                  </div>
                ) : null}

                <div>
                  <dt className="text-sm text-muted">{BOOKING.labels.reach}</dt>
                  <dd className="text-base">
                    <a
                      href={REACH.href}
                      className="inline-flex min-h-11 items-center text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
                    >
                      {REACH.label}
                    </a>
                  </dd>
                </div>
              </dl>
            </Reveal>
          </div>

          <div className="lg:col-span-8">
            <Reveal index={1}>
              <SquareBooking />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * A location as the studio details print it: "Towson, MD", then the
 * description and the notice Nat may have written for it in the dashboard
 * (directions, parking, "text when you arrive"). Both are optional, and with
 * neither this is the bare town, exactly as before.
 */
function PlaceLine({ place }: { place: Place }) {
  return (
    <span className="block">
      {place.label}
      {place.description ? (
        <span className="mt-0.5 block whitespace-pre-line text-sm font-normal text-muted">
          {place.description}
        </span>
      ) : null}
      {place.notice ? (
        <span className="mt-0.5 block whitespace-pre-line text-sm font-normal text-ink">
          {place.notice}
        </span>
      ) : null}
    </span>
  );
}
