"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Phone } from "@phosphor-icons/react/dist/ssr";
import { bookingTarget, CTA, STUDIO } from "@/lib/content";

/**
 * Sticky booking bar, mobile only, z-15.
 *
 * On a phone the hero CTA scrolls away within one flick and the nav CTA is at
 * the top of the screen, out of thumb reach. This keeps booking and calling
 * one tap away for the whole page, which is the single biggest conversion
 * lever on a local service site.
 *
 * Visibility is driven by an IntersectionObserver on the hero, never a scroll
 * listener, and it hides itself again over the booking form so it never covers
 * the thing it is pointing at. Its height is reserved on <body> via padding so
 * it cannot obscure the footer.
 */
export function MobileBookBar() {
  const [past, setPast] = useState(false);
  const [atForm, setAtForm] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero");
    const form = document.getElementById("book");
    const observers: IntersectionObserver[] = [];

    if (hero) {
      const o = new IntersectionObserver(
        ([entry]) => setPast(!entry.isIntersecting),
        { threshold: 0, rootMargin: "-120px 0px 0px 0px" },
      );
      o.observe(hero);
      observers.push(o);
    }

    if (form) {
      const o = new IntersectionObserver(
        ([entry]) => setAtForm(entry.isIntersecting),
        { threshold: 0.12 },
      );
      o.observe(form);
      observers.push(o);
    }

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const shown = past && !atForm;

  return (
    <div
      aria-hidden={!shown}
      className={`fixed inset-x-0 bottom-0 z-[15] border-t border-line bg-bg/95 backdrop-blur-md transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none lg:hidden ${
        shown ? "translate-y-0" : "translate-y-full"
      }`}
      // Clears the iOS home indicator.
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center gap-2 px-4 pt-3">
        <a
          href={`tel:${STUDIO.phone.replace(/[^+\d]/g, "")}`}
          tabIndex={shown ? 0 : -1}
          aria-label={`Call the studio on ${STUDIO.phone}`}
          className="tap inline-flex shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface text-ink transition-colors hover:border-accent hover:text-accent"
        >
          <Phone size={19} weight="regular" />
        </a>
        <a
          {...bookingTarget()}
          tabIndex={shown ? 0 : -1}
          className="inline-flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-medium text-on-accent shadow-lifted transition-[background-color,transform] duration-200 active:scale-[0.98]"
        >
          <CalendarCheck size={17} weight="regular" aria-hidden="true" />
          {CTA.book}
        </a>
      </div>
    </div>
  );
}
