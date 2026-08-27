import Image from "next/image";
import { ButtonLink } from "@/components/button";
import { Reveal } from "@/components/reveal";
import { bookingTarget, CTA, HERO } from "@/lib/content";
import { HERO_IMAGE } from "@/lib/images";

/**
 * Asymmetric split hero. Copy in columns 1 to 6, image in 8 to 12, so the two
 * halves never read as a symmetrical slab.
 *
 * Fold discipline: three text elements only (headline, subtext, CTAs), top
 * padding capped at pt-20, and the image height capped at 60vh so the CTAs
 * stay above the fold on a 1440x800 laptop.
 *
 * Emphasis is Playfair's own italic rather than a second font dropped into the
 * headline, which is the amateur version of this move.
 */
export function Hero() {
  return (
    <section
      id="hero"
      className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-[1400px] items-center px-5 pb-16 pt-12 sm:px-8 lg:min-h-[calc(100dvh-72px)] lg:pb-24 lg:pt-20"
    >
      <div className="grid w-full items-center gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-6">
          <Reveal>
            <h1 className="font-display text-[2.6rem] leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl xl:text-[4.25rem]">
              {HERO.headline}{" "}
              <em className="block pb-1 italic leading-[1.1] text-accent">
                {HERO.headlineAccent}
              </em>
            </h1>
          </Reveal>

          <Reveal index={1}>
            <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-muted">
              {HERO.subtext}
            </p>
          </Reveal>

          <Reveal index={2}>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink {...bookingTarget()}>{CTA.book}</ButtonLink>
              <ButtonLink href="#work" variant="secondary">
                {CTA.work}
              </ButtonLink>
            </div>
          </Reveal>
        </div>

        <Reveal index={1} className="lg:col-span-5 lg:col-start-8">
          <div className="relative aspect-4/5 w-full overflow-hidden rounded-3xl bg-surface-2 shadow-lifted lg:max-h-[60vh]">
            <Image
              src={HERO_IMAGE.src}
              alt={HERO_IMAGE.alt}
              width={HERO_IMAGE.width}
              height={HERO_IMAGE.height}
              priority
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="h-full w-full object-cover"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
