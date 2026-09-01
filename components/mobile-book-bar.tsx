"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarCheck, EnvelopeSimple, Phone } from "@phosphor-icons/react/dist/ssr";
import { CTA, REACH, STUDIO, bookingTarget } from "@/lib/content";

/**
 * Sticky booking bar, mobile only, z-15.
 *
 * On a phone the hero CTA scrolls away within one flick and the nav CTA is at
 * the top of the screen, out of thumb reach. This keeps booking and calling
 * one tap away for the whole page, which is the single biggest conversion
 * lever on a local service site.
 *
 * Now that the site is more than one page, the trigger is a scroll threshold
 * rather than an observer on the hero: the hero only exists on the homepage,
 * and the inner pages need the bar just as much. 320px is roughly the point
 * where the page header has left the screen.
 *
 * The glyph on the secondary button follows the link rather than being fixed:
 * a handset beside a mailto: is a small lie, and it is the kind a visitor only
 * discovers by tapping it and watching their mail client open. No studio phone
 * number has been supplied, so today it is an envelope; add STUDIO.phone in
 * lib/content.ts and it becomes a handset on its own.
 *
 * It hides itself entirely on the booking page, the admin dashboard and the
 * account screens. Floating a "book" button over the booking form is the
 * classic version of this component covering the thing it is pointing at.
 */
const REVEAL_AT = 320;

export function MobileBookBar() {
  const pathname = usePathname();
  const [past, setPast] = useState(false);

  useEffect(() => {
    const onScroll = () => setPast(window.scrollY > REVEAL_AT);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /*
    A client side navigation lands at the top of the new page, so the bar has
    to start hidden again. This is React's documented "adjust state when a
    prop changes" pattern rather than an effect: setting state during render
    re-renders immediately without committing the stale frame, where an effect
    would paint the bar, then hide it.
  */
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setPast(false);
  }

  /*
    Routes this bar has no business floating over. Trailing slashes are
    stripped first because `trailingSlash: true` means the browser URL is
    "/book/" while these are written without.

    /book        it would cover the booking form it points at
    /admin       Nat is running her business, not being sold an appointment,
                 and on a phone this bar sits on top of the status controls
    /login etc.  a "Book Your Chair" pill over a password field is noise

    /account deliberately keeps it. A customer looking at their appointments
    is the single most likely person on the site to want another one.
  */
  const HIDDEN_ON = ["/book", "/admin", "/login", "/signup", "/forgot-password", "/reset-password"];
  const current = pathname.replace(/\/$/, "") || "/";
  const hidden = HIDDEN_ON.includes(current);
  const shown = past && !hidden;

  if (hidden) return null;

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
          href={REACH.href}
          tabIndex={shown ? 0 : -1}
          aria-label={`Reach the studio: ${REACH.phrase}`}
          className="tap inline-flex shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface text-ink transition-colors hover:border-accent hover:text-accent"
        >
          {STUDIO.phone ? (
            <Phone size={19} weight="regular" />
          ) : (
            <EnvelopeSimple size={19} weight="regular" />
          )}
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
