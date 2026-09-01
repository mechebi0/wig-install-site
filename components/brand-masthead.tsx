import { LocationStrip } from "@/components/location-strip";
import { Wordmark } from "@/components/wordmark";
import { HERO, STUDIO } from "@/lib/content";

/**
 * The top of the homepage: the announcement strip, then the mark, centred.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS A WINE BAND AND NOT BLUSH PAPER
 * ---------------------------------------------------------------------------
 * The brief asks for the mark centred at the very top with generous breathing
 * room. The mark is Nat's own neon studio sign, and a neon sign is a light
 * source: lifted off the black it was photographed on, it composites over a
 * dark field and vanishes over a pale one. So the masthead is wine.
 *
 * That turns out to be the better composition anyway. A dark band at the top,
 * photography directly beneath it, and blush paper from the intro down gives
 * the page three distinct registers in the first two screens, and it means the
 * sticky nav never has to sit on a bright frame edge as a slide changes.
 *
 * ---------------------------------------------------------------------------
 * WHY THE BRAND NAME IS HERE AND NOT IN THE CAROUSEL OVERLAY
 * ---------------------------------------------------------------------------
 * The mark sits about 40px above the carousel. Repeating "Crowned by Nat" in
 * the overlay underneath it would print the brand name twice in one eyeful,
 * which reads as a mistake rather than as emphasis. So the masthead carries
 * the identity and the carousel overlay carries the proposition and the two
 * actions. Between them they say the same four things the brief asks for, once
 * each.
 *
 * The h1 lives here rather than in the carousel for the same reason: this is
 * the page's real heading, and it is the one element that does not change
 * every seven seconds.
 */
export function BrandMasthead() {
  return (
    <div className="bg-ink">
      <LocationStrip />

      <div className="mx-auto flex max-w-[1400px] flex-col items-center px-5 pb-7 pt-7 text-center sm:px-8 sm:pb-8 sm:pt-8 lg:pb-9 lg:pt-9">
        <h1 className="flex flex-col items-center">
          {STUDIO.logo ? (
            /*
              A fixed-size brand asset rather than content photography, so a
              plain <img> with explicit dimensions: next/image would add a
              wrapper and, under the `unoptimized` static export, nothing else.
              It is the LCP candidate on this page, hence the eager fetch.
            */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={STUDIO.logo}
              alt={HERO.brand}
              width={STUDIO.logoWidth}
              height={STUDIO.logoHeight}
              fetchPriority="high"
              className="h-auto w-[14rem] max-w-full sm:w-[18rem] lg:w-[21rem]"
            />
          ) : (
            <Wordmark className="text-4xl text-on-accent sm:text-5xl lg:text-6xl" />
          )}

          <span className="mt-4 font-display text-sm italic leading-snug text-on-accent/65 sm:mt-5 sm:text-base">
            {HERO.line}
          </span>
        </h1>
      </div>
    </div>
  );
}
