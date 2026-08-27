"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play } from "@phosphor-icons/react/dist/ssr";
import { ButtonLink } from "@/components/button";
import { bookingTarget, CTA, HERO } from "@/lib/content";
import { HERO_SLIDES } from "@/lib/images";

/**
 * The homepage hero: a full-bleed carousel that crossfades slowly through six
 * finished installs while the brand block and the booking CTA stay put.
 *
 * WHY THE COPY DOES NOT CHANGE WITH THE SLIDE
 * Text that swaps every seven seconds cannot be read at a glance and cannot be
 * relied on by anyone who looks away. So the photograph is the only thing that
 * moves: brand, proposition and CTA are fixed, and the only per-slide text is
 * the small style label beside the controls.
 *
 * TIMING
 * DWELL 7s, FADE 1.8s, and a 12s drift on the transform. That is deliberately
 * slower than a stock carousel. A frame needs roughly five seconds before it
 * stops being motion and starts being a photograph, and the drift is long
 * enough that it is never perceived as a zoom, only as the image being alive.
 *
 * LEGIBILITY
 * Handled entirely by `.hero-scrim` in globals.css rather than per slide, and
 * the contrast floor is computed there. Nothing here needs to know how bright
 * the current photograph is.
 *
 * MOTION PREFERENCES
 * Under prefers-reduced-motion nothing auto-advances, the drift transform is
 * dropped, and the crossfade shortens to a plain 200ms opacity change. The
 * carousel stays fully operable: the dots are real buttons, they are 44px
 * targets, and arrow keys work. The play control is removed rather than left
 * as a dead switch, since with rotation off there is nothing for it to do.
 *
 * PERFORMANCE
 * Slide one is the LCP element. It is preloaded from the document head (see
 * app/layout.tsx) and rendered eagerly at high priority; the other five are
 * not put in the DOM until `warm` flips shortly after mount, so they cannot
 * compete with it for bandwidth. Each slide ships a landscape and a portrait
 * crop and <picture> fetches exactly one of them.
 */

const DWELL_MS = 7000;
const FADE_MS = 1800;
const DRIFT_MS = 12000;
const REDUCED_FADE_MS = 200;

export function HeroCarousel() {
  const count = HERO_SLIDES.length;
  const sectionRef = useRef<HTMLElement>(null);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [warm, setWarm] = useState(false);

  // Read the platform preference, and keep it live if the user changes it.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Mount the remaining slides once the first one has had the network to itself.
  useEffect(() => {
    const id = window.setTimeout(() => setWarm(true), 900);
    return () => window.clearTimeout(id);
  }, []);

  // Nothing animates while the hero is scrolled past or the tab is in the background.
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

  const rotating = playing && !reduced && inView && pageVisible;

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setTimeout(
      () => setIndex((current) => (current + 1) % count),
      DWELL_MS,
    );
    return () => window.clearTimeout(timer);
  }, [rotating, index, count]);

  /** Manual navigation always stops the rotation; it never fights the user. */
  const goTo = useCallback(
    (target: number) => {
      setPlaying(false);
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

  const active = HERO_SLIDES[index];

  return (
    <section
      ref={sectionRef}
      id="hero"
      aria-roledescription="carousel"
      aria-label={`${HERO.brand} installs`}
      className="on-photo relative isolate flex min-h-[calc(100svh-4rem)] flex-col justify-end overflow-hidden bg-ink lg:min-h-[calc(100svh-72px)] lg:max-h-[880px]"
    >
      {/* Photography, layer 0. */}
      <div className="absolute inset-0 z-0">
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
                <picture>
                  {/*
                    The crop is chosen by the shape of the frame, not by width
                    alone. The hero is the viewport minus the nav, so a portrait
                    tablet at 834x1048 is a 0.8 frame and wants the portrait
                    crop just as much as a phone does; keying only off width
                    handed it the 1.6 landscape file, which then lost the hair
                    off the right edge and left the top third empty. Landscape
                    frames from 768px up get the wide crop, everything else gets
                    the tall one. This condition and the preload pair in
                    app/layout.tsx have to stay in step.
                  */}
                  <source
                    media="(min-width: 768px) and (min-aspect-ratio: 1/1)"
                    srcSet={slide.wide.src}
                    width={slide.wide.width}
                    height={slide.wide.height}
                  />
                  {/*
                    A plain <img> rather than next/image, because next/image
                    cannot render <picture> and art direction is the point
                    here: a 16:10 landscape cropped into a 9:19 phone viewport
                    shows a narrow band through the middle of the frame and
                    cuts the hair out of a hair photograph. `unoptimized` is
                    already set globally for the static export, so next/image
                    would add nothing but a wrapper. (Note that
                    @next/next/no-img-element does not fire on this: the rule
                    exempts an <img> that is the fallback inside a <picture>.)
                  */}
                  <img
                    src={slide.tall.src}
                    alt={slide.alt}
                    width={slide.tall.width}
                    height={slide.tall.height}
                    loading={i === 0 ? "eager" : "lazy"}
                    fetchPriority={i === 0 ? "high" : "low"}
                    decoding={i === 0 ? "sync" : "async"}
                    className="h-full w-full object-cover"
                  />
                </picture>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Scrim, layer 1. Carries the contrast floor for everything above it. */}
      <div
        aria-hidden="true"
        className="hero-scrim pointer-events-none absolute inset-0 z-[1]"
      />

      {/* Copy and controls, layer 2. */}
      <div className="relative z-[2] mx-auto w-full max-w-[1400px] px-5 pb-10 pt-28 sm:px-8 lg:pb-14 lg:pt-32">
        <div className="grid gap-9 lg:grid-cols-12 lg:items-end lg:gap-8">
          {/*
            min-w-0 on both columns. A grid track sized `auto` takes its
            maximum from the max-content of its items, and it is NOT clamped to
            the container, so one wide row of fixed-size controls can push the
            whole track past the viewport and the section then clips it. These
            two guards mean no future content can do that again.
          */}
          <div className="min-w-0 lg:col-span-7">
            <h1>
              <span className="label block text-on-accent/75">
                {HERO.kicker}
              </span>
              <span className="mt-5 block font-display text-[3.25rem] leading-[0.92] tracking-tight text-on-accent sm:text-6xl lg:text-7xl xl:text-[5.25rem]">
                {HERO.brand}
              </span>
              <span className="mt-4 block max-w-[18ch] font-display text-xl italic leading-snug text-on-accent/85 sm:text-2xl lg:text-[1.75rem]">
                {HERO.line}
              </span>
            </h1>

            <p className="mt-6 max-w-[46ch] text-base leading-relaxed text-on-accent/80 lg:text-lg">
              {HERO.subtext}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink {...bookingTarget()} variant="onPhoto">
                {CTA.book}
              </ButtonLink>
              <ButtonLink href="#installs" variant="quiet">
                {CTA.work}
              </ButtonLink>
            </div>
          </div>

          {/*
            Arrow keys step the carousel while focus is anywhere in the control
            group. Every dot is already a real button, so this is a shortcut on
            top of working keyboard access, never a replacement for it.
          */}
          <div
            onKeyDown={onControlKeyDown}
            className="flex min-w-0 flex-col gap-3 lg:col-span-5 lg:items-end lg:gap-5"
          >
            <div className="flex w-full items-center justify-between gap-4 lg:w-auto lg:justify-end lg:gap-5">
              {/*
                The one piece of text that changes with the slide. Announced
                through the live region below rather than read twice.
              */}
              <p aria-hidden="true" className="label text-on-accent/70">
                {active.label}
              </p>

              {/*
                Removed rather than disabled under reduced motion: with nothing
                rotating there is nothing to pause, and a control that does
                nothing is worse than no control.
              */}
              {reduced ? null : (
                <button
                  type="button"
                  onClick={() => setPlaying((current) => !current)}
                  aria-label={
                    playing ? "Pause the hero carousel" : "Play the hero carousel"
                  }
                  className="tap inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border border-on-accent/45 text-on-accent transition-[background-color,border-color] duration-200 hover:border-on-accent hover:bg-on-accent/12"
                >
                  {playing ? (
                    <Pause size={15} weight="fill" />
                  ) : (
                    <Play size={15} weight="fill" />
                  )}
                </button>
              )}
            </div>

            {/*
              The dot rail gets a row to itself rather than sharing one with the
              label. Six 44px targets need 264px, which fits a 320px phone once
              nothing else is competing for the line; sharing the row cost 72px
              more than the narrowest viewport has. Spacing between the dots
              comes from the 44px targets themselves, so there is no flex gap on
              top of it.
            */}
            <div className="-mx-1 flex items-center">
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
