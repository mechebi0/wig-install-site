"use client";

import { ANNOUNCEMENT, bookingTarget } from "@/lib/content";
import { formatLocationList, useAnnouncedLocations } from "@/lib/catalog";

/**
 * "Now booking in Towson, MD", above the hero.
 *
 * ---------------------------------------------------------------------------
 * THE DESIGN PROBLEM
 * ---------------------------------------------------------------------------
 * Every instinct for "site-wide announcement" produces the same object: a
 * full-width coloured bar with a bold sans-serif shout in it and an X on the
 * right. That thing is a cookie banner. It is the visual grammar of an
 * interruption, and putting one above a luxury hero tells a visitor the
 * announcement is something to dismiss before the real page starts.
 *
 * This is built as the opposite: a maitre d' card, not a system message. The
 * band is the same deep wine as the hero stage below it, so the two read as
 * ONE surface with the photography starting a little lower down rather than as
 * a bar bolted onto a page. There is no border between them, no shadow, and no
 * close button.
 *
 * ---------------------------------------------------------------------------
 * TYPOGRAPHY, AND WHY IT DOES NOT USE `.label`
 * ---------------------------------------------------------------------------
 * globals.css reserves the letterspaced upper-case `.label` for the hero
 * kicker and the footer column heads, with an explicit note that spreading it
 * further is what turns it from luxury into template. The hero kicker sits
 * about 90px below this strip, so reusing it here would put two identical
 * micro-labels in the same eyeful.
 *
 * So the strip carries the OTHER half of the brand's type voice instead. The
 * lead is Playfair italic, lowercase and quiet; the place name is Playfair
 * roman, uppercase and tracked. Serif italic against tracked serif caps is a
 * masthead device rather than a UI device, which is the register this needs.
 *
 * ---------------------------------------------------------------------------
 * THE STATES, AND WHY LOADING RESERVES ITS HEIGHT
 * ---------------------------------------------------------------------------
 *   unconfigured  the strip falls back to the confirmed towns in
 *                 lib/content.ts by way of useAnnouncedLocations, because
 *                 Towson and Laurel are known facts and there is no Supabase
 *                 project yet to hold them. Resolved at build time from the
 *                 env vars, so the prerendered HTML and the first client
 *                 render agree and nothing shifts. This is the ONLY component
 *                 that gets that fallback; see the long note in lib/catalog.ts
 *                 for why booking and admin do not.
 *   loading       the band renders at full height with its content invisible.
 *                 It is the same wine as the hero, so an empty one is not
 *                 visible as anything; what it buys is that the hero does not
 *                 jump 44px down the page when the query lands. Zero layout
 *                 shift, which is the metric this site already holds at zero.
 *   ready         one location, two, or none.
 *   error         say nothing. A database timeout is not the visitor's
 *                 problem, and a wrong location is worse than no location.
 *
 * With no active location it does NOT fall back to a city name. That is the
 * one thing it must never do: sending someone to Towson on a week Nat is in
 * Laurel is the exact failure this component exists to prevent.
 */
export function LocationStrip() {
  const { locations, status } = useAnnouncedLocations();

  if (status === "unconfigured") return null;

  const settled = status === "ready";
  const open = settled && locations.length > 0;
  const closed = settled && locations.length === 0;

  return (
    <div className="relative isolate bg-ink">
      {/*
        A soft rose bloom behind the type. Without it the band is flat wine and
        reads as a strip; with it the light appears to come from behind the
        words, which is what stops it looking applied on top of the hero.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(60% 140% at 50% 120%, rgb(176 16 80 / 0.42) 0%, transparent 70%)",
        }}
      />

      <div
        className={`mx-auto flex max-w-[1400px] items-center justify-center px-5 py-3 text-center transition-opacity duration-500 motion-reduce:transition-none sm:px-8 ${
          settled ? "opacity-100" : "opacity-0"
        }`}
        /*
          Hidden from assistive technology until it says something. An empty
          live band announced as blank is noise, and a screen reader reaching
          the strip mid-fetch should simply find the hero.
        */
        aria-hidden={!settled}
      >
        {open ? (
          <a
            {...bookingTarget()}
            className="group inline-flex min-h-11 flex-wrap items-center justify-center gap-x-3 gap-y-1"
          >
            <Ornament />
            <span className="font-display text-sm italic text-on-accent/65 sm:text-[0.9375rem]">
              {ANNOUNCEMENT.lead}
            </span>
            <span className="font-display text-sm uppercase tracking-[0.18em] text-on-accent transition-colors duration-200 group-hover:text-white sm:text-[0.9375rem]">
              {formatLocationList(locations)}
              {/*
                The rule wipes in on hover rather than sitting there
                permanently: a static underline on a full-width band makes the
                whole strip look like a link farm. Same easing and same
                origin-left wipe as the nav links, so it is recognisably the
                same site.
              */}
              <span
                aria-hidden="true"
                className="mt-0.5 block h-px origin-left scale-x-0 bg-on-accent/70 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100 motion-reduce:transition-none"
              />
            </span>
            <Ornament />
          </a>
        ) : null}

        {closed ? (
          <p className="font-display text-sm italic leading-relaxed text-on-accent/70 sm:text-[0.9375rem]">
            {ANNOUNCEMENT.closed}
          </p>
        ) : null}

        {/* Reserves the band's height while the query is in flight. */}
        {!settled ? <span className="block min-h-11" /> : null}
      </div>
    </div>
  );
}

/**
 * A four-point star, drawn rather than typed.
 *
 * The obvious version of this is the character U+2726. It was drawn instead
 * because that glyph is missing from enough system fonts that a share of
 * visitors would get a tofu box in the middle of the brand's first impression,
 * and because a real SVG can be sized to the cap height of the type beside it
 * instead of to whatever the font decided.
 */
function Ornament() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className="hidden h-2.5 w-2.5 shrink-0 text-on-accent/45 sm:block"
      fill="currentColor"
    >
      <path d="M6 0c.3 2.9 2.8 5.4 5.7 5.7v.6C8.8 6.6 6.3 9.1 6 12h-.6C5.1 9.1 2.6 6.6-.3 6.3v-.6C2.6 5.4 5.1 2.9 5.4 0h.6Z" />
    </svg>
  );
}
