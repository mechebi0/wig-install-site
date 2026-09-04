import { ButtonLink } from "@/components/button";
import { Reveal } from "@/components/reveal";
import { CTA, HOME, REACH, REACH_SECONDARY, bookingTarget } from "@/lib/content";

/**
 * The closing CTA. Used at the foot of the inner pages that are not themselves
 * the booking page. The homepage no longer carries it: its hero button and the
 * nav button already make the ask, and a third one on the way out was the page
 * repeating itself.
 *
 * This is the one deep field on an otherwise light site, and that is the whole
 * job: after a page of blush paper the wine band reads as a full stop, and the
 * near-white pill on it is the highest contrast object anywhere on the site.
 * It is the last thing you see before the footer, and it is the only thing in
 * it.
 *
 * It reuses the hero button variants rather than inventing a third pair, so
 * the primary action looks identical at the top and the bottom of the page.
 */
export function BookingCta({
  heading = HOME.closing.heading,
  body = HOME.closing.body,
}: {
  /** Overridden on the collection pages, which close on "Ready for your crown?" */
  heading?: string;
  body?: string;
} = {}) {
  return (
    <section
      aria-labelledby="closing-heading"
      className="on-photo bg-ink"
    >
      <div className="mx-auto flex max-w-[1400px] flex-col items-start gap-8 px-5 py-14 sm:px-8 sm:py-20 lg:flex-row lg:items-end lg:justify-between lg:py-28">
        <Reveal>
          <h2
            id="closing-heading"
            className="max-w-[14ch] font-display text-3xl leading-[1.05] tracking-tight text-on-accent md:text-4xl lg:text-5xl"
          >
            {heading}
          </h2>
          <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-on-accent/75 lg:text-lg">
            {body}
          </p>
        </Reveal>

        <Reveal index={1} className="w-full shrink-0 sm:w-auto">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink {...bookingTarget()} variant="onPhoto">
              {CTA.book}
            </ButtonLink>
            <a
              href={REACH.href}
              className="inline-flex min-h-11 items-center justify-center px-2 text-sm text-on-accent/75 underline decoration-on-accent/30 underline-offset-4 transition-colors hover:text-on-accent hover:decoration-on-accent"
            >
              {REACH_SECONDARY}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
