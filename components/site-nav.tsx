"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { List, UserCircle, X } from "@phosphor-icons/react/dist/ssr";
import { buttonStyles } from "@/components/button";
import { useAuthState } from "@/lib/auth/session";
import { Wordmark } from "@/components/wordmark";
import {
  CTA,
  NAV_LINKS,
  REACH,
  REACH_SECONDARY,
  STUDIO,
  bookingTarget,
} from "@/lib/content";

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
 *
 * THE ACCOUNT CONTROL
 * One entry, and it is the only thing the booking system adds to this bar.
 * "Log in" when signed out, "Account" when signed in, and nothing at all when
 * no Supabase project is configured. It is a quiet text link rather than a
 * second button, because the site has exactly one primary action and it is
 * Book Your Chair; two filled pills side by side would make neither of them
 * the point.
 *
 * There is NO admin link here, and there is not going to be one. Nat reaches
 * her dashboard by typing /admin or bookmarking it. Putting it in the public
 * navigation would advertise to every visitor that an admin account exists,
 * and it would be the only item in this bar that is useless to all but one
 * person.
 */
/**
 * `trailingSlash: true` in next.config.ts means the browser URL is "/work/"
 * while NAV_LINKS holds "/work". Comparing the two raw would mark nothing as
 * the current page, so every comparison goes through here first. Root stays
 * "/" rather than collapsing to "".
 */
/**
 * NAV_LINKS, cut in half so the mark can sit between them.
 *
 * The split is positional rather than curated: the first two links go left of
 * the mark and the rest go right. NAV_LINKS is already in the order the bar
 * should read - Gallery, Before you book, then Reviews, Meet Nat - so adding a
 * fifth link lands it on the right without touching this file, and the bar
 * stays balanced because the booking pill is on that side too.
 */
const NAV_LEFT = NAV_LINKS.slice(0, 2);
const NAV_RIGHT = NAV_LINKS.slice(2);

/**
 * One desktop nav link. Extracted only because the bar now renders two lists
 * instead of one, and two copies of this markup would drift.
 *
 * `min-h-11` gives the link a 44px hit area inside the 72px bar without
 * changing the bar height (WCAG target size). The rule wipes in from the left
 * on hover and stays put on the page you are actually on.
 */
function NavItem({
  link,
  current,
}: {
  link: (typeof NAV_LINKS)[number];
  current: boolean;
}) {
  return (
    <li>
      <a
        href={link.href}
        aria-current={current ? "page" : undefined}
        className={`group relative flex min-h-11 items-center whitespace-nowrap text-sm transition-colors duration-200 ${
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
}

function samePath(a: string, b: string) {
  const trim = (p: string) => (p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p);
  return trim(a) === trim(b);
}

export function SiteNav() {
  const pathname = usePathname();
  const auth = useAuthState();
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

  /*
    The sheet, and the control that opened it. Both are needed for the focus
    contract below: focus goes into the sheet when it opens and comes back to
    the button when it closes without going anywhere.
  */
  const sheetRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  /** Closes the sheet AND hands focus back, for the two dismissals that stay
      on the page. Navigation does not use it: focus belongs on the new page. */
  const dismiss = () => {
    setOpenedAt(null);
    menuButtonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;

    const sheet = sheetRef.current;
    const focusables = () =>
      Array.from(
        sheet?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ??
          [],
      ).filter((el) => el.offsetParent !== null);

    /* The sheet covers the viewport, so opening it and leaving focus on the
       bar underneath would put the next Tab somewhere invisible. */
    focusables()[0]?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenedAt(null);
        menuButtonRef.current?.focus();
        return;
      }

      /*
        Tab wraps inside the sheet. Everything else on the page is behind an
        opaque full-screen panel, so letting focus walk out of it is letting
        it walk somewhere that cannot be seen.
      */
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !sheet?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    /*
      The lock goes on BOTH elements, and the html one is the half that
      actually does the work here.

      app/layout.tsx puts `h-full` on <html> and `min-h-full` on <body>,
      which makes the root element the viewport's scrolling box. Locking
      body alone therefore left the page behind the sheet perfectly
      scrollable - measured, not assumed: a scroll issued with the menu open
      moved the page 500px underneath it. Body is still locked as well, for
      the case where a future layout change hands the scroll back to it.
    */
    const root = document.documentElement;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      root.style.overflow = previousRootOverflow;
      document.body.style.overflow = previousBodyOverflow;
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
        {/*
          Three tracks, and the middle one is the mark.

          `minmax(0,1fr)` on the outer two rather than `1fr` is what makes the
          centring real. A bare `1fr` track refuses to shrink below its own
          content, so the wider side - the one carrying two links, the account
          control and the booking pill - would push the mark off centre by
          however much it outweighs the other. Floored at zero, the two side
          tracks are always exactly equal and the `auto` track between them sits
          on the centre line of the bar at every width, with nothing measured in
          JavaScript.

          It also means the mark stays centred on a phone, where the left track
          is empty and the right one holds the menu button.
        */}
        <nav
          aria-label="Primary"
          className="mx-auto grid h-16 max-w-[1400px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-5 sm:gap-5 sm:px-8 lg:h-[72px]"
        >
          <ul className="col-start-1 hidden items-center gap-6 lg:flex xl:gap-9">
            {NAV_LEFT.map((link) => (
              <NavItem key={link.href} link={link} current={isCurrent(link.href)} />
            ))}
          </ul>

          {/*
            The brand mark, and the anchor the whole bar is composed around.

            Drawn from 36px tall on a phone to 43px at desktop. That floor is
            not arbitrary: this is a neon sign, so its white core stops reading
            as light on pale paper and the letters fall back to their pink
            outline. Checked against the real bar colour, it is thin at 28px and
            holds from 36 up.

            A plain <img> with explicit dimensions rather than next/image: it is
            a fixed-size brand asset, and under the `unoptimized` static export
            next/image would add a wrapper and optimise nothing. The width and
            height attributes are the file's real pixels, so the bar reserves
            the space before the PNG lands and the links either side never jump.
          */}
          <a href="/" className="col-start-2 justify-self-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={STUDIO.navLogo}
              alt={STUDIO.name}
              width={STUDIO.navLogoWidth}
              height={STUDIO.navLogoHeight}
              fetchPriority="high"
              className="h-auto w-[108px] sm:w-[120px] lg:w-[129px]"
            />
          </a>

          <div className="col-start-3 flex items-center justify-end gap-2 lg:gap-6 xl:gap-9">
            <ul className="hidden items-center gap-6 lg:flex xl:gap-9">
              {NAV_RIGHT.map((link) => (
                <NavItem key={link.href} link={link} current={isCurrent(link.href)} />
              ))}
            </ul>

            {/*
              A fixed-width slot, so the Book button does not slide sideways
              when the session resolves a moment after hydration. Rendered only
              when there is a booking system to log in to; with no Supabase
              project the slot does not exist and the bar is exactly as it was.
            */}
            {auth !== "unconfigured" ? (
              <div className="hidden min-w-[5.5rem] justify-end lg:flex">
                {auth === "signed-in" ? (
                  <a
                    href="/account/"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm text-muted transition-colors hover:text-accent"
                  >
                    <UserCircle size={18} weight="regular" aria-hidden="true" />
                    Account
                  </a>
                ) : auth === "signed-out" ? (
                  <a
                    href="/login/"
                    className="inline-flex min-h-11 items-center rounded-full px-2 text-sm text-muted transition-colors hover:text-accent"
                  >
                    Log in
                  </a>
                ) : null}
              </div>
            ) : null}

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
              ref={menuButtonRef}
              type="button"
              onClick={() => setOpenedAt(pathname)}
              aria-label="Open menu"
              aria-expanded={open}
              aria-haspopup="dialog"
              className="tap -mr-2 inline-flex cursor-pointer items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-2 lg:hidden"
            >
              <List size={24} weight="regular" />
            </button>
          </div>
        </nav>
      </header>

      {/*
        ALWAYS RENDERED, and hidden with visibility rather than by being
        absent. A sheet that is mounted on open can be animated in but has
        nothing left to animate out of: React removes the node on the same
        frame the class would have changed, so the close was instant however
        the open was dressed. Kept in the tree, one transition covers both
        directions and there is no exit timer to leave the menu half-open if
        it is interrupted.

        `inert` is what keeps that honest while it is shut: no tab stop, no
        pointer target, and nothing announced, which is the whole reason the
        node could not simply be left visible. `invisible` follows the same
        state and is what the transition ends on, so the panel is not sitting
        in front of the page at zero opacity swallowing taps.

        `overscroll-contain` stops a flick inside the sheet from chaining to
        the page underneath once the list has hit its end, which is the mobile
        half of the scroll lock the effect above does with body overflow.
      */}
      <div
        ref={sheetRef}
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        inert={!open}
        data-open={open}
        className="sheet fixed inset-0 z-20 flex flex-col overflow-y-auto overscroll-contain bg-bg lg:hidden"
        /* The sheet runs edge to edge, so it owes the notch and the home
           indicator the insets the padded page body pays elsewhere. */
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-5 sm:px-8">
          <Wordmark className="text-xl text-ink" />
          <button
            type="button"
            onClick={dismiss}
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

          {auth === "signed-in" || auth === "signed-out" ? (
            <li>
              <a
                href={auth === "signed-in" ? "/account/" : "/login/"}
                aria-current={
                  isCurrent(auth === "signed-in" ? "/account/" : "/login/")
                    ? "page"
                    : undefined
                }
                className="flex min-h-14 items-center gap-2 border-b border-line font-display text-2xl tracking-tight text-ink"
              >
                <UserCircle size={22} weight="regular" aria-hidden="true" />
                {auth === "signed-in" ? "My appointments" : "Log in"}
              </a>
            </li>
          ) : null}
        </ul>

        {/*
          Bottom of the sheet, so it lands under the thumb. `mt-auto` pushes
          it there on a tall phone; on a short one (a handset in landscape,
          where this list is taller than the viewport) the sheet scrolls and
          this simply follows the last link instead of being pinned off screen.
        */}
        <div className="mt-auto px-5 pb-10 pt-8 sm:px-8">
          <a
            {...bookingTarget()}
            onClick={() => setOpenedAt(null)}
            className={`${buttonStyles.primary} w-full`}
          >
            {CTA.book}
          </a>
          <a
            href={REACH.href}
            className="mt-3 flex min-h-11 items-center justify-center text-sm text-muted"
          >
            {REACH_SECONDARY}
          </a>
        </div>
      </div>
    </>
  );
}
