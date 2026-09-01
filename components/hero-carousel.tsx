"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CaretLeft,
  CaretRight,
  Pause,
  Play,
} from "@phosphor-icons/react/dist/ssr";
import { ButtonLink } from "@/components/button";
import { Photograph } from "@/components/photo";
import { bookingTarget, CTA, HERO } from "@/lib/content";
import { heroFocal, HERO_SLIDES } from "@/lib/images";

/**
 * The homepage hero: a full-width carousel that crossfades slowly through six
 * of Nat's installs, directly under the brand masthead.
 *
 * ---------------------------------------------------------------------------
 * THE COMPOSITION PROBLEM, AND THE BLURRED BACKDROP THAT SOLVES IT
 * ---------------------------------------------------------------------------
 * Every photograph on this site is one person standing in a room, shot on a
 * phone, in portrait. A full-width desktop hero is roughly 2:1. Cropping a 3:4
 * portrait to 2:1 was tried and the result is not arguable: it cuts the face
 * off at the mouth and removes the hair entirely, on a wig installer's
 * website. Stretching instead of cropping distorts. Neither is shippable.
 *
 * So each slide is built out of the SAME photograph twice:
 *
 *   backdrop   scaled up, blurred and darkened, filling the whole width. It
 *              is not there to be looked at. It is there so the frame can be
 *              full width and so its colour comes from this photograph rather
 *              than from a flat panel, which is what makes the pink slide read
 *              pink and the copper slide read copper.
 *   subject    the same file at 46% of the width, bled to the right edge. That
 *              is a 1.18 frame against a 0.75 file, so it crops mildly and
 *              keeps the head and most of the lengths. Nothing like the 2:1
 *              band a true full-bleed banner would have forced.
 *
 * The browser fetches one file and paints it twice, so the backdrop is free.
 *
 * This is the standard treatment for portrait media in a landscape frame, and
 * it is what makes the hero work: the picture is cropped as little as the
 * shape allows rather than as much as it demands, nothing is stretched, and
 * the left of the frame is soft colour, which is exactly where the copy needs
 * to sit.
 *
 * Below `lg` none of it applies. A phone viewport is already portrait, so the
 * photograph covers the frame and the backdrop layer is not rendered at all.
 *
 * ---------------------------------------------------------------------------
 * THE COPY DOES NOT CHANGE WITH THE SLIDE
 * ---------------------------------------------------------------------------
 * Text that swaps every seven seconds cannot be read at a glance and cannot be
 * relied on by anyone who looks away. The photograph is the only thing that
 * moves. The only per-slide text is the small style name beside the controls.
 *
 * There is no h1 here: the brand masthead directly above owns it. Two h1s on
 * one page, one repeating the other, is worse than none.
 *
 * ---------------------------------------------------------------------------
 * TIMING
 * ---------------------------------------------------------------------------
 * DWELL 7s, FADE 1.6s, and a 14s drift on the transform. Deliberately slower
 * than a stock carousel. A frame needs roughly five seconds before it stops
 * being motion and starts being a photograph, and the drift is long enough to
 * never be perceived as a zoom, only as the image being alive.
 *
 * ---------------------------------------------------------------------------
 * PAUSING, WHICH IS NOT OPTIONAL
 * ---------------------------------------------------------------------------
 * WCAG 2.2.2 requires a mechanism to pause, stop or hide anything that moves
 * automatically for more than five seconds. An earlier version of this hero
 * argued its way out of a visible control; it should not have. The control is
 * one 44px button, it is the difference between meeting a Level A criterion
 * and not, and the hero is not measurably worse for having it.
 *
 * Five things stop the rotation, and they are deliberately different:
 *
 *   pause button   an explicit, persistent, labelled toggle. Announces its own
 *                  state, and stays paused until pressed again.
 *   hover          pauses while the pointer is over the hero, resumes on exit.
 *                  Cheap for a mouse user who wants to look at one frame.
 *                  Wired to native pointerenter/pointerleave; see the note on
 *                  that effect for why React's delegated version is wrong here.
 *   focus          pauses while KEYBOARD focus is anywhere inside, so it never
 *                  moves under someone reading it with a keyboard. Deliberately
 *                  gated on :focus-visible: a mouse click leaves DOM focus on
 *                  the button it pressed, and without the gate pressing Play
 *                  with a mouse would hand autoplay back and then immediately
 *                  block it again with the focus its own click created.
 *   touch / swipe  a drag pauses for good. On a touch screen there is no
 *                  "leave", so resuming after a deliberate swipe would be the
 *                  carousel overriding the person using it.
 *   arrows / dots  same. Taking manual control stops the rotation for good,
 *                  and the play button is how it is handed back.
 *
 * It also stops when scrolled out of view or the tab is backgrounded, and
 * under prefers-reduced-motion it never starts at all and the crossfade
 * collapses to a near-instant swap.
 */

const DWELL_MS = 7000;
const FADE_MS = 1600;
const DRIFT_MS = 14000;
const REDUCED_FADE_MS = 200;
/** Horizontal travel, in px, that counts as a swipe rather than a tap. */
const SWIPE_PX = 48;

const HERO_SIZES = "(min-width: 1024px) 46vw, 100vw";

export function HeroCarousel() {
  const count = HERO_SLIDES.length;
  const sectionRef = useRef<HTMLElement>(null);

  const [index, setIndex] = useState(0);
  /** The explicit toggle. Sticky until pressed again. */
  const [paused, setPaused] = useState(false);
  /** Flipped the first time the visitor drives it by hand. */
  const [stopped, setStopped] = useState(false);
  const [hovered, setHovered] = useState(false);
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
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /*
    Hover, on a NATIVE listener rather than React's onMouseEnter/onMouseLeave,
    and this is load bearing rather than a style preference.

    React delegates mouse enter and leave from `mouseover`/`mouseout` at the
    root. Pressing the pause button swaps the glyph inside it, which unmounts
    the node the pointer is currently over; the synthetic leave for the move
    that follows never arrives, `hovered` sticks at true, and the carousel that
    was just asked to play sits still until something else re-renders it. It is
    a genuine bug, not a test artefact: press play, move the mouse away, and
    nothing happens.

    `pointerleave` is fired by the browser on this element from geometry, so it
    does not care what the subtree did in the meantime.
  */
  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const enter = () => setHovered(true);
    const leave = () => setHovered(false);
    node.addEventListener("pointerenter", enter);
    node.addEventListener("pointerleave", leave);
    return () => {
      node.removeEventListener("pointerenter", enter);
      node.removeEventListener("pointerleave", leave);
    };
  }, []);

  useEffect(() => {
    const onVisibility = () => setPageVisible(!document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const rotating =
    !paused &&
    !stopped &&
    !hovered &&
    !focusWithin &&
    !reduced &&
    inView &&
    pageVisible;

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setTimeout(
      () => setIndex((current) => (current + 1) % count),
      DWELL_MS,
    );
    return () => window.clearTimeout(timer);
  }, [rotating, index, count]);

  const goTo = useCallback(
    (target: number) => {
      setStopped(true);
      setIndex(((target % count) + count) % count);
    },
    [count],
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(index + 1);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(index - 1);
    }
  };

  /*
    Swipe. Pointer events rather than touch events, so a pen works too, and
    `touch-pan-y` on the section keeps vertical scrolling with the page rather
    than being swallowed here.
  */
  const dragFrom = useRef<number | null>(null);
  const onPointerDown = (event: React.PointerEvent) => {
    if (event.pointerType === "mouse") return;
    dragFrom.current = event.clientX;
  };
  const onPointerUp = (event: React.PointerEvent) => {
    const from = dragFrom.current;
    dragFrom.current = null;
    if (from === null) return;
    const dx = event.clientX - from;
    if (Math.abs(dx) < SWIPE_PX) return;
    goTo(dx < 0 ? index + 1 : index - 1);
  };

  const active = HERO_SLIDES[index];
  const lead = HERO_SLIDES[0];
  /* The focal point differs between the two hero shapes, and object-position
     cannot be expressed as a Tailwind breakpoint variant when its value is
     per-slide data. So the breakpoint is read once here rather than being
     duplicated into six inline styles. It starts false so the server render
     and the first client render agree; the phone value is the safe one to be
     wrong with for a frame, because the phone frame crops least. */
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setWide(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  /** True while the carousel would move on its own if nothing blocked it. */
  const autoplayOn = !paused && !stopped;

  return (
    <section
      ref={sectionRef}
      aria-roledescription="carousel"
      aria-label={`${HERO.brand} installs`}
      onKeyDown={onKeyDown}
      onFocus={(e) => {
        /* Keyboard focus only. See the note above: a pointer click focuses the
           button it pressed, and treating that as "someone is reading this
           with a keyboard" makes the Play button look broken. */
        if (e.target instanceof HTMLElement && e.target.matches(":focus-visible")) {
          setFocusWithin(true);
        }
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocusWithin(false);
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragFrom.current = null;
      }}
      className="on-photo relative isolate flex h-[62svh] min-h-[430px] touch-pan-y flex-col justify-end overflow-hidden bg-ink lg:h-[62svh] lg:min-h-[480px] lg:max-h-[680px] lg:justify-center"
    >
      {/*
        The largest image on the page after the mark. imageSrcSet/imageSizes
        rather than a bare href, or the browser preloads one width and the
        <img> then asks for another.
      */}
      <link
        rel="preload"
        as="image"
        href={lead.photo.src}
        imageSrcSet={`${lead.photo.small} 600w, ${lead.photo.src} 1200w, ${lead.photo.large} 1600w`}
        imageSizes={HERO_SIZES}
        fetchPriority="high"
      />

      {HERO_SLIDES.map((slide, i) => {
        const isActive = i === index;
        const mounted = i === 0 || warm || isActive;

        return (
          <div
            key={slide.id}
            /* Exactly one slide is exposed to assistive technology at a time,
               so a screen reader meets one image with real alt text rather
               than six competing descriptions of the same hero. */
            aria-hidden={!isActive}
            className={`absolute inset-0 z-0 ${isActive ? "opacity-100" : "opacity-0"}`}
            style={{
              transitionProperty: "opacity",
              transitionDuration: `${reduced ? REDUCED_FADE_MS : FADE_MS}ms`,
              transitionTimingFunction: "ease-in-out",
            }}
          >
            {mounted ? (
              <>
                {/* Backdrop. Desktop only, and never announced: it is the same
                    picture as the one beside it. */}
                <Photograph
                  photo={slide.photo}
                  sizes="60vw"
                  decorative
                  className="absolute inset-0 hidden h-full w-full scale-110 object-cover blur-2xl brightness-[0.55] saturate-[1.6] lg:block"
                />

                {/* The subject. Full bleed on a phone; uncropped and right of
                    centre from lg, where `h-full w-auto` keeps its native 3:4
                    and the frame reveals more or less blur beside it. */}
                <Photograph
                  photo={slide.photo}
                  sizes={HERO_SIZES}
                  priority={i === 0}
                  className="absolute inset-0 h-full w-full object-cover lg:left-auto lg:right-0 lg:w-[46%]"
                  style={{
                    /* Per-slide, and measured off the file rather than
                       guessed: see the note on HeroFocal in lib/images.ts.
                       Both frames crop, and they crop by different amounts,
                       so each has its own value. */
                    objectPosition: heroFocal(slide)[wide ? "wide" : "narrow"],
                    ...(reduced
                      ? null
                      : {
                          transitionProperty: "transform",
                          transitionDuration: `${DRIFT_MS}ms`,
                          transitionTimingFunction: "linear",
                          transform: isActive ? "scale(1)" : "scale(1.05)",
                        }),
                  }}
                />
              </>
            ) : null}
          </div>
        );
      })}

      {/* Contrast floor. Bottom-up on a phone, where the copy sits over the
          photograph; left-to-right at lg, where it sits over the blur. */}
      <div
        aria-hidden="true"
        className="hero-veil pointer-events-none absolute inset-0 z-[1]"
      />

      {/*
        Copy and controls, layer 2, in ONE column.

        The controls started at the bottom right of the frame, which is over
        the photograph, and on the pink and platinum slides a near-white glyph
        on bright hair was illegible. Everything the visitor has to read or
        press therefore lives in the same left column as the copy, over the
        blurred backdrop, where the contrast floor is set by the veil rather
        than by whichever slide happens to be showing.
      */}
      <div className="relative z-[2] mx-auto w-full max-w-[1400px] px-5 pb-6 sm:px-8 lg:pb-0">
        <div className="max-w-[34ch] lg:max-w-[46%]">
          <p className="font-display text-2xl leading-[1.15] tracking-tight text-on-accent sm:text-3xl lg:text-[2.5rem]">
            {HERO.headline}
          </p>
          {/*
            Hidden on the narrowest phones. There the copy sits directly on the
            photograph, and every line of it has to be paid for in scrim: three
            lines of body text need the veil pushed dark enough to flatten the
            picture underneath. The headline and the masthead line above it
            already say what this is, and the Intro section immediately below
            carries the same sentence in full.
          */}
          <p className="mt-4 hidden max-w-[42ch] text-sm leading-relaxed text-on-accent/80 sm:block sm:text-base lg:text-lg">
            {HERO.subtext}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:mt-7 sm:flex-row sm:items-center">
            <ButtonLink {...bookingTarget()} variant="onPhoto">
              {CTA.book}
            </ButtonLink>
            <ButtonLink href="/gallery/" variant="quiet">
              {CTA.gallery}
            </ButtonLink>
          </div>

          <div className="mt-7 flex items-center justify-between gap-3 border-t border-on-accent/15 pt-4 lg:mt-9">
            <p
              aria-hidden="true"
              className="min-w-0 truncate font-display text-sm italic text-on-accent/60"
            >
              {active.label}
            </p>

            <div className="-mr-2 flex shrink-0 items-center gap-1">
              <Control
                onClick={() => goTo(index - 1)}
                label="Previous install"
                icon={<CaretLeft size={17} weight="bold" />}
              />

              {/*
            Six 44px dot targets need 264px. At the narrowest phone width they
            would share a row with three icon buttons and the style name, so
            below `sm` they collapse to a count. Shrinking the targets instead
            would put every one of them under the 44px minimum.
          */}
              <div className="-mx-1 hidden items-center sm:flex">
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
              <p
                aria-hidden="true"
                className="tabular px-2 font-display text-sm text-on-accent/70 sm:hidden"
              >
                {index + 1} / {count}
              </p>

              <Control
                onClick={() => goTo(index + 1)}
                label="Next install"
                icon={<CaretRight size={17} weight="bold" />}
              />

              {/*
            WCAG 2.2.2. `aria-pressed` rather than a changing accessible name,
            so the control keeps one name and announces its state; the glyph
            follows the same state for sighted visitors.

            Once the visitor has driven the carousel by hand, `stopped` is set,
            and this button is what hands autoplay back, which is why it clears
            both flags rather than only its own.
          */}
              <Control
                onClick={() => {
                  if (autoplayOn) {
                    setPaused(true);
                  } else {
                    setPaused(false);
                    setStopped(false);
                  }
                }}
                label={autoplayOn ? "Pause the carousel" : "Play the carousel"}
                pressed={!autoplayOn}
                icon={
                  autoplayOn ? (
                    <Pause size={16} weight="fill" />
                  ) : (
                    <Play size={16} weight="fill" />
                  )
                }
              />
            </div>
          </div>
        </div>
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

function Control({
  onClick,
  label,
  icon,
  pressed,
}: {
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className="tap inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border border-on-accent/25 text-on-accent/80 transition-colors duration-200 hover:border-on-accent/60 hover:bg-on-accent/12 hover:text-on-accent"
    >
      {icon}
    </button>
  );
}
