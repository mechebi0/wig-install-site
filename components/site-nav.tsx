"use client";

import { useEffect, useState } from "react";
import { List, X } from "@phosphor-icons/react/dist/ssr";
import { buttonStyles } from "@/components/button";
import { bookingTarget, CTA, NAV_LINKS, STUDIO } from "@/lib/content";

/**
 * Sticky nav, z-10. 64px on mobile, 72px at desktop, inside the 80px cap, and
 * the desktop row never wraps: four short links plus one CTA.
 *
 * Mobile navigation is deliberately shallow. Below lg the links move into a
 * full-height sheet with 56px rows, and the booking CTA is duplicated at the
 * bottom of that sheet inside thumb reach rather than only at the top.
 */
export function SiteNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    /*
      The menu sheet is a SIBLING of <header>, not a child, and this is load
      bearing. The header carries backdrop-blur, and a backdrop-filter makes an
      element the containing block for any `position: fixed` descendant. Nested
      inside, the sheet sized itself to the 64px header: its background painted
      only across that strip while its links spilled down over the page.
    */
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-bg/90 backdrop-blur-md">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-8 px-5 sm:px-8 lg:h-[72px]"
      >
        <a
          href="#main"
          className="font-display text-xl tracking-tight text-ink lg:text-2xl"
        >
          {STUDIO.name}
        </a>

        <ul className="hidden items-center gap-9 lg:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              {/* min-h-11 gives the link a 44px hit area inside the 72px bar
                  without changing the bar's height (WCAG target size). */}
              <a
                href={link.href}
                className="flex min-h-11 items-center text-sm text-muted transition-colors duration-200 hover:text-accent"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          {/*
            Visibility lives on a wrapper, never on the button itself.
            buttonStyles already sets `inline-flex`, so adding `hidden` beside
            it puts two display utilities in play and the winner comes down to
            stylesheet order rather than class order.
          */}
          <div className="hidden sm:block">
            <a {...bookingTarget()} className={buttonStyles.compact}>
              {CTA.book}
            </a>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            className="tap -mr-2 inline-flex cursor-pointer items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-2 lg:hidden"
          >
            <List size={24} weight="regular" />
          </button>
        </div>
      </nav>

      </header>

      {open ? (
        <div className="fixed inset-0 z-20 flex flex-col bg-bg lg:hidden">
          <div className="flex h-16 shrink-0 items-center justify-between px-5 sm:px-8">
            <span className="font-display text-xl tracking-tight text-ink">
              {STUDIO.name}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="tap -mr-2 inline-flex cursor-pointer items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-2"
            >
              <X size={24} weight="regular" />
            </button>
          </div>

          <ul className="flex flex-col px-5 pt-4 sm:px-8">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-14 items-center border-b border-line font-display text-2xl tracking-tight text-ink"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          {/* Bottom of the sheet, so it lands under the thumb. */}
          <div className="mt-auto px-5 pb-10 pt-8 sm:px-8">
            <a
              {...bookingTarget()}
              onClick={() => setOpen(false)}
              className={`${buttonStyles.primary} w-full`}
            >
              {CTA.book}
            </a>
            <a
              href={`tel:${STUDIO.phone.replace(/[^+\d]/g, "")}`}
              className="mt-3 flex min-h-11 items-center justify-center text-sm text-muted"
            >
              Or call {STUDIO.phone}
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}
