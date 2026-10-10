"use client";

import { Reveal } from "@/components/reveal";
import { Emphasised, Step } from "@/components/service-booking";
import { SquareBooking } from "@/components/square-booking";
import type { StyleCollection } from "@/lib/collections";
import {
  COLLECTION_BOOKING_ANCHOR,
  COLLECTION_PAGE,
  REACH,
  REACH_SECONDARY,
} from "@/lib/content";

/**
 * The booking section of a collection page, directly under its photographs:
 * the style being booked, what to tap, and the scheduler. Every Book button
 * for a style lands here, the one on its card (collectionBookingTarget in
 * lib/content.ts) and the one at the top of this page.
 *
 * ---------------------------------------------------------------------------
 * THE SAME SCHEDULER, ONCE
 * ---------------------------------------------------------------------------
 * The embed /book/ and every service page use (components/square-booking.tsx)
 * and the only booking on the page. The wine band that used to close a
 * collection page sent the visitor away to /book/ to find it; now the
 * scheduler is where the decision is made. It loads as it nears the screen,
 * so the photographs above it come first.
 *
 * ---------------------------------------------------------------------------
 * THE STYLE IS NAMED, NOT SENT
 * ---------------------------------------------------------------------------
 * A style is not a service. Square's menu lists services, its embed takes no
 * parameter, and nothing on this page reaches the booking Square makes. So
 * the style is named beside the scheduler, the steps say what to tap, and the
 * last one says plainly that the style is hers to mention (the words are
 * Nat's, COLLECTION_PAGE.booking). Nothing here claims the scheduler knows.
 *
 * What Square CAN take is an add-on, a line of its own in Nat's menu. A look
 * that has one (Signature Bob: "Bob cut") gets a step naming it, in bold,
 * after the service is tapped, which is where Square offers more to add.
 *
 * Laid out as /book/'s booking panel is: the words beside the scheduler from
 * `lg`, above it below that, where the scheduler runs edge to edge.
 */
export function CollectionBooking({ collection }: { collection: StyleCollection }) {
  const { heading, body, steps } = COLLECTION_PAGE.booking;
  const name = collection.title;

  return (
    <section
      // The mobile booking bar steps aside while this is on screen
      // (components/mobile-book-bar.tsx): the booking is right here.
      data-booking=""
      aria-labelledby="collection-booking-heading"
      className="border-t border-line bg-surface-2/40"
    >
      <div className="mx-auto max-w-[1400px] px-5 py-14 sm:px-8 sm:py-20 lg:py-28">
        {/*
          The jump target is the content, not the section, so a Book button
          lands on the heading rather than on the band's empty top padding.
          Tighter below `sm` for the same reason: a phone sent here should see
          the top of the scheduler under the steps, not a screen of words with
          the scheduler waiting below the fold.
        */}
        <div
          id={COLLECTION_BOOKING_ANCHOR}
          className="grid grid-cols-1 gap-8 sm:gap-12 lg:grid-cols-12 lg:gap-8"
        >
          <div className="min-w-0 lg:col-span-4">
            <Reveal>
              <h2
                id="collection-booking-heading"
                className="font-display text-3xl leading-[1.08] tracking-tight text-ink md:text-4xl"
              >
                {heading}
              </h2>
              {body ? (
                <p className="mt-3 max-w-[42ch] whitespace-pre-line text-base leading-relaxed text-muted sm:mt-4 lg:text-lg">
                  {body}
                </p>
              ) : null}

              {/*
                Which look this booking is for, under the same label the top
                of the page puts over its name, so Natural Lace reads as a
                lace finish here too.
              */}
              <dl className="mt-6 border-t border-line pt-5 sm:mt-8 sm:pt-6">
                <dt className="text-sm text-muted">
                  {collection.dimension === "finish"
                    ? COLLECTION_PAGE.laceFinishLabel
                    : COLLECTION_PAGE.styleLabel}
                </dt>
                <dd className="mt-1 font-display text-2xl leading-tight tracking-tight text-ink lg:text-3xl">
                  {name}
                </dd>
              </dl>

              <ol className="mt-5 flex flex-col gap-3 sm:mt-6">
                {steps(name, collection.addOn).map((step, index) => (
                  <Step key={index} number={index + 1}>
                    <Emphasised text={step.text} phrase={step.phrase} />
                  </Step>
                ))}
              </ol>

              <a
                href={REACH.href}
                className="mt-2 inline-flex min-h-11 items-center text-sm text-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-accent hover:decoration-accent sm:mt-4"
              >
                {REACH_SECONDARY}
              </a>
            </Reveal>
          </div>

          <div className="min-w-0 lg:col-span-8">
            <Reveal index={1}>
              <SquareBooking lazy />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
