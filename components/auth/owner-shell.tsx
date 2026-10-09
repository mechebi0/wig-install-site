import type { ReactNode } from "react";
import { STUDIO } from "@/lib/content";

/**
 * The frame for the studio owner's sign-in, and only that.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS NOT AuthShell
 * ---------------------------------------------------------------------------
 * AuthShell is the customer's door: a photograph on one half, a form on the
 * other, built to feel like walking into the studio. The owner is not being
 * welcomed in, she is getting to her tools, once, on whatever phone is in her
 * hand. So this is the quiet version: one centred column on the blush paper,
 * the crest, a heading, a form. No photograph to download, nothing to look at
 * while the code is being typed.
 *
 * The crest is the official mark (STUDIO.logo) and the same file the bar above
 * it already loads, so it costs no extra request. It is sized by height, as it
 * is in the nav, and left undistorted by `w-auto`.
 *
 * `alt=""` because the nav above names the studio for assistive technology and
 * a second announcement of the same name here would only repeat it; the
 * crest's job on this page is to be seen.
 *
 * Everything else is the site's own palette and type: Playfair for the
 * heading, the wine ink, one rose accent, hairline borders, the soft wine
 * tinted shadow. No gradient, no blur, no motion.
 */
export function OwnerShell({
  kicker,
  title,
  lede,
  children,
}: {
  kicker: string;
  title: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center px-5 py-12 sm:px-8 lg:min-h-[calc(100svh-72px)]">
      <div className="w-full max-w-[26rem]">
        {STUDIO.logo ? (
          // A fixed-size brand asset: see the note on the nav mark in
          // components/site-nav.tsx for why this is not next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={STUDIO.logo}
            alt=""
            width={STUDIO.logoWidth}
            height={STUDIO.logoHeight}
            className="mx-auto h-20 w-auto"
          />
        ) : null}

        <p className="label mt-6 text-center text-accent">{kicker}</p>

        <h1 className="mt-4 text-center font-display text-3xl leading-[1.1] tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>

        <p className="mx-auto mt-3 max-w-[34ch] text-center text-base leading-relaxed text-muted">
          {lede}
        </p>

        <div className="mt-8 rounded-3xl border border-line bg-surface p-6 shadow-soft sm:p-8">
          {children}
        </div>

        <p className="mt-6 text-center text-sm">
          <a
            href="/"
            className="inline-flex min-h-11 items-center text-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
          >
            Back to {STUDIO.name}
          </a>
        </p>
      </div>
    </div>
  );
}
