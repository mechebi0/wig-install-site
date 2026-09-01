"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/button";
import { Photograph } from "@/components/photo";
import { Wordmark } from "@/components/wordmark";
import { bookingTarget, CTA, HERO, STUDIO } from "@/lib/content";
import { HERO_SLIDES } from "@/lib/images";

/**
 * The homepage hero: six of Nat's installs crossfading slowly beside a brand
 * block that never moves.
 *
 * ---------------------------------------------------------------------------
 * THE SHAPE, AND WHY IT IS A SPLIT RATHER THAN A FULL-BLEED BANNER
 * ---------------------------------------------------------------------------
 * Every photograph on this site is one person standing in a room, shot on a
 * phone, in portrait. That is not a defect to be worked around; it is what
 * real salon photography looks like, and it is why the site reads as a real
 * business. But it means a full-bleed 16:9 desktop banner is the one shape
 * this photography cannot take: cropping 3:4 down to 16:9 removes the lengths,
 * and the lengths are the entire subject of a wig install photograph.
 *
 * So the frame changes with the viewport instead of the picture doing so.
 * It is ONE composition, a photograph beside a wine brand block, folded
 * between the two shapes:
 *
 *   below lg   stacked, brand block first. The mark, the line and the
 *              booking button sit on flat wine at the top of the frame, and
 *              the photograph runs below them, deliberately taller than the
 *              space left in the viewport so its top third shows as a peek
 *              that pulls the scroll.
 *
 *   lg and up  side by side. The photograph becomes a tall panel filling the
 *              right seven columns and the brand block holds the left five.
 *
 * The brand block leads in BOTH, which is also the DOM order, so the reading
 * order a screen reader gets is the reading order everyone else gets.
 *
 * WHY THE PHOTOGRAPH IS ALLOWED TO RUN PAST THE FOLD ON A PHONE. Fitting the
 * whole hero into one phone screen means about 250px of picture, and 250px of
 * a 3:4 portrait is a crop through someone's face with the hair cut off top
 * and bottom. On a wig installer's website that is the worst 250px available.
 * Letting it run to a real portrait crop costs nothing, because the primary
 * action is not stranded: components/mobile-book-bar.tsx puts a sticky Book
 * Your Chair bar in thumb reach from 320px of scroll onward, and the booking
 * button in this block is above the fold regardless.
 *
 * WHY THE COPY IS NOT OVER THE PICTURE ON A PHONE. It was, and two things went
 * wrong. Both are specific to this photography rather than general:
 *
 *   1. Nat's neon sign is on the wall in most of these frames, and the brand
 *      mark IS that sign. Laying the mark over the photograph put two
 *      Crownedbynat scripts on the screen at once, one of them an echo of the
 *      other, and it read as a rendering fault rather than as branding.
 *   2. These are bright, warm, high-key phone photographs, and a wash heavy
 *      enough to float five lines of copy over one turns the picture to mud.
 *      The veil and the photograph were fighting over the same pixels.
 *
 * Stacking gives the mark clean wine to sit on, gives the type a contrast
 * floor no slide can change, and gives the photograph back its whole frame.
 * One image layer still serves both shapes: it is an in-flow flex item on a
 * phone and an absolutely positioned panel at lg, so nothing is rendered twice
 * and no photograph is downloaded twice.
 *
 * ---------------------------------------------------------------------------
 * THE COPY DOES NOT CHANGE WITH THE SLIDE
 * ---------------------------------------------------------------------------
 * Text that swaps every seven seconds cannot be read at a glance and cannot be
 * relied on by anyone who looks away. The photograph is the only thing that
 * moves. The brand, the proposition and the CTA are fixed, and the only
 * per-slide text is the small style label above the dots.
 *
 * ---------------------------------------------------------------------------
 * TIMING
 * ---------------------------------------------------------------------------
 * DWELL 7s, FADE 1.8s, and a 12s drift on the transform. Deliberately slower
 * than a stock carousel. A frame needs roughly five seconds before it stops
 * being motion and starts being a photograph, and the drift is long enough to
 * never be perceived as a zoom, only as the image being alive.
 *
 * ---------------------------------------------------------------------------
 * STOPPING IT, AND THE TRADE THAT WAS MADE
 * ---------------------------------------------------------------------------
 * There is no play/pause button; that is a deliberate decision to keep the
 * hero clean, and it costs something, so the cost is written down rather than
 * hidden. WCAG 2.2.2 asks for a mechanism to pause, stop or hide anything that
 * moves automatically for more than five seconds, and a labelled control is
 * the obvious way to provide one. What stands in its place:
 *
 *   - touching any dot stops the rotation for good, so a visitor who wants it
 *     to hold still has a way to make it hold still
 *   - rotation pauses while keyboard focus is anywhere inside the hero, so it
 *     never moves under someone reading it with a keyboard
 *   - under prefers-reduced-motion it never starts at all, and the dots are
 *     full manual control
 *   - it stops when scrolled past or when the tab is in the background
 *
 * Hover deliberately does NOT pause. The hero is most of the viewport, so at
 * desktop the pointer rests on it almost all the time, and pausing on hover
 * would mean the carousel effectively never advanced.
 *
 * ---------------------------------------------------------------------------
 * SIZING LIVES IN HeroStage
 * ---------------------------------------------------------------------------
 * This takes `flex-1` inside components/hero-stage.tsx, because the location
 * strip sits directly above and the two share one viewport between them.
 */

const DWELL_MS = 7000;
const FADE_MS = 1800;
const DRIFT_MS = 12000;
const REDUCED_FADE_MS = 200;

/**
 * The photograph: an in-flow flex item below the brand block on a phone, and
 * an absolutely positioned right-hand panel from `lg` (seven of twelve
 * columns).
 *
 * `min-h-[60svh]` with `flex-1` is a floor, not a height. It grows to take
 * whatever the brand block leaves on a tall phone, and holds 60svh on a short
 * one, which keeps the frame taller than it is wide at every phone width and
 * so keeps the crop portrait. At `lg` both are dropped and the panel is sized
 * by `inset-0` instead.
 */
const PANEL =
  "relative min-h-[60svh] w-full flex-1 lg:absolute lg:inset-0 lg:left-[41.6667%] lg:min-h-0 lg:w-auto lg:flex-none";

/** What the image actually occupies, for the browser to size the srcSet from. */
const HERO_SIZES = "(min-width: 1024px) 60vw, 100vw";

export function HeroCarousel() {
  const count = HERO_SLIDES.length;
  const sectionRef = useRef<HTMLElement>(null);

  const [index, setIndex] = useState(0);
  /** Flipped for good the first time a visitor drives the carousel. */
  const [stopped, setStopped] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  /** The other five slides stay out of the DOM until the first has landed. */
  const [warm, setWarm] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setWarm(true), 900);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVisibility = () => setPageVisible(!document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const rotating =
    !stopped && !focusWithin && !reduced && inView && pageVisible;

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setTimeout(
      () => setIndex((current) => (current + 1) % count),
      DWELL_MS,
    );
    return () => window.clearTimeout(timer);
  }, [rotating, index, count]);

  /** Manual navigation stops rotation for good; it never fights the visitor. */
  const goTo = useCallback(
    (target: number) => {
      setStopped(true);
      setIndex(((target % count) + count) % count);
    },
    [count],
  );

  const onControlKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(index + 1);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(index - 1);
    }
  };

  const lead = HERO_SLIDES[0];
  const active = HERO_SLIDES[index];

  return (
    <section
      ref={sectionRef}
      aria-roledescription="carousel"
      aria-label={`${HERO.brand} installs`}
      onFocus={() => setFocusWithin(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocusWithin(false);
      }}
      className="on-photo relative isolate flex flex-1 flex-col overflow-hidden bg-ink lg:justify-center"
    >
      {/*
        The LCP element. Preloaded from here rather than from the root layout,
        so /styles and /book no longer pay to fetch a hero they never render.
        imageSrcSet/imageSizes rather than a bare href, or the browser preloads
        one width and then the <img> asks for a different one.
      */}
      <link
        rel="preload"
        as="image"
        href={lead.photo.src}
        imageSrcSet={`${lead.photo.small} 600w, ${lead.photo.src} 1200w, ${lead.photo.large} 1600w`}
        imageSizes={HERO_SIZES}
        fetchPriority="high"
      />

      {/* Copy and controls, layer 2. */}
      <div className="relative z-[2] mx-auto w-full max-w-[1400px] shrink-0 px-5 pb-6 pt-6 sm:px-8 sm:pb-9 sm:pt-8 lg:pb-0 lg:pt-0">
        <div className="lg:grid lg:grid-cols-12 lg:items-center">
          <div className="min-w-0 lg:col-span-5 lg:pr-10">
            <p className="label text-on-accent/70">{HERO.kicker}</p>

            <h1 className="mt-4 flex flex-col items-start lg:mt-6">
              {STUDIO.logo ? (
                /*
                  Nat's own neon studio sign, carrying the brand name as the
                  accessible name of the heading. It is a fixed-size brand
                  asset rather than content photography, so it is a plain <img>
                  with explicit dimensions: next/image would add a wrapper and,
                  under `unoptimized`, no optimisation.
                */
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={STUDIO.logo}
                  alt={HERO.brand}
                  width={STUDIO.logoWidth}
                  height={STUDIO.logoHeight}
                  fetchPriority="high"
                  className="h-auto w-[12rem] max-w-full sm:w-[18rem] lg:w-[23rem]"
                />
              ) : (
                <Wordmark className="text-5xl text-on-accent lg:text-6xl" />
              )}

              <span className="mt-3 max-w-[17ch] font-display text-xl leading-snug tracking-tight text-on-accent/90 sm:mt-6 sm:text-3xl lg:text-[2rem]">
                {HERO.line}
              </span>
            </h1>

            {/*
              Hidden on the narrowest phones, and not because it does not
              matter. It is almost the first paragraph of the Intro section
              immediately below, so on a 390px screen it would be read twice
              inside one scroll while pushing the booking button under the
              fold. Everything from `sm` up has the room for both.
            */}
            <p className="mt-5 hidden max-w-[44ch] text-base leading-relaxed text-on-accent/80 sm:block lg:text-lg">
              {HERO.subtext}
            </p>

            {/*
              One filled pill and, below sm, one text link rather than a second
              pill. Two full-width pills stacked on a phone cost 64px of the
              fold and read as two actions of equal weight, and this site has
              exactly one primary action. From `sm` up there is room for the
              pair side by side and the outline variant comes back.
            */}
            <div className="mt-5 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center">
              <ButtonLink {...bookingTarget()} variant="onPhoto">
                {CTA.book}
              </ButtonLink>
              <a
                href="/styles/"
                className="inline-flex min-h-11 items-center justify-center px-2 text-sm text-on-accent/80 underline decoration-on-accent/30 underline-offset-4 transition-colors hover:text-on-accent hover:decoration-on-accent sm:hidden"
              >
                {CTA.styles}
              </a>
              <div className="hidden sm:block">
                <ButtonLink href="/styles/" variant="quiet">
                  {CTA.styles}
                </ButtonLink>
              </div>
            </div>

            {/*
              The controls sit under the copy on the wine rather than over the
              photograph, so their contrast is fixed rather than decided by
              whichever slide happens to be showing.

              Left/right arrows are a shortcut on top of working keyboard
              access, never a replacement for it: every dot is a real button.
            */}
            <div
              onKeyDown={onControlKeyDown}
              className="mt-5 flex items-center gap-4 sm:mt-9 lg:mt-12"
            >
              {/*
                Six 44px targets need 264px, which fits a 320px phone once
                nothing else shares the line. The spacing between the dots comes
                from the targets themselves, so there is no flex gap on top.
              */}
              <div className="-mx-1 flex shrink-0 items-center">
                {HERO_SLIDES.map((slide, i) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`Show ${slide.label}, slide ${i + 1} of ${count}`}
                    aria-current={i === index}
                    className="tap group flex cursor-pointer items-center justify-center px-1"
                  >
                    <span
                      className={`block h-1.5 rounded-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
                        i === index
                          ? "w-8 bg-on-accent"
                          : "w-1.5 bg-on-accent/45 group-hover:bg-on-accent/85"
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/*
                The one piece of text that changes with the slide. Announced
                through the live region below rather than being read twice.
              */}
              <p
                aria-hidden="true"
                className="hidden min-w-0 truncate font-display text-sm italic text-on-accent/60 sm:block"
              >
                {active.label}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Photography, layer 0. Top of the frame on a phone, panel at lg. */}
      <div className={`${PANEL} z-0`}>
        {HERO_SLIDES.map((slide, i) => {
          const isActive = i === index;
          const mounted = i === 0 || warm || isActive;

          return (
            <div
              key={slide.id}
              /*
                Exactly one slide is exposed to assistive technology at a time,
                so a screen reader meets one image with real alt text rather
                than six competing descriptions of the same hero.
              */
              aria-hidden={!isActive}
              className={`absolute inset-0 ${isActive ? "opacity-100" : "opacity-0"}`}
              style={
                reduced
                  ? {
                      transitionProperty: "opacity",
                      transitionDuration: `${REDUCED_FADE_MS}ms`,
                    }
                  : {
                      transitionProperty: "opacity, transform",
                      transitionDuration: `${FADE_MS}ms, ${DRIFT_MS}ms`,
                      transitionTimingFunction: "ease-in-out, linear",
                      transform: isActive ? "scale(1)" : "scale(1.06)",
                    }
              }
            >
              {mounted ? (
                <Photograph
                  photo={slide.photo}
                  sizes={HERO_SIZES}
                  priority={i === 0}
                  className="h-full w-full object-cover object-[center_22%]"
                />
              ) : null}
            </div>
          );
        })}

        {/*
          Layer 1, and it lives INSIDE the photograph's box so it tracks that
          box through both layouts. No copy sits on the picture in either one,
          so this is not a contrast floor, it is the seam: on a phone it fades
          the foot of the frame into the wine block below, and at lg it
          feathers the left edge into the brand field. Both ends also keep the
          sticky nav off a bright frame edge as a slide changes under it.
        */}
        <div
          aria-hidden="true"
          className="hero-veil pointer-events-none absolute inset-0 z-[1]"
        />
      </div>

      {/*
        Silent while the carousel drives itself, per the ARIA carousel pattern:
        a slide announcement every seven seconds is noise, not information. It
        switches to polite the moment the visitor takes manual control.
      */}
      <p
        aria-live={rotating ? "off" : "polite"}
        aria-atomic="true"
        className="sr-only"
      >
        {`Slide ${index + 1} of ${count}: ${active.label}`}
      </p>
    </section>
  );
}
