import { InstagramLogo } from "@phosphor-icons/react/dist/ssr";
import { Wordmark } from "@/components/wordmark";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { LOCATIONS, NAV_LINKS, REACH, STUDIO } from "@/lib/content";

/**
 * Footer, kept minimal on purpose.
 *
 * It is not a second information panel. What is left is the shape a footer
 * should be: the mark, where Nat works, how to reach a person, the pages, and
 * a way into an account.
 *
 * ---------------------------------------------------------------------------
 * NOTHING HERE IS INVENTED
 * ---------------------------------------------------------------------------
 * Every row below renders only if there is a real value behind it. No street
 * address has been supplied, so the towns are named instead; no phone number
 * has been supplied, so no number appears; no Instagram handle has been
 * confirmed, so the social row does not exist. A footer is exactly where a
 * placeholder survives to launch, because it is the part of a page nobody
 * re-reads, so the conditionals are the guard rather than a note in a file.
 *
 * The account column follows the same rule for a different reason. SiteNav
 * already hides its account control when no Supabase project is configured,
 * on the grounds that pointing at a sign-in nobody can complete is worse than
 * saying nothing. A footer that still listed "Log in" would undo that
 * decision from the other end of the page, so it reads the same build-time
 * constant. Set the two environment variables and both come back at once.
 *
 * ---------------------------------------------------------------------------
 * THE BRAND MARK
 * ---------------------------------------------------------------------------
 * Nat's own neon studio sign, lifted off the black it was photographed on so
 * it composites over the wine. The nav and the mobile sheet carry the brand as
 * type, so the real mark gets exactly one appearance per page below the fold,
 * which is how a mark keeps its weight.
 *
 * That is also why this band is wine rather than blush: the mark is a light
 * source and it only exists on a dark field. See the note on STUDIO.logo.
 *
 * Extra bottom padding on small screens clears the sticky booking bar.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS THIS SHORT, AND WHERE THE HEIGHT HAD GONE
 * ---------------------------------------------------------------------------
 * This band was 545px on a 1440 desktop and 879px on a 390 phone, which is
 * taller than the phone's own viewport: you scrolled a full screen of footer.
 * Measured rather than guessed, the height was in two places.
 *
 * The Pages list was 291px of it. Six links, each pinned to a 44px minimum by
 * the touch-target rule the rest of the site follows, stacked in one column.
 * 44px is the right floor for a CTA you are meant to hit with a thumb; it is
 * the wrong floor for a column of text links nobody navigates a beauty site by.
 * They are now 36px, which still clears the 24px WCAG 2.5.8 AA minimum with
 * room to spare, and the list runs two columns instead of six rows. The same
 * six links, in a third of the height, and it reads as an editorial index
 * rather than a stack.
 *
 * The rest was air: 80px of top padding, a 48px grid gap, and 88px between the
 * last column and the copyright rule. All trimmed, none of it to zero. The
 * brief was compact luxury, not compression, so the type sizes, the colours,
 * the mark and every link are exactly as they were.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="on-photo border-t border-line bg-ink">
      {/*
        pb-24 rather than pb-28: the sticky booking bar is ~73px tall, so 96px
        still clears it with room. It stays generous because that bar sits on
        top of whatever is under it and the copyright is the one line that must
        never end up behind it.
      */}
      <div className="mx-auto max-w-[1400px] px-5 pb-24 pt-12 sm:px-8 lg:pb-12 lg:pt-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            {STUDIO.logo ? (
              /*
                A fixed-size brand asset rather than content photography, so a
                plain <img>: next/image would add a wrapper and, under the
                `unoptimized` static export, no optimisation.
              */
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={STUDIO.logo}
                alt={STUDIO.name}
                width={STUDIO.logoWidth}
                height={STUDIO.logoHeight}
                loading="lazy"
                className="h-auto w-[13rem] max-w-full"
              />
            ) : (
              <Wordmark className="text-2xl text-on-accent" />
            )}

            <p className="mt-5 text-sm leading-relaxed text-on-accent/65">
              {STUDIO.street ? (
                <>
                  {STUDIO.street}
                  <br />
                </>
              ) : null}
              Now booking in{" "}
              {LOCATIONS.map((location) => `${location.name}, ${location.region}`).join(
                " and ",
              )}
              .
            </p>
          </div>

          {/*
            5 / 4 / 3 rather than 5 / 3 / 4. Contact is one email address, so a
            four-column allocation left roughly 240px of empty wine to the right
            of it and the band read as left-weighted. The width moves to the
            Pages list, which is the column that now actually needs it for its
            two sub-columns, and the row ends closer to the content.
          */}
          <nav aria-label="Footer" className="lg:col-span-4">
            <h2 className="label text-on-accent">Pages</h2>
            {/*
              Two columns at every width. Six links in one column was 264px of
              footer on a phone; in two it is 108px, and the narrowest cell this
              ever gets (a 390px screen, so roughly 163px a column) still fits
              "Before you book" at text-sm without wrapping.

              Row-major fill, so the visual order and the DOM order are the same
              order and the tab order does not zigzag.
            */}
            <ul className="mt-4 grid grid-cols-2 gap-x-6">
              <li>
                <FooterLink href="/">Home</FooterLink>
              </li>
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href}>{link.label}</FooterLink>
                </li>
              ))}
              <li>
                <FooterLink href="/book/">Book Your Chair</FooterLink>
              </li>
            </ul>
          </nav>

          <div className="lg:col-span-3">
            {isSupabaseConfigured ? (
              <>
                <h2 className="label text-on-accent">Your account</h2>
                <ul className="mt-4 flex flex-col text-sm">
                  <li>
                    <FooterLink href="/login/">Log in</FooterLink>
                  </li>
                  <li>
                    <FooterLink href="/account/">My appointments</FooterLink>
                  </li>
                </ul>
              </>
            ) : null}

            <h2
              className={`label text-on-accent ${isSupabaseConfigured ? "mt-6" : ""}`}
            >
              Contact
            </h2>
            <ul className="mt-4 flex flex-col text-sm">
              <li>
                <FooterLink href={REACH.href}>{REACH.label}</FooterLink>
              </li>
              {STUDIO.instagram ? (
                <li>
                  <FooterLink href={STUDIO.instagram}>
                    <InstagramLogo
                      size={16}
                      weight="regular"
                      aria-hidden="true"
                    />
                    Instagram
                  </FooterLink>
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        <p className="mt-10 border-t border-on-accent/15 pt-6 text-sm text-on-accent/55">
          &copy; {year} {STUDIO.name}. Every install performed by {STUDIO.owner}.
        </p>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="flex min-h-9 items-center gap-2 text-sm text-on-accent/65 transition-colors hover:text-on-accent"
    >
      {children}
    </a>
  );
}
