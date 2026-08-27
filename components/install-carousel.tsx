"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Pause,
  Play,
} from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/reveal";
import { CAROUSEL_SECTION } from "@/lib/content";
import { CAROUSEL } from "@/lib/images";

/**
 * Featured installs: a slow moving peek rail of finished work.
 *
 * Different job from the hero carousel, and deliberately a different mechanism
 * so the page does not repeat itself. The hero is one full bleed frame at a
 * time; this is a rail where the next photograph is already half visible,
 * which is what invites the swipe.
 *
 * Built on scroll-snap rather than a transform track, so touch swipe, trackpad
 * swipe and momentum are the browser implementations rather than a
 * reimplementation that fights them.
 *
 * Auto-rotation follows the UI/UX Pro Max "Auto-Rotating Content Controls"
 * rule in full:
 *   - explicit play/pause control, plus previous and next
 *   - halts on hover, on focus entering the region, and on any manual swipe
 *   - never runs at all under prefers-reduced-motion
 *   - position announced politely, so it is not silent to a screen reader
 *   - every slide reachable by button and keyboard, never drag-only
 */

const DWELL_MS = 6500;

export function InstallCarousel() {
  const railRef = useRef<HTMLUListElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [held, setHeld] = useState(false);
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(false);

  const count = CAROUSEL.length;

  // Reduced motion is read from the platform, and kept live if it changes.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  /*
    Rotation only runs while the section is actually on screen. Two reasons:
    a visitor who scrolls down should arrive on the first install rather than
    wherever an invisible timer happened to leave it, and nothing should be
    animating off screen.
  */
  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /*
    Which slide is "current".

    A threshold observer is wrong here: slides are 40% wide at desktop, so two
    or three clear any sensible threshold at the same time and the winner comes
    down to callback ordering. That desynchronised the dots and the announced
    position from what was actually on screen.

    Instead the rail is measured, and the slide whose centre sits closest to
    the rail centre wins. `scrollend` handles the settle, and the observer is
    kept purely as a trigger for browsers without it (Safari before 17.4).
  */
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const sync = () => {
      const mid = rail.scrollLeft + rail.clientWidth / 2;
      let best = 0;
      let bestDistance = Infinity;
      Array.from(rail.children).forEach((child, i) => {
        const el = child as HTMLElement;
        const distance = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      });

      /*
        Clamp at the extremes. Slides are a fraction of the rail width, so the
        first and last can never physically reach the rail centre: at
        scrollLeft 0 the centre of slide 1 sits left of the midpoint and its
        neighbour measures closer. Without this, showing the first slide
        highlighted dot 2 and announced the wrong position.
      */
      const maxScroll = rail.scrollWidth - rail.clientWidth;
      if (rail.scrollLeft <= 2) best = 0;
      else if (maxScroll > 0 && rail.scrollLeft >= maxScroll - 2)
        best = rail.children.length - 1;

      setIndex(best);
    };

    sync();

    const observer = new IntersectionObserver(sync, {
      root: rail,
      threshold: [0.25, 0.5, 0.75],
    });
    for (const child of rail.children) observer.observe(child);

    rail.addEventListener("scrollend", sync);
    return () => {
      observer.disconnect();
      rail.removeEventListener("scrollend", sync);
    };
  }, []);

  const goTo = useCallback(
    (target: number, smooth = true) => {
      const rail = railRef.current;
      if (!rail) return;
      const next = ((target % count) + count) % count;
      const slide = rail.children[next] as HTMLElement | undefined;
      if (!slide) return;

      rail.scrollTo({
        left: slide.offsetLeft - (rail.clientWidth - slide.offsetWidth) / 2,
        behavior: smooth && !reduced ? "smooth" : "auto",
      });
    },
    [count, reduced],
  );

  // The rotation itself. Suspended whenever the user is engaged with it.
  useEffect(() => {
    if (!playing || held || reduced || !inView) return;
    const timer = window.setTimeout(() => goTo(index + 1), DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [playing, held, reduced, inView, index, goTo]);

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

  const active = CAROUSEL[index];

  return (
    <section
      ref={sectionRef}
      id="installs"
      aria-roledescription="carousel"
      aria-label="Featured installs"
      className="scroll-mt-24 overflow-hidden bg-surface-2/60 py-20 lg:py-28"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setHeld(false);
      }}
    >
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <Reveal>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="max-w-[16ch] font-display text-3xl leading-[1.08] tracking-tight text-ink md:text-4xl lg:text-5xl">
                {CAROUSEL_SECTION.heading}
              </h2>
              <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-muted">
                {CAROUSEL_SECTION.body}
              </p>
            </div>

            {/* Controls: 44px targets, 8px apart. */}
            <div className="flex shrink-0 items-center gap-2">
              <RoundButton
                label={playing ? "Pause the carousel" : "Play the carousel"}
                onClick={() => setPlaying((p) => !p)}
              >
                {playing && !reduced ? (
                  <Pause size={17} weight="fill" />
                ) : (
                  <Play size={17} weight="fill" />
                )}
              </RoundButton>
              <RoundButton
                label="Previous install"
                onClick={() => {
                  setPlaying(false);
                  goTo(index - 1);
                }}
              >
                <ArrowLeft size={17} weight="bold" />
              </RoundButton>
              <RoundButton
                label="Next install"
                onClick={() => {
                  setPlaying(false);
                  goTo(index + 1);
                }}
              >
                <ArrowRight size={17} weight="bold" />
              </RoundButton>
            </div>
          </div>
        </Reveal>
      </div>

      <ul
        ref={railRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={() => setPlaying(false)}
        aria-label="Featured installs, swipe or use the arrow keys"
        className="no-scrollbar mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-3 sm:gap-6 sm:px-8 lg:mt-14"
      >
        {CAROUSEL.map((slide, i) => (
          <li
            key={slide.image.src}
            data-slide={i}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            className="w-[82%] shrink-0 snap-center sm:w-[58%] lg:w-[40%] xl:w-[34%]"
          >
            <figure>
              <div className="relative aspect-4/5 overflow-hidden rounded-3xl bg-surface-2 shadow-soft">
                <Image
                  src={slide.image.src}
                  alt={slide.image.alt}
                  width={slide.image.width}
                  height={slide.image.height}
                  loading="lazy"
                  sizes="(min-width: 1280px) 34vw, (min-width: 1024px) 40vw, (min-width: 640px) 58vw, 82vw"
                  className="h-full w-full object-cover"
                />
              </div>
              <figcaption className="mt-4 px-1">
                <span className="block font-display text-lg tracking-tight text-ink">
                  {slide.title}
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-muted">
                  {slide.caption}
                </span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>

      {/*
        Dots double as direct jumps, and stay 44px for the tap target. No flex
        gap on top of that: six 44px targets plus 4px gaps came to 284px, which
        is 4px more than a 320px phone has between the page gutters. The spacing
        you see between the pills is the padding inside each target.
      */}
      <div className="mx-auto mt-6 flex max-w-[1400px] items-center justify-center px-5 sm:px-8">
        {CAROUSEL.map((slide, i) => (
          <button
            key={slide.image.src}
            type="button"
            aria-label={`Go to ${slide.title}, slide ${i + 1} of ${count}`}
            aria-current={i === index}
            onClick={() => {
              setPlaying(false);
              goTo(i);
            }}
            className="tap group flex cursor-pointer items-center justify-center px-1"
          >
            <span
              className={`block h-1.5 rounded-full transition-all duration-300 ${
                i === index
                  ? "w-7 bg-accent"
                  : "w-1.5 bg-line-strong group-hover:bg-muted"
              }`}
            />
          </button>
        ))}
      </div>

      {/* Politely announced, so the rotation is not silent. */}
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {`Slide ${index + 1} of ${count}: ${active.title}`}
      </p>
    </section>
  );
}

function RoundButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="tap inline-flex cursor-pointer items-center justify-center rounded-full border border-line-strong bg-surface text-ink transition-[background-color,border-color,transform] duration-200 hover:border-accent hover:text-accent active:scale-95"
    >
      {children}
    </button>
  );
}
