"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/reveal";
import { STYLES_SECTION } from "@/lib/content";
import { STYLE_GROUPS } from "@/lib/images";

/**
 * Swipeable galleries, one per style a client might ask for.
 *
 * Implemented as a real tablist so it is operable by keyboard and announced
 * correctly, with a scroll-snap rail inside each panel for native touch swipe.
 * Arrow buttons duplicate the swipe, because Pro Max requires every item be
 * reachable without dragging (WCAG "Dragging Movements").
 *
 * All panels stay mounted and inactive ones are `hidden`, so swiping to shot 3
 * of one style and coming back does not reset it or re-download the images.
 */
export function StyleGalleries() {
  const [active, setActive] = useState(STYLE_GROUPS[0].id);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onTabKey = (event: React.KeyboardEvent, i: number) => {
    const dir = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    event.preventDefault();
    const next =
      STYLE_GROUPS[(i + dir + STYLE_GROUPS.length) % STYLE_GROUPS.length];
    setActive(next.id);
    tabRefs.current[next.id]?.focus();
  };

  return (
    <section
      id="styles"
      className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28"
    >
      <Reveal>
        <h2 className="max-w-[18ch] font-display text-3xl leading-[1.08] tracking-tight text-ink md:text-4xl lg:text-5xl">
          {STYLES_SECTION.heading}
        </h2>
        <p className="mt-4 max-w-[54ch] text-base leading-relaxed text-muted lg:text-lg">
          {STYLES_SECTION.body}
        </p>
      </Reveal>

      <Reveal index={1}>
        {/* Horizontally scrollable on small screens so labels never wrap. */}
        <div
          role="tablist"
          aria-label="Installation styles"
          className="no-scrollbar mt-10 flex gap-2 overflow-x-auto pb-1"
        >
          {STYLE_GROUPS.map((group, i) => {
            const selected = group.id === active;
            return (
              <button
                key={group.id}
                ref={(el) => {
                  tabRefs.current[group.id] = el;
                }}
                role="tab"
                id={`tab-${group.id}`}
                aria-selected={selected}
                aria-controls={`panel-${group.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(group.id)}
                onKeyDown={(e) => onTabKey(e, i)}
                className={`min-h-11 shrink-0 cursor-pointer rounded-full border px-5 text-sm font-medium transition-[background-color,border-color,color] duration-200 ${
                  selected
                    ? "border-accent bg-accent text-on-accent"
                    : "border-line-strong bg-surface text-ink hover:border-accent hover:text-accent"
                }`}
              >
                {group.label}
              </button>
            );
          })}
        </div>
      </Reveal>

      {STYLE_GROUPS.map((group) => (
        <div
          key={group.id}
          role="tabpanel"
          id={`panel-${group.id}`}
          aria-labelledby={`tab-${group.id}`}
          hidden={group.id !== active}
          className="pt-8"
        >
          <StyleRail group={group} />
        </div>
      ))}
    </section>
  );
}

function StyleRail({ group }: { group: (typeof STYLE_GROUPS)[number] }) {
  const railRef = useRef<HTMLUListElement>(null);
  const [scrollable, setScrollable] = useState(false);

  /*
    At wide viewports a three-shot group fits without scrolling, and arrows
    that cannot move anything are worse than no arrows. Measured rather than
    assumed from a breakpoint, because it depends on the shot count.

    A ResizeObserver is used instead of a one-off measurement because this rail
    starts inside a `hidden` panel with zero width, and only gets real
    dimensions when its tab is selected.
  */
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const measure = () =>
      setScrollable(rail.scrollWidth > rail.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    return () => observer.disconnect();
  }, []);

  const nudge = useCallback((direction: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 16 : rail.clientWidth * 0.8;
    rail.scrollBy({ left: step * direction, behavior: "smooth" });
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="max-w-[58ch] text-base leading-relaxed text-muted">
          {group.blurb}
        </p>
        {/* Shown only when there is somewhere to scroll to. */}
        <div
          className={`shrink-0 gap-2 ${scrollable ? "hidden sm:flex" : "hidden"}`}
        >
          <RailArrow label={`Previous ${group.label} photo`} onClick={() => nudge(-1)}>
            <CaretLeft size={17} weight="bold" />
          </RailArrow>
          <RailArrow label={`Next ${group.label} photo`} onClick={() => nudge(1)}>
            <CaretRight size={17} weight="bold" />
          </RailArrow>
        </div>
      </div>

      <ul
        ref={railRef}
        tabIndex={0}
        aria-label={`${group.label} gallery, swipe or use the arrow keys`}
        className="no-scrollbar -mx-5 mt-6 flex snap-x snap-mandatory scroll-pl-5 gap-4 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:scroll-pl-8 sm:px-8"
      >
        {group.shots.map((shot) => (
          <li
            key={shot.src}
            className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[31%]"
          >
            <figure>
              <div className="relative aspect-4/5 overflow-hidden rounded-3xl bg-surface-2 shadow-soft">
                <Image
                  src={shot.src}
                  alt={shot.alt}
                  width={shot.width}
                  height={shot.height}
                  loading="lazy"
                  sizes="(min-width: 1024px) 31vw, (min-width: 640px) 46vw, 78vw"
                  className="h-full w-full object-cover"
                />
              </div>
              <figcaption className="mt-3 text-sm leading-relaxed text-muted">
                {shot.alt}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RailArrow({
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
