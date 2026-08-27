"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { List, X } from "@phosphor-icons/react/dist/ssr";
import { buttonStyles } from "@/components/button";
import { Wordmark } from "@/components/wordmark";
import { bookingTarget, CTA, NAV_LINKS, STUDIO } from "@/lib/content";

/**
 * Sticky nav, z-10. 64px on mobile, 72px at desktop, inside the 80px cap, and
 * the desktop row never wraps: four short links plus one CTA.
 *
 * It stays an opaque blush bar rather than going transparent over the hero.
 * A transparent nav on a carousel means the link contrast is decided by
 * whichever photograph happens to be showing, and half of this hero set is
 * high key, so near-white links would fail against them. An opaque bar over a
 * full bleed hero is also what the luxury beauty houses actually do.
 *
 * At the very top the bottom border is transparent, so the bar meets the hero
 * cleanly; it fades in a hairline and a soft shadow once the page scrolls and
 * the bar starts overlapping pale content.
 *
 * The links are routes now rather than in-page anchors, so the current page is
 * marked with aria-current and carries a permanent rule under it. Without that
 * a multi-page site gives the visitor no idea where they are.
 *
 * Mobile navigation is deliberately shallow. Below lg the links move into a
 * full-height sheet with 56px rows, and the booking CTA is duplicated at the
 * bottom of that sheet inside thumb reach rather than only at the top.
 */
/**
 * `trailingSlash: true` in next.config.ts means the browser URL is "/work/"
 * while NAV_LINKS holds "/work". Comparing the two raw would mark nothing as
 * the current page, so every comparison goes through here first. Root stays
 * "/" rather than collapsing to "".
 */
function samePath(a: string, b: string) {
  const trim = (p: string) => (p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p);
  return trim(a) === trim(b);
}

export function SiteNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  /*
    The sheet stores the route it was opened on rather than a boolean, so
    "still open" is derived rather than synchronised. Any navigation, back
    button included, changes `pathname` and the sheet is closed by arithmetic
    on the next render. The effect-plus-setState version of this was both a
    cascading render and a lint error.
  */
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt !== null && samePath(openedAt, pathname);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenedAt(null);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isCurrent = (href: string) => samePath(pathname, href);

  return (
    /*
      The menu sheet is a SIBLING of <header>, not a child, and this is load
      bearing. The header carries backdrop-blur, and a backdrop-filter makes an
      element the containing block for any `position: fixed` descendant. Nested
      inside, the sheet sized itself to the 64px header: its background painted
      only across that strip while its links spilled down over the page.
    */
    <>
      <header
        className={`sticky top-0 z-10 border-b bg-bg/90 backdrop-blur-md transition-[border-color,box-shadow] duration-300 ${
          scrolled ? "border-line shadow-soft" : "border-transparent"
        }`}
      >
        <nav
          aria-label="Primary"
          className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-8 px-5 sm:px-8 lg:h-[72px]"
        >
          <a
            href="/"
            aria-label={`${STUDIO.name}, home`}
            className="text-ink"
          >
            <Wordmark className="text-xl lg:text-[1.4rem]" />
          </a>

          <ul className="hidden items-center gap-9 lg:flex">
            {NAV_LINKS.map((link) => {
              const current = isCurrent(link.href);
              return (
                <li key={link.href}>
                  {/* min-h-11 gives the link a 44px hit area inside the 72px bar
                      without changing the bar height (WCAG target size). The
                      rule wipes in from the left on hover, and stays put on the
                      page you are actually on. */}
                  <a
                    href={link.href}
                    aria-current={current ? "page" : undefined}
                    className={`group relative flex min-h-11 items-center text-sm transition-colors duration-200 ${
                      current ? "text-ink" : "text-muted hover:text-ink"
                    }`}
                  >
                    {link.label}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-0 bottom-2.5 h-px origin-left bg-accent transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
                        current ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                      }`}
                    />
                  </a>
                </li>
              );
            })}
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
              onClick={() => setOpenedAt(pathname)}
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
            <Wordmark className="text-xl text-ink" />
            <button
              type="button"
              onClick={() => setOpenedAt(null)}
              aria-label="Close menu"
              className="tap -mr-2 inline-flex cursor-pointer items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-2"
            >
              <X size={24} weight="regular" />
            </button>
          </div>

          <ul className="flex flex-col px-5 pt-4 sm:px-8">
            <li>
              <a
                href="/"
                aria-current={isCurrent("/") ? "page" : undefined}
                className={`flex min-h-14 items-center border-b border-line font-display text-2xl tracking-tight ${
                  isCurrent("/") ? "text-accent" : "text-ink"
                }`}
              >
                Home
              </a>
            </li>
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  aria-current={isCurrent(link.href) ? "page" : undefined}
                  className={`flex min-h-14 items-center border-b border-line font-display text-2xl tracking-tight ${
                    isCurrent(link.href) ? "text-accent" : "text-ink"
                  }`}
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
              onClick={() => setOpenedAt(null)}
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
