"use client";

import { useState, type CSSProperties } from "react";
import { ANNOUNCEMENT, CTA, STUDIO } from "@/lib/content";
import { formatLocationList, useAnnouncedLocations } from "@/lib/catalog";

/**
 * The announcement stripe: a thin rose band at the very top of every page,
 * above the nav bar, running one line of tracked capitals across the viewport
 * on a slow, seamless loop.
 *
 *   NOW BOOKING * TOWSON, MD * LAUREL, MD * LACE WIG INSTALLS * CROWNED BY NAT * BOOK YOUR CHAIR *
 *
 * (each asterisk above stands for the four-point star drawn at the bottom of
 * this file)
 *
 * ---------------------------------------------------------------------------
 * WHAT IT REPLACED
 * ---------------------------------------------------------------------------
 * The homepage used to open with a wine band between the nav bar and the hero
 * saying "Now booking in Towson & Laurel, MD". Put a stripe above the nav that
 * says the same towns and the page would open with the same fact twice inside
 * 130px, so the band went and its one job moved up here. What that costs is
 * nothing: the towns are now announced on every page rather than the homepage
 * alone, and the carousel gets the band's height back.
 *
 * The footer still prints the towns beside the contact details. That is a
 * page-length away and it is an address block, not an announcement.
 *
 * ---------------------------------------------------------------------------
 * WHY ROSE, AND WHY PLAYFAIR
 * ---------------------------------------------------------------------------
 * The stripe is the accent, flat, with the near-white type on it: 6.5:1, which
 * clears AA for text this small. Rose is the site's only accent, so a ribbon
 * of it at the very top is the brand's colour said once, cleanly, before the
 * blush nav bar and the wine hero stage below it. No gradient, no shadow, no
 * hairline: the band's own colour is the edge.
 *
 * The type is Playfair, uppercase, tracked, at 11 to 13px. It is deliberately
 * NOT the `.label` style: globals.css reserves that Geist micro-label for the
 * hero kicker and the footer column heads, and a second one 72px above the
 * kicker would be two identical labels in the same eyeful. Tracked serif caps
 * are a masthead device rather than a UI device, which is the register a
 * luxury announcement needs. The segments are divided by a four-point star,
 * drawn as an SVG rather than typed as U+2726 because that glyph is missing
 * from enough system fonts to put a tofu box in the brand's first impression.
 *
 * ---------------------------------------------------------------------------
 * THE LOOP
 * ---------------------------------------------------------------------------
 * The sequence is rendered COPIES times inside one track that is as wide as
 * its content, and CSS slides the track by exactly one copy before it starts
 * over (globals.css, `.marquee-track`). Every copy is identical, so the
 * restart frame is pixel for pixel the frame before it: no seam, no jump, and
 * nothing measured in JavaScript. The one thing the number of copies has to
 * guarantee is that the track never runs out on the right while it is sliding,
 * which needs (COPIES - 1) copies to be wider than the viewport. A copy is
 * about 1,200px at desktop, so six covers anything up to a 6,000px display.
 *
 * The band is `overflow-hidden`, so the track's width never becomes page
 * width: there is no horizontal scroll, on any device.
 *
 * ---------------------------------------------------------------------------
 * STOPPING IT
 * ---------------------------------------------------------------------------
 * WCAG 2.2.2 wants a way to pause anything that moves on its own for more than
 * five seconds, and the brief wants no visible control. Both are met:
 *
 *   the button  a real pause/play toggle at the right end of the band, hidden
 *               until it takes keyboard focus, the same device as the skip
 *               link above it. Sighted mouse users never see it; keyboard and
 *               screen reader users get an explicit control. Once pressed it
 *               stays visible, so a sighted keyboard user can see the state.
 *               This is the ONLY thing that stops the loop.
 *   reduced     under prefers-reduced-motion the track is not shown at all and
 *   motion      the sentence below takes its place, still and centred.
 *
 * HOVER DOES NOT PAUSE IT. The pointer crosses the top of the page on its way
 * to the nav all day, and a band this thin freezing under every one of those
 * passes reads as a rendering fault rather than as a courtesy. The line runs
 * underneath the cursor. There is no pointer handler on this component and no
 * `:hover` rule on the track in globals.css; the pause button is the mechanism
 * WCAG asks for, and it is enough on its own.
 *
 * ---------------------------------------------------------------------------
 * WHAT THE SCREEN READER GETS
 * ---------------------------------------------------------------------------
 * Six copies of a moving line would be read six times. The whole track is
 * aria-hidden and one plain sentence stands in for it: "Now booking in Towson
 * & Laurel, MD. Lace wig installs at Crowned by Nat." It is the same element
 * that becomes visible under reduced motion, so the two audiences that do not
 * see the motion get exactly the same words.
 *
 * ---------------------------------------------------------------------------
 * THE STATES, INHERITED FROM THE BAND THIS REPLACED
 * ---------------------------------------------------------------------------
 *   unconfigured  useAnnouncedLocations hands back the confirmed towns from
 *                 lib/content.ts, resolved at build time, so the prerendered
 *                 HTML and the first client render agree and nothing shifts.
 *                 This is the ONLY component that gets that fallback; see the
 *                 note in lib/catalog.ts for why booking and admin do not.
 *   loading       the band is drawn at its full height with nothing in it, so
 *                 the nav does not jump down the page when the query lands.
 *   ready         open (the lead, then each town as its own segment), or
 *                 closed (the two closed fragments in their place).
 *   error         the service and the studio, and no town. A database timeout
 *                 is not the visitor's problem, and a wrong location is worse
 *                 than no location.
 *
 * It never falls back to a town name when the chair is closed. Sending
 * someone to Towson on a week Nat is in Laurel is the exact failure this
 * component exists to prevent.
 */
const COPIES = 6;

const SEGMENT_TYPE =
  "font-display text-[0.6875rem] font-medium uppercase tracking-[0.2em] sm:text-xs lg:text-[0.8125rem] lg:tracking-[0.22em]";

export function AnnouncementMarquee() {
  const { locations, status } = useAnnouncedLocations();
  const [paused, setPaused] = useState(false);

  const settled = status === "ready" || status === "error";
  const open = status === "ready" && locations.length > 0;
  const closed = status === "ready" && locations.length === 0;

  const segments: string[] = open
    ? [
        ANNOUNCEMENT.lead,
        ...locations.map((location) => `${location.name}, ${location.state}`),
        ANNOUNCEMENT.service,
        STUDIO.name,
        CTA.book,
      ]
    : closed
      ? [...ANNOUNCEMENT.closed, ANNOUNCEMENT.service, STUDIO.name]
      : [ANNOUNCEMENT.service, STUDIO.name, CTA.book];

  const sentence = `${
    open
      ? `${ANNOUNCEMENT.lead} in ${formatLocationList(locations)}. `
      : closed
        ? `${ANNOUNCEMENT.closed.join(". ")}. `
        : ""
  }${ANNOUNCEMENT.service} at ${STUDIO.name}.`;

  return (
    <div
      className={`marquee on-photo relative overflow-hidden bg-accent text-on-accent${
        paused ? " is-paused" : ""
      }`}
    >
      {settled ? (
        <>
          <div
            aria-hidden="true"
            className="marquee-track flex min-h-8 w-max items-center sm:min-h-9"
            style={{ "--marquee-copies": COPIES } as CSSProperties}
          >
            {Array.from({ length: COPIES }, (_, copy) => (
              <span key={copy} className="flex shrink-0 items-center">
                {segments.map((text, index) => (
                  <span key={index} className="flex items-center">
                    <span className={`${SEGMENT_TYPE} whitespace-nowrap leading-none`}>
                      {text}
                    </span>
                    <Ornament />
                  </span>
                ))}
              </span>
            ))}
          </div>

          <p className={`marquee-static ${SEGMENT_TYPE} leading-snug`}>{sentence}</p>

          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-label={paused ? "Play the announcements" : "Pause the announcements"}
            className={`absolute right-2 top-1/2 inline-flex h-6 -translate-y-1/2 cursor-pointer items-center rounded-full bg-on-accent px-2.5 text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-accent transition-opacity duration-200 motion-reduce:hidden sm:right-3 ${
              paused
                ? "opacity-100"
                : "pointer-events-none opacity-0 focus:pointer-events-auto focus:opacity-100"
            }`}
          >
            {paused ? "Play" : "Pause"}
          </button>
        </>
      ) : (
        /* Reserves the band's height while the query is in flight. */
        <div aria-hidden="true" className="min-h-8 sm:min-h-9" />
      )}
    </div>
  );
}

/**
 * A four-point star, drawn rather than typed. Sized to the cap height of the
 * type beside it, and it is the only divider the stripe uses: a bullet reads
 * as a list, a slash reads as a URL, and this reads as a masthead.
 */
function Ornament() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className="mx-3.5 h-2 w-2 shrink-0 text-on-accent/50 sm:mx-5 sm:h-2.5 sm:w-2.5"
      fill="currentColor"
    >
      <path d="M6 0c.3 2.9 2.8 5.4 5.7 5.7v.6C8.8 6.6 6.3 9.1 6 12h-.6C5.1 9.1 2.6 6.6-.3 6.3v-.6C2.6 5.4 5.1 2.9 5.4 0h.6Z" />
    </svg>
  );
}
