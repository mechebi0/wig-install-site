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
 *   subject    the same file at 60% of the width, bled to the right edge, and
 *              the hero is tall enough that this stays between a 1.0 and a
 *              1.33 frame against a
 *              0.75 file rather than the 2:1 band a short full-bleed banner
 *              would have forced. 80svh is what buys that: the panel widens
 *              with the screen, so the hero has to grow with it or a 1920
 *              monitor crops harder than a laptop. 1.33 was checked against
 *              all six photographs before it was picked, and holds the crown,
 *              the parting, the lace and a run of the lengths on every one.
 *
 * The browser fetches one file and paints it twice, so the backdrop is free.
 *
 * This is the standard treatment for portrait media in a landscape frame, and
 * it is what makes the hero work: the picture is cropped as little as the
 * shape allows rather than as much as it demands, nothing is stretched, and
 * the left of the frame is soft colour, which is exactly where the copy needs
 * to sit.
 *
 * Below `lg` none of it applies, and the composition is stacked rather than
 * split: the photograph takes the top of the frame on its own and the copy
 * sits on flat wine beneath it. That is the right way round for this brand.
 * The installs are the product, so on the screen where only one thing can be
 * first, the photograph is first. It also means no copy sits on a photograph
 * at any width, so the veil is a seam rather than a contrast floor and the
 * subtext no longer has to be hidden to keep the picture out of the mud.
 *
 * ---------------------------------------------------------------------------
 * THE COPY DOES NOT CHANGE WITH THE SLIDE
 * ---------------------------------------------------------------------------
 * Text that swaps every seven seconds cannot be read at a glance and cannot be
 * relied on by anyone who looks away. The photograph is the only thing that
 * moves. The only per-slide text is the small style name beside the controls.
 *
 * THE h1 IS HERE NOW. It used to sit on the brand masthead above, which
 * carried a second copy of the neon mark and a strapline; both were removed
 * when the mark moved into the nav bar, and the masthead with it. The heading
 * has to live somewhere real rather than becoming a visually hidden one, and
 * the proposition is the only fixed line of copy on this page large enough to
 * be it. It does not change with the slide, so it is still readable at a
 * glance.
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
 * PAUSING, AND WHY HOVER IS NOT WIRED TO THE WHOLE HERO
 * ---------------------------------------------------------------------------
 * WCAG 2.2.2 wants a mechanism to pause anything that moves on its own for
 * more than five seconds. That mechanism is the labelled pause/play button in
 * the control row. It is the primary one, it announces its own state, and it
 * is the only one that is discoverable without guessing.
 *
 * Hover used to be wired to the whole section, and that was a bug rather than
 * a feature. This hero is full width and 80svh tall, so on a desktop the
 * pointer is resting somewhere inside it almost all of the time: the carousel
 * that was supposed to advance on its own simply never advanced. Hover is now
 * scoped to the COPY COLUMN, which is the one region a visitor is either
 * reading or reaching across, and which holds both CTAs and every control.
 * Over the photograph, which is most of the hero, nothing is held.
 *
 * That scoping is also what keeps the secondary CTA honest. It points at the
 * collection the current slide is showing, so its destination must not change
 * between a visitor deciding to click and clicking: entering the copy column
 * stops the rotation before the pointer can reach the button.
 *
 * The rest, in order of how likely they are to be the thing that stops it:
 *
 *   pause button   explicit, labelled, aria-pressed, sticky until pressed
 *                  again. Restored after being dropped in an earlier pass.
 *   copy hover     holds while the pointer is inside the copy column. Read off
 *                  the DOM with `:hover` when the dwell timer fires, not
 *                  tracked in state; see the note on that effect for why every
 *                  event-based version of this ended up stuck on.
 *   focus          pauses while KEYBOARD focus is anywhere inside, so it never
 *                  moves under someone reading it with a keyboard. Gated on
 *                  :focus-visible, or a mouse click on an arrow would leave
 *                  DOM focus behind and stop the carousel for good.
 *   swipe / drag   a touch drag pauses for as long as the pointer is down.
 *   reduced motion under prefers-reduced-motion it never starts at all, and
 *                  the crossfade collapses to a near-instant swap.
 *
 * It also stops when scrolled out of view or when the tab is backgrounded,
 * which is not accessibility, just not burning a phone battery on a carousel
 * nobody is looking at.
 *
 * WHAT THE ARROWS AND DOTS DO. They move the carousel and restart the dwell;
 * they do NOT latch it off. Stopping rotation for good on the first tap of a
 * dot is a trap even with a play button present, because nothing tells the
 * visitor that the dot they pressed is what turned autoplay off. Anyone who
 * wants a frame held has the pause button, which says so.
 */

const DWELL_MS = 7000;
const FADE_MS = 1600;
const DRIFT_MS = 14000;
const REDUCED_FADE_MS = 200;
/** Horizontal travel, in px, that counts as a swipe rather than a tap. */
const SWIPE_PX = 48;
/** How often the dwell timer re-asks whether the pointer is still on the copy. */
const HOVER_RECHECK_MS = 400;

const HERO_SIZES = "(min-width: 1024px) 60vw, 100vw";

export function HeroCarousel() {
  const count = HERO_SLIDES.length;
  const sectionRef = useRef<HTMLElement>(null);
  /** The copy column. Hover is scoped to this, not to the whole hero. */
  const copyRef = useRef<HTMLDivElement>(null);

  const [index, setIndex] = useState(0);
  /** The explicit toggle. Sticky until pressed again. */
  const [paused, setPaused] = useState(false);
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

  useEffect(() => {
    const onVisibility = () => setPageVisible(!document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const rotating = !paused && !focusWithin && !reduced && inView && pageVisible;

  /*
    The dwell timer, and the hover pause, in one place.

    Hover is read off the DOM with `:hover` at the moment the timer fires,
    rather than tracked in React state from pointerenter/pointerleave. Twice
    now the state version has stuck at true and frozen the carousel for good:
    pressing a control swaps the glyph inside it, which unmounts the node the
    pointer is over, and the leave event for the move that follows never
    arrives. `:hover` cannot drift, because it is the browser's own answer to
    the same question, recomputed every frame.

    `(hover: hover)` gates it to devices that actually have a pointer. iOS
    keeps `:hover` latched on the last thing tapped until something else is
    tapped, so without the gate one tap in the copy column would stop the
    carousel for the rest of the visit.

    When the pointer IS inside the copy column the timer re-arms briefly
    instead of advancing, so the slide holds for as long as the pointer stays
    and resumes on its own the moment it leaves. No event required.
  */
  useEffect(() => {
    if (!rotating) return;

    const canHover =
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover)").matches;

    let timer = 0;
    const tick = () => {
      if (canHover && copyRef.current?.matches(":hover")) {
        timer = window.setTimeout(tick, HOVER_RECHECK_MS);
        return;
      }
      setIndex((current) => (current + 1) % count);
    };

    timer = window.setTimeout(tick, DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [rotating, index, count]);

  const goTo = useCallback(
    (target: number) => {
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

  return (
    <section
      ref={sectionRef}
      aria-roledescription="carousel"
      aria-label={`${HERO.brand} installs`}
      onKeyDown={onKeyDown}
      onFocus={(e) => {
        /* Keyboard focus only. A pointer click leaves DOM focus on the
           arrow it pressed, and treating that as "someone is reading this
           with a keyboard" would latch the carousel off after one click,
           with no control left anywhere to start it again. */
        if (
          e.target instanceof HTMLElement &&
          e.target.matches(":focus-visible")
        ) {
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
      className="on-photo relative isolate flex touch-pan-y flex-col overflow-hidden bg-ink lg:h-[80svh] lg:min-h-[560px] lg:max-h-[900px] lg:justify-center"
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

      {/*
        The photography. An in-flow band below lg, an absolutely positioned
        fill from lg.

        The band is sized by ASPECT rather than by viewport height, because a
        viewport height gives a ratio that changes with the width of the
        device: `h-[50svh]` reads as a comfortable 0.95 frame on a phone and a
        1.81 letterbox on an 834px tablet, and 1.8 is the crop that cuts these
        faces off at the mouth. 4:5 on a phone and 4:3 from `sm` holds the
        frame between 0.8 and 1.33 at every width below lg, which is the same
        range the desktop panel sits in. `max-h` caps it on a tall device so
        the copy underneath is never pushed a whole screen down.
      */}
      <div className="relative aspect-[4/5] max-h-[62svh] min-h-[300px] w-full shrink-0 sm:aspect-[4/3] lg:absolute lg:inset-0 lg:aspect-auto lg:max-h-none lg:min-h-0 lg:w-auto lg:flex-none">
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
                    className="hero-focal absolute inset-0 h-full w-full object-cover lg:left-auto lg:right-0 lg:w-[60%]"
                    style={
                      {
                        /*
                        Per-slide, and measured off the file rather than
                        guessed: see the note on HeroFocal in lib/images.ts.

                        Handed to CSS as a custom property read by
                        `.hero-focal` in app/globals.css, rather than set from
                        JavaScript. object-position cannot be a Tailwind
                        variant when its value is per-slide data, but it can be
                        a variable, and a variable is correct on the very first
                        paint where a measured breakpoint is not.
                      */
                        "--hero-focal": heroFocal(slide),
                        ...(reduced
                          ? null
                          : {
                              transitionProperty: "transform",
                              transitionDuration: `${DRIFT_MS}ms`,
                              transitionTimingFunction: "linear",
                              transform: isActive ? "scale(1)" : "scale(1.05)",
                            }),
                      } as React.CSSProperties
                    }
                  />
                </>
              ) : null}
            </div>
          );
        })}

        {/* The seam, inside the photography box so it tracks it through both
            layouts. No copy sits on the picture at either width, so this is
            not a contrast floor: on a phone it hands the foot of the frame to
            the wine below, and at lg it darkens the left of the frame under
            the copy column. */}
        <div
          aria-hidden="true"
          className="hero-veil pointer-events-none absolute inset-0 z-[1]"
        />
      </div>

      {/*
        Copy and controls, layer 2, in ONE column.

        The controls started at the bottom right of the frame, which is over
        the photograph, and on the pink and platinum slides a near-white glyph
        on bright hair was illegible. Everything the visitor has to read or
        press therefore lives in the same left column as the copy, over the
        blurred backdrop, where the contrast floor is set by the veil rather
        than by whichever slide happens to be showing.
      */}
      {/*
        The copy column's width is two caps, whichever is smaller, and the
        second one is not obvious.

        This container is centred and capped at 1400px like the rest of the
        page, but the photograph is positioned against the SECTION, which is
        full bleed. Above 1400px those two stop agreeing: at 1920 the container
        starts 260px in while the panel still starts at 40vw, so a plain
        `38%` of the container reaches 792px and the panel begins at 768. The
        copy ran under the photograph.

          40vw - 4rem      the width available when the container is not yet
                           capped, i.e. below 1400px
          700px - 10vw     where the panel's left edge lands in container
                           coordinates once it is, minus a gutter

        Taking the smaller of the two is correct in both regimes and leaves a
        40px gap at 1024, 1280, 1440 and 1920.
      */}
      <div className="relative z-[2] mx-auto w-full max-w-[1400px] px-5 pb-8 pt-7 sm:px-8 lg:pb-0 lg:pt-0">
        <div
          ref={copyRef}
          className="max-w-[34ch] lg:max-w-[min(calc(40vw-4rem),calc(700px-10vw-3rem))]"
        >
          <h1 className="font-display text-2xl leading-[1.15] tracking-tight text-on-accent sm:text-3xl lg:text-[2.5rem]">
            {HERO.headline}
          </h1>
          {/*
            Visible at every width again. It was hidden on phones while the
            copy sat on the photograph, where each line cost another step of
            scrim over the picture; the stacked phone layout puts it on flat
            wine, so it costs nothing.
          */}
          <p className="mt-4 max-w-[42ch] text-sm leading-relaxed text-on-accent/80 sm:text-base lg:text-lg">
            {HERO.subtext}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:mt-7 sm:flex-row sm:items-center">
            <ButtonLink {...bookingTarget()} variant="onPhoto">
              {CTA.book}
            </ButtonLink>
            {/*
              Points at the collection the slide is showing rather than at the
              top of the directory: someone who likes what is in front of them
              should land on more of that same style.

              A destination that changes every seven seconds would normally be
              a trap, and it is not one here only because of how this carousel
              pauses. A pointer moving toward the button enters the hero and
              stops the rotation before it arrives, and moving focus to it does
              the same, so by the time it can be activated the slide it points
              at is the slide being looked at.

              The visible label stays fixed for the same reason the rest of the
              copy does. The accessible name is the part that changes, because
              a screen reader user gets nothing from "View the gallery" read
              out six times with six different destinations behind it.
            */}
            <ButtonLink
              href={`/gallery/${active.collection}/`}
              variant="quiet"
              aria-label={`${CTA.gallery}: ${active.label}`}
            >
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
                WCAG 2.2.2. `aria-pressed` rather than a changing accessible
                name, so the control keeps one name and announces its state;
                the glyph follows the same state for sighted visitors.

                It is deliberately last in the row. The arrows and dots are
                what most people reach for, and a pause button between them
                would put a third thing in the middle of a two-thing gesture.
              */}
              <Control
                onClick={() => setPaused((was) => !was)}
                label={paused ? "Play the carousel" : "Pause the carousel"}
                pressed={paused}
                icon={
                  paused ? (
                    <Play size={16} weight="fill" />
                  ) : (
                    <Pause size={16} weight="fill" />
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
  /** Only the pause toggle sets this. Omitted, the button is not a toggle. */
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
