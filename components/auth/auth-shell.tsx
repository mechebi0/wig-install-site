import Image from "next/image";
import type { ReactNode } from "react";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Wordmark } from "@/components/wordmark";
import { HERO_SLIDES } from "@/lib/images";

/**
 * The frame every authentication screen sits in.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS A SPLIT AND NOT A CARD
 * ---------------------------------------------------------------------------
 * The default shape for a login page is a white card floating in the middle of
 * a grey field with a logo on top. That shape is not neutral: it is the visual
 * signature of software, and it is the exact thing the brief rules out. A
 * beauty client arriving here should feel like they have walked through the
 * studio door, not opened a portal.
 *
 * So the page is a split. Photography holds the left half at desktop, the form
 * holds the right, and the two meet on a hard edge with no card, no shadow and
 * no rounded container. It is the layout the luxury houses use for exactly
 * this moment, and it costs nothing: the photograph is already committed for
 * the hero and is already the right crop.
 *
 * ---------------------------------------------------------------------------
 * WHAT MOBILE GETS INSTEAD
 * ---------------------------------------------------------------------------
 * Not the photograph. A 1080x1440 image above a login form on a phone pushes
 * the password field below the fold, costs a megabyte on a mobile connection,
 * and earns nothing: someone opening a login screen is trying to get in, not
 * to be sold to. Below lg the panel is not rendered at all, so the file is
 * never requested, and the form gets the whole viewport with the wordmark
 * above it carrying the brand on its own.
 *
 * ---------------------------------------------------------------------------
 * THE PHOTOGRAPH
 * ---------------------------------------------------------------------------
 * "In the chair" out of the hero set, which is a stylist's hands mid
 * appointment. Chosen over the finished-hair frames because this screen is
 * about the appointment rather than the result, and because it shows no face:
 * the stock licence does not permit implying an identifiable person endorses
 * the business, and a portrait beside a Crown by Nat sign-in would quietly do
 * that. See the note at the top of lib/images.ts.
 */
const PANEL_SLIDE = HERO_SLIDES.find((slide) => slide.id === "in-the-chair")!;

export function AuthShell({
  kicker,
  title,
  lede,
  children,
  footer,
}: {
  kicker: string;
  title: string;
  lede: string;
  children: ReactNode;
  /** The "already have an account?" line, or anything else below the form. */
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-72px)] lg:grid-cols-2">
      {/* ---------- photography, desktop only ---------- */}
      <div className="on-photo relative isolate hidden overflow-hidden bg-ink lg:block">
        <Image
          src={PANEL_SLIDE.tall.src}
          alt={PANEL_SLIDE.alt}
          width={PANEL_SLIDE.tall.width}
          height={PANEL_SLIDE.tall.height}
          priority
          sizes="50vw"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/*
          The same wine scrim the hero uses, so the type over it clears the
          same contrast floor without anyone having to re-measure it against
          this particular photograph.
        */}
        <div
          aria-hidden="true"
          className="hero-scrim pointer-events-none absolute inset-0"
        />
        <div className="relative flex h-full flex-col justify-end p-12 xl:p-16">
          <p className="font-display text-3xl italic leading-snug text-on-accent xl:text-4xl">
            One chair, one client,
            <br />
            one appointment.
          </p>
          <p className="mt-5 max-w-[34ch] text-sm leading-relaxed text-on-accent/70">
            Every install performed personally by Nat, from the braid down to
            the last cut.
          </p>
        </div>
      </div>

      {/* ---------- the form ---------- */}
      <div className="flex flex-col justify-center bg-bg px-5 py-14 sm:px-8 lg:px-14 xl:px-20">
        <div className="mx-auto w-full max-w-[26rem]">
          {/*
            The wordmark is a link home, because someone who opened this by
            accident needs a way out that is not the back button, and because
            at mobile it is the only brand on the screen.
          */}
          <a
            href="/"
            className="inline-flex min-h-11 items-center gap-2 text-ink lg:hidden"
          >
            <ArrowLeft size={16} weight="regular" aria-hidden="true" />
            <Wordmark className="text-lg" />
          </a>

          <p className="label mt-6 text-accent lg:mt-0">{kicker}</p>

          <h1 className="mt-5 font-display text-4xl leading-[1.04] tracking-tight text-ink md:text-5xl">
            {title}
          </h1>

          <p className="mt-4 text-base leading-relaxed text-muted">{lede}</p>

          <div className="mt-9">{children}</div>

          {footer ? (
            <div className="mt-8 border-t border-line pt-7 text-sm text-muted">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * The "Already have an account? Log in" line, in one shape for all four.
 *
 * The link is a flex item with its own 44px height rather than a word inside a
 * sentence. WCAG 2.5.8 would forgive the inline version under its exception
 * for links in body text, but "Log in" is only about 40 by 18 pixels, and this
 * is the single most important control on the page for anyone who landed on
 * the wrong one of these four screens. It is worth a real target rather than a
 * technically compliant one.
 *
 * flex-wrap, so the prompt and the link stack on a narrow phone instead of the
 * link being pushed off the edge.
 */
export function AuthAlternate({
  prompt,
  linkLabel,
  href,
}: {
  prompt: string;
  linkLabel: string;
  href: string;
}) {
  return (
    <p className="flex flex-wrap items-center gap-x-2">
      <span>{prompt}</span>
      <a
        href={href}
        className="inline-flex min-h-11 items-center font-medium text-accent underline decoration-accent/30 underline-offset-4 transition-colors hover:decoration-accent"
      >
        {linkLabel}
      </a>
    </p>
  );
}
